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
  YARD_BRACE: 'scrap-prologue:yard-brace',
  YARD_SURVEY: 'scrap-prologue:yard-survey',
  YARD_PLATE: 'scrap-prologue:yard-plate',
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
      '둘 다 정식 견습생이 됐으니 첫 공동 의뢰다. 고물상 아래 지하 유적의 남은 전원 신호를 조사하고 와.',
      '먼저 찾은 부품은 먼저 기록한다. 경쟁은 하되 오래된 발판과 지지 케이블부터 확인해.',
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
      '그래도 혼자 지하 유적으로 들어가진 말자. 네 방패가 앞, 내 갈고리가 뒤다.',
      '오른쪽 입구로 내려가자. 상층 분류 데크에서 깊은 곳으로 이어지는 길부터 찾는 거야.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.YARD_BRACE,
    title: '상층 교량 지지 케이블',
    interactionId: 'scrap-rival-yard-brace',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '상층 다리가 접혀 있어. 저 케이블 수거 유닛이 지지선을 계속 감아 당기는 것 같아.',
      '저 유닛 하나만 멈추면 다리를 내려 흉곽 경사로까지 갈 수 있겠어.',
      '내가 케이블을 볼 테니 네가 길을 열어. 이 싸움은 지나갈 길을 만드는 거야.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SURVEY,
    title: '열린 다리와 하층 귀환로',
    interactionId: 'scrap-rival-yard-survey',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '수거 유닛이 멈추자 다리가 내려왔어. 이제 상층을 건너 흉곽 경사로로 갈 수 있어.',
      '아래를 봐. 고물상 쪽으로 이어지는 하층 정비 레일도 남아 있어. 돌아올 길로 쓸 수 있겠어.',
      '정비로 위치를 기억해 두고 앞으로 가자. 저 오래된 흉갑 아래에서 신호가 올라와.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.YARD_PLATE,
    title: '고대 지지판과 제어 연결',
    interactionId: 'scrap-rival-yard-plate',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '이 흉갑 지지판은 상층 분류 설비보다 훨씬 오래됐어. 그대로 아래 제어실까지 이어져 있어.',
      '판 안쪽의 청록 케이블이 회수팔 쪽으로 연결돼. 중앙 장치가 아직 전원을 보내는 것 같아.',
      '내가 지지판을 잡을게. 넌 경사로를 따라 안쪽 연결부를 조사해 줘.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.YARD_SEARCH,
    title: '회수팔과 제어핵 조사',
    interactionId: 'scrap-rival-yard-search',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '케이블이 벽 안쪽 회수팔과 중앙의 청록 제어핵까지 직접 이어져 있어.',
      '나는 위쪽 연결 줄을 볼게. 넌 아래 제어실로 이어지는 발판이 버티는지 확인해 줘.',
      '잠깐, 회수팔이 내 갈고리를 잡았어— 발판도 무너진다!',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.RIVAL_RESCUE,
    title: `하층 제어실의 ${SCRAP_CAST.RIVAL.name} 구조 요청`,
    interactionId: 'scrap-rival-rescue-request',
    speaker: SCRAP_CAST.RIVAL.name,
    lines: [
      '나 여기 있어. 회수팔이 갈고리를 잡고 하층 제어실 안쪽으로 끌고 가고 있어.',
      '회수팔은 저 청록 제어핵에 바로 연결돼 있어. 핵을 빼야 나를 놓을 거야.',
      '하지만 제어핵을 빼면 잠들어 있던 고대 병기가 깨어날 수도 있어.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.PLAYER_DECISION,
    title: `${SCRAP_CAST.PROTAGONIST.name}의 구조 선택`,
    interactionId: 'scrap-player-device-decision',
    speaker: SCRAP_CAST.PROTAGONIST.monologueName,
    lines: [
      `이 제어핵이 회수팔에 직접 전원을 보낸다. 빼면 ${SCRAP_CAST.RIVAL.name}을 꺼낼 수 있다.`,
      '이걸 빼면 고대 병기가 깨어날 수도 있다. 그래도 사람을 두고 다른 방법을 찾을 시간은 없어.',
      '먼저 구한다. 무슨 일이 깨어나든 그다음에 내가 책임진다.',
    ],
  }),
  conversation({
    id: SCRAP_PROLOGUE_CONVERSATION_ID.OWNER_ANALYSIS,
    title: '제어핵 분석과 차고 개방',
    interactionId: 'scrapyard-owner-analysis',
    speaker: SCRAP_CAST.SCRAPYARD_OWNER.name,
    lines: [
      '하층 정비로를 찾아 돌아온 건 잘했다. 둘 다 무사하니 그 제어핵부터 작업대에 올려 봐.',
      '이 제어핵은 회수팔을 움직이던 장치야. 스스로 위치를 보내진 못해. 저 병기는 "중앙 지휘소", 옛 본부의 위치를 따라 왕도로 가고 있어.',
      '저 병기가 낸 신호 때문에 생활 기계가 군수 인장, 전쟁 때 쓰던 잠금에 걸렸어. 하나씩 멈추고 제어핵을 돌려놓아야 해.',
      'D-30 안에 움직일 우리 로봇을 만들자. 벽 지도를 켜고 차고문부터 열어.',
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
