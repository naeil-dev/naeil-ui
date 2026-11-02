import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from "node:crypto";
import { readInviteConfig, type InviteConfig } from "./invite-config";
import { temporaryMarker, UUID, type AuthUser } from "./password-policy";

export const CHANGE_COOKIE = "naeil_password_change";
export type ChangeOperation = {
  id: string;
  user: string;
  session: string;
  generation: number;
  expires: number;
};
export class LoginFailure extends Error {
  constructor(
    public status = 503,
    public code = "unavailable",
  ) {
    super("Sign-in operation unavailable");
  }
}
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new LoginFailure();
  return v as Record<string, unknown>;
};
export function loginConfig() {
  const c = readInviteConfig();
  if (
    !c?.encryptionKey ||
    c.supabaseUrl !== process.env.NEXT_PUBLIC_SUPABASE_URL ||
    c.anonKey !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    throw new LoginFailure();
  return c;
}
export function changeCookie(
  config: InviteConfig,
  value: ChangeOperation | string,
): string | ChangeOperation {
  const key = Buffer.from(config.encryptionKey!, "base64url");
  if (typeof value !== "string") {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(CHANGE_COOKIE));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString(
      "base64url",
    );
  }
  try {
    if (value.length > 2048) throw new Error();
    const bytes = Buffer.from(value, "base64url"),
      decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(CHANGE_COOKIE));
    decipher.setAuthTag(bytes.subarray(-16));
    const op = record(
      JSON.parse(
        Buffer.concat([
          decipher.update(bytes.subarray(12, -16)),
          decipher.final(),
        ]).toString(),
      ),
    );
    if (
      ![op.id, op.user, op.session].every(
        (v) => typeof v === "string" && UUID.test(v),
      ) ||
      !Number.isInteger(op.generation) ||
      Number(op.generation) < 1 ||
      typeof op.expires !== "number" ||
      op.expires < Date.now()
    )
      throw new Error();
    return op as ChangeOperation;
  } catch {
    throw new LoginFailure(409, "reissued");
  }
}
export function authTransport(
  config: InviteConfig,
  fetcher: typeof fetch = fetch,
) {
  return async (
    path: string,
    token: string,
    method = "GET",
    body?: unknown,
  ) => {
    try {
      const r = await fetcher(config.supabaseUrl + path, {
        method,
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        redirect: "error",
        cache: "no-store",
      });
      if (
        r.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
      )
        throw new LoginFailure();
      const reader = r.body?.getReader();
      if (!reader) throw new LoginFailure();
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 65536) {
            await reader.cancel();
            throw new LoginFailure();
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const data: unknown = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
      );
      if (!r.ok) {
        const e = record(data);
        throw new LoginFailure(
          r.status,
          typeof e.code === "string"
            ? e.code
            : typeof e.error_code === "string"
              ? e.error_code
              : "unavailable",
        );
      }
      return data;
    } catch (e) {
      if (e instanceof LoginFailure) throw e;
      throw new LoginFailure();
    }
  };
}
export async function verifiedSession(
  config: InviteConfig,
  token: string,
  fetcher?: typeof fetch,
) {
  const call = authTransport(config, fetcher),
    user = record(await call("/auth/v1/user", token)) as AuthUser;
  let claims: Record<string, unknown>;
  try {
    claims = record(
      JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()),
    );
  } catch {
    throw new LoginFailure(401);
  }
  if (
    !UUID.test(user.id) ||
    claims.sub !== user.id ||
    typeof claims.session_id !== "string" ||
    !UUID.test(claims.session_id)
  )
    throw new LoginFailure(401);
  return { user, session: claims.session_id, call };
}
export async function newChange(
  config: InviteConfig,
  token: string,
  fetcher?: typeof fetch,
  rejected?: ChangeOperation,
): Promise<ChangeOperation> {
  const { user, session } = await verifiedSession(config, token, fetcher),
    m = temporaryMarker(user);
  if (
    !m ||
    !m.must_change ||
    m.locked ||
    Date.parse(String(m.issued_at)) + 7 * 86400_000 <= Date.now()
  )
    throw new LoginFailure(409, "reissued");
  if (
    rejected &&
    (rejected.user !== user.id ||
      rejected.session !== session ||
      rejected.generation !== m.generation)
  )
    throw new LoginFailure(409, "reissued");
  // Same session/generation/rejection predecessor => same durable admission, including concurrent tabs.
  const bytes = createHmac(
    "sha256",
    Buffer.from(config.encryptionKey!, "base64url"),
  )
    .update(
      JSON.stringify([
        "S2-password-change",
        user.id,
        session,
        m.generation,
        rejected?.id || "initial",
      ]),
    )
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 0x80; // UUIDv8, custom HMAC payload.
  bytes[8] = (bytes[8] & 63) | 0x80;
  const id = bytes
    .toString("hex")
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  return {
    id,
    user: user.id,
    session,
    generation: Number(m.generation),
    expires: Date.parse(String(m.issued_at)) + 7 * 86400_000,
  };
}
async function advanceChange(
  config: InviteConfig,
  token: string,
  op: ChangeOperation,
  credentials?: { password: string; current_password?: string; nonce?: string },
  fetcher?: typeof fetch,
) {
  const { user, session, call } = await verifiedSession(config, token, fetcher),
    m = temporaryMarker(user);
  if (
    user.id !== op.user ||
    session !== op.session ||
    m?.generation !== op.generation
  )
    throw new LoginFailure(409, "reissued");
  const rpc = async (name: string, body: unknown) =>
    record(
      await call(`/rest/v1/rpc/${name}`, config.serviceRoleKey, "POST", body),
    );
  if (credentials !== undefined) {
    const plan = await rpc("console_temp_prepare", {
      p_action: "change",
      p_operation_id: op.id,
      p_user_id: user.id,
      p_generation: op.generation,
      p_session_id: session,
    });
    if (
      plan.userId !== user.id ||
      plan.operationId !== op.id ||
      plan.generation !== op.generation ||
      typeof plan.dispatch !== "boolean"
    )
      throw new LoginFailure();
    if (plan.dispatch) {
      try {
        await call("/auth/v1/user", token, "PUT", credentials);
      } catch (e) {
        // Only GoTrue's explicit pre-write rejections permit a fresh operation.
        if (
          e instanceof LoginFailure &&
          ((e.status === 422 &&
            [
              "weak_password",
              "same_password",
              "reauthentication_not_valid",
            ].includes(e.code)) ||
            (e.status === 400 &&
              [
                "current_password_required",
                "current_password_mismatch",
                "reauthentication_needed",
              ].includes(e.code)))
        )
          throw new LoginFailure(e.status, "rejected");
        // Every other result may have committed: completion only.
      }
    }
  } else {
    const observed = await rpc("console_temp_operation", {
      p_operation_id: op.id,
    });
    if (observed.userId !== user.id) throw new LoginFailure();
  }
  const completed = await rpc("console_temp_complete_change", {
    p_operation_id: op.id,
    p_session_id: session,
  });
  const marker = temporaryMarker({
    id: user.id,
    app_metadata: { console_temp: completed.marker },
  });
  if (
    completed.userId !== user.id ||
    !marker ||
    marker.generation !== op.generation ||
    marker.operation_id !== op.id ||
    marker.must_change ||
    marker.locked ||
    typeof completed.applied !== "boolean"
  )
    throw new LoginFailure();
  if (!completed.applied)
    await call(
      `/auth/v1/admin/users/${user.id}`,
      config.serviceRoleKey,
      "PUT",
      { app_metadata: { console_temp: completed.marker } },
    );
  const fresh = record(await call("/auth/v1/user", token)) as AuthUser,
    current = temporaryMarker(fresh);
  if (fresh.id !== user.id || current?.generation !== op.generation)
    throw new LoginFailure(409, "reissued");
  if (current.must_change || current.locked) throw new LoginFailure();
}
export async function expiredLogin(
  email: string,
  error: { status?: number; code?: string },
  config: InviteConfig,
  fetcher?: typeof fetch,
) {
  if (
    ![
      [409, "PT409"],
      [400, "user_banned"],
      [403, "user_banned"],
      [500, "unexpected_failure"],
    ].some(([s, c]) => error.status === s && error.code === c)
  )
    return false;
  const call = authTransport(config, fetcher);
  const data = record(
    await call(
      `/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=2`,
      config.serviceRoleKey,
    ),
  );
  if (!Array.isArray(data.users)) return false;
  const u = data.users.find(
    (v) =>
      v &&
      typeof v === "object" &&
      (v as { email?: string }).email?.toLowerCase() === email,
  ) as (AuthUser & { banned_until?: string }) | undefined;
  if (!u || !UUID.test(u.id) || !temporaryMarker(u)) return false;
  if (
    temporaryMarker(u)?.locked ||
    Date.parse(u.banned_until || "") > Date.now()
  )
    return true;
  // Start immediately below the exact UUID; the bounded expired read must contain this user first if expired.
  const n = BigInt("0x" + u.id.replaceAll("-", "")) - BigInt(1);
  const after =
    n < 0
      ? null
      : n
          .toString(16)
          .padStart(32, "0")
          .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  const rows = await call(
    "/rest/v1/rpc/console_temp_list",
    config.serviceRoleKey,
    "POST",
    { p_after: after, p_sweep: true },
  );
  return (
    Array.isArray(rows) &&
    rows.some(
      (v) => v?.userId === u.id && ["expired", "locked"].includes(v.state),
    )
  );
}

export async function performChange(
  config: InviteConfig,
  token: string,
  op: ChangeOperation,
  credentials?: { password: string; current_password?: string; nonce?: string },
  fetcher?: typeof fetch,
) {
  try {
    await advanceChange(config, token, op, credentials, fetcher);
  } catch (e) {
    if (e instanceof LoginFailure && [401, 403, 409].includes(e.status)) {
      try {
        const { user, session } = await verifiedSession(config, token, fetcher);
        if (
          user.id !== op.user ||
          session !== op.session ||
          temporaryMarker(user)?.generation !== op.generation
        )
          throw new LoginFailure(409, "reissued");
      } catch (fresh) {
        if (
          fresh instanceof LoginFailure &&
          ([401, 403].includes(fresh.status) || fresh.code === "reissued")
        )
          throw new LoginFailure(409, "reissued");
      }
    }
    throw e;
  }
}
