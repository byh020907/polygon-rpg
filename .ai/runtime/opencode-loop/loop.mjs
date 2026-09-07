#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { notify } from '../common/notify.mjs';

const AGENT = 'product-goal-loop-worker';
const permission = [{ permission: '*', pattern: '*', action: 'allow' }];
const statuses = ['goal_complete', 'implementation_complete', 'blocked', 'failed', 'no_op'];
const commands = {
  run: {
    purpose: 'Run one fresh worker. An existing guard prevents overlapping work.',
    effects:
      'Starts a private temporary OpenCode server and a Full access worker; the worker may commit and push. Saves its self-reported result and sends configured ntfy notification.',
    example: 'node loop.mjs run',
  },
  status: {
    purpose: 'Read the guard, pause flag and last worker self-report.',
    effects: 'None.',
    example: 'node loop.mjs status',
  },
  pause: {
    purpose: 'Skip future runs; an active worker continues.',
    effects: 'Writes a local pause flag.',
    example: 'node loop.mjs pause',
  },
  resume: {
    purpose: 'Allow future runs. Does not start a worker.',
    effects: 'Removes the local pause flag.',
    example: 'node loop.mjs resume',
  },
};
const help = {
  purpose:
    'Small OpenCode Product Goal Loop runner. Manage goals in an ordinary OpenCode manager conversation.',
  usage: 'node loop.mjs <run|tick|status|pause|resume> [--repo PATH] [--json] [--dry-run]',
  quickStart: ['node loop.mjs status', 'node loop.mjs run'],
  commands,
  aliases: { tick: 'run' },
  options: {
    '--repo PATH': 'Git checkout; default current directory.',
    '--json': 'JSON output (also default when redirected).',
    '--help': 'Complete help without prerequisites.',
    '--dry-run': 'Describe changes without executing them.',
  },
  environment: {
    OPENCODE_BIN: 'Native OpenCode executable; default resolved from PATH/npm.',
    PGL_MODEL: 'Optional provider/model override.',
    PGL_NTFY_URL:
      'Optional ntfy topic URL; see shared notify.mjs --help for notification settings.',
  },
  state:
    'Git common directory/pgl-opencode/{lock/owner.json,paused,last.json}. Shared by all worktrees. Sessions stay in OpenCode; no automatic deletion.',
  prerequisites:
    'Node 20+, Git, installed Full access product-goal-loop-worker agent, configured OpenCode provider. Worker reads worker.md and owns Method, Git, tests and recovery decisions.',
  result: {
    source: 'worker_self_report',
    status: statuses,
    summary: 'string',
    blocker: 'optional string',
    nextAction: 'optional string',
    commit: 'optional string',
    sessionId: 'string or null',
    warnings: 'string[]',
  },
  exits: {
    0: 'Success, busy, paused or no-op.',
    2: 'Invalid usage.',
    3: 'Prerequisite or runtime failure.',
    4: 'Blocked or guard needs recovery.',
  },
  recovery:
    'Read status first. A guard is never reclaimed by age. For recovery_required, verify the recorded runner and child have exited and inspect the retained session/worktree; only then manually remove the exact lock directory shown by status. Run again for a fresh recovery session.',
  concurrency:
    'run uses an atomic directory guard. pause/resume are idempotent and do not interrupt workers. No automatic retry after ambiguous failure.',
  exampleOutput: {
    status: 'goal_complete',
    source: 'worker_self_report',
    summary: 'Implemented and tested one goal.',
    sessionId: 'ses_example',
    warnings: [],
  },
};
const fail = (message, code = 3) => Object.assign(new Error(message), { code });
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== 'ESRCH';
  }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}
async function save(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2));
  await rename(temp, file);
}

export function fullAccess(agent, requireTools = true) {
  const rules = agent?.permission ?? [];
  if (!Array.isArray(rules)) return false;
  const last = rules.findLastIndex((r) => r.permission === '*' && r.pattern === '*');
  return (
    last >= 0 &&
    rules[last].action === 'allow' &&
    rules.slice(last + 1).every((r) => r.action === 'allow') &&
    (!requireTools ||
      (agent.mode === 'primary' &&
        ['bash', 'read', 'edit', 'write', 'task'].every((t) => agent.tools?.[t] === true) &&
        Object.values(agent.tools ?? {}).every((v) => v !== false)))
  );
}
export function parseResult(text) {
  const line = text.trim().split(/\r?\n/).at(-1);
  if (!line?.startsWith('PGL_RESULT '))
    throw fail(
      'Worker did not return a final PGL_RESULT JSON line. Inspect the retained session before retrying.',
    );
  let result;
  try {
    result = JSON.parse(line.slice(11));
  } catch {
    throw fail('Invalid PGL_RESULT JSON. Inspect the retained session.');
  }
  if (
    !statuses.includes(result.status) ||
    typeof result.summary !== 'string' ||
    !result.summary.trim() ||
    ['blocker', 'nextAction', 'commit'].some(
      (key) => result[key] !== undefined && typeof result[key] !== 'string',
    ) ||
    (result.status === 'blocked' && !result.blocker?.trim())
  )
    throw fail('Invalid worker result fields. Inspect the retained session.');
  return Object.fromEntries(
    ['status', 'summary', 'blocker', 'nextAction', 'commit']
      .filter((k) => result[k] !== undefined)
      .map((k) => [k, result[k]]),
  );
}
function executable() {
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN;
  if (process.platform !== 'win32') return 'opencode';
  const found = spawnSync('where.exe', ['opencode'], { encoding: 'utf8', windowsHide: true });
  const entries = String(found.stdout ?? '')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const candidates = entries.flatMap((p) => [
    p.endsWith('.exe') ? p : '',
    path.join(path.dirname(p), 'node_modules/opencode-ai/bin/opencode.exe'),
  ]);
  if (process.env.APPDATA)
    candidates.push(
      path.join(process.env.APPDATA, 'npm/node_modules/opencode-ai/bin/opencode.exe'),
    );
  const bin = candidates.find((p) => p && existsSync(p));
  if (!bin) throw fail('Native OpenCode executable not found. Set OPENCODE_BIN to opencode.exe.');
  return bin;
}
function checked(bin, args, cwd) {
  const [program, ...prefix] = Array.isArray(bin) ? bin : [bin];
  const r = spawnSync(program, [...prefix, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  if (r.error || r.status !== 0)
    throw fail(
      `${path.basename(program)} ${args.slice(0, 2).join(' ')} failed. Check installation and configuration.`,
    );
  return r.stdout.trim();
}
async function context(repo) {
  const root = checked('git', ['rev-parse', '--show-toplevel'], repo);
  const common = path.resolve(root, checked('git', ['rev-parse', '--git-common-dir'], root));
  return {
    root,
    state: path.join(common, 'pgl-opencode'),
    lock: path.join(common, 'pgl-opencode/lock'),
  };
}
async function status(ctx) {
  const owner = await readJson(path.join(ctx.lock, 'owner.json'));
  const guarded = existsSync(ctx.lock);
  const pauseReason = await readFile(path.join(ctx.state, 'paused'), 'utf8').catch((e) => {
    if (e.code === 'ENOENT') return null;
    throw e;
  });
  return {
    status: guarded
      ? owner?.runnerPid && alive(owner.runnerPid)
        ? 'running'
        : 'recovery_required'
      : pauseReason
        ? 'paused'
        : 'idle',
    pauseReason,
    lock: guarded ? ctx.lock : null,
    owner,
    last: await readJson(path.join(ctx.state, 'last.json')),
  };
}

async function startServer(bin, root, onChild) {
  const password = randomUUID();
  const [program, ...prefix] = Array.isArray(bin) ? bin : [bin];
  const child = spawn(program, [...prefix, 'serve', '--hostname', '127.0.0.1', '--port', '0'], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENCODE_SERVER_USERNAME: 'opencode',
      OPENCODE_SERVER_PASSWORD: password,
    },
  });
  const death = new AbortController();
  child.on('error', () => death.abort());
  child.on('exit', () => death.abort());
  await onChild(child, death);
  const url = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => done(fail('OpenCode server did not become ready.')), 30000);
    function done(error, value) {
      clearTimeout(timer);
      child.stdout.off('data', collect);
      child.stderr.off('data', collect);
      child.off('error', errorHandler);
      child.off('exit', exitHandler);
      error ? reject(error) : resolve(value);
    }
    const errorHandler = () => done(fail('Unable to start OpenCode server.'));
    const exitHandler = () => done(fail('OpenCode server exited before becoming ready.'));
    function collect(chunk) {
      buffer = (buffer + chunk).slice(-4096);
      const match = buffer.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) done(null, match[0]);
    }
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('error', errorHandler);
    child.once('exit', exitHandler);
    if (death.signal.aborted) exitHandler();
  });
  // Drain server output without forwarding transcripts or credentials.
  child.stdout.resume();
  child.stderr.resume();
  async function request(route, body, long = false) {
    const timeout = long
      ? death.signal
      : AbortSignal.any([death.signal, AbortSignal.timeout(10000)]);
    const response = await fetch(
      `${url}${route}${route.includes('?') ? '&' : '?'}directory=${encodeURIComponent(root)}`,
      {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: timeout,
      },
    );
    if (!response.ok) throw fail(`OpenCode API ${route} returned ${response.status}.`);
    return response.status === 204 ? null : response.json();
  }
  return { request };
}
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  if (!child.pid) return true;
  child.kill();
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null || child.signalCode !== null) return true;
    await sleep(100);
  }
  return false;
}
export async function run(ctx, binOverride) {
  await mkdir(ctx.state, { recursive: true });
  if (existsSync(path.join(ctx.state, 'paused'))) return status(ctx);
  try {
    await mkdir(ctx.lock);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const current = await status(ctx);
    if (current.status === 'recovery_required')
      current.notification = await notify({
        repo: ctx.root,
        stateDir: path.join(path.dirname(ctx.state), 'product-goal-loop/notifications'),
        event: 'blocked',
        key: `orphan:${current.owner?.token ?? ctx.lock}`,
        summary: '이전 루프 실행의 종료 확인 필요',
        blocker: 'guard가 남아 있어 중복 실행을 차단했습니다.',
        nextAction: help.recovery,
      });
    return current;
  }
  let child,
    outcome,
    owned = true;
  const owner = {
    runnerPid: process.pid,
    childPid: null,
    token: randomUUID(),
    startedAt: new Date().toISOString(),
    sessionId: null,
  };
  try {
    await save(path.join(ctx.lock, 'owner.json'), owner);
    if (existsSync(path.join(ctx.state, 'paused'))) return { status: 'paused' };
    const bin = binOverride ?? executable();
    if (!fullAccess(JSON.parse(checked(bin, ['debug', 'agent', AGENT], ctx.root))))
      throw fail(
        'PERMISSION_BLOCKED: worker agent must be primary with Full access and enabled tools. No prompt was sent.',
        4,
      );
    const server = await startServer(bin, ctx.root, async (spawned) => {
      child = spawned;
      owner.childPid = child.pid ?? null;
      await save(path.join(ctx.lock, 'owner.json'), owner);
    });
    const agents = await server.request('/agent');
    if (!fullAccess(agents.find((a) => a.name === AGENT)))
      throw fail(
        'PERMISSION_BLOCKED: backend agent does not have Full access. No prompt was sent.',
        4,
      );
    const session = await server.request('/session', {
      agent: AGENT,
      title: `Product Goal Loop ${owner.startedAt}`,
      permission,
    });
    if (typeof session?.id !== 'string') throw fail('OpenCode returned no session ID.');
    owner.sessionId = session.id;
    await save(path.join(ctx.lock, 'owner.json'), owner);
    const confirmed = await server.request(`/session/${encodeURIComponent(session.id)}`);
    if (
      !fullAccess(confirmed, false) ||
      confirmed.agent !== AGENT ||
      !confirmed.directory ||
      path.resolve(confirmed.directory).toLowerCase() !== path.resolve(ctx.root).toLowerCase()
    )
      throw fail(
        'PERMISSION_BLOCKED: explicit Full access session was not confirmed. No prompt was sent.',
        4,
      );
    const previous = await readJson(path.join(ctx.state, 'last.json'));
    const prompt =
      (await readFile(new URL('./worker.md', import.meta.url), 'utf8')) +
      (previous
        ? `\nPrevious durable report (claims to verify against current files):\n${JSON.stringify(previous)}\n`
        : '');
    let model;
    if (process.env.PGL_MODEL) {
      const slash = process.env.PGL_MODEL.indexOf('/');
      if (slash < 1 || slash === process.env.PGL_MODEL.length - 1)
        throw fail('PGL_MODEL must be provider/model.');
      model = {
        providerID: process.env.PGL_MODEL.slice(0, slash),
        modelID: process.env.PGL_MODEL.slice(slash + 1),
      };
    }
    const response = await server.request(
      `/session/${encodeURIComponent(session.id)}/message`,
      { agent: AGENT, ...(model ? { model } : {}), parts: [{ type: 'text', text: prompt }] },
      true,
    );
    if (response?.info?.error)
      throw fail('OpenCode worker reported an error. Inspect the retained session.');
    outcome = {
      ...parseResult(
        (response.parts ?? [])
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('\n'),
      ),
      source: 'worker_self_report',
      sessionId: session.id,
      warnings: [],
    };
  } catch (e) {
    outcome = {
      status: e.code === 4 ? 'blocked' : 'failed',
      summary: e.message,
      blocker: e.message,
      nextAction: 'Inspect node loop.mjs status and the retained session before retrying.',
      source: 'runner',
      sessionId: owner.sessionId,
      warnings: [],
    };
  } finally {
    const stopped = await stopChild(child);
    if (!stopped) {
      owned = false;
      if (outcome)
        outcome.warnings.push(
          'Server exit was not confirmed. Guard retained; inspect recorded processes before recovery.',
        );
    }
    if (outcome) {
      outcome.finishedAt = new Date().toISOString();
      await save(path.join(ctx.state, 'last.json'), outcome);
      if (['implementation_complete', 'blocked', 'failed'].includes(outcome.status))
        await writeFile(path.join(ctx.state, 'paused'), outcome.status);
      try {
        if (outcome.status !== 'no_op') {
          const notification = await notify({
            repo: ctx.root,
            stateDir: path.join(path.dirname(ctx.state), 'product-goal-loop/notifications'),
            event: outcome.status,
            key:
              ['goal_complete', 'implementation_complete'].includes(outcome.status) &&
              outcome.commit
                ? outcome.commit
                : JSON.stringify([
                    outcome.status,
                    outcome.summary,
                    outcome.blocker,
                    outcome.nextAction,
                  ]),
            summary: outcome.summary,
            blocker: outcome.blocker,
            nextAction: outcome.nextAction,
            commit: outcome.commit,
            sessionId: outcome.sessionId ?? undefined,
          });
          if (notification?.warning) outcome.warnings.push(notification.warning);
        }
      } catch {
        outcome.warnings.push('Notification delivery failed; development result is retained.');
      }
      await save(path.join(ctx.state, 'last.json'), outcome);
    }
    if (owned) {
      const current = await readJson(path.join(ctx.lock, 'owner.json'));
      if (current?.token === owner.token) await rm(ctx.lock, { recursive: true });
    }
  }
  return outcome;
}

export async function main(args = process.argv.slice(2)) {
  let command = 'help',
    repo = process.cwd(),
    json = !process.stdout.isTTY,
    dry = false,
    wantsHelp = false;
  try {
    if (args[0] && !args[0].startsWith('-')) command = args.shift();
    if (command === 'tick') command = 'run';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json') json = true;
      else if (args[i] === '--help') wantsHelp = true;
      else if (args[i] === '--dry-run') dry = true;
      else if (args[i] === '--repo' && args[i + 1] && !args[i + 1].startsWith('--'))
        repo = path.resolve(args[++i]);
      else throw fail(`Unknown or incomplete option ${args[i]}. Use node loop.mjs --help.`, 2);
    }
    if (command !== 'help' && !commands[command])
      throw fail(`Unknown command ${command}. Use node loop.mjs --help.`, 2);
    let result;
    if (command === 'help' || wantsHelp) result = help;
    else {
      const ctx = await context(repo);
      if (dry)
        result = {
          status: 'dry_run',
          command,
          repo: ctx.root,
          state: ctx.state,
          effects: commands[command].effects,
        };
      else if (command === 'status') result = await status(ctx);
      else if (command === 'run') result = await run(ctx);
      else {
        await mkdir(ctx.state, { recursive: true });
        if (command === 'pause') await writeFile(path.join(ctx.state, 'paused'), 'human');
        else await rm(path.join(ctx.state, 'paused'), { force: true });
        result = { status: command === 'pause' ? 'paused' : 'idle' };
      }
    }
    const text =
      result === help
        ? [
            help.purpose,
            '',
            help.usage,
            '',
            ...Object.entries(commands).map(
              ([name, c]) =>
                `${name}: ${c.purpose}\n  Effects: ${c.effects}\n  Example: ${c.example}`,
            ),
            '',
            `Options: ${Object.entries(help.options)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}`,
            '',
            `Environment: ${Object.entries(help.environment)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}`,
            '',
            `Prerequisites: ${help.prerequisites}`,
            `State: ${help.state}`,
            `Concurrency: ${help.concurrency}`,
            `Recovery: ${help.recovery}`,
            `Exit codes: ${JSON.stringify(help.exits)}`,
            'Machine-readable complete help: node loop.mjs help --json',
          ].join('\n')
        : JSON.stringify(result, null, 2);
    process.stdout.write(`${json ? JSON.stringify(result) : text}\n`);
    return ['blocked', 'recovery_required'].includes(result.status)
      ? 4
      : result.status === 'failed'
        ? 3
        : 0;
  } catch (e) {
    process.stdout.write(`${JSON.stringify({ status: 'error', summary: e.message })}\n`);
    return typeof e.code === 'number' ? e.code : 3;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await main();
