import { sendl } from "./mud";

export type AliasHandler = (args: string[]) => void;

const aliases: Record<string, AliasHandler> = {};

export function registerAlias(cmd: string, handler: AliasHandler): void {
  aliases[cmd] = handler;
}

export function handleInput(raw: string): void {
  const line = raw.replace(/[\r\n]+$/, "").trim();
  const [cmd, ...args] = line.split(/\s+/);

  const handler = aliases[cmd];
  if (handler) {
    handler(args);
    return;
  }

  sendl(line);
}
