import { createServer } from "node:net";

import { addOutputSink } from "./output";
import { encode } from "./encoding";
import { systemMessage } from "./utils";
import { stripTelnetIAC } from "./telnet";

export function startLocalServer(
  port: number,
  onInput: (text: string) => void,
): void {
  const server = createServer((client) => {
    systemMessage(
      `Client connected: ${client.remoteAddress}:${client.remotePort}`,
    );

    const removeSink = addOutputSink((text) => {
      if (!client.destroyed) client.write(encode(text));
    });

    client.on("data", (chunk: Buffer) => {
      const { text } = stripTelnetIAC(chunk);
      onInput(text);
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
