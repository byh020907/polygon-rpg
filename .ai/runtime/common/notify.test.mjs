import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { notify } from './notify.mjs';

async function fixture(t) {
  const stateDir = await mkdtemp(join(tmpdir(), 'pgl-notify-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  return { stateDir, repo: join(stateDir, '제품'), event: 'goal_complete', key: 'goal-1', summary: '검증과 push 완료 🎉' };
}

test('UTF-8 JSON publication preserves server prefix, token and summary details', async t => {
  const input = await fixture(t);
  let captured;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    captured = { url: req.url, headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
    res.writeHead(200).end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const env = { PGL_NTFY_URL: `http://127.0.0.1:${server.address().port}/prefix/product-loop`, PGL_NTFY_TOKEN: 'test-token' };
  assert.deepEqual(await notify({ ...input, blocker: '없음', nextAction: '결과 확인', commit: 'abc', sessionId: 'ses_1' }, { env }), { status: 'sent' });
  assert.equal(captured.url, '/prefix/');
  assert.equal(captured.headers.authorization, 'Bearer test-token');
  assert.deepEqual(captured.body, { topic: 'product-loop', title: '제품 · Goal 완료', message: `${input.summary}\nBlocker: 없음\nNext: 결과 확인\nCommit: abc\nSession: ses_1`, priority: 3, tags: ['white_check_mark'] });
  assert.deepEqual(await notify(input, { env }), { status: 'duplicate' });
});

test('simultaneous calls serialize and durable ledger deduplicates', async t => {
  const input = await fixture(t);
  let calls = 0;
  const options = { env: { PGL_NTFY_URL: 'https://example.test/topic' }, fetch: async () => { calls++; return { ok: true }; } };
  const results = await Promise.all([notify(input, options), notify(input, options)]);
  assert.deepEqual(results.map(result => result.status).sort(), ['duplicate', 'sent']);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(await readFile(join(input.stateDir, 'sent.json'), 'utf8')).length, 1);
  assert.equal((await notify({ ...input, event: 'blocked' }, options)).status, 'sent');
});

test('failed delivery remains retryable; notification failure never throws', async t => {
  const input = await fixture(t);
  const options = { env: { PGL_NTFY_URL: 'https://example.test/topic' }, fetch: async () => ({ ok: false, status: 503 }) };
  assert.equal((await notify(input, options)).status, 'warning');
  options.fetch = async () => { throw new Error('network down'); };
  assert.equal((await notify(input, options)).warning, 'network down');
  options.fetch = async () => ({ ok: true });
  assert.equal((await notify(input, options)).status, 'sent');
});

test('disabled does not touch filesystem or network and unsafe URL is rejected', async () => {
  const input = { repo: '/nonexistent', event: 'failed', key: '1', summary: 'failure' };
  const fetch = () => { throw new Error('must not call'); };
  assert.deepEqual(await notify(input, { env: {}, fetch }), { status: 'disabled' });
  assert.equal((await notify(input, { env: { PGL_NTFY_URL: 'https://name:secret@example.test/topic' }, fetch })).status, 'warning');
});

test('standalone help and JSON stdin work without dependencies', () => {
  const cli = fileURLToPath(new URL('./notify.mjs', import.meta.url));
  const help = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(help, /PGL_NTFY_URL/);
  const output = execFileSync(process.execPath, [cli, '--stdin'], { encoding: 'utf8', env: { ...process.env, PGL_NTFY_URL: '' }, input: JSON.stringify({ event: 'blocked', key: '1', summary: '한글' }) });
  assert.deepEqual(JSON.parse(output), { status: 'disabled' });
  assert.throws(() => execFileSync(process.execPath, [cli, '--no-such-option'], { stdio: 'pipe' }), error => error.status === 2 && JSON.parse(error.stdout).status === 'usage_error');
});
