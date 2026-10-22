type Service = "console";
type Options = {
  siteAuthority: string;
  destinations: Readonly<Record<Service, string>>;
};

const NONCE = /^[A-Za-z0-9_-]{43}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
};
type Field = { rawKey: string; key: string; value: string };
type ReturnRequest = Pick<Request, "url" | "method" | "headers">;

export function serviceReturnHeaders(): Headers {
  return new Headers(HEADERS);
}

function response(status: number, extra?: Record<string, string>): Response {
  return new Response(null, { status, headers: { ...HEADERS, ...extra } });
}

// Recognition only: aliases reach the same protected rejection boundary. They
// never become canonical routes or gain authority through decoded path text.
export function isServiceReturnPath(pathname: string): boolean {
  let path = pathname;
  while (true) {
    // Treat literal or decoded backslashes as separators for recognition only.
    if (/(?:^|\/)(?:auth\/return|api\/internal\/service-return)(?:[/%.;]|$)/i.test(path.replace(/\\/g, "/"))) return true;
    // Conservative ASCII recognition only, including valid escapes adjacent to
    // malformed UTF-8/percent tails. Decoding can only cause protected rejection;
    // the exact canonical spelling still controls which route may relay.
    const decoded = path.replace(/%([0-9a-f]{2})/gi, (_escape, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
    if (decoded === path) return false;
    path = decoded;
  }
}

export function isCanonicalServiceReturnPath(pathname: string): boolean {
  return /^\/auth\/return\/console$/.test(pathname);
}

function createHandler({ siteAuthority, destinations }: Options, service?: Service): (request: ReturnRequest) => Response {
  // Capture the code-owned map, so changing a test's input object after factory
  // creation cannot change an already constructed handler's destinations.
  const targets = new Map((["console"] as const).map((service) => [`/auth/return/${service}`, destinations[service]]));
  return (request) => {
    if (request.headers.get("host") !== siteAuthority) return response(403);
    if (request.method !== "GET") return response(405, { Allow: "GET" });
    // Validate the delivered string before any URL/Request construction can
    // remove controls, trim spaces, encode apostrophes or normalize dot paths.
    if (CONTROL.test(request.url) || request.url.includes("#")) return response(400);
    const delivered = /^https?:\/\/[^/?#]+([^?#]*)(?:\?([^#]*))?$/.exec(request.url);
    const path = delivered?.[1] ?? "";
    const target = targets.get(path);
    if (!target || (service !== undefined && path !== `/auth/return/${service}`)) return response(404);

    const rawQuery = delivered?.[2] ?? "";
    if (new TextEncoder().encode(rawQuery).byteLength > 16384) return response(400);
    let fields: Field[];
    try {
      const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, " "));
      fields = rawQuery.split("&").map((pair) => {
        const equals = pair.indexOf("=");
        const rawKey = equals < 0 ? pair : pair.slice(0, equals);
        return { rawKey, key: decode(rawKey), value: decode(equals < 0 ? "" : pair.slice(equals + 1)) };
      });
    } catch { return response(400); }

    // Count decoded aliases before considering the raw nonce spelling. No
    // malformed or ambiguous binding is forwarded to a consuming finalizer.
    const nonces = fields.filter(({ key }) => key === "nonce");
    if (nonces.length !== 1 || nonces[0].rawKey !== "nonce" || !NONCE.test(nonces[0].value)) return response(400);
    const nonce = nonces[0].value;
    const output = new URLSearchParams({ nonce });
    const values = new Map(fields.map(({ key, value }) => [key, value]));
    const canonical = fields.every(({ rawKey, key, value }) => rawKey === key && !CONTROL.test(key) && !CONTROL.test(value)) && values.size === fields.length;
    const bounded = (value: string | undefined, nonempty = false) => value !== undefined && (!nonempty || value.length > 0) && Array.from(value).length <= 4096;
    const success = canonical && fields.length === 2 && bounded(values.get("code"), true);
    if (success) output.set("code", values.get("code")!);
    else {
      // Valid provider errors and all bound malformed fields have the same
      // data-free result; supplied errors/descriptions are never forwarded.
      output.set("error", "authentication_failed");
    }
    // A literal empty fragment prevents RFC redirect fragment inheritance.
    return response(303, { Location: `${target}?${output.toString()}#` });
  };
}
// Keep the pure factory available for proxy guards and isolated transport tests.
export function createServiceReturnHandler(options: Options): (request: ReturnRequest) => Response {
  return createHandler(options);
}

const PRODUCTION_OPTIONS: Options = {
  siteAuthority: "naeil.dev",
  destinations: {
    console: "https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback",
  },
};

export const serviceReturnHandler = createServiceReturnHandler(PRODUCTION_OPTIONS);

// Public adapters choose their binding in code, never from request input. The
// same strict parser must reject a different service even if its URL is valid.
export function createServiceReturnRouteHandler(service: Service): (request: ReturnRequest) => Response {
  return createHandler(PRODUCTION_OPTIONS, service);
}
