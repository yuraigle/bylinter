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
import { COLOR, stripBold } from "./ansi";
import { broadcast, addOutputSink } from "./output";
import { stripTelnetIAC, type TelnetEvent } from "./telnet";
import { parseMsdp, encodeMsdpVar } from "./msdp";
import { encode } from "./encoding";
import { tuiLog, setStatus } from "./tui";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;
const CONSOLE_OUTPUT = process.env.CONSOLE_OUTPUT === "1";
const DISABLE_BOLD_FONT = process.env.DISABLE_BOLD_FONT === "1";

let socket: Socket | null = null;
let inflate: Inflate | null = null;
let lines: string[] = [];
let partialLine = "";

if (CONSOLE_OUTPUT) {
  addOutputSink((text) => tuiLog(text));
}

export async function connect() {
  socket = await conn(MUD_SERVER, MUD_PORT, PROXY);
  setStatus(`Connected to ${MUD_SERVER}:${MUD_PORT}`);

  socket.on("close", () => {
    setStatus("Not connected");
    showme("Connection closed", true);
    socket = null;
    inflate?.destroy();
    inflate = null;
  });

  socket.on("error", (e) => {
    showerr(`Socket error: ${e.message}`, false);
  });

  socket.on("data", (chunk: Buffer) => {
    if (inflate) {
      inflate.write(chunk);
    } else {
      processIncoming(chunk);
    }
  });
}

export function disconnect(): void {
  if (socket != null) {
    socket.destroy();
    socket = null;
  } else {
    showerr("Not connected to a server.", false);
  }
}

function processIncoming(chunk: Buffer): void {
  const { text, hasGA, events, compressedTail } = stripTelnetIAC(chunk);

  for (const event of events) {
    handleTelnetEvent(event);
  }

  partialLine += text;
  const chunkLines = partialLine.split("\n").map((l) => l.replace(/\r$/, ""));
  const completedLines = chunkLines.slice(0, -1);
  lines.push(...completedLines);
  partialLine = chunkLines[chunkLines.length - 1];

  if (completedLines.length > 0) {
    // completedLines.forEach((line) => {
    //   runTriggers(line);
    //   let out = applySubstitutes(line);
    //   out =  DISABLE_BOLD_FONT ? stripBold(out) : out;
    //   broadcast(out + "\r\n");
    // });

    let out = completedLines.join("\r\n") + "\r\n";
    out = applySubstitutes(out);
    out = DISABLE_BOLD_FONT ? stripBold(out) : out;
    broadcast(out);
    completedLines.forEach((line) => runTriggers(line));
  }

  if (hasGA) {
    const prompt = partialLine;
    broadcast(prompt);
    runPromptHooks(prompt, lines);
    partialLine = "";
    lines = [];
  }

  if (compressedTail !== null) {
    startCompression(compressedTail);
  }
}

export function sendRaw(data: string) {
  if (socket != null) {
    socket.write(encode(data));
  }
}

export function sendl(command: string) {
  if (socket == null) {
    showerr("Can't send text: not connected to a server.", false);
    return;
  }

  const s = socket;
  command.split(/;/).forEach((cmd) => s.write(encode(cmd + "\n")));

  const echo = COLOR.brightYellow + command + COLOR.reset + "\n";
  broadcast(echo);
}

export function sendline(command: string) {
  if (socket == null) {
    showerr("Can't send text: not connected to a server.", false);
    return;
  }

  const s = socket;
  command.split(/;/).forEach((cmd) => s.write(encode(cmd + "\n")));

  const echo =
    "\r\n" + COLOR.brightYellow + "[" + command + "]" + COLOR.reset + "\r\n";
  broadcast(echo);
}

export function sendMsdp(name: string, value: string): void {
  if (socket == null) {
    showerr("Can't send msdp: not connected to a server.", false);
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
    showerr(`MCCP inflate error: ${err.message}`, false);
    inf.destroy();
    inflate = null;
  });

  showme("MCCP2 compression started", true);
  if (tail.length > 0) inf.write(tail);
}
