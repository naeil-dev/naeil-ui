import { createHash } from "node:crypto";
import { expect } from "vitest";
import { createInviteHandler } from "../invite";

export const origin = "https://naeil.dev";
export const config = {
  siteOrigin: origin,
  supabaseUrl: "https://fictional.supabase.co",
  anonKey: "fictional-anon",
  serviceRoleKey: "fictional-service",
  transactionStore: "supabase" as const,
  encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
};
export const proof = {
  id: "10000000-0000-4000-8000-000000000001",
  version: 1,
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
export const userId = "20000000-0000-4000-8000-000000000002";
export const sessionId = "30000000-0000-4000-8000-000000000003";
export const user = {
  id: userId,
  email: "recipient@example.test",
  email_confirmed_at: "2026-10-15T01:00:00Z",
};
export const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, exp: 9999999999 })).toString("base64url")}.fixture`;
export const receipt = {
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
  proofKey?: string;
};

export function applyCookies(cookie: string, response: Response) {
  const pairs=cookie.split(/;\s*/).filter(Boolean).map(c=>{const at=c.indexOf("=");return [c.slice(0,at),c.slice(at+1)] as const;});
  const jar=new Map(pairs);
  for(const c of response.headers.getSetCookie()) {
    const [pair]=c.split(";"), at=pair.indexOf("=");
    jar.set(pair.slice(0,at),pair.slice(at+1));
  }
  return [...jar].map(([k,v])=>`${k}=${v}`).join("; ");
}

// Synthetic RPC transport only. Real PostgreSQL locking/privileges/transitions are
// covered independently by SQL004 pgTAP and separate-connection/process tests.
export function fixture() {
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
      expect(new Headers(init?.headers).get("apikey")).toBe(
        config.serviceRoleKey,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        `Bearer ${config.serviceRoleKey}`,
      );
      const action = path.split("console_invite_tx_")[1];
      let key = String(data.p_handle_hash);
      const proofKey=JSON.stringify([data.p_invite_id,data.p_version,data.p_nonce_hash,data.p_token_hash_hash]);
      if (action === "admit") {
        for (const [k, r] of rows)
          if (Date.parse(r.expiresAt) <= clock) rows.delete(k);
        const existing = [...rows.entries()].find(
          ([, r]) => r.proofKey === proofKey,
        );
        if (existing) key = existing[0];
      }
      expect(key).toMatch(/^[a-f0-9]{64}$/);
      let row = rows.get(key);
      if (row && Date.parse(row.expiresAt) <= clock) {
        rows.delete(key);
        row = undefined;
      }
      if (action === "create" || action === "admit") {
        row ??= {
          found: true,
          revision: 0,
          fence: 0,
          phase: "empty",
          payload: String(data.p_payload),
          expiresAt: new Date(clock + 600000).toISOString(),
          leaseUntil: null,
          owner: null,
          ...(action === "admit" ? {proofKey} : {}),
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
          const transitions:Record<string,string[]>={empty:["staged"],staged:["staged","verifying","invalid"],verifying:["candidate","uncertain","invalid"],candidate:["verified","invalid"],verified:["recorded","invalid"],recorded:["complete","invalid"]};
          if (!transitions[row!.phase]?.includes(String(data.p_phase))) return Response.json({}, {status:409});
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
        ...(action === "admit" ? { handleHash: key } : {}),
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
      if(action==="admit" && lostCheckpoint==="admit"){lostCheckpoint=undefined;throw new TypeError("fictional admission response loss");}
      return Response.json(dto);
    }
    if (
      path.endsWith("preflight") &&
      (data.p_version !== currentVersion ||
        data.p_nonce_hash !==
          createHash("sha256")
            .update(currentVersion === 1 ? proof.nonce : "r".repeat(48))
            .digest("hex"))
    )
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
      return Response.json({
        access_token: token,
        refresh_token: "fictional-refresh-token",
        user,
      });
    if (path.endsWith("/user")) {
      const authorization =
        new Headers(init?.headers).get("authorization") || "";
      const claims = JSON.parse(
        Buffer.from(authorization.split(".")[1], "base64url").toString(),
      );
      return Response.json(
        claims.sub === userId
          ? user
          : { ...user, id: claims.sub, email: "other@example.test" },
      );
    }
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
    if (action === "bootstrap") action = undefined;
    else if (!action && sentCookie) action = "status";
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
      cookie=applyCookies(cookie,r);
      csrf = body.csrf || csrf;
    }
    return { r, body };
  }
  return {
    handler,
    fetch: fetcher,
    send,
    rows,
    calls,
    auth: (subject: string | null) => {
      cookie = cookie
        .split("; ")
        .filter((c) => !c.startsWith("sb-"))
        .join("; ");
      if (subject) {
        const [head,,signature]=token.split(".");
        const claims={sub:subject,session_id:sessionId,exp:9999999999};
        const access_token=[head,Buffer.from(JSON.stringify(claims)).toString("base64url"),signature].join(".");
        const value =
          "base64-" +
          Buffer.from(
            JSON.stringify({
              access_token,
              refresh_token: "fictional-refresh-token",
              expires_at: 9999999999,
              token_type: "bearer",
              user: { ...user, id: subject },
            }),
          ).toString("base64url");
        cookie += `; sb-fictional-auth-token=${value}`;
      }
    },
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
