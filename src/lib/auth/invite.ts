import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readInviteConfig, type InviteConfig } from "./invite-config";
import { invitePage } from "./invite-page";
import {
  InviteStore,
  inviteProofIdentity,
  type InvitePhase,
} from "./invite-store";

const TTL = 10 * 60 * 1000;
const MAX_TRANSACTIONS = 256;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_PROOF = /^[A-Za-z0-9_-]+$/;
const LINKS = {
  jev: { label: "JEV", href: "https://jev.naeil.dev/" },
  abestimate: { label: "AB Estimate", href: "https://abestimate.naeil.dev/" },
} as const;
type Link = { label: string; href: string };
type Envelope = {
  id: string;
  version: number;
  nonce: string;
  token_hash: string;
};
type Verified = { accessToken: string; userId: string; sessionId: string };
export type Transaction = {
  expires: number;
  csrf: string;
  proof?: Envelope;
  proofIdentity?: { id: string; version: number; fingerprint: string };
  verified?: Verified;
  candidate?: Verified & { email: string };
  receiptRecorded?: boolean;
  links?: Link[];
  invalid?: boolean;
  uncertain?: boolean;
  pending?: Promise<void>;
};
type Dependencies = {
  readConfig?: () => InviteConfig | null;
  fetch?: typeof fetch;
  now?: () => number;
};
class Failure extends Error {
  constructor(readonly status: number) {
    super("Invitation unavailable");
  }
}
const fresh = () => randomBytes(32).toString("base64url");
const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const email = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) &&
  v === v.trim().toLowerCase();
function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return Object.keys(value).sort().join(",") === expected.sort().join(",");
}
function envelope(v: Record<string, unknown>): Envelope | null {
  if (
    !uuid(v.id) ||
    !Number.isSafeInteger(v.version) ||
    Number(v.version) < 1 ||
    typeof v.nonce !== "string" ||
    v.nonce.length < 32 ||
    v.nonce.length > 256 ||
    !SAFE_PROOF.test(v.nonce) ||
    typeof v.token_hash !== "string" ||
    v.token_hash.length < 32 ||
    v.token_hash.length > 512 ||
    !SAFE_PROOF.test(v.token_hash)
  )
    return null;
  return {
    id: v.id.toLowerCase(),
    version: Number(v.version),
    nonce: v.nonce,
    token_hash: v.token_hash,
  };
}
function equal(a: unknown, b: string) {
  return (
    typeof a === "string" &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
async function boundedText(
  stream: ReadableStream<Uint8Array> | null,
  max: number,
): Promise<string> {
  if (!stream) throw new Failure(400);
  const reader = stream.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Failure(400)), 8000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new Failure(400);
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } catch (e) {
    void reader.cancel().catch(() => {});
    throw e;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

async function body(request: Request) {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new Failure(400);
  let text: string;
  let value: unknown;
  try {
    text = await boundedText(request.body, 4096);
    value = JSON.parse(text);
  } catch {
    throw new Failure(400);
  }
  if (!object(value)) throw new Failure(400);
  // JSON.parse normally discards duplicates. Detect them before trusting the flat DTO.
  const keys: string[] = [];
  const tokens = /"(?:\\.|[^"\\])*"/g;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(text))) {
    if (/^\s*:/.test(text.slice(tokens.lastIndex)))
      keys.push(JSON.parse(match[0]));
  }
  if (new Set(keys).size !== keys.length) throw new Failure(400);
  return value;
}
// Only these fixed endpoint denials establish a closed proof/session. Gateway,
// service credentials, ACL/schema errors and unfamiliar envelopes remain retryable.
function terminalDenial(path: string, status: number, text: string): boolean {
  const value: unknown = JSON.parse(text);
  if (!object(value)) return false;
  // These provider envelopes are flat. Reject duplicate/escaped duplicate keys
  // rather than accepting whichever conflicting value JSON.parse kept last.
  const keys = [...text.matchAll(/("(?:\\.|[^"\\])*")\s*:/g)].map((m) =>
    JSON.parse(m[1]),
  );
  if (keys.length !== new Set(keys).size) return false;
  if (path === "/auth/v1/verify" || path === "/auth/v1/user") {
    return (
      exactKeys(value, ["code", "error_code", "msg"]) &&
      value.code === status &&
      status === 403 &&
      typeof value.error_code === "string" &&
      typeof value.msg === "string" &&
      value.msg.length > 0 &&
      (path === "/auth/v1/verify"
        ? value.error_code === "otp_expired"
        : ["session_not_found", "user_not_found"].includes(value.error_code))
    );
  }
  if (
    !exactKeys(value, ["code", "message", "details", "hint"]) ||
    value.details !== null ||
    value.hint !== null ||
    typeof value.message !== "string" ||
    value.code !== `PT${status}`
  )
    return false;
  const proof = [
    "invitation not found",
    "invitation proof conflict",
    "prepared proof conflict",
  ];
  const denials: Record<string, Record<number, string[]>> = {
    "/rest/v1/rpc/console_invite_preflight": {
      404: [proof[0]],
      409: proof.slice(1),
    },
    "/rest/v1/rpc/console_invite_record_verification": {
      404: [proof[0]],
      409: [
        ...proof.slice(1),
        "verified subject conflict",
        "verified Auth session required",
        "verification receipt conflict",
      ],
    },
    "/rest/v1/rpc/accept_console_invite": {
      401: ["authenticated subject required", "authenticated session required"],
      404: [proof[0]],
      409: [
        "recipient proof conflict",
        "invitation expired or closed",
        "member conflict",
      ],
      422: [
        "bounded invitation proof required",
        "services must be active and verified",
      ],
    },
  };
  return denials[path]?.[status]?.includes(value.message) === true;
}

export function inviteResponseHeaders(nonce?: string) {
  return new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie, Accept, Accept-Language",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": `default-src 'none'; script-src ${nonce ? `'nonce-${nonce}'` : "'none'"}; style-src ${nonce ? `'nonce-${nonce}'` : "'none'"}; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`,
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
}
export function inviteMethodNotAllowed(): Response {
  const responseHeaders = inviteResponseHeaders();
  responseHeaders.set("Allow", "GET, HEAD, POST");
  return Response.json(
    { status: "invalid" },
    { status: 405, headers: responseHeaders },
  );
}

function state(t: Transaction) {
  return t.links
    ? "complete"
    : t.uncertain
      ? "uncertain"
      : t.invalid
        ? "invalid"
        : t.verified || t.candidate
          ? "retry"
          : t.proof
            ? "staged"
            : "empty";
}
function dto(t: Transaction) {
  return {
    status: state(t),
    csrf: t.csrf,
    ...(t.links ? { links: t.links } : {}),
  };
}
function cookieName(config: InviteConfig) {
  return config.siteOrigin.startsWith("https:")
    ? "__Host-naeil_invite"
    : "naeil_invite_loopback";
}
function cookieId(request: Request, name: string) {
  const matches = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
function boundary(request: Request, config: InviteConfig, post: boolean) {
  const url = new URL(request.url);
  const configured = new URL(config.siteOrigin);
  // Next16 builds Request.url from its internal fetchHostname/port. Only the
  // configured external Host and explicit Origin are authority, never that URL
  // or forwarded headers. URL parsing below supplies path/query only.
  if (request.headers.get("host") !== configured.host) throw new Failure(403);
  const origin = request.headers.get("origin");
  if ((post || origin !== null) && origin !== config.siteOrigin)
    throw new Failure(403);
  if (
    !["/auth/invite", "/auth/invite/"].includes(url.pathname) ||
    [...url.searchParams].some(
      ([k, v]) => k !== "locale" || !["ko", "ja", "en"].includes(v),
    ) ||
    url.searchParams.getAll("locale").length > 1
  )
    throw new Failure(400);
}

/** The narrow proxy handles this alias before the normal site auth/intl path. */
export function inviteCanonicalResponse(request: Request): Response {
  const responseHeaders = inviteResponseHeaders();
  try {
    const config = readInviteConfig();
    if (!config) throw new Failure(503);
    boundary(request, config, request.method === "POST");
    const url = new URL(request.url);
    responseHeaders.set(
      "Location",
      `${config.siteOrigin}/auth/invite${url.search}`,
    );
    return new Response(null, { status: 308, headers: responseHeaders });
  } catch (e) {
    const status = e instanceof Failure ? e.status : 503;
    return Response.json(
      { status: status === 503 ? "unavailable" : "invalid" },
      { status, headers: responseHeaders },
    );
  }
}

export function createInviteHandler(deps: Dependencies = {}) {
  const transactions = new Map<string, Transaction>();
  const now = deps.now || Date.now;
  const configReader = deps.readConfig || readInviteConfig;
  async function call(
    config: InviteConfig,
    path: string,
    token: string,
    data?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let r: Response;
    try {
      r = await (deps.fetch || fetch)(`${config.supabaseUrl}${path}`, {
        method: data ? "POST" : "GET",
        headers: {
          apikey:
            token === config.serviceRoleKey
              ? config.serviceRoleKey
              : config.anonKey,
          Authorization: `Bearer ${token}`,
          ...(data ? { "Content-Type": "application/json" } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new Failure(503);
    }
    if (!r.ok) {
      let terminal = false;
      try {
        terminal = terminalDenial(
          path,
          r.status,
          await boundedText(r.body, 65536),
        );
      } catch {
        // Never expose private upstream bodies, including malformed/oversized errors.
      }
      throw new Failure(terminal ? 409 : 503);
    }
    try {
      const v: unknown = JSON.parse(await boundedText(r.body, 65536));
      if (!object(v)) throw new Error();
      return v;
    } catch {
      throw new Failure(503);
    }
  }
  function purge() {
    for (const [key, t] of transactions) {
      if (t.expires <= now()) {
        t.proof = undefined;
        t.verified = undefined;
        t.candidate = undefined;
        transactions.delete(key);
      }
    }
  }
  async function accept(
    t: Transaction,
    config: InviteConfig,
    checkpoint?: (phase: InvitePhase) => Promise<void>,
  ) {
    const p = t.proof;
    if (!p) throw new Failure(409);
    const fingerprints = {
      p_invite_id: p.id,
      p_version: p.version,
      p_nonce_hash: hash(p.nonce),
      p_token_hash_hash: hash(p.token_hash),
    };
    if (!t.candidate && !t.verified) {
      const pre = await call(
        config,
        "/rest/v1/rpc/console_invite_preflight",
        config.serviceRoleKey,
        fingerprints,
      );
      if (
        !uuid(pre.userId) ||
        !email(pre.email) ||
        !["invite", "recovery"].includes(String(pre.verificationType))
      )
        throw new Failure(503);
      if (t.expires <= now()) throw new Failure(409);
      // The durable claim must survive before the single-use external effect.
      await checkpoint?.("verifying");
      if (t.expires <= now()) throw new Failure(409);
      const auth = await call(config, "/auth/v1/verify", config.anonKey, {
        token_hash: p.token_hash,
        type: pre.verificationType,
      });
      if (
        typeof auth.access_token !== "string" ||
        auth.access_token.length > 16384 ||
        !object(auth.user)
      )
        throw new Failure(503);
      let claims: Record<string, unknown>;
      try {
        const pieces = auth.access_token.split(".");
        if (pieces.length !== 3) throw new Error();
        claims = JSON.parse(
          Buffer.from(pieces[1], "base64url").toString("utf8"),
        );
        if (!object(claims)) throw new Error();
      } catch {
        throw new Failure(503);
      }
      if (
        !uuid(claims.sub) ||
        !uuid(claims.session_id) ||
        claims.sub !== pre.userId ||
        typeof claims.exp !== "number" ||
        claims.exp * 1000 <= now() ||
        auth.user.id !== pre.userId ||
        auth.user.email !== pre.email ||
        typeof auth.user.email_confirmed_at !== "string" ||
        !Number.isFinite(Date.parse(auth.user.email_confirmed_at))
      )
        throw new Failure(503);
      if (t.expires <= now()) throw new Failure(409);
      // This candidate is never authority until the fresh /user check succeeds.
      // Retaining it permits explicit retry if /user loses its response after OTP use.
      t.candidate = {
        accessToken: auth.access_token,
        userId: claims.sub,
        sessionId: claims.session_id,
        email: pre.email,
      };
      await checkpoint?.("candidate");
    }
    if (!t.verified) {
      const candidate = t.candidate!;
      if (t.expires <= now()) throw new Failure(409);
      const u = await call(config, "/auth/v1/user", candidate.accessToken);
      if (
        u.id !== candidate.userId ||
        u.email !== candidate.email ||
        typeof u.email_confirmed_at !== "string" ||
        !Number.isFinite(Date.parse(u.email_confirmed_at))
      )
        throw new Failure(503);
      if (t.expires <= now()) throw new Failure(409);
      t.verified = {
        accessToken: candidate.accessToken,
        userId: candidate.userId,
        sessionId: candidate.sessionId,
      };
      t.candidate = undefined;
      await checkpoint?.("verified");
    }
    // Once a receipt is known, do not re-record after an unknown acceptance outcome.
    // record_verification correctly rejects a now-accepted invitation; accept replays it.
    if (!t.receiptRecorded) {
      if (t.expires <= now()) throw new Failure(409);
      const recorded = await call(
        config,
        "/rest/v1/rpc/console_invite_record_verification",
        config.serviceRoleKey,
        {
          ...fingerprints,
          p_user_id: t.verified.userId,
          p_session_id: t.verified.sessionId,
        },
      );
      if (
        recorded.verified !== true ||
        typeof recorded.expiresAt !== "string" ||
        !Number.isFinite(Date.parse(recorded.expiresAt)) ||
        Date.parse(recorded.expiresAt) <= now()
      )
        throw new Failure(503);
      t.receiptRecorded = true;
      await checkpoint?.("recorded");
    }
    if (t.expires <= now()) throw new Failure(409);
    const receipt = await call(
      config,
      "/rest/v1/rpc/accept_console_invite",
      t.verified.accessToken,
      { p_invite_id: p.id, p_version: p.version, p_nonce: p.nonce },
    );
    if (
      receipt.inviteId !== p.id ||
      receipt.version !== p.version ||
      receipt.userId !== t.verified.userId ||
      !Array.isArray(receipt.services) ||
      !receipt.services.length ||
      receipt.services.length > 2 ||
      new Set(receipt.services).size !== receipt.services.length ||
      receipt.services.some(
        (s) => typeof s !== "string" || !Object.hasOwn(LINKS, s),
      ) ||
      typeof receipt.acceptedAt !== "string" ||
      !Number.isFinite(Date.parse(receipt.acceptedAt))
    )
      throw new Failure(503);
    t.links = Object.keys(LINKS)
      .filter((s) => (receipt.services as string[]).includes(s))
      .map((s) => LINKS[s as keyof typeof LINKS]);
    t.proof = undefined;
    t.verified = undefined;
    t.candidate = undefined;
    t.receiptRecorded = undefined;
    await checkpoint?.("complete");
  }
  async function handle(request: Request, post: boolean): Promise<Response> {
    const h = inviteResponseHeaders();
    let t: Transaction | undefined;
    let store: InviteStore | undefined;
    try {
      const config = configReader();
      if (!config) throw new Failure(503);
      if (process.env.VERCEL && config.transactionStore !== "supabase")
        throw new Failure(503);
      boundary(request, config, post);
      purge();
      const name = cookieName(config);
      let id = cookieId(request, name);
      const setCookie = (handle: string) =>
        h.set(
          "Set-Cookie",
          `${name}=${handle}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${config.siteOrigin.startsWith("https:") ? "; Secure" : ""}`,
        );
      const durable = config.transactionStore === "supabase";
      const durableStore = (handle: string) =>
        new InviteStore(handle, config.encryptionKey || "", (action, args) =>
          call(
            config,
            `/rest/v1/rpc/console_invite_tx_${action}`,
            config.serviceRoleKey,
            args,
          ),
        );
      if (durable && id) {
        store = durableStore(id);
        t = await store.read();
      } else t = id ? transactions.get(id) : undefined;
      if (post) {
        if (!t) throw new Failure(403);
        const data = await body(request);
        if (!equal(data.csrf, t.csrf)) throw new Failure(403);
        if (data.action === "stage") {
          if (
            !exactKeys(data, [
              "action",
              "csrf",
              "id",
              "version",
              "nonce",
              "token_hash",
            ])
          )
            throw new Failure(400);
          const p = envelope(data);
          if (!p) throw new Failure(400);
          const rotated =
            !!store &&
            t.proofIdentity?.id === p.id &&
            p.version > t.proofIdentity.version;
          if (rotated) {
            // An explicitly supplied resend gets a separate lifetime and handle.
            // Never claim or rewrite the old row, especially terminal uncertainty.
            id = fresh();
            store = durableStore(id);
            t = await store.create({ expires: now() + TTL, csrf: fresh() });
            // The new handle must remain recoverable if its stage checkpoint
            // commits but the response is lost. GET reads empty/staged DB truth.
            setCookie(id);
          }
          if (
            t.pending ||
            t.links ||
            t.invalid ||
            t.uncertain ||
            t.verified ||
            t.candidate
          )
            throw new Failure(409);
          if (t.proof && JSON.stringify(t.proof) !== JSON.stringify(p))
            throw new Failure(409);
          if (store) {
            t = await store.claim();
            // Rotation already checked the previous handle's CSRF. A new row's
            // random CSRF was never sent by that previous tab.
            if (!rotated && !equal(data.csrf, t.csrf))
              throw new Failure(403);
          }
          t.proof = p;
          t.proofIdentity = inviteProofIdentity(p);
          t.csrf = fresh();
          if (store) await store.checkpoint(t, "staged");
        } else if (data.action === "confirm") {
          if (!exactKeys(data, ["action", "csrf"])) throw new Failure(400);
          if (t.invalid || t.uncertain || (!t.proof && !t.links))
            throw new Failure(409);
          if (!t.links) {
            if (store) {
              t = await store.claim();
              if (!equal(data.csrf, t.csrf)) throw new Failure(403);
              const current = t;
              await accept(t, config, (phase) =>
                store!.checkpoint(current, phase),
              );
            } else {
              if (!t.pending) {
                const current = t;
                t.pending = accept(t, config).catch((e) => {
                  if (e instanceof Failure && e.status === 409) {
                    current.invalid = true;
                    current.proof = undefined;
                    current.verified = undefined;
                    current.candidate = undefined;
                    current.receiptRecorded = undefined;
                  }
                  throw e;
                });
              }
              const pending = t.pending;
              try {
                await pending;
              } finally {
                if (t.pending === pending) t.pending = undefined;
              }
            }
          }
          if (!store) t.csrf = fresh();
        } else if (data.action === "status") {
          if (!exactKeys(data, ["action", "csrf"])) throw new Failure(400);
        } else throw new Failure(400);
        await store?.release();
        return Response.json(dto(t), { headers: h });
      }
      if (!t) {
        if (!durable && transactions.size >= MAX_TRANSACTIONS)
          throw new Failure(503);
        id = fresh();
        t = { expires: now() + TTL, csrf: fresh() };
        if (durable) {
          store = durableStore(id);
          t = await store.create(t);
        } else transactions.set(id, t);
        setCookie(id);
      }
      if (
        request.headers
          .get("accept")
          ?.split(",")
          .some((v) => v.trim() === "application/json")
      )
        return Response.json(dto(t), { headers: h });
      const proxyNonce = request.headers.get("x-naeil-invite-nonce");
      const nonce =
        proxyNonce && /^[A-Za-z0-9_-]{43}$/.test(proxyNonce)
          ? proxyNonce
          : fresh();
      const pageHeaders = inviteResponseHeaders(nonce);
      if (h.has("set-cookie"))
        pageHeaders.set("set-cookie", h.get("set-cookie")!);
      pageHeaders.set("Content-Type", "text/html; charset=utf-8");
      const locale =
        new URL(request.url).searchParams.get("locale") ||
        (request.headers.get("accept-language") || "")
          .match(/^(ko|ja)\b/i)?.[1]
          .toLowerCase() ||
        "en";
      return new Response(
        invitePage(nonce, locale as "ko" | "ja" | "en", dto(t)),
        {
          headers: pageHeaders,
        },
      );
    } catch (e) {
      let status = e instanceof Failure ? e.status : 503;
      if (store && t) {
        try {
          if (
            store.canWrite &&
            (status === 409 || store.phase === "verifying")
          ) {
            t.invalid = status === 409;
            t.uncertain = status !== 409;
            t.proof = undefined;
            t.verified = undefined;
            t.candidate = undefined;
            t.receiptRecorded = undefined;
            await store.checkpoint(t, status === 409 ? "invalid" : "uncertain");
          }
          await store.release();
        } catch {
          status = 503;
        }
      }
      return Response.json(
        {
          status:
            status === 503
              ? "unavailable"
              : t?.uncertain
                ? "uncertain"
                : "invalid",
          ...(t ? { csrf: t.csrf } : {}),
        },
        { status, headers: h },
      );
    }
  }
  return {
    GET: (request: Request) => handle(request, false),
    POST: (request: Request) => handle(request, true),
  };
}
