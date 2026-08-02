import { stripColors } from "../protocol/ansi";

export type LineHandler = (matches: string[], lineCL: string) => void;

// триггер реагирует на входящую строку
export interface Trigger {
  pattern: RegExp;
  handler: LineHandler;
}

export class TriggerCollection {
  private readonly triggers: Trigger[] = [];
  private debugMode: boolean = Number(process.env.DEBUG_MODE || 0) > 0;
  private debugger: (text: string) => void = console.debug;

  public setDebugger(cb: (text: string) => void): void {
    this.debugger = cb;
  }

  public register = (pattern: RegExp, handler: LineHandler): void => {
    this.triggers.push({ pattern, handler });
  };

  public dispatch = (lineCL: string): void => {
    if (this.debugMode) this.debugger(`[raw] ${JSON.stringify(lineCL)}`);
    const line = stripColors(lineCL);

    for (const trigger of this.triggers) {
      const match = line.match(trigger.pattern);
      if (match) {
        trigger.handler(match, lineCL);
      }
    }
  };
}
