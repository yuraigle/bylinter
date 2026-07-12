import "dotenv/config";
import readline from "node:readline";

import { connect, sendl } from "./client/mud";
import { startLocalServer } from "./client/localServer";
import { systemError } from "./client/utils";
import "./config";

const localPort = Number(process.env.LOCAL_PORT || 0);
if (localPort > 0) startLocalServer(localPort);

connect().catch((err) => {
  systemError("Failed to connect: " + err.message);
  process.exit(1);
});

readline
  .createInterface({ input: process.stdin })
  .on("line", (line) => sendl(line));
