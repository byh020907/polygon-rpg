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

메인 메뉴에서 `새 게임 시작`을 선택하면 학원촌에서 시작합니다.

| Action              | Keyboard             | Mobile         |
| ------------------- | -------------------- | -------------- |
| 이동                | `← / →`              | 방향 pad       |
| Jump / Guard / Roll | `↑ / ↓`, 이동 중 `↓` | 방향 pad       |
| Basic / Strong      | `A / S`              | `X / Y`        |
| Combo branch        | `AA / AS / SA`       | `XX / XY / YX` |

Portal 범위에서 `↑`를 누르면 연결된 Room으로 이동합니다. 장비 선택, Field·Dungeon·Boss 원정, 보상과 shortcut 귀환은 같은 gameplay runtime에서 이어집니다.

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
npm run visual:qa -- --repo . --start dungeon --frame 180 --output artifacts/visual-qa/manual-dungeon --width 1440 --height 810
```

지원하는 stable start는 `academy`, `training`, `field`, `dungeon`, `boss`, `glasswind-field`, `glasswind-dungeon`, `glasswind-boss`입니다. 결과를 직접 열어 화면 의도, clipping, Polygon/Retro parity와 console error를 확인합니다.

## GitHub Pages

Production은 별도 bundle 없이 `main /`의 static files를 제공합니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 대상: `index.html`, `.nojekyll`, `src/**/*.js`, `src/style.css`
- Product Goal은 repository 문서이자 local server에서 열 수 있는 semantic HTML이며 게임 bootstrap에는 import되지 않습니다.
