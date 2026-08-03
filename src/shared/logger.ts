import { stripANSI } from "bun";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import path from "node:path";

let currentStream: WriteStream | null = null;
let currentFileDate = "";

function getDateStamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ensureStream(logDir: string): WriteStream {
  const dateStamp = getDateStamp();

  if (currentStream && currentFileDate === dateStamp) {
    return currentStream;
  }

  if (currentStream) {
    currentStream.end();
    currentStream = null;
  }

  mkdirSync(logDir, { recursive: true });
  const filePath = path.join(logDir, `${dateStamp}.txt`);
  const newStream = createWriteStream(filePath, { flags: "a" });

  currentStream = newStream;
  currentFileDate = dateStamp;
  return currentStream;
}

export function writeLog(text: string, logDir: string): void {
  const stream = ensureStream(logDir);
  stream.write(stripANSI(text));
}
