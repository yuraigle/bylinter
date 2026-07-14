import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import { initTui } from "./client/tui";
import { showme } from "./client/utils";

import "./config";

const localPort = Number(process.env.LOCAL_PORT || 0);

initTui(handleInput);

showme("Добро пожаловать!", false);
showme("Введите 'кон' для подключения к серверу Былин", false);

if (localPort > 0) startLocalServer(localPort, handleInput);
