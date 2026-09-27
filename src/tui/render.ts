import { state, getWindow, MAX_BUFFER_LINES, type WindowState } from "./state";
import { getLayout } from "./layout";
import { SCREEN, BOX, moveTo, clr } from "../protocol/ansi";
import { padRows, truncateVisible, wrapLine, visibleLength } from "./textUtils";

const CLR_RESET = clr("0"); // Reset
const CLR_INPUT = clr("L"); // Bright Yellow for user input
const CLR_MAIN = clr(process.env.STATUS_COLOR || "D"); // Yellow
const STATUS_FG = clr("A"); // Black for statusbar font
const STATUS_BG = CLR_MAIN.replace(/\[[39]/, "[4");

let redrawScheduled = false;
let lastRedrawTime = 0;
const MIN_REDRAW_INTERVAL_MS = 30;

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
  redrawStatus();
  redrawLog();
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
    const rows = wrapLine(segment, win.wrapWidth);
    win.wrappedRows.push(...rows);
    win.rowCounts.push(rows.length);
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

let pendingPrompt: string | null = null;
export function addLog(line: string, hasGA?: boolean): void {
  if (pendingPrompt && !hasGA) {
    appendToWindow(1, pendingPrompt); // висит промт, который ещё не добавили в лог
    appendToWindow(1, line); // и показать входящую строку следом
    pendingPrompt = null;
  } else if (hasGA) {
    state.currentPrompt = pendingPrompt = line; // сохранить промт
    requestRedraw(); // и перерисовать
  } else {
    appendToWindow(1, line);
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

const RESERVED_INPUT_WIDTH = 15;

export function redrawPrompt(): void {
  const layout = getLayout();
  const promptVisibleLen = visibleLength(state.currentPrompt);
  const fitsTogether = promptVisibleLen + RESERVED_INPUT_WIDTH <= layout.logWidth;
  const promptWidth = fitsTogether ? promptVisibleLen : Math.max(0, layout.logWidth - RESERVED_INPUT_WIDTH);
  const inputWidth = Math.max(0, layout.logWidth - promptWidth);
  const promptDisplay = truncateVisible(state.currentPrompt, promptWidth);

  let viewStart = 0;
  if (state.inputBuffer.length >= inputWidth) {
    viewStart = Math.max(0, state.cursorPos - inputWidth + 1);
  }
  const visibleInput = state.inputBuffer.slice(viewStart, viewStart + inputWidth);
  const cursorColInInput = state.cursorPos - viewStart;
  const screenRow = layout.statusRow - 2;

  let out = SCREEN.hideCursor + SCREEN.syncStart;
  out += moveTo(screenRow + 1, 1) + SCREEN.clearLine;
  out += promptDisplay + CLR_RESET;

  out += moveTo(screenRow + 1, promptWidth + 1);
  out += CLR_INPUT + visibleInput + CLR_RESET;

  if (layout.showSidebar) {
    out += moveTo(screenRow + 1, layout.dividerCol);
    out += CLR_MAIN + BOX.vertical + CLR_RESET;
    const sidebarLine = truncateVisible(state.sidebarLines[screenRow] ?? "", layout.sidebarWidth);
    out += moveTo(screenRow + 1, layout.sidebarCol) + sidebarLine;
    out += CLR_RESET;
  }

  out += moveTo(screenRow + 1, promptWidth + cursorColInInput + 1) + SCREEN.showCursor;
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
  // out += SCREEN.showCursor;

  process.stdout.write(out);
}
