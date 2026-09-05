import { FIRST_JOURNEY_CHECKPOINT_ID } from '../game/encounter/FirstJourneyProgress.js';
import { FIRST_JOURNEY_DUNGEON_SIGNATURE_STAGE } from '../game/journey/FirstJourneyDungeonSignature.js';
import { SCRAP_AWAKENING_STAGE } from '../game/campaign/ScrapAwakeningState.js';
import { SCRAP_GARAGE_REVEAL_STAGE } from '../game/campaign/ScrapGarageRevealState.js';
import { SCRAP_GAME_OVER_STAGE } from '../game/campaign/ScrapGameOverPresentation.js';
import { SCRAP_FINAL_BATTLE_STAGE } from '../game/campaign/ScrapFinalBattleState.js';
import {
  SCRAP_AWAKENING_MAP_ID,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_AWAKENING_ROOM_ID,
  SCRAP_MINE_TUNNEL_ROOM_ID,
  SCRAP_GREENHOUSE_ROAD_ROOM_ID,
  SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
  SCRAP_GREENHOUSE_REGION_ID,
  SCRAP_SNOW_REGION_ID,
  SCRAP_SNOW_ROAD_ROOM_ID,
  SCRAP_SNOW_TRAIN_ROOM_ID,
  SCRAP_QUARRY_REGION_ID,
  SCRAP_QUARRY_ROAD_ROOM_ID,
  SCRAP_QUARRY_CUTTER_ROOM_ID,
  SCRAP_SHIPYARD_CRANE_ROOM_ID,
  SCRAP_SHIPYARD_REGION_ID,
  SCRAP_SHIPYARD_ROAD_ROOM_ID,
} from '../game/maps/scrapAwakening.js';

export const VISUAL_QA_PHASE_IDS = Object.freeze(['start', 'active', 'end']);
const VISUAL_QA_PHASES = new Set(VISUAL_QA_PHASE_IDS);

const SCRAP_FINAL_BATTLE_COMPLETED_REGIONS = Object.freeze([
  Object.freeze({
    regionId: 'abandoned-mine',
    stageKind: 'campaign-updated',
    status: 'resolved',
    collected: true,
    currentLocationId: 'neighborhood-scrapyard',
  }),
  Object.freeze({
    regionId: SCRAP_SHIPYARD_REGION_ID,
    stageKind: 'campaign-updated',
    status: 'resolved',
    collected: true,
    currentLocationId: 'neighborhood-scrapyard',
  }),
  Object.freeze({
    regionId: SCRAP_GREENHOUSE_REGION_ID,
    stageKind: 'campaign-updated',
    status: 'resolved',
    collected: true,
    currentLocationId: 'neighborhood-scrapyard',
  }),
  Object.freeze({
    regionId: SCRAP_SNOW_REGION_ID,
    stageKind: 'campaign-updated',
    status: 'resolved',
    collected: true,
    currentLocationId: 'neighborhood-scrapyard',
  }),
  Object.freeze({
    regionId: SCRAP_QUARRY_REGION_ID,
    stageKind: 'campaign-updated',
    status: 'resolved',
    collected: true,
    currentLocationId: 'neighborhood-scrapyard',
  }),
]);

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
    expectedItem: 'combat-enemy-collector-eye',
    expectedContact: false,
    expectedPosture: 'absent',
  }),
  'combat-hit': Object.freeze({
    expectedEvent: 'hit',
    expectedMotion: 'slash',
    expectedItem: 'combat-enemy-hit-ring',
    expectedAnchor: 'event-contact',
  }),
  'combat-player-hit': Object.freeze({
    expectedEvent: 'hit',
    expectedMotion: 'idle',
    expectedItem: 'player-hit-ring',
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

function createBaselinePlaybackScenario(inputTimeline, expectation = {}) {
  return Object.freeze({
    regionId: 'academy-region',
    roomId: 'training-room',
    x: 500,
    inputTimelineByPhase: Object.freeze({
      active: Object.freeze(
        inputTimeline.map((segment) =>
          Object.freeze({ ...segment, input: Object.freeze(segment.input) }),
        ),
      ),
    }),
    expectation: Object.freeze({ expectedPlayerGrounded: true, ...expectation }),
  });
}

// These scenarios advance the real fixed-step command path before the Canvas is captured. They
// complement the stable mid-pose board with reproducible motion evidence for actual playback.
const PLAYER_BASELINE_PLAYBACK_SCENARIOS = Object.freeze({
  'baseline-idle-playback': createBaselinePlaybackScenario([{ frames: 8, input: {} }]),
  'baseline-run-playback': createBaselinePlaybackScenario([{ frames: 24, input: { right: true } }]),
  'baseline-jump-playback': createBaselinePlaybackScenario(
    [
      { frames: 1, input: { right: true, jump: true, jumpSequence: 1 } },
      { frames: 18, input: { right: true } },
    ],
    { expectedPlayerGrounded: false },
  ),
  'baseline-landing-playback': createBaselinePlaybackScenario([
    { frames: 1, input: { right: true, jump: true, jumpSequence: 1 } },
    { frames: 180, input: { right: true } },
  ]),
  'baseline-roll-playback': createBaselinePlaybackScenario([
    { frames: 1, input: { right: true, guard: true } },
    { frames: 25, input: { right: true } },
  ]),
  'baseline-basic-playback': createBaselinePlaybackScenario(
    [
      { frames: 1, input: { basicAttack: true, basicAttackSequence: 1 } },
      { frames: 11, input: {} },
    ],
    { expectedMotion: 'slash' },
  ),
  'baseline-strong-playback': createBaselinePlaybackScenario(
    [
      { frames: 1, input: { strongAttack: true, strongAttackSequence: 1 } },
      { frames: 15, input: {} },
    ],
    { expectedMotion: 'heavy' },
  ),
  'baseline-guard-playback': createBaselinePlaybackScenario(
    [{ frames: 16, input: { guard: true } }],
    { expectedMotion: 'guard' },
  ),
});

const VISUAL_QA_SCENARIOS = Object.freeze({
  ...PLAYER_BASELINE_PLAYBACK_SCENARIOS,
  'scrap-intro-walk': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 500,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
    inputTimelineByPhase: Object.freeze({
      active: Object.freeze([Object.freeze({ frames: 2, input: Object.freeze({ right: true }) })]),
    }),
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_CLEARANCE,
    }),
  }),
  'scrap-intro-yard-brace': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 700,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_BRACE,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_BRACE,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-brace']),
      expectedItems: Object.freeze(['scrap-rival-search-hook']),
      expectedAbsentItems: Object.freeze(['scrap-device-core']),
    }),
  }),
  'scrap-intro-brace': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 870,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_PERIMETER,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_PERIMETER,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-perimeter']),
      expectedItems: Object.freeze(['combat-enemy-collector-eye', 'scrap-rival-search-hook']),
      expectedAbsentItems: Object.freeze(['scrap-device-core']),
    }),
  }),
  'scrap-intro-survey': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1010,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_SURVEY,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_SURVEY,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-survey']),
      expectedItems: Object.freeze([
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-approach': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1060,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_APPROACH,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_APPROACH,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-approach']),
      expectedItems: Object.freeze([
        'combat-enemy-collector-eye',
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-plate': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1160,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_PLATE,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_PLATE,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-plate']),
      expectedItems: Object.freeze([
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-yard-plate-fragment',
        'scrap-yard-plate-fragment-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-ridge': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1240,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_RIDGE,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_RIDGE,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-ridge']),
      expectedItems: Object.freeze([
        'combat-enemy-collector-eye',
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-yard-plate-fragment',
        'scrap-yard-plate-fragment-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-guard': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1278,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_GUARD,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_GUARD,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-guard']),
      expectedItems: Object.freeze([
        'combat-enemy-collector-eye',
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-yard-plate-fragment',
        'scrap-yard-plate-fragment-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-search': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 1332,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_SEARCH,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.YARD_SEARCH,
      expectedPatchIds: Object.freeze(['scrap-prologue-yard-search']),
      expectedItems: Object.freeze([
        'scrap-yard-winch-base',
        'scrap-yard-winch-base-mark',
        'scrap-yard-chest-plate-mark',
        'scrap-yard-plate-fragment',
        'scrap-yard-plate-fragment-mark',
        'scrap-retrieval-arm-dormant-upper',
        'scrap-retrieval-arm-dormant-forearm',
        'scrap-retrieval-arm-dormant-claw',
        'scrap-rival-search-hook',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-retrieval-arm-grab-claw']),
    }),
  }),
  'scrap-intro-before': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 760,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.PLAYER_DECISION,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.PLAYER_DECISION,
      expectedPatchIds: Object.freeze([
        'scrap-prologue-collapse-and-rescue',
        'scrap-prologue-player-decision',
      ]),
      expectedItems: Object.freeze([
        'scrap-device-core',
        'scrap-device-glow-outer',
        'scrap-rival-trapped-torso',
        'scrap-rival-trapped-arm',
        'scrap-rival-trapped-marker',
        'scrap-retrieval-arm-grab-upper',
        'scrap-retrieval-arm-grab-claw',
        'scrap-retrieval-arm-grab-signal',
        'scrap-collapse-debris',
        'scrap-rescue-winch-cable',
      ]),
      expectedAbsentItems: Object.freeze([
        'scrap-king-eye-left',
        'scrap-king-shoulder-left',
        'scrap-king-route-beacon',
        'scrap-retrieval-arm-dormant-upper',
      ]),
    }),
  }),
  'scrap-intro-awakening': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 740,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.EYES_LIT,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.EYES_LIT,
      expectedAwakeningActive: true,
      expectedPatchIds: Object.freeze(['scrap-device-recovered', 'scrap-king-eyes-lit']),
      expectedItems: Object.freeze(['scrap-king-eye-left', 'scrap-king-eye-right']),
      expectedAbsentItems: Object.freeze(['scrap-device-core', 'scrap-king-shoulder-left']),
    }),
  }),
  'scrap-intro-d30': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 740,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.DEADLINE_REVEALED,
      expectedAwakeningActive: true,
      expectedPatchIds: Object.freeze([
        'scrap-device-recovered',
        'scrap-king-eyes-lit',
        'scrap-king-parts-assembled',
        'scrap-king-deadline-revealed',
      ]),
      expectedItems: Object.freeze([
        'scrap-king-eye-left',
        'scrap-king-shoulder-left',
        'scrap-king-shoulder-right',
        'scrap-king-cable-bundle',
        'scrap-king-route-beacon',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core']),
    }),
  }),
  'scrap-intro-after': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 740,
    scrapAwakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
      expectedAwakeningActive: false,
      expectedItems: Object.freeze([
        'scrap-king-eye-left',
        'scrap-king-shoulder-left',
        'scrap-king-route-beacon',
      ]),
      expectedAbsentItems: Object.freeze(['scrap-device-core']),
    }),
  }),
  'scrap-garage-analysis': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 250,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.OWNER_ANALYSIS,
      expectedGarageRevealActive: true,
      expectedLastChangeLabel: 'DEVICE ANALYSIS · FIVE SIGNALS',
      expectedPatchIds: Object.freeze([
        'scrap-device-recovered',
        'scrapyard-owner-returned',
        'scrapyard-device-analysis',
      ]),
      expectedItems: Object.freeze([
        'scrapyard-owner-goggles',
        'scrapyard-owner-ledger',
        'scrapyard-owner-wrench',
        'scrapyard-device-analysis-beam',
        'scrapyard-analysis-device-core',
      ]),
      expectedAbsentItems: Object.freeze(['scrapyard-wall-map-frame', 'garage-robot-brain-core']),
    }),
  }),
  'scrap-garage-0': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 300,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    expectation: Object.freeze({
      expectedAwakeningStageId: SCRAP_AWAKENING_STAGE.COMPLETE,
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedGarageRevealActive: false,
      expectedLastChangeLabel: '5 REGIONS · 0/5 PARTS · ROBOT 0%',
      expectedPatchIds: Object.freeze([
        'scrapyard-owner-returned',
        'scrapyard-operation-map-revealed',
        'scrapyard-garage-opened',
        'scrapyard-wall-map-interactive',
      ]),
      expectedItems: Object.freeze([
        'scrapyard-wall-map-frame',
        'scrapyard-wall-map-route',
        'scrapyard-recovery-cot-frame',
        'scrapyard-recovery-cot-roll',
        'garage-robot-frame-torso',
        'garage-robot-brain-core',
        'garage-robot-zero-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'scrapyard-garage-door-left',
        'scrapyard-garage-door-right',
      ]),
    }),
  }),
  'scrap-issue-window': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 300,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'facility-observed',
        status: 'available',
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'journey-combat',
        status: 'in-progress',
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'facility-observed',
        status: 'available',
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    scrapIssueState: Object.freeze({
      activePrimaryIssueId: 'mine-rescue-operation',
      completedIssueIds: Object.freeze(['mine-harbor-lift-cable']),
    }),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedPrimaryIssueId: 'mine-rescue-operation',
      expectedLinkedIssueCount: 2,
      expectedCompletedLinkedIssueCount: 1,
      expectedItems: Object.freeze([
        'scrapyard-wall-map-frame',
        'scrapyard-wall-map-route',
        'garage-robot-frame-torso',
        'garage-robot-brain-core',
      ]),
    }),
  }),
  'scrap-mine-roadhead': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-roadhead',
    x: 730,
    scrapRegionState: Object.freeze({
      regionId: 'abandoned-mine',
      stageKind: 'npc-briefing',
      status: 'available',
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['mine-briefing-complete', 'mine-cast-rival-scout']),
      expectedItems: Object.freeze([
        'mine-waiting-miner-coat',
        'mine-waiting-miner-helmet',
        'mine-waiting-miner-pickaxe',
        'mine-foreman-workwear',
        'mine-foreman-helmet',
        'mine-rival-scout-torso',
        'mine-rival-scout-head',
        'mine-rival-scout-hook',
        'mine-rival-scout-band',
        'mine-gate-miner-coat',
        'mine-gate-miner-helmet',
        'mine-gate-lantern-dim',
        'mine-shaft-status-console',
      ]),
      expectedAbsentItems: Object.freeze(['mine-gate-lantern-lit']),
    }),
  }),
  'scrap-mine-boss': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-machine-yard',
    x: 620,
    scrapRegionState: Object.freeze({
      regionId: 'abandoned-mine',
      stageKind: 'journey-combat',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'combat-enemy-conveyor-ram-plate',
        'combat-enemy-scrap-front-plate',
        'mine-walker-chassis',
      ]),
      expectedAbsentItems: Object.freeze(['mine-replacement-brace', 'mine-walker-part-signal']),
    }),
  }),
  'scrap-art-benchmark': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: 'abandoned-mine',
    roomId: SCRAP_MINE_TUNNEL_ROOM_ID,
    x: 640,
    combatScenarioId: 'combat-hit',
    scrapRegionState: Object.freeze({
      regionId: 'abandoned-mine',
      stageKind: 'facility-observed',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedEvent: 'hit',
      expectedMotion: 'slash',
      expectedItem: 'combat-enemy-hit-ring',
      expectedAnchor: 'event-contact',
      expectedContact: true,
      expectedItems: Object.freeze([
        'mine-tunnel-far-ridge',
        'mine-tunnel-extractor-tower',
        'mine-tunnel-ventilator-housing',
        'mine-tunnel-ventilator-hub',
        'mine-tunnel-dust-veil',
        'mine-tunnel-ground-cutaway',
        'mine-tunnel-floor-rail',
        'mine-trapped-worker-coat',
        'mine-trapped-worker-helmet',
        'mine-trapped-worker-tool',
        'combat-enemy-human-salvage-cutter',
      ]),
      idleExpectedItem: 'combat-enemy-human-face-guard',
    }),
  }),
  'scrap-mine-resolved': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: 'abandoned-mine',
    roomId: 'abandoned-mine-machine-yard',
    x: 980,
    scrapRegionState: Object.freeze({
      regionId: 'abandoned-mine',
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'mine-replacement-brace',
        'mine-walker-separated-chassis',
        'mine-walker-part-cradle',
        'mine-walker-part-signal',
      ]),
      expectedAbsentItems: Object.freeze([
        'combat-enemy-conveyor-ram-plate',
        'mine-walker-leg-left',
      ]),
    }),
  }),
  'scrap-shipyard-roadhead': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SHIPYARD_REGION_ID,
    roomId: SCRAP_SHIPYARD_ROAD_ROOM_ID,
    x: 730,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SHIPYARD_REGION_ID,
      stageKind: 'npc-briefing',
      status: 'available',
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['shipyard-briefing-complete', 'shipyard-cast-rival-scout']),
      expectedItems: Object.freeze([
        'shipyard-waiting-crew-apron',
        'shipyard-waiting-crew-mask',
        'shipyard-waiting-crew-hook',
        'shipyard-worker-apron',
        'shipyard-worker-mask',
        'shipyard-rival-scout-torso',
        'shipyard-rival-scout-head',
        'shipyard-rival-scout-hook',
        'shipyard-rival-scout-band',
        'shipyard-gate-crew-apron',
        'shipyard-gate-crew-mask',
        'shipyard-gate-lamp-dim',
        'shipyard-occupation-board',
      ]),
      expectedAbsentItems: Object.freeze(['shipyard-gate-lamp-lit']),
    }),
  }),
  'scrap-shipyard-boss': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SHIPYARD_REGION_ID,
    roomId: SCRAP_SHIPYARD_CRANE_ROOM_ID,
    x: 620,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SHIPYARD_REGION_ID,
      stageKind: 'journey-combat',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'combat-enemy-hydraulic-crane-boom',
        'combat-enemy-hydraulic-crane-cross-cable',
        'shipyard-twin-crane-left-arm',
        'shipyard-twin-crane-thick-cable',
      ]),
      expectedAbsentItems: Object.freeze([
        'shipyard-last-ship-patch',
        'shipyard-hydraulics-signal',
      ]),
    }),
  }),
  'scrap-shipyard-resolved': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SHIPYARD_REGION_ID,
    roomId: SCRAP_SHIPYARD_CRANE_ROOM_ID,
    x: 990,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SHIPYARD_REGION_ID,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'shipyard-last-ship-patch',
        'shipyard-last-ship-weld',
        'shipyard-separated-crane-towers',
        'shipyard-hydraulics-cradle',
        'shipyard-hydraulics-signal',
      ]),
      expectedAbsentItems: Object.freeze([
        'combat-enemy-hydraulic-crane-boom',
        'shipyard-twin-crane-left-arm',
        'shipyard-twin-crane-thick-cable',
      ]),
    }),
  }),
  'scrap-greenhouse-roadhead': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_GREENHOUSE_REGION_ID,
    roomId: SCRAP_GREENHOUSE_ROAD_ROOM_ID,
    x: 730,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_GREENHOUSE_REGION_ID,
      stageKind: 'npc-briefing',
      status: 'available',
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze([
        'greenhouse-briefing-complete',
        'greenhouse-cast-rival-scout',
      ]),
      expectedItems: Object.freeze([
        'greenhouse-waiting-grower-vest',
        'greenhouse-waiting-grower-visor',
        'greenhouse-waiting-grower-sensor',
        'greenhouse-technician-vest',
        'greenhouse-technician-visor',
        'greenhouse-rival-scout-torso',
        'greenhouse-rival-scout-head',
        'greenhouse-rival-scout-hook',
        'greenhouse-rival-scout-band',
        'greenhouse-gate-grower-vest',
        'greenhouse-gate-grower-visor',
        'greenhouse-gate-lamp-dim',
        'greenhouse-pressure-board',
      ]),
      expectedAbsentItems: Object.freeze(['greenhouse-gate-lamp-lit']),
    }),
  }),
  'scrap-greenhouse-boss': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_GREENHOUSE_REGION_ID,
    roomId: SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
    x: 620,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_GREENHOUSE_REGION_ID,
      stageKind: 'journey-combat',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'combat-enemy-geothermal-main-pipe',
        'combat-enemy-geothermal-pressure-valve',
        'greenhouse-old-reactor-shell',
        'greenhouse-old-reactor-core',
      ]),
      expectedAbsentItems: Object.freeze(['greenhouse-safe-pipeline', 'greenhouse-reactor-signal']),
    }),
  }),
  'scrap-greenhouse-resolved': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_GREENHOUSE_REGION_ID,
    roomId: SCRAP_GREENHOUSE_REACTOR_ROOM_ID,
    x: 990,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_GREENHOUSE_REGION_ID,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'greenhouse-safe-pipeline',
        'greenhouse-safe-pressure-signal',
        'greenhouse-separated-reactor-shell',
        'greenhouse-reactor-cradle',
        'greenhouse-reactor-signal',
      ]),
      expectedAbsentItems: Object.freeze([
        'combat-enemy-geothermal-main-pipe',
        'greenhouse-old-reactor-core',
      ]),
    }),
  }),
  'scrap-snow-roadhead': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SNOW_REGION_ID,
    roomId: SCRAP_SNOW_ROAD_ROOM_ID,
    x: 730,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SNOW_REGION_ID,
      stageKind: 'npc-briefing',
      status: 'available',
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['snow-briefing-complete', 'snow-cast-rival-scout']),
      expectedItems: Object.freeze([
        'snow-waiting-keeper-coat',
        'snow-waiting-keeper-hat',
        'snow-waiting-keeper-lamp',
        'snow-crew-coat',
        'snow-crew-hat',
        'snow-rival-scout-torso',
        'snow-rival-scout-head',
        'snow-rival-scout-hook',
        'snow-rival-scout-band',
        'snow-gate-keeper-coat',
        'snow-gate-keeper-hat',
        'snow-gate-lamp-dim',
        'snow-tunnel-status-board',
      ]),
      expectedAbsentItems: Object.freeze(['snow-gate-lamp-lit']),
    }),
  }),
  'scrap-snow-boss': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SNOW_REGION_ID,
    roomId: SCRAP_SNOW_TRAIN_ROOM_ID,
    x: 620,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SNOW_REGION_ID,
      stageKind: 'journey-combat',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'combat-enemy-snowplow-wedge',
        'combat-enemy-snowplow-track',
        'combat-enemy-snowplow-heater-rivet',
        'snow-armored-train-body',
        'snow-armored-train-plow',
      ]),
      expectedAbsentItems: Object.freeze(['snow-open-tunnel-signal', 'snow-armor-signal']),
    }),
  }),
  'scrap-snow-resolved': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_SNOW_REGION_ID,
    roomId: SCRAP_SNOW_TRAIN_ROOM_ID,
    x: 990,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_SNOW_REGION_ID,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'snow-open-tunnel-signal',
        'snow-open-tunnel-heater',
        'snow-separated-train-frame',
        'snow-armor-cradle',
        'snow-armor-signal',
      ]),
      expectedAbsentItems: Object.freeze([
        'combat-enemy-snowplow-wedge',
        'snow-armored-train-body',
        'snow-armored-train-plow',
      ]),
    }),
  }),
  'scrap-quarry-roadhead': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_QUARRY_REGION_ID,
    roomId: SCRAP_QUARRY_ROAD_ROOM_ID,
    x: 730,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_QUARRY_REGION_ID,
      stageKind: 'npc-briefing',
      status: 'available',
    }),
    expectation: Object.freeze({
      expectedPatchIds: Object.freeze(['quarry-briefing-complete', 'quarry-cast-rival-scout']),
      expectedItems: Object.freeze([
        'quarry-waiting-filler-coat',
        'quarry-waiting-filler-helmet',
        'quarry-waiting-filler-drill',
        'quarry-worker-coat',
        'quarry-worker-helmet',
        'quarry-rival-scout-torso',
        'quarry-rival-scout-head',
        'quarry-rival-scout-hook',
        'quarry-rival-scout-band',
        'quarry-gate-filler-coat',
        'quarry-gate-filler-helmet',
        'quarry-gate-blast-dim',
        'quarry-safety-board',
      ]),
      expectedAbsentItems: Object.freeze(['quarry-gate-blast-lit']),
    }),
  }),
  'scrap-quarry-boss': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_QUARRY_REGION_ID,
    roomId: SCRAP_QUARRY_CUTTER_ROOM_ID,
    x: 800,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_QUARRY_REGION_ID,
      stageKind: 'journey-combat',
      status: 'in-progress',
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'combat-enemy-quarry-body-housing',
        'combat-enemy-quarry-pivot-arm',
        'combat-enemy-quarry-cutting-blade',
        'combat-enemy-quarry-drive-bearing',
        'quarry-cutter-machine-body',
        'quarry-cutter-machine-disc',
        'quarry-cutter-machine-track',
      ]),
      expectedAbsentItems: Object.freeze(['quarry-safe-closure', 'quarry-cutter-signal']),
    }),
  }),
  'scrap-quarry-resolved': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_QUARRY_REGION_ID,
    roomId: SCRAP_QUARRY_CUTTER_ROOM_ID,
    x: 700,
    scrapRegionState: Object.freeze({
      regionId: SCRAP_QUARRY_REGION_ID,
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
    }),
    expectation: Object.freeze({
      expectedItems: Object.freeze([
        'quarry-safe-closure',
        'quarry-safe-closure-brace',
        'quarry-separated-cutter-frame',
        'quarry-cutter-cradle',
        'quarry-cutter-signal',
      ]),
      expectedAbsentItems: Object.freeze([
        'quarry-cutter-machine-body',
        'quarry-cutter-machine-disc',
        'quarry-rock-cutter-boss',
      ]),
    }),
  }),
  'scrap-garage-20': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionState: Object.freeze({
      regionId: 'abandoned-mine',
      stageKind: 'campaign-updated',
      status: 'resolved',
      collected: true,
      currentLocationId: 'neighborhood-scrapyard',
    }),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-walker-leg-right',
        'garage-robot-twenty-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'garage-robot-frame-leg-left',
        'garage-robot-zero-label',
      ]),
    }),
  }),
  'scrap-garage-40': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-walker-leg-right',
        'garage-robot-crane-arm-left',
        'garage-robot-crane-arm-right',
        'garage-robot-crane-cable',
        'garage-robot-forty-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'garage-robot-zero-label',
        'garage-robot-twenty-label',
        'garage-robot-crane-twenty-label',
      ]),
    }),
  }),
  'scrap-garage-60': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-crane-arm-left',
        'garage-robot-reactor-core',
        'garage-robot-reactor-pipe-left',
        'garage-robot-sixty-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'garage-robot-zero-label',
        'garage-robot-twenty-label',
        'garage-robot-crane-twenty-label',
        'garage-robot-reactor-twenty-label',
        'garage-robot-forty-label',
      ]),
    }),
  }),
  'scrap-garage-80': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SNOW_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-crane-arm-left',
        'garage-robot-reactor-core',
        'garage-robot-snow-armor-torso',
        'garage-robot-snow-armor-rivet-left',
        'garage-robot-eighty-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'garage-robot-zero-label',
        'garage-robot-twenty-label',
        'garage-robot-crane-twenty-label',
        'garage-robot-reactor-twenty-label',
        'garage-robot-snow-twenty-label',
        'garage-robot-forty-label',
        'garage-robot-sixty-label',
      ]),
    }),
  }),
  'scrap-garage-100': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SNOW_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_QUARRY_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-crane-arm-left',
        'garage-robot-reactor-core',
        'garage-robot-snow-armor-torso',
        'garage-robot-quarry-cutter-blade',
        'garage-robot-quarry-cutter-teeth',
        'garage-robot-hundred-label',
      ]),
      expectedAbsentItems: Object.freeze([
        'garage-robot-zero-label',
        'garage-robot-twenty-label',
        'garage-robot-crane-twenty-label',
        'garage-robot-reactor-twenty-label',
        'garage-robot-snow-twenty-label',
        'garage-robot-quarry-twenty-label',
        'garage-robot-forty-label',
        'garage-robot-sixty-label',
        'garage-robot-eighty-label',
      ]),
    }),
  }),
  'scrap-game-over': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SNOW_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    scrapLastSegment: true,
    scrapGameOverStageId: SCRAP_GAME_OVER_STAGE.INPUT_LOCKED,
    expectation: Object.freeze({}),
  }),
  'scrap-final-armor': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 650,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: SCRAP_FINAL_BATTLE_COMPLETED_REGIONS,
    scrapFinalBattleStageId: SCRAP_FINAL_BATTLE_STAGE.ARMOR,
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'scrap-final-counter-reactor',
        'scrap-final-counter-cutter',
        'scrap-final-ancient-armor-left',
        'scrap-final-ancient-armor-right',
        'scrap-final-armor-target',
      ]),
    }),
  }),
  'scrap-final-epilogue': Object.freeze({
    mapId: SCRAP_AWAKENING_MAP_ID,
    regionId: SCRAP_AWAKENING_REGION_ID,
    roomId: SCRAP_AWAKENING_ROOM_ID,
    x: 480,
    scrapGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
    scrapRegionStates: Object.freeze([
      Object.freeze({
        regionId: 'abandoned-mine',
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SHIPYARD_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_GREENHOUSE_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_SNOW_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
      Object.freeze({
        regionId: SCRAP_QUARRY_REGION_ID,
        stageKind: 'campaign-updated',
        status: 'resolved',
        collected: true,
        currentLocationId: 'neighborhood-scrapyard',
      }),
    ]),
    scrapFinalBattleStageId: SCRAP_FINAL_BATTLE_STAGE.EPILOGUE,
    expectation: Object.freeze({
      expectedGarageRevealStageId: SCRAP_GARAGE_REVEAL_STAGE.COMPLETE,
      expectedItems: Object.freeze([
        'garage-robot-walker-leg-left',
        'garage-robot-crane-arm-left',
        'garage-robot-reactor-core',
        'garage-robot-snow-armor-torso',
        'garage-robot-quarry-cutter-blade',
        'garage-robot-hundred-label',
      ]),
    }),
  }),
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
        'character-board-cell-mine-claim-jacker',
        'character-board-cell-dock-salvage-raider',
        'character-board-cell-snow-route-raider',
        'character-board-cell-collector-unit',
        'character-board-cell-industrial-creature',
        'character-board-cell-regional-boss',
        'character-board-cell-mine-collapse-boss',
        'character-board-cell-shipyard-twin-crane-boss',
        'character-board-cell-greenhouse-geothermal-boss',
        'character-board-cell-snowplow-train-boss',
        'regional-boss-representative-pose-tool-conveyor-ram',
        'shipyard-twin-crane-boss-representative-pose-tool-hydraulic-crane',
        'greenhouse-geothermal-boss-representative-pose-tool-geothermal-manifold',
        'snowplow-train-boss-representative-pose-tool-snowplow-train',
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
              ? (scenario.expectation.idleExpectedItem ?? 'combat-enemy-collector-eye')
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

// The developer panel is a campaign inspection surface, not the complete fixture catalog.
// Keep legacy/combat-only fixtures addressable by URL while presenting the current scrap
// campaign in its playable order.
const DEBUG_SCENARIO_LABELS = Object.freeze({
  'scrap-intro-walk': '도입 · 고물상 수거장 동행',
  'scrap-intro-yard-brace': '도입 · 첫 전투 뒤 지지대 동행 안내',
  'scrap-intro-brace': '도입 · 지지대 통로 수거 유닛',
  'scrap-intro-survey': '도입 · 끊긴 winch 점검',
  'scrap-intro-approach': '도입 · 흉곽 안쪽 경계 전투',
  'scrap-intro-plate': '도입 · 떨어진 흉갑 조각 점검',
  'scrap-intro-ridge': '도입 · 흉곽 능선 경계 전투',
  'scrap-intro-guard': '도입 · 심부 방패 경계 전투',
  'scrap-intro-search': '도입 · 폐병기 내부 현장 조사',
  'scrap-intro-before': '도입 · 붕괴 뒤 제어핵 선택',
  'scrap-intro-awakening': '도입 · 고대 병기 각성',
  'scrap-intro-d30': '도입 · D-30 경보',
  'scrap-intro-after': '도입 · 귀환 완료',
  'scrap-garage-analysis': '차고 · 주인 분석',
  'scrap-garage-0': '작전 지도 · 5지역 / 로봇 0%',
  'scrap-issue-window': '작전 지도 · 주목표와 연결 이슈',
  'scrap-mine-roadhead': '폐광 산촌 · 반복 인물 합류',
  'scrap-mine-boss': '폐광 산촌 · 굴착기 결전',
  'scrap-mine-resolved': '폐광 산촌 · 마지막 작업 완료',
  'scrap-shipyard-roadhead': '항구 조선소 · 반복 인물 합류',
  'scrap-shipyard-boss': '항구 조선소 · 크레인 결전',
  'scrap-shipyard-resolved': '항구 조선소 · 마지막 작업 완료',
  'scrap-greenhouse-roadhead': '온실 평원 · 반복 인물 합류',
  'scrap-greenhouse-boss': '온실 평원 · 동력로 결전',
  'scrap-greenhouse-resolved': '온실 평원 · 마지막 작업 완료',
  'scrap-snow-roadhead': '설산 교역로 · 반복 인물 합류',
  'scrap-snow-boss': '설산 교역로 · 제설 열차 결전',
  'scrap-snow-resolved': '설산 교역로 · 마지막 작업 완료',
  'scrap-quarry-roadhead': '붉은 채석장 · 반복 인물 합류',
  'scrap-quarry-boss': '붉은 채석장 · 절단기 결전',
  'scrap-quarry-resolved': '붉은 채석장 · 마지막 작업 완료',
  'scrap-garage-20': '차고 · 조립 20%',
  'scrap-garage-40': '차고 · 조립 40%',
  'scrap-garage-60': '차고 · 조립 60%',
  'scrap-garage-80': '차고 · 조립 80%',
  'scrap-garage-100': '차고 · 조립 100%',
  'scrap-game-over': 'D-DAY · 수도 도착 게임오버',
  'scrap-final-armor': '최종전 · 장갑 파괴',
  'scrap-final-epilogue': '후일담 · 산업기계 귀환',
  'scrap-art-benchmark': '폐광 · 전투/조명 기준 장면',
  'scrap-character-board': '캐릭터 · 실제 크기 실루엣 보드',
});

export function visualQaDebugScenarioEntries() {
  return Object.freeze(
    Object.entries(DEBUG_SCENARIO_LABELS).map(([id, label]) => {
      if (!VISUAL_QA_SCENARIOS[id]) throw new Error(`디버그 장면이 존재하지 않습니다: ${id}`);
      return Object.freeze({ id, label });
    }),
  );
}
