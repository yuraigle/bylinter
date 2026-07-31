import { createServer } from "node:net";

import { Broadcaster } from "./Broadcaster";
import { encode } from "../shared/encoding";
import { createTelnetParser } from "../protocol/telnet";

type TextConsumer = (text: string) => void;

export class LocalServer {
  private readonly port: number;
  private readonly outputSink: Broadcaster;
  private readonly onInput: TextConsumer;
  private readonly systemEcho: TextConsumer;

  constructor(
    port: number,
    outputSink: Broadcaster,
    onInput: TextConsumer,
    systemEcho: TextConsumer
  ) {
    this.port = port;
    this.outputSink = outputSink;
    this.onInput = onInput;
    this.systemEcho = systemEcho;
  }

  public init = (): void => {
    const server = createServer((client) => {
      this.systemEcho(`Client connected: ${client.remoteAddress}`);

      const parser = createTelnetParser();

      const consumer = (text: string) => {
        if (!client.destroyed) client.write(encode(text));
      };

      const removeCb = this.outputSink.addConsumer(consumer);

      client.on("data", (chunk: Buffer) => {
        const { segments } = parser.feed(chunk);
        const text = segments.map((s) => s.text).join("");
        if (text.length > 0) {
          this.onInput(text);
        }
      });

      client.on("close", () => {
        this.systemEcho("Client disconnected");
        removeCb();
      });

      client.on("error", () => {
        this.systemEcho("Client disconnected");
        removeCb()
      });
    });

    server.listen(this.port, () => {
      this.systemEcho(`Local proxy listening on port ${this.port}`);
    });
  }
}

