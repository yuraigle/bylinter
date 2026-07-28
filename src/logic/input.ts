import { connect, disconnect, sendRaw } from "../client/mud";
import { showerr, showme } from "../shared/utils";

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

  if (cmd === '/help' || ["help", "#help", "?", "/?"].includes(line)) {
    showHelp();
    return;
  }

  if (cmd.startsWith("/")) {
    const handler = commands[cmd];
    if (handler) {
      handler(args);
    } else {
      showerr("Not a command. Try /help to see help on commands");
    }
    return;
  }

  const handler = aliases[cmd];
  if (handler) {
    handler(args);
    return;
  }

  line.split(/;/).forEach((cmd) => sendRaw(cmd));
}

function showHelp(): void {
  const commands: Map<string, string> = new Map();
  commands.set('/connect <host> [port:4000]', 'connect to MUD server');
  commands.set('/dc', 'drop connection');
  commands.set('/q', 'quit');
  commands.forEach((v, k) => showme(`${k} - ${v}`));
}

registerCommand("/connect", (args: string[]) => {
  const [host, portArg, proxy] = args;

  if (!host) {
    showerr("Usage: /connect <host> [port:4000] [proxy]");
    return;
  }

  const port = portArg ? Number(portArg) : 4000;
  if (Number.isNaN(port)) {
    showerr("Usage: /connect <host> <port> [proxy]");
    return;
  }

  connect(host, port, proxy).catch((err) =>
    showerr(`Failed to connect: ` + err.message),
  );
});

registerCommand("/dc", () => {
  disconnect();
});

registerCommand("/q", () => {
  process.exit(0);
});
