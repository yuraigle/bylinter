export interface GlobalApiContext {
  connect(host: string, port?: number, proxy?: string): Promise<void>;
  disconnect(): void;
  sendText(command: string): void; // без эха
  sendMsdp(name: string, value: string): void;
  echo(message: string): void;
  wecho(windowNum: number, line: string): void;
  registerTrigger(pattern: RegExp, handler: LineHandler): void;
  registerPromptHook(handler: PromptHandler, priority: number): void;
  registerMsdpHook(handler: MsdpHandler): void;
  registerSubstitute(rx: RegExp, handler: SubstituteHandler): void;
  registerAlias(cmd: string, handler: AliasHandler): void;
  registerBindkey(spec: string, handler: BindHandler): void;
  setSidebar(lines: string[], start: number, end: number): void;
  clr(letter: string): string;
  getColor(lineCL: string, pos: number): string;
}

type LineHandler = (matches: string[], lineCL: string) => void;
type PromptHandler = (prompt: string, linesCl: string[]) => boolean;
type MsdpHandler = (data: Record<string, unknown>) => void;
type SubstituteHandler = (m: string[], lineCL: string) => string | null;
type AliasHandler = (args: string[]) => void;
type BindHandler = () => void;

declare global {
  var bylinter: GlobalApiContext;
}

export {};
