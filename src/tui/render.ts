import { state, getWindow, MAX_BUFFER_LINES, type WindowState } from "./state";
import { getLayout } from "./layout";
import { SCREEN, BOX, moveTo, clr } from "../protocol/ansi";
import { padRows, truncateVisible, wrapLine, wrapWithCursor } from "./textUtils";

const CLR_RESET = clr("0"); // Reset
const CLR_INPUT = clr("L"); // Bright Yellow for user input
const CLR_MAIN = clr(process.env.STATUS_COLOR || "D"); // Yellow
const STATUS_FG = clr("A"); // Black for statusbar font
const STATUS_BG = CLR_MAIN.replace(/\[[39]/, "[4");

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

export function redraw(): void {
  redrawLog();
  redrawStatus();
  redrawPrompt();
}

export function switchWindow(n: number): void {
  if (n < 1 || n > 9) return;
  state.currentWindow = n;
  redraw();
}

function appendToWindow(windowNum: number, text: string): void {
  const win = getWindow(windowNum);
  const { logWidth } = getLayout();
  if (win.wrapWidth === 0) win.wrapWidth = logWidth;

  const rowsBefore = win.wrappedRows.length;
  const wasSplit = win.scrollOffset > 0;

  const segments = text.split("\n");
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
    win.scrollOffset = 0;
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

function appendWrappedLine(win: WindowState, line: string): void {
  const rows = wrapLine(line, win.wrapWidth);
  win.wrappedRows.push(...rows);
  win.rowCounts.push(rows.length);
}

export function addLog(line: string, hasGA?: boolean): void {
  appendToWindow(1, line);
  if (hasGA) {
    state.currentPrompt = line;
    if (state.currentWindow === 1) requestRedraw();
  }
}

export function wecho(windowNum: number, line: string): void {
  appendToWindow(windowNum, line);
}

export function enterScreen(): void {
  process.stdout.write(SCREEN.enterAlt);
}

export function exitScreen(): void {
  process.stdout.write(SCREEN.showCursor + SCREEN.exitAlt);
}

function getVisibleLogRows(win: WindowState, maxHeight: number): string[] {
  return win.wrappedRows.slice(Math.max(0, win.wrappedRows.length - maxHeight));
}

export function redrawLog(): void {
  const layout = getLayout();
  const win = getWindow(state.currentWindow);
  const isSplit = win.scrollOffset > 0;

  let logRows: string[];

  if (isSplit) {
    const topEnd = Math.max(0, win.wrappedRows.length - win.scrollOffset);
    const topStart = Math.max(0, topEnd - layout.topHeight);
    const topRows = win.wrappedRows.slice(topStart, topEnd || undefined);
    const dividerLine = CLR_MAIN + BOX.horizontal.repeat(layout.logWidth) + CLR_RESET;

    const bottomRows = getVisibleLogRows(win, layout.bottomHeight);

    logRows = [
      ...padRows(topRows, layout.topHeight),
      dividerLine,
      ...padRows(bottomRows, layout.bottomHeight),
    ];
  } else {
    logRows = padRows(getVisibleLogRows(win, layout.logHeight), layout.logHeight);
  }

  let out = SCREEN.hideCursor;

  for (let i = 0; i < layout.logHeight; i++) {
    out += moveTo(i + 1, 1) + SCREEN.clearLine;
    out += logRows[i] ?? "";

    if (layout.showSidebar) {
      out += moveTo(i + 1, layout.dividerCol);
      out += CLR_MAIN + BOX.vertical + CLR_RESET;
      const sidebarLine = truncateVisible(state.sidebarLines[i] ?? "", layout.sidebarWidth);
      out += moveTo(i + 1, layout.sidebarCol) + sidebarLine;
      out += CLR_RESET;
    }
  }

  process.stdout.write(out);
}

export function redrawPrompt(): void {
  const layout = getLayout();
  const promptText = state.currentPrompt;
  const MAX_PROMPT_WIDTH = 200; // wtf
  const truncatedPrompt = truncateVisible(promptText, MAX_PROMPT_WIDTH);

  const combinedText = truncatedPrompt + CLR_INPUT + state.inputBuffer + CLR_RESET;
  const cursorRawIndex = truncatedPrompt.length + CLR_INPUT.length + state.cursorPos;

  const { rows: tailRows, cursorCol } = wrapWithCursor(
    combinedText,
    layout.logWidth,
    cursorRawIndex,
  );
  const promptRow = tailRows[0] ?? "";
  const screenRow = layout.statusRow - 2;

  let out = SCREEN.hideCursor + SCREEN.syncStart;
  out += moveTo(screenRow + 1, 1) + SCREEN.clearLine;
  out += promptRow;

  if (layout.showSidebar) {
    out += moveTo(screenRow + 1, layout.dividerCol);
    out += CLR_MAIN + BOX.vertical + CLR_RESET;
    const sidebarLine = truncateVisible(state.sidebarLines[screenRow] ?? "", layout.sidebarWidth);
    out += moveTo(screenRow + 1, layout.sidebarCol) + sidebarLine;
    out += CLR_RESET;
  }

  out += moveTo(screenRow + 1, cursorCol + 1) + SCREEN.showCursor;
  out += SCREEN.syncEnd;

  process.stdout.write(out);
}

export function redrawStatus(): void {
  const layout = getLayout();
  const statusWithWindow = `[${state.currentWindow}] ${state.statusText}`;

  let out = SCREEN.hideCursor;
  out += moveTo(layout.statusRow, 1) + SCREEN.clearLine;
  out +=
    STATUS_BG +
    STATUS_FG +
    statusWithWindow.padEnd(layout.width).slice(0, layout.width) +
    CLR_RESET;
  out += SCREEN.showCursor;

  process.stdout.write(out);
}
