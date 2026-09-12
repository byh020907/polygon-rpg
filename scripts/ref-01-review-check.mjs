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

const page = fs.readFileSync(pagePath, 'utf8').replace(/\s+/g, ' ');
assert.match(page, /REF-01 · 1안 선택됨/);
assert.match(
  page,
  /Human 선택 완료 · master SVG 원본\/export 생성 · 주인공\/프롤로그 cast runtime 연결/,
);
assert.match(page, /hero-rival-owner-candidate-v1\.png/);
assert.match(page, /낮은 횡베기/);
assert.match(page, /실제 전방 회전 구르기/);
assert.match(page, /3안 비교 승인 방식/);
assert.match(page, /의미 있게 다른 3안/);
assert.match(page, /최종 아트 승인과 구분/);
assert.match(page, /scrapyard-apprentice\.master\.svg/);
assert.match(page, /rival-scout\.master\.svg/);
assert.match(page, /scrapyard-owner\.master\.svg/);
assert.match(page, /href="\.\.\/\.\.\/public\/graphics\/scrapyard-apprentice\.master\.svg"/);
assert.doesNotMatch(page, /&lt;a href=.*master\.svg/);
assert.doesNotMatch(page, /REF-01[^<]{0,80}(?:승인 완료|runtime 적용 완료)/);

console.log(
  `PASS REF-01 selected direction: ${width}x${height}, hero/prologue runtime connected, final art review remains separate.`,
);
