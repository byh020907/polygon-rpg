import { SCRAP_FINAL_BATTLE_STAGE } from './ScrapFinalBattleState.js';

function freezePoint(x, y) {
  return Object.freeze({ x, y });
}

function rectangle(x, y, width, height) {
  return Object.freeze([
    freezePoint(x, y),
    freezePoint(x + width, y),
    freezePoint(x + width, y + height),
    freezePoint(x, y + height),
  ]);
}

function diamond(x, y, radiusX, radiusY) {
  return Object.freeze([
    freezePoint(x, y - radiusY),
    freezePoint(x + radiusX, y),
    freezePoint(x, y + radiusY),
    freezePoint(x - radiusX, y),
  ]);
}

function item(id, points, fill, options = {}) {
  return Object.freeze({
    id,
    points,
    fill,
    stroke: options.stroke ?? '#202728',
    lineWidth: options.lineWidth ?? 3,
    renderOrder: options.renderOrder ?? 34,
    order: options.order ?? 0,
    label: options.label ?? id,
    role: options.role ?? 'scrap-final-battle',
    materialId: options.materialId ?? 'metal',
    lightOccluder: options.lightOccluder ?? false,
    emissive: options.emissive ?? false,
    opacity: options.opacity ?? 1,
  });
}

const COUNTER_ROBOT_ITEMS = Object.freeze([
  item('scrap-final-arena-horizon', rectangle(0, 118, 1440, 246), '#263034', {
    renderOrder: -22,
    stroke: '#182022',
    label: '수도 외곽의 고철 전장과 중앙 지휘소 폐허',
    role: 'final-arena-horizon',
    materialId: 'stone',
  }),
  item('scrap-final-arena-ground', rectangle(0, 420, 1440, 120), '#34312d', {
    renderOrder: -21,
    stroke: '#1d1b19',
    label: '거대 전장 판금 지면',
    role: 'final-arena-ground',
    materialId: 'soil',
  }),
  item('scrap-final-counter-leg-left', rectangle(190, 324, 34, 102), '#8a6b4d', {
    label: '대항 병기 · 굴착기 다리',
  }),
  item('scrap-final-counter-leg-right', rectangle(266, 324, 34, 102), '#8a6b4d', {
    label: '대항 병기 · 굴착기 다리',
  }),
  item('scrap-final-counter-snow-armor', diamond(245, 282, 82, 76), '#718896', {
    label: '대항 병기 · 제설 열차 장갑',
    lightOccluder: true,
  }),
  item('scrap-final-counter-reactor', diamond(245, 286, 27, 33), '#a7d56e', {
    label: '대항 병기 · 온실 동력로',
    emissive: true,
    stroke: '#45623b',
  }),
  item('scrap-final-counter-crane-arm', rectangle(118, 265, 94, 22), '#4f9fa7', {
    label: '대항 병기 · 조선소 크레인 팔',
  }),
  item('scrap-final-counter-cable', rectangle(202, 238, 8, 92), '#273133', {
    label: '대항 병기 · 크레인 cable',
    materialId: 'metal',
  }),
  item('scrap-final-counter-cutter', rectangle(292, 240, 26, 142), '#cf654e', {
    label: '대항 병기 · 채석장 절단검',
  }),
]);

const ANCIENT_BODY_ITEMS = Object.freeze([
  item('scrap-final-ancient-leg-left', rectangle(744, 286, 46, 142), '#646c70', {
    label: '고대 병기 · 궤도 다리',
  }),
  item('scrap-final-ancient-leg-right', rectangle(858, 286, 46, 142), '#646c70', {
    label: '고대 병기 · 궤도 다리',
  }),
  item('scrap-final-ancient-body', diamond(824, 254, 118, 108), '#4b5559', {
    label: '고대 병기 · 중앙 지휘소 회수 몸체',
    lightOccluder: true,
  }),
  item('scrap-final-ancient-eye', rectangle(804, 218, 40, 12), '#e37a4e', {
    label: '고대 병기 · 동원 신호 눈',
    emissive: true,
    stroke: '#7b3e2b',
  }),
]);

function stageItems(stageId) {
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.ARMOR) {
    return Object.freeze([
      item('scrap-final-ancient-armor-left', rectangle(708, 194, 68, 152), '#78848a', {
        label: '고대 병기 · 분리할 장갑 왼쪽',
        lightOccluder: true,
      }),
      item('scrap-final-ancient-armor-right', rectangle(872, 194, 68, 152), '#78848a', {
        label: '고대 병기 · 분리할 장갑 오른쪽',
        lightOccluder: true,
      }),
      item('scrap-final-armor-target', diamond(824, 386, 24, 26), '#e4bd64', {
        label: '장갑 결합부 · Guard와 Roll 뒤의 공격 틈',
        emissive: true,
      }),
    ]);
  }
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.WEAPON) {
    return Object.freeze([
      item('scrap-final-ancient-cutter-arm', rectangle(904, 246, 180, 30), '#9a6848', {
        label: '고대 병기 · 크게 예고되는 절단검 가동부',
      }),
      item('scrap-final-ancient-cutter-blade', rectangle(1054, 196, 32, 132), '#d97752', {
        label: '고대 병기 · 멈춰야 하는 절단검',
      }),
      item('scrap-final-weapon-target', diamond(824, 386, 26, 28), '#e4bd64', {
        label: '절단검 회복 틈 · Basic/Strong 연계 목표',
        emissive: true,
      }),
    ]);
  }
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE) {
    return Object.freeze([
      item('scrap-final-ancient-open-chest', diamond(824, 266, 74, 68), '#252e31', {
        label: '장갑과 무기 제거 뒤 열린 고대 병기 제어부',
        stroke: '#97a4a5',
      }),
      item('scrap-final-exposed-control-core', diamond(824, 386, 30, 34), '#a7fff0', {
        label: '노출된 제어부 · 제어핵 재설치 목표',
        emissive: true,
        stroke: '#245e5b',
      }),
    ]);
  }
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.CORE_REINSTALLED) {
    return Object.freeze([
      item('scrap-final-reinstalled-control-core', diamond(824, 266, 29, 35), '#75d6c4', {
        label: '재설치된 첫 제어핵 · 정지 명령 수락',
        emissive: true,
        stroke: '#245e5b',
      }),
      item('scrap-final-stop-signal', rectangle(742, 154, 164, 10), '#75d6c4', {
        label: '고대 병기 정지 신호',
        emissive: true,
      }),
    ]);
  }
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.EPILOGUE) {
    return Object.freeze([
      item('scrap-final-epilogue-crane', rectangle(960, 170, 36, 250), '#597d7f', {
        label: '왕국 복구용 중장비가 된 고대 병기',
      }),
      item('scrap-final-epilogue-repair-arm', rectangle(908, 194, 126, 18), '#8a6b4d', {
        label: '복구 작업을 시작한 고대 병기 팔',
      }),
      item('scrap-final-epilogue-signal', diamond(824, 166, 20, 20), '#75d6c4', {
        label: '정상 제어를 되찾은 제어핵',
        emissive: true,
      }),
    ]);
  }
  return Object.freeze([]);
}

/**
 * Final-battle render facts. This projects the campaign-owned stage only; it
 * never decides combat contact, command transitions, or campaign progression.
 */
export function createScrapFinalBattlePresentation(stageId) {
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.INACTIVE) return Object.freeze([]);
  return Object.freeze([...COUNTER_ROBOT_ITEMS, ...ANCIENT_BODY_ITEMS, ...stageItems(stageId)]);
}
