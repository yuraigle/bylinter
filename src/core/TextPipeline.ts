import { writeLog } from "../shared/logger";
import {
    TriggerCollection,
    PromptHookCollection,
    MsdpHookCollection,
    SubstituteCollection
} from "../logic";
import { Broadcaster } from "./Broadcaster";

const endsWithReset = (s: string) => s.endsWith("\x1b[0;0m");
const startsWithColor = (s: string) => s.match(/^\x1b\[[0-9;]*m/);
const hasAnyColor = (s: string) => s.match(/\x1b\[[0-9;]*m/);

export class TextPipeline {
    private readonly triggers: TriggerCollection;
    private readonly substitutes: SubstituteCollection;
    private readonly promptHooks: PromptHookCollection;
    private readonly msdpHooks: MsdpHookCollection;
    private readonly broadcaster: Broadcaster;
    private carrySgr: string = "";

    constructor(
        triggers: TriggerCollection,
        substitutes: SubstituteCollection,
        promptHooks: PromptHookCollection,
        msdpHooks: MsdpHookCollection,
        broadcaster: Broadcaster,
    ) {
        this.triggers = triggers;
        this.substitutes = substitutes;
        this.promptHooks = promptHooks;
        this.msdpHooks = msdpHooks;
        this.broadcaster = broadcaster;
    }

    private lines: string[] = [];
    private partialLine = "";
    private logPath: string | null = process.env.LOG_PATH || null;

    // prompt debouncer
    private static PROMPT_TIMEOUT_MS: number = 250;
    private promptTimer: NodeJS.Timeout | null = null;
    private gaSeen = false;

    public handleIncomingText = (text: string, hasGA: boolean): void => {
        this.partialLine += text;
        const chunkLines = this.partialLine.replaceAll(/\r/g, '').split("\n");
        const completedLines = chunkLines.slice(0, -1);

        for (let i = 0; i < completedLines.length; i++) {
            let outLine = completedLines[i];
            if (outLine.match(/^\s*$/)) continue; // игнор пустых строк
            if (this.carrySgr && !startsWithColor(outLine)) { // если был незакрытый цвет
                outLine = this.carrySgr + outLine; // добавить цвет в начало
            }
            this.updateCarrySgr(completedLines[i]); // обновить последний цвет
            if (hasAnyColor(outLine) && !endsWithReset(outLine)) {
                outLine += "\x1b[0;0m"; // закрыть цвет на этой строке
            }
            completedLines[i] = outLine;
        }

        this.lines.push(...completedLines);
        this.partialLine = chunkLines[chunkLines.length - 1];

        // lineCL - text colored
        completedLines.forEach(lineCL => {
            this.triggers.dispatch(lineCL);
            const outLineCL = this.substitutes.dispatch(lineCL);
            if (outLineCL !== null) {
                this.broadcaster.broadcast("\r\n" + outLineCL);
            }
        });

        if (hasGA) {
            this.gaSeen = true;
            this.flushPrompt();
        } else if (!this.gaSeen && this.partialLine.length > 0) {
            this.schedulePromptTimeout(); // ждём 250мс и промт = остаток
        }

        this.invokeLogger(text + (hasGA ? "\r\n" : ""));
    }

    public handleIncomingMsdp = (data: Record<string, unknown>): void => {
        this.msdpHooks.dispatch(data);
    }

    public resetState = (): void => {
        if (this.promptTimer) clearTimeout(this.promptTimer);
        this.promptTimer = null;
        this.gaSeen = false;
        this.partialLine = "";
        this.lines = [];
    }

    private schedulePromptTimeout(): void {
        if (this.promptTimer) clearTimeout(this.promptTimer);
        this.promptTimer = setTimeout(() => {
            this.promptTimer = null;
            this.flushPrompt();
        }, TextPipeline.PROMPT_TIMEOUT_MS);
    }

    private flushPrompt(): void {
        const prompt = this.partialLine;
        this.promptHooks.dispatch(prompt, this.lines);
        this.broadcaster.broadcast("\r\n" + prompt);
        this.partialLine = "";
        this.lines = [];
    }

    private invokeLogger(text: string): void {
        if (this.logPath) {
            writeLog(text, this.logPath);
        }
    }

    private updateCarrySgr(chunk: string): void {
        const matches = chunk.match(/\x1b\[[0-9;]*m/g);
        if (!matches) return;
        for (const code of matches) {
            if (code === "\x1b[0m" || code === "\x1b[0;0m" || code === "\x1b[m") {
                this.carrySgr = "";
            } else {
                this.carrySgr = code; // this.carrySgr + 
                // todo заменять цвет а не добавлять
            }
        }
    }
}
