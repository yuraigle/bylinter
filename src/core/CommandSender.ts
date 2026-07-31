import type { Socket } from "node:net";

import { encodeMsdpVar } from "../protocol/msdp";
import { encode } from "../shared/encoding";

export interface ICommandSender {
    sendText(command: string): void;
    sendMsdp(name: string, value: string): void;
    setSocket(socket: Socket | null): void;
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
            throw new Error(msg);
        }
    }

    public sendText(command: string): void {
        this.ensureConnected();
        this.socket!.write(encode(command + "\r\n"));
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
