import { stripANSI } from "bun";

export class SubstituteCollection {
    private readonly substitutes: Substitute[] = [];

    public register = (rx: RegExp, cb: SubstituteHandler): void => {
        this.substitutes.push(new Substitute(rx, cb));
    }

    public dispatch = (lineCL: string): string | null => {
        const line = stripANSI(lineCL);
        for (const subst of this.substitutes) {
            if (subst.pattern.test(line)) {
                const m: string[] = line.match(subst.pattern) ?? [];
                return subst.handler(m, lineCL);
            }
        }
        return lineCL;
    }
}

export type SubstituteHandler = (m: string[], lineCL: string) => string | null;

export class Substitute {
    public readonly pattern: RegExp;
    public readonly handler: SubstituteHandler;

    constructor(pattern: RegExp, handler: SubstituteHandler) {
        this.pattern = pattern;
        this.handler = handler;
    }
}
