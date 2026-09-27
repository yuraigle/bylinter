import { getLayout } from "./layout";
import { state, WindowState } from "./state";

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

export function visibleLength(str: string): number {
  const tokens = str.match(TOKEN_RE) ?? [];
  let len = 0;
  for (const token of tokens) {
    if (!token.startsWith("\x1b[")) len++;
  }
  return len;
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

// дополняем массив строк сверху, если строк меньше, чем нужная высота панели
export function padRows(rows: string[], height: number): string[] {
  if (rows.length >= height) return rows;
  return [...new Array(height - rows.length).fill(""), ...rows];
}

export function rewrapAll(): void {
  const { logWidth } = getLayout();
  for (const win of state.windows.values()) {
    rewrapWindow(win, logWidth);
  }
}

function rewrapWindow(win: WindowState, width: number): void {
  win.wrapWidth = width;
  win.wrappedRows = [];
  win.rowCounts = [];

  for (const line of win.logLines) {
    const rows = wrapLine(line, width);
    win.wrappedRows.push(...rows);
    win.rowCounts.push(rows.length);
  }
}
