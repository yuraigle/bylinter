import { ConfigLoaderService } from "./client/ConfigLoaderService";
import { startLocalServer } from "./client/localServer";
import { exposeGlobalApi } from "./globalApi";
import { InputHandler } from "./client/InputHandler";
import { TerminalUI } from "./tui/TerminalUI";
import { MudSession } from "./client/MudSession";
import { TextPipeline } from "./client/TextPipeline";
import { TcpCommandSender } from "./client/CommandSender";

import { addOutputSink } from "./client/output";
import { AliasCollection } from "./client/logic/AliasCollection";
import { BindkeyCollection } from "./client/logic/BindkeyCollection";
import { TriggerCollection } from "./client/logic/TriggerCollection";
import { PromptHookCollection } from "./client/logic/PromptHookCollection";
import { MsdpHookCollection } from "./client/logic/MsdpHookCollection";
import { SubstituteCollection } from "./client/logic/SubstituteCollection";
import { clr } from "./protocol/ansi";
import packageJson from "../package.json" with { type: "json" };

const triggers: TriggerCollection = new TriggerCollection();
const substitutes: SubstituteCollection = new SubstituteCollection();
const promptHooks: PromptHookCollection = new PromptHookCollection();
const msdpHooks: MsdpHookCollection = new MsdpHookCollection();
const pipeline: TextPipeline = new TextPipeline(
    triggers, substitutes, promptHooks, msdpHooks
);

const sender: TcpCommandSender = new TcpCommandSender(null);
const session: MudSession = new MudSession(pipeline, sender);
const aliases: AliasCollection = new AliasCollection();
const inputHandler: InputHandler = new InputHandler(session, aliases);

const bindkeys: BindkeyCollection = new BindkeyCollection();
const tui: TerminalUI = new TerminalUI(inputHandler.handle, bindkeys.dispatch);

addOutputSink((text: string) => tui.log(text)); // для строк из MUD в tui
session.setTui(tui); // для вывода ошибок, статуса и дебага
inputHandler.setSystemEcho(tui.showme); // куда пишем ошибки и справку

// старт локального сервера с проксированием туда
const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, inputHandler.handle, tui.showme);

// все методы API в globalThis для юзер конфига
exposeGlobalApi(
    session,
    tui,
    aliases,
    bindkeys,
    triggers,
    substitutes,
    promptHooks,
    msdpHooks
);

tui.showme(`Bylinter v${packageJson.version} by Yuri Orlov`);

let colorsTest: string = '';
for (let i = 0; i < 15; i++) {
    const letter = String.fromCharCode(65 + i);
    colorsTest += clr(letter) + letter;
}
tui.showme('Colors Palette: ' + colorsTest + clr('0'));

// загрузка пользовательского конфига, если он есть
await (new ConfigLoaderService(tui.showme)).loadUserConfig();
