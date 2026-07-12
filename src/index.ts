import "dotenv/config";
import readline from "node:readline";

import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import "./config";

const localPort = Number(process.env.LOCAL_PORT || 0);

console.log(`Добро пожаловать!\r\nВведите 'кон' для подключения к серверу Былин\r\n`);

if (localPort > 0) startLocalServer(localPort, handleInput);

readline.createInterface({ input: process.stdin }).on("line", handleInput);
