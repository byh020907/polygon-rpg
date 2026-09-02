const FUNCTIONAL_EVENT_TYPES = new Set([
  'counter',
  'guard-break',
  'hit',
  'just-guard',
  'launch',
  'punish',
]);

function freezeRecord(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) freezeRecord(entry);
  return Object.freeze(value);
}

const MINE_TUNNEL_ART_DIRECTION = freezeRecord({
  id: 'mine-rescue-cutout-benchmark',
  saturationRetention: 0.12,
  quantizationLevels: 4,
  ambientIntensity: 0.2,
  cameraZoom: 2.65,
  cameraFocusY: 0.72,
  mobileCameraScale: 1.08,
  lights: [
    {
      id: 'mine-shaft-daylight',
      kind: 'directional',
      direction: { x: -0.42, y: 0.91 },
      intensity: 0.78,
      color: '#d9ddd7',
    },
    {
      id: 'mine-rescue-signal-light',
      kind: 'point',
      position: { x: 788, y: 392 },
      intensity: 1.25,
      range: 180,
      color: '#8dd8c6',
    },
    {
      id: 'mine-warning-cable-light',
      kind: 'point',
      position: { x: 706, y: 174 },
      intensity: 0.72,
      range: 330,
      color: '#d7924b',
    },
  ],
  staticShadowCasters: [
    {
      id: 'mine-trapped-worker-shadow',
      position: { x: 782, y: 426 },
      width: 13,
      height: 32,
      opacity: 0.5,
    },
  ],
});

export const SCRAP_ART_DIRECTION_PROFILE = freezeRecord({
  id: 'scrap-cutout-vector-art',
  rooms: {
    'abandoned-mine-rescue-tunnel': MINE_TUNNEL_ART_DIRECTION,
  },
});

export function createSceneArtDirectionReadModel(
  profile,
  { roomId, combatEvents = [], player = null, enemy = null } = {},
) {
  const scene = profile?.rooms?.[roomId];
  if (!scene) return null;

  const transientLights = combatEvents
    .filter(
      (event) =>
        FUNCTIONAL_EVENT_TYPES.has(event.type) &&
        event.position &&
        Number.isFinite(event.remainingSeconds) &&
        event.remainingSeconds > 0,
    )
    .map((event) => {
      const life = Math.max(0, Math.min(1, event.remainingSeconds / event.durationSeconds));
      return freezeRecord({
        id: `combat-contact-light-${event.id}`,
        kind: 'point',
        position: event.position,
        intensity: 0.55 + Math.min(2.2, event.strength) * 0.7,
        range: 96 + Math.min(2.2, event.strength) * 56,
        color:
          event.type === 'just-guard'
            ? '#f0e6ba'
            : (event.enchantment?.highlightColor ?? '#f1a65e'),
        transient: true,
        progress: 1 - life,
      });
    });

  const shadowCasters = [
    ...scene.staticShadowCasters,
    ...(player
      ? [
          freezeRecord({
            id: 'player-ground-shadow',
            position: { x: player.position.x, y: player.groundY },
            width: 34 * player.scale,
            height: 98 * player.scale,
            opacity: 0.58,
          }),
        ]
      : []),
    ...(enemy
      ? [
          freezeRecord({
            id: 'enemy-ground-shadow',
            position: { x: enemy.position.x, y: enemy.groundY },
            width: enemy.width,
            height: enemy.height,
            opacity: 0.66,
          }),
        ]
      : []),
  ];

  return freezeRecord({
    id: scene.id,
    saturationRetention: scene.saturationRetention,
    quantizationLevels: scene.quantizationLevels,
    ambientIntensity: scene.ambientIntensity,
    cameraZoom: scene.cameraZoom,
    cameraFocusY: scene.cameraFocusY,
    mobileCameraScale: scene.mobileCameraScale,
    lights: [...scene.lights, ...transientLights],
    shadowCasters,
  });
}
