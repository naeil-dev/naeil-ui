import { describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { createInviteHandler } from "../invite";
const origin = "http://127.0.0.1:2482";
const proof = {
  id: "10000000-0000-4000-8000-000000000001",
  version: "1",
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
async function page(fragment: string, failStageOnce = false) {
  const h = createInviteHandler({
    readConfig: () => ({
      siteOrigin: origin,
      supabaseUrl: "http://127.0.0.1:54321",
      anonKey: "fixture",
      serviceRoleKey: "fixture-service",
    }),
  });
  const r = await h.GET(
    new Request(`${origin}/auth/invite`, {
      headers: { host: "127.0.0.1:2482", accept: "text/html" },
    }),
  );
  const html = await r.text();
  const nodes = new Map<
    string,
    {
      textContent: string;
      hidden: boolean;
      disabled: boolean;
      dataset: Record<string, string>;
      children: unknown[];
      setAttribute: ReturnType<typeof vi.fn>;
      replaceChildren: () => void;
      append: (a: unknown) => void;
      addEventListener: (event: string, fn: () => Promise<void> | void) => void;
    }
  >();
  const clicks = new Map<string, () => Promise<void> | void>();
  function node(id: string) {
    if (!nodes.has(id))
      nodes.set(id, {
        textContent: "",
        hidden: false,
        disabled: false,
        dataset: {},
        children: [],
        setAttribute: vi.fn(),
        replaceChildren() {
          this.children = [];
        },
        append(a) {
          this.children.push(a);
        },
        addEventListener(event, fn) {
          clicks.set(`${id}:${event}`, fn);
        },
      });
    return nodes.get(id)!;
  }
  let ready = () => {};
  const events: string[] = [];
  const calls: Record<string, unknown>[] = [];
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    events.push("fetch");
    const body =
      init.method === "GET"
        ? { action: "status" }
        : JSON.parse(String(init.body));
    calls.push(body);
    if (failStageOnce && calls.length === 1)
      return Response.json(
        { status: "unavailable", csrf: "rotated" },
        { status: 503 },
      );
    return Response.json({
      status:
        body.action === "status"
          ? "empty"
          : body.action === "stage"
            ? "staged"
            : "complete",
      csrf: "rotated",
      ...(body.action === "confirm"
        ? { links: [{ label: "JEV", href: "https://jev.naeil.dev/" }] }
        : {}),
    });
  });
  const location = { hash: fragment, pathname: "/auth/invite", search: "" };
  runInNewContext(
    html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1],
    {
      location,
      history: {
        replaceState: () => {
          events.push("clear");
          location.hash = "";
        },
      },
      document: {
        documentElement: node("root"),
        getElementById: node,
        createElement: () => ({}),
        addEventListener: (_event: string, fn: () => void) => {
          ready = fn;
        },
      },
      fetch,
      URLSearchParams,
      console,
    },
  );
  ready();
  for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r));
  return { nodes, calls, events, clicks, location };
}
describe("executed inert fragment script", () => {
  it("clears fragment before staging, consumes no OTP and confirms only on an explicit click", async () => {
    const t = await page("#" + new URLSearchParams(proof));
    expect(t.location.hash).toBe("");
    expect(t.events).toEqual(["clear", "fetch"]);
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0]).toMatchObject({ ...proof, version: 1, action: "stage" });
    expect(t.nodes.get("confirm")?.hidden).toBe(false);
    await t.clicks.get("confirm:click")!();
    expect(t.calls.map((c) => c.action)).toEqual(["stage", "confirm"]);
    expect(t.nodes.get("links")?.children).toHaveLength(1);
  });
  it.each([
    "",
    "#id=x",
    "#" + new URLSearchParams(proof) + "&nonce=again",
    "#" + new URLSearchParams(proof) + "&type=invite",
    "#" + new URLSearchParams({ ...proof, version: "01" }),
    "#" + "x".repeat(2049),
    "#bad=%QQ",
  ])(
    "makes no stage/verify request for missing or malformed envelope %#",
    async (fragment) => {
      const t = await page(fragment);
      expect(t.calls).toHaveLength(0);
      expect(t.location.hash).toBe("");
    },
  );
});

it("recovers status before explicitly restaging the same envelope after stage503", async () => {
  const t = await page("#" + new URLSearchParams(proof), true);
  expect(t.calls).toHaveLength(1);
  expect(t.nodes.get("confirm")?.hidden).toBe(false);
  await t.clicks.get("confirm:click")!();
  expect(t.calls.map((c) => c.action)).toEqual(["stage", "status"]);
  await t.clicks.get("confirm:click")!();
  expect(t.calls.map((c) => c.action)).toEqual(["stage", "status", "stage"]);
  expect(t.calls[2]).toMatchObject({ ...proof, version: 1, csrf: "rotated" });
  await t.clicks.get("confirm:click")!();
  expect(t.calls.map((c) => c.action)).toEqual([
    "stage",
    "status",
    "stage",
    "confirm",
  ]);
});
