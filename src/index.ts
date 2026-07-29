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

const pipeline = new TextPipeline();
const sender = new TcpCommandSender(null);
const session: MudSession = new MudSession(pipeline, sender);

const inputHandler = new InputHandler(session);
const tui: TerminalUI = new TerminalUI(inputHandler.handle);

session.setTui(tui);
addOutputSink((text: string) => tui.log(text)); // todo куда это
inputHandler.setSystemEcho(tui.echo);

// старт локального сервера м проксированием туда всех строк
const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, inputHandler.handle, tui.showme);

exposeGlobalApi(session, tui); // все функции API в globalThis

tui.showme(`Bylinter v${packageJson.version} by Yuri Orlov`);

// загрузка пользовательского конфига с триггерами, если он есть
const configLoader = new ConfigLoaderService(tui.showme);
await configLoader.loadUserConfig();
