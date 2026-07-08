import "dotenv/config";
import readline from "node:readline";
import { connect } from "./connection.js";

const MUD_SERVER = requireEnv("MUD_SERVER");
const MUD_PORT = Number(requireEnv("MUD_PORT"));
const PROXY = process.env.PROXY || undefined;

const COLOR = {
  yellow: "\x1b[33m",
  red: "\x1b[31m",
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

  socket.on("data", (chunk: Buffer) => {
    const clean = stripTelnetIAC(chunk);
    process.stdout.write(clean.toString("utf8"));
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

function stripTelnetIAC(buf: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0xff) {
      const cmd = buf[i + 1];
      if (cmd === 0xfb || cmd === 0xfc || cmd === 0xfd || cmd === 0xfe) {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    out.push(buf[i]);
  }
  return Buffer.from(out);
}

function systemMessage(message: string) {
  process.stdout.write(`${COLOR.yellow}> ${message}${COLOR.reset}\r\n`);
}

function systemError(message: string) {
  process.stdout.write(`${COLOR.red}> ${message}${COLOR}\r\n`);
}
