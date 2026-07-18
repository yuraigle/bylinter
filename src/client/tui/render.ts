import { state, getWindow, MAX_BUFFER_LINES, type WindowState } from "./state";
import { COLOR, SCREEN, BOX, moveTo, stripBold } from "../ansi";

const SIDEBAR_WIDTH = 50;
const SIDEBAR_DIVIDER_WIDTH = 1;
const MIN_WIDTH_FOR_SIDEBAR = 160;
const SPLIT_DIVIDER_ROWS = 1;
const DISABLE_BOLD_FONT = (process.env.DISABLE_BOLD_FONT || "0") === "1";

function getLayout() {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  const showSidebar = width > MIN_WIDTH_FOR_SIDEBAR;
  const logWidth = showSidebar
    ? width - SIDEBAR_WIDTH - SIDEBAR_DIVIDER_WIDTH
    : width;
  const dividerCol = logWidth + 1;
  const sidebarCol = dividerCol + SIDEBAR_DIVIDER_WIDTH;
  const logHeight = height - 2;

  const topHeight = Math.max(
    1,
    Math.floor((logHeight - SPLIT_DIVIDER_ROWS) / 2),
  );
  const bottomHeight = Math.max(1, logHeight - SPLIT_DIVIDER_ROWS - topHeight);

  return {
    width,
    height,
    logHeight,
    statusRow: height - 1,
    inputRow: height,
    showSidebar,
    logWidth,
    dividerCol,
    sidebarCol,
    topHeight,
    bottomHeight,
  };
}

// шаг прокрутки для PageUp/PageDown
export function getScrollStep(): number {
  const { topHeight } = getLayout();
  return Math.max(1, topHeight - 1); // 1 строка внахлёст
}

export function enterScreen(): void {
  process.stdout.write(SCREEN.enterAlt);
}

export function exitScreen(): void {
  process.stdout.write(SCREEN.showCursor + SCREEN.exitAlt);
}

export function redraw(): void {
  const {
    width,
    logHeight,
    statusRow,
    inputRow,
    showSidebar,
    logWidth,
    dividerCol,
    sidebarCol,
    topHeight,
    bottomHeight,
  } = getLayout();
  let out = SCREEN.hideCursor;

  const win = getWindow(state.currentWindow);
  const isSplit = win.scrollOffset > 0;
  let logRows: string[];
  const splitDividerRow = isSplit ? topHeight : -1; // № строки с полосой

  if (isSplit) {
    const topEnd = Math.max(0, win.wrappedRows.length - win.scrollOffset);
    const topStart = Math.max(0, topEnd - topHeight);
    const topRows = win.wrappedRows.slice(topStart, topEnd || undefined);
    const dividerLine =
      COLOR.yellow + BOX.horizontal.repeat(logWidth) + COLOR.reset;
    const bottomRows = win.wrappedRows.slice(
      Math.max(0, win.wrappedRows.length - bottomHeight),
    );

    logRows = [
      ...padRows(topRows, topHeight),
      dividerLine,
      ...padRows(bottomRows, bottomHeight),
    ];
  } else {
    logRows = padRows(
      win.wrappedRows.slice(Math.max(0, win.wrappedRows.length - logHeight)),
      logHeight,
    );
  }

  for (let i = 0; i < logHeight; i++) {
    out += moveTo(i + 1, 1) + SCREEN.clearLine;
    out += logRows[i] ?? "";

    if (showSidebar) {
      out += moveTo(i + 1, dividerCol);
      const junctionChar = i === splitDividerRow ? BOX.teeLeft : BOX.vertical;
      out += COLOR.yellow + junctionChar + COLOR.reset;
      const sidebarLine = truncateVisible(
        state.sidebarLines[i] ?? "",
        SIDEBAR_WIDTH,
      );
      out += moveTo(i + 1, sidebarCol) + sidebarLine;
      out += COLOR.reset;
    }
  }

  out += moveTo(statusRow, 1) + SCREEN.clearLine;
  const statusWithWindow = `[${state.currentWindow}] ${state.statusText}`;
  out +=
    COLOR.bgYellow +
    COLOR.black +
    statusWithWindow.padEnd(width).slice(0, width) +
    COLOR.reset;

  out += moveTo(inputRow, 1) + SCREEN.clearLine;

  let viewStart = 0;
  if (state.inputBuffer.length >= width) {
    viewStart = Math.max(0, state.cursorPos - width + 1);
  }
  const visibleInput = state.inputBuffer.slice(viewStart, viewStart + width);
  const visibleCursorCol = state.cursorPos - viewStart;

  out += visibleInput;
  out += moveTo(inputRow, visibleCursorCol + 1) + SCREEN.showCursor;

  process.stdout.write(out);
}

// дополняем массив строк сверху, если строк меньше, чем нужная высота панели
function padRows(rows: string[], height: number): string[] {
  if (rows.length >= height) return rows;
  return [...new Array(height - rows.length).fill(""), ...rows];
}

export function switchWindow(n: number): void {
  if (n < 1 || n > 9) return;
  state.currentWindow = n;
  redraw();
}

const TOKEN_RE = /\x1b\[[0-9;]*m|[\s\S]/g;

function truncateVisible(str: string, width: number): string {
  const tokens = str.match(TOKEN_RE) ?? [];
  let out = "";
  let visibleLen = 0;

  for (const token of tokens) {
    if (token.startsWith("\x1b[")) {
      out += token;
      continue;
    }
    if (visibleLen >= width) break;
    out += token;
    visibleLen++;
  }

  return out;
}

function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [line];

  const tokens = line.match(TOKEN_RE) ?? [];
  const rows: string[] = [];
  let current = "";
  let visibleLen = 0;
  let carry = "";

  for (const token of tokens) {
    if (token.startsWith("\x1b[")) {
      current += token;
      carry = token === "\x1b[0m" || token === "\x1b[m" ? "" : carry + token;
      continue;
    }

    if (visibleLen >= width) {
      rows.push(current);
      current = carry;
      visibleLen = 0;
    }

    current += token;
    visibleLen++;
  }

  rows.push(current);
  return rows;
}

function updateCarrySgr(win: WindowState, chunk: string): void {
  const matches = chunk.match(/\x1b\[[0-9;]*m/g);
  if (!matches) return;
  for (const code of matches) {
    win.carrySgr =
      code === "\x1b[0m" || code === "\x1b[m" ? "" : win.carrySgr + code;
  }
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

function appendToWindow(
  windowNum: number,
  text: string,
  isolated = false,
): void {
  const win = getWindow(windowNum);
  const { logWidth } = getLayout();
  if (win.wrapWidth === 0) win.wrapWidth = logWidth;

  const savedCarry = win.carrySgr;
  const rowsBefore = win.wrappedRows.length;
  const wasSplit = win.scrollOffset > 0;

  const segments = text.split("\n");

  if (win.logLines.length > 0) {
    const first = segments.shift() ?? "";
    win.logLines[win.logLines.length - 1] += first;
    updateCarrySgr(win, first);
    rewrapLastLine(win);
  }

  for (const segment of segments) {
    const prefixed = win.carrySgr ? win.carrySgr + segment : segment;
    const prefixed1 = DISABLE_BOLD_FONT ? stripBold(prefixed) : prefixed;
    win.logLines.push(prefixed1);
    updateCarrySgr(win, segment);
    appendWrappedLine(win, prefixed1);
  }

  if (isolated) {
    win.carrySgr = savedCarry; // эхо не должно менять цвет игрового потока
  }

  if (win.logLines.length > MAX_BUFFER_LINES) {
    const excess = win.logLines.length - MAX_BUFFER_LINES;
    let rowsToRemove = 0;
    for (let i = 0; i < excess; i++) rowsToRemove += win.rowCounts[i];

    win.logLines = win.logLines.slice(excess);
    win.rowCounts = win.rowCounts.slice(excess);
    win.wrappedRows = win.wrappedRows.slice(rowsToRemove);
  }

  if (wasSplit) {
    const rowsAdded = win.wrappedRows.length - rowsBefore;
    win.scrollOffset = Math.min(
      win.scrollOffset + Math.max(0, rowsAdded),
      Math.max(0, win.wrappedRows.length - 1),
    );
  }

  if (windowNum === state.currentWindow && batchDepth === 0) redraw();
}

export function appendLog(text: string, isolated = false): void {
  appendToWindow(1, text, isolated);
}

export function wecho(windowNum: number, line: string): void {
  appendToWindow(windowNum, line + "\r\n");
}

let batchDepth = 0;

export function beginBatch(): void {
  batchDepth++;
}

export function endBatch(): void {
  batchDepth = Math.max(0, batchDepth - 1);
  if (batchDepth === 0) redraw();
}
