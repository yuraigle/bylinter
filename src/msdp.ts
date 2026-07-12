const MSDP_VAR = 1;
const MSDP_VAL = 2;
const MSDP_TABLE_OPEN = 3;
const MSDP_TABLE_CLOSE = 4;
const MSDP_ARRAY_OPEN = 5;
const MSDP_ARRAY_CLOSE = 6;

export type MsdpValue = string | MsdpValue[] | { [key: string]: MsdpValue };

export function parseMsdp(payload: Buffer): Record<string, MsdpValue> {
  const result: Record<string, MsdpValue> = {};
  let i = 0;

  while (i < payload.length && payload[i] === MSDP_VAR) {
    i++;
    const [name, afterName] = readUntilMarker(payload, i);
    i = afterName;

    if (payload[i] !== MSDP_VAL) break;
    i++;
    const [value, afterValue] = readValue(payload, i);
    i = afterValue;

    result[name] = value;
  }

  return result;
}

function readUntilMarker(payload: Buffer, start: number): [string, number] {
  let i = start;
  while (i < payload.length && payload[i] > MSDP_ARRAY_CLOSE) {
    i++;
  }
  return [payload.subarray(start, i).toString("utf8"), i];
}

function readValue(payload: Buffer, start: number): [MsdpValue, number] {
  if (payload[start] === MSDP_TABLE_OPEN) return readTable(payload, start + 1);
  if (payload[start] === MSDP_ARRAY_OPEN) return readArray(payload, start + 1);
  return readUntilMarker(payload, start);
}

function readTable(
  payload: Buffer,
  start: number,
): [Record<string, MsdpValue>, number] {
  const table: Record<string, MsdpValue> = {};
  let i = start;

  while (i < payload.length && payload[i] !== MSDP_TABLE_CLOSE) {
    if (payload[i] !== MSDP_VAR) break;
    i++;
    const [name, afterName] = readUntilMarker(payload, i);
    i = afterName;

    if (payload[i] !== MSDP_VAL) break;
    i++;
    const [value, afterValue] = readValue(payload, i);
    i = afterValue;

    table[name] = value;
  }

  return [table, i + 1]; // пропускаем TABLE_CLOSE
}

function readArray(payload: Buffer, start: number): [MsdpValue[], number] {
  const arr: MsdpValue[] = [];
  let i = start;

  while (i < payload.length && payload[i] !== MSDP_ARRAY_CLOSE) {
    if (payload[i] !== MSDP_VAL) break;
    i++;
    const [value, afterValue] = readValue(payload, i);
    i = afterValue;
    arr.push(value);
  }

  return [arr, i + 1]; // пропускаем ARRAY_CLOSE
}

export function encodeMsdpVar(name: string, value: string): Buffer {
  return Buffer.concat([
    Buffer.from([MSDP_VAR]),
    Buffer.from(name, "utf8"),
    Buffer.from([MSDP_VAL]),
    Buffer.from(value, "utf8"),
  ]);
}
