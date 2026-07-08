import readline from "node:readline";
import { connect } from "./connection.js";

const MUD_SERVER = "bylins.su";
const MUD_PORT = 4000;
const PROXY: string | null = "http://10.10.11.30:3128";

async function main() {
  const socket = await connect(MUD_SERVER, MUD_PORT, PROXY ?? undefined);

  socket.on("connect", () => {
    console.log(
      `Connected to ${MUD_SERVER}:${MUD_PORT}${PROXY ? ` via proxy ${PROXY}` : ""}`,
    );
  });

  socket.on("data", (chunk: Buffer) => {
    const clean = stripTelnetIAC(chunk);
    process.stdout.write(clean.toString("utf8"));
  });

  socket.on("close", () => {
    console.log("Connection closed");
    process.exit(0);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });

  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    socket.write(line + "\r\n", "utf8");
  });
}

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

main().catch((err) => {
  console.error("Failed to connect:", err.message);
  process.exit(1);
});
