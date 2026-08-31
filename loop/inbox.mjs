import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRY_PATTERN = /^IN-\d{8}-\d{6}(?:-\d{2})?$/;
const ENTRY_HEADING_PATTERN = /^## (IN-\d{8}-\d{6}(?:-\d{2})?)[ \t]*$/;
const BACKGROUND_ACTIVE_STATUSES = Object.freeze([
  'implementing',
  'verifying',
  'ready-for-integration',
  'integrating',
]);
const DIRECT_ACTIVE_STATUSES = Object.freeze([
  'direct-implementing',
  'direct-verifying',
  'direct-integrating',
]);

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

function openingFence(line) {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return null;
  const marker = match[2];
  if (marker[0] === '`' && match[3].includes('`')) return null;
  return { marker: marker[0], length: marker.length };
}

function closesFence(line, fence) {
  const match = /^( {0,3})(`{3,}|~{3,})[ \t]*$/.exec(line);
  return Boolean(match && match[2][0] === fence.marker && match[2].length >= fence.length);
}

function entryHeadings(source) {
  const headings = [];
  let offset = 0;
  let fence = null;

  while (offset < source.length) {
    const newline = source.indexOf('\n', offset);
    const nextOffset = newline === -1 ? source.length : newline + 1;
    let line = source.slice(offset, newline === -1 ? source.length : newline);
    if (line.endsWith('\r')) line = line.slice(0, -1);

    if (fence) {
      if (closesFence(line, fence)) fence = null;
    } else {
      fence = openingFence(line);
      if (!fence) {
        const heading = ENTRY_HEADING_PATTERN.exec(line);
        if (heading) headings.push({ entry: heading[1], start: offset });
      }
    }

    offset = nextOffset;
  }

  return headings;
}

function entryStatus(block) {
  const metadataEndMatch = /\r?\n### /.exec(block);
  const metadata = block.slice(0, metadataEndMatch?.index ?? block.length);
  const matches = [...metadata.matchAll(/^- status: ([a-z-]+)[ \t]*\r?$/gm)];
  if (matches.length !== 1) return null;
  return matches[0][1];
}

function entryBlocks(source) {
  const headings = entryHeadings(source);
  return headings.map((heading, index) => ({
    ...heading,
    end: headings[index + 1]?.start ?? source.length,
    block: source.slice(heading.start, headings[index + 1]?.start ?? source.length),
  }));
}

export function removeDoneEntry(source, entry) {
  if (!ENTRY_PATTERN.test(entry ?? '')) {
    throw new Error('entry는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  }

  const matches = entryBlocks(source).filter((heading) => heading.entry === entry);

  if (matches.length !== 1) {
    throw new Error(`entry block은 정확히 하나여야 합니다: ${entry} (${matches.length}개)`);
  }

  const match = matches[0];
  const block = source.slice(match.start, match.end);
  const status = entryStatus(block);
  if (status !== 'done') {
    throw new Error(`done entry만 정리할 수 있습니다: ${entry} (${status ?? 'status 없음'})`);
  }

  return {
    content: source.slice(0, match.start) + source.slice(match.end),
    removed: { entry, status, start: match.start, end: match.end },
  };
}

function metadataValue(block, key) {
  const metadataEndMatch = /\r?\n### /.exec(block);
  const metadata = block.slice(0, metadataEndMatch?.index ?? block.length);
  const match = new RegExp(`^- ${key}: (.+?)[ \\t]*\\r?$`, 'm').exec(metadata);
  const value = match?.[1] ?? null;
  return value === 'null' ? null : value;
}

export function listEntries(source) {
  return entryBlocks(source).map((heading) => {
    const { block } = heading;
    return Object.freeze({
      id: heading.entry,
      status: entryStatus(block),
      priority: metadataValue(block, 'priority') ?? 'normal',
      title: metadataValue(block, 'title'),
      executionMode: metadataValue(block, 'execution_mode'),
      claimedAt: metadataValue(block, 'direct_claimed_at'),
      claimedBy: metadataValue(block, 'direct_claimed_by'),
      claimBase: metadataValue(block, 'direct_claim_base'),
      start: heading.start,
      end: heading.end,
    });
  });
}

export function selectBackgroundWork(entries) {
  const directClaims = entries.filter((entry) => DIRECT_ACTIVE_STATUSES.includes(entry.status));
  const backgroundActive = entries.filter((entry) =>
    BACKGROUND_ACTIVE_STATUSES.includes(entry.status),
  );
  if (directClaims.length > 1) {
    throw new Error(
      `direct claim은 하나여야 합니다: ${directClaims.map((entry) => entry.id).join(', ')}`,
    );
  }
  if (backgroundActive.length > 1) {
    throw new Error(
      `background active entry는 하나여야 합니다: ${backgroundActive.map((entry) => entry.id).join(', ')}`,
    );
  }
  if (directClaims.length === 1 && backgroundActive.length === 1) {
    throw new Error(
      `background/direct ownership이 겹칩니다: ${backgroundActive[0].id}, ${directClaims[0].id}`,
    );
  }
  if (directClaims.length === 1) {
    return Object.freeze({ entry: null, directClaim: directClaims[0] });
  }

  const active = backgroundActive[0];
  if (active) return Object.freeze({ entry: active, directClaim: null });

  const priorityRank = new Map([
    ['urgent', 0],
    ['high', 1],
    ['normal', 2],
    ['low', 3],
  ]);
  const entry =
    entries
      .filter((entry) => entry.status === 'new')
      .sort(
        (left, right) =>
          (priorityRank.get(left.priority) ?? 2) - (priorityRank.get(right.priority) ?? 2) ||
          left.id.localeCompare(right.id),
      )[0] ?? null;
  return Object.freeze({ entry, directClaim: null });
}

function replaceMetadataLine(metadata, pattern, replacement, label) {
  const matches = [...metadata.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${label} metadata는 정확히 하나여야 합니다.`);
  return metadata.replace(pattern, replacement);
}

export function claimDirectEntry(
  source,
  entry,
  { claimedAt, claimedBy = 'dev-inbox-direct', claimBase } = {},
) {
  if (!ENTRY_PATTERN.test(entry ?? ''))
    throw new Error('entry는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  if (!claimedAt || Number.isNaN(Date.parse(claimedAt))) {
    throw new Error('direct claim에는 유효한 claimedAt이 필요합니다.');
  }
  if (!/^[a-z0-9-]+$/.test(claimedBy))
    throw new Error('claimedBy는 lowercase skill ID여야 합니다.');
  if (!claimBase) throw new Error('direct claim에는 claimBase가 필요합니다.');

  const blocks = entryBlocks(source);
  const targetMatches = blocks.filter((candidate) => candidate.entry === entry);
  if (targetMatches.length !== 1) {
    throw new Error(`entry block은 정확히 하나여야 합니다: ${entry} (${targetMatches.length}개)`);
  }

  const entries = listEntries(source);
  const backgroundActive = entries.filter((candidate) =>
    BACKGROUND_ACTIVE_STATUSES.includes(candidate.status),
  );
  if (backgroundActive.length > 0) {
    throw new Error(
      `background active entry가 있어 direct claim을 거부합니다: ${backgroundActive.map((candidate) => candidate.id).join(', ')}`,
    );
  }
  const directClaims = entries.filter((candidate) =>
    DIRECT_ACTIVE_STATUSES.includes(candidate.status),
  );
  if (directClaims.length > 0) {
    if (directClaims.length === 1 && directClaims[0].id === entry) {
      return {
        content: source,
        claimed: { entry, alreadyClaimed: true, status: directClaims[0].status },
      };
    }
    throw new Error(
      `다른 direct claim이 있습니다: ${directClaims.map((candidate) => candidate.id).join(', ')}`,
    );
  }

  const target = targetMatches[0];
  if (entryStatus(target.block) !== 'new') {
    throw new Error(
      `new entry만 direct claim할 수 있습니다: ${entry} (${entryStatus(target.block) ?? 'status 없음'})`,
    );
  }

  const metadataEndMatch = /\r?\n### /.exec(target.block);
  if (!metadataEndMatch) throw new Error(`${entry} metadata 경계를 찾을 수 없습니다.`);
  const newline = target.block.includes('\r\n') ? '\r\n' : '\n';
  let metadata = target.block.slice(0, metadataEndMatch.index);
  const remainder = target.block.slice(metadataEndMatch.index);
  metadata = replaceMetadataLine(
    metadata,
    /^- status: new[ \t]*\r?$/gm,
    '- status: direct-implementing',
    'status',
  );
  metadata = replaceMetadataLine(
    metadata,
    /^- executor_branch: null[ \t]*\r?$/gm,
    `- executor_branch: codex/loop/${entry.toLowerCase()}`,
    'executor_branch',
  );
  const acceptedLine = `- accepted_at: ${claimedAt}`;
  metadata = replaceMetadataLine(
    metadata,
    /^- accepted_at: null[ \t]*\r?$/gm,
    acceptedLine,
    'accepted_at',
  );
  const directFields = [
    ['execution_mode', 'direct'],
    ['direct_claimed_at', claimedAt],
    ['direct_claimed_by', claimedBy],
    ['direct_claim_base', claimBase],
  ];
  if (/^- execution_mode: /m.test(metadata)) {
    for (const [key, value] of directFields) {
      metadata = replaceMetadataLine(
        metadata,
        new RegExp(`^- ${key}: null[ \\t]*\\r?$`, 'gm'),
        `- ${key}: ${value}`,
        key,
      );
    }
  } else {
    metadata = metadata.replace(
      acceptedLine,
      [acceptedLine, ...directFields.map(([key, value]) => `- ${key}: ${value}`)].join(newline),
    );
  }
  const block = metadata + remainder;
  return {
    content: source.slice(0, target.start) + block + source.slice(target.end),
    claimed: {
      entry,
      alreadyClaimed: false,
      status: 'direct-implementing',
      claimedAt,
      claimedBy,
      claimBase,
    },
  };
}

function resolveContext(values) {
  const repo = resolve(values.get('repo') ?? process.cwd());
  const root = git(['rev-parse', '--show-toplevel'], repo);
  const entry = values.get('entry');
  if (!ENTRY_PATTERN.test(entry ?? '')) {
    fail('--entry는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  }
  const customFile = values.get('file');
  const liveInbox = join(root, 'docs', 'feedback', 'INBOX.md');
  const file = customFile ? resolve(customFile) : liveInbox;
  const isLiveInbox = file.toLowerCase() === liveInbox.toLowerCase();
  return { root, entry, file, isLiveInbox };
}

function plan(values) {
  const { entry, file } = resolveContext(values);
  try {
    const source = readFileSync(file, 'utf8');
    const result = removeDoneEntry(source, entry);
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'plan', file, ...result.removed })}\n`,
    );
  } catch (error) {
    fail(error.message, 2, { file, entry });
  }
}

function list(values) {
  const { file } = resolveContextForList(values);
  try {
    const entries = listEntries(readFileSync(file, 'utf8'));
    process.stdout.write(`${JSON.stringify({ ok: true, command: 'list', file, entries })}\n`);
  } catch (error) {
    fail(error.message, 2, { file });
  }
}

function next(values) {
  const { file } = resolveContextForList(values);
  try {
    const entries = listEntries(readFileSync(file, 'utf8'));
    const selection = selectBackgroundWork(entries);
    process.stdout.write(`${JSON.stringify({ ok: true, command: 'next', file, ...selection })}\n`);
  } catch (error) {
    fail(error.message, 2, { file });
  }
}

function claimDirect(values) {
  const { root, entry, file, isLiveInbox } = resolveContext(values);
  const claimedAt = values.get('claimed-at');
  const claimedBy = values.get('claimed-by') ?? 'dev-inbox-direct';
  let claimBase = values.get('expected-head');
  if (isLiveInbox) {
    if (!claimBase) fail('live INBOX direct claim에는 --expected-head가 필요합니다.');
    const leaseToken = values.get('lease-token');
    if (!leaseToken) fail('live INBOX direct claim에는 --lease-token이 필요합니다.');
    const branch = git(['branch', '--show-current'], root);
    const actualHead = git(['rev-parse', 'HEAD'], root);
    const dirtyPaths = git(['status', '--porcelain=v1'], root);
    if (branch !== 'main' || actualHead !== claimBase || dirtyPaths) {
      fail('clean main branch 또는 expected HEAD가 달라 direct claim을 중단합니다.', 3, {
        branch,
        expectedHead: claimBase,
        actualHead,
        dirtyPaths: dirtyPaths ? dirtyPaths.split(/\r?\n/) : [],
      });
    }
    const leaseStatus = JSON.parse(
      execFileSync(process.execPath, [join(root, 'loop', 'lock.mjs'), 'status', '--repo', root], {
        cwd: root,
        encoding: 'utf8',
      }),
    );
    if (leaseStatus.owner?.token !== leaseToken || leaseStatus.owner?.expectedHead !== actualHead) {
      fail('현재 main HEAD를 소유한 lease가 아니어서 direct claim을 중단합니다.', 3, {
        owner: leaseStatus.owner ?? null,
        actualHead,
      });
    }
  } else {
    claimBase ??= values.get('claim-base') ?? 'fixture';
  }

  try {
    const source = readFileSync(file, 'utf8');
    const result = claimDirectEntry(source, entry, { claimedAt, claimedBy, claimBase });
    if (!result.claimed.alreadyClaimed) {
      const temporaryFile = `${file}.tmp-${process.pid}-${randomUUID()}`;
      try {
        writeFileSync(temporaryFile, result.content, { encoding: 'utf8', flag: 'wx' });
        renameSync(temporaryFile, file);
      } finally {
        if (existsSync(temporaryFile)) rmSync(temporaryFile);
      }
    }
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'claim-direct', file, ...result.claimed })}\n`,
    );
  } catch (error) {
    fail(error.message, 2, { file, entry });
  }
}

function resolveContextForList(values) {
  const repo = resolve(values.get('repo') ?? process.cwd());
  const root = git(['rev-parse', '--show-toplevel'], repo);
  const customFile = values.get('file');
  return {
    root,
    file: customFile ? resolve(customFile) : join(root, 'docs', 'feedback', 'INBOX.md'),
  };
}

function removeDone(values) {
  const { root, entry, file, isLiveInbox } = resolveContext(values);
  if (isLiveInbox) {
    const expectedHead = values.get('expected-head');
    if (!expectedHead) fail('live INBOX 정리에는 --expected-head가 필요합니다.');
    const branch = git(['branch', '--show-current'], root);
    const actualHead = git(['rev-parse', 'HEAD'], root);
    if (branch !== 'main' || actualHead !== expectedHead) {
      fail('main branch 또는 expected HEAD가 달라 INBOX 정리를 중단합니다.', 3, {
        branch,
        expectedHead,
        actualHead,
      });
    }
  }

  try {
    const source = readFileSync(file, 'utf8');
    const result = removeDoneEntry(source, entry);
    const temporaryFile = `${file}.tmp-${process.pid}-${randomUUID()}`;
    try {
      writeFileSync(temporaryFile, result.content, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporaryFile, file);
    } finally {
      if (existsSync(temporaryFile)) rmSync(temporaryFile);
    }
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'remove-done', file, ...result.removed })}\n`,
    );
  } catch (error) {
    fail(error.message, 2, { file, entry });
  }
}

function main() {
  const { command, values } = parseArgs(process.argv.slice(2));
  if (command === 'list') list(values);
  else if (command === 'next') next(values);
  else if (command === 'claim-direct') claimDirect(values);
  else if (command === 'plan') plan(values);
  else if (command === 'remove-done') removeDone(values);
  else fail('명령은 list, next, claim-direct, plan 또는 remove-done이어야 합니다.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
