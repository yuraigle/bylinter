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

export const COMPRESS_OPTION = 0x55;
export const COMPRESS2_OPTION = 0x56;

export interface TelnetParseResult {
  text: string;
  hasGA: boolean;
  events: TelnetEvent[];
  compressedTail: Buffer | null;
}

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

export function createTelnetParser() {
  let pending = Buffer.alloc(0); // недообработанный хвост с прошлого вызова

  function feed(chunk: Buffer): TelnetParseResult {
    const buf = pending.length > 0 ? Buffer.concat([pending, chunk]) : chunk;
    pending = Buffer.alloc(0);

    const out: number[] = [];
    const events: TelnetEvent[] = [];
    let hasGA = false;

    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0xff) {
        // Одинокий IAC на конце буфера — команда ещё не пришла целиком
        if (i + 1 >= buf.length) {
          pending = Buffer.from(buf.subarray(i));
          break;
        }

        const cmd = buf[i + 1];

        if (cmd === 0xf9) {
          hasGA = true;
          i += 1;
          continue;
        }

        if (cmd in COMMAND_NAMES) {
          // IAC WILL/WONT/DO/DONT без байта опции ещё не завершён
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
            // IAC SE ещё не пришёл — весь блок откладываем целиком
            pending = Buffer.from(buf.subarray(i));
            break;
          }

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
          continue;
        }

        // Неизвестная однобайтовая команда
        i += 1;
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

  return { feed };
}
