import { IMudSession, MudSession } from "./MudSession";
import { showerr, showme } from "../shared/utils";
import { addOutputSink } from "./output";
import { setStatus, tuiLog } from "../tui";

const session: IMudSession = new MudSession();

addOutputSink((text, isolated) => tuiLog(text, isolated));
session.setErrorCallback((e: Error) => showerr(e.message));
session.setInfoCallback((text: string) => showme(text));
session.setStatusCallback((text: string) => setStatus(text));

export function connect(host: string, port?: number, proxy?: string): Promise<void> {
    return session.connect(host, port, proxy);
}

export function disconnect(): void {
    session.disconnect();
}

export function sendRaw(command: string): void {
    session.sendText(command);
}

export function sendl(command: string): void {
    command.split(/;/).forEach((cmd) => {
        session.sendText(cmd)
    });
}

export function sendMsdp(name: string, value: string): void {
    session.sendMsdp(name, value);
}

export { session };
