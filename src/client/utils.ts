import { tuiLog } from "./tui";

export const COLOR = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
} as const;

const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;

export function showme(message: string, newline: boolean): void {
  tuiLog((newline ? "\n" : "") + prefix + message + "\n");
}

export function showerr(message: string, newline: boolean): void {
  tuiLog(
    (newline ? "\n" : "") + prefix + `${COLOR.red}${message} ${COLOR.reset}\n`,
  );
}
