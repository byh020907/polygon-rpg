import * as ProductionContract from './art-production-contract.mjs';
import prettier from 'prettier';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createGraphicsResourceCatalog,
  GRAPHICS_CATEGORIES,
} from '../src/graphics/GraphicsResourceCatalog.js';
import { GAME_UI_RESOURCES, APP_IMAGE_RESOURCES } from '../src/ui/GameUiCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE as campaign } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { SCRAP_AWAKENING_MAP as map } from '../src/game/maps/scrapAwakening.js';
import {
  SCRAP_AWAKENING_STAGE_IDS,
  getScrapAwakeningPresentation,
} from '../src/game/campaign/ScrapAwakeningState.js';
import {
  SCRAP_GARAGE_REVEAL_STAGE_IDS,
  getScrapGarageRevealPresentation,
} from '../src/game/campaign/ScrapGarageRevealState.js';
import {
  SCRAP_FINAL_BATTLE_STAGE,
  getScrapFinalBattlePresentation,
} from '../src/game/campaign/ScrapFinalBattleState.js';
import {
  SCRAP_PROLOGUE_CONVERSATION_ID,
  resolveScrapPrologueConversationTranscripts,
} from '../src/game/story/ScrapPrologueStory.js';
import { SCRAP_REGION_CONVERSATION } from '../src/game/story/ScrapRegionStory.js';
import { ENCOUNTER_PROFILES } from '../src/game/encounter/EncounterProfiles.js';
import {
  CAST_BRIEFS,
  actorFor,
  REGION_BRIEFS,
  CATEGORY_ROLES,
  OPEN_DECISIONS,
} from './art-handoff-content.mjs';

const root = path.resolve(import.meta.dirname, '..'),
  out = path.join(root, 'docs/art-handoff');
const resources = createGraphicsResourceCatalog({
  additionalResources: [...GAME_UI_RESOURCES, ...APP_IMAGE_RESOURCES],
}).resources;
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const link = (href, label) => `<a href="${esc(href)}">${esc(label)}</a>`;
const table = (headers, rows) =>
  `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((cells) => `<tr>${cells.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const section = (title, body, id = '') =>
  `<section${id ? ` id="${esc(id)}"` : ''}><h2>${esc(title)}</h2>${body}</section>`;
const p = (text) => `<p>${esc(text)}</p>`;
const files = new Map();
const pageOf = new Map();
for (const category of GRAPHICS_CATEGORIES) {
  const entries = resources.filter((r) => r.category === category.id);
  entries.forEach((r, i) =>
    pageOf.set(
      r.id,
      `resources/${category.id}-${Math.floor(i / 30) + 1}.html#${encodeURIComponent(r.id)}`,
    ),
  );
}
const recordOf = (r) => ({
  id: r.id,
  label: r.label,
  category: r.category,
  producer: r.producer,
  kind: r.kind,
  regionId: r.regionId ?? null,
  roomId: r.roomId ?? null,
  actorId: actorFor(r)?.id ?? null,
  source: r.source,
  notes: r.notes ?? '',
  actions: r.actions ?? [],
  itemIds: r.itemIds ?? [],
  page: pageOf.get(r.id),
});
const records = resources.map(recordOf);
const fingerprint = crypto
  .createHash('sha256')
  .update(
    JSON.stringify({
      records,
      productionContract: ProductionContract,
      productGoal: fs.readFileSync(path.join(root, 'PRODUCT_GOAL.html'), 'utf8'),
      architecture: fs.readFileSync(path.join(root, 'ARCHITECTURE.md'), 'utf8'),
      campaign,
      regions: REGION_BRIEFS,
      prologue: resolveScrapPrologueConversationTranscripts(
        Object.values(SCRAP_PROLOGUE_CONVERSATION_ID),
      ),
      regionConversations: SCRAP_REGION_CONVERSATION,
      awakening: SCRAP_AWAKENING_STAGE_IDS.map(getScrapAwakeningPresentation),
      garage: SCRAP_GARAGE_REVEAL_STAGE_IDS.map(getScrapGarageRevealPresentation),
      finale: Object.values(SCRAP_FINAL_BATTLE_STAGE).map(getScrapFinalBattlePresentation),
      cast: CAST_BRIEFS,
      decisions: OPEN_DECISIONS,
    }),
  )
  .digest('hex')
  .slice(0, 12);
function document(file, title, subtitle, body) {
  const depth = file.split('/').length - 1,
    base = '../'.repeat(depth),
    repo = '../'.repeat(depth + 2);
  files.set(
    file,
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} · Polygon RPG 제작 요청</title><link rel="stylesheet" href="${base}handbook.css"></head><body><header class="masthead"><a href="${base}index.html">POLYGON RPG / GRAPHICS HANDOFF</a><nav>${link(repo + 'PRODUCT_GOAL.html', 'Product Goal')}${link(base + 'asset-contract.html', '제작 계약')}${link(base + 'characters.html', '인물')}${link(base + 'enemies.html', '몹')}${link(base + 'scenarios/index.html', '시나리오')}${link(base + 'resources/index.html', '전체 목록')}${link(base + 'request.html', '요청서')}</nav></header><main><header class="page-title"><p class="eyebrow">그래픽 담당자 전달 자료 · 기준 ${fingerprint}</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header><aside class="notice">제품 기준은 ${link(repo + 'PRODUCT_GOAL.html', 'Product Goal')}입니다. 이 문서는 확정된 제작 계약과 현재 작성된 자료를 구분합니다. 승인 reference가 형태·구도·주요 pose의 기준이며 현재 코드가 그 승인을 대신하지 않습니다. <strong>등록됨 ≠ 디자인 승인·구현 완료</strong>. ${link(base + 'decisions.html', '미정·충돌 확인')}을 함께 읽으세요.</aside>${body}</main><footer>필요한 인물·지역 문서만 전달하세요. 계약 해설 원본: <code>scripts/art-production-contract.mjs</code> · 자동 목록 갱신: <code>npm run docs:art</code> · ${link(repo + 'scripts/art-handoff-content.mjs', '요청 해설 원본')} · ${link(repo + 'scripts/generate-art-handoff.mjs', '생성기')}</footer></body></html>\n`,
  );
}
const preview = (r, depth = 0) =>
  link(
    '../'.repeat(depth + 2) +
      `?graphicsReview=1&reviewCategory=${encodeURIComponent(r.category)}&resource=${encodeURIComponent(r.id)}`,
    '게임 검토실',
  );
const ref = (r, depth = 0) => link('../'.repeat(depth) + pageOf.get(r.id), r.label);
const pg = (id, depth = 0) => link('../'.repeat(depth + 2) + 'PRODUCT_GOAL.html#' + id, id);
const source = (file, depth = 0) =>
  String(file)
    .split(' · ')
    .map((part) => {
      const filePath =
        { 'gameShell.js': 'src/ui/gameShell.js', 'style.css': 'src/style.css' }[part] ?? part;
      return fs.existsSync(path.join(root, filePath))
        ? link('../'.repeat(depth + 2) + filePath, part)
        : esc(part);
    })
    .join(' · ');
const scenario = (region, depth = 0) =>
  link(
    '../'.repeat(depth) + `scenarios/${region === 'scrap-waste-edge' ? 'prologue' : region}.html`,
    map.regions.find((r) => r.id === region)?.label ?? region,
  );
const sceneResources = (region, depth = 1) =>
  list(
    resources
      .filter((r) => r.regionId === region && r.kind === 'scene')
      .map((r) => `${ref(r, depth)} · ${preview(r, depth)}`),
  );
const characterLinks = (region, depth = 1) =>
  list(
    CAST_BRIEFS.filter(
      (a) =>
        a.id === 'protagonist' ||
        a.id === 'rival' ||
        resources.some((r) => r.regionId === region && actorFor(r)?.id === a.id),
    ).map((a) => link('../'.repeat(depth) + 'characters.html#' + a.id, a.name)),
  );

// Entry is intentionally short; raw inventories are optional linked pages.
document(
  'index.html',
  '그래픽 제작 요청 안내',
  '인물의 역할과 이야기의 인과를 먼저 읽고, 제작할 묶음의 원본 ID를 골라 요청합니다.',
  section(
    '담당자에게 전달할 순서',
    `<ol><li>${link('art-direction.html', '공통 아트 기준')}와 ${link('asset-contract.html', 'Master SVG 제작 계약')} — 실제 제작 reference와 원본</li><li>${link('characters.html', '인물·NPC 역할표')} 또는 ${link('enemies.html', '몹·Boss 역할표')} — 같은 사람의 상태 변형과 별도 디자인 구분</li><li>${link('scenarios/index.html', '전체 이야기 개요')} → 담당 ${link('scenarios/prologue.html', '도입')} / 지역 한 편 — 장소·등장인물·필요 그래픽</li><li>${link('request.html', '요청서 양식')}에 대상과 상태를 복사하고 ${link('decisions.html', '미정 사항')}을 남깁니다.</li></ol>`,
  ) +
    section(
      '목록의 수를 제작 건수로 해석하지 않기',
      p(
        `현재 검토실은 ${resources.length}개 항목입니다. NPC 분류 ${resources.filter((r) => r.category === 'npc').length}개에는 조립 묶음 ${resources.filter((r) => r.id.startsWith('npc:')).length}개와 몸/도구 조각이 함께 들어갑니다. 아래 인물표는 이를 ${CAST_BRIEFS.length - 1}개 NPC 역할 묶음과 주인공 1개로 정리합니다. 갇힌 작업자 묶음은 한 명으로 확정한 것이 아닙니다.`,
      ) +
        table(
          ['자료', '무엇을 요청하는가', '읽을 범위'],
          [
            [
              link('characters.html', '인물·NPC'),
              '고유 인물 디자인 + 전/중/후 변형 + 동작 제안',
              '인물 하나와 등장 지역',
            ],
            [
              link('enemies.html', '21개 현재 적 + 4개 유형 견본'),
              '실전 적과 검토용 템플릿을 구별',
              '유형/부품 재사용과 공격 준비',
            ],
            [
              link('world.html', '환경·기계·VFX·UI'),
              '장소·기계 전체 묶음과 작동/분리/복구 상태',
              '담당 지역 한 편',
            ],
            [
              link('resources/index.html', '전체 592개 원본 목록'),
              '기존 stable ID·원본·상태·검토 링크',
              '필요한 분류의 최대 30행 페이지',
            ],
            [
              link('scenarios/index.html', '전체 시나리오'),
              '도입→자유 순서의 5지역→결전/후일담·실패',
              '개요 + 작업할 지역 한 편',
            ],
          ],
        ),
    ) +
    section(
      '요청 우선순위',
      link('reference-approval.html', '5단계 reference 제작·승인 순서') +
        p(
          'Hero/Rival/Owner → Control Core/Retrieval Arm → Ancient Machine Awakening → Garage 0% → 실제 gameplay-scale prologue composite를 먼저 제작·승인합니다. 이 기준 장면을 승인한 뒤 enemy archetype → 폐광↔항구 → 나머지 지역으로 확장합니다. 계약 확정은 reference나 runtime 구현 완료의 승인이 아닙니다.',
        ),
    ),
);

document(
  'art-direction.html',
  '공통 아트 기준',
  '작은 캐릭터와 넓은 세계 · 안정된 reference sheet · 생활형 산업 왕국.',
  section(
    '모든 요청에 붙일 기준',
    table(
      ['항목', '작업 지침'],
      ProductionContract.ART_DIRECTION_ROWS.map((row) => row.map(esc)),
    ),
  ) +
    section(
      '지역 Color Identity',
      table(
        ['지역', '색상 방향', '재질/표면', '생활·형태'],
        campaign.regions.map((r) => [
          scenario(r.id),
          ...ProductionContract.REGIONAL_IDENTITY[r.id].map(esc),
        ]),
      ) +
        p(
          '전체 저채도는 유지하지만 미세한 색온도 차이만으로 구분하지 않습니다. 스크린샷만 보고 지역을 알아야 합니다. 이 색상 방향을 기준으로 reference에서 최종 swatch를 검토하며 색만 바꾼 공용 맵으로 대체하지 않습니다.',
        ),
    ) +
    section(
      '작업별 세부 계약',
      list([
        link('asset-contract.html', 'Master SVG·면·재질·그림자'),
        link('environment-authoring.html', '환경 Hybrid·Composition·XYZ·LOD'),
        link('character-animation.html', 'Rig Family·key pose·retarget·접촉'),
        link('reference-approval.html', '도입 reference 승인 순서'),
      ]),
    ) +
    section(
      '보존된 이전 참고 PNG',
      p(
        '아래는 과거 공유 원본을 변경 없이 보관한 PNG입니다. 신규 기본 납품인 master SVG나 이번 reference sheet 승인본으로 오인하지 않습니다.',
      ) +
        '<div class="reference-grid"><figure><img src="../references/enemy-archetypes/hero-style-reference.png" alt="보존된 주인공 참고 PNG"><figcaption>기존 주인공 동작 방향 보존용 참고. 신규 SVG 원본/승인 상태와 구별.</figcaption></figure><figure><img src="../references/enemy-archetypes/enemy-archetypes-reference.png" alt="보존된 몹 참고 PNG"><figcaption>기존 유형 실루엣 참고. 신규 몹 디자인 승인이 아님.</figcaption></figure></div>' +
        link('../references/enemy-archetypes/README.md', '원본 출처'),
    ),
);

document(
  'asset-contract.html',
  'Master SVG · 면 · 재질 · 그림자',
  '형태/구조/재질은 그래픽 담당자, 현재 광원에서의 밝기는 엔진이 담당합니다.',
  section(
    '원본과 export',
    table(
      ['계약', '제작 기준'],
      ProductionContract.SVG_ROWS.map((row) => row.map(esc)),
    ),
  ) +
    section(
      '작가와 엔진의 경계',
      table(
        ['그래픽 담당자', '엔진/게임'],
        [
          [
            '어디서 면이 꺾이는지, 면의 재질, 구조적으로 가려지는 부분. 파츠·joint/pivot·state anchor·local depth.',
            '합성된 surface normal + 현재 light + material + structural occlusion → 3~4단계 cell shading. gameplay 위치·attack envelope·invulnerability는 별도 게임 authority.',
          ],
        ],
      ),
    ) +
    section(
      'Hybrid Shadow Authority',
      table(
        ['shadow 종류', '대상 예', '요청 자료'],
        ProductionContract.SHADOW_ROWS.map((row) => row.map(esc)),
      ),
    ) +
    section(
      '자료 묶음',
      p(
        'asset.master.svg와 의미 그룹/피벗/상태 설명을 주 원본으로 전달합니다. far/mid/near SVG와 PNG 미리보기는 export/검토 출력입니다. pose replacement도 원본·부위·anchor의 연결을 명시합니다. 등록됨, reference 승인됨, export 검증됨, runtime 검증됨을 따로 기록합니다.',
      ) +
        link('request.html', '요청 양식') +
        ' · ' +
        link(
          'https://github.com/byh020907/polygon-rpg/blob/main/ARCHITECTURE.md',
          'ARCHITECTURE.md · 기술 계약',
        ),
    ),
);

document(
  'environment-authoring.html',
  '환경 제작 · Composition · XYZ · LOD',
  '주요 화면은 승인된 Composition 또는 Prefab을 기준으로 조립합니다.',
  section(
    '환경 Hybrid 제작 단위',
    table(
      ['단위', '역할', '예/제약'],
      ProductionContract.ENVIRONMENT_ROWS.map((row) => row.map(esc)),
    ),
  ) +
    section(
      'Composition 경계와 연결',
      p(
        'Composition은 작가가 승인한 장면 전체 배치 데이터입니다. 예를 들면 항구 입구+먼 크레인, 컨테이너 작업구역, 쌍둥이 크레인 접근, 크레인 Boss, 해결 후 부두처럼 시각적 목적/사건으로 나눕니다. 화면 2개라는 길이 제한을 두지 않습니다. additive/overlap으로 연속 이동하며 필요한 단위를 preload/unload합니다. 예시는 새 사건 확정이나 구현 완료 목록이 아닙니다.',
      ),
    ) +
    section(
      'Scene object의 속성',
      table(
        ['속성', '의미와 제작 지침'],
        [
          [
            'transform x/y/z',
            '월드 좌우 / 월드 높이 / 시각 앞뒤 깊이. 기본 gameplay는 side-view X/Y. SVG·bone local과 world 좌표를 혼용하지 않습니다.',
          ],
          [
            'role / tags / state',
            'landmark·prop·interactive 등 의미와 상태. Far/Mid/Foreground를 고정 엔진 렌더 레이어로 만들지 않습니다.',
          ],
          [
            'scale / parallaxScale',
            '기본 2D 구도에서 깊은 z는 더 작은 기본 parallax. z로 크기를 강제 변경하지 않고 필요한 scale/parallax override로 승인 구도를 맞춥니다.',
          ],
          [
            'renderBias',
            '같은 깊이에서 미세 draw order 보정. 가짜 4.0001/4.0002 z로 정렬하지 않습니다.',
          ],
        ],
      ),
    ) +
    section(
      '같은 랜드마크, 여러 presentation',
      p(
        'TwinCrane의 world identity는 하나입니다. Composition마다 새 크레인을 만들지 않고 far/mid/near presentation을 선택합니다. far 실루엣 보정·mid 주요 기구·near 세부/interaction은 하나의 master에서 export합니다. 기본 선택은 world distance 하나보다 실제 screen occupancy이며 presentationOverride/presentationBias로 연출을 보정합니다. hysteresis/margin으로 경계 깜빡임을 막고 overlap/preload/unload에서도 동일성과 상태를 보존합니다.',
      ),
    ) +
    section(
      '공유와 지역화',
      table(
        ['GLOBAL KIT', 'REGIONAL MATERIAL PROFILE', 'REGIONAL SHAPE'],
        [
          [
            'pipe/crate/railing처럼 평범한 구조 공유',
            '지역 색·재질·마모: 항구 painted steel/salt wear/blue gray/thick cable, 온실 brass/condensation/green patina/pressure hardware',
            '쌍둥이 크레인·지열 동력로·제설 열차 등의 기억할 형태는 고유 제작',
          ],
        ],
      ),
    ) +
    section(
      '검수할 composite',
      p(
        '길·중요 상호작용 주변 clean read, detail cluster, negative space, 일반 전투 줌인 없음, 지역별 색/형태 구분과 같은 landmark의 원경→근경 연속성을 실제 1280×720 및 mobile에서 검수합니다.',
      ) + link('world.html', '기존 지역/기계 역할 목록'),
    ),
);

document(
  'character-animation.html',
  '인물 체형 · Rig Family · 중요 액션',
  '같은 관절 언어를 쓰되 같은 몸을 쓰지 않습니다. 중요한 pose는 승인 reference가 기준입니다.',
  section(
    '캐릭터/애니메이션 계약',
    table(
      ['영역', '제작 기준'],
      ProductionContract.CHARACTER_ROWS.map((row) => row.map(esc)),
    ),
  ) +
    section(
      'Humanoid SVG 그룹 예',
      p(
        '아래 이름은 부위 의미의 예입니다. joint/pivot/anchor와 연결하고, machine은 실제 기계 구조에 맞는 이름을 사용합니다.',
      ) +
        '<pre>' +
        esc(ProductionContract.SVG_CHARACTER_GROUPS.join(' / ')) +
        '</pre>',
    ) +
    section(
      '주인공 key pose 검수',
      table(
        ['동작', '연결해서 볼 모습'],
        [
          [
            'Basic / Strong',
            '작은 타원 머리·약 7등신·긴 가는 팔다리·짧은 작업복·cross strap·넓은 검/방패. 몸 옆 낮은 당김 → 골반/흉곽 선행 → 팔 추종 → 빠른 횡/사선 CONTACT → FOLLOW의 follow-through와 감속. generic overhead windup 금지.',
          ],
          [
            'Forward Roll',
            '숙였다 일어나는 dodge가 아니라 머리/어깨 하강 → 골반이 어깨 위로 → 발이 몸 위 통과 → 장비 동반 회전 → 착지 후 이동. 극단적 전신 SVG pose 교체를 허용하되 gameplay 거리/무적은 게임이 소유.',
          ],
        ],
      ),
    ) +
    section(
      'Reference와 구현 상태',
      p(
        'front/side/3/4, representative/action pose, line of action·center of mass·torso twist·weapon path·contact/follow-through를 먼저 제출합니다. 현재 코드 clip이나 네 유형 견본의 재생 가능 여부는 새로운 pose reference/Body Profile/Contact IK/override 계약의 완료 증거가 아닙니다.',
      ) +
        link('reference-approval.html', 'Reference 승인 순서') +
        ' · ' +
        link('characters.html', '인물별 역할'),
    ),
);

document(
  'reference-approval.html',
  'Reference 제작·승인 순서',
  '계약은 확정됐지만 개별 reference/composite 승인과 runtime 구현 검증은 별개입니다.',
  section(
    '현재 우선순위',
    table(
      ['순서', '제작 묶음', '필수 reference/상태', '이야기/역할'],
      ProductionContract.REFERENCE_ORDER.map(([id, title, detail, href]) => [
        esc(id),
        esc(title),
        esc(detail),
        link(href, '관련 자료'),
      ]),
    ),
  ) +
    section(
      '제출할 reference sheet',
      table(
        ['대상', '포함할 내용'],
        ProductionContract.REFERENCE_CHECKS.map((row) => row.map(esc)),
      ),
    ) +
    section(
      '승인 후 확장',
      p(
        'REF-05의 prologue gameplay-scale composite를 승인한 뒤 enemy archetype → 폐광↔항구 → 나머지 지역으로 진행합니다. reference는 구현 authority이며 Codex가 중요한 액션 pose나 주요 Composition을 처음부터 임의로 만들고 완성 처리하지 않습니다. 기존 주인공 동작 스타일의 확인을 모든 새 sheet의 승인으로 확대하지 않습니다.',
      ),
    ) +
    section(
      '미정 처리',
      p(
        '인물의 이름/성별/과거사, 미정 적 종류, 지역 사건 세부와 세계관을 임의로 채우지 않습니다. 구현 선택은 well-known 방식/업계 사례를 먼저 조사하고 명백한 hybrid+override는 반복 인터뷰 없이 제안합니다. 게임 느낌·아트 결과·콘텐츠 양·되돌리기 어려운 구조가 크게 갈릴 때만 조사 후 실질적으로 다른 3안을 제시합니다.',
      ) + link('decisions.html', '기존 이야기의 미정·충돌'),
    ) +
    section(
      '요청/승인 기록',
      p(
        '요청서에 master/pose/Composition ID와 버전, 승인한 reference/composite, gameplay scale capture, 미정과 runtime 검증 결과를 구분해 적습니다. 등록/생성/단위 테스트 통과는 승인 표시가 아닙니다.',
      ) + link('request.html', '갱신된 요청서'),
    ),
);

const castRows = CAST_BRIEFS.map((a) => {
  const candidates = resources.filter((r) => actorFor(r)?.id === a.id);
  const composites = candidates.filter((r) => r.id.startsWith('npc:') || r.producer === 'player');
  return [
    `<strong id="${a.id}">${esc(a.name)}</strong><br>${esc(a.region)}`,
    esc(a.role),
    esc(a.look),
    `${esc(a.poses)}<hr>${esc(a.states)}`,
    list(composites.map((r) => `${ref(r)} · ${preview(r)}`)),
  ];
});
document(
  'characters.html',
  '전체 인물·NPC 역할표',
  '사람 단위의 제작 묶음. 동작 칸은 기획 기반 요청 제안이며 현재 구현된 애니메이션 목록이 아닙니다.',
  link('character-animation.html', '공통 Rig Family·Body Profile·key pose 제작 계약') +
    p(
      '주인공 1 + NPC 역할 묶음 13. 라이벌의 여러 배치, 대기 주민과 작업장 앞 주민은 같은 인물로 묶습니다. 갇힌 작업자는 대사상 셋이며 현재 한 조립 묶음이 이를 대표하므로 개별 디자인 수는 확인 필요입니다.',
    ) +
    table(
      [
        '인물/장소',
        '서사·게임 역할',
        '구별할 외형·도구',
        '필요 동작·상태 변형',
        '현재 조립 묶음·검토',
      ],
      castRows,
    ) +
    section(
      '제작 수량과 상태',
      p(
        '113개 NPC 카탈로그 항목은 독립 NPC 113명이 아닙니다. 현재 많은 NPC 동작은 정적 map patch입니다. 전·중·후 작업 동작과 복장 손상은 Product Goal이 요구하는 결과이므로, 표의 포즈를 이미 재생 가능하다고 가정하지 않습니다. 주인공 이외의 실명·성별·과거사는 이 문서에서 추가 확정하지 않습니다.',
      ) + pg('PG-CAST-CONTINUITY'),
    ),
);

const enemies = resources.filter((r) => r.producer === 'enemy');
document(
  'enemies.html',
  '몹·Boss와 유형 견본',
  '실전 배치, 미배치 작성된 profile, 검토용 유형 템플릿을 분리합니다.',
  section(
    '도입 composite 승인 뒤 검토할 유형 기준',
    table(
      ['유형', '수정 단위', '검토'],
      resources
        .filter((r) => r.producer === 'enemy-reference')
        .map((r) => [
          esc(r.label),
          '현재 검토용 견본. 새 제작은 구조별 Rig Family/Body Profile과 중요 key pose 계약을 따르며 도입 기준 장면 승인 뒤 확장합니다.',
          `${ref(r)} · ${preview(r)}`,
        ]),
    ),
  ) +
    section(
      '현재 적 전체 21개',
      table(
        ['적/역할', '배치 또는 연결 사건', '종료·전투 표현', '현재 원본·동작'],
        enemies.map((r) => {
          const e = ENCOUNTER_PROFILES[r.profileId];
          const issues = campaign.primaryIssues
            .flatMap((i) => i.linkedIssues)
            .filter((i) => i.requiredEncounterIds.includes(r.profileId));
          return [
            `<strong id="${esc(r.profileId)}">${esc(r.label)}</strong><br>${e.role === 'boss' ? '지역 Boss' : '일반 조우'}`,
            r.placements.length
              ? list(r.placements.map((x) => scenario(x.regionId)))
              : `<strong>현재 맵 미배치</strong>${list(issues.map((i) => esc(i.label)))}`,
            e.species === 'human-salvager'
              ? `실제 인간 수거반 · ${e.completionDisposition === 'flee' ? '도주' : '항복'}; 사망 연출 금지`
              : '동원 기계/기계 생물 · 도구 기능을 공격 예고와 해체/정지 상태로 구분',
            `${preview(r)} · ${ref(r)}<br>외형 원본: <code>${esc(e.presentationProfileId)}</code><details><summary>현재 action 목록</summary>${list(r.actions.map((a) => `${esc(a.label)} — <code>${esc(a.id)}</code>`))}</details>`,
          ];
        }),
      ),
    ) +
    section(
      '미정인 최종 적 구성',
      p(
        '기획 목표는 각 지역 8개 실루엣(비인간 고유 4, 인간형 고유 1, 현지 동원 기계·엘리트·Boss 포함), 전체 전투의 인간형 약 20~25%입니다. 현재 21개 profile과 같은 외형 재사용, 미배치 5개는 그 목표의 완료 목록이 아닙니다. 미정 적을 새 이름으로 만들어 확정 발주하지 말고 지역/유형 슬롯을 먼저 설계합니다.',
      ) + pg('PG-SCRAP-READABILITY'),
    ),
);

const worldRows = campaign.regions.map((r) => [
  scenario(r.id),
  esc(REGION_BRIEFS[r.id].motifs),
  esc(r.machineLabel),
  `${esc(r.part.label)} → <strong>${esc(r.part.robotModule)}</strong>`,
  esc(REGION_BRIEFS[r.id].after),
]);
document(
  'world.html',
  '환경·산업기계·효과·UI 요청 묶음',
  '작은 부위 목록보다 장소 전체와 상태 변화부터 묶어 요청합니다.',
  link('environment-authoring.html', '환경 Hybrid·Composition·XYZ·LOD 제작 계약') +
    section(
      '지역별 환경과 로봇 모듈',
      table(['지역', '재질/공간', '현지 기계', '회수 모듈', '복구·분리 후'], worldRows),
    ) +
    section(
      '공통 대형 묶음',
      table(
        ['제작 묶음', '역할과 필수 상태', '연결'],
        [
          [
            '폐병기/고대 병기',
            '잠든 현장 → 회수팔 구조 사고 → 핵 소켓 봉쇄 → 눈 점등/불완전 조립 → 진군 → 장갑/무기 파괴 → 핵 재설치/정지 → 복구 중장비',
            link('scenarios/prologue.html', '도입') + ' · ' + link('scenarios/finale.html', '결전'),
          ],
          [
            '대항 병기/차고',
            '0% 골격 + 다섯 독립 모듈. 자유 회수 순서의 32개 장착 조합은 모듈 재조합으로 대응; 그림 32장을 각각 납품하는 요구가 아닙니다. 출격·전투·산업 복귀.',
            link('scenarios/garage.html', '차고'),
          ],
          [
            '제어핵',
            '회수팔과 연결 → 분리/손에 듦 → 차고 두뇌 장착 → 고대 병기 재설치. 같은 소품의 동일성과 접속 위치 유지.',
            link('scenarios/prologue.html', '핵의 인과'),
          ],
          [
            '작전 지도',
            '현재 위치·적 진로·지역 연결로·우회 전후·회수 부품·D-DAY·수도 도착 실패 표시',
            pg('PG-OPERATION-MAP'),
          ],
        ],
      ),
    ) +
    section(
      'VFX와 UI',
      table(
        ['묶음', '요청할 역할', '전체 등록'],
        [
          [
            '전투 VFX',
            '공격 준비, 일반 타격, 방어/just guard, 무적, 강공·guard break, 속성, 궤적, 파편. 색뿐 아니라 형태·방향·타이밍으로 구분.',
            link('resources/effect-1.html', '효과 목록'),
          ],
          [
            '환경·사건 VFX',
            '붕괴 분진, 회수 장력/해제, 핵 신호·눈 점등·부품 결합, 용접/수증기/눈·경로 차단, 차고 개방',
            link('scenarios/index.html', '장면별 요청'),
          ],
          [
            '게임 UI',
            '체력/스태미나·시간, 목표, 말풍선/기록, 작전 지도, 작업 확인, 장비/인챈트, 게임오버/복구, 터치 조작, 시작·업데이트/설치 안내',
            link('resources/ui-1.html', 'UI·아이콘 목록'),
          ],
        ],
      ),
    ),
);

// Complete story outline, then one small file for each playable narrative unit.
document(
  'scenarios/index.html',
  '전체 시나리오와 그래픽 연결',
  '다섯 지역은 순서가 고정된 챕터가 아닙니다. 지역 선택 뒤 다른 지역을 거쳐 돌아오는 이야기입니다.',
  section(
    '처음부터 결말까지',
    table(
      ['구간', '이야기의 역할', '상세 자료'],
      [
        [
          '1 · 첫 수거 의뢰/사고',
          '라이벌을 구하려 핵을 떼어 고대 병기를 깨운다.',
          link('prologue.html', '도입 20~30분 목표'),
        ],
        [
          '2 · 귀환/차고',
          '분석·작전 지도·대항 병기 0% 공개. 핵은 우리 로봇의 두뇌가 된다.',
          link('garage.html', '첫 귀환과 모듈 조립'),
        ],
        ...campaign.regions.map((r) => [
          '3 · 자유 순서',
          esc(r.event.label) + ' → ' + esc(r.part.robotModule),
          link(r.id + '.html', r.label),
        ]),
        [
          '4 · 결전/후일담',
          '다섯 모듈을 갖춰 출격 → 적 장갑/무기 파괴 → 핵 재설치·정지 → 산업 복귀/공식 수거팀',
          link('finale.html', '결전·에필로그'),
        ],
        [
          '실패 경로',
          'D-DAY 0 → 수도 도착/파괴 → 저장 기록 복구. 시간 역행 이야기가 아니다.',
          link('failure.html', '게임오버/복구'),
        ],
      ],
    ),
  ) +
    section(
      '지역 간 연결 사건 전체',
      table(
        ['시작 주목표', '방문 지역', '필요한 사건/그래픽', '현재 전투 조건'],
        campaign.primaryIssues.flatMap((i) =>
          i.linkedIssues.map((l) => [
            link(i.regionId + '.html', i.label),
            link(l.targetRegionId + '.html', campaign.getRegion(l.targetRegionId).label),
            esc(l.label) + '<br>' + esc(l.objective),
            l.requiredEncounterIds.length
              ? list(
                  l.requiredEncounterIds.map((id) =>
                    link('../enemies.html#' + id, ENCOUNTER_PROFILES[id]?.label ?? id),
                  ),
                )
              : '명시된 필수 encounter ID 없음 · 사건 밀도 확인 필요',
          ]),
        ),
      ),
    ) +
    section(
      '공통 인과와 분량',
      p(
        '의뢰·현장 관찰 → 연결 사건 → 귀환 → Boss/군수 인장 해제 → 생계 대체/마지막 작업 → 기계 분리 → 부품 회수 → 실제 길 차단에 따른 우회/차고 갱신. 대화·일반 전투·지역 내 탐색은 시간 무료, 장거리 이동·휴식·KO·핵심 사건 확정은 시간 소비입니다. 10시간/부품당 2시간은 기획 목표이지 현재 플레이 분량의 검증 결과가 아닙니다.',
      ) + pg('PG-OPEN-CAMPAIGN', 1),
    ),
);
const transcripts = (entries, sourceFile) =>
  section(
    '현재 작성된 대화 원문',
    p('아래는 원본 대화 데이터입니다. 전체 최종 대본·컷 수의 확정본으로 해석하지 않습니다.') +
      entries
        .map(
          (c) =>
            `<article id="${esc(c.id)}"><h3>${esc(c.title)}</h3><p>${esc(c.speaker)} · <code>${esc(c.id)}</code></p><ol>${c.lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ol></article>`,
        )
        .join('') +
      source(sourceFile, 1),
  );
const introGraphics = (id) =>
  /collapse|rescue-request/.test(id)
    ? '회수팔·갈고리 장력·무너진 통로·갇힌 라이벌'
    : /device|decision/.test(id)
      ? '핵/접속부·조사/독백·핵 분리·회수팔 해제'
      : /eyes|assembled|deadline|rescue-succeeded/.test(id)
        ? '비상 장갑 봉쇄·단안 점등·고철 결합·적 진군·D-30'
        : /yard/.test(id)
          ? '수거 유닛·지지대·구조 줄·흉갑·현장 표식·동행 라이벌'
          : '고물상 작업대·주인공·라이벌·말풍선';
document(
  'scenarios/prologue.html',
  '도입 · 첫 수거 의뢰와 각성',
  '사람을 먼저 구한 선택이 재난의 원인이 됩니다. 값나가는 부품 수집 동기로 바꾸지 않습니다. 고대 병기는 옛 명령을 문자 그대로 실행하며 사무적인 낡은 방송과 과장된 조립·수거 행동으로 위협과 웃음을 함께 보여 줍니다. 신체 공포물 방향이 아닙니다.',
  section('등장인물', characterLinks('scrap-waste-edge')) +
    section(
      '전체 도입 단계',
      table(
        ['현재 stage', '이야기/현장 행동', '필요 그래픽'],
        SCRAP_AWAKENING_STAGE_IDS.map((id) => {
          const x = getScrapAwakeningPresentation(id);
          return [`<code>${id}</code><br>${esc(x.title)}`, esc(x.briefing), esc(introGraphics(id))];
        }),
      ),
    ) +
    section(
      '제작 요청 묶음',
      p(
        '주인공 기본 모션 + 라이벌 동행/조사/끌려감/구조 후 + 고물상 의뢰. 폐병기 현장, 회수팔과 갈고리, 제어핵과 접속부, 비상 장갑 봉쇄, 눈 점등/조립/진군, D-30 UI를 같은 관계로 설계합니다. 상호작용·공격 예고와 겹치는 부분은 게임 검토실에서 확인합니다.',
      ) + sceneResources('scrap-waste-edge'),
    ) +
    transcripts(
      resolveScrapPrologueConversationTranscripts(
        Object.values(SCRAP_PROLOGUE_CONVERSATION_ID).filter(
          (id) => id !== 'scrapyard-owner-analysis',
        ),
      ),
      'src/game/story/ScrapPrologueStory.js',
    ) +
    source('src/game/campaign/ScrapAwakeningState.js', 1),
);
document(
  'scenarios/garage.html',
  '귀환 · 지도와 차고 · 자유 조립',
  '차고 공개는 지역 탐험보다 먼저입니다. 이후 각 부품은 회수 순서와 무관하게 누적됩니다.',
  section(
    '첫 귀환 단계',
    table(
      ['stage', '이야기', '그래픽 요청'],
      SCRAP_GARAGE_REVEAL_STAGE_IDS.filter((id) => id !== 'locked').map((id) => {
        const x = getScrapGarageRevealPresentation(id);
        return [
          `<code>${id}</code><br>${esc(x.title)}`,
          esc(x.briefing),
          id === 'map-revealed'
            ? '벽 지도·다섯 지역/적 진로 점등'
            : id === 'garage-opened'
              ? '차고문·0% 골격·제어핵 두뇌 장착'
              : '고물상인 분석/대화·작업대·귀환한 두 견습생',
        ];
      }),
    ),
  ) +
    section(
      '반복 조립 요청',
      p(
        '기본 골격과 다리/팔/동력원/장갑/검을 독립 부품으로 나눕니다. 각 모듈에 원산지 산업기계의 형태와 재질이 남고 서로 겹치는 연결부를 설계합니다. 5개 모듈의 조합을 지원하되 폐광=첫 번째, 채석장=마지막으로 고정하지 않습니다.',
      ) +
        table(
          ['원산지', '모듈', '보여 줄 상태'],
          campaign.regions.map((r) => [
            link(r.id + '.html', r.label),
            esc(r.part.robotModule),
            '현지 가동 → 분리/회수 → 차고 부착 → 최종전 → 산업 복귀',
          ]),
        ),
    ) +
    transcripts(
      resolveScrapPrologueConversationTranscripts(['scrapyard-owner-analysis']),
      'src/game/story/ScrapPrologueStory.js',
    ) +
    source('src/game/campaign/ScrapGarageRevealState.js', 1),
);
for (const region of campaign.regions) {
  const brief = REGION_BRIEFS[region.id],
    issue = campaign.getPrimaryIssueForRegion(region.id),
    rooms = map.regions.find((r) => r.id === region.id).rooms;
  document(
    `scenarios/${region.id}.html`,
    region.label + ' · 사건과 제작 요청',
    '기획의 공통 흐름에 현재 작성된 지역 상세를 연결한 요청 자료입니다.',
    section('이 지역의 이야기', p(brief.story) + pg('PG-OPEN-CAMPAIGN', 1)) +
      section(
        '이 지역의 Color Identity와 제작',
        table(
          ['색상 방향', '재질·표면', '생활·형태'],
          [ProductionContract.REGIONAL_IDENTITY[region.id].map(esc)],
        ) + link('../environment-authoring.html', 'Composition/Prefab/Kit/landmark 제작 계약'),
      ) +
      section(
        '인물과 장소',
        characterLinks(region.id) +
          table(
            ['장소', '역할'],
            rooms.map((r, i) => [
              esc(r.label),
              [
                '주민·현황판·연결로·사건 전후 생활 상태',
                '연결 문제 해결을 위한 탐색/전투·중간 시설',
                '지역 Boss·마지막 작업·기계 분리/회수',
              ][i],
            ]),
          ),
      ) +
      section(
        '교차 지역 사건',
        table(
          ['필요한 연결', '방문', '현재 요구'],
          issue.linkedIssues.map((l) => [
            esc(l.label),
            link(l.targetRegionId + '.html', campaign.getRegion(l.targetRegionId).label),
            esc(l.objective) +
              (l.requiredEncounterIds.length
                ? list(
                    l.requiredEncounterIds.map((id) =>
                      link('../enemies.html#' + id, ENCOUNTER_PROFILES[id]?.label ?? id),
                    ),
                  )
                : '<br>필수 encounter ID 미지정'),
          ]),
        ),
      ) +
      section(
        '전·중·후 그래픽',
        table(
          ['전', '진행 중', '해결 후'],
          [[esc(brief.before), esc(brief.during), esc(brief.after)]],
        ),
      ) +
      section(
        '현재 작성된 사건 단계',
        table(
          ['단계', '역할', '현재 다음 행동'],
          region.eventStages.map((s) => [
            esc(s.label),
            `<code>${esc(s.id)}</code>`,
            esc(s.nextObjective),
          ]),
        ) +
          p(
            '위 목표 문구는 현재 구현 관찰 자료입니다. 20%/100% 같은 고정 완성도는 자유 순서 디자인 근거가 아닙니다. 생계 복구와 경로 차단을 모두 포함합니다.',
          ),
      ) +
      section(
        '기계·회수 모듈·우회',
        table(
          ['현지 기계', '회수', '마지막 작업', '지도 우회'],
          [
            [
              esc(region.machineLabel),
              esc(region.part.label) + ' → ' + esc(region.part.robotModule),
              esc(region.routeDetour.closureLabel),
              esc(region.routeDetour.detourLabel),
            ],
          ],
        ),
      ) +
      section(
        '현재 원본과 실제 검토',
        list(
          resources
            .filter(
              (r) => r.regionId === region.id && (r.kind === 'scene' || r.producer === 'enemy'),
            )
            .map((r) => `${ref(r, 1)} · ${preview(r, 1)}`),
        ) + source('src/game/campaign/ScrapCampaignProfiles.js', 1),
      ) +
      transcripts(
        Object.values(SCRAP_REGION_CONVERSATION).filter((c) => c.id.startsWith(region.id + ':')),
        'src/game/story/ScrapRegionStory.js',
      ),
  );
}
document(
  'scenarios/finale.html',
  '결전과 후일담',
  '우리 대항 병기와 적 고대 병기의 소유권·역할을 분명히 나눕니다.',
  section(
    '기획상 결말',
    p(
      '다섯 부품을 회수하면 D-DAY 전에 출격할 수 있습니다. 기존 검/방패/구르기 전투로 적 장갑과 무기를 파괴해 제어부를 열고, 처음 회수한 제어핵을 적에게 재설치해 정지 명령을 내립니다. 우리 로봇은 산업기계로 돌아가고 고대 병기는 왕국 복구용 중장비가 됩니다. 두 견습생은 공식 수거팀으로 인정받습니다. 적은 옛 명령을 문자 그대로 실행하며 사무적인 낡은 방송과 과장된 수거 행동을 유지합니다. 신체 공포 대신 위협과 웃음이 함께 읽혀야 합니다.',
    ) + pg('PG-FINAL-BATTLE', 1),
  ) +
    section(
      '장면 요청',
      table(
        ['장면', '요청할 그래픽', '상태'],
        [
          ['출격', '5모듈 대항 병기·거대 전장·대비되는 고대 병기', '기획 기반 요청'],
          [
            '장갑/무기 파괴',
            '적 장갑 노출·파손/분리·공격 준비·회복 틈·제어부 노출',
            '적 무기의 정확한 디자인은 확인 필요',
          ],
          [
            '핵 재설치/정지',
            '우리 두뇌 소켓에서 핵 분리 → 적 소켓 재설치 → 정지 신호',
            '동일 핵과 연결부 유지',
          ],
          [
            '후일담',
            '5지역 기계 복귀·생활 정상화·고대 병기 복구 작업·두 견습생 공식 수거팀',
            '컷 수·대사·배치 세부는 미정',
          ],
        ],
      ),
    ) +
    section(
      '현재 구현 stage 목록',
      table(
        ['stage', '현재 title', '현재 objective'],
        Object.values(SCRAP_FINAL_BATTLE_STAGE)
          .filter((id) => id !== 'inactive')
          .map((id) => {
            const s = getScrapFinalBattlePresentation(id);
            return [`<code>${id}</code>`, esc(s.title), esc(s.objective)];
          }),
      ) +
        p(
          'weapon cue의 채석장 절단검 소유권 혼동은 확인 목록에 남겼습니다. 현재 문구를 적 무기 확정안으로 전달하지 않습니다.',
        ) +
        link('../decisions.html', '확인 필요 목록'),
    ) +
    section(
      '검토 연결',
      list(
        resources
          .filter((r) => r.producer === 'final' && r.kind === 'scene')
          .map((r) => `${ref(r, 1)} · ${preview(r, 1)}`),
      ) + source('src/game/campaign/ScrapFinalBattleState.js', 1),
    ),
);
document(
  'scenarios/failure.html',
  'D-DAY 실패와 저장 복구',
  '작전 실패를 보여 주고 저장 기록에서 다시 시작합니다. 세계 내 시간 역행 연출이 아닙니다.',
  table(
    ['순서', '그려야 할 결과'],
    [
      ['D-DAY 0', '입력 잠금·위험 시간 표시·작전 신호 단절'],
      ['수도 도착', '지도상 마지막 구간이 닫히고 적 표식이 왕도에 겹침'],
      ['파괴', '수도 외곽 작업장·방벽 붕괴; 최종 파괴 컷 상세는 별도 설계'],
      ['복구 선택', '최근 아침/핵심 사건/행동 직전 저장을 구별하는 게임오버 UI'],
      ['KO 거점 복귀', '일반 KO와 수도 파괴를 별도 의미로 구분. 거점 복귀·시간 비용 안내'],
    ],
  ) +
    pg('PG-RECOVERY', 1) +
    source('src/game/campaign/ScrapGameOverPresentation.js', 1),
);

// Full catalog: no omitted raw parts, no invented final assets.
const categoryRows = [];
for (const category of GRAPHICS_CATEGORIES) {
  const entries = resources.filter((r) => r.category === category.id),
    pages = Math.ceil(entries.length / 30);
  categoryRows.push([
    esc(category.label),
    String(entries.length),
    Array.from({ length: pages }, (_, i) =>
      link(`${category.id}-${i + 1}.html`, `${i + 1}쪽`),
    ).join(' · '),
  ]);
  for (let page = 0; page < pages; page++) {
    const slice = entries.slice(page * 30, page * 30 + 30);
    const rows = slice.map((r) => {
      const a = actorFor(r),
        isPart = r.id.startsWith('map:') && r.category === 'npc';
      const role = a
        ? `${a.name} · ${isPart ? '조립 부위; 별도 인물 아님' : a.role}`
        : CATEGORY_ROLES[r.category];
      return [
        `<strong id="${esc(r.id)}" data-resource-id="${esc(r.id)}">${esc(r.label)}</strong><br><code>${esc(r.id)}</code>`,
        `${esc(role)}${a ? '<br>' + link('../characters.html#' + a.id, '인물 역할표') : ''}`,
        r.regionId
          ? scenario(r.regionId, 1) + '<br>' + esc(r.roomLabel)
          : '공용/미배치·개별 자료 확인',
        `<strong>${r.producer === 'enemy-reference' ? '검토용 유형 견본' : r.id.startsWith('npc:') ? '조립 묶음' : r.producer === 'map' ? '원본 부위/장면' : esc({ animated: '동작 리소스', static: '정적 리소스', scene: '장면', ui: 'UI', image: '이미지' }[r.kind] ?? r.kind)}</strong><details><summary>현재 상태·동작 ${(r.actions ?? []).length}개</summary>${list((r.actions ?? []).map((a) => `${esc(a.label)} · <code>${esc(a.id)}</code>${a.frameCount > 1 ? ' · ' + a.frameCount + '프레임' : ''}`))}</details>${esc(r.notes ?? '')}`,
        `${preview(r, 1)}<br>${source(r.source, 1)}`,
      ];
    });
    document(
      `resources/${category.id}-${page + 1}.html`,
      `${category.label} · 전체 목록 ${page + 1}/${pages}`,
      `현재 등록 ${entries.length}개 중 ${page * 30 + 1}–${Math.min(entries.length, (page + 1) * 30)}. 조각/상태를 독립 제작 건수로 합산하지 않습니다.`,
      table(
        ['원본 ID/이름', '역할·제작 묶음', '사용 장소/시나리오', '현재 등록 상태', '검토/출처'],
        rows,
      ) +
        `<nav class="pager">${page ? link(`${category.id}-${page}.html`, '이전') : ''} ${link('index.html', '전체 분류')} ${page + 1 < pages ? link(`${category.id}-${page + 2}.html`, '다음') : ''}</nav>`,
    );
  }
}
document(
  'resources/index.html',
  '전체 그래픽 리소스 목록',
  `${resources.length}개 stable ID를 분류별 최대 30행으로 나눴습니다. 필요할 때만 해당 페이지를 읽습니다.`,
  table(['분류', '현재 등록 수', '목록 페이지'], categoryRows) +
    p(
      '현재 action의 frameCount가 1인 map patch는 상태 표본이며 애니메이션 완료를 뜻하지 않습니다. npc: 묶음과 map: 부위는 원본 item을 공유할 수 있습니다. 미배치 적과 검토용 유형 견본은 실전 완료로 합산하지 않습니다.',
    ),
);
document(
  'decisions.html',
  '제작 전 확인할 미정·충돌',
  '기획 기준을 유지하며 현재 자료의 빈칸을 숨기지 않습니다. 이 목록의 존재가 문서 전달을 막지는 않습니다.',
  table(
    ['주제', '외주 요청에서의 처리', '기준/관찰 출처'],
    OPEN_DECISIONS.map(([title, detail, goal, file]) => [
      esc(title),
      esc(detail),
      pg(goal) + '<br>' + source(file),
    ]),
  ),
);
document(
  'request.html',
  '그래픽 제작 요청서',
  '이 페이지와 담당 인물/지역 링크만 복사해 전달할 수 있습니다. 다른 사람에게 자동 전송하지 않습니다.',
  section(
    '복사할 요청 양식',
    `<pre>요청 묶음 / 담당자 / REF 단계:
관련 인물·지역·시나리오 링크 / 기존 resource ID:
계약 상태: 확정 / reference 승인 대기 / runtime 미구현·미검증
승인 reference·Composition·Prefab ID / 버전 / 승인 기록:
원본: asset.master.svg / 파생 far.mid.near export / PNG 보조 preview
자산 종류: Unique Landmark / Prefab / Kit / Composition / Character / Pose
식별·지역성: silhouette / Body Profile / Color Identity / material / 고유 shape
SVG: 의미 그룹 / joint·pivot·anchor / local depth / 면 경계
면·조명: data-normal / data-material / data-occlusion
그림자: contact / actual cast / none / 단순 occluder
환경: world identity / XYZ / scale·parallax override / renderBias / role·tags·state
Composition: 목적·사건 / overlap 연결 / preload-unload / 같은 landmark 참조
LOD: screen occupancy / far-mid-near 실루엣 / override·bias / hysteresis
동작: 일반 reusable clip / 중요 authored READY-WINDUP-CONTACT-FOLLOW-RECOVER
Pose: 부분 SVG replacement / 필요한 whole-body pose / Body Profile·modifier
Contact IK가 필요한 구간 / prop anchor / 자연스러운 root curve:
게임 제공 값: 실제 이동거리 / attack max reach / active window / envelope
접촉 검수: visible weapon sweep AND envelope / 같은 trail trajectory
Hurt: semantic region / primitive / body·weak·armor·guard·immune / 허용 오차
필요 상태: 사건 전·중·후 / connected-captured-tension-detached-released 등
미정·확인 필요 (새 인물 설정·적 종류·사건을 임의 확정하지 않음):
검수: 실제 1280×720·mobile composite / 작은 인물+넓은 세계 / reference 일치
요청·검토·reference 승인·export 검사·runtime 검증을 별도로 기록</pre>`,
  ) +
    section(
      '요청 예시 · 라이벌',
      p(
        '공통 라이벌 1명을 도입 출발·현장 조사·회수팔에 붙잡힘·구조 후·지역 정찰 상태로 요청합니다. 갈고리와 수거 표식은 유지하고, 별도 라이벌 9명을 새로 만드는 요청으로 해석하지 않습니다. 먼저 front/side/3/4·개별 Body Profile·master SVG parts·상태와 주요 key pose를 만들고 승인합니다. AI는 승인 reference에 맞춰 retarget/선택 Contact IK/pose override를 반영하며 일반 clip과 중요한 authored 동작을 구분합니다.',
      ) +
        link('characters.html#rival', '라이벌 역할/현재 묶음') +
        ' · ' +
        link('scenarios/prologue.html', '도입 인과'),
    ) +
    section(
      '납품 뒤 검토',
      p(
        '확정된 제작 계약과 승인 reference를 현재 runtime preview와 나란히 비교합니다. 투명 확대 그림과 실제 배경 위 PC/모바일 화면을 모두 확인하고, 새 실루엣에 기존 유형 clip을 재사용할 때 관절·장비 파지·겹침이 유지되는지 봅니다. 디자인 승인은 사람이 기록하며 catalog 존재 여부나 자동 검사로 대체하지 않습니다.',
      ),
    ),
);

// Machine-readable index is optional; it is not loaded by the handbook or game.
files.set(
  'inventory.json',
  JSON.stringify(
    { fingerprint, resourceCount: records.length, records, pages: [...files.keys()].sort() },
    null,
    2,
  ) + '\n',
);
if (new Set(records.map((r) => r.id)).size !== records.length)
  throw Error('Duplicate resource IDs');
if (resources.some((r) => r.category === 'npc' && !actorFor(r))) throw Error('Unmapped NPC role');
const check = process.argv.includes('--check');
let mismatch = false;
for (const [relative, raw] of files) {
  const content = await prettier.format(raw, {
    parser: relative.endsWith('.json') ? 'json' : 'html',
    printWidth: 100,
  });
  const target = path.join(out, relative);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
      console.error('Stale art document:', relative);
      mismatch = true;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
if (mismatch) process.exitCode = 1;
else
  console.log(
    `${check ? 'PASS' : 'Generated'} art handoff: ${records.length} resources, ${CAST_BRIEFS.length} cast groups, ${enemies.length} enemies, ${files.size} linked files.`,
  );
