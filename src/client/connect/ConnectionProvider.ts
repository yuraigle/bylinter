// src/app/connection/ConnectionProvider.ts
import { Socket } from "node:net";
import { DirectConnector } from "./DirectConnector";
import { ProxyConnector } from "./ProxyConnector";

export class ConnectionProvider {

    public static async connect(
        host: string,
        port: number,
        proxyUrl?: string
    ): Promise<Socket> {
        if (proxyUrl) {
            const connector = new ProxyConnector(proxyUrl);
            return await connector.connect(host, port);
        }

        const connector = new DirectConnector();
        return await connector.connect(host, port);
    }
}
