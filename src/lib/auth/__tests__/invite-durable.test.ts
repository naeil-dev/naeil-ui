import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fixture, proof, token } from "./invite-fixture";

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
      const beforeOldReplay = f.calls.filter((p) =>
        p.endsWith("/verify"),
      ).length;
      expect((await f.send(f.handler(), "confirm", {}, old)).r.status).toBe(
        409,
      );
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(
        beforeOldReplay,
      );
      expect((await f.send(f.handler(), "confirm")).body.status).toBe(
        "complete",
      );
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(
        previous === "uncertain" ? 2 : 1,
      );
      expect(
        f.calls.filter((p) => p.endsWith("accept_console_invite")),
      ).toHaveLength(1);
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
        expect((await f.send(f.handler(), "stage", next)).body.status).toBe(
          "staged",
        );
      expect((await f.send(f.handler(), "confirm")).body.status).toBe(
        "complete",
      );
      expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
    },
  );
  it("does not verify when a committed verifying checkpoint responds after absolute expiry", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    f.delay("verifying", 600000);
    expect(
      (await f.send(f.handler(), "confirm")).r.status,
    ).toBeGreaterThanOrEqual(400);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
    expect(
      f.calls.filter((p) => p.endsWith("accept_console_invite")),
    ).toHaveLength(0);
  });
  it("fails closed on ciphertext tampering, key mismatch, dependency failure and absolute expiry", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    const wrong = f.handler({
      encryptionKey: Buffer.alloc(32, 8).toString("base64url"),
    });
    await f.send(wrong, "bootstrap");
    expect((await f.send(wrong)).r.status).toBe(503);
    await f.send(f.handler(), "bootstrap");
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
    expect((await f.send(f.handler(), "confirm")).r.status).toBe(409);
    expect(f.calls.filter((p) => p.endsWith("/verify"))).toHaveLength(0);
  });
  it("binds authenticated encryption to its own cookie hash and rejects cross-handle swaps", async () => {
    const f = fixture();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", proof);
    const first = [...f.rows.values()][0];
    f.newBrowser();
    await f.send(f.handler());
    await f.send(f.handler(), "stage", f.resend());
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

// Enabled-path regressions explicitly opt in; production defaults OFF.
beforeEach(() => vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true"));
afterEach(() => vi.unstubAllEnvs());
