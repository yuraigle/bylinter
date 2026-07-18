export const COLOR = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",

  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  reset: "\x1b[0m",
} as const;

export const SCREEN = {
  enterAlt: "\x1b[?1049h",
  exitAlt: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
} as const;

export const BOX = {
  horizontal: "─",
  vertical: "│",
  teeLeft: "┤",
  teeRight: "├",
  teeUp: "┴",
  teeDown: "┬",
  cross: "┼",
  cornerTopLeft: "┌",
  cornerTopRight: "┐",
  cornerBottomLeft: "└",
  cornerBottomRight: "┘",
} as const;

export function moveTo(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

const BOLD_RE = /\x1b\[1m/g;
const BOLD_IN_COMBINED_RE = /\x1b\[1;/g;

export function stripBold(text: string): string {
  return text.replace(BOLD_IN_COMBINED_RE, "\x1b[").replace(BOLD_RE, "");
}

export function stripColors(text: string): string {
  return text.replaceAll(/\x1b\[[0-9;]*m/g, "");
}
