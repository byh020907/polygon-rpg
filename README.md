# Polygon RPG

동네 고물상 견습생이 라이벌을 구하려 제어핵을 떼어낸 뒤, D-30 안에 다섯 지역의 산업기계를 대항 병기로 조립해 고대 병기를 멈추는 browser 2D action RPG입니다. 게임과 모든 검토 화면이 같은 Canvas Polygon renderer를 사용합니다.

## Project Sources

- [Product Goal](./PRODUCT_GOAL.html): 사용자가 경험해야 하는 현재 Product Desired State
- [Architecture](./ARCHITECTURE.md): 코드가 따라야 하는 현재 Engineering Desired State
- [Human Feedback Inbox](./INBOX.md): 아직 처리하지 않은 제품 feedback
- [Loop State](./STATE.md): 코드와 실행 evidence에서 재구성되는 현재 비교 snapshot
- [Product Goal Loop Method](./.ai/methods/product-goal-loop/METHOD.md): Gap을 발견하고 구현·검증하며 두 Desired State에 수렴하는 개발 runtime

`AGENTS.md`는 위 경로만 bootstrap합니다. 개발 loop의 완료 의미는 특정 Agent, scheduler, worktree, CI나 orchestration 도구에 의존하지 않습니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://127.0.0.1:5173/`을 엽니다.

- 게임: `http://127.0.0.1:5173/`
- Product Goal 설계서: `http://127.0.0.1:5173/PRODUCT_GOAL.html`
- 전체 그래픽 검토: `http://127.0.0.1:5173/?graphicsReview=1` — 시작 화면의 **디버그 모드** 버튼으로 패널을 바로 연다. POLYGON RPG 제목 또는 게임의 MENU/MAP을 1초 길게 누르는 방법도 유지한다. 지도 해금 전부터 사용할 수 있다. [등록·검토 안내](./docs/graphics-review.md)
- 몹 유형 시안: 검토실에서 **몹 유형 시안**을 선택하면 인간형·짐승형·비행형·기계형 대표 네 개의 공용 동작을 비교한다. [컨셉 아트·본·정규좌표 수정 안내](./docs/enemy-reference-authoring.md)

메인 메뉴에서 `게임 시작 / 계속하기`를 선택하면 고물상인의 정식 수거 의뢰와 라이벌의 현장 동행으로 시작합니다. 폐병기의 자동 회수팔에 붙잡힌 라이벌을 구하기 위해 제어핵을 직접 회수하면 고대 병기 각성, D-30 고지, 고물상인 분석과 차고의 대항 병기 0%가 실제 gameplay 안에서 이어지며, stage는 browser-local 진행에 저장됩니다.

| Action              | Keyboard             | Mobile         |
| ------------------- | -------------------- | -------------- |
| 이동                | `← / →`              | 방향 pad       |
| Jump / Guard / Roll | `↑ / ↓`, 이동 중 `↓` | 방향 pad       |
| Basic / Strong      | `A / S`              | `X / Y`        |
| Combo branch        | `AA / AS / SA`       | `XX / XY / YX` |

상호작용 범위에서 `↑`를 누르면 제어핵 회수나 대화를 우선 처리하고, 실제 연결로 끝에서는 장거리 이동을 확정합니다. 장거리 이동, 완전 회복, KO 귀환과 핵심 사건만 네 구간 단위의 D-DAY를 소비합니다.

## PWA와 모바일

한 번 정상 로딩한 배포본은 manifest, Service Worker와 versioned cache를 통해 오프라인에서도 메뉴·게임 module·저장·복구를 이어갑니다. Android Chromium은 메뉴의 `앱으로 설치`에서 시스템 설치를 요청하고, iPhone/iPad Safari는 공유 메뉴의 `홈 화면에 추가` 안내를 사용합니다. 설치 앱은 가로 방향을 우선하며 기본 강제 전체화면은 쓰지 않습니다.

메뉴의 **업데이트 확인**으로 새 배포를 조회할 수 있으며 앱 시작·화면 복귀·메뉴 복귀와 보이는 동안의 제한된 주기에도 확인합니다. 파일 검증이 끝나면 **버전 적용**을 눌러 진행을 저장한 뒤 전환합니다. 다른 창이 먼저 적용했어도 현재 플레이와 그 버전의 파일은 유지하며, 메뉴에서 저장 후 다시 열 수 있습니다. 오프라인·다운로드 실패·저장 실패는 현재 버전을 유지하고 재시도할 수 있습니다.

이전 버전의 설치 작업이 이미 멈춰 있는 기기에서는 한 번 앱과 브라우저를 완전히 종료한 뒤 다시 열어야 할 수 있습니다. 이 경우 메뉴에 복구 안내가 표시됩니다. 새로고침만으로는 멈춘 native 작업이 끝나지 않을 수 있으며, 캐시·저장 삭제나 재설치는 필요하지 않습니다. 검증에서는 같은 profile과 origin을 유지한 브라우저 재시작 뒤 저장·복구 데이터를 그대로 복원했습니다.

`npm run release:metadata`는 버전, build ID, 파일별 SHA-256과 경량 `public/release.json`을 함께 생성합니다. 배포 파일이 바뀌면 다시 생성해야 하며 `npm run test:pwa`가 누락을 검사합니다. Service Worker의 준비/대기/적용은 [공식 lifecycle 설명](https://web.dev/articles/service-worker-lifecycle)과 [`updateViaCache` 계약](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache)을 따릅니다.

Windows에서 실제 모바일 browser를 확인할 때만 `cloudflared`를 설치하고 임시 tunnel을 사용합니다.

```powershell
winget install --id Cloudflare.cloudflared --exact
npm run dev:mobile
```

Quick Tunnel은 인증 없는 공개 개발 주소입니다. secret, personal data나 production state를 넣지 말고 검증이 끝나면 `dev stop-tunnel`로 종료합니다.

## 명령어

- `npm run dev`: localhost static development server
- `npm run dev:mobile`: local server와 mobile verification tunnel
- `npm run visual:qa -- <options>`: 실제 browser 창의 stable frame PNG와 metadata 생성
- `npm run lint`: ESLint
- `npm run test:graphics`: 원본 inventory·실제 게임 sampler 동일 출력·재현 URL 계약 검사
- `npm run graphics:qa`: headless Chrome에서 desktop/mobile 실제 검토 UI 입력·재생·복사·재현과 PNG 검사
- `npm run graphics:ui-qa`: 실제 게임 UI component별 화면 확인
- `npm run test:pwa`: release integrity·PWA lifecycle·scope/client cache 및 실패 경계 검사
- `npm run test:pwa:browser`: 같은 native Chrome profile에서 A→B→C·실패 설치·저장·다른 탭·오프라인 실증
- `npm run test:pwa:recovery`: 과거 설치 정체 → 데이터 유지한 브라우저 완전 재시작 → 정상 설치·오프라인 복구 실증
- `npm run test:mobile-menu`: 가로/세로 메뉴, 화면 회전·높이, 주요 버튼과 버전 표시의 실제 viewport 검사
- `npm run test:campaign`, `npm run test:intro`, `npm run test:platform`: 해당 흐름의 focused fixture
- `npm run check`: 모든 lint, format, domain fixture를 실행하는 완료 후보의 전체 검사
- `npm run format`: Prettier 적용
- `npm run format:check`: formatting 검사

## Visual QA

Visual QA는 특정 Agent나 scheduler 없이 Node.js와 설치된 Chromium browser path를 입력받아 동작합니다. 실제 창을 열고 지정 frame까지 진행한 뒤 PNG와 JSON metadata를 저장하고 browser를 닫습니다.

```powershell
$env:BROWSER_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run visual:qa -- --repo . --start combat-hit --phase active --renderer polygon --frame 180 --output artifacts/visual-qa/combat-hit --width 1440 --height 810
```

지원하는 stable start에는 `scrap-intro-before`, `scrap-intro-awakening`, `scrap-intro-d30`,
`scrap-intro-after`와 region·robot·final scenario가 포함됩니다.
`--phase start|active|end`는 combat scenario의 원인·결과·정리 frame을 고정하며 생략 시
`active`입니다. renderer는 `polygon` 하나이며 같은 immutable RenderFrame을 사용합니다. Combat scenario는 event·pose·effect assertion과
player/enemy/contact metadata를 함께 남깁니다. 공간·도입 scenario는 stable patch, 제어핵·눈·결합
부품·D-30와 이용 가능한 연결로 metadata를 함께 고정합니다. 결과를 직접 열어 화면 의도, clipping,
게임/검토 화면의 폴리곤 일치와 console error를 확인합니다.

## GitHub Pages

개발 저장은 현재 schema만 사용한다. 호환되지 않는 이전 개발 저장은 초기화 안내를 표시하며 자동으로 덮어쓰지 않는다. 사용자가 메뉴에서 초기화를 선택하면 현행 캠페인을 새로 시작한다.

Production은 별도 bundle 없이 `main /`의 static files를 제공합니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 자산: `index.html`, `offline.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `src/**/*.js`, `src/style.css`, `public/icons/**`
- Product Goal은 repository 문서이자 local server에서 열 수 있는 semantic HTML이며 게임 bootstrap에는 import되지 않습니다.

## 그래픽 제작 요청 문서

그래픽 담당자에게는 [제작 요청 안내](./docs/art-handoff/index.html)와 담당 인물·지역 링크를 전달한다. [Master SVG 제작 계약](./docs/art-handoff/asset-contract.html), [환경 Composition/XYZ/LOD](./docs/art-handoff/environment-authoring.html), [캐릭터·애니메이션](./docs/art-handoff/character-animation.html), [Reference 승인 순서](./docs/art-handoff/reference-approval.html), [인물/NPC 역할표](./docs/art-handoff/characters.html), [몹/Boss](./docs/art-handoff/enemies.html), [전체 시나리오](./docs/art-handoff/scenarios/index.html), [전체 원본 목록](./docs/art-handoff/resources/index.html), [요청서 양식](./docs/art-handoff/request.html)을 분리해 필요한 자료만 읽을 수 있다.

Product Goal이 제품 기준을 소유하며 요청 자료는 확정 제작 계약과 현재 작성된 snapshot을 구분한다. 계약 해설은 `scripts/art-production-contract.mjs`, 역할·시나리오 해설은 `scripts/art-handoff-content.mjs`에서 수정한다. 승인 reference가 형태·구도·주요 pose의 기준이며 현재 코드/등록은 승인을 대신하지 않는다. 기획이 바뀌면 요청 해설을 먼저 재검토하고, 원본 code/content 변경 후 `npm run docs:art`, 최신성·ID·링크 검사는 `npm run docs:art:check`로 수행한다. NPC 부위/상태와 조립 묶음은 별도 인물 수로 합산하지 않는다.
