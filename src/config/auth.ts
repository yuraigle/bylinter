import {
  sendl,
  sendMsdp,
  registerPromptHook,
  registerTrigger,
} from "../client";

const CHAR_NAME = process.env.CHAR_NAME || undefined;
const CHAR_PASS = process.env.CHAR_PASS || undefined;

registerTrigger(/Using keytable/, () => {
  sendl("0");
  // для неумеющих парсить текст есть msdp:
  // ["ROOM","EXPERIENCE","GOLD","LEVEL","MAX_HIT","MAX_MOVE","STATE","GROUP"]
  // sendMsdp("LIST", "REPORTABLE_VARIABLES");
  // sendMsdp("REPORT", "ROOM");
  // sendMsdp("REPORT", "EXPERIENCE");
  // sendMsdp("REPORT", "GOLD");
  // sendMsdp("REPORT", "LEVEL");
  // sendMsdp("REPORT", "MAX_HIT");
  // sendMsdp("REPORT", "MAX_MOVE");
  // sendMsdp("REPORT", "STATE");
  // отключу. меньше трафика - быстрее
  sendMsdp("REPORT", "GROUP"); // а вот это полезно
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
