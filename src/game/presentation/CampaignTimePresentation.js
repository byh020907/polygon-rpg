const deep = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(deep);
    Object.freeze(v);
  }
  return v;
};
const PHASES = deep({
  morning: { label: '아침', sky: '#e9ceb0', blend: 0.09, ambient: 0.55, light: 0.65 },
  day: { label: '낮', sky: '#d4e4e4', blend: 0, ambient: 0.55, light: 0.7 },
  evening: { label: '저녁', sky: '#c28f79', blend: 0.34, ambient: 0.45, light: 0.45 },
  night: { label: '밤', sky: '#213c53', blend: 0.78, ambient: 0.45, light: 0.28 },
});
const colors = new Map();
function blendColor(hex, target, t) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) return hex;
  const key = hex + target + t;
  if (colors.has(key)) return colors.get(key);
  const value =
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(hex.slice(i, i + 2), 16) * (1 - t) + parseInt(target.slice(i, i + 2), 16) * t,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  if (colors.size > 2048) colors.clear();
  colors.set(key, value);
  return value;
}
export function applyCampaignTimePresentation(
  frame,
  { phaseId = 'morning', player = null, fieldCapabilities = [], workLights = [] } = {},
) {
  const phase = PHASES[phaseId];
  if (!phase) throw new Error('Unknown campaign presentation phase ' + phaseId);
  const dim = phaseId === 'evening' || phaseId === 'night';
  const palette = Object.freeze({
    ...frame.palette,
    background: blendColor(frame.palette.background, phase.sky, phase.blend),
    arena: blendColor(frame.palette.arena, phase.sky, phase.blend),
  });
  const items = Object.freeze(
    frame.items.map((item) =>
      /sky|horizon|distant/.test(item.id)
        ? Object.freeze({ ...item, fill: blendColor(item.fill, phase.sky, phase.blend) })
        : item,
    ),
  );
  let artDirection = frame.artDirection;
  if (dim) {
    const base = artDirection ?? {
      id: 'campaign-natural-light',
      quantizationLevels: 4,
      saturationRetention: 0.8,
      lights: [],
      shadowCasters: [],
    };
    artDirection = {
      ...base,
      ambientIntensity: phase.ambient,
      lights: [
        ...base.lights.filter((l) => l.kind !== 'directional'),
        {
          id: 'campaign-' + phaseId,
          kind: 'directional',
          direction: { x: -0.35, y: 0.9, z: -0.2 },
          intensity: phase.light,
          color: phase.sky,
        },
        ...workLights,
      ],
    };
  }
  if (player && fieldCapabilities.includes('illuminate')) {
    const lens = frame.items.find((i) => i.equipmentSlot === 'tool' && i.emissive);
    const lightPosition = lens
      ? {
          x: lens.points.reduce((v, p) => v + p.x, 0) / lens.points.length,
          y: lens.points.reduce((v, p) => v + p.y, 0) / lens.points.length,
        }
      : { x: player.x - 8, y: player.y + 40 };
    const base = artDirection ?? {
      id: 'portable-work-light',
      quantizationLevels: 4,
      saturationRetention: 1,
      ambientIntensity: 0.8,
      lights: [],
      shadowCasters: [],
    };
    artDirection = {
      ...base,
      lights: [
        ...base.lights,
        {
          id: 'equipped-work-lamp',
          kind: 'point',
          position: lightPosition,
          intensity: 1,
          range: 125,
          color: '#ffe2a0',
        },
      ],
    };
  }
  return Object.freeze({
    ...frame,
    palette,
    items,
    artDirection: artDirection ? deep(artDirection) : null,
    campaignTime: Object.freeze({ phaseId, label: phase.label }),
  });
}
export const CAMPAIGN_TIME_PRESENTATIONS = PHASES;
