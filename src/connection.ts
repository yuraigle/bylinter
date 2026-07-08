import net from "node:net";

function parseProxy(proxyUrl: string): { host: string; port: number } {
  const url = new URL(proxyUrl);
  return { host: url.hostname, port: Number(url.port) };
}

export function connect(
  host: string,
  port: number,
  proxy?: string,
): Promise<net.Socket> {
  if (!proxy) {
    return Promise.resolve(net.connect(port, host));
  }
  return connectViaProxy(host, port, parseProxy(proxy));
}

function connectViaProxy(
  host: string,
  port: number,
  proxy: { host: string; port: number },
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxy.port, proxy.host, () => {
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
