import { FIRST_JOURNEY_CHECKPOINT_ID } from '../game/encounter/FirstJourneyProgress.js';
import { FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE } from '../game/journey/FirstJourneyDungeonSignature.js';

export const VISUAL_QA_PHASE_IDS = Object.freeze(['start', 'active', 'end']);
const VISUAL_QA_PHASES = new Set(VISUAL_QA_PHASE_IDS);

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
  'boss-weak-point-exposed': Object.freeze({
    expectedEvent: null,
    expectedMotion: 'idle',
    expectedItem: 'combat-enemy-weak-point-aura',
    expectedItems: Object.freeze(['combat-enemy-weak-point-core']),
    expectedContact: false,
    expectedPosture: 'full',
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
  'scrap-character-board': Object.freeze({
    regionId: 'academy-region',
    roomId: 'scrap-character-design-board',
    x: 480,
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'character-board-cell-scrapyard-apprentice',
        'character-board-cell-scrapyard-owner',
        'character-board-cell-mine-worker',
        'character-board-cell-shipyard-worker',
        'character-board-cell-greenhouse-technician',
        'character-board-cell-snow-train-crew',
        'character-board-cell-quarry-worker',
        'character-board-cell-collector-unit',
        'character-board-cell-industrial-creature',
        'character-board-cell-regional-boss',
        'regional-boss-representative-pose-tool-conveyor-ram',
      ]),
      expectedAbsentItems: Object.freeze(['shield', 'sword-blade']),
    }),
  }),
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
        'academy-enchanter-shop-portal',
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
        'academy-weapon-shop-portal',
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
        'academy-enchanter-shop-portal',
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
        'academy-weapon-shop-portal',
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
        'academy-sealed-shortcut-gate-landmark-opening',
      ]),
      expectedPortalIds: Object.freeze([
        'academy-enchanter-shop-portal',
        'academy-field-portal',
        'academy-glasswind-portal',
        'academy-training-portal',
        'academy-weapon-shop-portal',
        'boss-shortcut-portal',
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
  'academy-weapon-house': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 1440,
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'weapon-shop-house-body',
        'weapon-shop-sign-blade',
        'academy-weapon-shop-door-landmark-opening',
      ]),
    }),
  }),
  'academy-enchanter-house': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 2400,
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'enchanter-shop-house-body',
        'enchanter-shop-sign-rune',
        'academy-enchanter-shop-door-landmark-opening',
      ]),
    }),
  }),
  'academy-weapon-shop': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-weapon-shop',
    x: 610,
    dialogueScenarioId: 'weapon-merchant-karen-interaction',
    firstJourneySnapshot: Object.freeze({ gold: 120 }),
    expectation: Object.freeze({
      expectedItem: 'weapon-merchant-karen-coat-interior',
      expectedDialogueTarget: 'weapon-merchant-karen-interaction',
      expectedDialogueSpeaker: '카린 무기상',
    }),
  }),
  'academy-weapon-forge': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-weapon-shop',
    x: 610,
    dialogueScenarioId: 'weapon-merchant-karen-interaction',
    firstJourneySnapshot: Object.freeze({
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
    }),
    expectation: Object.freeze({
      expectedItem: 'weapon-merchant-karen-coat-interior',
      expectedDialogueTarget: 'weapon-merchant-karen-interaction',
      expectedDialogueSpeaker: '카린 무기상',
    }),
  }),
  'academy-forge': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-enchanter-shop',
    x: 610,
    dialogueScenarioId: 'enchanter-lio-interaction',
    firstJourneySnapshot: Object.freeze({ gold: 120 }),
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({ 'cinderbloom-seed': 2 }),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: null, level: 0 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['field-guardian-defeated']),
    }),
    expectation: Object.freeze({
      expectedItem: 'enchanter-lio-coat-interior',
      expectedDialogueTarget: 'enchanter-lio-interaction',
      expectedDialogueSpeaker: '리오 인챈터',
    }),
  }),
  'enchant-material-repeat': Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    materialEchoDefeats: 2,
    firstJourneySnapshot: Object.freeze({
      phase: 'returned',
      routeChoice: 'guardian-route',
      fieldGuardianDefeated: true,
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.BOSS_TEST,
      ]),
    }),
    expectation: Object.freeze({
      expectedMaterialId: 'sealstone-heart',
      expectedMaterialQuantity: 4,
      expectedProgressionNotice: '봉인석 심장 확정 +1 · 보유 4',
    }),
  }),
  'enchant-fire-contact': Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    combatScenarioId: 'enchant-fire-contact',
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({}),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: 'fire', level: 1 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['field-guardian-defeated']),
    }),
    expectation: Object.freeze({
      expectedEvent: 'hit',
      expectedMotion: 'slash',
      expectedItem: 'enchant-contact-ring',
      expectedItems: Object.freeze(['enchant-fire-ember-0']),
      expectedEffectProgressMinimum: 0.35,
      expectedContact: true,
      expectedAnchor: 'event-contact',
      expectedEnchantLevel: 1,
    }),
  }),
  'enchant-lightning-contact': Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    combatScenarioId: 'enchant-lightning-contact',
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({}),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: 'lightning', level: 5 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['glasswind-reward-claimed']),
    }),
    expectation: Object.freeze({
      expectedEvent: 'hit',
      expectedMotion: 'slash',
      expectedItem: 'enchant-contact-ring',
      expectedItems: Object.freeze(['enchant-lightning-bolt-0-a']),
      expectedEffectProgressMinimum: 0.35,
      expectedContact: true,
      expectedAnchor: 'event-contact',
      expectedEnchantLevel: 5,
    }),
  }),
  'enchant-ice-status': Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    combatScenarioId: 'enchant-ice-status',
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({}),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: 'ice', level: 3 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['dungeon-guardian-defeated']),
    }),
    expectation: Object.freeze({
      expectedEvent: 'hit',
      expectedMotion: 'slash',
      expectedItem: 'enchant-contact-ring',
      expectedItems: Object.freeze(['combat-enemy-enchant-aura-ice', 'enchant-ice-shard-0']),
      expectedEffectProgressMinimum: 0.35,
      expectedContact: true,
      expectedAnchor: 'event-contact',
      expectedEnchantLevel: 3,
    }),
  }),
  'enchant-earth-posture': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-boss',
    x: 500,
    combatScenarioId: 'enchant-earth-posture',
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({}),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: 'earth', level: 5 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['boss-reward-claimed']),
    }),
    expectation: Object.freeze({
      expectedEvent: 'hit',
      expectedMotion: 'heavy',
      expectedItem: 'enchant-contact-ring',
      expectedPosture: 'full',
      expectedItems: Object.freeze(['enchant-earth-fragment-0']),
      expectedEffectProgressMinimum: 0.35,
      expectedContact: true,
      expectedAnchor: 'event-contact',
      expectedEnchantLevel: 5,
    }),
  }),
  'enchant-shield-excluded': Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    combatScenarioId: 'enchant-shield-excluded',
    enchantmentSnapshot: Object.freeze({
      materialQuantities: Object.freeze({}),
      swordEnchantments: Object.freeze({
        'balanced-sword': Object.freeze({ elementId: 'fire', level: 5 }),
      }),
      claimedMaterialSourceIds: Object.freeze(['field-guardian-defeated']),
    }),
    expectation: Object.freeze({
      expectedEvent: 'counter',
      expectedMotion: 'shieldBash',
      expectedItem: 'player-shield-counter-ring',
      expectedAbsentItems: Object.freeze(['enchant-contact-ring']),
      expectedContact: true,
      expectedAnchor: 'event-contact',
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
  'academy-transcript': Object.freeze({
    regionId: 'academy-region',
    roomId: 'academy-plaza',
    x: 420,
    dialogueScenarioId: 'mentor-sera-interaction',
    progressionSnapshot: Object.freeze({
      viewedConversationIds: Object.freeze(['sera-first-journey-departure']),
    }),
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
      expectedDialogueTarget: 'mentor-sera-interaction',
      expectedDialogueSpeaker: '세라 교관',
      expectedPatchIds: Object.freeze(['first-journey-returned-with-reward']),
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
  'dungeon-signature-entrance': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-dungeon',
    x: 276,
    firstJourneySnapshot: Object.freeze({
      phase: 'dungeon',
      routeChoice: 'bypass',
      dungeonSignatureStageIds: Object.freeze([FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION]),
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['sealed-resonance-introduced']),
      expectedItems: Object.freeze([
        'sealed-dungeon-entrance-vestibule',
        'sealed-resonance-introduction-active',
        'sealed-dungeon-guardian-sigil',
        'sealed-dungeon-guardian-seal',
      ]),
      expectedAbsentItems: Object.freeze([
        'sealed-resonance-introduction-dormant',
        'dungeon-resonance-branch-gate-inner',
      ]),
      expectedPortalIds: Object.freeze(['bypass-dungeon-portal']),
    }),
  }),
  'dungeon-signature-combat': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-dungeon',
    x: 640,
    firstJourneySnapshot: Object.freeze({
      phase: 'dungeon',
      routeChoice: 'bypass',
      dungeonGuardianDefeated: true,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
      ]),
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze([
        'sealed-resonance-introduced',
        'sealed-dungeon-guardian-cleared',
      ]),
      expectedItems: Object.freeze([
        'sealed-dungeon-guardian-open',
        'sealed-dungeon-guardian-rubble',
        'dungeon-resonance-branch-gate-landmark-opening',
        'dungeon-resonance-branch-gate-inner',
      ]),
      expectedAbsentItems: Object.freeze(['sealed-dungeon-guardian-seal']),
      expectedPortalIds: Object.freeze([
        'bypass-dungeon-portal',
        'dungeon-resonance-branch-portal',
      ]),
    }),
  }),
  'dungeon-signature-hidden-branch': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-resonance-vault',
    x: 420,
    firstJourneySnapshot: Object.freeze({
      phase: 'dungeon',
      routeChoice: 'bypass',
      dungeonGuardianDefeated: true,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
      ]),
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['sealed-resonance-hidden-branch-applied']),
      expectedItems: Object.freeze([
        'sealed-resonance-vault-arch',
        'sealed-resonance-hidden-active',
        'sealed-resonance-hidden-wave',
        'resonance-vault-return-gate-landmark-opening',
      ]),
      expectedAbsentItems: Object.freeze(['sealed-resonance-hidden-dormant']),
      expectedPortalIds: Object.freeze(['dungeon-resonance-branch-portal']),
    }),
  }),
  'dungeon-one-way-platform': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-resonance-vault',
    x: 270,
    firstJourneySnapshot: Object.freeze({
      phase: 'dungeon',
      routeChoice: 'bypass',
      dungeonGuardianDefeated: true,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
      ]),
    }),
    inputTimelineByPhase: Object.freeze({
      active: Object.freeze([
        Object.freeze({ frames: 1, input: Object.freeze({ jump: true, jumpSequence: 1 }) }),
        Object.freeze({ frames: 47, input: Object.freeze({ jumpSequence: 1 }) }),
      ]),
      end: Object.freeze([
        Object.freeze({ frames: 1, input: Object.freeze({ jump: true, jumpSequence: 1 }) }),
        Object.freeze({ frames: 79, input: Object.freeze({ jumpSequence: 1 }) }),
      ]),
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'sealed-resonance-vault-arch',
        'sealed-resonance-vault-one-way-platform',
      ]),
    }),
    phaseExpectations: Object.freeze({
      start: Object.freeze({
        expectedPlayerGrounded: true,
        expectedPlayerYRange: Object.freeze([341, 343]),
      }),
      active: Object.freeze({
        expectedPlayerGrounded: false,
        expectedPlayerYRange: Object.freeze([247, 251]),
      }),
      end: Object.freeze({
        expectedPlayerGrounded: true,
        expectedPlayerYRange: Object.freeze([259, 261]),
      }),
    }),
  }),
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
  'dungeon-cleared-revisit': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-dungeon',
    x: 680,
    firstJourneySnapshot: Object.freeze({
      phase: 'returned',
      routeChoice: 'bypass',
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      bossDefeated: true,
      bossRewardClaimed: true,
      returnedWithReward: true,
      gold: 120,
      dungeonSignatureStageIds: Object.freeze(Object.values(FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE)),
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze([
        'sealed-resonance-introduced',
        'sealed-dungeon-guardian-cleared',
        'sealed-checkpoint-active',
        'sealed-resonance-hidden-branch-applied',
        'sealed-boss-defeated',
        'boss-reward-claimed',
      ]),
      expectedItems: Object.freeze([
        'sealed-dungeon-guardian-open',
        'dungeon-resonance-branch-gate-inner',
        'checkpoint-active',
        'dungeon-boss-gate-inner',
      ]),
      expectedAbsentItems: Object.freeze(['sealed-dungeon-guardian-seal', 'checkpoint-dormant']),
      expectedPortalIds: Object.freeze([
        'bypass-dungeon-portal',
        'dungeon-boss-portal',
        'dungeon-resonance-branch-portal',
      ]),
    }),
  }),
  boss: Object.freeze({ regionId: 'academy-region', roomId: 'sealed-forest-boss', x: 360 }),
  'boss-signature-test': Object.freeze({
    regionId: 'academy-region',
    roomId: 'sealed-forest-boss',
    x: 500,
    firstJourneySnapshot: Object.freeze({
      phase: 'boss',
      routeChoice: 'bypass',
      dungeonGuardianDefeated: true,
      checkpointId: FIRST_JOURNEY_CHECKPOINT_ID,
      dungeonSignatureStageIds: Object.freeze([
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.INTRODUCTION,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.GUARDIAN_COMBAT,
        FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE.HIDDEN_BRANCH,
      ]),
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['sealed-resonance-hidden-branch-applied']),
      expectedItems: Object.freeze([
        'boss-arena-seal',
        'boss-arena-rune',
        'boss-resonance-trial-active',
        'boss-dungeon-gate-inner',
      ]),
      expectedAbsentItems: Object.freeze(['boss-resonance-trial-dormant']),
      expectedPortalIds: Object.freeze(['dungeon-boss-portal']),
    }),
  }),
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
          (id.startsWith('posture-') && id !== 'posture-normal-enemy') ||
          id === 'boss-weak-point-exposed'
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

export const VISUAL_QA_RENDERER_IDS = Object.freeze(['polygon', 'retro']);
const VISUAL_QA_RENDERERS = new Set(VISUAL_QA_RENDERER_IDS);

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
        expectedEffectProgressMinimum:
          phase === 'active' ? scenario.expectation.expectedEffectProgressMinimum : undefined,
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
