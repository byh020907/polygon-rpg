function conversation({ id, title, interactionId, speaker, lines }) {
  return Object.freeze({
    id,
    title,
    interactionId,
    speaker,
    lines: Object.freeze([...lines]),
  });
}

export const SCRAP_PROLOGUE_CONVERSATION_ID = Object.freeze({
  OWNER_COMMISSION: 'scrap-prologue:owner-commission',
  RIVAL_DEPARTURE: 'scrap-prologue:rival-departure',
  YARD_SEARCH: 'scrap-prologue:yard-search',
  RIVAL_RESCUE: 'scrap-prologue:rival-rescue',
  PLAYER_DECISION: 'scrap-prologue:player-decision',
  OWNER_ANALYSIS: 'scrapyard-owner-analysis',
});

const SCRAP_PROLOGUE_CONVERSATIONS = Object.freeze([
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_COMMISSION,
    title: '고물상 주인의 정식 수거 의뢰',
    interactionId: 'scrapyard-owner-commission',
    speaker: '고물상 주인',
    lines: [
      '둘 다 정식 견습생이 됐으니 첫 공동 의뢰다. 외곽 폐병기의 동력 표식만 확인하고 와.',
      '먼저 찾은 부품은 먼저 기록한다. 경쟁은 하되 안전 지지대부터 확인해.',
      '나는 퇴직했는데 또 야근이군. 사고 없이 돌아오면 그걸로 됐다.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_DEPARTURE,
    title: '라이벌 하린과 현장 출발',
    interactionId: 'scrap-rival-departure',
    speaker: '하린',
    lines: [
      '공동 의뢰라도 좋은 부품은 먼저 표시한 사람이 가져가는 거다. 이번엔 내가 앞설게.',
      '그래도 혼자 폐병기 안으로 들어가진 말자. 네 방패가 앞, 내 갈고리가 뒤다.',
      '오른쪽 수거 표식까지 같이 가자. 이동하면서 작은 수거 유닛은 기본기로 정리하고.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SEARCH,
    title: '폐병기 내부 안전 조사',
    interactionId: 'scrap-rival-yard-search',
    speaker: '하린',
    lines: [
      '이 지지대, 수거 표식보다 훨씬 오래됐어. 안쪽 winch 전원도 끊겨 있네.',
      '나는 위쪽 cable을 볼게. 넌 흉곽 아래 통로가 버티는지 확인해 줘.',
      '잠깐, 발밑 판금이— 뒤로 물러나!',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
    title: '잔해 아래 하린의 구조 요청',
    interactionId: 'scrap-rival-rescue-request',
    speaker: '하린',
    lines: [
      '나 여기 있어. 다리는 움직이는데 잔해가 허리 위를 눌렀어.',
      '구조 winch가 바로 위야. 전원만 들어오면 cable로 이 판을 들 수 있어.',
      '맞는 출력이 저 흉곽의 청록 장치뿐이야. 하지만 떼면 폐병기 회로가 깨어날 수도 있어.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
    title: '주인공의 구조 선택',
    interactionId: 'scrap-player-device-decision',
    speaker: '주인공 (독백)',
    lines: [
      '이 장치를 winch에 연결하면 하린을 꺼낼 수 있다.',
      '폐병기 신호가 살아날 위험은 있다. 그래도 사람을 두고 다른 전원을 찾으러 갈 시간은 없어.',
      '먼저 구한다. 무슨 일이 깨어나든 그다음에 내가 책임진다.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_ANALYSIS,
    title: '제어장치 분석과 차고 개방',
    interactionId: 'scrapyard-owner-analysis',
    speaker: '고물상 주인',
    lines: [
      '퇴직했는데 또 야근이라니. 둘이 무사한 건 잘했다. 그 장치부터 작업대에 올려 봐.',
      '이건 왕국 전역 기계 신호를 읽는 제어 두뇌야. 너희가 깨운 놈보다 먼저 부품을 모아야 한다.',
      '벽 지도를 켜고 차고문도 열자. 사고를 냈으면 끝까지 수습하는 게 우리 일이다.',
    ],
  }),
]);

const CONVERSATION_BY_ID = new Map(SCRAP_PROLOGUE_CONVERSATIONS.map((entry) => [entry.id, entry]));

export function resolveScrapPrologueConversationTranscripts(viewedConversationIds) {
  if (!Array.isArray(viewedConversationIds)) return Object.freeze([]);
  return Object.freeze(
    viewedConversationIds
      .map((conversationId) => CONVERSATION_BY_ID.get(conversationId))
      .filter(Boolean),
  );
}
