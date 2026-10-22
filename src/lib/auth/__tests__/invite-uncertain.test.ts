import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { invitePage } from "../invite-page";

function render(
  locale: "ko" | "ja" | "en",
  initial = "uncertain",
  replies: { status: number; body: unknown; lost?: boolean }[] = [],
  fragment = "",
) {
  const html = invitePage("n".repeat(43), locale, {
    status: initial,
    csrf: "c".repeat(43),
  });
  const nodes = new Map<
    string,
    {
      textContent: string;
      hidden: boolean;
      disabled: boolean;
      dataset: Record<string, string>;
      setAttribute: () => void;
      replaceChildren: () => void;
      append: () => void;
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
        setAttribute() {},
        replaceChildren() {},
        append() {},
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
        const next = replies.shift()!;
        if (next.lost) throw new TypeError("Whole response including cookie lost");
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
    expect(f.calls).toEqual(["POST", "GET"]);
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
      expect(f.calls).toEqual(["POST", "GET"]);
      expect(f.nodes.get("confirm")!.hidden).toBe(false);
      await f.clicks.get("confirm")!();
      expect(f.payloads.map((payload) => payload.action)).toEqual(["stage", "stage"]);
      expect(f.payloads[1]).toMatchObject({ ...fresh, version: 2, csrf: "c".repeat(43) });
      await f.clicks.get("confirm")!();
      expect(f.payloads.map((payload) => payload.action)).toEqual(["stage", "stage", "confirm"]);
    },
  );
});
