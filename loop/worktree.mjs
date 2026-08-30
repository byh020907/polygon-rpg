import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const ENTRY_PATTERN = /^IN-\d{8}-\d{6}(?:-\d{2})?$/;

function fail(message, code = 1, details = {}) {
  process.stdout.write(`${JSON.stringify({ ok: false, message, ...details })}\n`);
  process.exit(code);
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function isAncestor(root, ancestor, descendant) {
  try {
    git(['merge-base', '--is-ancestor', ancestor, descendant], root);
    return true;
  } catch {
    return false;
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

function parseWorktrees(output) {
  if (!output) return [];
  return output.split(/\r?\n\r?\n/).map((block) => {
    const entry = {};
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(' ');
      if (separator === -1) entry[line] = true;
      else entry[line.slice(0, separator)] = line.slice(separator + 1);
    }
    return entry;
  });
}

function context(values) {
  const repo = resolve(values.get('repo') ?? process.cwd());
  const root = git(['rev-parse', '--show-toplevel'], repo);
  const entry = values.get('entry');
  if (!ENTRY_PATTERN.test(entry ?? '')) {
    fail('--entry는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  }

  const repoName = basename(root).replace(/[^a-zA-Z0-9._-]/g, '-');
  const branch = values.get('branch') ?? `codex/loop/${entry.toLowerCase()}`;
  if (!branch.startsWith('codex/loop/')) {
    fail('executor branch는 codex/loop/ 아래여야 합니다.', 1, { branch });
  }
  const worktreeRoot = resolve(
    values.get('worktree-root') ?? join(homedir(), '.codex', 'loop-worktrees', repoName),
  );
  const target = join(worktreeRoot, entry);
  return { root, entry, branch, target };
}

function snapshot(root, branch, target) {
  const ref = `refs/heads/${branch}`;
  const remoteRef = `refs/remotes/origin/${branch}`;
  const worktrees = parseWorktrees(git(['worktree', 'list', '--porcelain'], root));
  const worktree = worktrees.find((entry) => entry.branch === ref) ?? null;
  const branchExists = (() => {
    try {
      git(['show-ref', '--verify', '--quiet', ref], root);
      return true;
    } catch {
      return false;
    }
  })();
  const remoteBranchExists = (() => {
    try {
      git(['show-ref', '--verify', '--quiet', remoteRef], root);
      return true;
    } catch {
      return false;
    }
  })();
  const path = worktree?.worktree ? resolve(worktree.worktree) : null;
  const dirtyPaths = path
    ? git(['status', '--porcelain'], path).split(/\r?\n/).filter(Boolean)
    : [];
  return {
    branch,
    branchExists,
    remoteBranchExists,
    worktree: path,
    expectedTarget: target,
    head: worktree?.HEAD ?? (branchExists ? git(['rev-parse', ref], root) : null),
    dirtyPaths,
  };
}

function ensure(values) {
  const { root, entry, branch, target } = context(values);
  const base = values.get('base');
  if (!base) fail('ensure에는 --base가 필요합니다.');
  const baseCommit = git(['rev-parse', `${base}^{commit}`], root);
  const before = snapshot(root, branch, target);
  if (before.head && !isAncestor(root, baseCommit, before.head)) {
    fail('기존 executor branch가 요청한 base를 포함하지 않아 보존하고 중단합니다.', 3, {
      baseCommit,
      branch,
      branchHead: before.head,
    });
  }
  if (before.worktree) {
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'ensure', entry, reused: true, baseCommit, ...before })}\n`,
    );
    return;
  }
  if (existsSync(target)) {
    fail('예상 worktree 경로가 이미 존재하지만 Git에 등록되지 않아 보존하고 중단합니다.', 3, {
      target,
    });
  }

  mkdirSync(dirname(target), { recursive: true });
  if (before.branchExists) git(['worktree', 'add', target, branch], root);
  else if (before.remoteBranchExists) {
    git(['branch', '--track', branch, `origin/${branch}`], root);
    git(['worktree', 'add', target, branch], root);
  } else git(['worktree', 'add', '-b', branch, target, baseCommit], root);

  const after = snapshot(root, branch, target);
  process.stdout.write(
    `${JSON.stringify({ ok: true, command: 'ensure', entry, reused: false, baseCommit, ...after })}\n`,
  );
}

function status(values) {
  const { root, entry, branch, target } = context(values);
  process.stdout.write(
    `${JSON.stringify({ ok: true, command: 'status', entry, ...snapshot(root, branch, target) })}\n`,
  );
}

const { command, values } = parseArgs(process.argv.slice(2));
if (command === 'ensure') ensure(values);
else if (command === 'status') status(values);
else fail('명령은 ensure 또는 status여야 합니다.');
