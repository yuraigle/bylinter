export type PromptHandler = (prompt: string, lines: string[]) => boolean;
export type MsdpHandler = (data: Record<string, unknown>) => void;
export type SubstituteHandler = (text: string) => string | null;


export interface PromptHook {
  handler: (prompt: string, lines: string[]) => boolean;
  priority: number;
}

const promptHooks: PromptHook[] = [];
const msdpHooks: MsdpHandler[] = [];
// const substitutes: SubstituteHandler[] = []; // для замены строки
// const gags: RegExp[] = []; // для скрытия строки целиком

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

export function registerSubstitute(handler: SubstituteHandler): void {
}


export function applySubstitutes(text: string): string | null {
  // for (const subst of substitutes) {
  //   const res: string | null = subst(text);
  //   if (res === null) {
  //     return null; // Gag
  //   }
  //   text = res;
  // }
  return text;
}

export function runPromptHooks(prompt: string, lines: string[]): void {
  // const linesUc =
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
