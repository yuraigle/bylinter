import { state, getWindow, MAX_BUFFER_LINES, type WindowState } from "./state";
import { COLOR, SCREEN, moveTo, stripBold } from "../ansi";

const SIDEBAR_WIDTH = 50;
const SIDEBAR_DIVIDER_WIDTH = 1;
const MIN_WIDTH_FOR_SIDEBAR = 160;
const DIVIDER_CHAR = "│";
const DISABLE_BOLD_FONT = process.env.DISABLE_BOLD_FONT === "1";

function getLayout() {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  const showSidebar = width > MIN_WIDTH_FOR_SIDEBAR;
  const logWidth = showSidebar
    ? width - SIDEBAR_WIDTH - SIDEBAR_DIVIDER_WIDTH
    : width;
  const dividerCol = logWidth + 1;
  const sidebarCol = dividerCol + SIDEBAR_DIVIDER_WIDTH;

  return {
    width,
    height,
    logHeight: height - 2,
    statusRow: height - 1,
    inputRow: height,
    showSidebar,
    logWidth,
    dividerCol,
    sidebarCol,
  };
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
    dividerCol,
    sidebarCol,
  } = getLayout();
  let out = SCREEN.hideCursor;

  const win = getWindow(state.currentWindow);

  const visibleRows = win.wrappedRows.slice(
    Math.max(0, win.wrappedRows.length - logHeight - win.scrollOffset),
    win.wrappedRows.length - win.scrollOffset || undefined,
  );

  for (let i = 0; i < logHeight; i++) {
    out += moveTo(i + 1, 1) + SCREEN.clearLine;
    out += visibleRows[i] ?? "";

    if (showSidebar) {
      out += COLOR.reset;
      out += moveTo(i + 1, dividerCol) + DIVIDER_CHAR;
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

export function switchWindow(n: number): void {
  if (n < 1 || n > 9) return;
  state.currentWindow = n;
  redraw();
}

// --- Токенизация с учётом ANSI-кодов (используется и для wrap, и для truncate) ---
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

// Полный пересчёт переноса для конкретного окна — при смене ширины терминала
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

// Пересчёт при ресайзе — все окна сразу, чтобы переключение после ресайза не показывало устаревший перенос
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

// Ядро: дописывает текст (может быть без завершающего \n — тогда "приклеится"
// к последней логической строке при следующем вызове) в указанное окно
function appendToWindow(windowNum: number, text: string): void {
  const win = getWindow(windowNum);
  const { logWidth } = getLayout();
  if (win.wrapWidth === 0) win.wrapWidth = logWidth; // первичная инициализация для новых окон

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

  if (win.logLines.length > MAX_BUFFER_LINES) {
    const excess = win.logLines.length - MAX_BUFFER_LINES;
    let rowsToRemove = 0;
    for (let i = 0; i < excess; i++) rowsToRemove += win.rowCounts[i];

    win.logLines = win.logLines.slice(excess);
    win.rowCounts = win.rowCounts.slice(excess);
    win.wrappedRows = win.wrappedRows.slice(rowsToRemove);
  }

  win.scrollOffset = 0;

  if (windowNum === state.currentWindow) redraw();
}

export function appendLog(text: string): void {
  appendToWindow(1, text);
}

export function wecho(windowNum: number, line: string): void {
  appendToWindow(windowNum, line + "\r\n");
}
