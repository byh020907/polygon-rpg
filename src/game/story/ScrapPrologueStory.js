import { SCRAP_CAST } from '../campaign/ScrapCastProfile.js';

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
    title: `${SCRAP_CAST.SCRAPYARD_OWNER.name}의 정식 수거 의뢰`,
    interactionId: 'scrapyard-owner-commission',
    speaker: SCRAP_CAST.SCRAPYARD_OWNER.name,
    lines: [
      '둘 다 정식 견습생이 됐으니 첫 공동 의뢰다. 외곽 폐병기의 동력 표식만 확인하고 와.',
      '먼저 찾은 부품은 먼저 기록한다. 경쟁은 하되 안전 지지대부터 확인해.',
      '나는 퇴직했는데 또 야근이군. 사고 없이 돌아오면 그걸로 됐다.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_DEPARTURE,
    title: `${SCRAP_CAST.RIVAL.name}과 현장 출발`,
    interactionId: 'scrap-rival-departure',
    speaker: SCRAP_CAST.RIVAL.name,
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
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '이 지지대, 수거 표식보다 훨씬 오래됐어. 안쪽 회수팔이 아직 움직여.',
      '나는 위쪽 cable을 볼게. 넌 흉곽 아래 통로가 버티는지 확인해 줘.',
      '잠깐, 회수팔이 내 갈고리를— 잡혔어!',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
    title: `잔해 아래 ${SCRAP_CAST.RIVAL.name}의 구조 요청`,
    interactionId: 'scrap-rival-rescue-request',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '나 여기 있어. 회수팔이 갈고리를 잡고 안쪽으로 끌고 가고 있어.',
      '팔의 관절은 저 흉곽 장치에 바로 물려 있어. 그걸 빼야 멈출 거야.',
      '하지만 떼면 폐병기 비상 회로가 깨어날 수도 있어.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
    title: `${SCRAP_CAST.PROTAGONIST.name}의 구조 선택`,
    interactionId: 'scrap-player-device-decision',
    speaker: SCRAP_CAST.PROTAGONIST.monologueName,
    lines: [
      `이 제어핵을 빼면 회수팔을 멈추고 ${SCRAP_CAST.RIVAL.name}을 꺼낼 수 있다.`,
      '폐병기 비상 운용이 깨어날 위험은 있다. 그래도 사람을 두고 다른 방법을 찾을 시간은 없어.',
      '먼저 구한다. 무슨 일이 깨어나든 그다음에 내가 책임진다.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_ANALYSIS,
    title: '제어핵 분석과 차고 개방',
    interactionId: 'scrapyard-owner-analysis',
    speaker: SCRAP_CAST.SCRAPYARD_OWNER.name,
    lines: [
      '퇴직했는데 또 야근이라니. 둘이 무사한 건 잘했다. 그 장치부터 작업대에 올려 봐.',
      '이건 위치를 보내지 않는 수동 제어핵이야. 저 병기는 오래된 중앙 지휘소 좌표를 따라 왕도로 가고 있어.',
      '동원 신호를 받은 생활 기계들의 군수 인장을 풀고, 제어핵을 돌려놓을 대항 병기를 먼저 완성해야 한다.',
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
