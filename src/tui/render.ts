import { state, getWindow, MAX_BUFFER_LINES, type WindowState } from "./state";
import { getLayout, Layout } from "./layout";
import { SCREEN, BOX, moveTo, clr } from "../protocol/ansi";
import { padRows, truncateVisible, wrapLine, wrapWithCursor } from "./textUtils";

const CLR_RESET = clr("0"); // Reset
const CLR_INPUT = clr("L"); // Bright Yellow for user input
const CLR_MAIN = clr(process.env.STATUS_COLOR || "D"); // Yellow
const STATUS_FG = clr("A"); // Black for statusbar font
const STATUS_BG = CLR_MAIN.replace(/\[[39]/, "[4");

export function enterScreen(): void {
  process.stdout.write(SCREEN.enterAlt);
}

export function exitScreen(): void {
  process.stdout.write(SCREEN.showCursor + SCREEN.exitAlt);
}

let redrawScheduled = false;
let lastRedrawTime = 0;
const MIN_REDRAW_INTERVAL_MS = 50;

export function requestRedraw(): void {
  if (redrawScheduled) return;
  redrawScheduled = true;

  const elapsed = Date.now() - lastRedrawTime;
  const delay = Math.max(0, MIN_REDRAW_INTERVAL_MS - elapsed);

  setTimeout(() => {
    redrawScheduled = false;
    lastRedrawTime = Date.now();
    redraw();
  }, delay);
}

// полная перерисовка окна (дорого)
export function redraw(): void {
  const layout: Layout = getLayout();

  const win = getWindow(state.currentWindow);
  const isSplit = win.scrollOffset > 0;

  let logRows: string[];
  let cursorScreenRow: number;
  let cursorCol: number;

  if (isSplit) {
    const topEnd = Math.max(0, win.wrappedRows.length - win.scrollOffset);
    const topStart = Math.max(0, topEnd - layout.topHeight);
    const topRows = win.wrappedRows.slice(topStart, topEnd || undefined);
    const dividerLine =
      CLR_MAIN + BOX.horizontal.repeat(layout.logWidth) + CLR_RESET;

    const tail = buildLiveTail(win, layout.logWidth, layout.bottomHeight);
    const padCount = layout.bottomHeight - tail.visibleRows.length;

    logRows = [
      ...padRows(topRows, layout.topHeight),
      dividerLine,
      ...padRows(tail.visibleRows, layout.bottomHeight),
    ];
    cursorScreenRow = layout.topHeight + 1 + padCount + tail.cursorScreenRow;
    cursorCol = tail.cursorCol;
  } else {
    const tail = buildLiveTail(win, layout.logWidth, layout.logHeight);
    const padCount = layout.logHeight - tail.visibleRows.length;

    logRows = padRows(tail.visibleRows, layout.logHeight);
    cursorScreenRow = padCount + tail.cursorScreenRow;
    cursorCol = tail.cursorCol;
  }

  let out = SCREEN.hideCursor;

  for (let i = 0; i < layout.logHeight; i++) {
    out += moveTo(i + 1, 1) + SCREEN.clearLine;
    out += logRows[i] ?? "";

    if (layout.showSidebar) {
      out += moveTo(i + 1, layout.dividerCol);
      out += CLR_MAIN + BOX.vertical + CLR_RESET;
      const sidebarLine = truncateVisible(
        state.sidebarLines[i] ?? "",
        layout.sidebarWidth,
      );
      out += moveTo(i + 1, layout.sidebarCol) + sidebarLine;
      out += CLR_RESET;
    }
  }

  out += moveTo(layout.statusRow, 1) + SCREEN.clearLine;
  const statusWithWindow = `[${state.currentWindow}] ${state.statusText}`;
  out +=
    STATUS_BG +
    STATUS_FG +
    statusWithWindow.padEnd(layout.width).slice(0, layout.width) +
    CLR_RESET;

  out += moveTo(cursorScreenRow + 1, cursorCol + 1) + SCREEN.showCursor;

  process.stdout.write(out);
}

// перерисовка строки ввода (быстро)
export function redrawTail(): void {
  const win = getWindow(state.currentWindow);
  if (win.scrollOffset > 0) {
    redraw();
    return;
  }

  const layout = getLayout();
  const tail = buildLiveTail(win, layout.logWidth, layout.logHeight);
  const padCount = layout.logHeight - tail.visibleRows.length;

  let out = SCREEN.hideCursor + SCREEN.syncStart;

  for (let i = 0; i < tail.visibleRows.length; i++) {
    const screenRow = padCount + i;
    out += moveTo(screenRow + 1, 1) + SCREEN.clearLine;
    out += tail.visibleRows[i];

    if (layout.showSidebar) {
      out += moveTo(screenRow + 1, layout.dividerCol);
      out += CLR_MAIN + BOX.vertical + CLR_RESET;
      const sidebarLine = truncateVisible(
        state.sidebarLines[screenRow] ?? "",
        layout.sidebarWidth,
      );
      out += moveTo(screenRow + 1, layout.sidebarCol) + sidebarLine;
      out += CLR_RESET;
    }
  }

  out +=
    moveTo(padCount + tail.cursorScreenRow + 1, tail.cursorCol + 1) +
    SCREEN.showCursor;

  out += SCREEN.syncEnd;

  process.stdout.write(out);
}

export function switchWindow(n: number): void {
  if (n < 1 || n > 9) return;
  state.currentWindow = n;
  redraw();
}

function rewrapWindow(win: WindowState, width: number): void {
  win.wrapWidth = width;
  win.wrappedRows = [];
  win.rowCounts = [];

  for (const line of win.logLines) {
    const rows = wrapLine(line, width);
    win.wrappedRows.push(...rows);
    win.rowCounts.push(rows.length);
  }
}

export function rewrapAll(): void {
  const { logWidth } = getLayout();
  for (const win of state.windows.values()) {
    rewrapWindow(win, logWidth);
  }
}

function rewrapLastLine(win: WindowState): void {
  const removeCount = win.rowCounts[win.rowCounts.length - 1] ?? 0;
  win.wrappedRows.splice(win.wrappedRows.length - removeCount, removeCount);

  const rows = wrapLine(win.logLines[win.logLines.length - 1], win.wrapWidth);
  win.wrappedRows.push(...rows);
  win.rowCounts[win.rowCounts.length - 1] = rows.length;
}

function appendWrappedLine(win: WindowState, line: string): void {
  const rows = wrapLine(line, win.wrapWidth);
  win.wrappedRows.push(...rows);
  win.rowCounts.push(rows.length);
}

function appendToWindow(windowNum: number, text: string): void {
  const win = getWindow(windowNum);
  const { logWidth } = getLayout();
  if (win.wrapWidth === 0) win.wrapWidth = logWidth;

  const rowsBefore = win.wrappedRows.length;
  const wasSplit = win.scrollOffset > 0;

  const segments = text.split("\n");

  if (win.logLines.length > 0) {
    const first = segments.shift() ?? "";
    win.logLines[win.logLines.length - 1] += first;
    rewrapLastLine(win);
  }

  for (const segment of segments) {
    win.logLines.push(segment);
    appendWrappedLine(win, segment);
  }

  if (win.logLines.length > MAX_BUFFER_LINES && !wasSplit) {
    const excess = win.logLines.length - MAX_BUFFER_LINES;
    let rowsToRemove = 0;
    for (let i = 0; i < excess; i++) rowsToRemove += win.rowCounts[i];

    win.logLines = win.logLines.slice(excess);
    win.rowCounts = win.rowCounts.slice(excess);
    win.wrappedRows = win.wrappedRows.slice(rowsToRemove);
  }

  if (win.logLines.length > MAX_BUFFER_LINES * 10 && wasSplit) {
    win.scrollOffset = 0; // слишком много строк добавлено
  }

  if (wasSplit) {
    const rowsAdded = win.wrappedRows.length - rowsBefore;
    win.scrollOffset = Math.min(
      win.scrollOffset + Math.max(0, rowsAdded),
      Math.max(0, win.wrappedRows.length - 1),
    );
  }

  if (windowNum === state.currentWindow) requestRedraw();
}

export function appendLog(text: string): void {
  appendToWindow(1, text);
}

export function wecho(windowNum: number, line: string): void {
  appendToWindow(windowNum, line + "\r\n");
}

function buildLiveTail(win: WindowState, width: number, maxHeight: number) {
  const lastLineRowCount = win.rowCounts[win.rowCounts.length - 1] ?? 0;
  const priorRows = win.wrappedRows.slice(
    0,
    win.wrappedRows.length - lastLineRowCount,
  );
  const lastLogicalText = win.logLines[win.logLines.length - 1] ?? "";
  const combinedText =
    lastLogicalText + CLR_INPUT + state.inputBuffer + CLR_RESET;
  const cursorRawIndex =
    lastLogicalText.length + CLR_INPUT.length + state.cursorPos;

  const {
    rows: tailRows,
    cursorRow,
    cursorCol,
  } = wrapWithCursor(combinedText, width, cursorRawIndex);

  const allRows = [...priorRows, ...tailRows];
  const visibleRows = allRows.slice(Math.max(0, allRows.length - maxHeight));
  const trimmedFromTop = allRows.length - visibleRows.length;
  const cursorScreenRow = priorRows.length + cursorRow - trimmedFromTop;

  return { visibleRows, cursorScreenRow, cursorCol };
}
