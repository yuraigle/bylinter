import iconv from "iconv-lite";

export const ENCODING = process.env.ENCODING || "utf8";

if (!iconv.encodingExists(ENCODING)) {
  throw new Error(
    `Unknown ENCODING "${ENCODING}" in .env. Try: utf8, cp1251, koi8-r`,
  );
}

export function decode(buf: Buffer, encodingOverride?: string): string {
  return iconv.decode(buf, encodingOverride ?? ENCODING);
}

export function encode(text: string): Buffer {
  return iconv.encode(text, ENCODING);
}
