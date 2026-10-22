import { describe, expect, it } from "vitest";
import { createInviteHandler } from "../invite";

const origin = "https://naeil.dev";
const config = {
  siteOrigin: origin,
  supabaseUrl: "https://fictional.supabase.co",
  anonKey: "fictional-anon",
  serviceRoleKey: "fictional-service",
  transactionStore: "supabase" as const,
  encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
};
const proof = {
  id: "10000000-0000-4000-8000-000000000001",
  version: 1,
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
const userId = "20000000-0000-4000-8000-000000000002";
const sessionId = "30000000-0000-4000-8000-000000000003";
const user = {
  id: userId,
  email: "recipient@example.test",
  email_confirmed_at: "2026-10-15T01:00:00Z",
};
const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, exp: 9999999999 })).toString("base64url")}.fixture`;
const receipt = {
  inviteId: proof.id,
  version: 1,
  userId,
  services: ["jev"],
  acceptedAt: "2026-10-15T01:00:00Z",
};
type Row = {
  found: true;
  revision: number;
  fence: number;
  phase: string;
  payload: string;
  expiresAt: string;
  leaseUntil: string | null;
  owner: string | null;
};

// Synthetic RPC transport only. Real PostgreSQL locking/privileges/transitions are
// covered independently by SQL004 pgTAP and separate-connection/process tests.
function fixture() {
  let clock = Date.now();
  const rows = new Map<string, Row>();
  const calls: string[] = [];
  let fault:
    | ((
        path: string,
        data: Record<string, unknown>,
      ) => Response | Promise<Response | undefined> | undefined)
    | undefined;
  let lostCheckpoint: string | undefined;
  let dropCheckpoint: string | undefined;
  let delayedCheckpoint: string | undefined;
  let checkpointDelay = 0;
  let currentVersion = 1;
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    const data: Record<string, unknown> = init?.body
      ? JSON.parse(String(init.body))
      : {};
    calls.push(path);
    const reply = await fault?.(path, data);
    if (reply) return reply;
    if (path.includes("console_invite_tx_")) {
      expect(init?.headers).toMatchObject({
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      });
      const action = path.split("console_invite_tx_")[1];
      const key = String(data.p_handle_hash);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
      let row = rows.get(key);
      if (row && Date.parse(row.expiresAt) <= clock) {
        rows.delete(key);
        row = undefined;
      }
      if (action === "create") {
        row ??= {
          found: true,
          revision: 0,
          fence: 0,
          phase: "empty",
          payload: String(data.p_payload),
          expiresAt: new Date(clock + 600000).toISOString(),
          leaseUntil: null,
          owner: null,
        };
        rows.set(key, row);
      } else if (!row) return Response.json({ found: false });
      if (
        row!.phase === "verifying" &&
        Date.parse(row!.leaseUntil ?? "") <= clock
      ) {
        row!.phase = "uncertain";
        row!.owner = null;
        row!.leaseUntil = null;
        row!.revision++;
      }
      if (action === "claim") {
        if (
          row!.revision !== data.p_expected_revision ||
          (row!.owner && Date.parse(row!.leaseUntil!) > clock)
        )
          return Response.json({}, { status: 409 });
        row!.owner = String(data.p_owner);
        row!.fence++;
        row!.revision++;
        row!.leaseUntil = new Date(clock + 30000).toISOString();
      } else if (action === "checkpoint" || action === "release") {
        if (
          row!.revision !== data.p_expected_revision ||
          row!.owner !== data.p_owner ||
          row!.fence !== data.p_fence ||
          Date.parse(row!.leaseUntil!) <= clock
        )
          return Response.json({}, { status: 409 });
        if (action === "checkpoint") {
          if (dropCheckpoint === data.p_phase) {
            dropCheckpoint = undefined;
            throw new TypeError("fictional lost write");
          }
          row!.phase = String(data.p_phase);
          row!.payload = String(data.p_payload);
          row!.revision++;
          row!.leaseUntil = new Date(clock + 30000).toISOString();
          if (lostCheckpoint === data.p_phase) {
            lostCheckpoint = undefined;
            throw new TypeError("fictional lost checkpoint response");
          }
        } else {
          row!.owner = null;
          row!.leaseUntil = null;
          row!.revision++;
        }
      }
      const dto = {
        found: row!.found,
        revision: row!.revision,
        fence: row!.fence,
        phase: row!.phase,
        payload: row!.payload,
        expiresAt: row!.expiresAt,
        leaseUntil: row!.leaseUntil,
      };
      if (action === "checkpoint" && delayedCheckpoint === data.p_phase) {
        delayedCheckpoint = undefined;
        clock += checkpointDelay;
      }
      return Response.json(dto);
    }
    if (path.endsWith("preflight") && data.p_version !== currentVersion)
      return Response.json(
        {
          code: "PT409",
          message: "invitation proof conflict",
          details: null,
          hint: null,
        },
        { status: 409 },
      );
    if (path.endsWith("preflight"))
      return Response.json({
        userId,
        email: user.email,
        verificationType: "invite",
      });
    if (path.endsWith("/verify"))
      return Response.json({ access_token: token, user });
    if (path.endsWith("/user")) return Response.json(user);
    if (path.endsWith("record_verification"))
      return Response.json({
        verified: true,
        expiresAt: "2099-01-01T00:00:00Z",
      });
    if (path.endsWith("accept_console_invite"))
      return Response.json({ ...receipt, version: currentVersion });
    throw new Error("Unexpected fixture endpoint");
  };
  let cookie = "",
    csrf = "";
  const handler = (overrides = {}) =>
    createInviteHandler({
      readConfig: () => ({ ...config, ...overrides }),
      fetch: fetcher,
      now: () => clock,
    });
  async function send(
    h: ReturnType<typeof handler>,
    action?: string,
    extra = {},
    session?: { cookie: string; csrf: string },
  ) {
    const sentCookie = session?.cookie ?? cookie;
    const sentCsrf = session?.csrf ?? csrf;
    const req = new Request(`${origin}/auth/invite`, {
      method: action ? "POST" : "GET",
      headers: {
        host: "naeil.dev",
        accept: "application/json",
        ...(sentCookie ? { cookie: sentCookie } : {}),
        ...(action ? { origin, "content-type": "application/json" } : {}),
      },
      ...(action
        ? { body: JSON.stringify({ action, csrf: sentCsrf, ...extra }) }
        : {}),
    });
    const r = action ? await h.POST(req) : await h.GET(req);
    const body = await r.json();
    if (!session) {
      cookie = r.headers.get("set-cookie")?.split(";")[0] || cookie;
      csrf = body.csrf || csrf;
    }
    return { r, body };
  }
  return {
    handler,
    send,
    rows,
    calls,
    newBrowser: () => {
      cookie = "";
      csrf = "";
    },
    advance: (ms: number) => {
      clock += ms;
    },
    fault: (fn: typeof fault) => {
      fault = fn;
    },
    lose: (phase: string) => {
      lostCheckpoint = phase;
    },
    drop: (phase: string) => {
      dropCheckpoint = phase;
    },
    delay: (phase: string, ms: number) => {
      delayedCheckpoint = phase;
      checkpointDelay = ms;
    },
    resend: () => {
      currentVersion++;
      return {
        ...proof,
        version: currentVersion,
        nonce: "r".repeat(48),
        token_hash: "b".repeat(64),
      };
    },
    get cookie() {
      return cookie;
    },
    get csrf() {
      return csrf;
    },
  };
}

describe("durable invitation recipient route", () => {
  it("stages and confirms across independent handlers without plaintext stored secrets", async () => {
    const f = fixture();
    expect((await f.send(f.handler())).body.status).toBe("empty");
    const initialCsrf = f.csrf;
    expect((await f.send(f.handler(), "stage", proof)).body.status).toBe(
      "staged",
    );
    expect((await f.send(f.handler())).body.status).toBe("staged");
    expect(f.calls.filter((p) => p.includes("/auth/v1/"))).toHaveLength(0);
    const persisted = JSON.stringify([...f.rows]);
    for (const secret of [
      proof.nonce,
      proof.token_hash,
      initialCsrf,
      f.csrf,
      f.cookie.split("=")[1],
    ])
      expect(persisted).not.toContain(secret);
    expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
    expect((await f.send(f.handler())).body.links).toEqual([
      { label: "JEV", href: "https://jev.naeil.dev/" },
    ]);
    expect(JSON.stringify([...f.rows])).not.toContain(token);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  });
  it.each(["/user", "record_verification", "accept_console_invite"])(
    "retains original identity across a new handler after %s503",
    async (broken) => {
      const f = fixture();
      await f.send(f.handler());
      await f.send(f.handler(), "stage", proof);
      let failed = false;
      f.fault((path) => {
        if (path.endsWith(broken) && !failed) {
          failed = true;
          return Response.json({}, { status: 503 });
        }
      });
      expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
      expect((await f.send(f.handler())).body.status).toBe("retry");
      expect((await f.send(f.handler(), "confirm")).body.status).toBe(
        "complete",
      );
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
      expect(
        f.calls.filter((p) => p.endsWith("record_verification")),
      ).toHaveLength(broken === "record_verification" ? 2 : 1);
    },
  );
  it("rejects a concurrent claim in a second handler without another OTP call", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const started = new Promise<void>((r) => {
      entered = r;
    });
    f.fault(async (p) => {
      if (p.endsWith("/verify")) {
        entered();
        await gate;
      }
      return undefined;
    });
    const first = f.send(f.handler(), "confirm");
    await started;
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
    release();
    expect((await first).body.status).toBe("complete");
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  });
  it.each(["candidate", "verified", "recorded", "complete"])(
    "recovers committed %s checkpoint response loss through DB truth",
    async (phase) => {
      const f = fixture();
      await f.send(f.handler());
      await f.send(f.handler(), "stage", proof);
      f.lose(phase);
      expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
      f.advance(30001);
      await f.send(f.handler());
      expect((await f.send(f.handler(), "confirm")).body.status).toBe(
        "complete",
      );
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    },
  );
  it("makes an uncommitted candidate checkpoint terminal uncertainty after lease expiry", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    f.drop("candidate");
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
    f.advance(30001);
    expect((await f.send(f.handler())).body.status).toBe("uncertain");
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(409);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    expect(
      f.calls.filter((p) => p.endsWith("accept_console_invite")),
    ).toHaveLength(0);
  });
  it("never silently reverifies after a lost external verify response", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    f.fault((p) => {
      if (p.endsWith("/verify"))
        throw new TypeError("fictional lost verify response");
      return undefined;
    });
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
    expect((await f.send(f.handler())).body.status).toBe("uncertain");
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(409);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  });
  it.each(["staged", "uncertain", "invalid"])(
    "stages a fresh resend in the same browser after %s without reopening its old row",
    async (previous) => {
      const f = fixture();
      await f.send(f.handler());
      await f.send(f.handler(), "stage", proof);
      if (previous === "uncertain") {
        f.fault((path) => {
          if (path.endsWith("/verify"))
            throw new TypeError("fictional consumed OTP response lost");
          return undefined;
        });
        expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
      } else if (previous === "invalid") {
        f.fault((path) =>
          path.endsWith("preflight")
            ? Response.json(
                {
                  code: "PT409",
                  message: "invitation proof conflict",
                  details: null,
                  hint: null,
                },
                { status: 409 },
              )
            : undefined,
        );
        expect((await f.send(f.handler(), "confirm")).r.status).toBe(409);
      }
      f.fault(undefined);
      const old = { cookie: f.cookie, csrf: f.csrf };
      const [oldKey, oldRow] = [...f.rows][0];
      const snapshot = { ...oldRow };
      const next = f.resend();
      const staged = await f.send(f.handler(), "stage", next);
      expect(staged.r.status).toBe(200);
      expect(staged.body.status).toBe("staged");
      expect(f.cookie).not.toBe(old.cookie);
      expect(f.csrf).not.toBe(old.csrf);
      expect(f.rows.size).toBe(2);
      expect(f.rows.get(oldKey)).toEqual(snapshot);

      // A stale tab uses the current browser cookie but its original CSRF.
      const newRow = { ...[...f.rows.values()][1] };
      expect(
        (await f.send(f.handler(), "confirm", { csrf: old.csrf })).r.status,
      ).toBe(403);
      expect(
        (
          await f.send(f.handler(), "stage", {
            ...next,
            version: 3,
            csrf: old.csrf,
          })
        ).r.status,
      ).toBe(403);
      expect((await f.send(f.handler(), "stage", proof)).r.status).toBe(409);
      expect(
        (
          await f.send(f.handler(), "stage", {
            ...next,
            nonce: "s".repeat(48),
          })
        ).r.status,
      ).toBe(409);
      expect([...f.rows.values()][1]).toEqual(newRow);

      // Even an explicit old-cookie replay addresses only the old row and the
      // current invitation version rejects its old proof before another OTP.
      const beforeOldReplay = f.calls.filter((p) => p.endsWith("/verify")).length;
      expect((await f.send(f.handler(), "confirm", {}, old)).r.status).toBe(409);
      expect(
        f.calls.filter((p) => p.endsWith("/verify")),
      ).toHaveLength(beforeOldReplay);
      expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(
        previous === "uncertain" ? 2 : 1,
      );
      expect(f.calls.filter((p) => p.endsWith("accept_console_invite"))).toHaveLength(1);
    },
  );
  it.each(["committed", "uncommitted"])(
    "recovers a new resend handle after an %s staged checkpoint response loss",
    async (outcome) => {
      const f = fixture();
      await f.send(f.handler());
      await f.send(f.handler(), "stage", proof);
      const oldCookie = f.cookie;
      const oldRow = { ...[...f.rows.values()][0] };
      const next = f.resend();
      if (outcome === "committed") f.lose("staged");
      else f.drop("staged");
      expect((await f.send(f.handler(), "stage", next)).r.status).toBe(503);
      expect(f.cookie).not.toBe(oldCookie);
      expect([...f.rows.values()][0]).toEqual(oldRow);
      f.advance(30001);
      expect((await f.send(f.handler())).body.status).toBe(
        outcome === "committed" ? "staged" : "empty",
      );
      if (outcome === "uncommitted")
        expect((await f.send(f.handler(), "stage", next)).body.status).toBe("staged");
      expect((await f.send(f.handler(), "confirm")).body.status).toBe("complete");
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    },
  );
  it("does not verify when a committed verifying checkpoint responds after absolute expiry", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    f.delay("verifying", 600000);
    expect((await f.send(f.handler(), "confirm")).r.status).toBeGreaterThanOrEqual(400);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
    expect(f.calls.filter((p) => p.endsWith("accept_console_invite"))).toHaveLength(0);
  });
  it("fails closed on ciphertext tampering, key mismatch, dependency failure and absolute expiry", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    expect(
      (
        await f.send(
          f.handler({
            encryptionKey: Buffer.alloc(32, 8).toString("base64url"),
          }),
        )
      ).r.status,
    ).toBe(503);
    const row = [...f.rows.values()][0],
      original = row.payload;
    row.payload = original.slice(0, -3) + "xxx";
    expect((await f.send(f.handler())).r.status).toBe(503);
    row.payload = original;
    f.fault((p) =>
      p.includes("console_invite_tx_")
        ? Response.json({}, { status: 503 })
        : undefined,
    );
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(503);
    f.fault(undefined);
    f.advance(600000);
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(403);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
  });
  it("binds authenticated encryption to its own cookie hash and rejects cross-handle swaps", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    const first = [...f.rows.values()][0];
    f.newBrowser();
    await f.send(f.handler());
    const second = [...f.rows.values()][1];
    second.payload = first.payload;
    expect((await f.send(f.handler())).r.status).toBe(503);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
  });
  it("fences a verifier paused beyond its lease after another handler observes uncertainty", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const started = new Promise<void>((r) => {
      entered = r;
    });
    f.fault(async (p) => {
      if (p.endsWith("/verify")) {
        entered();
        await gate;
      }
      return undefined;
    });
    const first = f.send(f.handler(), "confirm");
    await started;
    f.advance(30001);
    expect((await f.send(f.handler())).body.status).toBe("uncertain");
    release();
    expect((await first).r.status).toBe(503);
    expect((await f.send(f.handler())).body.status).toBe("uncertain");
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    expect(f.calls.filter((p) => p.endsWith("/user"))).toHaveLength(0);
  });
  it.each([true, false])(
    "distinguishes typed proof denial from generic409 (%s)",
    async (typed) => {
      const f = fixture();
      await f.send(f.handler());
      await f.send(f.handler(), "stage", proof);
      f.fault((p) =>
        p.endsWith("preflight")
          ? Response.json(
              typed
                ? {
                    code: "PT409",
                    message: "invitation proof conflict",
                    details: null,
                    hint: null,
                  }
                : { message: "private gateway failure" },
              { status: 409 },
            )
          : undefined,
      );
      expect((await f.send(f.handler(), "confirm")).r.status).toBe(
        typed ? 409 : 503,
      );
      expect((await f.send(f.handler())).body.status).toBe(
        typed ? "invalid" : "staged",
      );
    },
  );
});
