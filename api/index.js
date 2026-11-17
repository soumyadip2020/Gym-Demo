import { Readable } from "node:stream";
import server from "../dist/server/server.js";

function getRequestOrigin(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : (protoHeader?.split(",")[0]?.trim() || "https");
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host}`;
}

function toWebHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, String(value));
    }
  }
  return headers;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  try {
    const method = (req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", getRequestOrigin(req));
    const headers = toWebHeaders(req.headers);

    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await readRequestBody(req) : undefined;

    const webRequest = new Request(url.toString(), {
      method,
      headers,
      body,
    });

    const webResponse = await server.fetch(webRequest, process.env, {
      waitUntil: () => {},
    });

    res.statusCode = webResponse.status;

    const setCookies =
      typeof webResponse.headers.getSetCookie === "function"
        ? webResponse.headers.getSetCookie()
        : [];
    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    }

    webResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });

    if (!webResponse.body || method === "HEAD") {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(webResponse.body);
    await new Promise((resolve, reject) => {
      nodeStream.on("error", reject);
      res.on("error", reject);
      res.on("close", resolve);
      nodeStream.on("end", resolve);
      nodeStream.pipe(res);
    });
  } catch (error) {
    console.error("[api/index] Unhandled server error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  }
}
