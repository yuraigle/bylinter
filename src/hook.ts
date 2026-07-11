import { sendl } from "./mud";
import { systemMessage } from "./utils";

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

export function promptHook(prompt: string, lines: string[]): void {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendl("");
  }
}

export function lineHook(line: string): void {
  // Эти промпты без GA
  if (line.includes("Using keytable")) {
    sendl("5");
  } else if (/^\s+Посетите наш сайт/.test(line) && CHAR_NAME) {
    sendl(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}`);
  }
}
