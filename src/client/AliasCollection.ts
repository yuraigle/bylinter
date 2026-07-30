export type AliasHandler = (args: string[]) => void;

export class AliasCollection {
    private readonly aliases: Map<string, AliasHandler> = new Map();

    public register = (cmd: string, handler: AliasHandler): void => {
        this.aliases.set(cmd, handler);
    }

    public handleInput = (line: string): boolean => {
        const [cmd, ...args] = line.split(/\s+/);
        const handler: AliasHandler | undefined = this.aliases.get(cmd);

        if (handler) {
            handler(args);
            return true;
        }

        return false;
    }
}