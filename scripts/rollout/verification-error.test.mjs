import test from 'node:test';
import assert from 'node:assert/strict';
import { requireHTTP, verificationFetch, verificationBody } from './verification-error.mjs';

test('temporary HTTP failure records status and stays distinct from mismatch and auth expiry', () => {
  for (const status of [403, 408, 429, 502, 503]) assert.throws(() => requireHTTP({ status }, 'identity'), error => error.retryable && error.status === status && error.reasonCode === 'http-unavailable');
  assert.throws(() => requireHTTP({ status: 401 }, 'identity'), error => !error.retryable && error.reasonCode === 'auth-required');
  assert.throws(() => requireHTTP({ status: 404 }, 'identity'), error => !error.retryable && error.reasonCode === 'http-status-mismatch');
  assert.doesNotThrow(() => requireHTTP({ status: 307 }, 'anonymous-boundary', 307));
  assert.throws(() => requireHTTP({ status: () => 403 }, 'route'), error => error.status === 403);
});

test('network errors retain safe reason and timeout without provider payloads', async () => {
  const failure = Object.assign(new Error('secret provider body'), { name: 'TimeoutError' });
  await assert.rejects(() => verificationFetch('https://example.test', {}, { fetchImpl: async () => { throw failure; } }), error => error.timeout && error.retryable && !error.message.includes('secret'));
});

test('body resets after headers retry while parse and size failures remain held', async () => {
  await assert.rejects(() => verificationBody(async () => { throw new TypeError('private transport body'); }, 'identity'), error => error.reasonCode === 'network-unavailable' && error.retryable && !error.message.includes('private'));
  await assert.rejects(() => verificationBody(async () => JSON.parse('invalid'), 'identity'), error => error instanceof SyntaxError && error.retryable === undefined);
  await assert.rejects(() => verificationBody(async () => assert.fail('bounded response'), 'identity'), error => error.code === 'ERR_ASSERTION' && error.retryable === undefined);
});
