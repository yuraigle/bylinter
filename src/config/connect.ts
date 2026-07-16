import {
  connect,
  registerAlias,
  registerPromptHook,
  registerTrigger,
  sendline,
  showerr,
} from "../client";

registerAlias("кон", () => {
  connect().catch((err) => showerr("Failed to connect: " + err.message, true));
});

registerTrigger(/Пересоединяемся\./, () => onConnect());
registerTrigger(/Ваша душа вновь вернулась в тело/, () => onConnect());
registerTrigger(/  Добро пожаловать на землю Киевскую/, () => onConnect());

function onConnect(): void {
  sendline(";сч все;уме;гр;см");
}
