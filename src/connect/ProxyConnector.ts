import { connect, Socket } from "node:net";
import { IConnector } from "./ConnectionProvider";

export class ProxyConnector implements IConnector {

    private readonly proxyHost: string;
    private readonly proxyPort: number;

    constructor(proxyUrl: string) {
        const url = new URL(proxyUrl);
        this.proxyHost = url.hostname;
        this.proxyPort = Number(url.port);
    }

    public async connect(targetHost: string, targetPort: number): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const socket = connect(this.proxyPort, this.proxyHost, () => {
                socket.setTimeout(15000);

                const req = [
                    `CONNECT ${targetHost}:${targetPort} HTTP/1.1`,
                    `Host: ${targetHost}:${targetPort}`,
                    `Proxy-Connection: keep-alive`,
                    `\r\n`,
                ].join("\r\n");

                socket.write(req);
            });

            let responseBuffer = Buffer.alloc(0);

            const onData = (chunk: Buffer) => {
                responseBuffer = Buffer.concat([responseBuffer, chunk]);
                const headerEnd = responseBuffer.indexOf("\r\n\r\n");
                if (headerEnd === -1) return;

                const statusLine = responseBuffer.subarray(0, headerEnd)
                    .toString("utf8").split("\r\n")[0];

                if (!/^HTTP\/1\.[01] 2\d{2}/.test(statusLine)) {
                    socket.destroy();
                    reject(new Error(`Proxy error: ${statusLine}`));
                    return;
                }

                socket.removeListener("data", onData);
                socket.removeListener("timeout", onTimeout);
                socket.removeListener("error", onError);
                socket.setTimeout(0);
                resolve(socket);
            };

            const onError = (err: Error) => {
                socket.destroy();
                reject(err);
            };

            const onTimeout = () => {
                socket.destroy();
                reject(new Error('Proxy CONNECT timeout'));
            };

            socket.on("data", onData);
            socket.on("error", onError);
            socket.on("timeout", onTimeout);
        });
    }
}
