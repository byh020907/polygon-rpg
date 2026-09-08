const entry = (id, label, selector, scenario, presentation = 'game', notes = '') =>
  Object.freeze({
    id: `ui/${id}`,
    label,
    category: 'ui',
    kind: 'ui',
    source: 'index.html · gameShell.js · style.css',
    selector,
    scenario,
    presentation,
    notes,
    actions: Object.freeze([
      Object.freeze({ id: 'static', label: '현재 컴포넌트', frameCount: 1 }),
    ]),
  });

// These are selectors into the production page, never copied markup or canvas approximations.
export const GAME_UI_RESOURCES = Object.freeze([
  entry(
    'menu',
    '메인 메뉴 · 버전 / 저장 / PWA',
    '.menu-screen',
    'scrap-intro-walk',
    'menu',
    'PWA 상태는 실제 브라우저의 현재 상태입니다.',
  ),
  entry('menu-world', '메뉴 배경 · 달 / 산 / 광산', '.menu-world', 'scrap-intro-walk', 'menu'),
  entry('hud', '체력 · 스태미나 · 통화', '.game-hud-overlay', 'scrap-intro-walk'),
  entry(
    'campaign-clock',
    '날짜 · D-DAY · 지역명',
    '.hud-item-counter, .game-area-label',
    'scrap-garage-0',
  ),
  entry('objective', '현재 목표와 조작 안내', '.story-briefing', 'scrap-intro-walk'),
  entry('dialogue', '현장 대사 말풍선', '.dialogue-bubble', 'scrap-dialogue-review'),
  entry('workshop', '고물상 · 제작 / 장착 / 인챈트 / 수련', '.dialogue-bubble', 'scrap-workshop'),
  entry(
    'operation-map',
    '작전 지도 · 연결 이슈 · 조립',
    '.operation-map-backdrop',
    'scrap-issue-window',
    'map',
  ),
  entry(
    'action-preview',
    '이동 · 사건 확정과 시간 비교',
    '.campaign-action-backdrop',
    'scrap-garage-0',
    'action',
  ),
  entry('deadline', '고대 병기 D-30 경보', '.scrap-awakening-deadline', 'scrap-intro-d30'),
  entry('garage', '차고 개방 · 조립 안내', '.scrap-garage-reveal', 'scrap-garage-opened'),
  entry('game-over', '게임오버 · 복구 지점', '.scrap-game-over-backdrop', 'scrap-game-over'),
  entry(
    'recovery',
    '저장된 작전 기록 · 복구 선택',
    '.scrap-game-over-backdrop',
    'scrap-recovery-review',
  ),
  entry('encounter', '전투 상태와 적 체력', '.encounter-readout', 'scrap-intro-brace'),
  entry('growth', '장비와 command 성장', '.growth-panel', 'scrap-garage-0'),
  entry('touch', '모바일 이동 · 전투 버튼', '.mobile-controls', 'scrap-intro-walk', 'touch'),
  Object.freeze({
    ...entry(
      'help',
      '데스크톱 조작 도움말',
      '.control-hints',
      'scrap-intro-walk',
      'game',
      '데스크톱 전용입니다. 모바일에서는 이동·전투 버튼의 안내를 사용합니다.',
    ),
    viewports: Object.freeze(['desktop']),
  }),
  entry(
    'orientation',
    '모바일 방향 안내',
    '.mobile-landscape-hint',
    'scrap-intro-walk',
    'orientation',
  ),
  entry('debug', '디버그 설정 패널', '.debug-panel-backdrop', 'scrap-garage-0', 'debug'),
]);

export const APP_IMAGE_RESOURCES = Object.freeze(
  [192, 512, 'maskable-512'].map((size) =>
    Object.freeze({
      id: `ui/icon-${size}`,
      label: `앱 아이콘 · ${size}`,
      category: 'ui',
      kind: 'image',
      source: `public/icons/icon-${size}.png`,
      imageUrl: `./public/icons/icon-${size}.png`,
      actions: Object.freeze([Object.freeze({ id: 'static', label: '원본 PNG', frameCount: 1 })]),
    }),
  ),
);

export function readUiReviewResource(search) {
  const query = new URLSearchParams(search);
  if (query.get('visualQa') !== '1') return null;
  return GAME_UI_RESOURCES.find((item) => item.id === query.get('uiReview')) ?? null;
}

export function buildUiReviewUrl(href, resource, view = 'isolated') {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('visualQa', '1');
  url.searchParams.set('gameStart', resource.scenario);
  url.searchParams.set('uiReview', resource.id);
  url.searchParams.set('uiReviewView', view);
  return url.href;
}

export async function isolateUiReview(
  resource,
  { view = 'isolated', document: doc = globalThis.document } = {},
) {
  for (const type of ['click', 'touchend', 'submit'])
    doc.addEventListener(
      type,
      (event) => {
        if (event.target.closest('button, a, form')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  let targets = [...doc.querySelectorAll(resource.selector)];
  doc.documentElement.dataset.uiReview = resource.id;
  doc.documentElement.dataset.uiReviewView = view;
  if (view === 'isolated' && targets.length) {
    // Keep the original DOM hierarchy, inherited styling, Alpine bindings and layout.
    doc.getElementById('app').classList.add('ui-review-isolation');
    for (const target of targets) target.classList.add('ui-review-target');
  }
  let visible = false;
  // Poll layout rather than awaiting paint: browsers suspend animation frames
  // for offscreen thumbnail/preview iframes even though their DOM is ready.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    targets = [...doc.querySelectorAll(resource.selector)];
    if (view === 'isolated') {
      doc.getElementById('app').classList.add('ui-review-isolation');
      for (const target of targets) target.classList.add('ui-review-target');
    }
    visible = targets.some(
      (target) => target.getClientRects().length > 0 && getComputedStyle(target).display !== 'none',
    );
    if (visible) break;
  }
  doc.documentElement.dataset.uiReviewReady = 'true';
  doc.documentElement.dataset.uiReviewVisible = String(visible);
  return Object.freeze({ id: resource.id, visible, count: targets.length });
}
