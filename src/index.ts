import type { GlobalApiContext } from "./types/bylinter-api";

import { TerminalUI } from "./tui/TerminalUI";
import { InputHandler } from "./core/InputHandler";
import { MudSession } from "./core/MudSession";
import { TextPipeline } from "./core/TextPipeline";
import { TcpCommandSender } from "./core/CommandSender";
import { Broadcaster } from "./core/Broadcaster";

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
import { ConfigLoaderService } from "./core/ConfigLoaderService";
import packageJson from "../package.json" with { type: "json" };

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
const tui: TerminalUI = new TerminalUI(
  inputHandler.handle,
  bindkeys.dispatch,
  aliases, // для tab-навигации по алиасам
);

broadcaster.addConsumer((text: string) => tui.log(text)); // строки из MUD в tui
session.setTui(tui); // для вывода ошибок, статуса и дебага
inputHandler.setSystemEcho(tui.showme); // куда пишем ошибки и справку
triggers.setDebugger((s: string) => tui.wecho(5, s));

// старт локального сервера с проксированием туда контента из клиента
const port = Number(process.env.LOCAL_PORT || 0);
if (port > 0) {
  new LocalServer(port, broadcaster, inputHandler.handle, tui.showme).init();
}

// все методы API в globalThis для юзер конфига
const api: GlobalApiContext = new GlobalApi().expose(
  session,
  tui,
  aliases,
  bindkeys,
  triggers,
  substitutes,
  promptHooks,
  msdpHooks,
);
Object.defineProperty(globalThis, "bylinter", { value: api, writable: false });

tui.showme(`Bylinter v${packageJson.version} by Yuri Orlov`);

// загрузка пользовательского конфига, если он есть
await new ConfigLoaderService(tui.showme).loadUserConfig();
