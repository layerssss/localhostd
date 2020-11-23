const http = require("http");
const https = require("https");
const tls = require("tls");
const net = require("net");

class ProxyCore {
  getModules(urlString) {
    const url = new URL(urlString);
    if (url.protocol === "https:") return [https, tls];
    if (url.protocol === "http:") return [http, net];
    throw new Error(`Unsupported protocol ${url.protocol}`);
  }

  async proxyRequest({ request, response, upstream, ssl }) {
    const upstreamUrl = new URL(upstream);
    const { hostname, port } = upstreamUrl;
    const upstreamRequestOptions = {
      method: request.method,
      host: hostname,
      port,
      path: request.url,
      setHost: false,
      headers: this.transformRequestHeaders(request.headers, {
        upstreamUrl,
        request,
        ssl
      })
    };
    const upstreamRequest = this.getModules(upstream)[0].request(
      upstreamRequestOptions
    );

    request.pipe(upstreamRequest);
    request.on("error", () => upstreamRequest.destroy());
    upstreamRequest.on("error", () => {
      if (response.headersSent) {
        request.destroy();
      } else {
        response.writeHead(502, {
          "Content-Type": "text/plain"
        });
        response.end("Bad Gateway");
      }
    });

    upstreamRequest.on("response", upstreamResponse => {
      const { statusCode, statusMessage } = upstreamResponse;
      const headers = this.transformResponseHeaders(upstreamResponse.headers, {
        upstreamUrl,
        request,
        ssl
      });
      response.writeHead(statusCode, statusMessage, headers);
      response.flushHeaders();
      upstreamResponse.pipe(response);
      upstreamResponse.on("error", () => response.destroy());
      response.on("error", () => upstreamResponse.destroy());
    });

    await new Promise(resolve => {
      upstreamRequest.on("close", resolve);
    });
  }

  async proxyUpgrade({ request, socket, head, upstream, ssl }) {
    const upstreamUrl = new URL(upstream);
    const upstreamConnectOptions = {
      host: upstreamUrl.hostname,
      port: upstreamUrl.port || (ssl ? 443 : 80),
      servername: upstreamUrl.hostname
    };
    const upstreamSocket = this.getModules(upstream)[1].connect(
      upstreamConnectOptions
    );
    const upsteamHeaders = this.transformRequestHeaders(request.headers, {
      upstreamUrl,
      ssl,
      request
    });
    const upsteamPath = request.url;
    socket.unshift(
      Buffer.concat([
        Buffer.from(
          [
            `${request.method} ${upsteamPath} HTTP/${request.httpVersion}`,
            ...Object.entries(upsteamHeaders).map(
              ([name, value]) => `${name}: ${value}`
            )
          ].join("\r\n")
        ),
        Buffer.from("\r\n\r\n"),
        head
      ])
    );
    socket.pipe(upstreamSocket).pipe(socket);
    socket.on("error", () => upstreamSocket.destroy());
    upstreamSocket.on("error", () => socket.destroy());

    await new Promise(resolve => {
      upstreamSocket.on("connect", resolve);
    });
  }

  transformRequestHeaders(headers, { upstreamUrl, ssl, request }) {
    const headersTransformed = { ...headers };
    // generate xfwd headers
    const origAddr = request.socket.remoteAddress.replace("::ffff:", "");
    const origPort = request.socket.localPort;
    const origProto = ssl ? "https" : "http";
    for (const [suffix, value, append] of [
      ["for", origAddr, true],
      ["port", origPort, false],
      ["proto", origProto, false]
    ]) {
      const name = `x-forwarded-${suffix}`;
      if (headersTransformed[name] && append)
        headersTransformed[name] = `${headersTransformed[name]},${value}`;
      else headersTransformed[name] = value;
    }
    return headersTransformed;
  }

  transformResponseHeaders(headers) {
    return {
      ...headers
    };
  }
}

module.exports = ProxyCore;
