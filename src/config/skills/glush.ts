import {
  registerPromptHook,
  registerTrigger,
  sendline,
  stripColors,
} from "../../client";

let hasGlush: boolean = false;
let lastGlush: number = 0;

registerTrigger(/^      оглушить\s+\(/, () => (hasGlush = true));

registerPromptHook((prompt: string) => {
  const promptUc = stripColors(prompt);
  const inBattle = promptUc.match(/\[/);

  if (!hasGlush) return false;
  if (Date.now() - lastGlush < 2_000) return false; // не спамить

  if (inBattle && !promptUc.match(/ Ог:[1-9]/)) {
    sendline("оглу");
    lastGlush = Date.now();
    return true;
  }

  return false;
}, 5);
