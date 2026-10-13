import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("docs/design/navigation-footer-sample.html");
// Serve only this preview, not the workspace or other design evidence.
createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end(); return;
  }
  const path = new URL(request.url || "/", "http://localhost").pathname;
  if (path !== "/" && path !== "/navigation-footer-sample.html") {
    response.writeHead(404).end(); return;
  }
  const html = readFileSync(file);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": html.length,
    "Cache-Control": "no-store",
    ...(path.endsWith(".html") ? { "Content-Disposition": 'attachment; filename="navigation-footer-sample.html"' } : {}),
  });
  response.end(request.method === "HEAD" ? undefined : html);
}).listen(6008, "127.0.0.1", () => console.log("Navigation sample: http://127.0.0.1:6008"));
