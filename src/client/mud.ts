import type { Socket } from "node:net";
import { createInflate, type Inflate } from "node:zlib";

import { conn } from "./connection";
import { runPromptHooks, runTriggers, runMsdpHooks } from "./triggers";
import { systemError, systemMessage, debug, COLOR } from "./utils";
import { broadcast, addOutputSink } from "./output";
import { stripTelnetIAC, type TelnetEvent } from "./telnet";
import { parseMsdp, encodeMsdpVar } from "./msdp";
import { encode } from "./encoding";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;
const CONSOLE_OUTPUT = Number(process.env.CONSOLE_OUTPUT || 1);

const MSDP_OPTION = 0x45;
const COMPRESS2_OPTION = 0x56;

let socket: Socket | null = null;
let inflate: Inflate | null = null;
let lines: string[] = [];
let partialLine = "";

if (CONSOLE_OUTPUT > 0) {
  addOutputSink((text) => process.stdout.write(text));
}

export async function connect() {
  socket = await conn(MUD_SERVER, MUD_PORT, PROXY);
  systemMessage(`Connected to ${MUD_SERVER}:${MUD_PORT}`);

  socket.on("close", () => {
    systemMessage("Connection closed");
    socket = null;
    inflate?.destroy();
    inflate = null;
  });

  socket.on("error", (e) => systemError("Socket error: " + e.message));

  socket.on("data", (chunk: Buffer) => {
    if (inflate) {
      inflate.write(chunk);
    } else {
      processIncoming(chunk);
    }
  });
}

function processIncoming(chunk: Buffer): void {
  const { text, hasGA, events, compressedTail } = stripTelnetIAC(chunk);
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

  if (compressedTail !== null) {
    startCompression(compressedTail);
  }
}

function startCompression(tail: Buffer): void {
  if (inflate) return; // уже включено, повторный маркер игнорируем

  const inf = createInflate();
  inflate = inf;

  inf.on("data", (decompressed: Buffer) => processIncoming(decompressed));
  inf.on("error", (err) => {
    systemError("MCCP inflate error: " + err.message);
    inf.destroy();
    inflate = null;
  });

  debug("[telnet] MCCP2 compression started");
  if (tail.length > 0) inf.write(tail);
}

export function sendRaw(data: string) {
  if (socket != null) {
    socket.write(encode(data));
  }
}

export function sendl(command: string) {
  if (socket == null) {
    systemError("Not connected to server");
    return;
  }

  const s = socket;
  command.split(/;/).forEach((cmd) => s.write(encode(cmd + "\r\n")));

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
      Buffer.from([0xff, 0xfa, MSDP_OPTION]),
      encodeMsdpVar(name, value),
      Buffer.from([0xff, 0xf0]),
    ]),
  );
}

function handleTelnetEvent(event: TelnetEvent): void {
  if (socket == null) return;

  if (event.kind === "negotiation") {
    if (event.command === "WILL" && event.option === MSDP_OPTION) {
      socket.write(Buffer.from([0xff, 0xfd, MSDP_OPTION])); // IAC DO COMPRESS2
    } else if (event.command === "WILL" && event.option === COMPRESS2_OPTION) {
      socket.write(Buffer.from([0xff, 0xfd, COMPRESS2_OPTION]));
    }
    return;
  }

  if (event.option === MSDP_OPTION) {
    const data = parseMsdp(event.payload);
    runMsdpHooks(data);
  }
}
