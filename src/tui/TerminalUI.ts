import { state } from "./state";
import {
  appendLog,
  enterScreen,
  exitScreen,
  redraw,
  rewrapAll,
  wecho,
  showSystem,
} from "./render";
import { initInput, destroyInput } from "./input";
import { clr } from "../protocol/ansi";
import { KeyInfo } from "../logic/BindkeyCollection";
import { AliasCollection } from "../logic";
import { ITerminalUI } from "../types/ITerminalUI";

const prefix = `${clr("B")}-${clr("C")}:${clr("B")}-${clr("0")} `;

export class TerminalUI implements ITerminalUI {
  constructor(
    onInput: (line: string) => void,
    onKeyPress: (key: KeyInfo, str: string) => boolean,
    aliases: AliasCollection,
  ) {
    const echoAndInput = (line: string) => {
      appendLog(clr("L") + line + clr("0"));
      onInput(line);
    };

    initInput(echoAndInput, onKeyPress, aliases);
    enterScreen();
    rewrapAll();
    redraw();
  }

  public destroy = (): void => {
    exitScreen();
    destroyInput();
  };

  public setStatus = (text: string): void => {
    state.statusText = text;
    redraw();
  };

  public setSidebar = (lines: string[], start: number, end: number): void => {
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
  };

  // дописать что-то в игровой лог, после промта
  public echo = (message: string): void => {
    appendLog(message);
  };

  // в отдельное окно alt+2/3/4
  public wecho = (w: number, text: string): void => {
    wecho(w, text);
  };

  // показать в игровом логе ДО текущего незавершённого промта
  public showme = (message: string): void => {
    showSystem(message);
  };
}
