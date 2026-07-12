import { sendl, sendMsdp } from "../client/mud";
import { registerPromptHook, registerTrigger } from "../client/triggers";

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

registerTrigger(/Using keytable/, () => {
  sendl("0");
  // sendMsdp("LIST", "REPORTABLE_VARIABLES");
  sendMsdp("REPORT", "ROOM");
});

registerTrigger(/^\s+Посетите наш сайт/, () => {
  if (CHAR_NAME) {
    sendl(`${CHAR_NAME}${CHAR_PASS ? " " + CHAR_PASS : ""}`);
  }
});

registerTrigger(/^Вы пропали в пустоте этого мира\./, () => sendl(""));

registerPromptHook((prompt, lines) => {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendl("");
  }

  return false;
}, 0);
