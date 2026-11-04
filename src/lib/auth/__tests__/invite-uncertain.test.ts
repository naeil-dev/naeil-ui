import { describe, expect, it, afterEach, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { invitePage } from "../invite-page";
import en from "../../../../messages/en.json";
import ko from "../../../../messages/ko.json";
import ja from "../../../../messages/ja.json";
import { localeHref, localePath } from "@/naeil-locale";

const catalogs = { en, ko, ja };
afterEach(() => vi.unstubAllEnvs());

function render(
  locale: "ko" | "ja" | "en",
  initial = "uncertain",
  replies: { status: number; body: unknown; lost?: boolean }[] = [],
  fragment = "",
  extraInitial: Record<string, unknown> = {},
) {
  const html = invitePage("n".repeat(43), locale, {
    status: initial,
    csrf: "c".repeat(43),
    ...extraInitial,
  });
  const nodes = new Map<
    string,
    {
      textContent: string;
      hidden: boolean;
      disabled: boolean;
      dataset: Record<string, string>;
      children: {href?:string}[];
      setAttribute: () => void;
      replaceChildren: () => void;
      append: (value:{href?:string}) => void;
      addEventListener: (event: string, fn: () => Promise<void>) => void;
    }
  >();
  const clicks = new Map<string, () => Promise<void>>();
  const node = (id: string) => {
    if (!nodes.has(id))
      nodes.set(id, {
        textContent: "",
        hidden: false,
        disabled: false,
        dataset: {},
        children: [],
        setAttribute() {},
        replaceChildren() {this.children=[];},
        append(value) {this.children.push(value);},
        addEventListener: (_event, fn) => {
          clicks.set(id, fn);
        },
      });
    return nodes.get(id)!;
  };
  let ready = () => {};
  const calls: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  runInNewContext(
    html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1],
    {
      location: { hash: fragment, pathname: "/auth/invite", search: "" },
      history: { replaceState() {} },
      document: {
        documentElement: node("root"),
        getElementById: node,
        createElement: () => ({}),
        addEventListener: (_event: string, fn: () => void) => {
          ready = fn;
        },
      },
      fetch: async (_url: string, init: RequestInit) => {
        calls.push(init.method || "GET");
        if (init.body) payloads.push(JSON.parse(String(init.body)));
        if (init.method === "GET")
          return Response.json({ status: "empty", csrf: "c".repeat(43) });
        const next = replies.shift()!;
        if (next.lost)
          throw new TypeError("Whole response including cookie lost");
        return Response.json(next.body, { status: next.status });
      },
      URLSearchParams,
    },
  );
  ready();
  return {
    nodes,
    calls,
    payloads,
    clicks,
    settle: async () => {
      for (let i = 0; i < 8; i++)
        await new Promise((resolve) => setImmediate(resolve));
    },
  };
}
describe("honest unrecoverable verification copy", () => {
  it.each(["ko", "ja", "en"] as const)(
    "keeps a paused %s page inert even with a fragment or synthetic click",
    async (locale) => {
      const t = render(
        locale,
        "paused",
        [],
        "#" +
          new URLSearchParams({
            id: "10000000-0000-4000-8000-000000000001",
            version: "1",
            nonce: "n".repeat(48),
            token_hash: "a".repeat(64),
          }),
      );
      await t.settle();
      expect(t.nodes.get("confirm")?.hidden).toBe(true);
      expect(t.nodes.get("status")?.textContent).not.toBe("");
      await t.clicks.get("confirm")!();
      await t.clicks.get("language")!();
      expect(t.calls).toEqual([]);
    },
  );
  it.each([
    ["ko", "이메일 확인 결과를 복구할 수 없습니다", "재전송"],
    ["ja", "メール確認の結果を復元できません", "再送"],
    ["en", "verification result cannot be recovered", "resend"],
  ] as const)(
    "explains uncertain %s without retry or known rejection",
    (locale, result, resend) => {
      const f = render(locale);
      expect(f.nodes.get("status")!.textContent).toContain(result);
      expect(f.nodes.get("status")!.textContent).toContain(resend);
      expect(f.nodes.get("confirm")!.hidden).toBe(true);
      expect(f.calls).toHaveLength(0);
    },
  );
  it("accepts explicit status recovery into uncertain after an ambiguous confirm", async () => {
    const f = render("en", "staged", [
      { status: 503, body: { status: "unavailable" } },
      { status: 200, body: { status: "uncertain", csrf: "c".repeat(43) } },
    ]);
    await f.clicks.get("confirm")!();
    await f.clicks.get("confirm")!();
    expect(f.calls).toEqual(["POST", "GET", "POST"]);
    expect(f.nodes.get("status")!.textContent).toContain(
      "verification result cannot be recovered",
    );
    expect(f.nodes.get("confirm")!.hidden).toBe(true);
  });
  it("preserves uncertain on a typed local409 rather than showing known invalid", async () => {
    const f = render("en", "staged", [
      { status: 409, body: { status: "uncertain", csrf: "c".repeat(43) } },
    ]);
    await f.clicks.get("confirm")!();
    expect(f.nodes.get("status")!.textContent).toContain(
      "verification result cannot be recovered",
    );
    expect(f.nodes.get("confirm")!.hidden).toBe(true);
  });
  it.each(
    ["uncertain", "invalid", "staged"].flatMap((previous) =>
      [false, true].map((lost) => ({ previous, lost })),
    ),
  )(
    "retains a fresh envelope through old $previous status after stage loss (whole response $lost)",
    async ({ previous, lost }) => {
      const fresh = {
        id: "10000000-0000-4000-8000-000000000001",
        version: "2",
        nonce: "r".repeat(48),
        token_hash: "b".repeat(64),
      };
      const f = render(
        "en",
        previous,
        [
          { status: 503, body: { status: "unavailable" }, lost },
          {
            status: 200,
            body: { status: previous, csrf: "c".repeat(43) },
          },
          { status: 200, body: { status: "staged", csrf: "d".repeat(43) } },
          { status: 200, body: { status: "complete", csrf: "e".repeat(43) } },
        ],
        "#" + new URLSearchParams(fresh),
      );
      await f.settle();
      expect(f.payloads.map((payload) => payload.action)).toEqual(["stage"]);
      await f.clicks.get("confirm")!();
      expect(f.calls).toEqual(["POST", "GET", "POST"]);
      expect(f.nodes.get("confirm")!.hidden).toBe(false);
      await f.clicks.get("confirm")!();
      expect(f.payloads.map((payload) => payload.action)).toEqual([
        "stage",
        "status",
        "stage",
      ]);
      expect(f.payloads[2]).toMatchObject({
        ...fresh,
        version: 2,
        csrf: "c".repeat(43),
      });
      await f.clicks.get("confirm")!();
      expect(f.payloads.map((payload) => payload.action)).toEqual([
        "stage",
        "status",
        "stage",
        "confirm",
      ]);
    },
  );
});

it("offers normal login when registered sign-in guidance has no receipt links",()=>{
  const f=render("en","signin");
  expect(f.nodes.get("links")!.children).toEqual([{href:"/login",textContent:"Sign in"}]);
  expect(f.nodes.get("confirm")!.hidden).toBe(true);
});


it.each(["en", "ko", "ja"] as const)("renders catalog-backed delivery/switch/signin actions in %s", (locale) => {
  const copy = catalogs[locale].site.invitation;
  for (const state of ["delivery", "switch", "signin"] as const) {
    const t = render(locale, state);
    expect(t.nodes.get("status")!.textContent).toBe(copy[state]);
    expect(t.nodes.get("title")!.textContent).toBe(state === "signin" ? copy.login : state === "delivery" ? copy.complete : copy.title);
    expect(t.nodes.get("confirm")!.hidden).toBe(state === "signin");
    if (state !== "signin") expect(t.nodes.get("confirm")!.textContent).toBe(state === "delivery" ? copy.finish : copy.switchButton);
    else expect(t.nodes.get("links")!.children).toEqual([{ href: localePath("main", "/login", locale), textContent: copy.login }]);
  }
});

it.each(["en", "ko", "ja"] as const)("keeps allowed receipt links and localized sign-in with the sender gate in %s", (locale) => {
  const links = [
    { label: "JEV", href: "https://jev.naeil.dev/" },
    { label: "AB Estimate", href: "https://abestimate.naeil.dev/" },
    { label: "Untrusted", href: "https://evil.example/" },
  ];
  for (const enabled of [false, true]) {
    vi.stubEnv("NAEIL_LOCALE_SEND_ENABLED", enabled ? "1" : "0");
    const destinations = ["jev", "estimate"].map((service, i) => enabled ? localeHref(service as "jev" | "estimate", "/", locale) : links[i].href);
    for (const state of ["complete", "signin"]) {
      const t = render(locale, state, [], "", { links });
      expect(t.nodes.get("links")!.children.map(link => link.href)).toEqual(destinations.map(href => state === "signin" ? localePath("main", "/login", locale) + "?next=" + encodeURIComponent(href) : href));
    }
  }
});

it("preserves lost-delivery recovery and account-switch consent through language changes", async () => {
  const other = "40000000-0000-4000-8000-000000000004";
  const t = render("en", "delivery", [
    { status: 503, body: {}, lost: true },
    { status: 409, body: { status: "switch", csrf: "d".repeat(43), switchFrom: other } },
    { status: 200, body: { status: "complete", csrf: "d".repeat(43) } },
  ]);
  await t.clicks.get("confirm")!();
  await t.clicks.get("language")!();
  expect(t.nodes.get("status")!.textContent).toBe(ko.site.invitation.recover);
  await t.clicks.get("confirm")!();
  expect(t.calls).toEqual(["POST", "GET", "POST"]);
  expect(t.nodes.get("status")!.textContent).toBe(ko.site.invitation.switch);
  await t.clicks.get("language")!();
  expect(t.nodes.get("confirm")!.textContent).toBe(ja.site.invitation.switchButton);
  await t.clicks.get("confirm")!();
  expect(t.payloads).toEqual([
    { action: "confirm", csrf: "c".repeat(43) },
    { action: "status", csrf: "c".repeat(43) },
    { action: "confirm", csrf: "d".repeat(43), switchFrom: other },
  ]);
});
