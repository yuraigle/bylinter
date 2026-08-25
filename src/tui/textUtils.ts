const TOKEN_RE = /\x1b\[[0-9;]*m|[\s\S]/g;

export function truncateVisible(str: string, width: number): string {
  const tokens = str.match(TOKEN_RE) ?? [];
  let out = "";
  let visibleLen = 0;

  for (const token of tokens) {
    if (token.startsWith("\x1b[")) {
      out += token;
      continue;
    }
    if (visibleLen >= width) break;
    out += token;
    visibleLen++;
  }

  return out;
}

export function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [line];

  const tokens = line.match(TOKEN_RE) ?? [];
  const rows: string[] = [];
  let current = "";
  let visibleLen = 0;
  let carry = "";

  for (const token of tokens) {
    if (token.startsWith("\x1b[")) {
      current += token;
      carry = token === "\x1b[0m" || token === "\x1b[m" ? "" : carry + token;
      continue;
    }

    if (visibleLen >= width) {
      rows.push(current);
      current = carry;
      visibleLen = 0;
    }

    current += token;
    visibleLen++;
  }

  rows.push(current);
  return rows;
}

export function wrapWithCursor(
  text: string,
  width: number,
  cursorRawIndex: number,
) {
  if (width <= 0) return { rows: [text], cursorRow: 0, cursorCol: 0 };

  const tokens = text.match(TOKEN_RE) ?? [];
  const rows: string[] = [];
  let current = "";
  let visibleLen = 0;
  let carry = "";
  let rawIndex = 0;
  let cursorRow = 0;
  let cursorCol = 0;
  let cursorFound = false;

  const markIfCursorHere = () => {
    if (!cursorFound && rawIndex === cursorRawIndex) {
      cursorRow = rows.length;
      cursorCol = visibleLen;
      cursorFound = true;
    }
  };

  for (const token of tokens) {
    markIfCursorHere();

    if (token.startsWith("\x1b[")) {
      current += token;
      carry = token === "\x1b[0m" || token === "\x1b[m" ? "" : carry + token;
      rawIndex += token.length;
      continue;
    }

    if (visibleLen >= width) {
      rows.push(current);
      current = carry;
      visibleLen = 0;
    }

    current += token;
    visibleLen++;
    rawIndex += token.length;
  }

  markIfCursorHere();
  rows.push(current);

  if (!cursorFound) {
    cursorRow = rows.length - 1;
    cursorCol = visibleLen;
  }

  return { rows, cursorRow, cursorCol };
}

// дополняем массив строк сверху, если строк меньше, чем нужная высота панели
export function padRows(rows: string[], height: number): string[] {
  if (rows.length >= height) return rows;
  return [...new Array(height - rows.length).fill(""), ...rows];
}
