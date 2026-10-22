import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  constants,
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  lstatSync,
} from "node:fs";

export interface InviteConfig {
  siteOrigin: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  transactionStore?: "supabase";
  encryptionKey?: string;
}

function exactOrigin(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 512 || /[\s\\]/.test(value))
    return false;
  try {
    const u = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    return (
      u.origin === value &&
      !u.username &&
      !u.password &&
      (u.protocol === "https:" || (u.protocol === "http:" && loopback))
    );
  } catch {
    return false;
  }
}

function parseConfig(raw: string, jsonSource: boolean): InviteConfig | null {
  if (Buffer.byteLength(raw, "utf8") > 16384) return null;
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const keys = [...raw.matchAll(/("(?:\\.|[^"\\])*")\s*:/g)].map((m) =>
    JSON.parse(m[1]),
  );
  if (keys.length !== new Set(keys).size) return null;
  const durable = value.transactionStore === "supabase";
  const expected =
    "anonKey,serviceRoleKey,siteOrigin,supabaseUrl" +
    (durable ? ",transactionStore,encryptionKey" : "");
  if (
    Object.keys(value).sort().join(",") !== expected.split(",").sort().join(",")
  )
    return null;
  if ((jsonSource || process.env.VERCEL) && !durable) return null;
  if (!exactOrigin(value.siteOrigin) || !exactOrigin(value.supabaseUrl))
    return null;
  for (const key of ["anonKey", "serviceRoleKey"]) {
    if (
      typeof value[key] !== "string" ||
      !value[key] ||
      value[key].length > 8192 ||
      /[\s\x00-\x1f\x7f]/.test(value[key])
    )
      return null;
  }
  if (durable) {
    const key = value.encryptionKey;
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(key))
      return null;
    const bytes = Buffer.from(key, "base64url");
    if (
      bytes.length !== 32 ||
      bytes.toString("base64url") !== key ||
      bytes.every((b) => b === 0) ||
      key === value.anonKey ||
      key === value.serviceRoleKey
    )
      return null;
  }
  return value as unknown as InviteConfig;
}

// Server runtime only. Neither source has a public environment fallback.
export function readInviteConfig(
  path = process.env.NAEIL_INVITE_CONFIG_FILE,
): InviteConfig | null {
  const json = process.env.NAEIL_INVITE_CONFIG_JSON;
  if (json) {
    if (path) return null;
    try {
      return parseConfig(json, true);
    } catch {
      return null;
    }
  }
  if (!path || !isAbsolute(path) || path !== resolve(path)) return null;
  let fd: number | undefined;
  try {
    const repository = realpathSync(process.cwd());
    const inside = relative(repository, path);
    if (
      inside === "" ||
      (!inside.startsWith(".." + sep) && inside !== ".." && !isAbsolute(inside))
    )
      return null;
    let component = path;
    while (true) {
      if (lstatSync(component).isSymbolicLink()) return null;
      const parent = dirname(component);
      if (parent === component) break;
      component = parent;
    }
    if (realpathSync(path) !== path) return null;
    fd = openSync(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const st = fstatSync(fd);
    if (
      !st.isFile() ||
      st.nlink !== 1 ||
      st.uid !== process.getuid?.() ||
      (st.mode & 0o777) !== 0o600 ||
      st.size > 16384 ||
      st.size === 0
    )
      return null;
    const named = lstatSync(path);
    if (
      realpathSync(path) !== path ||
      named.dev !== st.dev ||
      named.ino !== st.ino
    )
      return null;
    const buffer = Buffer.alloc(16385);
    const length = readSync(fd, buffer, 0, buffer.length, 0);
    if (length > 16384) return null;
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(
      buffer.subarray(0, length),
    );
    return parseConfig(raw, false);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
