import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { InviteConfig } from "./invite-config";
import {
  hasSiteSession,
  isSiteSessionCookie,
  isTerminalSessionError,
  siteCookieOptions,
} from "./site-session";

export type InviteCredentials = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  sessionId: string;
};
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
export function inviteSessionClaims(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invitation session unavailable");
  const v = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (!v || !uuid(v.sub) || !uuid(v.session_id) || !Number.isFinite(v.exp))
    throw new Error("Invitation session unavailable");
  return v as { sub: string; session_id: string; exp: number };
}
export class InviteSessionExpired extends Error {}

/** Existing shared SSR cookies, independent of the host-only recipient receipt. */
export function inviteSession(
  request: Request,
  config: InviteConfig,
  headers: Headers,
  fetcher: typeof fetch,
) {
  const jar = parseCookieHeader(request.headers.get("cookie") || "").map(
    (c) => ({ name: c.name, value: c.value ?? "" }),
  );
  const options = siteCookieOptions(request.headers.get("host"));
  const client = (existing: typeof jar) => {
    const writes: {
      name: string;
      value: string;
      options: Parameters<typeof serializeCookieHeader>[2];
    }[] = [];
    const sdk = createServerClient(config.supabaseUrl, config.anonKey, {
      global: { fetch: fetcher },
      cookieOptions: options,
      cookies: {
        getAll: () => existing,
        setAll: (values) => {
          writes.push(...values);
        },
      },
    });
    return {
      sdk,
      flush: () =>
        writes.forEach((c) =>
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(c.name, c.value, c.options),
          ),
        ),
    };
  };
  return {
    async current() {
      if (!hasSiteSession(jar)) return null;
      const { sdk, flush } = client(jar),
        result = await sdk.auth.getUser();
      if (result.error) {
        if (isTerminalSessionError(result.error)) return null;
        throw new Error("Invitation session unavailable");
      }
      if (!result.data.user || !uuid(result.data.user.id))
        throw new Error("Invitation session unavailable");
      const stored = await sdk.auth.getSession(),
        session = stored.data.session;
      if (stored.error || !session)
        throw new Error("Invitation session unavailable");
      const claims = inviteSessionClaims(session.access_token);
      if (claims.sub !== result.data.user.id)
        throw new Error("Invitation session unavailable");
      flush();
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userId: claims.sub,
        sessionId: claims.session_id,
        email: result.data.user.email,
        emailConfirmedAt: result.data.user.email_confirmed_at,
      };
    },
    async install(value: InviteCredentials) {
      // Avoid SDK refresh of an expiring one-use credential; recovery is delivery only.
      if (
        !value.refreshToken ||
        inviteSessionClaims(value.accessToken).exp * 1000 <= Date.now() + 30_000
      )
        throw new InviteSessionExpired();
      const { sdk, flush } = client(
        jar.filter((c) => !isSiteSessionCookie(c.name)),
      );
      const result = await sdk.auth.setSession({
        access_token: value.accessToken,
        refresh_token: value.refreshToken,
      });
      if (result.error || result.data.user?.id !== value.userId)
        throw new Error("Invitation session unavailable");
      for (const c of jar)
        if (isSiteSessionCookie(c.name))
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(c.name, "", { ...options, maxAge: 0 }),
          );
      flush();
    },
  };
}
