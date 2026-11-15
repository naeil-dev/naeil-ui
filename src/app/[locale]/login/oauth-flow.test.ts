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

  it('uses the shared cell lock across callbacks recreated during a pending login', async () => {
    let state: OAuthState = {status: 'idle'};
    let finish!: (value: {error: unknown}) => void;
    const request = vi.fn(() => new Promise<{error: unknown}>(done => { finish=done; }));
    const callback = () => createOAuthFlow(request, value => { state=value; }, () => state.status !== 'pending');
    const first=callback()('google');
    await callback()('github');
    expect(request).toHaveBeenCalledTimes(1);
    finish({error: new Error('private detail')}); await first;
    expect(state).toEqual({status:'error'});
    const retry=callback()('github');
    expect(request).toHaveBeenCalledTimes(2);
    finish({error:null}); await retry;
    expect(state).toEqual({status:'pending',provider:'github'});
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
