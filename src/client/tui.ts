import readline from "node:readline";

import { dispatchBindkey } from "./bindkeys";

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

// --- Состояние ---
const MAX_BUFFER_LINES = 2000;
let logLines: string[] = [];
let scrollOffset = 0; // 0 = внизу, показываем самые свежие строки
let statusText = "Not connected";
let inputBuffer = "";
let cursorPos = 0; // позиция курсора внутри inputBuffer
let inputHandler: ((line: string) => void) | null = null;

// --- История команд ---
let history: string[] = [];
const MAX_HISTORY = 100;
let historyPos = 0; // последняя запись history.length — черновик
let draft = ""; // сохранённый недописанный ввод, пока листаем историю вверх

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

      if (line.trim().length > 0 && line !== history[history.length - 1]) {
        history.push(line);
        if (history.length > MAX_HISTORY) {
          history = history.slice(history.length - MAX_HISTORY);
        }
      }
      historyPos = history.length;
      draft = "";

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

    if (key.name === "up" && !key.ctrl && !key.meta) {
      if (historyPos === history.length) {
        draft = inputBuffer;
      }
      if (historyPos > 0) {
        historyPos--;
        inputBuffer = history[historyPos];
        cursorPos = inputBuffer.length;
        redraw();
      }
      return;
    }

    if (key.name === "down" && !key.ctrl && !key.meta) {
      if (historyPos < history.length) {
        historyPos++;
        inputBuffer =
          historyPos === history.length ? draft : history[historyPos];
        cursorPos = inputBuffer.length;
        redraw();
      }
      return;
    }

    if (key.name === "pageup" && !key.ctrl && !key.meta) {
      scrollOffset = Math.min(
        scrollOffset + 10,
        Math.max(0, logLines.length - 1),
      );
      redraw();
      return;
    }

    if (key.name === "pagedown" && !key.ctrl && !key.meta) {
      scrollOffset = Math.max(scrollOffset - 10, 0);
      redraw();
      return;
    }

    if (dispatchBindkey(key, str)) {
      return;
    }

    if (!key.ctrl && !key.meta && isPrintable(str)) {
      inputBuffer =
        inputBuffer.slice(0, cursorPos) + str + inputBuffer.slice(cursorPos);
      cursorPos += str.length;
      redraw();
      return;
    }
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

function isPrintable(str: string | undefined): str is string {
  if (!str) return false;
  const code = str.codePointAt(0);
  if (code === undefined) return false;
  if (code === 0x1b) return false; // ESC или начало escape-последовательности
  if (code < 0x20) return false; // прочие control-символы (Tab и т.п.)
  return true;
}
