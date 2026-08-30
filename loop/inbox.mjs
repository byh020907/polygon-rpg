import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRY_PATTERN = /^IN-\d{8}-\d{6}(?:-\d{2})?$/;
const ENTRY_HEADING_PATTERN = /^## (IN-\d{8}-\d{6}(?:-\d{2})?)[ \t]*$/;

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

export function removeDoneEntry(source, entry) {
  if (!ENTRY_PATTERN.test(entry ?? '')) {
    throw new Error('entry는 IN-YYYYMMDD-HHmmss 형식이어야 합니다.');
  }

  const headings = entryHeadings(source);
  const matches = headings
    .map((heading, index) => ({
      ...heading,
      end: headings[index + 1]?.start ?? source.length,
    }))
    .filter((heading) => heading.entry === entry);

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
  return match?.[1] ?? null;
}

export function listEntries(source) {
  const headings = entryHeadings(source);
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.start ?? source.length;
    const block = source.slice(heading.start, end);
    return Object.freeze({
      id: heading.entry,
      status: entryStatus(block),
      priority: metadataValue(block, 'priority') ?? 'normal',
      title: metadataValue(block, 'title'),
      start: heading.start,
      end,
    });
  });
}

function nextEntry(entries) {
  const activeStatuses = new Set([
    'implementing',
    'verifying',
    'ready-for-integration',
    'integrating',
  ]);
  const active = entries.find((entry) => activeStatuses.has(entry.status));
  if (active) return active;

  const priorityRank = new Map([
    ['urgent', 0],
    ['high', 1],
    ['normal', 2],
    ['low', 3],
  ]);
  return (
    entries
      .filter((entry) => entry.status === 'new')
      .sort(
        (left, right) =>
          (priorityRank.get(left.priority) ?? 2) - (priorityRank.get(right.priority) ?? 2) ||
          left.id.localeCompare(right.id),
      )[0] ?? null
  );
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
    process.stdout.write(
      `${JSON.stringify({ ok: true, command: 'next', file, entry: nextEntry(entries) })}\n`,
    );
  } catch (error) {
    fail(error.message, 2, { file });
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
  else if (command === 'plan') plan(values);
  else if (command === 'remove-done') removeDone(values);
  else fail('명령은 list, next, plan 또는 remove-done이어야 합니다.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
