import { decode } from "../shared/encoding";

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

export const MSDP_OPT = 0x45;
export const COMPRESS2_OPT = 0x56;

export interface TelnetParseResult {
  segments: TelnetSegment[];
  events: TelnetEvent[];
  compressedTail: Buffer | null;
}

export interface TelnetSegment {
  text: string;
  hasGA: boolean;
}

const COMMAND_NAMES: Record<number, TelnetNegotiation["command"]> = {
  0xfb: "WILL",
  0xfc: "WONT",
  0xfd: "DO",
  0xfe: "DONT",
};

// Возвращает индекс байта SE (0xF0), либо -1, если IAC SE ещё не пришёл
// (значит subnegotiation-блок не завершён, нужно ждать следующий чанк)
function findSubnegotiationEnd(buf: Buffer, from: number): number {
  for (let i = from + 1; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xf0) {
      return i + 1;
    }
  }
  return -1;
}

export function createTelnetParser(encoding?: string) {
  let pending = Buffer.alloc(0);

  function feed(chunk: Buffer): TelnetParseResult {
    const buf = pending.length > 0 ? Buffer.concat([pending, chunk]) : chunk;
    pending = Buffer.alloc(0);

    const segments: TelnetSegment[] = [];
    const events: TelnetEvent[] = [];
    let out: number[] = []; // накопитель текущего (ещё не закрытого GA) сегмента

    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0xff) {
        if (i + 1 >= buf.length) {
          pending = Buffer.from(buf.subarray(i));
          break;
        }

        const cmd = buf[i + 1];

        if (cmd === 0xf9) {
          segments.push({
            text: decode(Buffer.from(out), encoding),
            hasGA: true,
          });
          out = [];
          i += 1;
          continue;
        }

        if (cmd in COMMAND_NAMES) {
          if (i + 2 >= buf.length) {
            pending = Buffer.from(buf.subarray(i));
            break;
          }
          const option = buf[i + 2];
          events.push({
            kind: "negotiation",
            command: COMMAND_NAMES[cmd],
            option,
          });
          i += 2;
          continue;
        }

        if (cmd === 0xfa) {
          if (i + 2 >= buf.length) {
            pending = Buffer.from(buf.subarray(i));
            break;
          }
          const option = buf[i + 2];
          const seIndex = findSubnegotiationEnd(buf, i + 2);

          if (seIndex === -1) {
            pending = Buffer.from(buf.subarray(i));
            break;
          }

          const payload = Buffer.from(buf.subarray(i + 3, seIndex - 1));
          events.push({ kind: "subnegotiation", option, payload });

          if (option === COMPRESS2_OPT) {
            segments.push({
              text: decode(Buffer.from(out), encoding),
              hasGA: false,
            });
            const tail = buf.subarray(seIndex + 1);
            return { segments, events, compressedTail: Buffer.from(tail) };
          }

          i = seIndex;
          continue;
        }

        i += 1;
        continue;
      }
      out.push(buf[i]);
    }

    // Остаток без GA (незавершённый хвост) — тоже отдельный сегмент
    if (out.length > 0 || segments.length === 0) {
      segments.push({ text: decode(Buffer.from(out), encoding), hasGA: false });
    }

    return { segments, events, compressedTail: null };
  }

  return { feed };
}
