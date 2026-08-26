import readline from "readline";
import { KeyInfo } from "../logic/BindkeyCollection";

export interface InputHandler {
  onLine: (line: string) => void;
  onKeyPress: (key: KeyInfo, str: string) => boolean;
  onInterrupt?: () => void;
}

export class InputManager {
  private rl: readline.Interface | null = null;
  private history: string[] = [];
  private historyIndex: number = -1;

  private onLine: (line: string) => void;
  private onKeyPress: (key: KeyInfo, str: string) => boolean;

  constructor(
    handlers: InputHandler,
    config?: { prompt?: string; historySize?: number },
  ) {
    this.onLine = handlers.onLine;
    this.onKeyPress = handlers.onKeyPress;
  }

  public init = (): void => {
    this.setupRawMode();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "Bylinter> ",
      completer: undefined, // Для автодополнения (если включено)
    });

    this.rl.on("line", (line) => {
      this.onLine(line);
      this.rl?.prompt();
    });

    this.rl.prompt();
  };

  public destroy = (): void => {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdin.removeAllListeners("keypress");
  };

  public setPrompt = (prompt: string): void => {
    this.rl?.setPrompt(prompt);
  };

  public getCurrentLine = (): string => {
    return "";
  };

  public clearLine = (): void => {};

  public insertText = (text: string): void => {};

  public historyUp = (): void => {};

  public historyDown = (): void => {};

  public addToHistory = (line: string): void => {};

  public getHistory = (): string[] => {
    return [];
  };

  private setupRawMode(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    process.stdin.on("keypress", (str, key) => {
      if (key) {
        const keyInfo: KeyInfo = {
          name: key.name || "",
          ctrl: key.ctrl || false,
          shift: key.shift || false,
          meta: key.meta || false,
          sequence: key.sequence || str || "",
        };

        if (key.name === "up" && !key.ctrl && !key.meta) {
          this.historyUp();
          return;
        }

        if (key.name === "down" && !key.ctrl && !key.meta) {
          this.historyDown();
          return;
        }

        const handled = this.onKeyPress(keyInfo, str || "");
      }
    });
  }
}
