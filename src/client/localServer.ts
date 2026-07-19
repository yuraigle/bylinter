import { createServer } from "node:net";

import { addOutputSink } from "./output";
import { encode } from "./encoding";
import { showme } from "./utils";
import { createTelnetParser } from "./telnet";

export function startLocalServer(
  port: number,
  onInput: (text: string) => void,
): void {
  const server = createServer((client) => {
    showme(`Client connected: ${client.remoteAddress}`);

    const parser = createTelnetParser();

    const removeSink = addOutputSink((text) => {
      if (!client.destroyed) client.write(encode(text));
    });

    client.on("data", (chunk: Buffer) => {
      const { segments } = parser.feed(chunk);
      const text = segments.map((s) => s.text).join("");
      if (text.length > 0) {
        onInput(text);
      }
    });

    client.on("close", () => {
      showme("Client disconnected");
      removeSink();
    });

    client.on("error", () => removeSink());
  });

  server.listen(port, () => {
    showme(`Local proxy listening on port ${port}`);
  });
}
