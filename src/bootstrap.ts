import { startLocalServer } from "./client/localServer";
import { handleInput } from "./logic/input";
import { initTui, tuiLog } from "./tui";
import { showme } from "./shared/utils";
import { exposeGlobalApi } from "./globalApi";
import { COLOR } from "./client";

import packageJson from "../package.json" with { type: "json" };

export function bootstrap(): void {
  exposeGlobalApi();

  const localPort = Number(process.env.LOCAL_PORT || 0);
  if (localPort > 0) startLocalServer(localPort, handleInput);

  initTui((cmd: string) => {
    tuiLog(`\r\n${COLOR.brightYellow}${cmd}${COLOR.reset}`);
    handleInput(cmd);
  });

  showme(`Bylinter v${packageJson.version} by Yuri Orlov`);
}
