import { tuiLog } from "../tui";
import { COLOR } from "../core/protocol/ansi";

const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;

export function echo(message: string): void {
  tuiLog("\r\n" + message);
}

export function showme(message: string): void {
  tuiLog("\r\n" + prefix + message);
}

export function showerr(message: string): void {
  tuiLog("\r\n" + prefix + `${COLOR.red}${message} ${COLOR.reset}`);
}
