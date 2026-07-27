import type { Socket } from "node:net";
import { encodeMsdpVar } from "../core/protocol/msdp";
import { encode } from "../shared/encoding";
import { NoConnectionError } from "./NoConnectionError";

export interface ICommandSender {
    send(command: string): void;
    sendLine(command: string): void;
    sendMsdp(name: string, value: string): void;
}

export class TcpCommandSender implements ICommandSender {
    private socket: Socket | null;

    constructor(socket: Socket | null) {
        this.socket = socket;
    }

    public setSocket(socket: Socket | null): void {
        this.socket = socket;
    }

    private ensureConnected(): void {
        if (!this.socket) {
            const msg: string = "Can't send text: not connected to a server.";
            throw new NoConnectionError(msg);
        }
    }

    public send(command: string): void {
        this.ensureConnected();
        this.socket!.write(encode(command + "\r\n"));
    }

    public sendLine(command: string): void {
        this.ensureConnected();
        const socketRef = this.socket!;

        command.split(/;/).forEach((cmd) => {
            socketRef.write(encode(cmd + "\r\n"));
        });
    }

    public sendMsdp(name: string, value: string): void {
        this.ensureConnected();

        this.socket!.write(
            Buffer.concat([
                Buffer.from([0xff, 0xfa, 0x45]),
                encodeMsdpVar(name, value),
                Buffer.from([0xff, 0xf0]),
            ]),
        );
    }
}