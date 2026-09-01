# Polygon RPG

검과 방패의 기본기, guard·roll·launcher·공중 연계와 마을에서 출발하는 원정을 중심으로 만드는 browser 2D action RPG입니다. 하나의 gameplay state를 Canvas Polygon과 Retro Pixel renderer가 함께 표시합니다.

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

메인 메뉴에서 `게임 시작 / 계속하기`를 선택하면 왕국 외곽의 첫 고철 수거 의뢰에서 시작합니다.
폐병기 안 제어장치에 접근해 `↑`로 직접 회수하면 고철 대왕 각성과 D-30 고지가 실제 gameplay
안에서 이어지고, 완료한 각성 stage는 browser-local 진행에 저장됩니다.

| Action              | Keyboard             | Mobile         |
| ------------------- | -------------------- | -------------- |
| 이동                | `← / →`              | 방향 pad       |
| Jump / Guard / Roll | `↑ / ↓`, 이동 중 `↓` | 방향 pad       |
| Basic / Strong      | `A / S`              | `X / Y`        |
| Combo branch        | `AA / AS / SA`       | `XX / XY / YX` |

상호작용 범위에서 `↑`를 누르면 제어장치 회수나 대화를 우선 처리하고, Portal 범위에서는 연결된
Room으로 이동합니다. 장비 선택, Field·Dungeon·Boss 원정, 보상과 shortcut 귀환은 같은 gameplay
runtime에서 이어집니다.

## 모바일 검증

Windows에서는 `cloudflared`를 한 번 설치한 뒤 local server와 임시 tunnel을 함께 사용할 수 있습니다.

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
- `npm run check`: lint와 formatting 검사
- `npm run format`: Prettier 적용
- `npm run format:check`: formatting 검사

## Visual QA

Visual QA는 특정 Agent나 scheduler 없이 Node.js와 설치된 Chromium browser path를 입력받아 동작합니다. 실제 창을 열고 지정 frame까지 진행한 뒤 PNG와 JSON metadata를 저장하고 browser를 닫습니다.

```powershell
$env:BROWSER_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run visual:qa -- --repo . --start combat-hit --phase active --renderer retro --frame 180 --output artifacts/visual-qa/combat-hit --width 1440 --height 810
```

지원하는 stable start에는 `scrap-intro-before`, `scrap-intro-awakening`, `scrap-intro-d30`,
`scrap-intro-after`와 기존 academy·field·dungeon·boss·combat·pose scenario가 포함됩니다.
`--phase start|active|end`는 combat scenario의 원인·결과·정리 frame을 고정하며 생략 시
`active`입니다. `--renderer polygon|retro`로 같은 immutable RenderFrame의 투영을 선택하며 생략 시
기존 Retro capture를 유지합니다. Combat scenario는 event·pose·effect assertion과
player/enemy/contact metadata를 함께 남깁니다. 공간·도입 scenario는 stable patch, 제어장치·눈·결합
부품·D-30와 이용 가능한 Portal metadata를 함께 고정합니다. 결과를 직접 열어 화면 의도, clipping,
Polygon/Retro parity와 console error를 확인합니다.

## GitHub Pages

Production은 별도 bundle 없이 `main /`의 static files를 제공합니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 대상: `index.html`, `.nojekyll`, `src/**/*.js`, `src/style.css`
- Product Goal은 repository 문서이자 local server에서 열 수 있는 semantic HTML이며 게임 bootstrap에는 import되지 않습니다.
