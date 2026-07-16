import { registerPromptHook, registerTrigger, sendline } from "../../client";

let hasRage: boolean = false;

registerTrigger(/^\[.{3}\] ярость\s+\(/, () => (hasRage = true));
registerTrigger(/^Вы пришли в ярость\./, () => (hasRage = true));
registerTrigger(/^Вам это не по силам\./, () => (hasRage = false));

registerPromptHook((prompt) => {
  if (hasRage && /[0-9]+o /.test(prompt) && !/ Яр:[1-9]/.test(prompt)) {
    sendline("ярость");
  }

  return false;
}, 1);
