import readline from "node:readline";

import { startLocalServer } from "./client/server";
import { handleInput } from "./client/input";
import "./config";

const localPort = Number(process.env.LOCAL_PORT || 0);

console.log("Добро пожаловать!");
console.log("Введите 'кон' для подключения к серверу Былин");

if (localPort > 0) startLocalServer(localPort, handleInput);

readline.createInterface({ input: process.stdin }).on("line", handleInput);
