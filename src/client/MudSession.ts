import type { Socket } from "node:net";
import { createInflate, Inflate } from "node:zlib";

import { TcpCommandSender } from "./CommandSender";
import { createTelnetParser, TelnetEvent } from "../core/protocol/telnet";
import { broadcast } from "./output";
import { connectDirect, connectViaProxy } from "./connection";
import {
    applySubstitutes, runMsdpHooks, runPromptHooks, runTriggers
} from "../core/logic/triggers";
import { parseMsdp } from "../core/protocol/msdp";
import { COLOR } from "../core/protocol/ansi";

export interface IMudSession {
    isConnected(): boolean;
    getSocket(): Socket | null;
    connect(host: string, port?: number, proxy?: string): Promise<void>;
    disconnect(): void;
    send(command: string): void;
    sendl(command: string): void;
    sendMsdp(name: string, value: string): void;

    setInfoCallback(cb: (text: string) => void): void; // инфо в TUI
    setErrorCallback(cb: (error: Error) => void): void; // ошибки в TUI
    setStatusCallback(cb: (text: string) => void): void; // статусное сообщение
    setLogger(callback: (text: string) => void): void; // для логгера в файл
}

export class MudSession implements IMudSession {
    // --- Сетевое состояние ---
    private socket: Socket | null = null;
    private sender: TcpCommandSender = new TcpCommandSender(null);
    private inflate: Inflate | null = null;

    private telnetParser = createTelnetParser(); // todo: тип?
    private lines: string[] = [];
    private partialLine = "";

    // --- Debounce промпта ---
    private static readonly PROMPT_TIMEOUT_MS = 250;
    private promptTimer: NodeJS.Timeout | null = null;
    private gaSeen = false;

    private onInfo?: (text: string) => void;
    private onError?: (error: Error) => void;
    private onStatus?: (text: string) => void;
    private logger?: (text: string) => void;

    public isConnected(): boolean {
        return this.socket != null && !this.socket.destroyed;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public async connect(host: string, port = 4000, proxy = ""): Promise<void> {
        if (this.isConnected()) {
            this.disconnect();
        }

        try {
            this.invokeStatus(`Trying to connect to ${host}:${port}...`);

            const sock = proxy
                ? await connectViaProxy(host, port, proxy)
                : await connectDirect(host, port);

            this.setupSocket(sock);
            this.invokeStatus(`Connected to ${host}:${port}`);
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            this.invokeStatus("Not connected");
            throw err;
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.destroy();
        } else {
            this.invokeError(new Error("Not connected to a server."));
        }
        this.resetSessionState();
    }

    public send(command: string): void {
        try {
            this.sender.send(command);
        } catch (e) {
            if (e instanceof Error) this.invokeError(e);
        }
    }

    public sendl(command: string): void {
        const echo = COLOR.brightYellow + command + COLOR.reset;
        broadcast(echo, true);

        try {
            this.sender.sendLine(command);
        } catch (e) {
            if (e instanceof Error) this.invokeError(e);
        }
    }

    public sendMsdp(name: string, value: string): void {
        try {
            this.sender.sendMsdp(name, value);
        } catch (e) {
            if (e instanceof Error) this.invokeError(e);
        }
    }

    public setInfoCallback(cb: (text: string) => void): void {
        this.onInfo = cb;
    }

    public setErrorCallback(cb: (error: Error) => void): void {
        this.onError = cb;
    }

    public setStatusCallback(cb: (text: string) => void): void {
        this.onStatus = cb;
    }

    public setLogger(cb: (text: string) => void): void {
        this.logger = cb;
    }

    private setupSocket(socket: Socket): void {
        this.socket = socket;
        this.sender.setSocket(socket);

        socket.on("data", (chunk: Buffer) => {
            if (this.inflate) {
                this.inflate.write(chunk);
            } else {
                this.processIncoming(chunk);
            }
        });

        socket.once("close", () => {
            this.invokeStatus("Not connected");
            this.resetSessionState();
        });

        socket.once("error", (e: Error) => {
            this.invokeError(e);
            this.invokeStatus("Not connected");
            this.resetSessionState();
        });
    }

    private processIncoming(chunk: Buffer): void {
        const { segments, events, compressedTail } = this.telnetParser.feed(chunk);

        for (const event of events) {
            this.handleTelnetEvent(event);
        }

        for (const segment of segments) {
            this.processSegment(segment.text, segment.hasGA);
        }

        if (compressedTail !== null) {
            this.startCompression(compressedTail);
        }
    }

    private processSegment(text: string, hasGA: boolean): void {
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
            if (this.promptTimer) clearTimeout(this.promptTimer);
            this.flushPrompt();
        } else if (!this.gaSeen && this.partialLine.length > 0) {
            this.schedulePromptTimeout();
        }

        this.invokeLogger(text + (hasGA ? "\r\n" : ""));
    }

    private flushPrompt(): void {
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
            if (this.partialLine.length > 0) {
                this.flushPrompt();
            }
        }, MudSession.PROMPT_TIMEOUT_MS);
    }

    private handleTelnetEvent(ev: TelnetEvent): void {
        if (!this.socket) return;

        const MSDP_OPTION = 0x45;
        const COMPRESS2_OPT = 0x56;

        if (ev.kind === "negotiation") {
            if (ev.command === "WILL" && ev.option === MSDP_OPTION) {
                this.socket.write(Buffer.from([0xff, 0xfd, MSDP_OPTION]));
            } else if (ev.command === "WILL" && ev.option === COMPRESS2_OPT) {
                this.socket.write(Buffer.from([0xff, 0xfd, COMPRESS2_OPT]));
            }
            return;
        }

        if (ev.option === MSDP_OPTION) {
            const data = parseMsdp(ev.payload);
            runMsdpHooks(data);
        }
    }

    private startCompression(tail: Buffer): void {
        if (this.inflate) return;

        const inf = createInflate();
        this.inflate = inf;

        inf.on("data", (buff: Buffer) => this.processIncoming(buff));
        inf.on("error", (err: Error) => {
            this.invokeError(new Error(`MCCP inflate error: ${err.message}`));
            inf.destroy();
            this.inflate = null;
        });

        this.invokeInfo("MCCP2 compression started");
        if (tail.length > 0) inf.write(tail);
    }

    private resetSessionState(): void {
        this.socket = null;
        this.sender.setSocket(null);
        this.inflate?.destroy();
        this.inflate = null;
        this.telnetParser = createTelnetParser();
        this.lines = [];
        this.partialLine = "";
        this.gaSeen = false;
        if (this.promptTimer) {
            clearTimeout(this.promptTimer);
            this.promptTimer = null;
        }
    }

    private invokeInfo(text: string): void {
        this.onInfo?.(text);
    }

    private invokeError(error: Error): void {
        this.onError?.(error);
    }

    private invokeStatus(text: string): void {
        this.onStatus?.(text);
    }

    private invokeLogger(text: string): void {
        this.logger?.(text);
    }
}
