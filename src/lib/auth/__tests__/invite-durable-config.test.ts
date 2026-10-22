import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInviteConfig } from "../invite-config";

const key = Buffer.alloc(32, 7).toString("base64url");
const config = {
  siteOrigin: "https://naeil.dev",
  supabaseUrl: "https://fictional.supabase.co",
  anonKey: "fictional-anon",
  serviceRoleKey: "fictional-service",
  transactionStore: "supabase",
  encryptionKey: key,
};
const dirs: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
});
function env(raw: string, vercel = "1") {
  vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", "");
  vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", raw);
  vi.stubEnv("VERCEL", vercel);
}
describe("private durable invitation config", () => {
  it("loads explicit private JSON in Vercel without a file or public secrets", () => {
    env(JSON.stringify(config));
    expect(readInviteConfig()).toEqual(config);
  });
  it.each([
    { ...config, transactionStore: "memory" },
    { ...config, transactionStore: undefined },
    { ...config, encryptionKey: undefined },
    { ...config, encryptionKey: "short" },
    { ...config, encryptionKey: key + "=" },
    { ...config, encryptionKey: Buffer.alloc(32).toString("base64url") },
    { ...config, serviceRoleKey: key },
    { ...config, NEXT_PUBLIC_encryptionKey: key },
    { ...config, other: true },
  ])("fails closed on unsafe or incomplete JSON %#", (value) => {
    env(JSON.stringify(value));
    expect(readInviteConfig()).toBeNull();
  });
  it.each([
    "{",
    "null",
    JSON.stringify(config).replace(
      '"transactionStore":',
      '"transactionStore":"memory","transactionStore":',
    ),
    JSON.stringify(config).replace(
      '"anonKey":',
      '"\\u0061nonKey":"different","anonKey":',
    ),
    JSON.stringify(config) + " ".repeat(20000),
  ])("rejects malformed, duplicate and oversized JSON %#", (raw) => {
    env(raw);
    expect(readInviteConfig()).toBeNull();
  });
  it("rejects conflicting sources rather than choosing one or falling back", () => {
    const dir = mkdtempSync(
      join(realpathSync(tmpdir()), "invite-durable-config-"),
    );
    dirs.push(dir);
    const path = join(dir, "private.json");
    writeFileSync(path, JSON.stringify(config), { mode: 0o600 });
    env(JSON.stringify(config));
    vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", path);
    expect(readInviteConfig()).toBeNull();
    env("{");
    expect(readInviteConfig(path)).toBeNull();
    vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", "");
    expect(readInviteConfig(path)).toEqual(config);
    chmodSync(path, 0o644);
    expect(readInviteConfig(path)).toBeNull();
  });
  it("refuses legacy file memory mode in Vercel while retaining it locally", () => {
    const dir = mkdtempSync(
      join(realpathSync(tmpdir()), "invite-durable-config-"),
    );
    dirs.push(dir);
    const path = join(dir, "private.json");
    const legacy = {
      siteOrigin: config.siteOrigin,
      supabaseUrl: config.supabaseUrl,
      anonKey: config.anonKey,
      serviceRoleKey: config.serviceRoleKey,
    };
    writeFileSync(path, JSON.stringify(legacy), { mode: 0o600 });
    env("");
    expect(readInviteConfig(path)).toBeNull();
    vi.stubEnv("VERCEL", "");
    expect(readInviteConfig(path)).toEqual(legacy);
  });
});
