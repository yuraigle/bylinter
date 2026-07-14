import { registerBindkey, sendl } from "../client";

registerBindkey("M-up", () => sendl("n"));
registerBindkey("M-down", () => sendl("s"));
registerBindkey("M-left", () => sendl("w"));
registerBindkey("M-right", () => sendl("e"));
registerBindkey("M-pgup", () => sendl("u"));
registerBindkey("M-pgdn", () => sendl("d"));
