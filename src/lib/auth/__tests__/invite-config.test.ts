import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  symlinkSync,
  rmSync,
  realpathSync,
  linkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { readInviteConfig } from "../invite-config";
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});
function file(data: unknown, mode = 0o600) {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), "invite-config-"));
  dirs.push(dir);
  const path = join(dir, "private.json");
  writeFileSync(path, JSON.stringify(data), { mode });
  return path;
}
const valid = {
  siteOrigin: "https://naeil.dev",
  supabaseUrl: "https://fixture.supabase.co",
  anonKey: "fixture-anon",
  serviceRoleKey: "fixture-service",
};
describe("private invite config", () => {
  it("defaults off and returns a sanitized failure for unsafe files", () => {
    expect(readInviteConfig(undefined)).toBeNull();
    const path = file(valid, 0o644);
    expect(readInviteConfig(path)).toBeNull();
    chmodSync(path, 0o600);
    expect(readInviteConfig(path)).toEqual(valid);
    const link = join(dirs[0], "link");
    symlinkSync(path, link);
    expect(readInviteConfig(link)).toBeNull();
    expect(readInviteConfig(dirs[0])).toBeNull();
  });
  it.each([
    { ...valid, siteOrigin: "http://naeil.dev" },
    { ...valid, siteOrigin: "https://naeil.dev/path" },
    { ...valid, supabaseUrl: "http://evil.example" },
    { ...valid, other: true },
    { ...valid, anonKey: "" },
    { ...valid, siteOrigin: "https://u:p@naeil.dev" },
    { ...valid, supabaseUrl: "https://x.test/#oops" },
  ])("rejects malformed config %#", (data) =>
    expect(readInviteConfig(file(data))).toBeNull(),
  );
  it("permits only explicit loopback HTTP and rejects oversized configuration", () => {
    expect(
      readInviteConfig(
        file({
          ...valid,
          siteOrigin: "http://127.0.0.1:2482",
          supabaseUrl: "http://localhost:54321",
        }),
      ),
    ).not.toBeNull();
    expect(
      readInviteConfig(file({ ...valid, anonKey: "x".repeat(20000) })),
    ).toBeNull();
  });
});

describe("private config path ownership", () => {
  it("rejects relative paths, symlink parents, hardlinks, and repository files", () => {
    const path = file(valid);
    expect(readInviteConfig(relative(process.cwd(), path))).toBeNull();
    const parent = join(dirs[0], "alias");
    symlinkSync(dirs[0], parent);
    expect(readInviteConfig(join(parent, "private.json"))).toBeNull();
    const hardlink = join(dirs[0], "hardlink");
    linkSync(path, hardlink);
    expect(readInviteConfig(hardlink)).toBeNull();
    const repo = mkdtempSync(join(process.cwd(), ".invite-private-test-"));
    dirs.push(repo);
    const inrepo = join(repo, "private.json");
    writeFileSync(inrepo, JSON.stringify(valid), { mode: 0o600 });
    expect(readInviteConfig(inrepo)).toBeNull();
  });
});
