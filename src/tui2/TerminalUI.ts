import readline from "readline";

import { AliasCollection } from "../logic";
import { KeyInfo } from "../logic/BindkeyCollection";
import { SCREEN } from "../protocol/ansi";
import { ITerminalUI } from "../types/ITerminalUI";
import { InputManager } from "./InputManager";

export class TerminalUI implements ITerminalUI {
  private onInput: (line: string) => void;
  private onKeyPress: (key: KeyInfo, str: string) => boolean;
  private aliases: AliasCollection;
  private isDestroyed: boolean = false;

  private inputManager: InputManager;

  constructor(
    onInput: (line: string) => void,
    onKeyPress: (key: KeyInfo, str: string) => boolean,
    aliases: AliasCollection,
  ) {
    this.onInput = onInput;
    this.onKeyPress = onKeyPress;
    this.aliases = aliases;

    this.inputManager = new InputManager({
      onLine: this.onInput,
      onKeyPress: this.onKeyPress,
    });

    // Очищаем экран и выводим приветствие
    this.clearScreen();
    this.drawHello();
  }

  // public destroy = (): void => {};
  // public setStatus = (text: string): void => {};
  public setSidebar = (lines: string[], start: number, end: number): void => {};
  public echo = (text: string): void => {};
  public wecho = (w: number, text: string): void => {};
  public showme = (text: string): void => {};

  private clearScreen(): void {
    process.stdout.write("\x1b[2J\x1b[H");
  }

  private drawHello(): void {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    const helloText = "Hello";

    // Рисуем рамку
    const border = "─".repeat(width - 2);
    process.stdout.write(`┌${border}┐\n`);

    // Пустые строки до текста
    const emptyTop = Math.floor((height - 3) / 2);
    for (let i = 0; i < emptyTop; i++) {
      process.stdout.write(`│${" ".repeat(width - 2)}│\n`);
    }

    // Строка с текстом (по центру)
    const padding = Math.floor((width - 2 - helloText.length) / 2);
    process.stdout.write(
      `│${" ".repeat(padding)}${helloText}${" ".repeat(width - 2 - padding - helloText.length)}│\n`,
    );

    // Пустые строки после текста
    const emptyBottom = height - 3 - emptyTop - 1;
    for (let i = 0; i < emptyBottom; i++) {
      process.stdout.write(`│${" ".repeat(width - 2)}│\n`);
    }

    // Нижняя граница
    process.stdout.write(`└${border}┘\n`);

    // Возвращаем курсор в начало для ввода
    process.stdout.write(`\x1b[${height - 1};1H`);
  }

  public destroy = (): void => {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.rl.close();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdin.removeAllListeners("keypress");

    this.clearScreen();
    process.stdout.write("Goodbye!\n");
  };

  public setStatus = (text: string): void => {
    // Статусная строка внизу экрана
    const width = process.stdout.columns || 80;
    process.stdout.write(`\x1b[${process.stdout.rows || 24};1H`);
    process.stdout.write(`\x1b[2K`); // очищаем строку
    process.stdout.write(`\x1b[37m${text.slice(0, width)}\x1b[0m`);
    // Возвращаем курсор на позицию ввода
    process.stdout.write(`\x1b[${(process.stdout.rows || 24) - 1};1H`);
  };
}
