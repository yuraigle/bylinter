import {
  TriggerCollection,
  PromptHookCollection,
  MsdpHookCollection,
  SubstituteCollection,
} from "../logic";
import { writeLog } from "../shared/logger";
import { Broadcaster } from "./Broadcaster";

const rxColor: RegExp = /^\x1b\[[01];3[0-7]m$/;
const rxReset: RegExp = /^\x1b\[0(;0)?m$/;
const endsWithReset = (s: string): boolean => /\x1b\[0(;0)?m$/.test(s);
const startsWithColor = (s: string): boolean => /^\x1b\[[01];3[0-7]m/.test(s);
const hasAnyColor = (s: string): boolean => /\x1b\[[01];3[0-7]m/.test(s);

export class TextPipeline {
  private readonly triggers: TriggerCollection;
  private readonly substitutes: SubstituteCollection;
  private readonly promptHooks: PromptHookCollection;
  private readonly msdpHooks: MsdpHookCollection;
  private readonly broadcaster: Broadcaster;
  private carrySgr: string = "";
  private logPath: string | null = process.env.LOG_PATH || null;

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

  private linesFromLastPrompt: string[] = [];
  private partialLine = "";

  // prompt debouncer
  private static PROMPT_TIMEOUT_MS: number = 250;
  private promptTimer: NodeJS.Timeout | null = null;
  private gaSeen = false;

  public handleIncomingText = (text: string, hasGA: boolean): void => {
    this.partialLine += text;
    const chunkLines = this.partialLine.replaceAll(/\r/g, "").split("\n");
    const completedLines = chunkLines.slice(0, -1);

    // подстановка цветов в начало каждой строки, ресет - в конец
    for (let i = 0; i < completedLines.length; i++) {
      let outLine = completedLines[i];
      if (outLine.match(/^\s*$/)) continue; // игнор пустых строк
      if (this.carrySgr && !startsWithColor(outLine)) {
        outLine = this.carrySgr + outLine; // добавить цвет в начало
      }
      this.updateCarrySgr(completedLines[i]); // обновить последний цвет
      if (hasAnyColor(outLine) && !endsWithReset(outLine)) {
        outLine += "\x1b[0m"; // закрыть цвет на этой строке
      }
      // если цвет просто открылся и закрылся, пишем пустую строку
      if (outLine.match(/^\x1b\[[01];3[0-7]m\s*\x1b\[0(;0)?m$/)) outLine = "";

      completedLines[i] = outLine;
    }

    this.linesFromLastPrompt.push(...completedLines);
    this.partialLine = chunkLines[chunkLines.length - 1];

    completedLines.forEach((lineCL) => {
      this.triggers.dispatch(lineCL); // lineCL - text colored
      this.invokeLogger("\r\n" + lineCL);
      const outLineCL = this.substitutes.dispatch(lineCL);
      if (outLineCL !== null) {
        this.broadcaster.broadcast(outLineCL);
      }
    });

    if (hasGA) {
      this.gaSeen = true;
      this.flushPrompt();
    } else if (!this.gaSeen && this.partialLine.length > 0) {
      this.schedulePromptTimeout(); // ждём 250мс и промт = остаток
    }
  };

  public handleIncomingMsdp = (data: Record<string, unknown>): void => {
    this.msdpHooks.dispatch(data);
  };

  public resetState = (): void => {
    if (this.promptTimer) clearTimeout(this.promptTimer);
    this.promptTimer = null;
    this.gaSeen = false;
    this.carrySgr = "";
    this.partialLine = "";
    this.linesFromLastPrompt = [];
  };

  private schedulePromptTimeout(): void {
    if (this.promptTimer) clearTimeout(this.promptTimer);
    this.promptTimer = setTimeout(() => {
      this.promptTimer = null;
      this.flushPrompt();
    }, TextPipeline.PROMPT_TIMEOUT_MS);
  }

  private flushPrompt(): void {
    const prompt = this.partialLine;
    this.promptHooks.dispatch(prompt, this.linesFromLastPrompt);
    this.broadcaster.broadcast(prompt, true);
    this.invokeLogger("\r\n" + prompt);
    this.partialLine = "";
    this.carrySgr = ""; // промт сбрасывает цвет
    this.linesFromLastPrompt = [];
  }

  private updateCarrySgr(chunk: string): void {
    const ansiMatches = chunk.match(/\x1b\[[0-9;]*m/g);
    if (!ansiMatches) return;
    for (const code of ansiMatches) {
      if (rxReset.test(code)) {
        this.carrySgr = "";
      } else if (rxColor.test(code)) {
        this.carrySgr = code;
      }
    }
  }

  private invokeLogger(text: string): void {
    if (this.logPath) {
      writeLog(text, this.logPath);
    }
  }
}
