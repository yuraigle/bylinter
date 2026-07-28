import { COLOR, echo, showme } from "./client";
import { ConfigLoaderService } from "./client/ConfigLoaderService";
import { startLocalServer } from "./client/localServer";
import { exposeGlobalApi } from "./globalApi";
import { handleInput } from "./logic/input";
import { initTui } from "./tui";

initTui((cmd: string) => {
    echo(`${COLOR.brightYellow}${cmd}${COLOR.reset}`);
    handleInput(cmd);
});

// старт локального сервера м проксированием туда всех строк
const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, handleInput);

exposeGlobalApi(); // все функции API в globalThis

// версия клиента
import packageJson from "../package.json" with { type: "json" };
showme(`Bylinter v${packageJson.version} by Yuri Orlov`);

// загрузка пользовательского конфига с триггерами, если он есть
const configLoader = new ConfigLoaderService(showme);
await configLoader.loadUserConfig();
