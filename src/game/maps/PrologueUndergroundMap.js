import { resolveScrapPrologueConversationTranscripts } from '../story/ScrapPrologueStory.js';

export const PROLOGUE_UNDERGROUND_ROOM_IDS = Object.freeze({
  COURTYARD: 'abandoned-weapon-yard',
  UPPER_SORTING_DECK: 'underground-ruins-upper-sorting-deck',
  CHEST_RAMP: 'underground-ruins-chest-ramp',
  LOWER_CONTROL_CHAMBER: 'underground-ruins-lower-control-chamber',
  LOWER_MAINTENANCE_RETURN: 'underground-ruins-lower-maintenance-return',
});

export const PROLOGUE_UNDERGROUND_PORTAL_IDS = Object.freeze({
  COURTYARD_TO_UPPER: 'prologue-courtyard-upper-entry',
  UPPER_TO_RAMP: 'prologue-upper-chest-ramp',
  RAMP_TO_CONTROL: 'prologue-ramp-control-drop',
  CONTROL_TO_MAINTENANCE: 'prologue-control-maintenance-return',
  MAINTENANCE_TO_COURTYARD: 'prologue-maintenance-courtyard-return',
});

export const PROLOGUE_RAMP_RIVAL_CAST_ENTITY_ID = 'cast-rival-chest-ramp';

const STAGE = Object.freeze({
  COMMISSION: 'commission',
  RIVAL_DEPARTURE: 'rival-departure',
  YARD_CLEARANCE: 'yard-clearance',
  YARD_BRACE: 'yard-brace',
  YARD_PERIMETER: 'yard-perimeter',
  YARD_SURVEY: 'yard-survey',
  YARD_APPROACH: 'yard-approach',
  YARD_PLATE: 'yard-plate',
  YARD_RIDGE: 'yard-ridge',
  YARD_GUARD: 'yard-guard',
  YARD_SEARCH: 'yard-search',
  COLLAPSE: 'collapse',
  RESCUE_REQUEST: 'rescue-request',
  PLAYER_DECISION: 'player-decision',
  DEVICE_INVESTIGATED: 'device-investigated',
  DEVICE_RECOVERED: 'device-recovered',
  RESCUE_SUCCEEDED: 'rescue-succeeded',
  EYES_LIT: 'eyes-lit',
  ASSEMBLED: 'assembled',
  DEADLINE_REVEALED: 'deadline-revealed',
  COMPLETE: 'complete',
});

const UPPER_STAGES = Object.freeze([
  STAGE.YARD_CLEARANCE,
  STAGE.YARD_BRACE,
  STAGE.YARD_PERIMETER,
  STAGE.YARD_SURVEY,
  STAGE.YARD_APPROACH,
]);
const RAMP_STAGES = Object.freeze([
  STAGE.YARD_PLATE,
  STAGE.YARD_RIDGE,
  STAGE.YARD_GUARD,
  STAGE.YARD_SEARCH,
]);
const POST_FIGHT_ROUTE_STAGES = Object.freeze([
  STAGE.YARD_SURVEY,
  STAGE.YARD_APPROACH,
  ...RAMP_STAGES,
]);
const LOWER_STAGES = Object.freeze([
  STAGE.COLLAPSE,
  STAGE.RESCUE_REQUEST,
  STAGE.PLAYER_DECISION,
  STAGE.DEVICE_INVESTIGATED,
  STAGE.DEVICE_RECOVERED,
  STAGE.RESCUE_SUCCEEDED,
  STAGE.EYES_LIT,
  STAGE.ASSEMBLED,
  STAGE.DEADLINE_REVEALED,
]);

function frozenResume(roomId, x, y = 350, facing = 1) {
  return Object.freeze({ roomId, position: Object.freeze({ x, y }), facing });
}

export const PROLOGUE_UNDERGROUND_RESUME_BY_STAGE = Object.freeze({
  [STAGE.COMMISSION]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 250),
  [STAGE.RIVAL_DEPARTURE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD, 390),
  [STAGE.YARD_CLEARANCE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 150),
  [STAGE.YARD_BRACE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 520),
  [STAGE.YARD_PERIMETER]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 520),
  [STAGE.YARD_SURVEY]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 520),
  [STAGE.YARD_APPROACH]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK, 930),
  [STAGE.YARD_PLATE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 150),
  [STAGE.YARD_RIDGE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 360),
  [STAGE.YARD_GUARD]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 360),
  [STAGE.YARD_SEARCH]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, 640),
  [STAGE.COLLAPSE]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 780, 350, -1),
  [STAGE.RESCUE_REQUEST]: frozenResume(
    PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
    650,
    350,
    -1,
  ),
  [STAGE.PLAYER_DECISION]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 254),
  [STAGE.DEVICE_INVESTIGATED]: frozenResume(
    PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
    254,
  ),
  [STAGE.DEVICE_RECOVERED]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 254),
  [STAGE.RESCUE_SUCCEEDED]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 510),
  [STAGE.EYES_LIT]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 510),
  [STAGE.ASSEMBLED]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 510),
  [STAGE.DEADLINE_REVEALED]: frozenResume(PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER, 510),
  [STAGE.COMPLETE]: frozenResume(
    PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
    1308,
    350,
    -1,
  ),
});

const COURTYARD_ENTITY_IDS = new Set([
  'cast-scrapyard-owner',
  'cast-rival-departure',
  'scrapyard-owner-commission',
  'scrap-rival-departure',
  'scrapyard-owner-analysis',
  'scrapyard-owner-workshop',
  'scrapyard-wall-operation-map',
  'scrapyard-dialogue-archive',
  'scrapyard-full-recovery-cot',
]);

const UPPER_ENTITY_IDS = new Set([
  'cast-rival-yard',
  'scrap-rival-walk-with',
  'scrap-yard-scout-collector',
  'scrap-rival-survey-guide',
  'scrap-rival-yard-survey',
  'scrap-rival-approach-guide',
]);

const RAMP_ENTITY_IDS = new Set([
  'scrap-rival-plate-guide',
  'scrap-player-search-notice',
  'scrap-rival-collapse-warning',
  'scrap-rival-yard-deep-guide',
  'scrap-player-yard-deep-notice',
  'scrap-rival-yard-plate',
  'scrap-rival-yard-search',
]);

const CONTROL_ENTITY_IDS = new Set([
  'cast-rival-trapped',
  'cast-rival-rescued',
  'scrap-rival-rescue-request',
  'scrap-player-device-decision',
  'scrap-control-device',
]);

const MAINTENANCE_ENTITY_IDS = new Set(['cast-rival-return', 'scrap-rival-return-guide']);

const UNDERGROUND_AMBIENT_LINES = Object.freeze({
  'scrap-rival-walk-with': Object.freeze([
    '상층 발판 아래 정비 레일을 기억해 둬. 먼저 케이블 수거 유닛이 버티는 끊긴 다리까지 가자.',
  ]),
  'scrap-rival-survey-guide': Object.freeze([
    '수거 유닛이 멈추자 다리가 내려왔어. 아래 정비로를 보면서 오른쪽 조사 지점까지 건너가자.',
    '저 하층 길이 고물상 쪽으로 이어져. 돌아올 수 있게 위치를 기억해 둬.',
  ]),
  'scrap-rival-approach-guide': Object.freeze([
    '하층 정비로 위치는 확인했어. 오른쪽 고대 흉곽 경사로 입구까지 가자.',
  ]),
  'scrap-rival-plate-guide': Object.freeze([
    '이 경사로는 상층 분류 설비보다 훨씬 오래됐어. 지지판 안쪽 청록 케이블을 같이 살펴보자.',
    '흔들리면 바로 방패를 들어. 회수팔과 제어핵이 어디서 이어지는지 확인해야 해.',
  ]),
  'scrap-player-search-notice': Object.freeze([
    '흉갑 경사로는 버티지만, 벽 안쪽 회수팔이 같은 박자로 움직인다.',
    '청록 케이블 끝의 장치를 라이벌과 같이 확인하자.',
  ]),
  'scrap-rival-return-guide': Object.freeze([
    '뒤쪽 상층 길은 막혔어. 아까 아래서 본 정비 레일이 왼쪽 고물상까지 이어져.',
    '제어핵을 들고 이 길을 끝까지 따라가자. 주인에게 먼저 보고해야 해.',
  ]),
});

const RAMP_RENDER_PREFIXES = Object.freeze([
  'scrap-yard-winch-',
  'scrap-yard-chest-',
  'scrap-yard-plate-',
  'scrap-retrieval-arm-dormant-',
]);
const CONTROL_RENDER_PREFIXES = Object.freeze([
  'wreck-',
  'scrap-collapse-',
  'scrap-rescue-',
  'scrap-retrieval-arm-grab-',
  'scrap-device-',
  'scrap-king-',
]);

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
}

function rectangle(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function polygon(cx, cy, radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
}

function renderItem(id, points, fill, options = {}) {
  return {
    id,
    points,
    fill,
    stroke: options.stroke ?? '#151819',
    lineWidth: options.lineWidth ?? 3,
    opacity: options.opacity ?? 1,
    order: options.order ?? 0,
    renderOrder: options.renderOrder ?? 30,
    enabled: options.enabled ?? true,
    presentationOnly: true,
    // These room-local shapes are authored after the room receives a large world offset.
    // Keeping them on the gameplay plane prevents a second camera-parallax offset from
    // pushing the underground vault out of the visible room.
    parallax: 1,
    materialId: options.materialId ?? 'stone',
    surfaceNormal: options.surfaceNormal ?? { x: 0, y: -1 },
    lightOccluder: options.lightOccluder ?? false,
    emissive: options.emissive ?? false,
    graphics: {
      category: options.category ?? 'terrain',
      groupId: options.groupId ?? 'prologue-underground-ruins',
      label: options.label ?? '고대 지하 산업 유적',
    },
    ...(options.label ? { label: options.label } : {}),
    ...(options.role ? { role: options.role } : {}),
  };
}

function translateObject(object, x, y = 0) {
  return {
    ...clone(object),
    ...(object.points
      ? { points: object.points.map((point) => ({ x: point.x + x, y: point.y + y })) }
      : {}),
    ...(object.position
      ? { position: { x: object.position.x + x, y: object.position.y + y } }
      : {}),
  };
}

function createRuinShell(prefix, width, tone, accent, label) {
  const items = [
    renderItem(`${prefix}-vault`, rectangle(0, 94, width, 332), tone, {
      stroke: '#1d2222',
      lineWidth: 6,
      order: -84,
      parallax: 0.24,
      lightOccluder: true,
      label,
      role: 'arched-masonry-vault',
    }),
    renderItem(`${prefix}-floor`, rectangle(0, 426, width, 114), '#2c2a27', {
      stroke: '#151515',
      lineWidth: 5,
      order: -4,
      materialId: 'stone',
      label: `${label} 바닥`,
      role: 'walkable-floor',
    }),
    renderItem(`${prefix}-rail-bed`, rectangle(0, 404, width, 14), '#51483e', {
      stroke: '#211f1c',
      lineWidth: 2,
      order: -2,
      materialId: 'raw-steel',
      role: 'buried-rail',
    }),
  ];
  for (let x = 70, index = 0; x < width; x += 220, index += 1) {
    items.push(
      renderItem(`${prefix}-rib-${index}`, rectangle(x, 116, 24, 290), '#4e504a', {
        stroke: '#1e2322',
        lineWidth: 5,
        order: -61,
        parallax: 0.48,
        materialId: 'raw-steel',
        lightOccluder: true,
        label: `${label} 군수 리브`,
        role: 'old-military-rib',
      }),
      renderItem(`${prefix}-lamp-${index}`, polygon(x + 12, 168, 12, 9, 8), '#ffc46b', {
        stroke: '#5d3b1c',
        lineWidth: 2,
        order: -40,
        emissive: true,
        materialId: 'glass',
        label: `${label} 잔존 작업등`,
        role: 'warm-worklight',
      }),
    );
  }
  items.push(
    renderItem(`${prefix}-cyan-conduit`, rectangle(42, 382, Math.max(64, width - 84), 6), accent, {
      stroke: '#194d50',
      lineWidth: 2,
      order: -1,
      emissive: true,
      materialId: 'glass',
      label: `${label} 제어 신호`,
      role: 'cyan-core-conduit',
    }),
  );
  return items;
}

function createUpperRenderItems() {
  return [
    ...createRuinShell('underground-upper', 1440, '#343a38', '#72d9d2', '상층 분류 데크'),
    renderItem('underground-upper-sorter-frame', rectangle(238, 220, 274, 34), '#69665c', {
      stroke: '#282a27',
      lineWidth: 5,
      order: -18,
      materialId: 'raw-steel',
      lightOccluder: true,
      label: '멈춘 군수 분류 레일',
      role: 'sorting-rail',
    }),
    renderItem(
      'underground-upper-lower-return-glimpse',
      rectangle(1010, 278, 330, 118),
      '#171d1d',
      {
        stroke: '#59605b',
        lineWidth: 6,
        order: -24,
        parallax: 0.72,
        lightOccluder: true,
        label: '상층에서 미리 보이는 하층 정비 귀환로',
        role: 'foreshadowed-return-route',
      },
    ),
    renderItem('underground-upper-lower-return-rail', rectangle(1034, 358, 282, 10), '#756f64', {
      stroke: '#242726',
      lineWidth: 3,
      order: -22,
      parallax: 0.72,
      materialId: 'raw-steel',
      label: '아래쪽에 이어지는 정비 레일',
      role: 'foreshadowed-return-rail',
    }),
    renderItem('underground-upper-lower-return-signal', polygon(1282, 334, 10, 10, 8), '#78e1d8', {
      stroke: '#215553',
      lineWidth: 2,
      order: -20,
      parallax: 0.72,
      emissive: true,
      materialId: 'glass',
      label: '하층 정비로 잔존 신호',
      role: 'foreshadowed-return-signal',
    }),
    renderItem(
      'underground-upper-broken-span',
      [
        { x: 620, y: 426 },
        { x: 678, y: 400 },
        { x: 734, y: 418 },
        { x: 790, y: 394 },
        { x: 860, y: 426 },
        { x: 860, y: 452 },
        { x: 620, y: 452 },
      ],
      '#211f1d',
      {
        stroke: '#121313',
        lineWidth: 4,
        order: 2,
        materialId: 'raw-steel',
        label: '수거 유닛이 잠근 끊긴 교량',
        role: 'blocked-route',
      },
    ),
    renderItem(
      'underground-upper-bridge-deployed',
      [
        { x: 620, y: 414 },
        { x: 710, y: 400 },
        { x: 800, y: 400 },
        { x: 900, y: 414 },
        { x: 900, y: 436 },
        { x: 620, y: 436 },
      ],
      '#777268',
      {
        stroke: '#292b29',
        lineWidth: 5,
        order: 7,
        enabled: false,
        materialId: 'raw-steel',
        lightOccluder: true,
        label: '복구된 횡단 교량',
        role: 'opened-route',
      },
    ),
    renderItem('underground-upper-safety-shelf', rectangle(560, 505, 490, 16), '#403d38', {
      stroke: '#1b1d1c',
      lineWidth: 4,
      order: -3,
      materialId: 'raw-steel',
      lightOccluder: true,
      label: '교량 아래 추락 방지 정비 발판',
      role: 'fall-recovery-shelf',
    }),
    renderItem(
      'underground-upper-recovery-ramp',
      [
        { x: 1050, y: 505 },
        { x: 1350, y: 426 },
        { x: 1350, y: 444 },
        { x: 1050, y: 523 },
      ],
      '#4b4842',
      {
        stroke: '#1b1d1c',
        lineWidth: 4,
        order: -2,
        materialId: 'raw-steel',
        lightOccluder: true,
        label: '추락 방지 발판에서 상층으로 복귀하는 완만한 경사',
        role: 'fall-recovery-ramp',
      },
    ),
    renderItem('underground-upper-route-locked', polygon(574, 354, 15, 15, 8), '#dc8650', {
      stroke: '#5b2e22',
      order: 8,
      enabled: false,
      emissive: true,
      label: '교량 동력 잠금',
      role: 'route-locked',
    }),
    renderItem('underground-upper-route-ready', polygon(930, 354, 15, 15, 8), '#8ff7ea', {
      stroke: '#245f5e',
      order: 8,
      enabled: false,
      emissive: true,
      label: '하층 경사로 진입 신호',
      role: 'route-open',
    }),
  ];
}

function createRampRenderItems(existingItems) {
  return [
    ...createRuinShell('underground-ramp', 960, '#2d3535', '#78e1d8', '흉갑 경사로'),
    renderItem(
      'underground-chest-ramp-visible',
      [
        { x: 120, y: 406 },
        { x: 780, y: 246 },
        { x: 808, y: 270 },
        { x: 142, y: 432 },
      ],
      '#686963',
      {
        stroke: '#252827',
        lineWidth: 6,
        order: 5,
        enabled: false,
        materialId: 'metal',
        lightOccluder: true,
        label: '내려앉은 폐병기 흉갑 경사로',
        role: 'walkable-ramp',
      },
    ),
    renderItem('underground-ramp-depth-marker', rectangle(814, 190, 18, 208), '#6e5d43', {
      stroke: '#28231d',
      lineWidth: 4,
      order: -12,
      lightOccluder: true,
      label: '하층 제어실 깊이 표식',
      role: 'depth-marker',
    }),
    ...existingItems.map((item) => ({ ...translateObject(item, -700), parallax: 1 })),
  ];
}

function createControlRenderItems(existingItems) {
  return [
    ...createRuinShell('underground-control', 960, '#252e30', '#8affef', '하층 제어실'),
    renderItem('underground-control-arch-left', polygon(154, 286, 112, 170, 12), '#3e4544', {
      stroke: '#181d1d',
      lineWidth: 7,
      order: -44,
      parallax: 0.62,
      lightOccluder: true,
      label: '제어실 석조 압력 아치',
      role: 'pressure-arch',
    }),
    renderItem('underground-control-arch-right', polygon(806, 286, 112, 170, 12), '#3e4544', {
      stroke: '#181d1d',
      lineWidth: 7,
      order: -44,
      parallax: 0.62,
      lightOccluder: true,
      label: '제어실 석조 압력 아치',
      role: 'pressure-arch',
    }),
    renderItem('underground-control-core-dais', polygon(254, 405, 104, 26, 8), '#4b504b', {
      stroke: '#1d2220',
      lineWidth: 5,
      order: 3,
      materialId: 'stone',
      label: '제어핵 회수 좌대',
      role: 'core-dais',
    }),
    ...existingItems.map((item) => ({ ...translateObject(item, -520), parallax: 1 })),
  ];
}

function createMaintenanceRenderItems() {
  return [
    ...createRuinShell('underground-maintenance', 1440, '#303331', '#62cfc9', '하층 정비 귀환로'),
    renderItem('underground-maintenance-service-rail', rectangle(130, 314, 1180, 24), '#625d54', {
      stroke: '#242522',
      lineWidth: 5,
      order: -5,
      materialId: 'raw-steel',
      lightOccluder: true,
      label: '지상 작업장으로 이어진 정비 레일',
      role: 'return-rail',
    }),
    renderItem(
      'underground-maintenance-return-arrow',
      [
        { x: 1320, y: 360 },
        { x: 1190, y: 360 },
        { x: 1190, y: 334 },
        { x: 1090, y: 382 },
        { x: 1190, y: 430 },
        { x: 1190, y: 404 },
        { x: 1320, y: 404 },
      ],
      '#78e1d8',
      {
        stroke: '#215553',
        lineWidth: 3,
        order: 4,
        emissive: true,
        label: '작업장 귀환 방향',
        role: 'return-route-signal',
      },
    ),
  ];
}

function relocateEntity(entity, position, overrides = {}) {
  return { ...clone(entity), position: { ...position }, ...overrides };
}

function syncPrologueConversation(entity) {
  const ambientLines = UNDERGROUND_AMBIENT_LINES[entity.id];
  if (!entity.conversationId) {
    return ambientLines ? { ...entity, lines: [...ambientLines] } : entity;
  }
  const transcript = resolveScrapPrologueConversationTranscripts([entity.conversationId])[0];
  if (!transcript) return ambientLines ? { ...entity, lines: [...ambientLines] } : entity;
  return {
    ...entity,
    speaker: transcript.speaker,
    conversationTitle: transcript.title,
    lines: [...transcript.lines],
  };
}

function entityById(entities, id) {
  const entity = entities.find((candidate) => candidate.id === id);
  if (!entity) throw new Error(`도입 맵 변환 대상 entity가 없습니다: ${id}`);
  return entity;
}

function createRooms(oldRoom) {
  const entities = oldRoom.entities;
  const courtyardEntities = entities
    .filter((entity) => COURTYARD_ENTITY_IDS.has(entity.id))
    .map((entity) => syncPrologueConversation(clone(entity)));
  const upperPositions = new Map([
    ['cast-rival-yard', { x: 320, y: 344 }],
    ['scrap-rival-walk-with', { x: 220, y: 354 }],
    ['scrap-yard-scout-collector', { x: 400, y: 426 }],
    ['scrap-rival-survey-guide', { x: 850, y: 354 }],
    ['scrap-rival-yard-survey', { x: 930, y: 354 }],
    ['scrap-rival-approach-guide', { x: 1120, y: 354 }],
  ]);
  const upperEntities = entities
    .filter((entity) => UPPER_ENTITY_IDS.has(entity.id))
    .map((entity) => {
      const moved = syncPrologueConversation(relocateEntity(entity, upperPositions.get(entity.id)));
      if (moved.id === 'scrap-yard-scout-collector') {
        moved.scrapAwakeningNextStageId = STAGE.YARD_SURVEY;
      }
      return moved;
    });

  const rampTemplate = entityById(entities, 'cast-rival-yard');
  const rampCast = relocateEntity(
    rampTemplate,
    { x: 230, y: 344 },
    {
      id: PROLOGUE_RAMP_RIVAL_CAST_ENTITY_ID,
      enabled: false,
    },
  );
  const rampPositions = new Map([
    ['scrap-rival-plate-guide', { x: 270, y: 354 }],
    ['scrap-rival-yard-plate', { x: 360, y: 354 }],
    ['scrap-player-search-notice', { x: 520, y: 354 }],
    ['scrap-rival-collapse-warning', { x: 650, y: 354 }],
    ['scrap-rival-yard-deep-guide', { x: 710, y: 354 }],
    ['scrap-player-yard-deep-notice', { x: 770, y: 354 }],
    ['scrap-rival-yard-search', { x: 820, y: 354 }],
  ]);
  const rampEntities = [
    rampCast,
    ...entities
      .filter((entity) => RAMP_ENTITY_IDS.has(entity.id))
      .map((entity) => {
        const moved = syncPrologueConversation(
          relocateEntity(entity, rampPositions.get(entity.id)),
        );
        if (moved.id === 'scrap-rival-yard-plate') {
          moved.scrapAwakeningNextStageId = STAGE.YARD_SEARCH;
        }
        if (moved.id === 'scrap-rival-yard-search') {
          moved.scrapAwakeningNextStageId = STAGE.COLLAPSE;
        }
        return moved;
      }),
  ];

  const controlPositions = new Map([
    ['cast-rival-trapped', { x: 510, y: 344 }],
    ['cast-rival-rescued', { x: 510, y: 344 }],
    ['scrap-rival-rescue-request', { x: 510, y: 354 }],
    ['scrap-player-device-decision', { x: 254, y: 354 }],
    ['scrap-control-device', { x: 254, y: 354 }],
  ]);
  const controlEntities = entities
    .filter((entity) => CONTROL_ENTITY_IDS.has(entity.id))
    .map((entity) =>
      syncPrologueConversation(relocateEntity(entity, controlPositions.get(entity.id))),
    );
  const maintenancePositions = new Map([
    ['cast-rival-return', { x: 520, y: 344 }],
    ['scrap-rival-return-guide', { x: 520, y: 354 }],
  ]);
  const maintenanceEntities = entities
    .filter((entity) => MAINTENANCE_ENTITY_IDS.has(entity.id))
    .map((entity) =>
      syncPrologueConversation(relocateEntity(entity, maintenancePositions.get(entity.id))),
    );

  const rampExistingRenderItems = oldRoom.renderItems.filter((item) =>
    RAMP_RENDER_PREFIXES.some((prefix) => item.id.startsWith(prefix)),
  );
  const controlExistingRenderItems = oldRoom.renderItems.filter((item) =>
    CONTROL_RENDER_PREFIXES.some((prefix) => item.id.startsWith(prefix)),
  );
  const relocatedRenderIds = new Set(
    [...rampExistingRenderItems, ...controlExistingRenderItems].map((item) => item.id),
  );
  const courtyardRenderItems = oldRoom.renderItems
    .filter((item) => !relocatedRenderIds.has(item.id))
    .map((item) => clone(item));

  return [
    {
      ...clone(oldRoom),
      id: PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
      label: '고물상 작업 마당 · 차고',
      bounds: { x: 0, y: 0, width: 1440, height: 540 },
      cameraAnchor: { x: 720, y: 270 },
      movementBounds: { minX: 24, maxX: 1416 },
      surfaces: [
        {
          id: 'scrap-yard-ground-surface',
          kind: 'solid',
          material: 'riveted-scrap-earth',
          points: [
            { x: 0, y: 426 },
            { x: 1440, y: 426 },
          ],
        },
      ],
      renderItems: courtyardRenderItems,
      entities: courtyardEntities,
      portals: [
        ...oldRoom.portals,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
      ],
    },
    {
      id: PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
      label: '지하 유적 · 상층 분류 데크',
      bounds: { x: 1440, y: 540, width: 1440, height: 540 },
      cameraAnchor: { x: 480, y: 270 },
      groundY: 426,
      movementBounds: { minX: 24, maxX: 1416 },
      renderOrder: oldRoom.renderOrder,
      surfaces: [
        {
          id: 'underground-upper-ground-left-surface',
          kind: 'solid',
          material: 'stone',
          points: [
            { x: 0, y: 426 },
            { x: 620, y: 426 },
          ],
        },
        {
          id: 'underground-upper-bridge-surface',
          kind: 'one-way',
          material: 'riveted-bridge',
          points: [
            { x: 620, y: 414 },
            { x: 710, y: 400 },
            { x: 800, y: 400 },
            { x: 900, y: 414 },
          ],
          enabled: false,
        },
        {
          id: 'underground-upper-ground-right-surface',
          kind: 'solid',
          material: 'stone',
          points: [
            { x: 900, y: 426 },
            { x: 1440, y: 426 },
          ],
        },
        {
          id: 'underground-upper-safety-shelf-surface',
          kind: 'one-way',
          material: 'raw-steel',
          points: [
            { x: 560, y: 505 },
            { x: 1050, y: 505 },
          ],
        },
        {
          id: 'underground-upper-recovery-ramp-surface',
          kind: 'solid',
          material: 'raw-steel',
          points: [
            { x: 1050, y: 505 },
            { x: 1350, y: 426 },
          ],
        },
      ],
      renderItems: createUpperRenderItems(),
      entities: upperEntities,
      triggers: [],
      portals: [
        PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
      ],
    },
    {
      id: PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
      label: '지하 유적 · 내려앉은 흉갑 경사로',
      bounds: { x: 2880, y: 540, width: 960, height: 540 },
      cameraAnchor: { x: 480, y: 270 },
      groundY: 426,
      movementBounds: { minX: 24, maxX: 936 },
      renderOrder: oldRoom.renderOrder,
      surfaces: [
        {
          id: 'underground-ramp-floor-surface',
          kind: 'solid',
          material: 'stone',
          points: [
            { x: 0, y: 426 },
            { x: 960, y: 426 },
          ],
        },
        {
          id: 'underground-chest-ramp-surface',
          kind: 'one-way',
          material: 'metal',
          points: [
            { x: 142, y: 406 },
            { x: 790, y: 250 },
          ],
          enabled: false,
        },
      ],
      renderItems: createRampRenderItems(rampExistingRenderItems),
      entities: rampEntities,
      triggers: [],
      portals: [
        PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.RAMP_TO_CONTROL,
      ],
    },
    {
      id: PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
      label: '지하 유적 · 하층 제어실',
      bounds: { x: 2880, y: 1080, width: 960, height: 540 },
      cameraAnchor: { x: 480, y: 270 },
      groundY: 426,
      movementBounds: { minX: 24, maxX: 936 },
      renderOrder: oldRoom.renderOrder,
      surfaces: [
        {
          id: 'underground-control-floor-surface',
          kind: 'solid',
          material: 'stone',
          points: [
            { x: 0, y: 426 },
            { x: 960, y: 426 },
          ],
        },
        {
          id: 'underground-control-dais-surface',
          kind: 'one-way',
          material: 'stone',
          points: [
            { x: 150, y: 405 },
            { x: 358, y: 405 },
          ],
        },
      ],
      renderItems: createControlRenderItems(controlExistingRenderItems),
      entities: controlEntities,
      triggers: [],
      portals: [
        PROLOGUE_UNDERGROUND_PORTAL_IDS.RAMP_TO_CONTROL,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.CONTROL_TO_MAINTENANCE,
      ],
    },
    {
      id: PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
      label: '지하 유적 · 하층 정비 귀환로',
      bounds: { x: 1440, y: 1080, width: 1440, height: 540 },
      cameraAnchor: { x: 480, y: 270 },
      groundY: 426,
      movementBounds: { minX: 24, maxX: 1416 },
      renderOrder: oldRoom.renderOrder,
      surfaces: [
        {
          id: 'underground-maintenance-floor-surface',
          kind: 'solid',
          material: 'stone',
          points: [
            { x: 0, y: 426 },
            { x: 1440, y: 426 },
          ],
        },
        {
          id: 'underground-maintenance-service-surface',
          kind: 'one-way',
          material: 'raw-steel',
          points: [
            { x: 130, y: 314 },
            { x: 1310, y: 314 },
          ],
        },
      ],
      renderItems: createMaintenanceRenderItems(),
      entities: maintenanceEntities,
      triggers: [],
      portals: [
        PROLOGUE_UNDERGROUND_PORTAL_IDS.CONTROL_TO_MAINTENANCE,
        PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
      ],
    },
  ];
}

function createProloguePortals(regionId) {
  const endpoint = (roomId, anchor, spawn, radius = 72) => ({
    regionId,
    roomId,
    anchor,
    spawn,
    radius,
  });
  return [
    {
      id: PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
      enabled: false,
      bidirectional: true,
      from: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
        { x: 1370, y: 426 },
        { x: 1308, y: 350 },
      ),
      to: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
        { x: 60, y: 426 },
        { x: 126, y: 350 },
      ),
      transition: { durationSeconds: 0.38 },
    },
    {
      id: PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
      enabled: false,
      bidirectional: true,
      scrapAwakeningNextStageId: STAGE.YARD_PLATE,
      from: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.UPPER_SORTING_DECK,
        { x: 1370, y: 426 },
        { x: 1308, y: 350 },
      ),
      to: endpoint(PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP, { x: 60, y: 426 }, { x: 126, y: 350 }),
      transition: { durationSeconds: 0.4 },
    },
    {
      id: PROLOGUE_UNDERGROUND_PORTAL_IDS.RAMP_TO_CONTROL,
      enabled: false,
      bidirectional: false,
      from: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.CHEST_RAMP,
        { x: 890, y: 426 },
        { x: 830, y: 350 },
      ),
      to: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
        { x: 890, y: 426 },
        { x: 790, y: 350 },
      ),
      transition: { durationSeconds: 0.56 },
    },
    {
      id: PROLOGUE_UNDERGROUND_PORTAL_IDS.CONTROL_TO_MAINTENANCE,
      enabled: false,
      bidirectional: false,
      from: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_CONTROL_CHAMBER,
        { x: 60, y: 426 },
        { x: 126, y: 350 },
      ),
      to: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
        { x: 1370, y: 426 },
        { x: 1308, y: 350 },
      ),
      transition: { durationSeconds: 0.42 },
    },
    {
      id: PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
      enabled: false,
      bidirectional: false,
      from: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.LOWER_MAINTENANCE_RETURN,
        { x: 70, y: 426 },
        { x: 130, y: 350 },
      ),
      to: endpoint(
        PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
        { x: 1320, y: 426 },
        { x: 1250, y: 350 },
      ),
      transition: { durationSeconds: 0.52 },
    },
  ];
}

function createRoutePatches() {
  return [
    {
      id: 'prologue-underground-entry-route',
      priority: 700,
      when: { fact: 'scrapAwakeningStageId', in: [...UPPER_STAGES, ...RAMP_STAGES] },
      operations: [
        {
          op: 'set-enabled',
          target: PROLOGUE_UNDERGROUND_PORTAL_IDS.COURTYARD_TO_UPPER,
          value: true,
        },
      ],
    },
    {
      id: 'prologue-underground-bridge-locked',
      priority: 701,
      when: { fact: 'scrapAwakeningStageId', eq: STAGE.YARD_CLEARANCE },
      operations: [
        { op: 'set-enabled', target: 'underground-upper-route-locked', value: true },
        { op: 'set-enabled', target: 'underground-upper-route-ready', value: false },
        { op: 'set-enabled', target: 'underground-upper-bridge-surface', value: false },
        { op: 'set-enabled', target: 'underground-upper-bridge-deployed', value: false },
      ],
    },
    {
      id: 'prologue-underground-bridge-opened',
      priority: 702,
      when: { fact: 'scrapAwakeningStageId', in: POST_FIGHT_ROUTE_STAGES },
      operations: [
        { op: 'set-enabled', target: 'underground-upper-route-locked', value: false },
        { op: 'set-enabled', target: 'underground-upper-route-ready', value: true },
        { op: 'set-enabled', target: 'underground-upper-bridge-surface', value: true },
        { op: 'set-enabled', target: 'underground-upper-bridge-deployed', value: true },
        { op: 'set-enabled', target: 'underground-chest-ramp-surface', value: true },
        { op: 'set-enabled', target: 'underground-chest-ramp-visible', value: true },
      ],
    },
    {
      id: 'prologue-underground-ramp-route',
      priority: 703,
      when: { fact: 'scrapAwakeningStageId', in: [STAGE.YARD_APPROACH, ...RAMP_STAGES] },
      operations: [
        {
          op: 'set-enabled',
          target: PROLOGUE_UNDERGROUND_PORTAL_IDS.UPPER_TO_RAMP,
          value: true,
        },
      ],
    },
    {
      id: 'prologue-underground-collapse-drop',
      priority: 704,
      when: { fact: 'scrapAwakeningStageId', in: LOWER_STAGES },
      operations: [
        {
          op: 'set-enabled',
          target: PROLOGUE_UNDERGROUND_PORTAL_IDS.RAMP_TO_CONTROL,
          value: true,
        },
      ],
    },
    {
      id: 'prologue-underground-return-route',
      priority: 705,
      when: { fact: 'scrapAwakeningStageId', eq: STAGE.COMPLETE },
      operations: [
        {
          op: 'set-enabled',
          target: PROLOGUE_UNDERGROUND_PORTAL_IDS.CONTROL_TO_MAINTENANCE,
          value: true,
        },
        {
          op: 'set-enabled',
          target: PROLOGUE_UNDERGROUND_PORTAL_IDS.MAINTENANCE_TO_COURTYARD,
          value: true,
        },
      ],
    },
  ];
}

function collectDefinitionIds(definition) {
  const ids = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== 'object') return;
    if (typeof value.id === 'string') ids.add(value.id);
    for (const [key, entry] of Object.entries(value)) {
      if (key !== 'patches') visit(entry);
    }
  };
  const withoutPatches = { ...definition };
  delete withoutPatches.patches;
  visit(withoutPatches);
  return ids;
}

function repairLegacyStagePatches(patches) {
  return patches.map((patch) => {
    const result = clone(patch);
    const rampPatch = [
      'scrap-prologue-yard-plate',
      'scrap-prologue-yard-ridge',
      'scrap-prologue-yard-guard',
      'scrap-prologue-yard-search',
    ].includes(result.id);
    result.operations = result.operations.map((operation) => {
      if (rampPatch && operation.target === 'cast-rival-yard') {
        return {
          ...operation,
          target: PROLOGUE_RAMP_RIVAL_CAST_ENTITY_ID,
          override: {
            ...operation.override,
            enabled: true,
            position:
              result.id === 'scrap-prologue-yard-search' ? { x: 820, y: 344 } : { x: 360, y: 344 },
          },
        };
      }
      if (operation.target === 'cast-rival-yard' && operation.override) {
        const upperXByPatch = {
          'scrap-prologue-yard-clearance': 320,
          'scrap-prologue-yard-brace': 520,
          'scrap-prologue-yard-perimeter': 520,
          'scrap-prologue-yard-survey': 930,
          'scrap-prologue-yard-approach': 1120,
        };
        const x = upperXByPatch[result.id];
        return x
          ? { ...operation, override: { ...operation.override, position: { x, y: 344 } } }
          : operation;
      }
      return operation;
    });
    if (['scrap-prologue-yard-brace', 'scrap-prologue-yard-perimeter'].includes(result.id)) {
      result.operations.push({
        op: 'set-enabled',
        target: 'scrap-rival-yard-survey',
        value: true,
      });
    }
    if (['scrap-prologue-yard-ridge', 'scrap-prologue-yard-guard'].includes(result.id)) {
      result.operations.push({
        op: 'set-enabled',
        target: 'scrap-rival-yard-search',
        value: true,
      });
    }
    return result;
  });
}

export function applyPrologueUndergroundMap(rawDefinition) {
  const definition = clone(rawDefinition);
  const region = definition.regions.find((candidate) => candidate.id === 'scrap-waste-edge');
  if (!region) throw new Error('도입 지하 유적을 배치할 scrap-waste-edge region이 없습니다.');
  const oldRoom = region.rooms.find(
    (candidate) => candidate.id === PROLOGUE_UNDERGROUND_ROOM_IDS.COURTYARD,
  );
  if (!oldRoom) throw new Error('기존 abandoned-weapon-yard room이 없습니다.');

  region.label = '고물상 작업 마당과 지하 군수 유적';
  region.rooms = createRooms(oldRoom);
  definition.worldSize = { width: 3840, height: 1620 };
  definition.version = Math.max(2, Number(definition.version ?? 1) + 1);
  definition.portals.push(...createProloguePortals(region.id));

  definition.patches = repairLegacyStagePatches(definition.patches);
  const definitionIds = collectDefinitionIds(definition);
  definition.patches = definition.patches.map((patch) => ({
    ...patch,
    operations: patch.operations.filter(
      (operation) => typeof operation.target !== 'string' || definitionIds.has(operation.target),
    ),
  }));
  definition.patches.push(...createRoutePatches());
  return definition;
}
