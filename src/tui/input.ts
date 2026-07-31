import readline from "node:readline";

import { state, MAX_HISTORY, getWindow } from "./state";
import {
  getScrollStep,
  redraw,
  redrawInput,
  requestRedraw,
  rewrapAll,
  switchWindow,
} from "./render";
import { KeyInfo } from "../core/logic/BindkeyCollection";

let inputHandler: (line: string) => void;
let keyPressHandler: (key: KeyInfo, str: string) => boolean;

function isPrintable(str: string | undefined): str is string {
  if (!str) return false;
  const code = str.codePointAt(0);
  if (code === undefined) return false;
  if (code === 0x1b) return false; // ESC или начало escape-последовательности
  if (code < 0x20) return false; // прочие control-символы
  return true;
}

function handleKeypress(str: string, key: KeyInfo | undefined): void {
  if (!key) return;

  if (key.name === "return") {
    const line = state.inputBuffer;
    state.inputBuffer = "";
    state.cursorPos = 0;

    if (
      line.trim().length > 0 &&
      line !== state.history[state.history.length - 1]
    ) {
      state.history.push(line);
      if (state.history.length > MAX_HISTORY) {
        state.history = state.history.slice(state.history.length - MAX_HISTORY);
      }
    }
    state.historyPos = state.history.length;
    state.draft = "";

    if (inputHandler) inputHandler(line);
    requestRedraw();
    return;
  }

  if (key.meta && !key.ctrl && key.name && /^[1-9]$/.test(key.name)) {
    switchWindow(Number(key.name));
    return;
  }

  if (key.name === "backspace") {
    if (state.cursorPos > 0) {
      state.inputBuffer =
        state.inputBuffer.slice(0, state.cursorPos - 1) +
        state.inputBuffer.slice(state.cursorPos);
      state.cursorPos--;
      redrawInput();
    }
    return;
  }

  if (key.name === "delete") {
    if (state.cursorPos < state.inputBuffer.length) {
      state.inputBuffer =
        state.inputBuffer.slice(0, state.cursorPos) +
        state.inputBuffer.slice(state.cursorPos + 1);
      redrawInput();
    }
    return;
  }

  if (key.name === "left" && !key.ctrl && !key.meta) {
    state.cursorPos = Math.max(0, state.cursorPos - 1);
    redrawInput();
    return;
  }

  if (key.name === "right" && !key.ctrl && !key.meta) {
    state.cursorPos = Math.min(state.inputBuffer.length, state.cursorPos + 1);
    redrawInput();
    return;
  }

  if (key.name === "home" && !key.ctrl && !key.meta) {
    state.cursorPos = 0;
    redrawInput();
    return;
  }

  if (key.name === "end" && !key.ctrl && !key.meta) {
    state.cursorPos = state.inputBuffer.length;
    redrawInput();
    return;
  }

  if (key.name === "u" && key.ctrl && !key.meta) {
    state.inputBuffer = "";
    state.cursorPos = 0;
    redrawInput();
    return;
  }

  if (key.name === "up" && !key.ctrl && !key.meta) {
    if (state.historyPos === state.history.length) {
      state.draft = state.inputBuffer;
    }
    if (state.historyPos > 0) {
      state.historyPos--;
      state.inputBuffer = state.history[state.historyPos];
      state.cursorPos = state.inputBuffer.length;
      redrawInput();
    }
    return;
  }

  if (key.name === "down" && !key.ctrl && !key.meta) {
    if (state.historyPos < state.history.length) {
      state.historyPos++;
      state.inputBuffer =
        state.historyPos === state.history.length
          ? state.draft
          : state.history[state.historyPos];
      state.cursorPos = state.inputBuffer.length;
      redrawInput();
    }
    return;
  }

  if (key.name === "pageup" && !key.ctrl && !key.meta) {
    const win = getWindow(state.currentWindow);
    const step = getScrollStep();
    const isFirstPress = win.scrollOffset === 0;
    const delta = isFirstPress ? step * 2 : step;

    const newOffset = Math.min(
      win.scrollOffset + delta,
      Math.max(0, win.wrappedRows.length - 1),
    );

    if (newOffset !== win.scrollOffset) {
      win.scrollOffset = newOffset;
      requestRedraw();
    }
    return;
  }

  if (key.name === "pagedown" && !key.ctrl && !key.meta) {
    const win = getWindow(state.currentWindow);
    const step = getScrollStep();

    const newOffset = Math.max(win.scrollOffset - step, 0);

    if (newOffset !== win.scrollOffset) {
      win.scrollOffset = newOffset;
      requestRedraw();
    }
    return;
  }

  if (keyPressHandler && keyPressHandler(key, str)) {
    return;
  }

  if (!key.ctrl && !key.meta && isPrintable(str)) {
    state.inputBuffer =
      state.inputBuffer.slice(0, state.cursorPos) +
      str +
      state.inputBuffer.slice(state.cursorPos);
    state.cursorPos += str.length;
    redrawInput();
  }
}

export function initInput(
  onInput: (line: string) => void,
  onKeyPress: (key: KeyInfo, str: string) => boolean
): void {
  inputHandler = onInput;
  keyPressHandler = onKeyPress;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("keypress", handleKeypress);
  process.stdout.on("resize", () => {
    getWindow(state.currentWindow).scrollOffset = 0;
    rewrapAll();
    redraw();
  });
}

export function destroyInput(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}
