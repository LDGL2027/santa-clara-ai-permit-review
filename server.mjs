import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { webAccessGate } from "@workspace/app-access";

const root = fileURLToPath(new URL("./dist/public/", import.meta.url));
const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1) throw new Error("A valid PORT is required.");
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".pdf": "application/pdf", ".json": "application/json", ".map": "application/json",
  ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain",
};
async function serve(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://local").pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const base = (process.env.BASE_PATH ?? "/").replace(/\/$/, "");
  if (base && !pathname.startsWith(`${base}/`) && pathname !== base) { res.writeHead(404); res.end(); return; }
  pathname = pathname.slice(base.length) || "/";
  let file = resolve(root, `.${pathname}`);
  if (!file.startsWith(resolve(root) + sep) && file !== resolve(root)) { res.writeHead(403); res.end(); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) file = resolve(root, "index.html");
  } catch {
    if (extname(pathname)) { res.writeHead(404); res.end(); return; }
    file = resolve(root, "index.html");
  }
  res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "HEAD") { res.end(); return; }
  const stream = createReadStream(file);
  stream.on("error", () => { if (!res.headersSent) res.writeHead(500); res.end(); });
  stream.pipe(res);
}
createServer((req, res) => {
  webAccessGate(req, res, () => {
    serve(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
}).listen(port, "0.0.0.0");
