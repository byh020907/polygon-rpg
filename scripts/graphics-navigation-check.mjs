import assert from 'node:assert/strict';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { GAME_UI_RESOURCES, APP_IMAGE_RESOURCES } from '../src/ui/GameUiCatalog.js';
import { graphicsNavigation } from '../src/ui/GraphicsNavigation.js';
const catalog = createGraphicsResourceCatalog({
  additionalResources: [...GAME_UI_RESOURCES, ...APP_IMAGE_RESOURCES],
});
const selected = [],
  leaves = [];
const tree = graphicsNavigation(catalog, (id, point) => selected.push({ id, point }));
const walk = (node) => {
  if (node.children) node.children.forEach(walk);
  else {
    assert.ok(node.resourceId);
    leaves.push(node.resourceId);
    node.run({ x: 1, y: 2 });
  }
};
walk(tree);
assert.deepEqual([...leaves].sort(), catalog.resources.map((r) => r.id).sort());
assert.equal(new Set(leaves).size, leaves.length);
assert.equal(selected.length, leaves.length);
assert.ok(selected.every((s) => s.point.x === 1 && s.point.y === 2));
console.log(
  `PASS every ${leaves.length} catalog resource reachable exactly once through Find, including all UI/image leaves`,
);
