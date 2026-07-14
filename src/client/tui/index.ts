import { state } from "./state";
import { enterScreen, exitScreen, redraw, appendLog } from "./render";
import { initInput, destroyInput } from "./input";

export function initTui(onLine: (line: string) => void): void {
  enterScreen();
  initInput(onLine);
  redraw();
}

export function destroyTui(): void {
  exitScreen();
  destroyInput();
}

export function tuiLog(text: string): void {
  appendLog(text);
}

export function setStatus(text: string): void {
  state.statusText = text;
  redraw();
}
