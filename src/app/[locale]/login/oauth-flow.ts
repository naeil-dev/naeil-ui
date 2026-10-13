export type OAuthProvider = "google" | "github";
export type OAuthState =
  | { status: "idle" }
  | { status: "pending"; provider: OAuthProvider }
  | { status: "error" };

/** Keep a successful request pending until Supabase redirects the browser. */
export function createOAuthFlow(
  request: (provider: OAuthProvider) => Promise<{ error: unknown }>,
  onState: (state: OAuthState) => void,
) {
  let inFlight = false;

  return async (provider: OAuthProvider) => {
    if (inFlight) return;
    inFlight = true;
    onState({ status: "pending", provider });

    try {
      const result = await request(provider);
      if (!result.error) return;
    } catch {
      // Provider/server details are not useful recovery instructions.
    }

    inFlight = false;
    onState({ status: "error" });
  };
}
