import test from 'node:test';
import assert from 'node:assert/strict';
import { executeLocalCommand, localCommandOptions, main, preparePlan } from './local-cli.mjs';

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

test('R3 CLI maps explicit verification recovery without granting native run authority', async () => {
  const options = localCommandOptions('verify', ['jev', '--recover-verification']);
  assert.deepEqual(options, { command: 'verify', serviceId: 'jev', recoverVerification: true });
  assert.deepEqual(localCommandOptions('verify', ['--recover-verification', 'naeil']), { command: 'verify', serviceId: 'naeil', recoverVerification: true });
  let received;
  await executeLocalCommand({ plan: { handoff: {} } }, {}, options, { handoff() { assert.fail('native handoff'); }, run: async (config, deps, value) => { received = value; } });
  assert.deepEqual(received, options);
  for (const [command, rest] of [
    ['verify', ['--recover-verification']], ['verify', ['jev', '--retry-held', '--recover-verification']],
    ['verify', ['jev', '--recover-verification', '--recover-verification']], ['run', ['--recover-verification']],
    ['prepare', ['jev', '--recover-verification']], ['rollback', ['transaction', '--recover-verification']],
    ['status', ['--recover-verification']],
  ]) assert.throws(() => localCommandOptions(command, rest), /recover|verif|selector/i);
});

test('fresh draft becomes a final plan whose approval runs once without state or approval side effects', async t => {
  const { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os'), { join } = await import('node:path');
  const { approvalFor, runLocal } = await import('./local-runner.mjs');
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'local-cli-prepare-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const archive = join(directory, 'archive.tgz'); writeFileSync(archive, 'synthetic archive', { mode: 0o600 });
  const previous = { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) }, candidate = { id: 'candidate', sourceRevision: 'c'.repeat(40), sha256: '2'.repeat(64) };
  const draft = { stateDirectory: join(directory, 'state'), lockFile: join(directory, 'machine.lock'), stopFile: join(directory, 'STOP'), approvalFile: join(directory, 'approval.json'), retry: { maxAttempts: 1, baseDelayMs: 0 }, plan: { schemaVersion: 1, release: { releaseId: 'synthetic-0.7.42', version: '0.7.42', sourceRevision: 'a'.repeat(40), archive: { path: archive, sha256: '74a06ea6113b7f98d70ba2286ddaa21a9a17e25ed2bb8736a823dbc46177eb44' } }, services: [{ id: 'jev', mode: 'deploy', currentArtifact: previous, consumer: { candidate: { path: '/synthetic' } } }] } };
  assert.throws(() => approvalFor(draft.plan), /final|prepared/i);
  const checks = { validateRelease() {}, assertLocalArtifact() {}, localCandidateProof: () => ({ candidateBinding: { reviewed: true }, consumerInputsSha256: 'd'.repeat(64) }), candidateFor: (plan, service) => { assert.deepEqual(service.consumer.candidateBinding, { reviewed: true }); return { candidate: { artifact: candidate } }; } };
  const final = await preparePlan(draft, checks);
  assert.deepEqual(final.plan.services[0].prepared, { previousArtifact: previous, candidateArtifact: candidate, consumerInputsSha256: 'd'.repeat(64) });
  assert(!existsSync(draft.stateDirectory) && !existsSync(draft.approvalFile)); assert(!Object.hasOwn(draft.plan.services[0], 'prepared'));
  let current = previous, deploys = 0;
  const deps = { validateRelease: async () => ({ passed: true }), inspect: async () => ({ artifact: current }), prepare: async () => ({ candidateArtifact: candidate, consumerInputsSha256: 'd'.repeat(64) }), deploy: async ({ transaction }) => { deploys++; current = transaction.candidateArtifact; return { outcome: 'completed', artifact: current }; }, verify: async () => ({ passed: true }) };
  assert.equal((await runLocal(final, deps, { command: 'prepare' })).services.jev.status, 'prepared');
  writeFileSync(final.approvalFile, JSON.stringify(approvalFor(final.plan)), { mode: 0o600 });
  assert.equal((await runLocal(final, deps)).status, 'production-verified'); assert.equal(deploys, 1);
  const output = join(directory, 'final.json'), draftPath = join(directory, 'draft.json');
  writeFileSync(draftPath, JSON.stringify(draft), { mode: 0o600 }); writeFileSync(output, 'existing', { mode: 0o600 });
  await assert.rejects(() => main(['prepare-plan', draftPath, output]), /new output/);
  assert.equal(readFileSync(output, 'utf8'), 'existing');
});
