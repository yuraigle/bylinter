import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import { initTui, tuiLog } from "./client/tui";
import { showme } from "./client/utils";
import { exposeGlobalApi } from "./globalApi";
import { loadUserConfig } from "./configLoader";
import { COLOR } from "./client";

exposeGlobalApi();

const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, handleInput);

initTui((cmd: string) => {
  handleInput(cmd);
  tuiLog(`${COLOR.brightYellow}${cmd}${COLOR.reset}\r\n`);
});

showme("Bylinter v0.2 by Yuri Orlov");

await loadUserConfig();
