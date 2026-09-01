const VISUAL_QA_PHASES = new Set(['start', 'active', 'end']);

const COMBAT_VISUAL_QA_SCENARIOS = Object.freeze({
  'posture-full': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'idle',
    expectedItem: 'combat-enemy-posture-fill',
    expectedContact: false,
    expectedPosture: 'full',
  }),
  'posture-reduced': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'heavy',
    expectedItem: 'combat-enemy-posture-fill',
    expectedContact: false,
    expectedPosture: 'reduced',
  }),
  'posture-groggy': Object.freeze({
    expectedEvent: 'guard-break',
    expectedMotion: 'shieldBash',
    expectedItem: 'combat-enemy-hit-ring',
    expectedItems: Object.freeze(['combat-enemy-posture-break']),
    expectedContact: true,
    expectedAnchor: 'event-contact',
    expectedPosture: 'groggy',
  }),
  'posture-normal-enemy': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'idle',
    expectedItem: 'combat-enemy-training-mask',
    expectedContact: false,
    expectedPosture: 'absent',
  }),
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
  'combat-strong-windup': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'idle',
    expectedItem: 'combat-enemy-heavy-warning',
    expectedContact: false,
  }),
  'combat-guard-break': Object.freeze({
    expectedEvent: 'guard-break',
    expectedMotion: 'idle',
    expectedItem: 'player-block-ring',
    expectedContact: true,
    expectedAnchor: 'event-contact',
    expectedStamina: 0,
  }),
  'combat-just-guard': Object.freeze({
    expectedEvent: 'just-guard',
    expectedMotion: 'guard',
    expectedItem: 'player-just-guard-wave',
    expectedContact: true,
    expectedAnchor: 'event-contact',
    expectedStamina: 82,
  }),
  'combat-guard-counter': Object.freeze({
    expectedEvent: 'counter',
    expectedMotion: 'shieldBash',
    expectedItem: 'player-shield-counter-ring',
    expectedContact: true,
    expectedAnchor: 'event-contact',
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
  'academy-space-day': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 820,
    timePhase: 'day',
    expectation: Object.freeze({
      expectedTimePhase: 'day',
      expectedItems: Object.freeze([
        'academy-training-gate-landmark-opening',
        'academy-glasswind-gate-landmark-opening',
        'academy-field-gate-landmark-opening',
        'plaza-foreground-planter-left',
      ]),
      expectedAbsentItems: Object.freeze(['moon', 'lamp-glow']),
      expectedPortalIds: Object.freeze([
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
      ]),
    }),
  }),
  'academy-space-night': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 120,
    timePhase: 'night',
    expectation: Object.freeze({
      expectedTimePhase: 'night',
      expectedPatchIds: Object.freeze(['night-presentation', 'first-field-night-presentation']),
      expectedItems: Object.freeze(['academy-training-gate-landmark-opening', 'moon', 'lamp-glow']),
      expectedAbsentItems: Object.freeze(['sun']),
      expectedPortalIds: Object.freeze([
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
      ]),
    }),
  }),
  'academy-space-story': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 820,
    timePhase: 'day',
    firstJourneySnapshot: Object.freeze({
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: 'academy-village:academy-region:sealed-forest-dungeon:sealed-forest-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
    }),
    expectation: Object.freeze({
      expectedTimePhase: 'day',
      expectedPatchIds: Object.freeze([
        'field-guardian-cleared',
        'sealed-dungeon-guardian-cleared',
        'sealed-checkpoint-active',
        'sealed-boss-defeated',
        'boss-reward-claimed',
        'first-journey-returned-with-reward',
      ]),
      expectedItems: Object.freeze([
        'academy-glasswind-gate-landmark-opening',
        'academy-field-gate-landmark-opening',
      ]),
      expectedPortalIds: Object.freeze([
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
      ]),
    }),
  }),
  'academy-growth': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 270,
    progressionSnapshot: Object.freeze({ trainingMarks: 0 }),
    firstJourneySnapshot: Object.freeze({
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: 'academy-village:academy-region:sealed-forest-dungeon:sealed-forest-checkpoint',
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
    }),
  }),
  'academy-dialogue': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 420,
    dialogueScenarioId: 'mentor-sera-interaction',
    expectation: Object.freeze({
      expectedDialogueTarget: 'mentor-sera-interaction',
      expectedDialogueSpeaker: '세라 교관',
    }),
  }),
  training: Object.freeze({ regionId: 'academy-region', roomId: 'training-room', x: 360 }),
  field: Object.freeze({ regionId: 'academy-region', roomId: 'field-crossing', x: 420 }),
  'field-space-day': Object.freeze({
    regionId: 'academy-region',
    roomId: 'field-crossing',
    x: 700,
    timePhase: 'day',
    firstJourneySnapshot: Object.freeze({ phase: 'field' }),
    expectation: Object.freeze({
      expectedTimePhase: 'day',
      expectedItems: Object.freeze([
        'field-village-gate-landmark-opening',
        'field-canopy-gate-landmark-opening',
        'field-dungeon-gate-landmark-opening',
        'field-dungeon-locked-seal',
        'field-crossing-day-canopy-light',
      ]),
      expectedAbsentItems: Object.freeze(['field-crossing-night-veil', 'field-dungeon-gate-inner']),
      expectedPortalIds: Object.freeze(['academy-field-portal', 'field-bypass-portal']),
    }),
  }),
  'field-space-night': Object.freeze({
    regionId: 'academy-region',
    roomId: 'field-crossing',
    x: 420,
    timePhase: 'night',
    firstJourneySnapshot: Object.freeze({ phase: 'field' }),
    expectation: Object.freeze({
      expectedTimePhase: 'night',
      expectedPatchIds: Object.freeze(['night-presentation', 'first-field-night-presentation']),
      expectedItems: Object.freeze([
        'field-canopy-gate-landmark-opening',
        'field-crossing-night-veil',
        'field-crossing-night-waylight',
        'field-dungeon-locked-seal',
      ]),
      expectedAbsentItems: Object.freeze([
        'field-crossing-day-canopy-light',
        'field-dungeon-gate-inner',
      ]),
      expectedPortalIds: Object.freeze(['academy-field-portal', 'field-bypass-portal']),
    }),
  }),
  'field-space-cleared': Object.freeze({
    regionId: 'academy-region',
    roomId: 'field-crossing',
    x: 980,
    timePhase: 'day',
    firstJourneySnapshot: Object.freeze({
      phase: 'field',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
    }),
    expectation: Object.freeze({
      expectedTimePhase: 'day',
      expectedPatchIds: Object.freeze(['field-guardian-cleared']),
      expectedItems: Object.freeze([
        'field-guardian-bloom',
        'field-dungeon-gate-landmark-opening',
        'field-dungeon-gate-inner',
      ]),
      expectedAbsentItems: Object.freeze(['field-dungeon-locked-seal']),
      expectedPortalIds: Object.freeze([
        'academy-field-portal',
        'field-bypass-portal',
        'field-dungeon-portal',
      ]),
    }),
  }),
  'field-dialogue': Object.freeze({
    regionId: 'academy-region',
    roomId: 'field-crossing',
    x: 540,
    firstJourneySnapshot: Object.freeze({ phase: 'field' }),
    dialogueScenarioId: 'field-departure-clue-interaction',
    expectation: Object.freeze({
      expectedDialogueTarget: 'field-departure-clue-interaction',
      expectedDialogueSpeaker: '세라 교관의 정찰 표식',
    }),
  }),
  dungeon: Object.freeze({ regionId: 'academy-region', roomId: 'sealed-forest-dungeon', x: 420 }),
  'dungeon-dialogue': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-dungeon',
    x: 342,
    firstJourneySnapshot: Object.freeze({
      phase: 'dungeon',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
    }),
    dialogueScenarioId: 'dungeon-gate-record-interaction',
    expectation: Object.freeze({
      expectedDialogueTarget: 'dungeon-gate-record-interaction',
      expectedDialogueSpeaker: '봉인 회랑 경계 기록',
    }),
  }),
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
    x: 590,
  }),
  'glasswind-dungeon-entrance': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-observatory',
    x: 150,
  }),
  'glasswind-dungeon-checkpoint': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-observatory',
    x: 1000,
  }),
  'glasswind-dungeon-threshold': Object.freeze({
    regionId: 'glasswind-region',
    roomId: 'glasswind-observatory',
    x: 1100,
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
        roomId:
          id.startsWith('posture-') && id !== 'posture-normal-enemy'
            ? 'sealed-forest-boss'
            : 'training-room',
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
          phase === 'active'
            ? scenario.expectation.expectedItem
            : scenario.expectation.expectedPosture === 'absent' ||
                scenario.expectation.expectedPosture === undefined
              ? 'combat-enemy-training-mask'
              : phase === 'start' && scenario.expectation.expectedPosture === 'groggy'
                ? 'combat-enemy-posture-break'
                : 'combat-enemy-posture-fill',
        expectedItems: phase === 'active' ? (scenario.expectation.expectedItems ?? []) : [],
        expectedRetaliation:
          phase === 'active' && scenario.expectation.expectedRetaliation === true,
        expectedContact:
          phase === 'active' ? scenario.expectation.expectedContact !== false : false,
        expectedAnchor: phase === 'active' ? scenario.expectation.expectedAnchor : null,
        expectedStamina: phase === 'active' ? scenario.expectation.expectedStamina : undefined,
      })
    : scenario.expectation;

  return Object.freeze({
    start,
    frame: parseFrame(parameters.get('gameFrame') ?? '0'),
    renderer,
    phase,
    reducedMotion: parameters.get('reducedMotion') === '1',
    scenario: Object.freeze({ ...scenario, expectation }),
  });
}

export function visualQaScenarioIds() {
  return Object.freeze(Object.keys(VISUAL_QA_SCENARIOS));
}
