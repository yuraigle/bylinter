import readline from "node:readline";

import { AliasCollection } from "../logic";
import { KeyInfo } from "../logic/BindkeyCollection";
import { SCREEN } from "../protocol/ansi";
import { ITerminalUI } from "../types/ITerminalUI";

export class TerminalUI implements ITerminalUI {
  constructor(
    onInput: (line: string) => void,
    onKeyPress: (key: KeyInfo, str: string) => boolean,
    aliases: AliasCollection,
  ) {
    process.stdout.write(SCREEN.enterAlt);
    readline.emitKeypressEvents(process.stdin);
  }

  public destroy = (): void => {};
  public setStatus = (text: string): void => {};
  public setSidebar = (lines: string[], start: number, end: number): void => {};
  public echo = (text: string): void => {};
  public wecho = (w: number, text: string): void => {};
  public showme = (text: string): void => {};
}
