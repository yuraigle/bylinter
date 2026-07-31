import { writeLog } from "../shared/logger";
import {
    TriggerCollection,
    PromptHookCollection,
    MsdpHookCollection,
    SubstituteCollection
} from "../logic";
import { Broadcaster } from "./Broadcaster";

export class TextPipeline {
    private readonly triggers: TriggerCollection;
    private readonly substitutes: SubstituteCollection;
    private readonly promptHooks: PromptHookCollection;
    private readonly msdpHooks: MsdpHookCollection;
    private readonly broadcaster: Broadcaster;

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
        const chunkLines = this.partialLine
            .split("\n").map(l => l.replace(/\r$/, ""));
        const completedLines = chunkLines.slice(0, -1);
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
}
