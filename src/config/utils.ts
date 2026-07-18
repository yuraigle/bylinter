import { echo } from "../client";
import { COLOR } from "../client/ansi";
import { sendRaw } from "../client/mud";

export function formatRuTime(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function sendline(message: string): void {
  echo("\r\n" + COLOR.yellow + "[" + message + "]" + COLOR.reset);
  message.split(/;/).forEach((cmd) => sendRaw(cmd));
}
