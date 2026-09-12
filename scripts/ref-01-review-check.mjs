import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const imagePath = path.join(root, 'docs/references/ref-01/hero-rival-owner-candidate-v1.png');
const pagePath = path.join(root, 'docs/art-handoff/reference-approval.html');

const image = fs.readFileSync(imagePath);
assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG', 'REF-01 candidate must be PNG');
assert.equal(image.subarray(12, 16).toString('ascii'), 'IHDR', 'REF-01 candidate needs IHDR');

const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
const ratio = width / height;
assert.ok(width >= 1600 && height >= 900, `REF-01 candidate is too small: ${width}x${height}`);
assert.ok(ratio >= 1.6 && ratio <= 1.9, `REF-01 candidate ratio is unexpected: ${ratio}`);

const page = fs.readFileSync(pagePath, 'utf8');
assert.match(page, /REF-01 · 1차 승인 후보/);
assert.match(page, /Human 승인 대기 · runtime 미적용/);
assert.match(page, /hero-rival-owner-candidate-v1\.png/);
assert.match(page, /낮은 횡베기/);
assert.match(page, /실제 전방 회전 구르기/);
assert.match(page, /수정 또는 승인 기록 뒤에만/);
assert.doesNotMatch(page, /REF-01[^<]{0,80}(?:승인 완료|runtime 적용 완료)/);

console.log(
  `PASS REF-01 review candidate: ${width}x${height}, approval pending, runtime not applied.`,
);
