import { sendl } from "../mud";
import { registerPromptHook, registerTrigger } from "../triggers";

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

registerTrigger(/Using keytable/, () => sendl("5"));

registerTrigger(/^\s+Посетите наш сайт/, () => {
  if (CHAR_NAME) {
    sendl(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}`);
  }
});

registerPromptHook((prompt, lines) => {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendl("");
  }
});
