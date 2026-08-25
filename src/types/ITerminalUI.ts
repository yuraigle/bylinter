export interface ITerminalUI {
  destroy(): void;
  setStatus(text: string): void;
  setSidebar(lines: string[], start: number, end: number): void;
  echo(text: string): void;
  wecho(w: number, text: string): void;
  showme(text: string): void;
}
