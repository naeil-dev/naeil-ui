/** One fresh recipient handler per process. Private fixture input/output stays on
 * parent-owned pipes; only its parent prints sanitized assertions and counts. */
import { createInviteHandler } from "../src/lib/auth/invite";
import type { InviteConfig } from "../src/lib/auth/invite-config";

type Input = {
  config: InviteConfig;
  cookie?: string;
  csrf?: string;
  action?: "stage" | "confirm" | "status";
  proof?: Record<string, unknown>;
  fault?: { endpoint: string; mode: "before" | "after"; phase?: string };
  holdPreflightMs?: number;
  delayVerifyingUntilExpiry?: boolean;
};
async function main() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 65536) throw new Error();
  }
  const input: Input = JSON.parse(raw);
  if (
    input.config.supabaseUrl !== "http://127.0.0.1:55521" ||
    input.config.siteOrigin !== "https://durable-invite.example.invalid" ||
    input.config.transactionStore !== "supabase"
  )
    throw new Error();
  delete process.env.NAEIL_INVITE_CONFIG_FILE;
  process.env.NAEIL_INVITE_CONFIG_JSON = JSON.stringify(input.config);
  process.env.VERCEL = "1";
  const counts: Record<string, number> = {};
  let injected = false;
  let delayedExpiry = false;
  const native = globalThis.fetch;
  const handler = createInviteHandler({
    fetch: async (resource, init) => {
      const url = new URL(String(resource));
      if (
        url.origin !== input.config.supabaseUrl ||
        !(
          url.pathname.startsWith("/rest/v1/rpc/console_invite_") ||
          [
            "/auth/v1/verify",
            "/auth/v1/user",
            "/rest/v1/rpc/accept_console_invite",
          ].includes(url.pathname)
        )
      )
        throw new Error();
      counts[url.pathname] = (counts[url.pathname] || 0) + 1;
      if (url.pathname.endsWith("preflight") && input.holdPreflightMs)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000, input.holdPreflightMs!)),
        );
      const fault = input.fault;
      const selected =
        !injected &&
        fault &&
        url.pathname.endsWith(fault.endpoint) &&
        (!fault.phase ||
          JSON.parse(String(init?.body)).p_phase === fault.phase);
      if (selected) injected = true;
      if (selected && fault.mode === "before")
        return Response.json({}, { status: 503 });
      const response = await native(resource, init);
      if (
        input.delayVerifyingUntilExpiry &&
        url.pathname.endsWith("console_invite_tx_checkpoint") &&
        JSON.parse(String(init?.body)).p_phase === "verifying" &&
        response.ok
      ) {
        const row = await response.clone().json();
        const remaining = Date.parse(row.expiresAt) - Date.now();
        if (row.phase !== "verifying" || remaining <= 0 || remaining > 4000)
          throw new Error();
        // The actual DB committed verifying while still live. Delay delivery to
        // the handler until its immutable expiry, without calling Auth at all.
        await new Promise((resolve) => setTimeout(resolve, remaining + 30));
        delayedExpiry = true;
      }
      if (selected && fault.mode === "after" && response.ok) {
        await response.body?.cancel();
        return Response.json({}, { status: 503 });
      }
      return response;
    },
  });
  const request = new Request(`${input.config.siteOrigin}/auth/invite`, {
    method: input.action ? "POST" : "GET",
    headers: {
      host: "durable-invite.example.invalid",
      accept: "application/json",
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.action
        ? {
            origin: input.config.siteOrigin,
            "content-type": "application/json",
          }
        : {}),
    },
    ...(input.action
      ? {
          body: JSON.stringify({
            action: input.action,
            csrf: input.csrf,
            ...input.proof,
          }),
        }
      : {}),
  });
  const response = input.action
    ? await handler.POST(request)
    : await handler.GET(request);
  if (
    !response.headers.get("cache-control")?.includes("no-store") ||
    response.headers.get("referrer-policy") !== "no-referrer"
  )
    throw new Error();
  process.stdout.write(
    JSON.stringify({
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      counts,
      injected,
      delayedExpiry,
      pid: process.pid,
    }),
  );
}
main().catch(() => {
  process.stderr.write(
    "Owned durable fixture child failed; private diagnostics suppressed.\n",
  );
  process.exitCode = 1;
});
