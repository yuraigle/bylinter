import readline from "node:readline";

import { state, MAX_HISTORY, getWindow } from "./state";
import {
  redraw,
  redrawPrompt,
  requestRedraw,
  rewrapAll,
  switchWindow,
} from "./render";
import { KeyInfo } from "../logic/BindkeyCollection";
import { AliasCollection } from "../logic";
import { getLayout, getScrollStep } from "./layout";

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

  if (key.name !== "tab") {
    completion = null;
  }

  if (key.name === "tab" && !key.ctrl && !key.meta) {
    handleTabCompletion();
    return;
  }

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
    state.inputBuffer = "";
    state.currentPrompt = "";

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
      redrawPrompt();
    }
    return;
  }

  if (key.name === "delete") {
    if (state.cursorPos < state.inputBuffer.length) {
      state.inputBuffer =
        state.inputBuffer.slice(0, state.cursorPos) +
        state.inputBuffer.slice(state.cursorPos + 1);
      redrawPrompt();
    }
    return;
  }

  if (key.name === "left" && !key.ctrl && !key.meta) {
    state.cursorPos = Math.max(0, state.cursorPos - 1);
    redrawPrompt();
    return;
  }

  if (key.name === "right" && !key.ctrl && !key.meta) {
    state.cursorPos = Math.min(state.inputBuffer.length, state.cursorPos + 1);
    redrawPrompt();
    return;
  }

  if (key.name === "home" && !key.ctrl && !key.meta) {
    state.cursorPos = 0;
    redrawPrompt();
    return;
  }

  if (key.name === "end" && !key.ctrl && !key.meta) {
    state.cursorPos = state.inputBuffer.length;
    redrawPrompt();
    return;
  }

  if (key.name === "u" && key.ctrl && !key.meta) {
    state.inputBuffer = "";
    state.cursorPos = 0;
    redrawPrompt();
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
      redrawPrompt();
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
      redrawPrompt();
    }
    return;
  }

  if (key.name === "pageup" && !key.ctrl && !key.meta) {
    const win = getWindow(state.currentWindow);
    const isFirstPress = win.scrollOffset === 0;
    const step = isFirstPress ? getLayout().logHeight - 1 : getScrollStep();
    const newOffset = Math.min(
      win.scrollOffset + step,
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
    const { logHeight } = getLayout();
    let newOffset = Math.max(win.scrollOffset - step, 0);
    if (newOffset + step <= logHeight) {
      newOffset = 0; // одна лишь строка разделителя
    }

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
    redrawPrompt();
  }
}

export function initInput(
  onInput: (line: string) => void,
  onKeyPress: (key: KeyInfo, str: string) => boolean,
  aliases: AliasCollection,
): void {
  inputHandler = onInput;
  keyPressHandler = onKeyPress;
  aliasCollection = aliases;

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

let aliasCollection: AliasCollection | null = null;
let completion: CompletionState | null = null;

interface CompletionState {
  prefix: string;
  matches: string[];
  index: number; // matches.length — исходный prefix
}

function handleTabCompletion(): void {
  if (!aliasCollection) return;

  if (!completion) {
    const prefix = state.inputBuffer;
    if (prefix.length === 0) return;

    const matches = Array.from(aliasCollection.getNames())
      .filter((name) => name.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b));

    if (matches.length === 0) return;

    completion = { prefix, matches, index: 0 };
  } else {
    completion.index = (completion.index + 1) % (completion.matches.length + 1);
  }

  const value =
    completion.index < completion.matches.length
      ? completion.matches[completion.index]
      : completion.prefix;

  state.inputBuffer = value;
  state.cursorPos = value.length;
  redrawPrompt();
}
