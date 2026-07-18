import { tuiLog } from "./tui";
import { COLOR } from "./ansi";

const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;

export function showme(message: string, newline: boolean = true): void {
  const br = newline ? "\r\n" : "";
  tuiLog(br + prefix + message + "\n");
}

export function showerr(message: string, newline: boolean = true): void {
  const br = newline ? "\r\n" : "";
  tuiLog(br + prefix + `${COLOR.red}${message} ${COLOR.reset}\r\n`);
}

export function echo(message: string, newline: boolean = true): void {
  tuiLog(message);
}
