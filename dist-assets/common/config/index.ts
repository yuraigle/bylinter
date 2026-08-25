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
  globalThis.bylinter.showme(`${clr("B")}-${clr("C")}:${clr("B")}-${clr("0")} ${message}`);
}

const sendLine = (message: string): void => {
  echo("\r\n" + clr("D") + "[" + message + "]" + clr("0"));
  globalThis.bylinter.sendLine(message);
};

let colorsTest: string = "";
for (let i = 0; i < 15; i++) {
  const letter = String.fromCharCode(65 + i);
  colorsTest += clr(letter) + letter;
}
showme("Colors Palette: " + colorsTest + clr("0"));
showme(`Введите ${clr("D")}кон${clr("0")} для подключения к серверу Былин`);

const PROXY = process.env.HTTP_PROXY || "";
registerAlias("кон", () => connect("bylins.su", 4000, PROXY));

registerPromptHook((prompt: string) => {
  if (prompt.match(/^Select one :/)) {
    sendLine("0"); // koi8-r, должно соответствовать кодировке в .env
    return true;
  }
  if (prompt.match(/^Введите имя персонажа/) && CHAR_NAME && CHAR_PASS) {
    sendText(`${CHAR_NAME} ${CHAR_PASS}`); // не показывает пароль в логе
    return true;
  }
  if (prompt.match(/ANYKEY нажмите ENTER/)) {
    sendLine("");
    return true;
  }
  return false;
}, 0);

registerTrigger(/Пересоединяемся\./, () => onConnect());
registerTrigger(/Ваша душа вновь вернулась в тело/, () => onConnect());
registerTrigger(/  Добро пожаловать на землю Киевскую/, () => onConnect());
registerTrigger(/^Вы пропали в пустоте этого мира\./, () => sendLine(""));

// при подключении узнать всё о себе
function onConnect(): void {
  sendLine(";афф;сч все;уме;гр;см");
}

// карта комнат в сайдбаре
const mapLines: string[] = [];

registerTrigger(/^:\s+/, (m, lineCL) => {
  const s = lineCL.replace(/: {2}/, "");
  mapLines.push(s);
});

registerTrigger(/^$/, () => {
  if (mapLines.length > 0) {
    const result: string[] = [];
    // "@" всегда по центру
    const markerIndex = mapLines.findIndex((line) => line.includes("@"));
    if (markerIndex === -1) return false;
    for (let offset = -9; offset <= 9; offset++) {
      result.push(mapLines[markerIndex + offset] ?? "");
    }
    setSidebar(result, 0, 19); // строки 0-19 в сайдбаре
  }

  mapLines.length = 0;
});
// \карта комнат в сайдбаре

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
  if (/под седлом/.test(m[4] || "")) return lineCL;
  if (!m[1] && !m[3]) return lineCL;
  return lineCL.replace("" + m[2], clr("H") + m[2] + clr("B"));
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

// подсветки в бою
const magicLag: RegExp[] = [
  /^[^:]+ замер(ла|ло|ли)? на месте!$/,
  /^[^:]+ повалило на землю\.$/,
  /^[^:]+ оглушило\.$/,
  /^[^:]+ прилег(ла|ло|ли)? подремать\.$/,
];

for (const rx of magicLag) {
  registerSubstitute(rx, (m, lineCL) =>
    getColor(lineCL, 0) != "H" ? lineCL : clr("O") + m[0] + clr("0"),
  );
}

const fightLag: RegExp[] = [
  /^[^:]+ [а-я]+ от богатырского удара .*$/,
  /^[^:]+ завалил.? .* на землю мощным ударом.*$/,
  /^Одним ударом .* повалил.? .* на землю.*$/,
  /^[^:]+ своим оглушающим ударом сбил.*$/,
  /^[^:]+ мощным ударом оглушил.? .*$/,
  /^[^:]+ оглушил[оаи]? .*$/,
];

for (const rx of fightLag) {
  registerSubstitute(rx, (m, lineCL) =>
    getColor(lineCL, 0) != "H" ? lineCL : clr("M") + m[0] + clr("0"),
  );
}

const otherAffect: RegExp[] = [
  /^[^:]+ прикусил[аои]? язык!$/,
  /^[^:]+ ослеп(ла|ло|ли)?!$/,
];

for (const rx of otherAffect) {
  registerSubstitute(rx, (m, lineCL) =>
    getColor(lineCL, 0) != "H" ? lineCL : clr("F") + m[0] + clr("0"),
  );
}

const fightFail: RegExp[] = [
  /^[^:]+ уклонил.?с. от попытки .* завалить .*$/,
  /^[^:]+ попытал.?с. завалить .*, но .*$/,
  /^[^:]+ избежал.? попытки .* завалить .*$/,
  /^[^:]+ попытал.?с. подсечь .*, но .*$/,
];

for (const rx of fightFail) {
  registerSubstitute(rx, (m, lineCL) =>
    getColor(lineCL, 0) != "H" ? lineCL : clr("I") + m[0] + clr("0"),
  );
}

// Alt+стрелки для ходьбы
registerBindkey("`", () => sendLine("~"));
registerBindkey("ё", () => sendLine("~"));
registerBindkey("M-up", () => sendLine("n"));
registerBindkey("M-down", () => sendLine("s"));
registerBindkey("M-left", () => sendLine("w"));
registerBindkey("M-right", () => sendLine("e"));
registerBindkey("M-pgup", () => sendLine("u"));
registerBindkey("M-pgdn", () => sendLine("d"));
registerBindkey("M-end", () => sendLine("scan"));
registerBindkey("f1", () => showme("test"));

// поведение
registerTrigger(/^Вы готовы сожрать быка\./, () => sendLine("пить боч.синим"));

registerAlias("обкаст", () => {
  sendLine("к !в щ!;к !м т!;к !доб!;к !б в!;к !пок!");
  sendLine("к !пок!;к !пок!;к !о н!;к !о я!;к !о с!");
});

// для неумеющих парсить текст есть msdp
registerTrigger(/^Using keytable$/, () => {
  // ["ROOM","EXPERIENCE","GOLD","LEVEL","MAX_HIT","MAX_MOVE","STATE","GROUP"]
  // sendMsdp("REPORT", "ROOM");
  sendMsdp("REPORT", "GROUP");
});

registerMsdpHook((data) => showme(`[msdp] ${JSON.stringify(data)}`));
