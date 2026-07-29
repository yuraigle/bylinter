import type { Socket } from "node:net";
import { createInflate, Inflate } from "node:zlib";

import { ICommandSender, TcpCommandSender } from "./CommandSender";
import { createTelnetParser, TelnetEvent, MSDP_OPT, COMPRESS2_OPT }
    from "../protocol/telnet";
import { parseMsdp } from "../protocol/msdp";
import { ITextPipeline } from "./TextPipeline";
import { ConnectionProvider } from "./connect/ConnectionProvider";
import { ITerminalUI } from "../tui/TerminalUI";

export interface IMudSession {
    isConnected(): boolean;
    getSocket(): Socket | null;
    connect(host: string, port?: number, proxy?: string): Promise<void>;
    disconnect(): void;
    sendText(command: string): void;
    sendMsdp(name: string, value: string): void;
}

export class MudSession implements IMudSession {
    private readonly textPipeline: ITextPipeline;
    private readonly sender: ICommandSender;
    private telnetParser = createTelnetParser(); // todo сделать классом

    private socket: Socket | null = null;
    private inflate: Inflate | null = null;
    private onInfo?: (text: string) => void; // инфо в TUI
    private onError?: (error: Error) => void; // ошибки в TUI
    private onStatus?: (text: string) => void; // статусное сообщение

    constructor(
        textPipeline: ITextPipeline,
        sender: TcpCommandSender,
    ) {
        this.textPipeline = textPipeline;
        this.sender = sender;
    }

    public setTui = (tui: ITerminalUI) => {
        this.onInfo = tui.showme;
        this.onError = (err: Error) => tui.showerr(err.message);
        this.onStatus = tui.setStatus;
    }

    public isConnected = (): boolean => {
        return this.socket != null && !this.socket.destroyed;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public connect = async (
        host: string,
        port = 4000,
        proxy = ""
    ): Promise<void> => {
        if (this.isConnected()) {
            this.disconnect();
        }

        try {
            this.invokeStatus(`Trying to connect to ${host}:${port}...`);
            const sock = await ConnectionProvider.connect(host, port, proxy);
            this.setupSocket(sock);
            this.invokeStatus(`Connected to ${host}:${port}`);
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            this.invokeStatus("Not connected");
            throw err;
        }
    }

    public disconnect = (): void => {
        if (this.socket) {
            this.socket.destroy();
        } else {
            this.invokeError(new Error("Not connected to a server."));
        }
        this.resetSessionState();
    }

    public sendText = (command: string): void => {
        try {
            this.sender.sendText(command);
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
        const { segments, events, compressedTail } =
            this.telnetParser.feed(chunk);

        for (const event of events) {
            this.handleTelnetEvent(event);
        }

        for (const segment of segments) {
            this.textPipeline.handleIncomingText(segment.text, segment.hasGA);
        }

        if (compressedTail !== null) {
            this.startCompression(compressedTail);
        }
    }

    private handleTelnetEvent(ev: TelnetEvent): void {
        if (!this.socket) return;

        if (ev.kind === "negotiation") {
            if (ev.command === "WILL" && ev.option === MSDP_OPT) {
                this.socket.write(Buffer.from([0xff, 0xfd, MSDP_OPT]));
            } else if (ev.command === "WILL" && ev.option === COMPRESS2_OPT) {
                this.socket.write(Buffer.from([0xff, 0xfd, COMPRESS2_OPT]));
            }
            return;
        }

        if (ev.option === MSDP_OPT) {
            const msdpData = parseMsdp(ev.payload);
            this.textPipeline.handleIncomingMsdp(msdpData);
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
        this.textPipeline.resetState();
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

}
