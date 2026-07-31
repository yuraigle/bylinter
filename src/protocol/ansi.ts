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

export function stripColors(text: string): string {
  return text.replaceAll(/\x1b\[[0-9;]*m/g, "");
}

export const clr = (letter: string): string => {
  const ix: number = letter.charCodeAt(0) - 65;
  if (ix >= 0 && ix <= 7) return "\x1b[3" + ix + "m"; // regular color
  if (ix >= 8 && ix <= 15) return "\x1b[9" + (ix - 8) + "m"; // bright
  return "\x1b[0m"; // reset
}
