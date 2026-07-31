import { Socket } from "node:net";
import { IConnector } from "./ConnectionProvider";

export class DirectConnector implements IConnector {

    public async connect(host: string, port: number): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const sock = new Socket();
            sock.setTimeout(10000);

            const cleanup = () => {
                sock.removeListener('connect', onConnect);
                sock.removeListener('error', onError);
                sock.removeListener('timeout', onTimeout);
            };

            const onConnect = () => {
                cleanup();
                sock.setTimeout(0);
                resolve(sock);
            };

            const onError = (err: Error) => {
                cleanup();
                sock.destroy();
                reject(err);
            };

            const onTimeout = () => {
                cleanup();
                sock.destroy();
                reject(new Error(`Connection to ${host}:${port} timed out`));
            };

            sock.once('connect', onConnect);
            sock.once('error', onError);
            sock.once('timeout', onTimeout);

            sock.connect(port, host);
        });
    }
}
