import net from "node:net";
import readline from "node:readline";

const HOST = "bylins.su";
const PORT = 4000;

const socket = net.connect(PORT, HOST, () => {
  console.log(`Connected to ${HOST}:${PORT}`);
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

function stripTelnetIAC(buf: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0xff) {
      const cmd = buf[i + 1];
      if (cmd === 0xfb || cmd === 0xfc || cmd === 0xfd || cmd === 0xfe) {
        i += 2; // WILL/WONT/DO/DONT + option byte
      } else {
        i += 1; // однобайтовая команда, например GA (0xF9) или NOP
      }
      continue;
    }
    out.push(buf[i]);
  }
  return Buffer.from(out);
}
