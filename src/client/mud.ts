import type { Socket } from "node:net";
import { createInflate, type Inflate } from "node:zlib";

import { conn } from "./connection";
import {
  runPromptHooks,
  runTriggers,
  runMsdpHooks,
  applySubstitutes,
} from "./triggers";
import { showme, showerr } from "./utils";
import { COLOR } from "./ansi";
import { broadcast, addOutputSink } from "./output";
import { createTelnetParser, type TelnetEvent } from "./telnet";
import { parseMsdp, encodeMsdpVar } from "./msdp";
import { encode } from "./encoding";
import { tuiLog, setStatus } from "./tui";

const CONSOLE_OUTPUT = (process.env.CONSOLE_OUTPUT || "1") === "1";

let telnetParser = createTelnetParser();
let socket: Socket | null = null;
let inflate: Inflate | null = null;
let lines: string[] = [];
let partialLine = "";

if (CONSOLE_OUTPUT) {
  addOutputSink((text, isolated) => tuiLog(text, isolated));
}

export async function connect(
  host: string,
  port: number = 4000,
  proxy: string = "",
): Promise<void> {
  if (socket != null) {
    socket.removeAllListeners();
    socket.destroy();
    resetSession();
  }

  socket = await conn(host, port, proxy);
  setStatus(`Connected to ${host}:${port}`);

  socket.on("data", (chunk: Buffer) => {
    if (inflate) {
      inflate.write(chunk);
    } else {
      processIncoming(chunk);
    }
  });

  socket.on("close", () => {
    setStatus("Not connected");
    showme("Connection closed");
    resetSession();
  });

  socket.on("error", (e) => showerr(`Socket error: ${e.message}`));
}

export function disconnect(): void {
  if (socket != null) {
    socket.destroy();
    socket = null;
  } else {
    showerr("Not connected to a server.");
  }
}

function resetSession(): void {
  socket = null;
  inflate?.destroy();
  inflate = null;
  telnetParser = createTelnetParser();
  lines = [];
  partialLine = "";
}

function processIncoming(chunk: Buffer): void {
  const { segments, events, compressedTail } = telnetParser.feed(chunk);

  for (const event of events) {
    handleTelnetEvent(event);
  }

  for (const segment of segments) {
    processSegment(segment.text, segment.hasGA);
  }

  if (compressedTail !== null) {
    startCompression(compressedTail);
  }
}

function processSegment(text: string, hasGA: boolean): void {
  partialLine += text;
  const chunkLines = partialLine.split("\n").map((l) => l.replace(/\r$/, ""));
  const completedLines = chunkLines.slice(0, -1);
  lines.push(...completedLines);
  partialLine = chunkLines[chunkLines.length - 1];

  completedLines.forEach((line) => {
    runTriggers(line);

    const out: string | null = applySubstitutes(line);
    if (out !== null) {
      broadcast("\r\n" + out);
    }
  });

  if (hasGA) {
    const prompt = partialLine;
    runPromptHooks(prompt, lines);
    broadcast("\r\n" + prompt);
    partialLine = "";
    lines = [];
  }
}

export function sendRaw(command: string) {
  if (socket != null) {
    socket.write(encode(command + "\r\n"));
  }
}

export function sendl(command: string) {
  if (socket == null) {
    showerr("Can't send text: not connected to a server.");
    return;
  }

  const s = socket;
  command.split(/;/).forEach((cmd) => s.write(encode(cmd + "\n")));

  const echo = COLOR.brightYellow + command + COLOR.reset;
  broadcast(echo, true);
}

export function sendMsdp(name: string, value: string): void {
  if (socket == null) {
    showerr("Can't send msdp: not connected to a server.");
    return;
  }

  socket.write(
    Buffer.concat([
      Buffer.from([0xff, 0xfa, 0x45]),
      encodeMsdpVar(name, value),
      Buffer.from([0xff, 0xf0]),
    ]),
  );
}

function handleTelnetEvent(event: TelnetEvent): void {
  if (socket == null) return;

  const MSDP_OPTION = 0x45;
  const COMPRESS2_OPTION = 0x56;

  if (event.kind === "negotiation") {
    if (event.command === "WILL" && event.option === MSDP_OPTION) {
      socket.write(Buffer.from([0xff, 0xfd, MSDP_OPTION]));
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

function startCompression(tail: Buffer): void {
  if (inflate) return;

  const inf = createInflate();
  inflate = inf;

  inf.on("data", (decompressed: Buffer) => processIncoming(decompressed));
  inf.on("error", (err) => {
    showerr(`MCCP inflate error: ${err.message}`);
    inf.destroy();
    inflate = null;
  });

  showme("MCCP2 compression started");
  if (tail.length > 0) inf.write(tail);
}
