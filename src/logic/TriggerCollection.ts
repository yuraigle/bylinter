import { stripColors } from "../protocol/ansi";

export type LineHandler = (matches: string[], lineCL: string) => void;

// триггер реагирует на входящую строку
export interface Trigger {
    pattern: RegExp;
    handler: LineHandler;
}

export class TriggerCollection {
    private readonly triggers: Trigger[] = [];

    public register = (pattern: RegExp, handler: LineHandler): void => {
        this.triggers.push({ pattern, handler });
    }

    public dispatch = (lineCL: string): void => {
        const line = stripColors(lineCL);

        for (const trigger of this.triggers) {
            const match = line.match(trigger.pattern);
            if (match) {
                trigger.handler(match, lineCL);
            }
        }
    }
}