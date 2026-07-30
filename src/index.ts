import { ConfigLoaderService } from "./client/ConfigLoaderService";
import { startLocalServer } from "./client/localServer";
import { exposeGlobalApi } from "./globalApi";
import { InputHandler } from "./client/InputHandler";
import { TerminalUI } from "./tui/TerminalUI";
import { MudSession } from "./client/MudSession";
import { TextPipeline } from "./client/TextPipeline";
import { TcpCommandSender } from "./client/CommandSender";

import packageJson from "../package.json" with { type: "json" };
import { addOutputSink } from "./client/output";
import { AliasCollection } from "./client/AliasCollection";
import { BindkeysCollection } from "./client/BindkeysCollection";
import { TriggerCollection } from "./client/TriggerCollection";

const triggers: TriggerCollection = new TriggerCollection();
const pipeline: TextPipeline = new TextPipeline(triggers);

const sender: TcpCommandSender = new TcpCommandSender(null);
const session: MudSession = new MudSession(pipeline, sender);
const aliases: AliasCollection = new AliasCollection();
const inputHandler: InputHandler = new InputHandler(session, aliases);

const bindkeys: BindkeysCollection = new BindkeysCollection();
const tui: TerminalUI = new TerminalUI(inputHandler.handle, bindkeys.dispatch);

session.setTui(tui);
inputHandler.setSystemEcho(tui.echo);

// старт локального сервера с проксированием туда
const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, inputHandler.handle, tui.showme);

addOutputSink((text: string) => tui.log(text)); // todo куда это
exposeGlobalApi(session, tui, aliases, bindkeys, triggers); // все API в globalThis

tui.showme(`Bylinter v${packageJson.version} by Yuri Orlov`);

// загрузка пользовательского конфига, если он есть
await (new ConfigLoaderService(tui.showme)).loadUserConfig();
