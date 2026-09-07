function conversation({ id, title, speaker, lines }) {
  return Object.freeze({
    id,
    title,
    speaker,
    lines: Object.freeze([...lines]),
  });
}

/**
 * Regional story stays authored separately from map state. The map owns where
 * a line appears; this catalog owns the immutable words that the scene and
 * transcript both present.
 */
export const SCRAP_REGION_CONVERSATION = Object.freeze({
  MINE_FOREMAN: conversation({
    id: 'abandoned-mine:foreman-briefing',
    title: '붕괴 광산 구조 요청',
    speaker: '폐광 작업반장',
    lines: [
      '갱도 안 작업자 셋은 살아 있어. 수거반이 사람을 꺼낼 레일을 뜯어 자기 몫으로 챙기고 있어.',
      '보행식 굴착기로 천장을 받칠 마지막 기둥을 세우면 모두 나올 수 있어. 그 뒤 굴착기 다리는 네가 가져가.',
      '먼저 오른쪽 현황판에서 어디가 무너졌는지와 얼마나 걸리는지 확인해 줘.',
    ],
  }),
  MINE_WAITING: conversation({
    id: 'abandoned-mine:waiting-miner',
    title: '갇힌 동료를 기다리는 광부',
    speaker: '대기 광부',
    lines: [
      '셋이 아직 갱도 안에 있어. 반장은 천장을 받칠 기둥 얘기만 하지만, 난 사람을 꺼낼 레일이 다시 깔리는 걸 보고 싶어.',
      '네가 구조 길을 열면 내가 먼저 들어가서 동료들 손을 잡고 나올게. 곡괭이는 이미 챙겼어.',
      '오른쪽 현황판은 봤어? 제때 끝내야 저 거대 병기가 산길을 돌아가서 우리에게 시간이 생긴대.',
    ],
  }),
  MINE_WORKING: conversation({
    id: 'abandoned-mine:waiting-miner-working',
    title: '갱도 앞에 선 대기 광부',
    speaker: '대기 광부',
    lines: [
      '통로가 열렸어. 구조 등이 켜지면 내가 먼저 들어가서 동료들 손을 잡을게.',
      '넌 굴착기 쪽을 맡아줘. 수거반이 또 사람을 꺼낼 레일을 노릴지도 몰라.',
    ],
  }),
  MINE_AFTER: conversation({
    id: 'abandoned-mine:waiting-miner-after',
    title: '구조를 마친 대기 광부',
    speaker: '대기 광부',
    lines: [
      '셋 다 나왔어! 구조 등은 켜 둘게. 이제 이 갱도는 새 기둥으로 안전하게 버틸 거야.',
      '굴착기 다리는 가져가. 네 로봇이 저 병기를 산길 밖으로 돌게 만든 셈이니까.',
    ],
  }),
  SHIPYARD_WELDER: conversation({
    id: 'harbor-shipyard:worker-briefing',
    title: '점거된 조선소 탈환 요청',
    speaker: '조선소 용접공',
    lines: [
      '수거반이 배를 말려 수리하는 도크를 차지해서 마지막 선박의 바깥 철판 수리가 멈췄어.',
      '도크를 되찾아 수리를 끝내면 곧 퇴역할 쌍둥이 크레인의 기름 압력 장치를 넘겨줄게.',
      '왼쪽 현황판에서 어디가 막혔는지와 작업 시간을 먼저 확인해 줘.',
    ],
  }),
  SHIPYARD_WAITING: conversation({
    id: 'harbor-shipyard:waiting-crew',
    title: '출항을 기다리는 갑판원',
    speaker: '대기 갑판원',
    lines: [
      '마지막 선박이 수리 도크에 묶인 채로 있어. 용접공은 철판 얘기만 하지만, 난 크레인의 굵은 끌어올림 줄이 다시 감기는 걸 보고 싶어.',
      '네가 점거를 풀면 내가 먼저 올라가서 갑판을 정리할게. 배를 묶는 갈고리는 이미 챙겼어.',
      '오른쪽 현황판은 봤어? 제때 끝내야 저 거대 병기가 해안길을 돌아간대.',
    ],
  }),
  SHIPYARD_WORKING: conversation({
    id: 'harbor-shipyard:waiting-crew-working',
    title: '건선거 앞에 선 대기 갑판원',
    speaker: '대기 갑판원',
    lines: [
      '통로가 열렸어. 도크 작업등이 켜지면 내가 먼저 들어가서 갑판을 정리할게.',
      '넌 크레인 쪽을 맡아줘. 수거반이 또 굵은 끌어올림 줄을 노릴지도 몰라.',
    ],
  }),
  SHIPYARD_AFTER: conversation({
    id: 'harbor-shipyard:waiting-crew-after',
    title: '수리를 마친 대기 갑판원',
    speaker: '대기 갑판원',
    lines: [
      '마지막 선박이 출항했어! 도크 작업등은 켜 둘게. 이제 이 부두는 크레인 없이도 돌아가.',
      '크레인의 기름 압력 장치는 가져가. 네 로봇 팔이 저 병기를 우리 해안길 밖으로 돌게 만든 셈이니까.',
    ],
  }),
  GREENHOUSE_TECHNICIAN: conversation({
    id: 'greenhouse-plains:technician-briefing',
    title: '파열된 지열 설비 복구 요청',
    speaker: '온실 기술자',
    lines: [
      '땅속 열을 데우는 주 배관이 터져 온실 난방이 멈췄어. 배관에 달라붙은 기계가 물길을 뜯고 있고.',
      '안전한 약한 압력의 배관을 새로 잇면, 너무 세서 불안한 옛 동력로를 온실에서 떼어낼 수 있어.',
      '오른쪽 압력판에서 어디가 터졌는지와 복구 시간을 먼저 확인해 줘.',
    ],
  }),
  GREENHOUSE_WAITING: conversation({
    id: 'greenhouse-plains:waiting-grower',
    title: '모종을 지키는 재배원',
    speaker: '대기 재배원',
    lines: [
      '주 배관이 터진 채로 있어. 기술자는 약한 압력 얘기만 하지만, 난 땅속 열 배관이 다시 데워지는 걸 보고 싶어.',
      '네가 배관에 달라붙은 기계를 치우면 내가 먼저 들어가서 모종을 옮길게. 온도 재는 막대도 챙겼어.',
      '오른쪽 압력판은 봤어? 제때 끝내야 저 거대 병기가 뜨거워진 평원을 돌아간대.',
    ],
  }),
  GREENHOUSE_WORKING: conversation({
    id: 'greenhouse-plains:waiting-grower-working',
    title: '배관 앞에 선 대기 재배원',
    speaker: '대기 재배원',
    lines: [
      '통로가 열렸어. 재배등이 켜지면 내가 먼저 들어가서 모종을 옮길게.',
      '넌 동력로 쪽을 맡아줘. 배관에 달라붙은 기계가 또 물길을 노릴지도 몰라.',
    ],
  }),
  GREENHOUSE_AFTER: conversation({
    id: 'greenhouse-plains:waiting-grower-after',
    title: '복구를 마친 대기 재배원',
    speaker: '대기 재배원',
    lines: [
      '모종을 다 옮겼어! 재배등은 켜 둘게. 이제 이 온실은 약한 압력의 새 배관으로도 돌아가.',
      '옛 동력로는 가져가. 네 로봇 동력원이 저 병기를 우리 평원 밖으로 돌게 만든 셈이니까.',
    ],
  }),
  SNOW_CREW: conversation({
    id: 'snow-trade-road:crew-briefing',
    title: '막힌 옛 터널 개통 요청',
    speaker: '제설 열차 승무원',
    lines: [
      '눈사태가 옛 터널을 막아 장사꾼들이 다시 위험한 산길로 몰렸어. 바닥을 데우는 전선도 수거반이 뜯어 가고 있고.',
      '터널을 다시 열면 이 튼튼한 제설 열차는 더 이상 생활 노선을 지킬 필요가 없어.',
      '오른쪽 운행 현황판에서 눈이 쌓인 곳과 개통 시간을 먼저 확인해 줘.',
    ],
  }),
  SNOW_WAITING: conversation({
    id: 'snow-trade-road:waiting-keeper',
    title: '교역대를 기다리는 신호원',
    speaker: '대기 신호원',
    lines: [
      '터널이 막힌 채로 있어. 승무원은 바닥 전선 얘기만 하지만, 난 저 신호등이 다시 켜지는 걸 보고 싶어.',
      '네가 길목 수거반을 치우면 내가 먼저 들어가서 장사꾼들을 맞이할게. 휴대 신호등은 이미 챙겼어.',
      '오른쪽 현황판은 봤어? 제때 끝내야 저 거대 병기가 터널 바깥길을 돌아간대.',
    ],
  }),
  SNOW_WORKING: conversation({
    id: 'snow-trade-road:waiting-keeper-working',
    title: '터널 앞에 선 대기 신호원',
    speaker: '대기 신호원',
    lines: [
      '통로가 열렸어. 신호등이 켜지면 내가 먼저 들어가서 장사꾼들을 맞이할게.',
      '넌 열차를 잠시 빼 둔 선로 쪽을 맡아줘. 수거반이 또 바닥 전선을 노릴지도 몰라.',
    ],
  }),
  SNOW_AFTER: conversation({
    id: 'snow-trade-road:waiting-keeper-after',
    title: '개통을 마친 대기 신호원',
    speaker: '대기 신호원',
    lines: [
      '장사꾼들, 그러니까 교역대가 지나갔어! 신호등은 켜 둘게. 이제 이 터널은 바닥 전선으로 눈이 얼지 않아.',
      '제설 열차의 장갑판은 가져가. 네 로봇 장갑이 저 병기를 우리 교역로 밖으로 돌게 만든 셈이니까.',
    ],
  }),
  QUARRY_FOREMAN: conversation({
    id: 'red-quarry:worker-briefing',
    title: '마지막 채굴과 안전 폐쇄 요청',
    speaker: '채석공 작업반장',
    lines: [
      '왕국에 보낼 마지막 돌만 잘라 내면 이 붉은 채석장은 안전하게 닫을 수 있어. 그런데 수거 기계가 폭파 줄을 뜯고 큰 절단기를 깨웠지.',
      '무너짐을 막을 지지대를 세우면 초대형 암반 절단기는 더 이상 현장에 남을 이유가 없어.',
      '오른쪽 안전 작업판에서 남은 바위 벽과 필요한 시간을 먼저 확인해 줘.',
    ],
  }),
  QUARRY_WAITING: conversation({
    id: 'red-quarry:waiting-filler',
    title: '마지막 석재를 기다리는 채석공',
    speaker: '대기 채석공',
    lines: [
      '마지막 돌을 자를 곳이 남았어. 반장은 지지대 얘기만 하지만, 난 저 운반로에 마지막 돌이 실리는 걸 보고 싶어.',
      '네가 폭파 줄의 수거반을 치우면 내가 먼저 들어가서 바위 벽을 정리할게. 압축 드릴은 이미 챙겼어.',
      '오른쪽 안전 작업판은 봤어? 제때 끝내야 저 거대 병기가 채석장 절벽을 돌아간대.',
    ],
  }),
  QUARRY_WORKING: conversation({
    id: 'red-quarry:waiting-filler-working',
    title: '절개 갱도 앞에 선 대기 채석공',
    speaker: '대기 채석공',
    lines: [
      '통로가 열렸어. 폭파 신호등이 켜지면 내가 먼저 들어가서 바위 벽을 정리할게.',
      '넌 절단기 쪽을 맡아줘. 수거반이 또 폭파 줄을 노릴지도 몰라.',
    ],
  }),
  QUARRY_AFTER: conversation({
    id: 'red-quarry:waiting-filler-after',
    title: '폐쇄를 마친 대기 채석공',
    speaker: '대기 채석공',
    lines: [
      '마지막 돌도 운반로로 모두 보냈어! 신호등은 켜 둘게. 이제 이 채석장은 안전하게 닫아도 돼.',
      '큰 절단검은 가져가. 네 로봇 검이 저 병기를 우리 절벽 밖으로 돌게 만든 셈이니까.',
    ],
  }),
});

const conversations = Object.freeze(Object.values(SCRAP_REGION_CONVERSATION));
const conversationById = new Map(conversations.map((entry) => [entry.id, entry]));

export function resolveScrapRegionConversationTranscripts(viewedConversationIds) {
  if (!Array.isArray(viewedConversationIds)) return Object.freeze([]);
  return Object.freeze(
    viewedConversationIds
      .map((conversationId) => conversationById.get(conversationId))
      .filter(Boolean),
  );
}
