import "dotenv/config";
import readline from "node:readline";
import { Socket } from "node:net";

import { connect } from "./connection";
import { systemError, systemMessage } from "./utils";

const MUD_SERVER = process.env.MUD_SERVER || "";
const MUD_PORT = Number(process.env.MUD_PORT || 4000);
const PROXY = process.env.PROXY || undefined;
const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

let socket: Socket;

async function main() {
  socket = await connect(MUD_SERVER, MUD_PORT, PROXY);
  systemMessage(`Connected to ${MUD_SERVER}:${MUD_PORT}`);

  let partialLine = "";
  let lines: string[] = [];

  socket.on("data", (chunk: Buffer) => {
    const { text, hasGA } = stripTelnetIAC(chunk);
    process.stdout.write(text);

    partialLine += text;
    const parts = partialLine.split("\n");
    lines.push(...parts.slice(0, -1).map((l) => l.replace(/\r$/, "")));
    partialLine = parts[parts.length - 1];

    if (hasGA) {
      promptHook(partialLine, lines);
      partialLine = "";
      lines = [];
    }

    // Эти промпты без GA
    if (text.includes("Using keytable")) {
      sendl("5");
    } else if (text.includes("Введите имя персонажа ") && CHAR_NAME) {
      sendl(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}`);
    }
  });

  socket.on("close", () => {
    systemMessage("Connection closed");
    process.exit(0);
  });

  socket.on("error", (err) => systemError("Socket error: " + err.message));

  readline
    .createInterface({ input: process.stdin })
    .on("line", (line) => sendl(line));
}

main().catch((err) => {
  systemError("Failed to connect: " + err.message);
  process.exit(1);
});

function promptHook(prompt: string, lines: string[]) {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendl("");
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

function sendl(command: string) {
  if (socket) {
    socket.write(command + "\r\n", "utf8");
  } else {
    systemError("Not connected to server");
  }
}
