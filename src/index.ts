import "dotenv/config";
import "./config";

import readline from "node:readline";

import { connect, sendl } from "./mud";
import { systemError } from "./utils";

connect().catch((err) => {
  systemError("Failed to connect: " + err.message);
  process.exit(1);
});

readline
  .createInterface({ input: process.stdin })
  .on("line", (line) => sendl(line));
