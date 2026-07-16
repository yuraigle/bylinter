import { connect, registerAlias, registerTrigger, sendline, showerr } from "../client";

registerAlias("кон", () => {
  connect().catch((err) => showerr("Failed to connect: " + err.message, true));
});

registerTrigger(/Пересоединяемся\./, () => onConnect());
registerTrigger(/Ваша душа вновь вернулась в тело/, () => onConnect());

function onConnect(): void {
  sendline("сч все;гр;см");
}
