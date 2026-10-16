import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function assertRouteConfig(route) {
  const state = route.renderState;
  assert(state && ['public', 'protected'].includes(state.access), 'Explicit route access classification required');
  if (state.access === 'protected') assert(typeof state.visible === 'string' && state.visible.trim(), 'Protected route requires a visible state marker');
  if (state.visible !== undefined) assert(typeof state.visible === 'string' && state.visible.trim(), 'Invalid visible state marker');
  assert(state.hidden === undefined || Array.isArray(state.hidden), 'Invalid hidden state markers');
  for (const selector of state.hidden || []) assert(typeof selector === 'string' && selector.trim(), 'Invalid hidden state marker');
}

// Same URL with another locale or authentication state is separate coverage.
export function routeKey(route) {
  return createHash('sha256').update(JSON.stringify({
    path: route.path, expectedPath: route.expectedPath || route.path,
    locale: route.locale || null, state: route.state || null,
    renderState: route.renderState || null, chrome: route.chrome || null,
  })).digest('hex');
}
