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

// This file is read only by the Node route. No public environment credential fallback.
export function readInviteConfig(
  path = process.env.NAEIL_INVITE_CONFIG_FILE,
): InviteConfig | null {
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
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.keys(data).sort().join(",") !==
        "anonKey,serviceRoleKey,siteOrigin,supabaseUrl"
    )
      return null;
    if (!exactOrigin(data.siteOrigin) || !exactOrigin(data.supabaseUrl))
      return null;
    for (const key of ["anonKey", "serviceRoleKey"]) {
      if (
        typeof data[key] !== "string" ||
        !data[key] ||
        data[key].length > 8192 ||
        /[\s\x00-\x1f\x7f]/.test(data[key])
      )
        return null;
    }
    return data;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
