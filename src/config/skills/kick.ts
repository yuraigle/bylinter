import { registerPromptHook, registerTrigger, stripColors } from "../../client";
import { sendline } from "../utils";

let hasKick: boolean = false;
let lastKick: number = 0;

registerTrigger(/^      пнуть\s+\(/, () => (hasKick = true));

registerPromptHook((prompt: string) => {
  const promptUc = stripColors(prompt);
  const inBattle = promptUc.match(/\[/);

  if (!hasKick) return false;
  if (Date.now() - lastKick < 2_000) return false; // не спамить

  if (inBattle && !promptUc.match(/ Пн:[1-9]/)) {
    sendline("пну");
    lastKick = Date.now();
    return true;
  }

  return false;
}, 5);
