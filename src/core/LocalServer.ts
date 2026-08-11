import { createServer } from "node:net";

import { Broadcaster } from "./Broadcaster";
import { createTelnetParser } from "../protocol/telnet";

type TextConsumer = (text: string) => void;

const localPass: string | null = process.env.LOCAL_PASS || null;

export class LocalServer {
  private readonly port: number;
  private readonly outputSink: Broadcaster;
  private readonly onInput: TextConsumer;
  private readonly systemEcho: TextConsumer;

  constructor(
    port: number,
    outputSink: Broadcaster,
    onInput: TextConsumer,
    systemEcho: TextConsumer,
  ) {
    this.port = port;
    this.outputSink = outputSink;
    this.onInput = onInput;
    this.systemEcho = systemEcho;
  }

  public init = (): void => {
    const server = createServer((client) => {
      this.systemEcho(`Client connected: ${client.remoteAddress}`);

      // LocalServer на UTF-8 всегда, для веб-клиентов
      const parser = createTelnetParser("utf8");
      let authenticated = localPass === null;
      let inputBuffer = "";

      const consumer = (text: string, hasGA?: boolean) => {
        if (!authenticated) return;
        if (!client.destroyed) {
          client.write(text);
          if (hasGA) {
            client.write(Buffer.from([0xff, 0xf9])); // IAC GA
          }
        }
      };

      const removeCb = this.outputSink.addConsumer(consumer);

      if (!authenticated) {
        client.write("Password: ");
        client.write(Buffer.from([0xff, 0xf9])); // IAC GA
      }

      client.on("data", (chunk: Buffer) => {
        if (!authenticated) {
          inputBuffer += chunk.toString("utf8");
          const newlineIndex = inputBuffer.search(/[\r\n]/);
          if (newlineIndex === -1) return;

          const entered = inputBuffer.slice(0, newlineIndex).trim();
          inputBuffer = "";

          if (entered === localPass) {
            authenticated = true;
            client.write("\r\nOK\r\n");
          } else {
            client.write("\r\nWrong password\r\n");
            client.destroy();
            removeCb();
          }
          return;
        }

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
        removeCb();
      });
    });

    server.on("error", (err) => {
      this.systemEcho(`Error while starting local proxy: ${err.message}`);
    });

    server.listen(this.port, () => {
      this.systemEcho(`Local proxy listening on port ${this.port}`);
    });
  };
}
