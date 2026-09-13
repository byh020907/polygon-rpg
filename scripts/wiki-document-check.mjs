import assert from 'node:assert/strict';
import fs from 'node:fs';
import { numberWikiSections, renderWikiDocument, wrapWikiReport } from './wiki-document.mjs';

const numbered = numberWikiSections(
  '<span id="doc-section-1"></span><h2>개요</h2><h3 id="saved-id">상세</h3><p>원문</p>',
);
assert.equal(numbered.headings[0].id, 'doc-section-1-heading');
assert.equal(numbered.headings[1].id, 'saved-id');
assert.equal(numbered.headings[1].number, '1.1.');
assert.match(numbered.content, /<p>원문<\/p>/);

const script = '<script>const recorded={time:42,image:"data:image/png;base64,AAA"};</script>';
const report = wrapWikiReport(
  `<title>보고서</title><h1>기록</h1><h2>재생</h2><canvas id="view"></canvas>${script}`,
);
assert.ok(report.includes(script), 'captured report data and playback code remain verbatim');
assert.match(report, /<style data-wiki-style>[\s\S]*--signal: #00a495/);
assert.equal(wrapWikiReport(report), report, 'report formatting is idempotent');
const empty = renderWikiDocument({
  title: '표 문서',
  body: '<table><tr><td>내용</td></tr></table>',
});
assert.match(empty, /href="#doc-section-1"/);

const product = fs.readFileSync('PRODUCT_GOAL.html', 'utf8');
assert.match(product, /href="\.\/docs\/wiki.css"/);
assert.doesNotMatch(product, /<style>/);
const index = JSON.parse(fs.readFileSync('docs/art-handoff/inventory.json', 'utf8'));
const documents = index.pages.filter((page) => page.endsWith('.html'));
const actualDocuments = fs
  .readdirSync('docs/art-handoff', { recursive: true })
  .filter((page) => page.endsWith('.html'))
  .map((page) => page.replaceAll('\\', '/'));
assert.deepEqual(
  actualDocuments.sort(),
  [...documents].sort(),
  'every HTML document has a generator owner',
);
for (const path of documents) {
  const html = fs.readFileSync('docs/art-handoff/' + path, 'utf8');
  assert.match(html, /class="wiki-global-header masthead"/);
  assert.match(html, /class="wiki-left-sidebar"/);
  assert.match(html, /class="wiki-right-sidebar"/);
  assert.match(html, /class="wiki-toc"/);
  assert.match(html, /class="wiki-section-number"/);
  assert.match(html, /href="(?:\.\.\/)+wiki.css"/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${path} has one document title`);
  assert.doesNotMatch(html, /<script\b/);
}
console.log(
  `PASS shared wiki document format: Product Goal + ${documents.length} handbooks, preserved anchors/report data.`,
);
