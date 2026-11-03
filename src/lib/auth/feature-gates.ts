import "server-only";

// Runtime opt-ins, separate from the exact-key private credential config.
// Do not normalize values or use a public/client-side fallback.
export function authEmailEnabled(): boolean {
  return process.env.NAEIL_AUTH_EMAIL_ENABLED === "true";
}

export function inviteAcceptanceEnabled(): boolean {
  return process.env.NAEIL_INVITE_ACCEPT_ENABLED === "true";
}
