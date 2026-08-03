// Пример написания триггеров на языке TypeScript

/// <reference path="./types/bylinter-api.d.ts" />

const {
  registerAlias,
  registerTrigger,
  registerPromptHook,
  registerMsdpHook,
  registerBindkey,
  registerSubstitute,
  connect,
  sendText,
  sendMsdp,
  echo,
  wecho,
  setSidebar,
  clr,
  getColor,
} = globalThis.bylinter;

const CHAR_NAME = ""; // для автологина
const CHAR_PASS = "";

const showme = (message: string): void => {
  echo(`${clr("B")}-${clr("C")}:${clr("B")}-${clr("0")} ${message}`);
};

const sendline = (message: string): void => {
  echo("\r\n" + clr("D") + "[" + message + "]" + clr("0"));
  message.split(/;/).forEach((cmd) => sendText(cmd));
};

let colorsTest: string = "";
for (let i = 0; i < 15; i++) {
  const letter = String.fromCharCode(65 + i);
  colorsTest += clr(letter) + letter;
}
showme("Colors Palette: " + colorsTest + clr("0"));

showme(`Введите ${clr("D")}кон${clr("0")} для подключения к серверу Былин`);
registerAlias("кон", () => connect("bylins.su", 4000, ""));

registerPromptHook((prompt: string) => {
  if (prompt.match(/^Select one :/)) {
    sendline("0"); // koi8-r, должно соответствовать кодировке в .env
    return true;
  }
  if (prompt.match(/^Введите имя персонажа/) && CHAR_NAME && CHAR_PASS) {
    sendText(`${CHAR_NAME} ${CHAR_PASS}`); // не показывает пароль в логе
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

// пример substitute: подсветка имён игроков
const preTitle = "([А-ЯЁ][^,]* )?";
const pName = "([А-ЯЁ][а-яё]+)";
const postTitle = "(, [А-ЯЁа-яё ,\\-]+)?";
const guildAff = "((?: \\([А-ЯЁа-яё ]+\\))*)";
const pos1 = " (?:летает|сидит|стоит|отдыхает|спит|плавает) здесь\\.";
const pos2 = " сидит здесь верхом на [^.(]+\\.";
const pos = `(${pos1}|${pos2})`;
const aura = "( \\([а-я]+ аура\\))?";
const rxPlayerHere = RegExp(
  "^" + preTitle + pName + postTitle + guildAff + pos + aura + " $",
);
registerSubstitute(rxPlayerHere, (m: string[], lineCL: string): string => {
  if (getColor(lineCL, 0) !== "B") return lineCL; // проверка на цвет: красный
  return lineCL.replace(m[2], clr("G") + m[2] + clr("B"));
});
// todo: доделать прячется маскируется

// Пример gag - скрытие спамных строк
const registerGag = (rx: RegExp) => registerSubstitute(rx, () => null);
registerGag(/^Дамага .*$/); // назойливый дебаг
registerGag(/^Скилл: .* Дамага .*$/);
// registerGag(/^:.*?/); // можно спрятать карту из лога

// сохранение диалогов в окно №2, доступно по Alt+2
registerTrigger(
  /^[А-ЯЁ][а-яё]+ сказал.? : '.+'/,
  (m: string[], colored: string) => wecho(2, tsfmt() + colored),
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ сообщил.? группе : '.+'/,
  (m: string[], colored: string) => wecho(2, tsfmt() + colored),
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ сказал. [А-ЯЁ][а-яё]+ : '.+'/,
  (m: string[], colored: string) => wecho(2, tsfmt() + colored),
);

registerTrigger(
  /^[А-ЯЁ][а-яё]+ (дружине|союзникам): '.+'\./,
  (m: string[], colored: string) => wecho(2, tsfmt() + colored),
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

registerAlias("обкаст", () => {
  sendline("к !в щ!;к !м т!;к !доб!;к !б в!;к !пок!");
  sendline("к !пок!;к !пок!;к !о н!;к !о я!;к !о с!");
});

// для неумеющих парсить текст есть msdp
registerTrigger(/^Using keytable$/, () => {
  // ["ROOM","EXPERIENCE","GOLD","LEVEL","MAX_HIT","MAX_MOVE","STATE","GROUP"]
  sendMsdp("REPORT", "ROOM");
  sendMsdp("REPORT", "GROUP");
});

registerMsdpHook((data) => showme(`[msdp] ${JSON.stringify(data)}`));
