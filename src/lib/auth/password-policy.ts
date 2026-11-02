import { authLocale } from "./return-location";

export type AuthUser = { id: string; app_metadata?: Record<string, unknown> };
export const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function temporaryMarker(user: AuthUser) {
  const m = user.app_metadata?.console_temp;
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const v = m as Record<string, unknown>;
  return typeof v.must_change === "boolean" &&
    Number.isInteger(v.generation) &&
    Number(v.generation) > 0 &&
    Number(v.generation) <= 2147483647 &&
    typeof v.issued_at === "string" &&
    Number.isFinite(Date.parse(v.issued_at)) &&
    Date.parse(v.issued_at) <= Date.now() &&
    typeof v.locked === "boolean" &&
    typeof v.operation_id === "string" &&
    UUID.test(v.operation_id)
    ? v
    : null;
}
export function requiresPasswordChange(user: AuthUser | null) {
  if (!user || !Object.hasOwn(user.app_metadata || {}, "console_temp"))
    return false;
  const m = temporaryMarker(user);
  return !m || m.must_change !== false || m.locked === true;
}
export function passwordChangePath(locale: unknown) {
  return `/${authLocale(locale)}/login/change-password`;
}
export function loginEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
    ? email
    : null;
}

export function temporaryChangeExpired(user: AuthUser, now = Date.now()) {
  const m = temporaryMarker(user);
  return (
    !m ||
    m.locked === true ||
    Date.parse(String(m.issued_at)) + 7 * 86400_000 <= now
  );
}
