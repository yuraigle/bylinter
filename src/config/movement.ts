import { registerBindkey, sendl } from "../client";
import { sendline } from "./utils";

registerBindkey("M-up", () => sendl("n"));
registerBindkey("M-down", () => sendl("s"));
registerBindkey("M-left", () => sendl("w"));
registerBindkey("M-right", () => sendl("e"));
registerBindkey("M-pgup", () => sendl("u"));
registerBindkey("M-pgdn", () => sendl("d"));

registerBindkey("`", () => sendline("~"));
registerBindkey("ё", () => sendline("~"));
registerBindkey("f5", () =>
  sendline("взя все.труп;взя все все.труп;бро все.труп"),
);
registerBindkey("f12", () => sendline("~;зач возв"));
