import test from 'node:test';
import assert from 'node:assert/strict';
import { executeLocalCommand } from './local-cli.mjs';

test('acceptance run cannot reach the runner before legacy exclusion succeeds', async () => {
  const events = [], config = { plan: { handoff: {} } };
  const entry = { handoff: async (value, run) => { assert.equal(value, config); events.push('exclude'); return run(); }, run: async () => { events.push('run'); return 'completed'; } };
  assert.equal(await executeLocalCommand(config, {}, { command: 'run' }, entry), 'completed');
  assert.deepEqual(events, ['exclude', 'run']);
  entry.handoff = async () => { throw Error('old worker alive'); };
  await assert.rejects(() => executeLocalCommand(config, {}, { command: 'run' }, entry), /old worker alive/);
  assert.deepEqual(events, ['exclude', 'run']);
});

test('rollback and read-only commands never demand old handoff approval', async () => {
  const config = { plan: { handoff: {} } }, commands = [];
  const entry = { handoff: () => assert.fail('approval-dependent recovery'), run: async (value, deps, options) => { assert.equal(value, config); commands.push(options.command); return options; } };
  for (const command of ['rollback', 'status', 'prepare', 'verify']) await executeLocalCommand(config, {}, { command }, entry);
  assert.deepEqual(commands, ['rollback', 'status', 'prepare', 'verify']);
});
