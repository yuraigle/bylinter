import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import { initTui } from "./client/tui";
import { showme } from "./client/utils";

const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort, handleInput);

initTui(handleInput);
showme("Bylinter v0.1 by Yuri Orlov", false);

import "./config";
