import { connect, registerAlias, registerTrigger, showerr } from "../client";
import { sendline } from "./utils";

registerAlias("кон", () => {
  connect().catch((err) => showerr("Failed to connect: " + err.message, true));
});

registerTrigger(/Пересоединяемся\./, () => onConnect());
registerTrigger(/Ваша душа вновь вернулась в тело/, () => onConnect());
registerTrigger(/  Добро пожаловать на землю Киевскую/, () => onConnect());

// при подключении узнать всё о себе
function onConnect(): void {
  sendline(";сч все;уме;гр;см");
}

// реконнект, если не было строк из игры >10 минут
let lastOnline: number = 0;
registerTrigger(/^Минул час\.$/, () => (lastOnline = Date.now()));

setTimeout(() => {
  if (lastOnline > 0 && Date.now() - lastOnline > 10 * 60_000) {
    connect().catch((err) =>
      showerr("Failed to connect: " + err.message, true),
    );
  }
}, 60_000);
