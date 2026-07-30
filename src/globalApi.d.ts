declare global {

  // Триггеры на строки
  type LineHandler = (matches: string[], colored: string) => void;
  function registerTrigger(pattern: RegExp, handler: LineHandler): void;

  // Хук на промпт (возвращает true, если обработано — прерывает цепочку)
  type PromptHandler = (prompt: string, lines: string[]) => boolean;
  function registerPromptHook(handler: PromptHandler, priority: number): void;

  // Хук на MSDP-обновления
  type MsdpHandler = (data: Record<string, unknown>) => void;
  function registerMsdpHook(handler: MsdpHandler): void;

  // Подстановки текста перед выводом
  type SubstituteHandler = (text: string) => string;
  function registerSubstitute(handler: SubstituteHandler): void;

  // Алиасы (команда -> обработчик с остальными аргументами)
  type AliasHandler = (args: string[]) => void;
  function registerAlias(cmd: string, handler: AliasHandler): void;

  // Бинды на клавиши
  type BindHandler = () => void;
  function registerBindkey(spec: string, handler: BindHandler): void;

  // Отправка команд на сервер
  function sendl(command: string): void; // с эхом, с разбивкой по ;
  function sendRaw(command: string): void; // без эха
  function sendMsdp(name: string, value: string): void;
  function connect(host: string, port?: number, proxy?: string): Promise<void>;
  function disconnect(): void;

  // Системные сообщения. newline - добавить перенос строки в начале
  function echo(message: string): void;
  function showme(message: string): void;
  function showerr(message: string): void;
  function wecho(windowNum: number, line: string): void;

  // Записать массив строк в sidebar, обновить строки с start по end
  function setSidebar(lines: string[], start: number, end: number): void;
  function stripColors(text: string): string;

  const COLOR: {
    readonly black: string;
    readonly red: string;
    readonly green: string;
    readonly yellow: string;
    readonly blue: string;
    readonly magenta: string;
    readonly cyan: string;
    readonly white: string;
    readonly brightBlack: string;
    readonly brightRed: string;
    readonly brightGreen: string;
    readonly brightYellow: string;
    readonly brightBlue: string;
    readonly brightMagenta: string;
    readonly brightCyan: string;
    readonly brightWhite: string;
    readonly bgBlack: string;
    readonly bgRed: string;
    readonly bgGreen: string;
    readonly bgYellow: string;
    readonly bgBlue: string;
    readonly bgMagenta: string;
    readonly bgCyan: string;
    readonly bgWhite: string;
    readonly bold: string;
    readonly dim: string;
    readonly italic: string;
    readonly underline: string;
    readonly reset: string;
  };

  var bylinter: {
    registerTrigger: typeof registerTrigger;
    registerPromptHook: typeof registerPromptHook;
    registerMsdpHook: typeof registerMsdpHook;
    registerSubstitute: typeof registerSubstitute;
    registerAlias: typeof registerAlias;
    registerBindkey: typeof registerBindkey;
    sendl: typeof sendl;
    sendRaw: typeof sendRaw;
    sendMsdp: typeof sendMsdp;
    connect: typeof connect;
    disconnect: typeof disconnect;
    showme: typeof showme;
    showerr: typeof showerr;
    echo: typeof echo;
    stripColors: typeof stripColors;
    setSidebar: typeof setSidebar;
    wecho: typeof wecho;
    COLOR: typeof COLOR;
  };
}

export {};
