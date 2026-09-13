import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapWikiReport } from './wiki-document.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(repo, 'artifacts');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  process.stdout.write(
    'node scripts/format-html-reports.mjs [--check | --write]\nDefault: list known saved motion reports needing the shared wiki format.\n--check fails for unformatted reports. --write changes only their HTML presentation.\n',
  );
  process.exit(0);
}
if (args.some((arg) => !['--write', '--check'].includes(arg)) || args.length > 1) {
  throw new Error('Expected no arguments, --check, or --write.');
}

// The inventory is deliberately limited to the two production motion report
// formats. Gameplay pages, arbitrary HTML fixtures, PNGs and JSON are untouched.
function reportKind(file, html) {
  if (
    path.basename(file) === 'timeline.html' &&
    /const tracks\s*=/.test(html) &&
    html.includes('original recorded timestamps') &&
    html.includes('id="seek"')
  )
    return 'timeline';
  if (
    path.basename(file) === 'index.html' &&
    html.includes('normal speed') &&
    html.includes('roll → run') &&
    html.includes('Each timestamp is actual wall clock elapsed time')
  )
    return 'index';
  return null;
}

function* reportFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    // Never follow links into another checkout or outside the artifact directory.
    if (entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    const resolved = fs.realpathSync(file);
    const local = path.relative(fs.realpathSync(artifacts), resolved);
    if (!local || local === '..' || local.startsWith(`..${path.sep}`) || path.isAbsolute(local)) {
      throw new Error(`Refusing report path outside artifacts: ${file}`);
    }
    if (entry.isDirectory()) yield* reportFiles(file);
    else if (entry.isFile() && ['index.html', 'timeline.html'].includes(entry.name)) yield file;
  }
}

function formatReport(html, kind, file) {
  // Preserve script text, base64 frames, filenames and timestamp text verbatim.
  // The historical generators emitted only these simple top-level CSS rules.
  let styles = '';
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    const scoped = css.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectors, properties) => {
      const names = selectors.split(',').map((selector) => selector.trim());
      const remaining = names.filter((selector) => !['body', 'main', 'a', 'p'].includes(selector));
      if (!remaining.length) return '';
      if (remaining.some((selector) => selector.includes('@')))
        throw new Error('Unknown report stylesheet');
      // Controls use the shared document's light surface and text palette.
      if (remaining.some((selector) => ['button', 'select'].includes(selector))) {
        properties = properties
          .replace(/background:[^;}]*/g, 'background:#fafafa')
          .replace(/border:1px solid #[a-f\d]+/gi, 'border:1px solid #ccc');
      }
      return `${remaining.map((selector) => `.saved-motion-report ${selector}`).join(',')}{${properties}}`;
    });
    styles += scoped;
    return '';
  });
  let body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  body = body
    .replace(/<main\b[^>]*>/gi, '<div class="saved-report-content">')
    .replace(/<\/main>/gi, '</div>');
  if (kind === 'timeline')
    styles +=
      '.saved-motion-report output{overflow-wrap:anywhere}.saved-motion-report button,.saved-motion-report select{max-width:100%}';
  else
    styles +=
      '.wiki-document .saved-motion-report figure{flex:0 0 640px;margin:4px}.saved-motion-report img{display:block}';
  return wrapWikiReport(
    `<style>${styles}</style><div class="saved-motion-report">${kind === 'timeline' ? '<h2>Captured-frame playback</h2>' : ''}${body}</div>`,
    {
      category: '모션 검증 보고서',
      repoHref: `${path.relative(path.dirname(file), repo).replaceAll('\\', '/') || '.'}/`,
    },
  );
}

const pending = [];
let reports = 0;
if (fs.existsSync(artifacts)) {
  if (fs.lstatSync(artifacts).isSymbolicLink())
    throw new Error('Artifact root must not be a symlink.');
  for (const file of reportFiles(artifacts)) {
    const html = fs.readFileSync(file, 'utf8');
    const kind = reportKind(file, html);
    if (!kind) continue;
    reports++;
    const formatted = html.includes('class="wiki-document"')
      ? wrapWikiReport(html)
      : formatReport(html, kind, file);
    if (formatted === html) continue;
    pending.push(path.relative(repo, file).replaceAll('\\', '/'));
    if (args.includes('--write')) fs.writeFileSync(file, formatted);
  }
}
process.stdout.write(
  `${JSON.stringify({ mode: args[0] ?? 'dry-run', reports, changed: args.includes('--write') ? pending : [], pending: args.includes('--write') ? [] : pending }, null, 2)}\n`,
);
if (args.includes('--check') && pending.length) process.exitCode = 1;
