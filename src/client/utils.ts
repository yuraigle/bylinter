import { tuiLog } from "./tui";
import { COLOR } from "./ansi";

const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;

export function echo(message: string, newline: boolean = true): void {
  const br = newline ? "\r\n" : "";
  tuiLog(br + message);
}

export function showme(message: string, newline: boolean = true): void {
  const br = newline ? "\r\n" : "";
  tuiLog(br + prefix + message + "\r\n");
}

export function showerr(message: string, newline: boolean = true): void {
  const br = newline ? "\r\n" : "";
  tuiLog(br + prefix + `${COLOR.red}${message} ${COLOR.reset}\r\n`);
}
