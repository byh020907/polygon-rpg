const VISUAL_QA_SCENARIOS = Object.freeze({
  academy: Object.freeze({ regionId: 'academy-region', roomId: 'academy-plaza', x: 270 }),
  training: Object.freeze({ regionId: 'academy-region', roomId: 'training-room', x: 360 }),
  field: Object.freeze({ regionId: 'academy-region', roomId: 'field-crossing', x: 420 }),
  dungeon: Object.freeze({ regionId: 'academy-region', roomId: 'sealed-forest-dungeon', x: 420 }),
  boss: Object.freeze({ regionId: 'academy-region', roomId: 'sealed-forest-boss', x: 360 }),
  'glasswind-field': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-approach',
    x: 360,
  }),
  'glasswind-dungeon': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-observatory',
    x: 360,
  }),
  'glasswind-boss': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-storm-eye',
    x: 360,
  }),
});

function parseFrame(value) {
  const frame = Number(value);
  if (!Number.isInteger(frame) || frame < 0 || frame > 120_000) {
    throw new RangeError(`visual QA frame은 0~120000 정수여야 합니다: ${value}`);
  }
  return frame;
}

export function readVisualQaRequest(search = globalThis.location?.search ?? '') {
  const parameters = new URLSearchParams(search);
  if (parameters.get('visualQa') !== '1') return null;

  const start = parameters.get('gameStart') ?? 'academy';
  const scenario = VISUAL_QA_SCENARIOS[start];
  if (!scenario) {
    throw new Error(
      `지원하지 않는 GAME_START입니다: ${start} (${Object.keys(VISUAL_QA_SCENARIOS).join(', ')})`,
    );
  }

  return Object.freeze({
    start,
    frame: parseFrame(parameters.get('gameFrame') ?? '0'),
    scenario,
  });
}

export function visualQaScenarioIds() {
  return Object.freeze(Object.keys(VISUAL_QA_SCENARIOS));
}
