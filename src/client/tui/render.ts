import { state, MAX_BUFFER_LINES } from "./state";
import { COLOR, SCREEN, moveTo } from "../ansi";

function getLayout() {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  return {
    width,
    height,
    logHeight: height - 2,
    statusRow: height - 1,
    inputRow: height,
  };
}

export function enterScreen(): void {
  process.stdout.write(SCREEN.enterAlt);
}

export function exitScreen(): void {
  process.stdout.write(SCREEN.showCursor + SCREEN.exitAlt);
}

export function redraw(): void {
  const { width, logHeight, statusRow, inputRow } = getLayout();
  let out = SCREEN.hideCursor;

  const visibleRows = state.wrappedRows.slice(
    Math.max(0, state.wrappedRows.length - logHeight - state.scrollOffset),
    state.wrappedRows.length - state.scrollOffset || undefined,
  );

  for (let i = 0; i < logHeight; i++) {
    out += moveTo(i + 1, 1) + SCREEN.clearLine;
    out += visibleRows[i] ?? "";
  }

  out += moveTo(statusRow, 1) + SCREEN.clearLine;
  out +=
    COLOR.bgYellow +
    COLOR.black +
    state.statusText.padEnd(width).slice(0, width) +
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

// --- Отслеживание цвета для корректного рендеринга при скролле ---
const SGR_RE = /\x1b\[[0-9;]*m/g;
let carrySgr = "";

function updateCarrySgr(chunk: string): void {
  const matches = chunk.match(SGR_RE);
  if (!matches) return;
  for (const code of matches) {
    carrySgr = code === "\x1b[0m" || code === "\x1b[m" ? "" : carrySgr + code;
  }
}

export function appendLog(text: string): void {
  const segments = text.split("\n");

  if (state.logLines.length > 0) {
    const first = segments.shift() ?? "";
    state.logLines[state.logLines.length - 1] += first;
    updateCarrySgr(first);
    rewrapLastLine();
  }

  for (const segment of segments) {
    const prefixed = carrySgr ? carrySgr + segment : segment;
    state.logLines.push(prefixed);
    updateCarrySgr(segment);
    appendWrappedLine(prefixed);
  }

  if (state.logLines.length > MAX_BUFFER_LINES) {
    const excess = state.logLines.length - MAX_BUFFER_LINES;
    let rowsToRemove = 0;
    for (let i = 0; i < excess; i++) rowsToRemove += state.rowCounts[i];

    state.logLines = state.logLines.slice(excess);
    state.rowCounts = state.rowCounts.slice(excess);
    state.wrappedRows = state.wrappedRows.slice(rowsToRemove);
  }

  state.scrollOffset = 0;
  redraw();
}

const TOKEN_RE = /\x1b\[[0-9;]*m|[\s\S]/g;

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

// Полный пересчёт — только при смене ширины терминала (редко)
export function rewrapAll(): void {
  const { width } = getLayout();
  state.wrapWidth = width;
  state.wrappedRows = [];
  state.rowCounts = [];

  for (const line of state.logLines) {
    const rows = wrapLine(line, width);
    state.wrappedRows.push(...rows);
    state.rowCounts.push(rows.length);
  }
}

// Последняя логическая строка изменилась (дописали текст без \n) — пересчитываем только её
function rewrapLastLine(): void {
  const removeCount = state.rowCounts[state.rowCounts.length - 1] ?? 0;
  state.wrappedRows.splice(state.wrappedRows.length - removeCount, removeCount);

  const rows = wrapLine(
    state.logLines[state.logLines.length - 1],
    state.wrapWidth,
  );
  state.wrappedRows.push(...rows);
  state.rowCounts[state.rowCounts.length - 1] = rows.length;
}

// Новая логическая строка (после \n) — просто добавляем её перенос в хвост
function appendWrappedLine(line: string): void {
  const rows = wrapLine(line, state.wrapWidth);
  state.wrappedRows.push(...rows);
  state.rowCounts.push(rows.length);
}
