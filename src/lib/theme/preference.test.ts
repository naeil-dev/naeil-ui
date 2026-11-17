import { describe, expect, it, vi } from "vitest";
import { readThemePreference, themeCookieWrites, prepareThemeStorage } from "./preference";

describe("explicit theme preference", () => {
  it("accepts only one exact allowlisted value", () => {
    for (const value of ["light", "dark", "system"] as const) expect(readThemePreference(`other=x; naeil_theme_v1=${value}`)).toBe(value);
    for (const cookie of ["", "theme=light", "naeil_theme_v1", "naeil_theme_v1=", "naeil_theme_v1=LIGHT", "naeil_theme_v1=%6cight", "naeil_theme_v1=light=dark", "naeil_theme_v1=</script><script>alert(1)</script>", "naeil_theme_v1=light; naeil_theme_v1=light"]) expect(readThemePreference(cookie)).toBeUndefined();
  });
  it("shares only HTTPS naeil.dev and its subdomains", () => {
    for (const hostname of ["naeil.dev", "estimate.naeil.dev", "deep.jev.naeil.dev"]) {
      const writes = themeCookieWrites("system", { hostname, protocol: "https:" });
      expect(writes).toEqual(["naeil_theme_v1=; Path=/; Max-Age=0; Secure; SameSite=Lax", "naeil_theme_v1=system; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax"]);
      expect(themeCookieWrites("light", { hostname, protocol: "http:" })).toEqual([]);
    }
  });
  it("keeps Home, loopback, previews and deceptive suffixes host-only", () => {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]", "naeil.dev.evil.test", "notnaeil.dev", "preview.vercel.app", "jay-macmini-2.tail165003.ts.net"]) for (const protocol of ["http:", "https:"]) {
      expect(themeCookieWrites("dark", { hostname, protocol })).toEqual([`naeil_theme_v1=dark; Path=/; Max-Age=31536000; SameSite=Lax${protocol === "https:" ? "; Secure" : ""}`]);
    }
    expect(themeCookieWrites("bad" as "dark", { hostname: "naeil.dev", protocol: "https:" })).toEqual([]);
  });
});

it("seeds cookie precedence without writing cookies or broadcasting old local values", () => {
  let stored: string | null = "dark";
  const setItem = vi.fn((_key: string, value: string) => { stored = value; });
  const document = { cookie: "naeil_theme_v1=light" };
  vi.stubGlobal("document", document);
  vi.stubGlobal("localStorage", { getItem: () => stored, setItem });
  try {
    prepareThemeStorage(readThemePreference);
    expect(stored).toBe("light");
    expect(document.cookie).toBe("naeil_theme_v1=light");
    document.cookie = ""; stored = "dark"; setItem.mockClear();
    prepareThemeStorage(readThemePreference);
    expect(stored).toBe("dark"); expect(setItem).not.toHaveBeenCalled(); expect(document.cookie).toBe("");
    document.cookie = "naeil_theme_v1=invalid";
    prepareThemeStorage(readThemePreference); expect(setItem).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
