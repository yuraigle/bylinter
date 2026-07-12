import { createServer } from "node:net";

import { sendRaw } from "./mud";
import { addOutputSink } from "./output";
import { systemMessage } from "./utils";
import { stripTelnetIAC } from "./telnet";

export function startLocalServer(port: number): void {
  const server = createServer((client) => {
    systemMessage(
      `Client connected: ${client.remoteAddress}:${client.remotePort}`,
    );

    const removeSink = addOutputSink((text) => {
      if (!client.destroyed) client.write(text, "utf8");
    });

    client.on("data", (chunk: Buffer) => {
      const { text } = stripTelnetIAC(chunk);
      sendRaw(text);
    });

    client.on("close", () => {
      systemMessage("Client disconnected");
      removeSink();
    });

    client.on("error", () => removeSink());
  });

  server.listen(port, () => {
    systemMessage(`Local proxy listening on port ${port}`);
  });
}
