import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type { Transaction } from "./invite";

export type InvitePhase =
  | "empty"
  | "staged"
  | "verifying"
  | "candidate"
  | "verified"
  | "recorded"
  | "complete"
  | "invalid"
  | "uncertain";
type Rpc = (
  action: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
type Row = {
  revision: number;
  fence: number;
  phase: InvitePhase;
  payload: string;
  expiresAt: string;
  leaseUntil: string | null;
};
const phases: InvitePhase[] = [
  "empty",
  "staged",
  "verifying",
  "candidate",
  "verified",
  "recorded",
  "complete",
  "invalid",
  "uncertain",
];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const safe = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const validIdentity = (v: unknown): boolean =>
  object(v) &&
  uuid(v.userId) &&
  uuid(v.sessionId) &&
  typeof v.accessToken === "string" &&
  v.accessToken.length > 0 &&
  v.accessToken.length <= 16384;

/** Non-authoritative resend identity. It cannot recover or authorize a proof. */
export function inviteProofIdentity(proof: NonNullable<Transaction["proof"]>) {
  return {
    id: proof.id,
    version: proof.version,
    fingerprint: createHash("sha256")
      .update(
        JSON.stringify({
          id: proof.id,
          version: proof.version,
          nonce: proof.nonce,
          token_hash: proof.token_hash,
        }),
      )
      .digest("hex"),
  };
}

function readRow(value: Record<string, unknown>): Row | null {
  if (value.found === false && Object.keys(value).length === 1) return null;
  if (
    value.found !== true ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !Number.isSafeInteger(value.fence) ||
    Number(value.fence) < 0 ||
    !phases.includes(value.phase as InvitePhase) ||
    typeof value.payload !== "string" ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !(
      value.leaseUntil === null ||
      (typeof value.leaseUntil === "string" &&
        Number.isFinite(Date.parse(value.leaseUntil)))
    )
  )
    throw new Error("Invitation store unavailable");
  return value as unknown as Row;
}

/** One request's fenced view. It never retries a mutation with an unknown result. */
export class InviteStore {
  private readonly fingerprint: string;
  private readonly key: Buffer;
  private readonly owner = randomUUID();
  private row: Row | null = null;
  private claimed = false;
  private mutationUnknown = false;
  constructor(
    handle: string,
    encryptionKey: string,
    private readonly rpc: Rpc,
  ) {
    this.fingerprint = createHash("sha256").update(handle).digest("hex");
    this.key = Buffer.from(encryptionKey, "base64url");
    if (
      this.key.length !== 32 ||
      this.key.toString("base64url") !== encryptionKey
    )
      throw new Error("Invitation store unavailable");
  }
  get phase(): InvitePhase {
    if (!this.row) throw new Error("Invitation store unavailable");
    return this.row.phase;
  }
  get canWrite(): boolean {
    return this.claimed && !this.mutationUnknown;
  }
  private aad() {
    return Buffer.from(`naeil-invite-v1:${this.fingerprint}`);
  }
  private seal(t: Transaction): string {
    const snapshot = {
      csrf: t.csrf,
      proof: t.proof,
      proofIdentity: t.proofIdentity,
      candidate: t.candidate,
      verified: t.verified,
      receiptRecorded: t.receiptRecorded,
      links: t.links,
      invalid: t.invalid,
      uncertain: t.uncertain,
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(this.aad());
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(snapshot), "utf8"),
      cipher.final(),
    ]);
    const value = `v1.${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")}`;
    if (value.length > 32768) throw new Error("Invitation store unavailable");
    return value;
  }
  private open(row: Row): Transaction {
    if (!/^v1\.[A-Za-z0-9_-]{40,32765}$/.test(row.payload))
      throw new Error("Invitation store unavailable");
    const bytes = Buffer.from(row.payload.slice(3), "base64url");
    if (
      bytes.toString("base64url") !== row.payload.slice(3) ||
      bytes.length < 29
    )
      throw new Error("Invitation store unavailable");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      bytes.subarray(0, 12),
    );
    decipher.setAAD(this.aad());
    decipher.setAuthTag(bytes.subarray(12, 28));
    const raw = Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]);
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(raw),
    );
    if (
      !object(value) ||
      !safe(value.csrf) ||
      Object.keys(value).some(
        (key) =>
          ![
            "csrf",
            "proof",
            "proofIdentity",
            "candidate",
            "verified",
            "receiptRecorded",
            "links",
            "invalid",
            "uncertain",
          ].includes(key),
      )
    )
      throw new Error("Invitation store unavailable");
    if (
      value.proofIdentity !== undefined &&
      (!object(value.proofIdentity) ||
        Object.keys(value.proofIdentity).sort().join(",") !==
          "fingerprint,id,version" ||
        !uuid(value.proofIdentity.id) ||
        !Number.isSafeInteger(value.proofIdentity.version) ||
        Number(value.proofIdentity.version) < 1 ||
        typeof value.proofIdentity.fingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.proofIdentity.fingerprint))
    )
      throw new Error("Invitation store unavailable");
    if (
      value.proof !== undefined &&
      (!object(value.proof) ||
        !uuid(value.proof.id) ||
        !Number.isSafeInteger(value.proof.version) ||
        Number(value.proof.version) < 1 ||
        typeof value.proof.nonce !== "string" ||
        !/^[A-Za-z0-9_-]{32,256}$/.test(value.proof.nonce) ||
        typeof value.proof.token_hash !== "string" ||
        !/^[A-Za-z0-9_-]{32,512}$/.test(value.proof.token_hash))
    )
      throw new Error("Invitation store unavailable");
    if (
      value.candidate !== undefined &&
      (!validIdentity(value.candidate) ||
        !object(value.candidate) ||
        typeof value.candidate.email !== "string" ||
        value.candidate.email.length > 254)
    )
      throw new Error("Invitation store unavailable");
    if (value.verified !== undefined && !validIdentity(value.verified))
      throw new Error("Invitation store unavailable");
    if (value.receiptRecorded !== undefined && value.receiptRecorded !== true)
      throw new Error("Invitation store unavailable");
    if (
      value.links !== undefined &&
      (!Array.isArray(value.links) ||
        value.links.length < 1 ||
        value.links.length > 2 ||
        value.links.some(
          (v) =>
            !object(v) ||
            !(
              (v.label === "JEV" && v.href === "https://jev.naeil.dev/") ||
              (v.label === "AB Estimate" &&
                v.href === "https://abestimate.naeil.dev/")
            ),
        ))
    )
      throw new Error("Invitation store unavailable");
    const t = { ...value, expires: Date.parse(row.expiresAt) } as Transaction;
    if (t.proof) {
      const identity = inviteProofIdentity(t.proof);
      if (
        t.proofIdentity &&
        (t.proofIdentity.id !== identity.id ||
          t.proofIdentity.version !== identity.version ||
          t.proofIdentity.fingerprint !== identity.fingerprint)
      )
        throw new Error("Invitation store unavailable");
      t.proofIdentity = identity;
    }
    const matches =
      row.phase === "empty"
        ? !t.proof && !t.links
        : ["staged", "verifying"].includes(row.phase)
          ? !!t.proof && !t.candidate && !t.verified
          : row.phase === "candidate"
            ? !!t.proof && !!t.candidate && !t.verified
            : row.phase === "verified"
              ? !!t.proof && !!t.verified && !t.receiptRecorded
              : row.phase === "recorded"
                ? !!t.proof && !!t.verified && t.receiptRecorded === true
                : row.phase === "complete"
                  ? !!t.links && !t.proof && !t.verified && !t.candidate
                  : true;
    if (!matches) throw new Error("Invitation store unavailable");
    if (row.phase === "invalid" || row.phase === "uncertain") {
      t.proof = undefined;
      t.candidate = undefined;
      t.verified = undefined;
      t.receiptRecorded = undefined;
      t.links = undefined;
      t.invalid = row.phase === "invalid";
      t.uncertain = row.phase === "uncertain";
    }
    return t;
  }
  async read(): Promise<Transaction | undefined> {
    this.row = readRow(
      await this.rpc("read", { p_handle_hash: this.fingerprint }),
    );
    return this.row ? this.open(this.row) : undefined;
  }
  async create(t: Transaction): Promise<Transaction> {
    this.row = readRow(
      await this.rpc("create", {
        p_handle_hash: this.fingerprint,
        p_payload: this.seal(t),
      }),
    );
    if (!this.row) throw new Error("Invitation store unavailable");
    return this.open(this.row);
  }
  async claim(): Promise<Transaction> {
    if (!this.row) throw new Error("Invitation store unavailable");
    this.row = readRow(
      await this.rpc("claim", {
        p_handle_hash: this.fingerprint,
        p_expected_revision: this.row.revision,
        p_owner: this.owner,
      }),
    );
    if (!this.row) throw new Error("Invitation store unavailable");
    this.claimed = true;
    return this.open(this.row);
  }
  async checkpoint(t: Transaction, phase: InvitePhase): Promise<void> {
    if (!this.claimed || !this.row || this.mutationUnknown)
      throw new Error("Invitation store unavailable");
    const args = {
      p_handle_hash: this.fingerprint,
      p_expected_revision: this.row.revision,
      p_owner: this.owner,
      p_fence: this.row.fence,
      p_phase: phase,
      p_payload: this.seal(t),
    };
    // A lost response may already have advanced the revision. Never release or
    // rewrite using an assumed phase; the next request must read committed truth.
    this.mutationUnknown = true;
    const next = readRow(await this.rpc("checkpoint", args));
    if (
      !next ||
      next.phase !== phase ||
      next.revision !== this.row.revision + 1 ||
      next.fence !== this.row.fence ||
      next.expiresAt !== this.row.expiresAt
    )
      throw new Error("Invitation store unavailable");
    this.row = next;
    this.mutationUnknown = false;
  }
  async release(): Promise<void> {
    if (!this.claimed || !this.row || this.mutationUnknown) return;
    this.claimed = false;
    await this.rpc("release", {
      p_handle_hash: this.fingerprint,
      p_expected_revision: this.row.revision,
      p_owner: this.owner,
      p_fence: this.row.fence,
    });
  }
}
