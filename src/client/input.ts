import { connect, disconnect, sendl } from "./mud";
import { showerr } from "./utils";

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

registerCommand("/connect", (args: string[]) => {
  const [host, portArg, proxy] = args;

  if (!host) {
    showerr("Usage: /connect <host> <port> [proxy]", true);
    return;
  }

  const port = portArg ? Number(portArg) : 4000;
  if (Number.isNaN(port)) {
    showerr("Usage: /connect <host> <port> [proxy]", true);
    return;
  }

  connect(host, port, proxy).catch((err) =>
    showerr(`Failed to connect: ` + err.message, true),
  );
});

registerCommand("/dc", () => {
  disconnect();
});

registerCommand("/q", () => {
  process.exit(0);
});
