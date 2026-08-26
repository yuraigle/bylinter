import { AliasCollection } from "../logic";
import { KeyInfo } from "../logic/BindkeyCollection";
import { ITerminalUI } from "../types/ITerminalUI";
import { InputManager } from "./InputManager";
import { Renderer } from "./Renderer";
import { defaultState, TuiState } from "./TuiState";

export class TerminalUI implements ITerminalUI {
  private onInput: (line: string) => void;
  private onKeyPress: (key: KeyInfo, str: string) => boolean;
  private aliases: AliasCollection;
  private state: TuiState;

  private inputManager: InputManager;
  private renderer: Renderer;

  constructor(
    onInput: (line: string) => void,
    onKeyPress: (key: KeyInfo, str: string) => boolean,
    aliases: AliasCollection,
  ) {
    this.onInput = onInput;
    this.onKeyPress = onKeyPress;
    this.aliases = aliases;
    this.state = defaultState();

    this.inputManager = new InputManager({
      onLine: this.onInput,
      onKeyPress: this.onKeyPress,
    });
    this.inputManager.init();

    this.renderer = new Renderer();
    this.renderer.redraw(this.state);
  }

  public destroy = (): void => {};

  public addLog = (line: string, hasGA?: boolean): void => {
    const windowState = this.state.windows.get(1);

    if (windowState) {
      windowState.logLines.push(line);
      const MAX_LOG_SIZE = 10000;
      if (windowState.logLines.length > MAX_LOG_SIZE) {
        windowState.logLines.splice(
          0,
          windowState.logLines.length - MAX_LOG_SIZE,
        );
      }

      if (hasGA) {
        this.state.savedPrompt = line;
        this.inputManager.setPrompt(line);
      }

      this.renderer.redraw(this.state);
      this.renderer.drawStatus(this.state.statusText);
    }
  };

  public setStatus = (text: string): void => {
    this.state.statusText = text;
    this.renderer.drawStatus(text);
  };

  public setSidebar = (lines: string[], start: number, end: number): void => {};

  public echo = (text: string): void => {};
  public wecho = (w: number, text: string): void => {};
  public showme = (text: string): void => {};
}
