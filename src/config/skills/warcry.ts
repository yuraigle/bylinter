import { registerPromptHook } from "../../client";
import { sendline } from "../utils";

const lastCry: number = 0;

registerPromptHook((prompt: string, lines: string[]) => {
  const match = prompt.match(/ Бк:([0-9]+) /);
  if (match) {
    const bk = Number(match[1]);

    if (bk > 5 && Date.now() - lastCry > 5000) {
      sendline("клич мощи;клич битвы");
    }
  }

  return false;
}, 1);
