#!/usr/bin/env node
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const events = {
  goal_complete: ['Goal 완료', 3, 'white_check_mark'],
  implementation_complete: ['구현 완료', 3, 'tada'],
  blocked: ['루프 블로커', 4, 'warning'],
  failed: ['루프 실패', 4, 'warning'],
};
function validate(input) {
  if (!input || !Object.hasOwn(events, input.event)) throw new Error(`event must be ${Object.keys(events).join('|')}`);
  for (const name of ['key', 'summary']) if (typeof input[name] !== 'string' || !input[name].trim()) throw new Error(`${name} is required`);
  for (const name of ['repo', 'stateDir', 'blocker', 'nextAction', 'commit', 'sessionId']) {
    if (input[name] !== undefined && typeof input[name] !== 'string') throw new Error(`${name} must be a string`);
  }
}

// Best effort: a failed notification never changes the development result.
export async function notify(input, { env = process.env, fetch: send = globalThis.fetch } = {}) {
  let lock, lockPath;
  try {
    validate(input);
    if (!env.PGL_NTFY_URL) return { status: 'disabled' };
    const target = new URL(env.PGL_NTFY_URL);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) throw new Error('PGL_NTFY_URL must be an HTTP(S) topic URL without credentials, query or fragment');
    const topic = decodeURIComponent(target.pathname.split('/').pop());
    if (!topic || topic.includes('/')) throw new Error('PGL_NTFY_URL must end with a topic name');
    target.pathname = target.pathname.slice(0, target.pathname.lastIndexOf('/') + 1);
    const repo = resolve(input.repo || process.cwd());
    const directory = input.stateDir || join(execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim(), 'product-goal-loop', 'notifications');
    await mkdir(directory, { recursive: true });
    lockPath = join(directory, 'send.lock');
    const deadline = Date.now() + 11_000;
    while (!lock) {
      try { lock = await open(lockPath, 'wx'); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (Date.now() >= deadline) throw new Error(`Notification lock busy: ${lockPath}. Retry later; after a crash remove this file only when its recorded PID has exited.`);
        await sleep(50);
      }
    }
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const ledger = join(directory, 'sent.json');
    let sent = [];
    try { sent = JSON.parse(await readFile(ledger, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!Array.isArray(sent)) throw new Error('Notification ledger must be an array');
    const id = createHash('sha256').update(JSON.stringify([env.PGL_NTFY_URL, input.event, input.key])).digest('hex');
    if (sent.some(item => item.id === id)) return { status: 'duplicate' };
    const [label, priority, tag] = events[input.event];
    const message = [input.summary, input.blocker && `Blocker: ${input.blocker}`, input.nextAction && `Next: ${input.nextAction}`, input.commit && `Commit: ${input.commit}`, input.sessionId && `Session: ${input.sessionId}`].filter(Boolean).join('\n');
    const response = await send(target.href, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...(env.PGL_NTFY_TOKEN ? { Authorization: `Bearer ${env.PGL_NTFY_TOKEN}` } : {}) },
      body: JSON.stringify({ topic, title: `${basename(repo)} · ${label}`, message, priority, tags: [tag] }),
    });
    if (!response.ok) throw new Error(`ntfy returned HTTP ${response.status}`);
    await response.body?.cancel();
    sent.push({ id, at: new Date().toISOString() });
    const temporary = `${ledger}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(sent.slice(-256)), 'utf8');
    await rename(temporary, ledger);
    return { status: 'sent' };
  } catch (error) {
    return { status: 'warning', warning: error.message };
  } finally {
    if (lock) { await lock.close().catch(() => {}); await unlink(lockPath).catch(() => {}); }
  }
}

const help = `Product Goal Loop ntfy notification (Node 20+, no dependencies)
Usage: node notify.mjs --event EVENT --key ID --summary TEXT [--repo PATH]
       node notify.mjs --file result.json [--repo PATH]
       Get-Content -Raw result.json | node notify.mjs --stdin [--repo PATH]
       node notify.mjs --help

EVENT: goal_complete | implementation_complete | blocked | failed
JSON input: {"event":"blocked","key":"execution-123","summary":"검증 대기",
  "blocker":"테스트 환경 없음","nextAction":"환경 구성 후 재개"}
Required: event, key (stable event identity), summary (human-readable result).
Optional JSON fields: repo, stateDir, blocker, nextAction, commit, sessionId.
--repo defaults to the current directory and overrides JSON repo.
--file/--stdin cannot be combined with --event/--key/--summary or each other.

Environment: PGL_NTFY_URL = full topic URL (https://host/prefix/topic);
PGL_NTFY_TOKEN = optional access token. Missing URL disables sending.
Side effects: one authenticated JSON POST, local lock and sent ledger under
Git common dir/product-goal-loop/notifications (or JSON stateDir).
Same event/key/topic is suppressed among the last 256 successful sends.
Concurrent sends wait at most 11 seconds; HTTP timeout is 10 seconds.
Network/disk errors return a warning, never fail the development loop.
Retry with identical input after resolving a warning. A crash after delivery
but before recording may duplicate a notification on retry. For a stale lock,
inspect send.lock and remove it only after its recorded PID has exited.
Output: one JSON object: {"status":"sent|duplicate|disabled|warning"};
warnings also contain "warning". Exit 0 for all delivery outcomes, 2 for usage.
Example: node notify.mjs --event goal_complete --key goal-42 --summary '검증 및 push 완료'
`;

async function cli(args) {
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(help); return; }
  try {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
      const key = args[i];
      if (!['--event', '--key', '--summary', '--file', '--stdin', '--repo'].includes(key) || Object.hasOwn(flags, key)) throw new Error(`Unknown or repeated option ${key}; use --help`);
      if (key === '--stdin') flags[key] = true;
      else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${key}; use --help`); flags[key] = args[++i]; }
    }
    const fromJson = flags['--file'] || flags['--stdin'];
    if ((flags['--file'] && flags['--stdin']) || (fromJson && ['--event', '--key', '--summary'].some(key => flags[key]))) throw new Error('Choose flags, --file, or --stdin; use --help');
    let input;
    if (fromJson) {
      let source = '';
      if (flags['--file']) source = await readFile(flags['--file'], 'utf8');
      else { process.stdin.setEncoding('utf8'); for await (const chunk of process.stdin) source += chunk; }
      input = JSON.parse(source.replace(/^\uFEFF/, ''));
    } else input = { event: flags['--event'], key: flags['--key'], summary: flags['--summary'] };
    if (flags['--repo']) input.repo = flags['--repo'];
    validate(input);
    process.stdout.write(`${JSON.stringify(await notify(input))}\n`);
  } catch (error) { process.stdout.write(`${JSON.stringify({ status: 'usage_error', error: error.message })}\n`); process.exitCode = 2; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli(process.argv.slice(2));
