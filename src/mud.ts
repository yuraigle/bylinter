import type { Socket } from "node:net";

import { conn } from "./connection";
import { runPromptHooks, runTriggers } from "./triggers";
import { systemError, systemMessage, debug, COLOR } from "./utils";
import { broadcast, addOutputSink } from "./output";
import { stripTelnetIAC, describeOption, type TelnetEvent } from "./telnet";
import { parseMsdp, encodeMsdpVar } from "./msdp";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;
const CONSOLE_OUTPUT = Number(process.env.CONSOLE_OUTPUT || 1);

const MSDP_OPTION = 0x45;
const COMPRESS2_OPTION = 0x56;

let socket: Socket | null = null;

export async function connect() {
  socket = await conn(MUD_SERVER, MUD_PORT, PROXY);
  systemMessage(`Connected to ${MUD_SERVER}:${MUD_PORT}`);

  if (CONSOLE_OUTPUT > 0) {
    addOutputSink((text) => process.stdout.write(text));
  }

  socket.on("close", () => {
    systemMessage("Connection closed");
    socket = null;
  });
  socket.on("error", (e) => systemError("Socket error: " + e.message));

  let lines: string[] = [];
  let partialLine = "";

  socket.on("data", (chunk: Buffer) => {
    const { text, hasGA, events } = stripTelnetIAC(chunk);
    broadcast(text);

    for (const event of events) {
      handleTelnetEvent(event);
    }

    partialLine += text;
    const chunkLines = partialLine.split("\n");
    lines.push(...chunkLines.slice(0, -1).map((l) => l.replace(/\r$/, "")));
    partialLine = chunkLines[chunkLines.length - 1];

    chunkLines.slice(0, -1).forEach((line) => runTriggers(line));

    if (hasGA) {
      const prompt = partialLine;
      runPromptHooks(prompt, lines);
      partialLine = "";
      lines = [];
    }
  });
}

export function sendRaw(data: string) {
  if (socket != null) {
    socket.write(data, "utf8");
  }
}

export function sendl(command: string) {
  if (socket == null) {
    systemError("Not connected to server");
    return;
  }

  const s = socket;
  command.split(/;/).forEach((cmd) => s.write(cmd + "\r\n", "utf8"));

  const echo = COLOR.yellow + "[" + command + "]" + COLOR.reset + "\r\n";
  broadcast(echo);
}

export function sendMsdp(name: string, value: string): void {
  if (socket == null) {
    systemError("Not connected to server");
    return;
  }

  socket.write(
    Buffer.concat([
      Buffer.from([0xff, 0xfa, MSDP_OPTION]), // IAC SB MSDP
      encodeMsdpVar(name, value),
      Buffer.from([0xff, 0xf0]), // IAC SE
    ]),
  );
}

function handleTelnetEvent(event: TelnetEvent): void {
  if (socket == null) return;

  if (event.kind === "negotiation") {
    if (event.command === "WILL" && event.option === MSDP_OPTION) {
      socket.write(Buffer.from([0xff, 0xfd, MSDP_OPTION]));
      debug("[telnet] IAC DO MSDP");
    } else if (event.command === "WILL" && event.option === COMPRESS2_OPTION) {
      socket.write(Buffer.from([0xff, 0xfe, COMPRESS2_OPTION]));
      debug("[telnet] IAC DONT COMPRESS2"); // TODO: реализовать zlib
    }
    return;
  }

  if (event.option === MSDP_OPTION) {
    const data = parseMsdp(event.payload);
    debug(`[MSDP] ${JSON.stringify(data)}`);
  }
}
