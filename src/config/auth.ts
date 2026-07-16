import {
  registerPromptHook,
  registerTrigger,
  sendline,
} from "../client";

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

registerTrigger(/Using keytable/, () => {
  sendline("0");
});

registerTrigger(/^\s+Посетите наш сайт/, () => {
  if (CHAR_NAME) {
    sendline(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}`);
  }
});

registerTrigger(/^Вы пропали в пустоте этого мира\./, () => sendline(""));

registerPromptHook((prompt) => {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendline("");
  }

  return false;
}, 0);
