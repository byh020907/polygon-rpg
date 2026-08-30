import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const LOCK_NAME = 'polygon-rpg-roadmap-coordinator.lock';
const DEFAULT_LEASE_MINUTES = 20;

function fail(message, code = 1, details = {}) {
  process.stdout.write(`${JSON.stringify({ ok: false, message, ...details })}\n`);
  process.exit(code);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const values = new Map();
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      fail(`잘못된 인자: ${key ?? '(없음)'}`);
    }
    values.set(key.slice(2), value);
  }
  return { command, values };
}

function readOwner(lockPath) {
  try {
    return JSON.parse(readFileSync(join(lockPath, 'owner.json'), 'utf8'));
  } catch {
    return null;
  }
}

function resolveContext(values) {
  const repo = resolve(values.get('repo') ?? process.cwd());
  const root = git(['rev-parse', '--show-toplevel'], repo);
  const gitDir = git(['rev-parse', '--absolute-git-dir'], root);
  return { root, lockPath: join(gitDir, 'info', LOCK_NAME) };
}

function acquire(values) {
  const { root, lockPath } = resolveContext(values);
  const expectedHead = values.get('expected-head');
  if (!expectedHead) {
    fail('acquire에는 --expected-head가 필요합니다.');
  }

  const branch = git(['branch', '--show-current'], root);
  const actualHead = git(['rev-parse', 'HEAD'], root);
  if (branch !== 'main' || actualHead !== expectedHead) {
    fail('main branch 또는 expected HEAD가 달라 mutation을 중단합니다.', 3, {
      branch,
      expectedHead,
      actualHead,
    });
  }

  const dirtyPaths = git(['status', '--porcelain'], root);
  if (dirtyPaths) {
    fail('main checkout이 dirty라 mutation을 중단합니다.', 3, {
      dirtyPaths: dirtyPaths.split(/\r?\n/),
    });
  }

  const leaseMinutes = Number(values.get('lease-minutes') ?? DEFAULT_LEASE_MINUTES);
  if (!Number.isFinite(leaseMinutes) || leaseMinutes <= 0) {
    fail('--lease-minutes는 양수여야 합니다.');
  }

  let staleRecovered = null;
  try {
    mkdirSync(lockPath);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = readOwner(lockPath);
    const acquiredAt = Date.parse(owner?.acquiredAt ?? '');
    const ageMs = Date.now() - acquiredAt;
    if (!Number.isFinite(ageMs) || ageMs < leaseMinutes * 60_000) {
      fail('다른 coordinator tick이 lease를 보유하고 있습니다.', 2, {
        owner,
      });
    }

    const stalePath = `${lockPath}.stale-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      renameSync(lockPath, stalePath);
      mkdirSync(lockPath);
      staleRecovered = { owner, preservedAt: stalePath };
    } catch (takeoverError) {
      fail('stale lease takeover 경쟁에서 패배했습니다.', 2, {
        cause: takeoverError.message,
      });
    }
  }

  const token = randomUUID();
  const owner = {
    token,
    acquiredAt: new Date().toISOString(),
    expectedHead,
    pid: process.pid,
  };
  writeFileSync(join(lockPath, 'owner.json'), `${JSON.stringify(owner, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  process.stdout.write(
    `${JSON.stringify({ ok: true, command: 'acquire', owner, staleRecovered })}\n`,
  );
}

function release(values) {
  const { lockPath } = resolveContext(values);
  const token = values.get('token');
  const owner = readOwner(lockPath);
  if (!token || owner?.token !== token) {
    fail('현재 lease token과 일치하지 않아 해제하지 않습니다.', 4, { owner });
  }
  rmSync(lockPath, { recursive: true, force: false });
  process.stdout.write(`${JSON.stringify({ ok: true, command: 'release', released: owner })}\n`);
}

function status(values) {
  const { lockPath } = resolveContext(values);
  process.stdout.write(
    `${JSON.stringify({ ok: true, command: 'status', owner: readOwner(lockPath) })}\n`,
  );
}

const { command, values } = parseArgs(process.argv.slice(2));
if (command === 'acquire') acquire(values);
else if (command === 'release') release(values);
else if (command === 'status') status(values);
else fail('명령은 acquire, release 또는 status여야 합니다.');
