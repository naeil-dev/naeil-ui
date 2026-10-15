import { describe, it, expect } from "vitest";
import { runInNewContext } from "node:vm";
import { createInviteHandler } from "../invite";
const origin = "http://127.0.0.1:2482";
const proof = {
  id: "10000000-0000-4000-8000-000000000001",
  version: "1",
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
const userId = "20000000-0000-4000-8000-000000000002",
  sessionId = "30000000-0000-4000-8000-000000000003";
const user = {
  id: userId,
  email: "recipient@example.test",
  email_confirmed_at: "2026-10-15T01:00:00Z",
};
const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, exp: 9999999999 })).toString("base64url")}.fixture`;
async function recoveryPage(
  lostAction: "stage" | "confirm",
  kind: "network" | "json",
) {
  const upstream: string[] = [];
  const browser: string[] = [];
  const h = createInviteHandler({
    readConfig: () => ({
      siteOrigin: origin,
      supabaseUrl: "http://127.0.0.1:54321",
      anonKey: "fixture",
      serviceRoleKey: "fixture-service",
    }),
    fetch: async (input) => {
      const p = new URL(String(input)).pathname;
      upstream.push(p);
      if (p.endsWith("preflight"))
        return Response.json({
          userId,
          email: user.email,
          verificationType: "invite",
        });
      if (p.endsWith("/verify"))
        return Response.json({ access_token: token, user });
      if (p.endsWith("/user")) return Response.json(user);
      if (p.endsWith("record_verification"))
        return Response.json({
          verified: true,
          expiresAt: "2099-01-01T00:00:00Z",
        });
      return Response.json({
        inviteId: proof.id,
        version: 1,
        userId,
        services: ["jev"],
        acceptedAt: "2026-10-15T01:00:00Z",
      });
    },
  });
  let cookie = "";
  const request = (
    method: string,
    data?: string,
    accept = "application/json",
  ) =>
    new Request("http://localhost:2482/auth/invite", {
      method,
      headers: {
        host: "127.0.0.1:2482",
        accept,
        ...(method === "POST"
          ? { origin, "content-type": "application/json" }
          : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(data ? { body: data } : {}),
    });
  const initial = await h.GET(request("GET", undefined, "text/html"));
  cookie = initial.headers.get("set-cookie")!.split(";")[0];
  const html = await initial.text();
  type Node = {
    textContent: string;
    hidden: boolean;
    disabled: boolean;
    dataset: Record<string, string>;
    children: unknown[];
    setAttribute: () => void;
    replaceChildren: () => void;
    append: (v: unknown) => void;
    addEventListener: (event: string, fn: () => Promise<void>) => void;
  };
  const nodes = new Map<string, Node>(),
    clicks = new Map<string, () => Promise<void>>();
  function node(id: string) {
    if (!nodes.has(id))
      nodes.set(id, {
        textContent: "",
        hidden: false,
        disabled: false,
        dataset: {},
        children: [],
        setAttribute() {},
        replaceChildren() {
          this.children = [];
        },
        append(v) {
          this.children.push(v);
        },
        addEventListener(event, fn) {
          clicks.set(id + ":" + event, fn);
        },
      });
    return nodes.get(id)!;
  }
  let ready = () => {};
  let lost = false;
  const fetch = async (_input: string, init: RequestInit) => {
    const method = init.method || "GET";
    const action =
      method === "POST" ? JSON.parse(String(init.body)).action : "status";
    browser.push(action);
    const r =
      method === "POST"
        ? await h.POST(request("POST", String(init.body)))
        : await h.GET(request("GET"));
    const next = r.headers.get("set-cookie");
    if (next) cookie = next.split(";")[0];
    if (!lost && action === lostAction && r.ok) {
      lost = true;
      if (kind === "network") throw new TypeError("Response lost");
      return new Response("{broken-json", { status: 200 });
    }
    return r;
  };
  const location = {
    hash: "#" + new URLSearchParams(proof),
    pathname: "/auth/invite",
    search: "",
  };
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
      fetch,
      URLSearchParams,
    },
  );
  const settle = async () => {
    for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
  };
  ready();
  await settle();
  return {
    nodes,
    upstream,
    browser,
    click: async () => {
      await clicks.get("confirm:click")!();
      await settle();
    },
  };
}
describe("real-handler recovery after successful response loss", () => {
  it.each(["network", "json"] as const)(
    "lost stage %s: explicit GET resync then a separate deliberate confirm",
    async (kind) => {
      const t = await recoveryPage("stage", kind);
      expect(t.browser).toEqual(["stage"]);
      expect(t.upstream).toHaveLength(0);
      expect(t.nodes.get("confirm")!.hidden).toBe(false);
      await t.click();
      expect(t.browser).toEqual(["stage", "status"]);
      expect(t.upstream).toHaveLength(0);
      expect(t.nodes.get("confirm")!.hidden).toBe(false);
      await t.click();
      expect(t.browser).toEqual(["stage", "status", "confirm"]);
      expect(t.nodes.get("links")!.children).toHaveLength(1);
      expect(t.upstream.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    },
  );
  it.each(["network", "json"] as const)(
    "lost acceptance %s: explicit GET shows known completion without repeat authority calls",
    async (kind) => {
      const t = await recoveryPage("confirm", kind);
      await t.click();
      expect(t.browser).toEqual(["stage", "confirm"]);
      expect(t.upstream).toHaveLength(5);
      await t.click();
      expect(t.browser).toEqual(["stage", "confirm", "status"]);
      expect(t.upstream).toHaveLength(5);
      expect(
        t.upstream.filter((p) => p.endsWith("record_verification")),
      ).toHaveLength(1);
      expect(
        t.upstream.filter((p) => p.endsWith("accept_console_invite")),
      ).toHaveLength(1);
      expect(t.nodes.get("links")!.children).toHaveLength(1);
      expect(t.nodes.get("confirm")!.hidden).toBe(true);
    },
  );
});
