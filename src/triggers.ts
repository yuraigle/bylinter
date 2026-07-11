export type LineHandler = (line: string) => void;

export type PromptHook = (prompt: string, lines: string[]) => void;

export interface Trigger {
  pattern: RegExp;
  handler: LineHandler;
}

const triggers: Trigger[] = [];
const hooks: PromptHook[] = [];

export function registerTrigger(pattern: RegExp, handler: LineHandler): void {
  triggers.push({ pattern, handler });
}

export function registerPromptHook(handler: PromptHook): void {
  hooks.push(handler);
}

export function runTriggers(line: string): void {
  for (const trigger of triggers) {
    if (trigger.pattern.test(line)) {
      trigger.handler(line);
    }
  }
}

export function runPromptHooks(prompt: string, lines: string[]): void {
  for (const handler of hooks) {
    handler(prompt, lines);
  }
}
