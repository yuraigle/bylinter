import type { Socket } from "node:net";

import { systemError, systemMessage, COLOR } from "./utils";
import { conn } from "./connection";
import { promptHook, lineHook } from "./hook";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;

let socket: Socket | null = null;

export async function connect() {
  socket = await conn(MUD_SERVER, MUD_PORT, PROXY);
  systemMessage(`Connected to ${MUD_SERVER}:${MUD_PORT}`);

  socket.on("close", () => {
    systemMessage("Connection closed");
    socket = null;

  });
  socket.on("error", (e) => systemError("Socket error: " + e.message));

  let lines: string[] = [];
  let partialLine = "";

  socket.on("data", (chunk: Buffer) => {
    const { text, hasGA } = stripTelnetIAC(chunk);
    process.stdout.write(text);

    partialLine += text;
    const chunkLines = partialLine.split("\n");
    lines.push(...chunkLines.slice(0, -1).map((l) => l.replace(/\r$/, "")));
    partialLine = chunkLines[chunkLines.length - 1];

    chunkLines.slice(0, -1).forEach((line) => lineHook(line));

    if (hasGA) {
      const prompt = partialLine; // last line is prompt
      promptHook(prompt, lines);
      partialLine = "";
      lines = [];
    }
  });
}

export function sendl(command: string) {
  if (socket != null) {
    socket.write(command + "\r\n", "utf8");
    const echo = COLOR.yellow + "[" + command + "]" + COLOR.reset + "\r\n";
    process.stdout.write(echo);
  } else {
    systemError("Not connected to server");
  }
}

function stripTelnetIAC(buf: Buffer): { text: string; hasGA: boolean } {
  const out: number[] = [];
  let hasGA = false;

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0xff) {
      const cmd = buf[i + 1];
      if (cmd === 0xf9) {
        hasGA = true; // IAC GA: Go Ahead
        i += 1;
      } else if (cmd === 0xfb || cmd === 0xfc || cmd === 0xfd || cmd === 0xfe) {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    out.push(buf[i]);
  }

  return { text: Buffer.from(out).toString("utf8"), hasGA };
}
