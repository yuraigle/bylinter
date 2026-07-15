import { registerPromptHook, sendl, stripColors } from "../../client";

let lastAff: number = 0;
let lastDrink: number = 0;
let isDrunk: boolean = false;
let isHangover: boolean = false;

registerPromptHook((prompt: string, lines: string[]) => {
  if (prompt.match(/\[/)) return false; // fight

  const affects = lines.find((line) => /^Аффекты:/.test(stripColors(line)));
  if (affects) {
    isHangover = /отходняк/.test(affects);
    isDrunk = /под мухой/.test(affects);
  }

  // if (now - lastAff > 60_000) {
  //   sendl("афф");
  //   return true;
  // }

  if (isHangover && / Пх:0 /.test(prompt)) {
    sendl("опохмел самогон");
    return true;
  }

  return false;
}, 1);
