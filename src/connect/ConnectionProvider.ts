// src/app/connection/ConnectionProvider.ts
import { Socket } from "node:net";
import { DirectConnector } from "./DirectConnector";
import { ProxyConnector } from "./ProxyConnector";

export interface IConnector {
    connect(host: string, port: number): Promise<Socket>;
}

export class ConnectionProvider {

    public static async connect(
        host: string,
        port: number,
        proxyUrl?: string
    ): Promise<Socket> {
        const connector: IConnector = proxyUrl
            ? new ProxyConnector(proxyUrl)
            : new DirectConnector();

        return await connector.connect(host, port);
    }
}
