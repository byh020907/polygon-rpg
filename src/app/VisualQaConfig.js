const VISUAL_QA_PHASES = new Set(['start', 'active', 'end']);

const COMBAT_VISUAL_QA_SCENARIOS = Object.freeze({
  'combat-hit': Object.freeze({
    expectedEvent: 'hit',
    expectedMotion: 'slash',
    expectedItem: 'combat-enemy-hit-ring',
    expectedAnchor: 'event-contact',
  }),
  'combat-block': Object.freeze({
    expectedEvent: 'guard',
    expectedMotion: 'guard',
    expectedItem: 'player-block-ring',
    expectedAnchor: 'event-contact',
  }),
  'combat-evade': Object.freeze({
    expectedEvent: 'evade',
    expectedMotion: 'idle',
    expectedItem: 'player-evade-streak',
  }),
  'combat-punish': Object.freeze({
    expectedEvent: 'punish',
    expectedMotion: 'heavy',
    expectedItem: 'enemy-punish-spark-0',
    expectedAnchor: 'event-contact',
  }),
  'combat-launch': Object.freeze({
    expectedEvent: 'launch',
    expectedMotion: 'rising',
    expectedItem: 'combat-enemy-hit-ring',
    expectedAnchor: 'event-contact',
  }),
  'combat-landing': Object.freeze({
    expectedEvent: 'landing',
    expectedMotion: 'idle',
    expectedItem: 'front-boot',
    expectedContact: false,
    expectedAnchor: 'landing-ground',
  }),
  'combat-retaliation': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'slash',
    expectedItem: 'combat-enemy-retaliation-aura',
    expectedRetaliation: true,
    expectedContact: false,
  }),
});

const POSE_VISUAL_QA_SCENARIOS = Object.freeze({
  'pose-idle': Object.freeze({ expectedMotion: 'idle', expectedItem: 'shield' }),
  'pose-move': Object.freeze({ expectedMotion: 'idle', expectedItem: 'front-boot' }),
  'pose-guard': Object.freeze({ expectedMotion: 'guard', expectedItem: 'shield' }),
  'pose-roll': Object.freeze({ expectedMotion: 'idle', expectedItem: 'front-boot' }),
  'pose-ground-attack': Object.freeze({ expectedMotion: 'slash', expectedItem: 'sword-blade' }),
  'pose-air-attack': Object.freeze({ expectedMotion: 'airSlash', expectedItem: 'sword-blade' }),
  'pose-hit': Object.freeze({ expectedMotion: 'idle', expectedItem: 'shield' }),
});

const VISUAL_QA_SCENARIOS = Object.freeze({
  academy: Object.freeze({ regionId: 'academy-region', roomId: 'academy-plaza', x: 270 }),
  training: Object.freeze({ regionId: 'academy-region', roomId: 'training-room', x: 360 }),
  field: Object.freeze({ regionId: 'academy-region', roomId: 'field-crossing', x: 420 }),
  dungeon: Object.freeze({ regionId: 'academy-region', roomId: 'sealed-forest-dungeon', x: 420 }),
  'dungeon-threshold': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-dungeon',
    x: 930,
  }),
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
  ...Object.fromEntries(
    Object.entries(COMBAT_VISUAL_QA_SCENARIOS).map(([id, expectation]) => [
      id,
      Object.freeze({
        regionId: 'academy-region',
        roomId: 'training-room',
        x: 500,
        combatScenarioId: id,
        expectation,
      }),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(POSE_VISUAL_QA_SCENARIOS).map(([id, expectation]) => [
      id,
      Object.freeze({
        regionId: 'academy-region',
        roomId: 'training-room',
        x: 500,
        poseScenarioId: id,
        expectation,
      }),
    ]),
  ),
});

const VISUAL_QA_RENDERERS = new Set(['polygon', 'retro']);

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
  const renderer = parameters.get('visualQaRenderer') ?? 'retro';
  if (!VISUAL_QA_RENDERERS.has(renderer)) {
    throw new Error(`지원하지 않는 Visual QA renderer입니다: ${renderer}`);
  }
  const phase = parameters.get('visualQaPhase') ?? 'active';
  if (!VISUAL_QA_PHASES.has(phase)) {
    throw new Error(`지원하지 않는 Visual QA phase입니다: ${phase}`);
  }

  const expectation = scenario.combatScenarioId
    ? Object.freeze({
        ...scenario.expectation,
        expectedEvent: phase === 'active' ? scenario.expectation.expectedEvent : null,
        eventExpected: phase === 'active' && scenario.expectation.expectedEvent !== null,
        expectedMotion: phase === 'end' ? 'idle' : scenario.expectation.expectedMotion,
        expectedItem:
          phase === 'active' ? scenario.expectation.expectedItem : 'combat-enemy-training-mask',
        expectedRetaliation:
          phase === 'active' && scenario.expectation.expectedRetaliation === true,
        expectedContact:
          phase === 'active' ? scenario.expectation.expectedContact !== false : false,
        expectedAnchor: phase === 'active' ? scenario.expectation.expectedAnchor : null,
      })
    : scenario.expectation;

  return Object.freeze({
    start,
    frame: parseFrame(parameters.get('gameFrame') ?? '0'),
    renderer,
    phase,
    scenario: Object.freeze({ ...scenario, expectation }),
  });
}

export function visualQaScenarioIds() {
  return Object.freeze(Object.keys(VISUAL_QA_SCENARIOS));
}
