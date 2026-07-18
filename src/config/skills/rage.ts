import { registerPromptHook, registerTrigger } from "../../client";
import { sendline } from "../utils";

let hasRage: boolean = false;
let lastRage: number = 0;

registerTrigger(/^\[.{3}\] ярость\s+\(/, () => (hasRage = true));
registerTrigger(/^Вы пришли в ярость\./, () => (hasRage = true));
registerTrigger(/^Вам это не по силам\./, () => (hasRage = false));

registerPromptHook((prompt) => {
  if (!hasRage) return false;
  if (!/[0-9]+o /.test(prompt)) return false; // неигровой промпт
  if (/ Яр:[1-9]/.test(prompt)) return false; // задержка
  if (Date.now() - lastRage < 3_000) return false; // спам

  sendline("ярость");
  lastRage = Date.now();

  return true;
}, 1);
