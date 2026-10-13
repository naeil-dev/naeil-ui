import { describe, expect, it, vi } from "vitest";
import { createOAuthFlow, type OAuthState } from "./oauth-flow";

describe("OAuth sign-in recovery", () => {
  it("prevents overlapping provider requests and remains busy until navigation", async () => {
    let resolve!: (result: { error: unknown }) => void;
    const request = vi.fn(
      () =>
        new Promise<{ error: unknown }>((done) => {
          resolve = done;
        }),
    );
    const states: OAuthState[] = [];
    const start = createOAuthFlow(request, (state) => states.push(state));

    const first = start("google");
    await start("github");
    expect(request).toHaveBeenCalledTimes(1);
    expect(states).toEqual([{ status: "pending", provider: "google" }]);

    resolve({ error: null });
    await first;
    await start("github");
    expect(request).toHaveBeenCalledTimes(1);
    expect(states.at(-1)?.status).toBe("pending");
  });

  it.each(["response", "throw"])(
    "allows a different provider after a %s failure without exposing details",
    async (failure) => {
      const privateError = new Error("provider-specific server details");
      const request = vi.fn().mockResolvedValue({ error: null });
      if (failure === "throw") request.mockRejectedValueOnce(privateError);
      else request.mockResolvedValueOnce({ error: privateError });
      const states: OAuthState[] = [];
      const start = createOAuthFlow(request, (state) => states.push(state));

      await start("google");
      expect(states.at(-1)).toEqual({ status: "error" });
      await start("github");
      expect(request).toHaveBeenLastCalledWith("github");
      expect(states.at(-1)).toEqual({ status: "pending", provider: "github" });
      expect(JSON.stringify(states)).not.toContain(privateError.message);
    },
  );
});
