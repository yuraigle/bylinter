import { state } from "./state";
import {
  appendLog,
  enterScreen,
  exitScreen,
  redraw,
  rewrapAll,
  wecho,
} from "./render";
import { initInput, destroyInput } from "./input";
import { clr } from "../protocol/ansi";
import { KeyInfo } from "../logic/BindkeyCollection";
import { AliasCollection } from "../logic";

export interface ITerminalUI {
  destroy(): void;
  setStatus(text: string): void;
  setSidebar(lines: string[], start: number, end: number): void;
  echo(text: string): void;
  showme(text: string): void;
  showerr(text: string): void;
  wecho(w: number, text: string): void;
}

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

  public echo = (message: string): void => {
    appendLog(message);
  };

  // для системных сообщений
  public showme = (message: string): void => {
    appendLog("\r\n" + prefix + message);
  };

  public showerr = (message: string): void => {
    this.showme(`${clr("B")}${message}${clr("0")}`);
  };

  // в отдельное окно alt+2/3/4
  public wecho = (w: number, text: string): void => {
    wecho(w, text);
  };
}
