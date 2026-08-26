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

  constructor(handlers: InputHandler, config?: { prompt?: string; historySize?: number }) {}

  public init = (): void => {
    // Настройка raw mode для обработки всех клавиш
    this.setupRawMode();

    // Создание readline интерфейса
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "Bylinter> ",
      completer: undefined, // Для автодополнения (если включено)
    });

    // Обработка строк (по Enter)
    this.rl.on("line", (line) => {
      // this.handleLine(line);
      // this.onInput(line);
      // this.rl.prompt();
    });

    // Обработка закрытия (Ctrl+D)
    this.rl.on("close", () => {
      // this.handleClose();
    });

    // Обработка SIGINT (Ctrl+C) через readline
    this.rl.on("SIGINT", () => {
      // this.handleInterrupt();
    });

    // Показываем промпт
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

  public setPrompt = (prompt: string): void => {};

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

  public isActive = (): boolean => {
    return false;
  };

  public question = async (query: string): Promise<string> => {
    return "";
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

        // const handled = this.handlers.onKeyPress(keyInfo, str || "");
      }
    });
  }
}
