import { clr } from "../protocol/ansi";
import { AliasCollection } from "../logic/AliasCollection";
import { MudSession } from "./MudSession";

export type CommandHandler = (args: string[]) => void;

export class InputHandler {
  private readonly session: MudSession;
  private readonly aliases: AliasCollection;
  private systemEcho: (text: string) => void = console.log;
  private commands: Record<string, CommandHandler> = {};

  constructor(session: MudSession, aliases: AliasCollection) {
    this.session = session;
    this.aliases = aliases;

    this.commands['/connect'] = (args: string[]) => {
      const [host, portArg, proxy] = args;
      const helpMsg = "Usage: /connect <host> <port> [proxy]";

      if (!host) {
        this.systemEcho(helpMsg);
        return;
      }

      const port = portArg ? Number(portArg) : 4000;
      if (Number.isNaN(port)) {
        this.systemEcho(helpMsg);
        return;
      }

      session.connect(host, port, proxy);
    }

    this.commands['/dc'] = () => {
      this.session.disconnect();
    }

    this.commands['/q'] = () => {
      process.exit(0);
    }
  }

  public setSystemEcho = (f: (text: string) => void): void => {
    this.systemEcho = f;
  }

  public handle = (raw: string): void => {
    const line = raw.replace(/[\r\n]+$/, "").trim();
    const [cmd, ...args] = line.split(/\s+/);

    if (cmd === '/help' || ["help", "#help", "?", "/?"].includes(line)) {
      this.showHelp();
      return;
    }

    if (cmd.startsWith("/")) {
      const handler = this.commands[cmd];

      if (handler) {
        handler(args);
      } else {
        this.systemEcho("Not a command. Try /help");
      }
      return;
    }

    if (this.aliases.handleInput(line)) return;

    line.split(/;/).forEach((cmd) => this.session.sendText(cmd));
  }

  private showHelp(): void {
    const commands: Map<string, string> = new Map();
    commands.set('/connect <host> [port:4000]', 'connect to MUD server');
    commands.set('/dc', 'drop connection');
    commands.set('/q', 'quit');
    commands.forEach((v, k) => this.systemEcho(clr('H') + `${k} - ${v}`));
  }
}
