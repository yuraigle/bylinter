const TELNET_COMMANDS: Record<number, string> = {
  0xf0: "SE",
  0xf1: "NOP",
  0xf9: "GA",
  0xfa: "SB",
  0xfb: "WILL",
  0xfc: "WONT",
  0xfd: "DO",
  0xfe: "DONT",
};

const TELNET_OPTIONS: Record<number, string> = {
  0x00: "BINARY",
  0x01: "ECHO",
  0x03: "SGA",
  0x1f: "NAWS",
  0x18: "TTYPE",
  0x55: "COMPRESS",
  0x56: "COMPRESS2",
  0x45: "MSDP",
  0x46: "MSSP",
  0x47: "MCCP",
  0x69: "GMCP",
};

function describeCommand(cmd: number, option?: number): string {
  const cmdName = TELNET_COMMANDS[cmd] ?? `0x${cmd.toString(16)}`;
  if (option === undefined) return `IAC ${cmdName}`;
  const optName = TELNET_OPTIONS[option] ?? `0x${option.toString(16)}`;
  return `IAC ${cmdName} ${optName}`;
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
        const option = buf[i + 2];
        debug("[telnet] " + describeCommand(cmd, option));
        i += 2;
      } else if (cmd === 0xfa) {
        // Subnegotiation: IAC SB <option> ... IAC SE — данные переменной длины
        const option = buf[i + 2];
        const seIndex = findSubnegotiationEnd(buf, i + 2);
        debug(
          "[telnet] " +
            describeCommand(cmd, option) +
            `(${seIndex - (i + 3)} bytes payload)`,
        );
        i = seIndex + 1; // пропускаем весь блок вплоть до IAC SE включительно
      } else {
        debug("[telnet]" + describeCommand(cmd));
        i += 1;
      }
      continue;
    }
    out.push(buf[i]);
  }

  return { text: Buffer.from(out).toString("utf8"), hasGA };
}

// Ищет индекс байта SE (0xF0) в последовательности IAC SE, начиная поиск после option byte
function findSubnegotiationEnd(buf: Buffer, from: number): number {
  for (let i = from + 1; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xf0) {
      return i + 1; // индекс самого SE байта
    }
  }
  return buf.length - 1; // не нашли — считаем, что блок оборван на границе чанка
}

function debug(message: string) {
  process.stdout.write(`\x1b[33m${message}\x1b[0m\r\n`);
}
