import type { Socket } from "node:net";
import { connect } from "node:net";

export function conn(
  host: string,
  port: number,
  proxy?: string
): Promise<Socket> {
  // setStatus(`Connected to ${host}:${port}`);
  return proxy
    ? connectViaProxy(host, port, proxy)
    : Promise.resolve(connect(port, host));
}

function connectViaProxy(
  host: string,
  port: number,
  proxy: string
): Promise<Socket> {
  const proxyUrl = new URL(proxy);
  const proxyObj = { host: proxyUrl.hostname, port: Number(proxyUrl.port) };

  return new Promise((resolve, reject) => {
    const socket = connect(proxyObj.port, proxyObj.host, () => {
      socket.write(
        `CONNECT ${host}:${port} HTTP/1.1\r\n` +
          `Host: ${host}:${port}\r\n` +
          `Connection: keep-alive\r\n\r\n`,
      );
    });

    let responseBuffer = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      responseBuffer = Buffer.concat([responseBuffer, chunk]);
      const headerEnd = responseBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = responseBuffer.subarray(0, headerEnd).toString("utf8");
      socket.removeListener("data", onData);

      if (!/^HTTP\/1\.[01] 200/.test(header)) {
        reject(new Error(`Proxy CONNECT failed: ${header.split("\r\n")[0]}`));
        socket.destroy();
        return;
      }

      const leftover = responseBuffer.subarray(headerEnd + 4);
      if (leftover.length > 0) {
        socket.unshift(leftover);
      }

      resolve(socket);
    };

    socket.on("data", onData);
    socket.on("error", reject);
  });
}
