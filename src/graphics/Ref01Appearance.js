// Human-selected appearance option 2: bold silhouettes and two broad light bands.
// Geometry, collision and attachment anchors remain owned by the master/pose.
const ACTORS = new Set(['scrapyard-apprentice', 'rival-scout', 'scrapyard-owner']);
export function ref01Appearance(assetId, shape, scale = 1) {
  if (!ACTORS.has(assetId) || shape.opacity < 1) return {};
  const detail = /buckle|seam|inset|band|pocket|collar|goggles|bracer/.test(shape.id);
  return {
    stroke: detail ? undefined : '#252925',
    lineWidth: detail ? 0 : 1.65 * scale,
    quantizationLevels: 2,
    luminanceFloor: 0.62,
  };
}
