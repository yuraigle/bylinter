import { Socket, connect } from "node:net";

export function connectDirect(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const sock = new Socket();

    sock.setTimeout(10000);

    sock.once('connect', () => {
      sock.setTimeout(0);
      resolve(sock);
    });

    sock.once('error', (err: Error) => {
      sock.destroy();
      reject(err);
    });

    sock.once('timeout', () => {
      sock.destroy();
      reject(new Error('Connection timed out'));
    });

    sock.connect(port, host);
  });
}

export function connectViaProxy(
  host: string,
  port: number,
  proxy: string,
): Promise<Socket> {
  const proxyUrl = new URL(proxy);
  const proxyObj = {
    host: proxyUrl.hostname,
    port: Number(proxyUrl.port) || 8080 // Добавлен порт по умолчанию
  };

  return new Promise((resolve, reject) => {
    const socket = connect(proxyObj.port, proxyObj.host, () => {
      socket.setTimeout(15000); // ждём ответ CONNECT

      const connectRequest = [
        `CONNECT ${host}:${port} HTTP/1.1`,
        `Host: ${host}:${port}`,
        `Proxy-Connection: keep-alive`,
        `\r\n`,
      ].join("\r\n");

      socket.write(connectRequest);
    });

    let responseBuffer = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      responseBuffer = Buffer.concat([responseBuffer, chunk]);

      const headerEnd = responseBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const headerText = responseBuffer.subarray(0, headerEnd).toString("utf8");
      const statusLine = headerText.split("\r\n")[0];

      if (!/^HTTP\/1\.[01] 2\d{2}/.test(statusLine)) {
        socket.destroy();
        reject(new Error("Proxy connection failed"));
        return;
      }

      socket.removeListener("data", onData);
      socket.removeListener("timeout", onTimeout);
      socket.setTimeout(0);
      // todo при попытке подключиться к ошибочному серверу через ок прокси

      resolve(socket);
    };

    const onError = (err: Error) => {
      socket.destroy();
      reject(err);
    };

    const onTimeout = () => {
      const err = new Error('Proxy connection timed out');
      socket.destroy();
      reject(err);
    };

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("timeout", onTimeout);
  });
}
