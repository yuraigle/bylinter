import { state } from "./state";
import {
  enterScreen,
  exitScreen,
  redraw,
  appendLog,
  rewrapAll,
} from "./render";
import { initInput, destroyInput } from "./input";

export { wecho } from "./render";

export function initTui(onLine: (line: string) => void): void {
  enterScreen();
  rewrapAll();
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

export function setSidebar(lines: string[], start: number, end: number): void {
  const requiredLength = Math.max(state.sidebarLines.length, end + 1);
  if (state.sidebarLines.length < requiredLength) {
    state.sidebarLines = state.sidebarLines.concat(
      new Array(requiredLength - state.sidebarLines.length).fill(""),
    );
  }

  for (let i = start; i <= end; i++) {
    state.sidebarLines[i] = lines[i - start] ?? "";
  }

  redraw();
}
