/** Finite, loopback-only built HTTP checks. Never starts a server or follows a redirect.
 * Source references (read-only, not executed):
 * docs/rollout/evidence/exact-callback-return-2026-10-18/site/verify-http.py
 * docs/rollout/evidence/auth-preview-baseline-readiness-2026-10-19/bound-probe-plan/diagnostic-vectors.json
 * docs/rollout/evidence/auth-preview-baseline-result-2026-10-19/baseline-diagnostic-analysis/analysis.json
 *
 * Run against a NEW isolated build started by its owner with fake local public
 * configuration and outbound network denied. Node's --max-http-header-size=65536
 * is needed to reach the app's 16KiB query boundary. No real Auth is exercised.
 */
import assert from "node:assert/strict";
import { open } from "node:fs/promises";
import { createConnection } from "node:net";
import { resolve } from "node:path";

const nonce = "A".repeat(43);
const base = "/auth/return/jev";
const query = `nonce=${nonce}&code=ok`;
const errorMarker = "synthetic-private-provider-detail";
const destinations = {
  abestimate: "https://abestimate.naeil.dev/auth/callback",
  console: "https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback",
  jev: "https://jev.naeil.dev/auth/callback",
} as const;
const securityHeaders: Record<string, string> = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
};
type Reply = { status: number; headers: Record<string, string>; body: Buffer };
type Checks = Record<string, boolean>;
type Expected = { status: number; location?: string; method?: string };
type Case = {
  id: string; target: string; method?: string; hosts?: string[]; headers?: [string, string][];
  expected?: Expected; platform?: "slash" | "trace" | "control" | "host" | "normalized";
  // Exact delivered outcome observed on this pinned local Next artifact. Keep
  // expected as the former original-input oracle; never erase that difference.
  delivered?: Expected;
  smoke?: "callback" | "invite" | "locale" | "locale-default" | "locale-slash" | "health" | "identity";
};
const success = (service: keyof typeof destinations = "jev", code = "ok") =>
  `${destinations[service]}?${new URLSearchParams({ nonce, code })}#`;
const failure = (service: keyof typeof destinations = "jev") =>
  `${destinations[service]}?nonce=${nonce}&error=authentication_failed#`;

function parseOrigin(value: string): number {
  // String equality also rejects credentials, hostname tricks, paths and DNS.
  if (!/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.test(value)) throw new Error("invalid-loopback-origin");
  const port = Number(new URL(value).port);
  if (port < 1 || port > 65535) throw new Error("invalid-loopback-port");
  return port;
}

function decodeChunked(input: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (true) {
    const end = input.indexOf("\r\n", offset);
    if (end < 0) throw new Error("invalid-chunk-framing");
    const text = input.subarray(offset, end).toString("ascii").split(";", 1)[0];
    if (!/^[0-9a-f]+$/i.test(text)) throw new Error("invalid-chunk-size");
    const length = Number.parseInt(text, 16);
    offset = end + 2;
    if (length === 0) return Buffer.concat(chunks);
    if (offset + length + 2 > input.length || input.toString("ascii", offset + length, offset + length + 2) !== "\r\n") throw new Error("truncated-chunk");
    chunks.push(input.subarray(offset, offset + length));
    offset += length + 2;
  }
}

function parseReply(wire: Buffer, method: string): Reply {
  const end = wire.indexOf("\r\n\r\n");
  if (end < 0) throw new Error("missing-http-headers");
  const lines = wire.subarray(0, end).toString("latin1").split("\r\n");
  const match = /^HTTP\/1\.[01] ([0-9]{3})(?: |$)/.exec(lines.shift() ?? "");
  if (!match) throw new Error("invalid-http-status");
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error("invalid-http-header");
    const key = line.slice(0, colon).toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers[key] = key in headers ? `${headers[key]}, ${value}` : value;
  }
  const rawBody = wire.subarray(end + 4);
  const body = method === "HEAD" ? rawBody : /\bchunked\b/i.test(headers["transfer-encoding"] ?? "") ? decodeChunked(rawBody) : rawBody;
  if (method !== "HEAD" && headers["content-length"] !== undefined && body.length !== Number(headers["content-length"])) throw new Error("body-length-mismatch");
  return { status: Number(match[1]), headers, body };
}

async function request(port: number, test: Case): Promise<Reply> {
  const method = test.method ?? "GET";
  // All request bytes are finite, code-owned synthetic cases. Raw sockets let us
  // test duplicate Host and literal controls without a URL client's rewriting.
  const headers: [string, string][] = [
    ...(test.hosts ?? ["naeil.dev"]).map((value): [string, string] => ["Host", value]),
    ["Connection", "close"], ["Accept", "text/html"], ...(test.headers ?? []),
  ];
  const wire = Buffer.from(`${method} ${test.target} HTTP/1.1\r\n${headers.map(([key, value]) => `${key}: ${value}\r\n`).join("")}\r\n`, "latin1");
  return new Promise((resolveReply, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(15_000, () => socket.destroy(new Error("loopback-timeout")));
    socket.on("connect", () => socket.write(wire));
    socket.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) socket.destroy(new Error("response-budget-exceeded"));
      else chunks.push(chunk);
    });
    socket.on("error", reject);
    socket.on("end", () => {
      try { resolveReply(parseReply(Buffer.concat(chunks), method)); }
      catch (error) { reject(error); }
    });
  });
}

function appChecks(reply: Reply, expected: Expected): Checks {
  const headers = reply.headers;
  const location = headers.location;
  const isRedirect = expected.status === 303;
  const expectedError = expected.location?.includes("error=authentication_failed") ?? false;
  return {
    expectedStatus: reply.status === expected.status,
    emptyBody: reply.body.length === 0,
    fiveSecurityHeaders: Object.entries(securityHeaders).every(([key, value]) => headers[key] === value),
    noCookie: !("set-cookie" in headers),
    noRoutingMetadata: ["x-middleware-rewrite", "x-nextjs-rewrite", "x-nextjs-redirect", "x-nextjs-rewritten-query"].every((name) => !(name in headers)),
    exactLocation: location === expected.location,
    emptyFragment: !isRedirect || location?.endsWith("#") === true,
    fixedDestination: !isRedirect || Object.values(destinations).some((target) => location?.startsWith(`${target}?`) === true),
    noOriginalProviderData: !`${location ?? ""}${reply.body.toString("latin1")}`.includes(errorMarker),
    failureHasNoCode: !expectedError || (location !== undefined && !new URL(location).searchParams.has("code")),
    explicitMethodAllow: expected.status !== 405 || headers.allow === "GET",
  };
}
const all = (checks: Checks) => Object.values(checks).every(Boolean);

function evaluate(test: Case, reply: Reply, expectedOrigin = "http://127.0.0.1:43210"): { checks: Checks; platformException: boolean; normalizationAccepted: boolean } {
  if (test.delivered) return { checks: appChecks(reply, test.delivered), platformException: false, normalizationAccepted: true };
  if (test.expected) return { checks: appChecks(reply, { ...test.expected, method: test.method }), platformException: false, normalizationAccepted: false };
  if (test.smoke) {
    const location = reply.headers.location;
    const checks: Checks = { expectedStatus: false, expectedLocation: true };
    if (test.smoke === "callback") {
      checks.expectedStatus = reply.status === 307;
      checks.expectedLocation = location === "/login?error=auth" || location === new URL("/login?error=auth", expectedOrigin).href;
    } else if (test.smoke === "invite") checks.expectedStatus = reply.status === 503;
    else if (test.smoke === "locale") checks.expectedStatus = reply.status === 200 && reply.body.length > 0;
    else if (test.smoke === "locale-default") {
      checks.expectedStatus = reply.status === 307;
      checks.expectedLocation = location === "/login" || location === new URL("/login", expectedOrigin).href;
    } else if (test.smoke === "locale-slash") {
      checks.expectedStatus = reply.status === 308;
      checks.expectedLocation = location === "/ja/login" || location === new URL("/ja/login", expectedOrigin).href;
    } else checks.expectedStatus = reply.status === 200;
    return { checks, platformException: false, normalizationAccepted: false };
  }
  if (test.platform === "normalized" || test.platform === "host") {
    // This checks the two precise delivered outcomes; it does not reconstruct
    // raw Host or raw dot segments that Next may have collapsed.
    const rejected = appChecks(reply, { status: test.platform === "host" ? 403 : 404 });
    const normalized = appChecks(reply, { status: 303, location: success() });
    if (all(rejected)) return { checks: rejected, platformException: false, normalizationAccepted: false };
    return { checks: normalized, platformException: false, normalizationAccepted: true };
  }
  if (test.platform === "control" && reply.status === 400 && all(appChecks(reply, { status: 400 }))) {
    return { checks: appChecks(reply, { status: 400 }), platformException: false, normalizationAccepted: false };
  }
  const checks: Checks = { expectedPlatformStatus: false, sameOriginRelativeNormalization: true, noCookie: !("set-cookie" in reply.headers) };
  if (test.platform === "slash") {
    checks.expectedPlatformStatus = reply.status === 308;
    // OP02 permits query reflection on framework normalization only. Still stop
    // on a cross-origin or protocol-relative Location.
    const location = reply.headers.location ?? "";
    checks.sameOriginRelativeNormalization = location.startsWith("/") && !location.startsWith("//") && !location.includes("\\");
  } else if (test.platform === "trace") {
    // Node22/Next16.1.7 throws before proxy entry for TRACE. This is a platform
    // exception, not the explicit protected405 that app-supported methods get.
    checks.expectedPlatformStatus = reply.status === 500;
    checks.exactPlatformBody = reply.body.toString("utf8") === "Internal Server Error";
    checks.noLocation = !("location" in reply.headers);
  }
  else if (test.platform === "control") checks.expectedPlatformStatus = reply.status === 400;
  return { checks, platformException: true, normalizationAccepted: false };
}

function cases(): Case[] {
  const result: Case[] = [];
  const add = (id: string, target: string, status: number, location?: string, other: Partial<Case> = {}) => result.push({ id, target, expected: { status, location }, ...other });
  for (const service of Object.keys(destinations) as (keyof typeof destinations)[]) {
    add(`canonical-${service}-success`, `/auth/return/${service}?${query}`, 303, success(service));
    add(`canonical-${service}-error`, `/auth/return/${service}?nonce=${nonce}&error=access_denied&error_description=${errorMarker}&error_code=provider`, 303, failure(service));
    for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) add(`method-${service}-${method}`, `/auth/return/${service}?${query}`, 405, undefined, { method });
  }
  add("one-decode", `${base}?nonce=${nonce}&code=%252F+%2B%26nonce%3Dother`, 303, success("jev", "%2F +&nonce=other"));
  const bound = [
    ["empty-code", "code="], ["missing-code", ""], ["duplicate-code", "code=ok&code=other"],
    ["code-and-error", "code=ok&error=denied"], ["only-description", `error_description=${errorMarker}`],
    ["access-token", "code=ok&access_token=synthetic"], ["refresh-token", "code=ok&refresh_token=synthetic"],
    ["verifier", "code=ok&verifier=synthetic"], ["unknown", "code=ok&unknown=synthetic"],
    ["destination", "code=ok&destination=https%3A%2F%2Finvalid.example"], ["returnTo", "code=ok&returnTo=%2Fprivate"],
    ["encoded-code-key", "%63ode=ok"], ["duplicate-error-code", "error=denied&error_code=x&error_code=y"],
    ["encoded-null", "code=ok%00"], ["encoded-crlf", "code=ok%0D%0A"], ["encoded-c1", "code=ok%C2%85"],
    ["control-key", "code=ok&%00=x"], ["encoded-fragment", "code=ok%23fragment"],
    ["code-over-limit", `code=${"x".repeat(4097)}`], ["provider-over-limit", `error=denied&error_description=${"x".repeat(4097)}`],
    ["rsc", "code=ok&_rsc=opaque"], ["nxtPnonce", "code=ok&nxtPnonce=opaque"],
    ["path-field", "code=ok&path=jev"], ["nxtPpath", "code=ok&nxtPpath=jev"], ["next-locale", "code=ok&__nextDefaultLocale=ja"],
  ];
  for (const [id, fields] of bound) add(`query-${id}`, `${base}?nonce=${nonce}${fields ? `&${fields}` : ""}`, 303, id === "encoded-fragment" ? success("jev", "ok#fragment") : failure());
  const unbound = [
    ["missing-nonce", "code=ok"], ["empty-nonce", "nonce=&code=ok"], ["short-nonce", `nonce=${"A".repeat(42)}&code=ok`],
    ["bad-nonce", `nonce=${"A".repeat(42)}!&code=ok`], ["duplicate-nonce", `nonce=${nonce}&nonce=${nonce}&code=ok`],
    ["encoded-nonce", `%6eonce=${nonce}&code=ok`], ["bad-percent", `nonce=${nonce}&code=%GG`],
    ["bad-utf8", `nonce=${nonce}&code=%FF`], ["overlong-utf8", `nonce=${nonce}&code=%C0%AF`], ["surrogate", `nonce=${nonce}&code=%ED%A0%80`],
  ];
  for (const [id, fields] of unbound) add(`query-${id}`, `${base}?${fields}`, 400);
  add("code-exact-limit", `${base}?nonce=${nonce}&code=${"x".repeat(4096)}`, 303, success("jev", "x".repeat(4096)));
  const prefix = `nonce=${nonce}&unknown=`;
  add("query-exact-16k", `${base}?${prefix}${"x".repeat(16384 - prefix.length)}`, 303, failure());
  add("query-over-16k", `${base}?${prefix}${"x".repeat(16385 - prefix.length)}`, 400);
  // Original/transformed pairs are separately supplied inputs, never a claim
  // that this runtime performs the transformations observed on old Preview.
  const diagnostic: [string, string, number, string?][] = [
    ["D01-original", `nonce=${nonce}&code=synthetic-platform-v1`, 303, success("jev", "synthetic-platform-v1")],
    ["D01-transform-control", `nonce=${nonce}&code=synthetic-platform-v1`, 303, success("jev", "synthetic-platform-v1")],
    ["D03-original", `nonce=${nonce}&code=%2f`, 303, success("jev", "/")],
    ["D03-transform", `nonce=${nonce}&code=%2F`, 303, success("jev", "/")],
    ["D09-original", `%6eonce=${nonce}&nonce=${nonce}&code=x`, 400],
    ["D09-transform", `nonce=${nonce}&nonce=${nonce}&code=x`, 400],
    ["D12-original", `nonce=${nonce}&code=%`, 400], ["D12-transform", `nonce=${nonce}&code=`, 303, failure()],
    ["D30-original", `nonce=${nonce}&code=synthetic-platform-v1&&`, 303, failure()],
    ["D30-transform", `nonce=${nonce}&code=synthetic-platform-v1`, 303, success("jev", "synthetic-platform-v1")],
  ];
  for (const [id, fields, status, location] of diagnostic) add(id, `${base}?${fields}`, status, location);
  for (const [i, host] of ["evil.example", "naeil.dev:443", "naeil.dev.evil.example", "naeil.dev, evil.example", "NAEIL.DEV"].entries()) {
    add(`host-forged-${i + 1}`, `${base}?${query}`, 403, undefined, { hosts: [host], headers: [["X-Forwarded-Host", "naeil.dev"], ["X-Forwarded-Proto", "https"]] });
  }
  add("forwarded-no-authority", `${base}?${query}`, 303, success(), { headers: [["X-Forwarded-Host", "evil.example"], ["X-Forwarded-Proto", "https"], ["Cookie", "synthetic=unused"]] });
  add("rsc-header", `${base}?${query}`, 303, success(), { headers: [["RSC", "1"], ["Next-Router-Prefetch", "1"]] });
  for (const [i, value] of ["", "1"].entries()) add(`canonical-data-header-${i + 1}`, `${base}?${query}`, 303, success(), { headers: [["x-nextjs-data", value]] });
  add("canonical-data-flight-header", `${base}?${query}`, 303, success(), { headers: [["x-nextjs-data", "1"], ["RSC", "1"], ["Next-Router-Prefetch", "1"]] });
  result.push({ id: "host-duplicate-canonical", target: `${base}?${query}`, hosts: ["naeil.dev", "naeil.dev"], platform: "host" });
  result.push({ id: "host-duplicate-forged-second", target: `${base}?${query}`, hosts: ["naeil.dev", "evil.example"], platform: "host" });
  add("host-duplicate-forged-first", `${base}?${query}`, 403, undefined, { hosts: ["evil.example", "naeil.dev"] });
  const aliases = [
    "/auth/return", "/auth/return/unknown", "/auth/return/jev/", "/auth/return/jev/extra", "/%61uth/return/jev", "/auth/%72eturn/jev", "/auth/return/%6aev",
    "/%2561uth/return/jev", "/ja/auth/return/jev", "/auth/return/jev.rsc", "/auth/return/jev.json", "/auth/return/jev%2fextra",
    "/_next/data/unknown/ja/auth/return/jev.json", "/auth/return/constructor", "/auth/return/__proto__",
    "/api/internal/service-return", "/api/internal/service-return/", "/api/internal/service-return.rsc", "/api/%69nternal/service-return", "/ja/api/internal/service-return",
    "/%61uth/return/jev%GG", "/auth/%72eturn/%FF", "/auth/return;bad/jev",
  ];
  for (const [i, path] of aliases.entries()) add(`namespace-alias-${String(i + 1).padStart(2, "0")}`, `${path}?${query}`, 404, undefined, { headers: [["X-Invoke-Path", base], ["X-Matched-Path", base]] });
  for (const [i, path] of ["/auth//return/jev", "/auth/return//jev", "/auth\\return\\jev"].entries()) result.push({ id: `platform-slash-${i + 1}`, target: `${path}?${query}`, platform: "slash" });
  for (const [i, path] of ["/auth/return/jev/../jev", "/auth/return/%2e/jev", "/auth/return/x/%2e%2e/jev"].entries()) result.push({ id: `delivered-dot-${i + 1}`, target: `${path}?${query}`, platform: "normalized" });
  result.push({ id: "platform-TRACE", target: `${base}?${query}`, method: "TRACE", platform: "trace" });
  for (const [id, suffix] of [["null", "\0"], ["tab", "\t"], ["del", "\x7f"]]) result.push({ id: `literal-control-${id}`, target: `${base}?nonce=${nonce}&code=ok${suffix}`, platform: "control" });
  add("literal-fragment", `${base}?${query}#fragment`, 400);
  add("literal-apostrophe", `${base}?nonce=${nonce}&code=a'b`, 303, success("jev", "a'b"));
  const smokes: [string, string, Case["smoke"]][] = [
    ["site-callback", "/auth/callback", "callback"], ["site-invite", "/auth/invite", "invite"],
    ["site-locale-ja", "/ja/login", "locale"], ["site-locale-ko", "/ko/login", "locale"],
    ["site-locale-en", "/en/login", "locale-default"], ["site-locale-slash", "/ja/login/", "locale-slash"],
    ["site-health", "/api/health", "health"], ["site-identity", "/.well-known/naeil-ui.json", "identity"],
  ];
  for (const [id, target, smoke] of smokes) result.push({ id, target, smoke });
  // Source trace: route-module.prepare calls normalizeCdnUrl unconditionally,
  // even for static routes. All eleven differences were observed in the first
  // saved HTTP run. Strict delivered parser tests remain unchanged. These are
  // not old Preview passes; D12 here retains a literal percent, unlike Preview.
  const deliveredCodes: Record<string, string> = {
    "query-encoded-code-key": "ok", "query-nxtPnonce": "ok", "query-nxtPpath": "ok",
    "query-encoded-nonce": "ok", "query-bad-percent": "%GG", "query-bad-utf8": "\uFFFD",
    "query-overlong-utf8": "\uFFFD\uFFFD", "query-surrogate": "\uFFFD\uFFFD\uFFFD",
    "D12-original": "%", "D30-original": "synthetic-platform-v1", "literal-fragment": "ok",
  };
  for (const test of result) {
    if (Object.hasOwn(deliveredCodes, test.id)) test.delivered = { status: 303, location: success("jev", deliveredCodes[test.id]) };
  }
  // Dot/.rsc responses keep the strict empty-body oracle. The rejection-only
  // fallback must close these route misses without widening OP02 exceptions.
  assert.equal(new Set(result.map((test) => test.id)).size, result.length);
  return result;
}

function selfCheck(): Checks {
  const good: Reply = { status: 303, headers: { ...securityHeaders, location: failure() }, body: Buffer.alloc(0) };
  const expected = { status: 303, location: failure() };
  const mutations: Reply[] = [
    { ...good, status: 302 }, { ...good, body: Buffer.from("unexpected") },
    { ...good, headers: { ...good.headers, "cache-control": "public" } },
    { ...good, headers: { ...good.headers, "set-cookie": "synthetic=bad" } },
    { ...good, headers: { ...good.headers, "x-nextjs-redirect": success() } },
    { ...good, headers: { ...good.headers, location: failure().slice(0, -1) } },
    { ...good, headers: { ...good.headers, location: "https://invalid.example/callback#" } },
    { ...good, headers: { ...good.headers, location: `${failure().slice(0, -1)}&code=unexpected#` } },
    { ...good, headers: { ...good.headers, location: `${failure().slice(0, -1)}&error_description=${errorMarker}#` } },
  ];
  const invalidOrigins = ["https://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3000/", "http://evil.example:3000", "http://127.0.0.1:65536", "http://naeil.dev:3000"];
  return {
    acceptsCorrectReply: all(appChecks(good, expected)),
    rejectsEveryDeliberateMutation: mutations.every((reply) => !all(appChecks(reply, expected))),
    rejectsExternalOrAmbiguousOrigins: invalidOrigins.every((value) => { try { parseOrigin(value); return false; } catch { return true; } }),
    acceptsExplicitLoopback: parseOrigin("http://127.0.0.1:43210") === 43210,
    parsesEmptyChunkedBody: parseReply(Buffer.from("HTTP/1.1 303 See Other\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n"), "GET").body.length === 0,
    detectsUnexpectedHeadBytes: parseReply(Buffer.from("HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 1\r\n\r\nx"), "HEAD").body.length === 1,
    rejectsCrossOriginFrameworkRedirect: !all(evaluate({ id: "self-check", target: "/", platform: "slash" }, { status: 308, headers: { location: "https://invalid.example/" }, body: Buffer.alloc(0) }).checks),
    rejectsForeignSmokeOrigins: (["callback", "locale-default", "locale-slash"] as const).every((smoke) => !all(evaluate(
      { id: "self-check-foreign-origin", target: "/", smoke },
      { status: smoke === "locale-slash" ? 308 : 307, headers: { location: `https://invalid.example${smoke === "locale-slash" ? "/ja/login" : "/login"}${smoke === "callback" ? "?error=auth" : ""}` }, body: Buffer.alloc(0) },
    ).checks)),
    acceptsLocalSmokeRedirects: (["callback", "locale-default", "locale-slash"] as const).every((smoke) => all(evaluate(
      { id: "self-check-local-origin", target: "/", smoke },
      { status: smoke === "locale-slash" ? 308 : 307, headers: { location: `http://127.0.0.1:43210${smoke === "locale-slash" ? "/ja/login" : "/login"}${smoke === "callback" ? "?error=auth" : ""}` }, body: Buffer.alloc(0) },
    ).checks)),
    acceptsExactRelativeSmokeRedirects: (["callback", "locale-default", "locale-slash"] as const).every((smoke) => all(evaluate(
      { id: "self-check-relative-origin", target: "/", smoke },
      { status: smoke === "locale-slash" ? 308 : 307, headers: { location: `${smoke === "locale-slash" ? "/ja/login" : "/login"}${smoke === "callback" ? "?error=auth" : ""}` }, body: Buffer.alloc(0) },
    ).checks)),
    rejectsProtocolRelativeSmokeRedirect: !all(evaluate(
      { id: "self-check-network-path", target: "/", smoke: "locale-default" },
      { status: 307, headers: { location: "//invalid.example/login" }, body: Buffer.alloc(0) },
    ).checks),
    classifiesTraceSeparately: evaluate({ id: "self-check", target: "/", platform: "trace" }, { status: 500, headers: {}, body: Buffer.from("Internal Server Error") }).platformException,
    deliveredBranchStillRequiresSecurityHeaders: !all(evaluate(
      { id: "self-check-delivered", target: "/", expected: { status: 400 }, delivered: { status: 303, location: success() } },
      { status: 303, headers: { location: success() }, body: Buffer.alloc(0) },
    ).checks),
    deliveredBranchRejectsWrongCode: !all(evaluate(
      { id: "self-check-delivered-value", target: "/", expected: { status: 400 }, delivered: { status: 303, location: success("jev", "%") } },
      { status: 303, headers: { ...securityHeaders, location: success("jev", "unexpected") }, body: Buffer.alloc(0) },
    ).checks),
    rejectsReflectedFramework404: !all(evaluate(
      { id: "self-check-framework404", target: "/", platform: "normalized" },
      { status: 404, headers: { ...securityHeaders }, body: Buffer.from("synthetic-query-reflection") },
    ).checks),
    normalizedBranchStillRequiresSecurityHeaders: !all(evaluate({ id: "self-check", target: "/", platform: "normalized" }, { status: 303, headers: { location: success() }, body: Buffer.alloc(0) }).checks),
    finiteUniqueCases: cases().length > 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let origin: string | undefined;
  let output: string | undefined;
  let checkOnly = false;
  while (args.length) {
    const option = args.shift();
    if (option === "--origin" && !origin) origin = args.shift();
    else if (option === "--output" && !output) output = args.shift();
    else if (option === "--self-check" && !checkOnly) checkOnly = true;
    else throw new Error("invalid-cli-arguments");
  }
  if (!output || (!origin && !checkOnly) || (origin && checkOnly)) throw new Error("usage: --origin LOOPBACK --output NEW_JSON or --self-check --output NEW_JSON");
  const port = origin ? parseOrigin(origin) : undefined;
  // Exclusive creation happens before any requests: existing receipts survive.
  const file = await open(resolve(output), "wx", 0o600);
  try {
    const selfChecks = selfCheck();
    assert.equal(all(selfChecks), true, "assertion-self-check-failed");
    const rows: { id: string; status: number; passed: boolean; checks: Checks; platformException: boolean; normalizationAccepted: boolean; originalInputExpectationMet?: boolean }[] = [];
    if (port !== undefined) {
      for (const test of cases()) {
        try {
          const reply = await request(port, test);
          const evaluated = evaluate(test, reply, origin);
          rows.push({ id: test.id, status: reply.status, passed: all(evaluated.checks), ...evaluated,
            ...(test.delivered && test.expected ? { originalInputExpectationMet: all(appChecks(reply, test.expected)) } : {}),
          });
        } catch {
          // Never copy raw request/response/error messages to evidence.
          rows.push({ id: test.id, status: 0, passed: false, checks: { transportCompleted: false }, platformException: false, normalizationAccepted: false });
        }
      }
    }
    const report = {
      schemaVersion: 1,
      selfCheckOnly: checkOnly,
      passed: all(selfChecks) && rows.every((row) => row.passed),
      finiteCaseCount: cases().length,
      executedCaseCount: rows.length,
      selfChecks,
      limitations: {
        redirectsFollowed: false, realAuthExercised: false, browserExercised: false,
        hostedArtifactVerified: false, rawPreservationProved: false, infrastructureNonRetentionProved: false,
        serverNetworkIsolationVerifiedByThisClient: false, finalizersVerifiedByThisClient: false,
      },
      results: rows,
    };
    await file.writeFile(`${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ passed: report.passed, selfCheckOnly: checkOnly, finiteCaseCount: report.finiteCaseCount, executedCaseCount: rows.length, failedCaseIds: rows.filter((row) => !row.passed).map((row) => row.id) }));
    if (!report.passed) process.exitCode = 1;
  } finally { await file.close(); }
}
main().catch(() => { console.error("transport-verification-aborted; no request values emitted"); process.exitCode = 1; });
