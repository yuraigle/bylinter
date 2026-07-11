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
