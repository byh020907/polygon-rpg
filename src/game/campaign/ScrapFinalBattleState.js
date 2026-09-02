export const SCRAP_FINAL_BATTLE_STAGE = Object.freeze({
  INACTIVE: 'inactive',
  ARMOR: 'armor',
  WEAPON: 'weapon',
  CONTROL_CORE: 'control-core',
  CORE_REINSTALLED: 'core-reinstalled',
  EPILOGUE: 'epilogue',
});

const STAGE_SEQUENCE = Object.freeze([
  SCRAP_FINAL_BATTLE_STAGE.ARMOR,
  SCRAP_FINAL_BATTLE_STAGE.WEAPON,
  SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE,
  SCRAP_FINAL_BATTLE_STAGE.CORE_REINSTALLED,
  SCRAP_FINAL_BATTLE_STAGE.EPILOGUE,
]);

const PRESENTATIONS = Object.freeze({
  [SCRAP_FINAL_BATTLE_STAGE.INACTIVE]: Object.freeze({ title: '', cue: '', objective: '' }),
  [SCRAP_FINAL_BATTLE_STAGE.ARMOR]: Object.freeze({
    title: '대항 병기 출격 · 장갑 분리',
    cue: '제설 열차 장갑과 굴착기 다리가 거대 전장의 첫 충격을 견딥니다.',
    objective: '같은 Guard·Roll·Punish 기본기로 고대 병기의 장갑을 벗기세요.',
  }),
  [SCRAP_FINAL_BATTLE_STAGE.WEAPON]: Object.freeze({
    title: '대항 병기 출격 · 절단검 정지',
    cue: '채석장 절단검의 가동부가 크게 예고됩니다. 방패와 회피로 틈을 만드세요.',
    objective: '거대 절단검의 회복 틈에 Basic/Strong 연계를 적중시키세요.',
  }),
  [SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE]: Object.freeze({
    title: '제어부 노출',
    cue: '장갑과 무기가 떨어져 중앙 제어부가 열렸습니다.',
    objective: '마지막 제어부를 멈추고 처음 회수한 제어핵을 되돌릴 길을 만드세요.',
  }),
  [SCRAP_FINAL_BATTLE_STAGE.CORE_REINSTALLED]: Object.freeze({
    title: '제어핵 재설치',
    cue: '수동 제어핵이 고대 병기의 명령 회로에 다시 결합되고 정지 명령이 수락됩니다.',
    objective: '정지한 고대 병기와 다섯 지역의 복구 결과를 확인하세요.',
  }),
  [SCRAP_FINAL_BATTLE_STAGE.EPILOGUE]: Object.freeze({
    title: '공식 수거팀',
    cue: '대항 병기는 다섯 산업기계로 돌아가고, 두 견습생은 왕국 공식 수거팀으로 인정받았습니다.',
    objective: '복구 장비가 된 고대 병기와 각 지역의 마지막 작업을 다시 확인하세요.',
  }),
});

export function assertScrapFinalBattleStageId(stageId) {
  if (!Object.values(SCRAP_FINAL_BATTLE_STAGE).includes(stageId)) {
    throw new Error(`지원하지 않는 final battle stage입니다: ${stageId}`);
  }
  return stageId;
}

export function nextScrapFinalBattleStage(stageId) {
  assertScrapFinalBattleStageId(stageId);
  if (stageId === SCRAP_FINAL_BATTLE_STAGE.INACTIVE) return STAGE_SEQUENCE[0];
  const index = STAGE_SEQUENCE.indexOf(stageId);
  return index < 0 || index === STAGE_SEQUENCE.length - 1 ? stageId : STAGE_SEQUENCE[index + 1];
}

export function getScrapFinalBattlePresentation(stageId) {
  return PRESENTATIONS[assertScrapFinalBattleStageId(stageId)];
}

export function isScrapFinalBattleActive(stageId) {
  return [
    SCRAP_FINAL_BATTLE_STAGE.ARMOR,
    SCRAP_FINAL_BATTLE_STAGE.WEAPON,
    SCRAP_FINAL_BATTLE_STAGE.CONTROL_CORE,
  ].includes(assertScrapFinalBattleStageId(stageId));
}
