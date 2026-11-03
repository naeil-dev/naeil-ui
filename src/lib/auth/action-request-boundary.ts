import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { locales } from "@/i18n/config";
import { authEmailEnabled } from "./feature-gates";

const ACTION_ID = /^[a-f0-9]{42}$/;
type Segment = { literal: string } | { dynamic: true };
type Action = { name: string; owners: Segment[][] };
type Policy = Map<string, Action>;
let productionPolicy: Promise<Policy | null> | undefined;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Next 16.1.7 app worker grammar, deliberately narrower than arbitrary routes.
// Unknown future grammar requires review, never a permissive matcher fallback.
function workerSegments(worker: string): Segment[] {
  const parts = worker.split("/");
  if (parts.shift() !== "app" || parts.pop() !== "page") throw new Error("Unsupported action worker");
  const route = parts.filter(part => !/^\([A-Za-z0-9_-]+\)$/.test(part));
  if (route.shift() !== "[locale]") throw new Error("Unsupported action locale");
  return route.map(part => {
    if (/^\[[A-Za-z_][A-Za-z0-9_]*\]$/.test(part)) return { dynamic: true };
    if (/^[A-Za-z0-9_-]+$/.test(part)) return { literal: part };
    throw new Error("Unsupported action segment");
  });
}

function parsePolicy(value: unknown): Policy {
  if (!record(value) || !record(value.node) || !record(value.edge) || Object.keys(value.edge).length) {
    throw new Error("Unsupported action manifest");
  }
  const policy: Policy = new Map();
  for (const [id, entry] of Object.entries(value.node)) {
    if (!ACTION_ID.test(id) || !record(entry) || typeof entry.exportedName !== "string" ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(entry.exportedName) || !record(entry.workers)) {
      throw new Error("Unsupported action entry");
    }
    const owners = Object.entries(entry.workers).map(([worker, metadata]) => {
      if (!record(metadata) || typeof metadata.async !== "boolean" ||
          !(typeof metadata.moduleId === "string" && metadata.moduleId.length > 0 ||
            typeof metadata.moduleId === "number" && Number.isSafeInteger(metadata.moduleId) && metadata.moduleId >= 0)) {
        throw new Error("Unsupported action metadata");
      }
      return workerSegments(worker);
    });
    if (!owners.length) throw new Error("Action has no owner");
    policy.set(id, { name: entry.exportedName, owners });
  }
  return policy;
}

async function readPolicy(): Promise<Policy | null> {
  try {
    // Next config compiles the actual dist/dev path into this server-only module.
    // No search of parent workspaces, source .next, or public policy fallback.
    const manifestPath = process.env.NAEIL_ACTION_MANIFEST_PATH;
    if (!manifestPath) return null;
    return parsePolicy(JSON.parse(await readFile(join(process.cwd(), manifestPath), "utf8")));
  } catch {
    // Never expose artifact contents, paths or the manifest's encryption key.
    return null;
  }
}

function policy(): Promise<Policy | null> {
  if (process.env.NODE_ENV !== "production") return readPolicy();
  return productionPolicy ??= readPolicy();
}

function ownsPath(owners: Segment[][], pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.includes("//")) return false;
  const path = pathname === "/" ? "" : pathname.slice(1).replace(/\/$/, "");
  const parts = path ? path.split("/") : [];
  if (locales.some(locale => locale === parts[0])) parts.shift();
  return owners.some(owner => owner.length === parts.length && owner.every((segment, index) => {
    if ("literal" in segment) return segment.literal === parts[index];
    try {
      const decoded = decodeURIComponent(parts[index]);
      return decoded.length > 0 && decoded !== "." && decoded !== ".." &&
        !/[/\\%\[\]\u0000-\u001f\u007f-\u009f]/.test(decoded);
    } catch { return false; }
  }));
}

function reject(status: number, result: string, stale = false): NextResponse {
  return NextResponse.json({ status: result }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(stale ? { "x-nextjs-action-not-found": "1" } : {}),
    },
  });
}

export async function actionRequestBoundary(request: NextRequest): Promise<NextResponse | null> {
  if (request.method !== "POST" || !request.headers.has("next-action")) return null;
  const id = request.headers.get("next-action")!;
  if (!ACTION_ID.test(id)) return reject(400, "invalidAction");
  const actions = await policy();
  if (!actions) return reject(503, "actionUnavailable");
  const action = actions.get(id);
  if (!action) return reject(404, "invalidAction", true);
  if (!request.headers.has("x-action-forwarded") && ownsPath(action.owners, new URL(request.url).pathname)) return null;
  const paused = !authEmailEnabled() && ["emailLogin", "requestPasswordCode"].includes(action.name);
  return reject(409, paused ? "mailPaused" : "invalidActionRoute");
}
