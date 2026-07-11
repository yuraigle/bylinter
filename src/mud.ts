import type { Socket } from "node:net";

import { conn } from "./connection";
import { runPromptHooks, runTriggers } from "./triggers";
import { systemError, systemMessage, stripTelnetIAC, COLOR } from "./utils";
import { broadcast, addOutputSink } from "./output";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;
const CONSOLE_OUTPUT = Number(process.env.CONSOLE_OUTPUT || 1);

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
    const { text, hasGA } = stripTelnetIAC(chunk);
    broadcast(text);

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

// Команда от консоли или от триггера — с эхом всем приёмникам
export function sendl(command: string) {
  if (socket != null) {
    socket.write(command + "\r\n", "utf8");
    const echo = COLOR.yellow + "[" + command + "]" + COLOR.reset + "\r\n";
    broadcast(echo); // раньше было process.stdout.write(echo)
  } else {
    systemError("Not connected to server");
  }
}

// Сырой ввод от внешнего клиента — идёт на сервер как есть, без своего эха
// (клиент вроде Mudlet сам себе показывает то, что печатает)
export function sendRaw(data: string) {
  if (socket != null) {
    socket.write(data, "utf8");
  }
}
