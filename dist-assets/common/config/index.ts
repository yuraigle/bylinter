// Пример написания триггеров на языке TypeScript

const {
  registerAlias,
  registerTrigger,
  registerPromptHook,
  registerBindkey,
  registerGag,
  connect,
  showme,
  showerr,
  sendRaw,
  echo,
  COLOR,
  setSidebar,
} = globalThis.bylinter;

showme(`Версия конфига 0.1`);

function sendline(message: string): void {
  echo("\r\n" + COLOR.yellow + "[" + message + "]" + COLOR.reset);
  message.split(/;/).forEach((cmd) => sendRaw(cmd));
}

registerAlias("кон", () => {
  connect("bylins.su", 4000, "").catch((err) =>
    showerr("Failed to connect: " + err.message),
  );
});

registerTrigger(/Using keytable/, () => sendline("0"));

registerTrigger(/^\s+Посетите наш сайт/, () => {
  const CHAR_NAME = ""; // введите имя и пароль
  const CHAR_PASS = "";
  if (CHAR_NAME && CHAR_PASS) {
    sendRaw(`${CHAR_NAME} ${CHAR_PASS}`);
  }
});

registerPromptHook((prompt: string) => {
  if (prompt.includes("ANYKEY нажмите ENTER")) {
    sendline("");
    return true;
  }
  return false;
}, 0);

registerTrigger(/Пересоединяемся\./, () => onConnect());
registerTrigger(/Ваша душа вновь вернулась в тело/, () => onConnect());
registerTrigger(/  Добро пожаловать на землю Киевскую/, () => onConnect());
registerTrigger(/^Вы пропали в пустоте этого мира\./, () => sendline(""));

// при подключении узнать всё о себе
function onConnect(): void {
  sendline(";афф;сч все;уме;гр;см");
}

registerBindkey("`", () => sendline("~"));
registerBindkey("ё", () => sendline("~"));
registerBindkey("M-up", () => sendline("n"));
registerBindkey("M-down", () => sendline("s"));
registerBindkey("M-left", () => sendline("w"));
registerBindkey("M-right", () => sendline("e"));
registerBindkey("M-pgup", () => sendline("u"));
registerBindkey("M-pgdn", () => sendline("d"));

// карта комнат в сайдбаре
let currentMapLines: string[] = [];
registerPromptHook((prompt, lines) => {
  const mapLines: string[] = [];

  lines
    .filter((s) => s.match(/^:.*$/))
    .forEach((s) => mapLines.push(s.substring(1)));

  if (mapLines.length > 0) {
    // "@" всегда по центру
    const result: string[] = [];
    const markerIndex = mapLines.findIndex((line) => line.includes("@"));
    if (markerIndex === -1) return false;
    for (let offset = -9; offset <= 9; offset++) {
      result.push(mapLines[markerIndex + offset] ?? "");
    }

    setSidebar(result, 0, 19);
  }

  return false;
}, 99);

registerGag(/^:.*?/);
