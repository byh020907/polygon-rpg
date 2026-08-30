import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listEntries } from './inbox.mjs';

const ENTRY_PATTERN = /^IN-\d{8}-\d{6}(?:-\d{2})?$/;

function fail(message, code = 1, details = {}) {
  process.stdout.write(`${JSON.stringify({ ok: false, message, ...details })}\n`);
  process.exit(code);
}

function git(args, cwd, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
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

function exactRefHash(root, ref) {
  return git(['for-each-ref', '--format=%(objectname)', '--count=1', ref], root) || null;
}

function isAncestor(root, ancestor, descendant) {
  if (!ancestor || !descendant) return false;
  return (
    git(['merge-base', '--is-ancestor', ancestor, descendant], root, { allowFailure: true }) !==
    null
  );
}

function readLeaseOwner(root) {
  const lockScript = join(root, 'loop', 'lock.mjs');
  const output = execFileSync(process.execPath, [lockScript, 'status', '--repo', root], {
    cwd: root,
    encoding: 'utf8',
  });
  const status = JSON.parse(output);
  if (status.ok !== true) throw new Error(status.message ?? 'lease 상태 조회가 실패했습니다.');
  return status.owner ?? null;
}

export function evaluateCompletion(evidence) {
  const repositoryFailures = [];
  if (evidence.mainBranch !== 'main') repositoryFailures.push('main-branch-not-main');
  if (!evidence.mainClean) repositoryFailures.push('main-dirty');
  if (!evidence.mainHead || evidence.mainHead !== evidence.originMain) {
    repositoryFailures.push('main-not-pushed');
  }
  if (evidence.leaseOwner !== null) repositoryFailures.push('lease-not-released');

  const repositoryDurable = repositoryFailures.length === 0;
  const blocked = evidence.entryStatus === 'blocked' && repositoryDurable;

  if (evidence.entry === 'ROADMAP') {
    return Object.freeze({
      complete: repositoryDurable,
      blocked: false,
      repositoryDurable,
      executorDurable: null,
      failures: Object.freeze(repositoryFailures),
    });
  }

  const failures = [...repositoryFailures];
  if (evidence.entryStatus !== null) failures.push('entry-not-cleaned');
  if (!evidence.executorLocalHead) failures.push('executor-local-missing');
  if (!evidence.executorRemoteHead) failures.push('executor-remote-missing');
  if (
    evidence.executorLocalHead &&
    evidence.executorRemoteHead &&
    evidence.executorLocalHead !== evidence.executorRemoteHead
  ) {
    failures.push('executor-not-pushed');
  }
  if (!evidence.executorIntegrated) failures.push('executor-not-integrated');

  const executorDurable = Boolean(
    evidence.executorLocalHead &&
    evidence.executorRemoteHead &&
    evidence.executorLocalHead === evidence.executorRemoteHead &&
    evidence.executorIntegrated,
  );

  return Object.freeze({
    complete: failures.length === 0,
    blocked,
    repositoryDurable,
    executorDurable,
    failures: Object.freeze(failures),
  });
}

export function inspectCompletion({ repo, entry }) {
  if (entry !== 'ROADMAP' && !ENTRY_PATTERN.test(entry ?? '')) {
    throw new Error('entry는 ROADMAP 또는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  }

  const root = git(['rev-parse', '--show-toplevel'], resolve(repo ?? process.cwd()));
  const mainBranch = git(['branch', '--show-current'], root);
  const mainHead = git(['rev-parse', 'HEAD'], root);
  const originMain = exactRefHash(root, 'refs/remotes/origin/main');
  const mainClean = git(['status', '--porcelain=v1'], root) === '';
  const leaseOwner = readLeaseOwner(root);
  const entries = listEntries(readFileSync(join(root, 'docs', 'feedback', 'INBOX.md'), 'utf8'));
  const entryStatus = entries.find((candidate) => candidate.id === entry)?.status ?? null;

  let executorBranch = null;
  let executorLocalHead = null;
  let executorRemoteHead = null;
  let executorIntegrated = null;
  if (entry !== 'ROADMAP') {
    executorBranch = `codex/loop/${entry.toLowerCase()}`;
    executorLocalHead = exactRefHash(root, `refs/heads/${executorBranch}`);
    executorRemoteHead = exactRefHash(root, `refs/remotes/origin/${executorBranch}`);
    executorIntegrated = isAncestor(root, executorRemoteHead, mainHead);
  }

  const evidence = Object.freeze({
    entry,
    entryStatus,
    mainBranch,
    mainHead,
    originMain,
    mainClean,
    leaseOwner,
    executorBranch,
    executorLocalHead,
    executorRemoteHead,
    executorIntegrated,
  });
  return Object.freeze({ ...evidence, ...evaluateCompletion(evidence) });
}

function main() {
  const { command, values } = parseArgs(process.argv.slice(2));
  if (command !== 'inspect') fail('명령은 inspect여야 합니다.');
  const entry = values.get('entry');
  try {
    const result = inspectCompletion({ repo: values.get('repo'), entry });
    process.stdout.write(`${JSON.stringify({ ok: true, command, ...result })}\n`);
  } catch (error) {
    fail(error.message, 2, { entry });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
