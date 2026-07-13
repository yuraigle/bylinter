import { connect, disconnect, sendl } from "./mud";
import { systemError } from "./utils";

export type AliasHandler = (args: string[]) => void;
export type CommandHandler = (args: string[]) => void;

const aliases: Record<string, AliasHandler> = {};
const commands: Record<string, CommandHandler> = {};

export function registerAlias(cmd: string, handler: AliasHandler): void {
  aliases[cmd] = handler;
}

export function registerCommand(cmd: string, handler: CommandHandler): void {
  commands[cmd] = handler;
}

export function handleInput(raw: string): void {
  const line = raw.replace(/[\r\n]+$/, "").trim();
  const [cmd, ...args] = line.split(/\s+/);

  if (cmd.startsWith("/")) {
    const handler = commands[cmd];
    if (handler) {
      handler(args);
    }
    return;
  }

  const handler = aliases[cmd];
  if (handler) {
    handler(args);
    return;
  }

  sendl(line);
}

registerCommand("/q", () => {
  process.exit(0);
});

registerCommand("/connect", () => {
  connect().catch((err) => systemError("Failed to connect: " + err.message));
});

registerCommand("/dc", () => {
  disconnect();
});
