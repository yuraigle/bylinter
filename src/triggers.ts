export type LineHandler = (line: string) => void;

export type PromptHandler = (prompt: string, lines: string[]) => boolean;

export interface Trigger {
  pattern: RegExp;
  handler: LineHandler;
}

export interface PromptHook {
  handler: (prompt: string, lines: string[]) => boolean;
  priority: number; // больше значит раньше остальных сработает
}

const triggers: Trigger[] = [];
const hooks: PromptHook[] = [];

export function registerTrigger(pattern: RegExp, handler: LineHandler): void {
  triggers.push({ pattern, handler });
}

export function registerPromptHook(
  handler: PromptHandler,
  priority: number,
): void {
  hooks.push({ handler, priority });
  hooks.sort((a, b) => b.priority - a.priority);
}

export function runTriggers(line: string): void {
  for (const trigger of triggers) {
    if (trigger.pattern.test(line)) {
      trigger.handler(line);
    }
  }
}

export function runPromptHooks(prompt: string, lines: string[]): void {
  for (const hook of hooks) {
    const handled = hook.handler(prompt, lines);
    if (handled) break;
  }
}
