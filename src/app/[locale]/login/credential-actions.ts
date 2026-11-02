"use server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prepareLogin, clearLocalSession } from "./actions";
import { loginDestination, authLocale } from "@/lib/auth/return-location";
import {
  loginEmail,
  passwordChangePath,
  requiresPasswordChange,
  temporaryMarker,
  type AuthUser,
} from "@/lib/auth/password-policy";
import {
  CHANGE_COOKIE,
  changeCookie,
  loginConfig,
  newChange,
  performChange,
  authTransport,
  verifiedSession,
  LoginFailure,
  type ChangeOperation,
} from "@/lib/auth/password-server";

export async function passwordLogin(form: FormData) {
  const email = loginEmail(form.get("email")),
    password = form.get("password");
  if (
    !email ||
    typeof password !== "string" ||
    !password ||
    password.length > 1024
  )
    return { status: "error" };
  try {
    await prepareLogin(
      loginDestination(form.get("next")),
      authLocale(form.get("locale")),
    );
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) return { status: "error" };
    // GoTrue password grants always create a fresh session.
    (await cookies()).delete(CHANGE_COOKIE);
    return {
      status: "signedIn",
      location: requiresPasswordChange(data.user)
        ? passwordChangePath(form.get("locale"))
        : loginDestination(form.get("next")),
    };
  } catch {
    return { status: "error" };
  }
}
export async function emailLogin(form: FormData) {
  const email = loginEmail(form.get("email"));
  if (!email) return { status: "invalidEmail" };
  const started = performance.now();
  try {
    await prepareLogin(
      loginDestination(form.get("next")),
      authLocale(form.get("locale")),
    );
    const client = await createClient();
    const host = (await headers()).get("origin");
    // The server action's same-origin check precedes this use; canonical site origin is fixed in production.
    const callback =
      process.env.NODE_ENV === "production"
        ? "https://naeil.dev/auth/callback"
        : new URL("/auth/callback", host || "http://localhost:3000").href;
    await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: callback },
    });
  } catch {
    /* Neutral for missing accounts, dependency errors and throttling. */
  } finally {
    const remaining = 1500 - (performance.now() - started);
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  return { status: "sent" };
}
async function sessionToken() {
  const client = await createClient({ writeCookies: false });
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) throw new LoginFailure(401, "reissued");
  return session.access_token;
}
async function retainedChange(
  config: ReturnType<typeof loginConfig>,
  user: AuthUser,
  session: string,
) {
  const jar = await cookies(),
    stored = jar.get(CHANGE_COOKIE)?.value;
  if (!stored) return null;
  const op = changeCookie(config, stored) as ChangeOperation,
    marker = temporaryMarker(user);
  if (
    op.user !== user.id ||
    op.session !== session ||
    (marker &&
      (Number(marker.generation) > op.generation ||
        (marker.generation === op.generation &&
          !marker.must_change &&
          !marker.locked)))
  ) {
    jar.delete(CHANGE_COOKIE);
    return null;
  }
  return op;
}
async function rememberChange(
  config: ReturnType<typeof loginConfig>,
  op: ChangeOperation,
) {
  (await cookies()).set(CHANGE_COOKIE, changeCookie(config, op) as string, {
    path: "/",
    httpOnly: true,
    secure: new URL(config.siteOrigin).protocol === "https:",
    sameSite: "strict",
    maxAge: Math.max(1, Math.ceil((op.expires - Date.now()) / 1000)),
  });
}
export async function beginPasswordChange() {
  try {
    const config = loginConfig(),
      token = await sessionToken();
    const { user, session } = await verifiedSession(config, token);
    const op = await retainedChange(config, user, session);
    if (!requiresPasswordChange(user))
      return { status: "changed", location: "/" };
    if (op) {
      try {
        await authTransport(config)(
          "/rest/v1/rpc/console_temp_operation",
          config.serviceRoleKey,
          "POST",
          { p_operation_id: op.id },
        );
        return { status: "retry" };
      } catch (e) {
        if (!(e instanceof LoginFailure && e.status === 404)) throw e;
      }
    } else {
      const op = await newChange(config, token);
      await rememberChange(config, op);
    }
    return { status: "ready" };
  } catch (e) {
    return {
      status:
        e instanceof LoginFailure && e.code === "reissued"
          ? "reissued"
          : "retry",
    };
  }
}
export async function submitPasswordChange(form: FormData) {
  const password = form.get("password"),
    current = form.get("current_password"),
    nonce = form.get("nonce");
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72 ||
    password !== form.get("confirm") ||
    (current && (typeof current !== "string" || current.length > 1024)) ||
    (nonce && (typeof nonce !== "string" || nonce.length > 128))
  )
    return { status: "rejected" };
  return changePassword({
    password,
    ...(current ? { current_password: String(current) } : {}),
    ...(nonce ? { nonce: String(nonce) } : {}),
  });
}
export async function resumePasswordChange() {
  const start = await beginPasswordChange();
  return start.status === "retry" ? changePassword() : start;
}
async function changePassword(credentials?: {
  password: string;
  current_password?: string;
  nonce?: string;
}) {
  try {
    const config = loginConfig(),
      token = await sessionToken(),
      jar = await cookies(),
      stored = jar.get(CHANGE_COOKIE)?.value;
    if (!stored) return { status: "retry" };
    await performChange(
      config,
      token,
      changeCookie(config, stored) as ChangeOperation,
      credentials,
    );
    jar.delete(CHANGE_COOKIE);
    return { status: "changed", location: "/" };
  } catch (e) {
    if (e instanceof LoginFailure && e.code === "rejected") {
      try {
        const config = loginConfig(),
          token = await sessionToken();
        const stored = (await cookies()).get(CHANGE_COOKIE)?.value;
        if (!stored) return { status: "retry" };
        const rejected = changeCookie(config, stored) as ChangeOperation;
        await rememberChange(
          config,
          await newChange(config, token, undefined, rejected),
        );
        return { status: "rejected" };
      } catch {
        return { status: "retry" };
      }
    }
    return {
      status:
        e instanceof LoginFailure && (e.code === "reissued" || e.status === 401)
          ? "reissued"
          : "retry",
    };
  }
}

export async function leavePasswordChange() {
  (await cookies()).delete(CHANGE_COOKIE);
  await clearLocalSession();
}
export async function requestPasswordCode() {
  try {
    const { error } = await (
      await createClient({ writeCookies: false })
    ).auth.reauthenticate();
    return { status: error ? "error" : "codeSent" };
  } catch {
    return { status: "error" };
  }
}
