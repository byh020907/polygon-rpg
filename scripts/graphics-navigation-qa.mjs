import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { graphicsNavigation } from '../src/ui/GraphicsNavigation.js';
const catalog = createGraphicsResourceCatalog(),
  tree = graphicsNavigation(catalog, () => {});
const target = catalog.resources.filter((r) => r.category === 'prop').at(-1);
function find(node, path = []) {
  if (node.resourceId === target.id) return path;
  for (const child of node.children ?? []) {
    const found = find(child, [...path, child.label]);
    if (found) return found;
  }
}
const path = find(tree);
assert.ok(path);
fs.mkdirSync('artifacts/radial-leaves', { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
  ['portrait', 390, 844],
]) {
  const b = await openQaBrowser({ width, height, search: '?graphicsReview=1' });
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    await b.click('[data-gr=find]', name !== 'desktop');
    const center = await b.evaluate(
      "document.querySelector('.gr-radial-center').getBoundingClientRect().toJSON()",
    );
    for (const label of path) {
      let index = -1;
      for (let page = 0; page < 100; page++) {
        index = await b.evaluate(
          `[...document.querySelectorAll('.gr-radial-item')].findIndex(n=>n.title===${JSON.stringify(label)})`,
        );
        if (index >= 0) break;
        const next = await b.evaluate(
          "[...document.querySelectorAll('.gr-radial-item')].findIndex(n=>n.textContent.startsWith('다음 '))",
        );
        assert.ok(next >= 0, label);
        await b.click(`.gr-radial-item:nth-of-type(${next + 1})`, name !== 'desktop');
      }
      assert.ok(index >= 0, label);
      const boxes = await b.evaluate(
        "[...document.querySelectorAll('.gr-radial button')].map(n=>n.getBoundingClientRect().toJSON())",
      );
      assert.ok(
        boxes.every((r) => r.left >= 0 && r.top >= 0 && r.right <= width && r.bottom <= height),
      );
      const c = boxes.at(-1);
      assert.ok(
        Math.abs(c.x - center.x) < 1 && Math.abs(c.y - center.y) < 1,
        'submenu center moved',
      );
      await b.screenshot(`artifacts/radial-leaves/${name}-leaves.png`);
      await b.click(`.gr-radial-item:nth-of-type(${index + 1})`, name !== 'desktop');
    }
    assert.equal(
      await b.evaluate("document.querySelector('#graphics-review').dataset.resourceId"),
      target.id,
    );
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    console.log(
      name,
      'PASS final leaf through Find, paging, stable center, viewport bounds',
      target.id,
    );
  } finally {
    await b.close();
  }
}
