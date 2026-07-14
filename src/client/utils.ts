import { tuiLog } from "./tui";
import { COLOR } from "./ansi";

const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;

export function showme(message: string, newline: boolean): void {
  tuiLog((newline ? "\n" : "") + prefix + message + "\n");
}

export function showerr(message: string, newline: boolean): void {
  tuiLog(
    (newline ? "\n" : "") + prefix + `${COLOR.red}${message} ${COLOR.reset}\n`,
  );
}
