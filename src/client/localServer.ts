import { createServer } from "node:net";

import { addOutputSink } from "./output";
import { encode } from "../shared/encoding";
import { createTelnetParser } from "../protocol/telnet";

export function startLocalServer(
  port: number,
  onInput: (text: string) => void,
  systemEcho: (text: string) => void,
): void {
  const server = createServer((client) => {
    systemEcho(`Client connected: ${client.remoteAddress}`);

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
      systemEcho("Client disconnected");
      removeSink();
    });

    client.on("error", () => removeSink());
  });

  server.listen(port, () => {
    systemEcho(`Local proxy listening on port ${port}`);
  });
}
