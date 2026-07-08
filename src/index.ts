import "dotenv/config";
import readline from "node:readline";
import { connect } from "./connection.js";

const MUD_SERVER = requireEnv("MUD_SERVER");
const MUD_PORT = Number(requireEnv("MUD_PORT"));
const PROXY = process.env.PROXY || undefined;

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

const COLOR = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

async function main() {
  const socket = await connect(MUD_SERVER, MUD_PORT, PROXY);
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
      socket.write("5\r\n");
    }
    if (text.includes("Введите имя персонажа ") && CHAR_NAME) {
      socket.write(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}\r\n`);
    }
  });

  socket.on("close", () => {
    systemMessage("Connection closed");
    process.exit(0);
  });

  socket.on("error", (err) => systemError("Socket error: " + err.message));

  readline
    .createInterface({ input: process.stdin })
    .on("line", (line) => socket.write(line + "\r\n", "utf8"));
}

main().catch((err) => {
  systemError("Failed to connect: " + err.message);
  process.exit(1);
});

function promptHook(prompt: string, lines: string[]) {}

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

function systemMessage(message: string) {
  process.stdout.write(`${COLOR.yellow}> ${message}${COLOR.reset}\r\n`);
}

function systemError(message: string) {
  process.stdout.write(`${COLOR.red}> ${message}${COLOR.reset}\r\n`);
}
