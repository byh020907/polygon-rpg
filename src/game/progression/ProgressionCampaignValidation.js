import { toScrapCampaignSnapshot } from '../campaign/ScrapCampaignState.js';

// The campaign serializer owns its current shape. Storage validation must reject
// fields that serializer would discard, including nested record/array fields.
function assertNoDiscardedFields(source, canonical, path) {
  if (source === null || typeof source !== 'object') return;
  if (
    canonical === null ||
    typeof canonical !== 'object' ||
    Array.isArray(source) !== Array.isArray(canonical)
  ) {
    throw new TypeError(`${path} has an unsupported stored shape`);
  }
  for (const key of Object.keys(source)) {
    if (!Object.hasOwn(canonical, key))
      throw new TypeError(`Unknown stored campaign field: ${path}.${key}`);
    assertNoDiscardedFields(source[key], canonical[key], `${path}.${key}`);
  }
}

export function assertStoredCampaignSnapshot(value, profile) {
  const canonical = toScrapCampaignSnapshot(value, profile);
  assertNoDiscardedFields(value, canonical, 'scrapCampaign');
  return canonical;
}
