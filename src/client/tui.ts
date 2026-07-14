import readline from "node:readline";

type KeyInfo = {
  name?: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
};

// --- ANSI escape-коды, которые используем ---
const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K"; // стереть содержимое текущей строки
const RESET = "\x1b[0m";
const BG_YELLOW_BLACK = "\x1b[43m\x1b[30m";

const RESERVED_KEY_NAMES = new Set([
  "return",
  "backspace",
  "left",
  "right",
  "up",
  "down",
  "pageup",
  "pagedown",
  "escape",
  "tab",
  "delete",
  "home",
  "end",
  "insert",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
]);

// --- Состояние ---
const MAX_BUFFER_LINES = 2000;
let logLines: string[] = [];
let scrollOffset = 0; // 0 = внизу, показываем самые свежие строки
let statusText = "Not connected";
let inputBuffer = "";
let cursorPos = 0; // позиция курсора внутри inputBuffer
let keyHandler: ((key: KeyInfo) => void) | null = null;
let inputHandler: ((line: string) => void) | null = null;

function moveTo(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

function getLayout() {
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;
  return {
    width,
    height,
    logHeight: height - 2, // всё, кроме статус-бара и строки ввода
    statusRow: height - 1,
    inputRow: height,
  };
}

function redraw(): void {
  const { width, height, logHeight, statusRow, inputRow } = getLayout();
  let out = HIDE_CURSOR;

  const visibleLines = logLines.slice(
    Math.max(0, logLines.length - logHeight - scrollOffset),
    logLines.length - scrollOffset || undefined,
  );

  for (let i = 0; i < logHeight; i++) {
    out += moveTo(i + 1, 1) + CLEAR_LINE;
    out += visibleLines[i] ?? "";
  }

  out += moveTo(statusRow, 1) + CLEAR_LINE;
  out += BG_YELLOW_BLACK + statusText.padEnd(width).slice(0, width) + RESET;
  out += moveTo(inputRow, 1) + CLEAR_LINE;
  out += inputBuffer;
  out += moveTo(inputRow, cursorPos + 1) + SHOW_CURSOR;

  process.stdout.write(out);
}

export function initTui(): void {
  process.stdout.write(ENTER_ALT_SCREEN);

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("keypress", (str: string, key: KeyInfo | undefined) => {
    if (!key) return;

    if (key.name === "return") {
      const line = inputBuffer;
      inputBuffer = "";
      cursorPos = 0;
      if (inputHandler) inputHandler(line);
      redraw();
      return;
    }

    if (key.name === "backspace") {
      if (cursorPos > 0) {
        inputBuffer =
          inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos);
        cursorPos--;
        redraw();
      }
      return;
    }

    if (key.name === "left" && !key.ctrl && !key.meta) {
      cursorPos = Math.max(0, cursorPos - 1);
      redraw();
      return;
    }

    if (key.name === "right" && !key.ctrl && !key.meta) {
      cursorPos = Math.min(inputBuffer.length, cursorPos + 1);
      redraw();
      return;
    }

    if (key.name === "pageup") {
      scrollOffset = Math.min(
        scrollOffset + 10,
        Math.max(0, logLines.length - 1),
      );
      redraw();
      return;
    }

    if (key.name === "pagedown") {
      scrollOffset = Math.max(scrollOffset - 10, 0);
      redraw();
      return;
    }

    // Печатные символы (включая кириллицу) — без ctrl/meta,
    // и это не служебная именованная клавиша из списка выше
    if (
      !key.ctrl &&
      !key.meta &&
      str &&
      str.length > 0 &&
      !RESERVED_KEY_NAMES.has(key.name ?? "")
    ) {
      inputBuffer =
        inputBuffer.slice(0, cursorPos) + str + inputBuffer.slice(cursorPos);
      cursorPos += str.length;
      redraw();
      return;
    }

    // Всё остальное (F1-F12 итд) — наружу, для регистрации игровых хоткеев
    if (keyHandler) keyHandler(key);
  });

  process.stdout.on("resize", () => redraw());

  redraw();
}

export function destroyTui(): void {
  process.stdout.write(SHOW_CURSOR + EXIT_ALT_SCREEN);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

// Отслеживание цвета для корректного рендеринга при скролле
const SGR_RE = /\x1b\[[0-9;]*m/g;
let carrySgr = ""; // накопленные активные SGR-коды

function updateCarrySgr(chunk: string): void {
  const matches = chunk.match(SGR_RE);
  if (!matches) return;
  for (const code of matches) {
    if (code === "\x1b[0m" || code === "\x1b[m") {
      carrySgr = ""; // reset
    } else {
      carrySgr += code;
    }
  }
}

export function tuiLog(text: string): void {
  const segments = text.split("\n");

  // Первый сегмент доклеивается к текущей незавершённой строке
  if (logLines.length > 0) {
    const first = segments.shift() ?? "";
    logLines[logLines.length - 1] += first;
    updateCarrySgr(first);
  }

  // Если "открыт" какой-то цвет, повторим его в начале новой строки
  for (const segment of segments) {
    const prefixed = carrySgr ? carrySgr + segment : segment;
    logLines.push(prefixed);
    updateCarrySgr(segment);
  }

  if (logLines.length > MAX_BUFFER_LINES) {
    logLines = logLines.slice(logLines.length - MAX_BUFFER_LINES);
  }

  scrollOffset = 0;
  redraw();
}

export function setStatus(text: string): void {
  statusText = text;
  redraw();
}

export function onInput(handler: (line: string) => void): void {
  inputHandler = handler;
}

export function onKeyPress(handler: (key: KeyInfo) => void): void {
  keyHandler = handler;
}
