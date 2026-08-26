import type { GlobalApiContext } from "./types/bylinter-api";

import { TerminalUI } from "./tui/TerminalUI";
import { InputHandler } from "./core/InputHandler";
import { MudSession } from "./core/MudSession";
import { TextPipeline } from "./core/TextPipeline";
import { TcpCommandSender } from "./core/CommandSender";
import { Broadcaster } from "./core/Broadcaster";
import { ConfigLoaderService } from "./core/ConfigLoaderService";

import {
  AliasCollection,
  BindkeyCollection,
  TriggerCollection,
  PromptHookCollection,
  MsdpHookCollection,
  SubstituteCollection,
} from "./logic";

import { LocalServer } from "./core/LocalServer";
import { GlobalApi } from "./core/GlobalApi";
import { ITerminalUI } from "./types/ITerminalUI";

const triggers: TriggerCollection = new TriggerCollection();
const substitutes: SubstituteCollection = new SubstituteCollection();
const promptHooks: PromptHookCollection = new PromptHookCollection();
const msdpHooks: MsdpHookCollection = new MsdpHookCollection();
const broadcaster: Broadcaster = new Broadcaster();
const pipeline: TextPipeline = new TextPipeline(
  triggers,
  substitutes,
  promptHooks,
  msdpHooks,
  broadcaster,
);

const sender: TcpCommandSender = new TcpCommandSender(null);
const session: MudSession = new MudSession(pipeline, sender);
const aliases: AliasCollection = new AliasCollection();
const inputHandler: InputHandler = new InputHandler(session, aliases);

const bindkeys: BindkeyCollection = new BindkeyCollection();
const tui2: ITerminalUI = new TerminalUI(
  inputHandler.handle,
  bindkeys.dispatch,
  aliases, // для tab-навигации по алиасам
);

broadcaster.addConsumer((text: string, hasGA?: boolean) =>
  tui2.addLog(text, hasGA), // строки из MUD в TUI
);
session.setSystemEcho(tui2.showme);
session.setOnStatus(tui2.setStatus);
inputHandler.setSystemEcho(tui2.showme); // куда пишем ошибки и справку
triggers.setDebugger((s: string) => tui2.wecho(9, s));

// старт локального сервера с проксированием туда контента из клиента
const port = Number(process.env.LOCAL_PORT || 0);
if (port > 0) {
  new LocalServer(port, broadcaster, inputHandler.handle, tui2.showme).init();
}

// все методы API в globalThis для юзер конфига
const api: GlobalApiContext = new GlobalApi().expose(
  session,
  tui2,
  aliases,
  bindkeys,
  triggers,
  substitutes,
  promptHooks,
  msdpHooks,
);
Object.defineProperty(globalThis, "bylinter", { value: api, writable: false });

import packageJson from "../package.json" with { type: "json" };
tui2.showme(`-:- Bylinter v${packageJson.version} by Yuri Orlov`);

// загрузка пользовательского конфига, если он есть
const loader = new ConfigLoaderService();
const configPath = loader.findUserConfigPath();

if (configPath) {
  await import(configPath);
  tui2.showme("-:- Using file " + configPath);
}
