import { COLOR, stripColors } from "./client";
import { AliasCollection } from "./client/control/AliasCollection";
import { BindkeyCollection } from "./client/control/BindkeyCollection";
import { MudSession } from "./client/MudSession";
import { TriggerCollection } from "./client/control/TriggerCollection";
import { TerminalUI } from "./tui/TerminalUI";
import { PromptHookCollection } from "./client/control/PromptHookCollection";
import { MsdpHookCollection } from "./client/control/MsdpHookCollection";
import { SubstituteCollection } from "./client/control/SubstituteCollection";

type LineHandler = (matches: string[], colored: string) => void;
type PromptHandler = (prompt: string, lines: string[]) => boolean;
type MsdpHandler = (data: Record<string, unknown>) => void;
type SubstituteHandler = (m: string[], lineCL: string) => string;
type AliasHandler = (args: string[]) => void;
type BindHandler = () => void;

interface GlobalApiContext {
  connect(host: string, port?: number, proxy?: string): Promise<void>;
  disconnect(): void;
  sendRaw(command: string): void; // без эха
  sendMsdp(name: string, value: string): void;

  echo(message: string): void;
  showme(message: string): void;
  showerr(message: string): void;
  wecho(windowNum: number, line: string): void;

  registerTrigger(pattern: RegExp, handler: LineHandler): void;
  registerPromptHook(handler: PromptHandler, priority: number): void;
  registerMsdpHook(handler: MsdpHandler): void;
  registerSubstitute(rx: RegExp, handler: SubstituteHandler): void;
  registerAlias(cmd: string, handler: AliasHandler): void;
  registerBindkey(spec: string, handler: BindHandler): void;
  setSidebar(lines: string[], start: number, end: number): void;
  stripColors(text: string): string;

  // COLORS: Map<string, string>; // todo

  COLOR: {
    readonly black: string;
    readonly red: string;
    readonly green: string;
    readonly yellow: string;
    readonly blue: string;
    readonly magenta: string;
    readonly cyan: string;
    readonly white: string;
    readonly brightBlack: string;
    readonly brightRed: string;
    readonly brightGreen: string;
    readonly brightYellow: string;
    readonly brightBlue: string;
    readonly brightMagenta: string;
    readonly brightCyan: string;
    readonly brightWhite: string;
    readonly bgBlack: string;
    readonly bgRed: string;
    readonly bgGreen: string;
    readonly bgYellow: string;
    readonly bgBlue: string;
    readonly bgMagenta: string;
    readonly bgCyan: string;
    readonly bgWhite: string;
    readonly bold: string;
    readonly dim: string;
    readonly italic: string;
    readonly underline: string;
    readonly reset: string;
  };
}

export function exposeGlobalApi(
  session: MudSession,
  tui: TerminalUI,
  aliases: AliasCollection,
  bindkeys: BindkeyCollection,
  triggers: TriggerCollection,
  substitutes: SubstituteCollection,
  promptHooks: PromptHookCollection,
  msdpHooks: MsdpHookCollection,
): void {
  const api: GlobalApiContext = {
    connect: session.connect,
    disconnect: session.disconnect,
    sendRaw: session.sendText,
    sendMsdp: session.sendMsdp,

    echo: tui.echo,
    showme: tui.showme,
    showerr: tui.showerr,
    wecho: tui.wecho,
    setSidebar: tui.setSidebar,

    registerTrigger: triggers.register,
    registerPromptHook: promptHooks.register,
    registerMsdpHook: msdpHooks.register,
    registerSubstitute: substitutes.register,
    registerAlias: aliases.register,
    registerBindkey: bindkeys.register,

    stripColors: stripColors,
    COLOR: COLOR,
  };

  Object.defineProperty(globalThis, 'bylinter', {
    value: api,
    writable: false,
    configurable: true,
  });
}