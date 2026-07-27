import {
    runTriggers,
    applySubstitutes,
    runPromptHooks,
    runMsdpHooks
} from "../core/logic/triggers";
import { broadcast } from "./output";
import { writeLog } from "../shared/logger";

export interface IProcessingResult {
    linesToDisplay: string[];
    hasGA: boolean;
}

export interface ITextPipeline {
    handleIncomingText(text: string, hasGA: boolean): void;
    handleIncomingMsdp(data: Record<string, unknown>): void;
    flushPrompt(): void;
    resetState(): void;
}

export class TextPipeline implements ITextPipeline {
    private lines: string[] = [];
    private partialLine = "";

    // prompt debouncer
    private static PROMPT_TIMEOUT_MS: number = 250;
    private promptTimer: NodeJS.Timeout | null = null;
    private gaSeen = false;

    private logPath: string | null = process.env.LOG_PATH || null;

    public handleIncomingText(text: string, hasGA: boolean): void {
        this.partialLine += text;
        const chunkLines = this.partialLine
            .split("\n").map(l => l.replace(/\r$/, ""));
        const completedLines = chunkLines.slice(0, -1);
        this.lines.push(...completedLines);
        this.partialLine = chunkLines[chunkLines.length - 1];

        completedLines.forEach(line => {
            runTriggers(line);
            const out = applySubstitutes(line);
            if (out !== null) {
                broadcast("\r\n" + out);
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

    public handleIncomingMsdp(data: Record<string, unknown>): void {
        runMsdpHooks(data);
    }

    public flushPrompt(): void {
        const prompt = this.partialLine;
        runPromptHooks(prompt, this.lines);
        broadcast("\r\n" + prompt);
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

    private invokeLogger(text: string): void {
        if (this.logPath) {
            writeLog(text, this.logPath);
        }
    }

    public resetState(): void {
        if (this.promptTimer) clearTimeout(this.promptTimer);
        this.promptTimer = null;
        this.gaSeen = false;
        this.partialLine = "";
        this.lines = [];
    }
}
