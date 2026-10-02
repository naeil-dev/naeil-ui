import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

// Node's persistent HTTP connections avoid the small accept queue in macOS's
// Python http.server when Storybook preloads many docs/font chunks together.
const root = resolve(process.argv[2] || "storybook-static");
const types: Record<string, string> = { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain", ".md": "text/plain" };
createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405).end(); return; }
  try {
    const path = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const stats = statSync(file);
    if (!stats.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Content-Length": stats.size });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end(); }
}).listen(6007, "127.0.0.1", () => console.log("Storybook artifact: http://127.0.0.1:6007"));
