import { sendl } from "../../client/mud";
import { registerPromptHook, registerTrigger } from "../../client/triggers";

const lastCry: number = 0;

registerPromptHook((prompt: string, lines: string[]) => {
  const match = prompt.match(/ Бк:([0-9]+) /);
  if (match) {
    const bk = Number(match[1]);

    if (bk > 5 && Date.now() - lastCry > 5000) {
      sendl("клич мощи;клич битвы");
    }
  }

  return false;
}, 1);
