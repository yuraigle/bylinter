import { startLocalServer } from "./client/localServer";
import { handleInput } from "./client/input";
import { initTui, tuiLog } from "./client/tui";
import { showme } from "./client/utils";
import { exposeGlobalApi } from "./globalApi";
import { COLOR } from "./client";

export function bootstrap(): void {
  exposeGlobalApi();

  const localPort = Number(process.env.LOCAL_PORT || 0);
  if (localPort > 0) startLocalServer(localPort, handleInput);

  initTui((cmd: string) => {
    handleInput(cmd);
    tuiLog(`${COLOR.brightYellow}${cmd}${COLOR.reset}`);
  });

  showme("Bylinter v0.2 by Yuri Orlov");
}
