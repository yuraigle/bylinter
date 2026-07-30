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
  wecho,
  setSidebar,
  COLOR,
} = globalThis.bylinter;

const CHAR_NAME = "Услад"; // для автологина
const CHAR_PASS = "oVP5Liqf6";

showme(
  `Введите ${COLOR.yellow}кон${COLOR.reset} для подключения к серверу Былин`,
);

function sendline(message: string): void {
  echo("\r\n" + COLOR.yellow + "[" + message + "]" + COLOR.reset);
  message.split(/;/).forEach((cmd) => sendRaw(cmd));
}

registerAlias("кон", () => {
  connect("bylins.su", 4000, "").catch((err: Error) =>
    showerr("Failed to connect: " + err.message),
  );
});

registerPromptHook((prompt: string) => {
  if (prompt.match(/^Select one :/)) {
    sendline("0"); // koi-8, должно соответствовать кодировке в .env
    return true;
  }
  if (prompt.match(/^Введите имя персонажа/) && CHAR_NAME && CHAR_PASS) {
    sendRaw(`${CHAR_NAME} ${CHAR_PASS}`); // не показывает пароль в логе
    return true;
  }
  if (prompt.match(/ANYKEY нажмите ENTER/)) {
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

// карта комнат в сайдбаре
let currentMapLines: string[] = [];
registerPromptHook((prompt: string, lines: string[]) => {
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

// registerGag(/^:.*?/); // можно спрятать карту из лога

// сохранение диалогов в окно №2, доступно по Alt+2
registerTrigger(
  /^[А-ЯЁ][а-яё]+ сказал.? : '.+'/,
  (m: string[], colored: string) => {
    wecho(2, tsfmt() + colored);
  },
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ сообщил.? группе : '.+'/,
  (m: string[], colored: string) => {
    wecho(2, tsfmt() + colored);
  },
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ сказал. [А-ЯЁ][а-яё]+ : '.+'/,
  (m: string[], colored: string) => {
    wecho(2, tsfmt() + colored);
  },
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ (дружине|союзникам): '.+'\./,
  (m: string[], colored: string) => {
    wecho(2, tsfmt() + colored);
  },
);

function tsfmt() {
  const hms = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return "[" + hms + "] ";
}

// Alt+стрелки для ходьбы
registerBindkey("`", () => sendline("~"));
registerBindkey("ё", () => sendline("~"));
registerBindkey("M-up", () => sendline("n"));
registerBindkey("M-down", () => sendline("s"));
registerBindkey("M-left", () => sendline("w"));
registerBindkey("M-right", () => sendline("e"));
registerBindkey("M-pgup", () => sendline("u"));
registerBindkey("M-pgdn", () => sendline("d"));

// поведение
registerTrigger(/^Вы готовы сожрать быка\./, () => sendline("пить боч.синим"));

registerAlias("нас", () => { sendline("пить боч.синим") })
