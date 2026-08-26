import { stripANSI } from "bun";
import { TuiState } from "./TuiState";
import { padRows } from "../tui/textUtils";
import { moveTo, SCREEN } from "../protocol/ansi";

export class Renderer {
  private width: number;
  private height: number;

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;

    this.clearScreen();
  }

  public updateSize(): void {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
  }

  /**
   * Очищает весь экран
   */
  public clearScreen(): void {
    process.stdout.write("\x1b[2J\x1b[H");
  }

  /**
   * Очищает строку от текущей позиции курсора
   */
  public clearLine(): void {
    process.stdout.write("\x1b[2K");
  }

  /**
   * Перемещает курсор в указанную позицию (1-based)
   */
  public moveCursor(row: number, col: number): void {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  /**
   * Сохраняет позицию курсора
   */
  public saveCursor(): void {
    process.stdout.write("\x1b[s");
  }

  /**
   * Восстанавливает позицию курсора
   */
  public restoreCursor(): void {
    process.stdout.write("\x1b[u");
  }

  public redraw = (state: TuiState): void => {
    this.updateSize();

    // Очищаем экран
    process.stdout.write(SCREEN.clearScreen + SCREEN.home);

    // Рисуем логи
    this.drawMainWindow(state);

    // Рисуем промпт
    this.drawPrompt(state.savedPrompt);

    // Рисуем статус
    this.drawStatus(state.statusText);

    // Возвращаем курсор
    const promptLength = stripANSI(state.savedPrompt).length;
    process.stdout.write(
      moveTo(this.height - 1, promptLength + 1) + SCREEN.showCursor,
    );
  };

  private drawMainWindow(state: TuiState): void {
    const wHeight = this.height - 3;
    const lines = state.windows.get(state.currentWindow)?.logLines || [];
    const startLine = Math.max(0, lines.length - wHeight);
    const visibleLines = lines.slice(startLine);

    for (let i = 0; i < wHeight; i++) {
      // Перемещаемся в начало строки
      process.stdout.write(moveTo(i + 1, 1));

      // Очищаем строку
      process.stdout.write(SCREEN.clearLine);

      // Выводим строку, если есть
      if (i < visibleLines.length) {
        const line = visibleLines[i].slice(0, this.width);
        process.stdout.write(line);
      }
    }
  }

  private drawPrompt(prompt: string): void {
    process.stdout.write(
      moveTo(this.height - 1, 1) + SCREEN.clearLine + prompt,
    );
  }

  public drawStatus(text: string): void {
    const statusText = text.slice(0, this.width);
    const fullLine = statusText.padEnd(this.width);
    process.stdout.write(
      moveTo(this.height, 1) +
        SCREEN.clearLine +
        `\x1b[43m\x1b[30m${fullLine}\x1b[0m`,
    );
  }

  public getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
