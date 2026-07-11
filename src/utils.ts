export const COLOR = {
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
} as const;

export function systemMessage(message: string) {
  process.stdout.write(`${COLOR.yellow}> ${message}${COLOR.reset}\r\n`);
}

export function systemError(message: string) {
  process.stdout.write(`${COLOR.red}> ${message}${COLOR.reset}\r\n`);
}

export function stripTelnetIAC(buf: Buffer): { text: string; hasGA: boolean } {
  const out: number[] = [];
  let hasGA = false;

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0xff) {
      const cmd = buf[i + 1];
      if (cmd === 0xf9) {
        hasGA = true;
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
