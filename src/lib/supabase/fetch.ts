/** Bound Auth transport (including response bodies), preserving caller cancellation. */
export const AUTH_FETCH_TIMEOUT_MS = 10_000;
export const authFetch: typeof fetch = (input, init) => {
  const caller = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const deadline = AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: caller ? AbortSignal.any([caller, deadline]) : deadline });
};
