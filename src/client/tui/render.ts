import { state, MAX_BUFFER_LINES } from "./state";

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K";
const RESET = "\x1b[0m";
const BG_YELLOW_BLACK = "\x1b[43m\x1b[30m";

function moveTo(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

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
  process.stdout.write(ENTER_ALT_SCREEN);
}

export function exitScreen(): void {
  process.stdout.write(SHOW_CURSOR + EXIT_ALT_SCREEN);
}

export function redraw(): void {
  const { width, logHeight, statusRow, inputRow } = getLayout();
  let out = HIDE_CURSOR;

  const visibleLines = state.logLines.slice(
    Math.max(0, state.logLines.length - logHeight - state.scrollOffset),
    state.logLines.length - state.scrollOffset || undefined,
  );

  for (let i = 0; i < logHeight; i++) {
    out += moveTo(i + 1, 1) + CLEAR_LINE;
    out += visibleLines[i] ?? "";
  }

  out += moveTo(statusRow, 1) + CLEAR_LINE;
  out +=
    BG_YELLOW_BLACK + state.statusText.padEnd(width).slice(0, width) + RESET;
  out += moveTo(inputRow, 1) + CLEAR_LINE;
  out += state.inputBuffer;
  out += moveTo(inputRow, state.cursorPos + 1) + SHOW_CURSOR;

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
  }

  for (const segment of segments) {
    const prefixed = carrySgr ? carrySgr + segment : segment;
    state.logLines.push(prefixed);
    updateCarrySgr(segment);
  }

  if (state.logLines.length > MAX_BUFFER_LINES) {
    state.logLines = state.logLines.slice(
      state.logLines.length - MAX_BUFFER_LINES,
    );
  }

  state.scrollOffset = 0;
  redraw();
}
