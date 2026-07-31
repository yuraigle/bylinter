export class PromptHookCollection {
    private readonly promptHooks: PromptHook[] = [];

    public register = (handler: PromptHandler, priority: number): void => {
        this.promptHooks.push({ handler, priority });
        this.promptHooks.sort((a, b) => b.priority - a.priority);
    }

    public dispatch = (prompt: string, linesCL: string[]): void => {
        for (const hook of this.promptHooks) {
            const handled = hook.handler(prompt, linesCL);
            if (handled) break;
        }
    }
}

export interface PromptHook {
    handler: PromptHandler;
    priority: number;
}

export type PromptHandler = (prompt: string, linesCL: string[]) => boolean;
