/** Safe structured diagnostics: never retain provider bodies, URLs or DOM text. */
export class VerificationError extends Error {
  constructor(stage, reasonCode, { status = null, timeout = false, retryable = false, manualRecovery = false } = {}) {
    super(`${stage}: ${reasonCode}`);
    this.name = 'VerificationError';
    Object.assign(this, { stage, reasonCode, status, timeout, retryable, manualRecovery });
  }
}

export function requireHTTP(response, stage, expected = 200) {
  const status = typeof response?.status === 'function' ? response.status() : response?.status;
  if (status === expected) return;
  const retryable = [403, 408, 425, 429].includes(status) || status >= 500;
  throw new VerificationError(stage, status === 401 ? 'auth-required' : retryable ? 'http-unavailable' : 'http-status-mismatch', { status: Number.isInteger(status) ? status : null, retryable });
}

export async function verificationFetch(url, options, { stage = 'production-identity', fetchImpl = fetch } = {}) {
  try { return await fetchImpl(url, options); }
  catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error?.name);
    throw new VerificationError(stage, timeout ? 'network-timeout' : 'network-unavailable', { timeout, retryable: true });
  }
}

/** Transport may fail after headers. Parse/size/identity errors stay mismatches. */
export async function verificationBody(consume, stage) {
  try { return await consume(); }
  catch (error) {
    if (error instanceof VerificationError || error instanceof SyntaxError || error.code === 'ERR_ASSERTION') throw error;
    const timeout = ['TimeoutError', 'AbortError'].includes(error?.name);
    throw new VerificationError(stage, timeout ? 'network-timeout' : 'network-unavailable', { timeout, retryable: true });
  }
}
