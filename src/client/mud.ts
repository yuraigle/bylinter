import { MudSession } from "./MudSession";
import { writeLog } from "../shared/logger";
import { showerr, showme } from "../shared/utils";
import { addOutputSink } from "./output";
import { setStatus, tuiLog } from "../tui";

const session = new MudSession();

addOutputSink((text, isolated) => tuiLog(text, isolated));
session.setErrorCallback((e: Error) => showerr(e.message));
session.setInfoCallback((text: string) => showme(text));
session.setStatusCallback((text: string) => setStatus(text));
const logPath = process.env.LOG_PATH || "";
if (logPath) session.setLogger((text: string) => writeLog(text, logPath));

export function connect(host: string, port?: number, proxy?: string): Promise<void> {
    return session.connect(host, port, proxy);
}

export function disconnect(): void {
    session.disconnect();
}

export function sendRaw(command: string): void {
    session.send(command);
}

export function sendl(command: string): void {
    session.sendl(command);
}

export function sendMsdp(name: string, value: string): void {
    session.sendMsdp(name, value);
}

export { session };
