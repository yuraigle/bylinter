import { stripColors } from "./ansi";

export type LineHandler = (clean: string, colored: string, m: string[]) => void;
export type PromptHandler = (prompt: string, lines: string[]) => boolean;
export type MsdpHandler = (data: Record<string, unknown>) => void;
export type SubstituteHandler = (text: string) => string;

export interface Trigger {
  pattern: RegExp;
  handler: LineHandler;
}

export interface Substitute {
  pattern: RegExp;
  handler: SubstituteHandler;
}

export interface PromptHook {
  handler: (prompt: string, lines: string[]) => boolean;
  priority: number;
}

const triggers: Trigger[] = [];
const substitutes: Substitute[] = [];
const promptHooks: PromptHook[] = [];
const msdpHooks: MsdpHandler[] = [];

export function registerTrigger(pattern: RegExp, handler: LineHandler): void {
  triggers.push({ pattern, handler });
}

export function registerPromptHook(
  handler: PromptHandler,
  priority: number,
): void {
  promptHooks.push({ handler, priority });
  promptHooks.sort((a, b) => b.priority - a.priority);
}

export function registerMsdpHook(handler: MsdpHandler): void {
  msdpHooks.push(handler);
}

export function registerSubstitute(
  pattern: RegExp,
  handler: SubstituteHandler,
): void {
  substitutes.push({ pattern, handler });
}

export function runTriggers(line: string): void {
  const clean = stripColors(line);
  for (const trigger of triggers) {
    const match = clean.match(trigger.pattern);
    if (match) {
      trigger.handler(clean, line, match);
    }
  }
}

export function applySubstitutes(text: string): string {
  for (const subst of substitutes) {
    if (subst.pattern.test(text)) {
      text = subst.handler(text);
    }
  }
  return text;
}

export function runPromptHooks(prompt: string, lines: string[]): void {
  for (const hook of promptHooks) {
    const handled = hook.handler(prompt, lines);
    if (handled) break;
  }
}

export function runMsdpHooks(data: Record<string, unknown>): void {
  for (const hook of msdpHooks) {
    hook(data);
  }
}
