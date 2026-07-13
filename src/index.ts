import readline from "node:readline";

import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import { showme } from "./client/utils";
import "./config";

const localPort = Number(process.env.LOCAL_PORT || 0);

showme("Добро пожаловать!", false);
showme("Введите 'кон' для подключения к серверу Былин", false);

if (localPort > 0) startLocalServer(localPort, handleInput);

readline.createInterface({ input: process.stdin }).on("line", handleInput);
