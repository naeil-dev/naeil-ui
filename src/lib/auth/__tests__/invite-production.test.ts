import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, request as httpRequest, type Server } from "node:http";
import { mkdtempSync, realpathSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
const origin = "http://127.0.0.1:2482";
// Deliberately opt-in: owns2482 and a private fake HTTP Auth/RPC seam, never real OTP.
const enabled = process.env.NAEIL_INVITE_PRODUCTION_TEST === "1";
async function rawRequest(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(origin + path, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.from(c)));
      res.on("end", () => {
        const resultHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value))
            value.forEach((v) => resultHeaders.append(key, v));
          else if (value) resultHeaders.set(key, value);
        }
        resolve(
          new Response(method === "HEAD" ? null : Buffer.concat(chunks), {
            status: res.statusCode,
            headers: resultHeaders,
          }),
        );
      });
    });
    req.on("error", () => reject(new Error("Owned raw HTTP probe failed")));
    req.end();
  });
}
function protectedHeaders(r: Response) {
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("referrer-policy")).toBe("no-referrer");
  expect(r.headers.get("vary")).toContain("Cookie");
  expect(r.headers.get("x-frame-options")).toBe("DENY");
  expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  expect(r.headers.get("content-security-policy")).toContain(
    "frame-ancestors 'none'",
  );
}
describe.skipIf(!enabled)(
  "owned actual Next16 production invitation boundary",
  () => {
    let app: ChildProcess | undefined;
    let seam: Server | undefined;
    let privateDir = "";
    const upstream: string[] = [];
    const id = "10000000-0000-4000-8000-000000000001",
      userId = "20000000-0000-4000-8000-000000000002",
      sessionId = "30000000-0000-4000-8000-000000000003";
    const user = {
      id: userId,
      email: "recipient@example.test",
      email_confirmed_at: "2026-10-15T01:00:00Z",
    };
    const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, exp: 9999999999 })).toString("base64url")}.fixture`;
    beforeAll(async () => {
      const guard = createServer();
      await new Promise<void>((resolve, reject) => {
        guard.once("error", () =>
          reject(new Error("Owned preview port is not free")),
        );
        guard.listen(2482, "127.0.0.1", resolve);
      });
      await new Promise<void>((r) => guard.close(() => r()));
      seam = createServer((req, res) => {
        const p = req.url || "";
        upstream.push(p);
        let data: unknown;
        if (p.endsWith("preflight"))
          data = { userId, email: user.email, verificationType: "invite" };
        else if (p.endsWith("/verify")) data = { access_token: token, user };
        else if (p.endsWith("/user")) data = user;
        else if (p.endsWith("record_verification"))
          data = { verified: true, expiresAt: "2099-01-01T00:00:00Z" };
        else
          data = {
            inviteId: id,
            version: 1,
            userId,
            services: ["jev"],
            acceptedAt: "2026-10-15T01:00:00Z",
          };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      });
      await new Promise<void>((r) => seam!.listen(0, "127.0.0.1", r));
      const address = seam.address();
      if (!address || typeof address === "string")
        throw new Error("Owned HTTP seam unavailable");
      privateDir = mkdtempSync(
        join(realpathSync(tmpdir()), "invite-production-"),
      );
      const privateFile = join(privateDir, "private.json");
      writeFileSync(
        privateFile,
        JSON.stringify({
          siteOrigin: origin,
          supabaseUrl: `http://127.0.0.1:${address.port}`,
          anonKey: "fixture-anon",
          serviceRoleKey: "fixture-service",
        }),
        { mode: 0o600 },
      );
      app = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          "2482",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NAEIL_INVITE_CONFIG_FILE: privateFile,
            NAEIL_INVITE_DIST_DIR: ".next-console-invite",
          },
          stdio: "ignore",
        },
      );
      let ready = false;
      for (let i = 0; i < 150; i++) {
        try {
          await fetch(origin + "/auth/invite", {
            redirect: "manual",
            signal: AbortSignal.timeout(500),
          });
          ready = true;
          break;
        } catch {
          if (app.exitCode !== null) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      if (!ready)
        throw new Error("Owned production preview did not become ready");
    }, 30000);
    afterAll(async () => {
      if (app && app.exitCode === null) {
        app.kill("SIGTERM");
        await Promise.race([
          new Promise<void>((r) => app!.once("exit", () => r())),
          new Promise<void>((r) => setTimeout(r, 2000)),
        ]);
        if (app.exitCode === null) app.kill("SIGKILL");
      }
      if (seam) await new Promise<void>((r) => seam!.close(() => r()));
      if (privateDir) rmSync(privateDir, { recursive: true, force: true });
    }, 10000);
    it("serves inert HTML GET and bodyless HEAD with actual nonce-matching CSP", async () => {
      const count = upstream.length;
      const r = await fetch(origin + "/auth/invite");
      expect(r.status).toBe(200);
      protectedHeaders(r);
      const html = await r.text();
      const nonce = html.match(/<script nonce="([^"]+)"/);
      expect(Boolean(nonce)).toBe(true);
      expect(r.headers.get("content-security-policy")).toContain(
        `script-src 'nonce-${nonce![1]}'`,
      );
      expect(r.headers.get("content-security-policy")).toContain(
        `style-src 'nonce-${nonce![1]}'`,
      );
      expect(
        (r.headers.get("content-security-policy")!.match(/default-src/g) || [])
          .length,
      ).toBe(1);
      const head = await fetch(origin + "/auth/invite", { method: "HEAD" });
      expect(head.status).toBe(200);
      protectedHeaders(head);
      expect(await head.text()).toBe("");
      expect(upstream.length).toBe(count);
    });
    it("protects the actual slash308 and keeps non-invite canonical behavior", async () => {
      for (const suffix of ["/", "/?locale=ko"]) {
        const r = await fetch(origin + "/auth/invite" + suffix, {
          redirect: "manual",
        });
        expect(r.status).toBe(308);
        protectedHeaders(r);
        const target = new URL(r.headers.get("location")!, origin);
        expect(target.origin).toBe(origin);
        expect(target.pathname + target.search).toBe(
          "/auth/invite" + (suffix.includes("?") ? "?locale=ko" : ""),
        );
      }
      const closed = await fetch(origin + "/auth/invite/?nonce=fixture", {
        redirect: "manual",
      });
      expect(closed.status).toBe(400);
      protectedHeaders(closed);
      expect(closed.headers.get("location")).toBeNull();
      const legacy = await fetch(origin + "/ko/", { redirect: "manual" });
      expect(legacy.status).toBe(308);
      expect(legacy.headers.get("location")).toBe("/ko");
    });
    it("keeps exact Host and POST Origin while ignoring forwarded authority", async () => {
      const good = await fetch(origin + "/auth/invite", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      });
      expect(good.status).toBe(200);
      const bad = await rawRequest("/auth/invite", "GET", {
        host: "evil.example",
        "x-forwarded-host": "127.0.0.1:2482",
      });
      expect(bad.status).toBe(403);
      protectedHeaders(bad);
      const post = await fetch(origin + "/auth/invite", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: "{}",
      });
      expect(post.status).toBe(403);
      protectedHeaders(post);
    });
    it("records the explicitly excluded Next TRACE predispatch500 and missing headers", async () => {
      const r = await rawRequest("/auth/invite", "TRACE");
      // Binding contract: unsupported Next16 TRACE fails before route/proxy.
      // Keep this measured limitation visible; production ingress must reject it.
      expect(r.status).toBe(500);
      expect(r.headers.get("referrer-policy")).toBeNull();
      expect(r.headers.get("content-security-policy")).toBeNull();
    });
    it("protects supported method errors and executes returned fragment script to explicit fake acceptance", async () => {
      for (const method of ["PUT", "OPTIONS"]) {
        const r = await fetch(origin + "/auth/invite", { method });
        expect(r.status).toBe(405);
        protectedHeaders(r);
      }
      const r = await fetch(origin + "/auth/invite/");
      expect(r.status).toBe(200);
      const html = await r.text();
      let cookie = r.headers.get("set-cookie")!.split(";")[0];
      type ProbeNode = {
        dataset: Record<string, string>;
        children: unknown[];
        disabled: boolean;
        hidden: boolean;
        setAttribute: () => void;
        replaceChildren: () => void;
        append: (v: unknown) => void;
        addEventListener: (event: string, fn: () => Promise<void>) => void;
      };
      const nodes = new Map<string, ProbeNode>(),
        clicks = new Map<string, () => Promise<void>>();
      function node(id: string) {
        if (!nodes.has(id))
          nodes.set(id, {
            dataset: {},
            children: [],
            disabled: false,
            hidden: false,
            setAttribute() {},
            replaceChildren() {
              this.children = [];
            },
            append(v: unknown) {
              this.children.push(v);
            },
            addEventListener(event: string, fn: () => Promise<void>) {
              clicks.set(id + ":" + event, fn);
            },
          });
        return nodes.get(id)!;
      }
      let ready = () => {};
      const location = {
        hash:
          "#" +
          new URLSearchParams({
            id,
            version: "1",
            nonce: "n".repeat(48),
            token_hash: "a".repeat(64),
          }),
        pathname: "/auth/invite",
        search: "",
      };
      const requests: string[] = [];
      const browserFetch = async (path: string, init: RequestInit) => {
        requests.push(init.method || "GET");
        const response = await fetch(origin + path, {
          ...init,
          headers: {
            ...init.headers,
            cookie,
            ...(init.method === "POST" ? { origin } : {}),
          },
        });
        const next = response.headers.get("set-cookie");
        if (next) cookie = next.split(";")[0];
        return response;
      };
      const count = upstream.length;
      runInNewContext(
        html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1],
        {
          location,
          history: {
            replaceState() {
              location.hash = "";
            },
          },
          document: {
            documentElement: node("root"),
            getElementById: node,
            createElement: () => ({}),
            addEventListener(_event: string, fn: () => void) {
              ready = fn;
            },
          },
          fetch: browserFetch,
          URLSearchParams,
        },
      );
      ready();
      for (let i = 0; i < 30 && !requests.length; i++)
        await new Promise((r) => setTimeout(r, 20));
      for (let i = 0; i < 30 && node("confirm").disabled; i++)
        await new Promise((r) => setTimeout(r, 20));
      expect(location.hash).toBe("");
      expect(requests).toEqual(["POST"]);
      expect(upstream.length).toBe(count);
      expect(node("confirm").hidden).toBe(false);
      await clicks.get("confirm:click")!();
      expect(node("links").children).toHaveLength(1);
      expect(upstream.length - count).toBe(5);
    });
  },
);
