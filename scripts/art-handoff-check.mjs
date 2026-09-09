import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { GAME_UI_RESOURCES, APP_IMAGE_RESOURCES } from '../src/ui/GameUiCatalog.js';
import { readGraphicsReviewRequest } from '../src/ui/GraphicsReviewConfig.js';
const root = path.resolve(import.meta.dirname, '..'),
  base = path.join(root, 'docs/art-handoff');
const catalog = createGraphicsResourceCatalog({
  additionalResources: [...GAME_UI_RESOURCES, ...APP_IMAGE_RESOURCES],
});
const index = JSON.parse(fs.readFileSync(path.join(base, 'inventory.json'), 'utf8'));
assert.deepEqual(index.records.map((r) => r.id).sort(), catalog.resources.map((r) => r.id).sort());
for (const contractPage of [
  'asset-contract.html',
  'environment-authoring.html',
  'character-animation.html',
  'reference-approval.html',
])
  assert.ok(index.pages.includes(contractPage), 'Missing production contract ' + contractPage);
const decode = (s) =>
  s
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
let links = 0,
  previews = 0;
const rowIds = [];
for (const file of index.pages.filter((p) => p.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(base, file), 'utf8');
  assert.match(html, /<h1>/);
  assert.doesNotMatch(html, /<script\b/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decode(m[1]));
  assert.equal(ids.length, new Set(ids).size, file + ' duplicate anchor');
  rowIds.push(...[...html.matchAll(/data-resource-id="([^"]+)"/g)].map((m) => decode(m[1])));
  const pageUrl = new URL('/docs/art-handoff/' + file, 'https://local.test');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(decode(match[1]), pageUrl);
    if (url.origin !== pageUrl.origin) continue;
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    assert.ok(target.startsWith(root + path.sep) || target === root);
    assert.ok(fs.existsSync(target), file + ' missing ' + url.pathname);
    links++;
    if (url.searchParams.get('graphicsReview') === '1') {
      const request = readGraphicsReviewRequest(url.search);
      assert.ok(catalog.get(request.resourceId));
      previews++;
    }
    if (url.hash && target.endsWith('.html')) {
      const text = fs.readFileSync(target, 'utf8'),
        id = decodeURIComponent(url.hash.slice(1));
      assert.ok(
        [...text.matchAll(/\sid="([^"]+)"/g)].some((m) => decode(m[1]) === id),
        file + ' missing anchor ' + id,
      );
    }
  }
}
assert.deepEqual(rowIds.sort(), catalog.resources.map((r) => r.id).sort());
assert.ok(index.records.filter((r) => r.category === 'npc').every((r) => r.actorId));
assert.equal(index.pages.filter((p) => p.startsWith('scenarios/')).length, 10);
console.log(
  `PASS handoff: ${rowIds.length} exact resource rows, all NPC roles, 10 scenario pages, ${links} local links, ${previews} valid review links, no runtime JS.`,
);
