import http from "node:http";
import { readFile } from "node:fs/promises";
const moduleSource = await readFile(
  new URL("../dist/server/index.js", import.meta.url),
  "utf8",
);
const worker = (
  await import(
    "data:text/javascript;base64," +
      Buffer.from(moduleSource).toString("base64")
  )
).default;
const port = Number(process.env.BREATHE_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new RangeError("BREATHE_PORT must be1024?65535");
const origin = "http://127.0.0.1:" + port;
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 20000) {
        res.writeHead(413);
        res.end("Too large");
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(new URL(req.url, origin), {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await worker.fetch(request, process.env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Request failed");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log("Breathe preview: " + origin),
);
