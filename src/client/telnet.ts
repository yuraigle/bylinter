import { decode } from "./encoding";

export interface TelnetNegotiation {
  kind: "negotiation";
  command: "WILL" | "WONT" | "DO" | "DONT";
  option: number;
}

export interface TelnetSubnegotiation {
  kind: "subnegotiation";
  option: number;
  payload: Buffer;
}

export type TelnetEvent = TelnetNegotiation | TelnetSubnegotiation;

const COMMAND_NAMES: Record<number, TelnetNegotiation["command"]> = {
  0xfb: "WILL",
  0xfc: "WONT",
  0xfd: "DO",
  0xfe: "DONT",
};

const OPTION_NAMES: Record<number, string> = {
  0x00: "BINARY",
  0x01: "ECHO",
  0x03: "SGA",
  0x1f: "NAWS",
  0x18: "TTYPE",
  0x45: "MSDP",
  0x46: "MSSP",
  0x55: "COMPRESS",
  0x56: "COMPRESS2",
  0x69: "GMCP",
};

const COMPRESS2_OPTION = 0x56;

export function describeOption(option: number): string {
  return OPTION_NAMES[option] ?? `0x${option.toString(16)}`;
}

export interface TelnetParseResult {
  text: string;
  hasGA: boolean;
  events: TelnetEvent[];
  // Если посреди этого буфера начался MCCP2 — здесь лежат байты после
  // маркера, их нужно пропустить через zlib inflate, а не через telnet-парсер
  compressedTail: Buffer | null;
}

export function stripTelnetIAC(buf: Buffer): TelnetParseResult {
  const out: number[] = [];
  const events: TelnetEvent[] = [];
  let hasGA = false;

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0xff) {
      const cmd = buf[i + 1];

      if (cmd === 0xf9) {
        hasGA = true;
        i += 1;
      } else if (cmd in COMMAND_NAMES) {
        const option = buf[i + 2];
        events.push({
          kind: "negotiation",
          command: COMMAND_NAMES[cmd],
          option,
        });
        i += 2;
      } else if (cmd === 0xfa) {
        const option = buf[i + 2];
        const seIndex = findSubnegotiationEnd(buf, i + 2);
        const payload = Buffer.from(buf.subarray(i + 3, seIndex - 1));
        events.push({ kind: "subnegotiation", option, payload });

        if (option === COMPRESS2_OPTION) {
          const tail = buf.subarray(seIndex + 1);
          return {
            text: decode(Buffer.from(out)),
            hasGA,
            events,
            compressedTail: Buffer.from(tail),
          };
        }

        i = seIndex;
      } else {
        i += 1;
      }
      continue;
    }
    out.push(buf[i]);
  }

  return {
    text: decode(Buffer.from(out)),
    hasGA,
    events,
    compressedTail: null,
  };
}

function findSubnegotiationEnd(buf: Buffer, from: number): number {
  for (let i = from + 1; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xf0) {
      return i + 1;
    }
  }
  return buf.length - 1;
}
