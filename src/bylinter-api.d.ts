interface GlobalApiContext {
    connect(host: string, port?: number, proxy?: string): Promise<void>;
    disconnect(): void;
    sendRaw(command: string): void; // без эха
    sendMsdp(name: string, value: string): void;
    echo(message: string): void;
    showme(message: string): void;
    showerr(message: string): void;
    wecho(windowNum: number, line: string): void;
    setSidebar(lines: string[], start: number, end: number): void;
    registerTrigger(pattern: RegExp, handler: (matches: string[], lineCL: string) => void): void;
    registerPromptHook(handler: (prompt: string, linesCL: string[]) => boolean, priority: number): void;
    registerMsdpHook(handler: (data: Record<string, unknown>) => void): void;
    registerSubstitute(handler: (text: string) => string | null): void;
    registerAlias(cmd: string, handler: (args: string[]) => void): void;
    registerBindkey(spec: string, handler: () => void): void;
    stripColors(text: string): string;
    COLORS: Map<string, string>; // todo
}
