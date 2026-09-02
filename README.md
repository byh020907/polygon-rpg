# Polygon RPG

동네 고물상 견습생이 라이벌을 구하려 제어핵을 떼어낸 뒤, D-30 안에 다섯 지역의 산업기계를 대항 병기로 조립해 고대 병기를 멈추는 browser 2D action RPG입니다. 하나의 gameplay state를 Canvas Polygon과 Retro renderer가 함께 표시합니다.

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

메인 메뉴에서 `게임 시작 / 계속하기`를 선택하면 고물상 주인의 정식 수거 의뢰와 라이벌 견습생의 현장 동행으로 시작합니다. 폐병기의 자동 회수팔에 붙잡힌 라이벌을 구하기 위해 제어핵을 직접 회수하면 고대 병기 각성, D-30 고지, 고물상 분석과 차고의 대항 병기 0%가 실제 gameplay 안에서 이어지며, stage는 browser-local 진행에 저장됩니다.

| Action              | Keyboard             | Mobile         |
| ------------------- | -------------------- | -------------- |
| 이동                | `← / →`              | 방향 pad       |
| Jump / Guard / Roll | `↑ / ↓`, 이동 중 `↓` | 방향 pad       |
| Basic / Strong      | `A / S`              | `X / Y`        |
| Combo branch        | `AA / AS / SA`       | `XX / XY / YX` |

상호작용 범위에서 `↑`를 누르면 제어핵 회수나 대화를 우선 처리하고, 실제 연결로 끝에서는 장거리 이동을 확정합니다. 장거리 이동, 완전 회복, KO 귀환과 핵심 사건만 네 구간 단위의 D-DAY를 소비합니다.

## PWA와 모바일

한 번 정상 로딩한 배포본은 manifest, Service Worker와 versioned cache를 통해 오프라인에서도 메뉴·게임 module·저장·복구를 이어갑니다. Android Chromium은 메뉴의 `앱으로 설치`에서 시스템 설치를 요청하고, iPhone/iPad Safari는 공유 메뉴의 `홈 화면에 추가` 안내를 사용합니다. 설치 앱은 가로 방향을 우선하며 기본 강제 전체화면은 쓰지 않습니다.

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
- `npm run test:campaign`, `npm run test:intro`, `npm run test:platform`: 해당 흐름의 focused fixture
- `npm run check`: 모든 lint, format, domain fixture를 실행하는 완료 후보의 전체 검사
- `npm run format`: Prettier 적용
- `npm run format:check`: formatting 검사

## Visual QA

Visual QA는 특정 Agent나 scheduler 없이 Node.js와 설치된 Chromium browser path를 입력받아 동작합니다. 실제 창을 열고 지정 frame까지 진행한 뒤 PNG와 JSON metadata를 저장하고 browser를 닫습니다.

```powershell
$env:BROWSER_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run visual:qa -- --repo . --start combat-hit --phase active --renderer retro --frame 180 --output artifacts/visual-qa/combat-hit --width 1440 --height 810
```

지원하는 stable start에는 `scrap-intro-before`, `scrap-intro-awakening`, `scrap-intro-d30`,
`scrap-intro-after`와 region·robot·final scenario가 포함됩니다.
`--phase start|active|end`는 combat scenario의 원인·결과·정리 frame을 고정하며 생략 시
`active`입니다. `--renderer polygon|retro`로 같은 immutable RenderFrame의 투영을 선택하며 생략 시
기존 Retro capture를 유지합니다. Combat scenario는 event·pose·effect assertion과
player/enemy/contact metadata를 함께 남깁니다. 공간·도입 scenario는 stable patch, 제어핵·눈·결합
부품·D-30와 이용 가능한 연결로 metadata를 함께 고정합니다. 결과를 직접 열어 화면 의도, clipping,
Polygon/Retro parity와 console error를 확인합니다.

## GitHub Pages

Production은 별도 bundle 없이 `main /`의 static files를 제공합니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 자산: `index.html`, `offline.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `src/**/*.js`, `src/style.css`, `public/icons/**`
- Product Goal은 repository 문서이자 local server에서 열 수 있는 semantic HTML이며 게임 bootstrap에는 import되지 않습니다.
