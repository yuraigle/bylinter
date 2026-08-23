export const SCREEN = {
  enterAlt: "\x1b[?1049h",
  exitAlt: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
  syncStart: "\x1b[?2026h",
  syncEnd: "\x1b[?2026l",
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

export const clr = (letter: string): string => {
  const ix: number = letter.charCodeAt(0) - 65;
  if (ix >= 0 && ix <= 7) return "\x1b[3" + ix + "m"; // regular color
  if (ix >= 8 && ix <= 15) return "\x1b[9" + (ix - 8) + "m"; // bright
  return "\x1b[0m"; // reset
};

// цвет N-го символа в строке
export const getColor = (lineCL: string, pos: number): string => {
  const escRe = /\x1b\[([0-9;]*)m/y;
  let currentLetter = "H"; // белый
  let visibleIndex = -1;
  let i = 0;

  while (i < lineCL.length) {
    if (lineCL[i] === "\x1b") {
      escRe.lastIndex = i;
      const m = escRe.exec(lineCL);
      if (m) {
        const codes = m[1].split(";").map(Number);
        for (const code of codes) {
          if (code === 0) {
            currentLetter = "H";
          } else if (code >= 30 && code <= 37) {
            currentLetter = String.fromCharCode(65 + (code - 30)); // A-H
          } else if (code >= 90 && code <= 97) {
            currentLetter = String.fromCharCode(65 + 8 + (code - 90)); // I-P
          }
        }
        i = escRe.lastIndex;
        continue;
      }
    }
    visibleIndex++;
    if (visibleIndex === pos) {
      return currentLetter;
    }
    i++;
  }

  return currentLetter;
};
