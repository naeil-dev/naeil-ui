import { afterEach, expect, it, vi } from "vitest";
import { authEmailEnabled, inviteAcceptanceEnabled } from "../feature-gates";
import { readInviteConfig } from "../invite-config";

afterEach(() => vi.unstubAllEnvs());

it.each([
  undefined,
  "",
  "false",
  "TRUE",
  "True",
  "1",
  " true",
  "true ",
  "true\n",
  "{}",
])(
  "fails closed for both opt-ins (%s), even with public lookalikes",
  (value) => {
    vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", value);
    vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", value);
    vi.stubEnv("NEXT_PUBLIC_NAEIL_AUTH_EMAIL_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_NAEIL_INVITE_ACCEPT_ENABLED", "true");
    expect(authEmailEnabled()).toBe(false);
    expect(inviteAcceptanceEnabled()).toBe(false);
  },
);
it("reads independent exact opt-ins on each call", () => {
  vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "true");
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "false");
  expect(authEmailEnabled()).toBe(true);
  expect(inviteAcceptanceEnabled()).toBe(false);
  vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "false");
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true");
  expect(authEmailEnabled()).toBe(false);
  expect(inviteAcceptanceEnabled()).toBe(true);
});
it("keeps the existing private exact-key JSON contract", () => {
  const config = {
    siteOrigin: "https://naeil.dev",
    supabaseUrl: "https://fixture.supabase.co",
    anonKey: "fixture-anon",
    serviceRoleKey: "fixture-service",
    transactionStore: "supabase",
    encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
  };
  vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", "");
  vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "true");
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true");
  vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", JSON.stringify(config));
  expect(readInviteConfig()).toEqual(config);
  for (const key of [
    "emailEnabled",
    "inviteAcceptanceEnabled",
    "NAEIL_AUTH_EMAIL_ENABLED",
    "NAEIL_INVITE_ACCEPT_ENABLED",
  ]) {
    vi.stubEnv(
      "NAEIL_INVITE_CONFIG_JSON",
      JSON.stringify({ ...config, [key]: true }),
    );
    expect(readInviteConfig()).toBeNull();
  }
});
