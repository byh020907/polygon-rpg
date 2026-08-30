# Alpine.js UI Architecture

이 문서는 메인 메뉴, 게임 HUD, Render Lab과 GameApp 사이의 UI 계약을 소유한다.

## Bootstrap

`src/main.js`는 저장소에 vendoring한 Alpine.js `3.14.9` ES Module을 `src/vendor/alpine.esm.js`에서 가져온다. `GameApp`과 `gameShell`을 등록한 다음 `Alpine.start()`를 호출한다.

```text
index.html
    ↓
src/main.js
    ├─ GameApp root Node 생성
    │  └─ GameScene Scene instance 조립
    ├─ Alpine.data("gameShell") 등록
    └─ Alpine.start()
```

빌드는 추가하지 않는다. npm의 Alpine package는 vendored 파일 갱신·감사용 devDependency이며 실제 브라우저는 `src/vendor/alpine.esm.js`만 로드한다. 외부 CDN이나 모바일 네트워크 연결은 필요하지 않다.

`index.html`은 Alpine 초기화 전에 보이는 정적 `.app-loading`을 제공한다. Alpine이 시작되면 `x-init`이 이를 제거한다. bootstrap이 실패해도 `[x-cloak]` 뒤의 검은 빈 화면 대신 로딩·재시도 안내를 유지한다.

## Screen State

`gameShell`이 다음 화면 상태의 단일 쓰기 주체다.

```text
menu
game
render-lab
```

Orca 원격 작업에서는 메뉴의 `모바일 조작으로 시작` intent가 `forceMobileControls` presentation flag를 켠다. 이 flag는 gameplay snapshot에 포함되지 않으며 viewport나 pointer media query와 관계없이 조작 패드 표시만 강제한다.

`index.html`은 `x-data`, `x-show`, `x-model`, `x-text`, `x-bind`와 `@click`으로 화면과 control을 선언한다. `innerHTML`, `classList` 또는 버튼별 수동 listener로 UI를 변경하지 않는다.

## UI Bridge

Alpine 컴포넌트는 GameApp 내부 필드를 직접 수정하지 않는다. GameApp도 Alpine 객체와 DOM control을 직접 탐색하지 않는다.

```text
Alpine gameShell
    │
    ├─ snapshot() ───────→ GameApp
    ├─ startGame() ──────→ GameApp.enterGame()
    ├─ screen change ────→ GameApp.onScreenChanged()
    ├─ runtime stats ←──── GameApp stats writer
    ├─ player status ←──── GameScene Signal → GameApp writer
    └─ world status ←───── GameScene Signal → GameApp writer
```

Bridge snapshot은 화면 상태와 Render Lab 설정만 가진 평평한 읽기 전용 DTO다. 물리, 캐릭터 위치와 전투 상태는 UI snapshot에 넣지 않는다.

Render Lab의 Animation Speed는 UI bridge snapshot에 존재하지만 `GameApp`이 별도 frozen Simulation Settings DTO로 분류한다. Keyboard/Mobile Gameplay Input Snapshot과 합치지 않는다.

학원촌의 장비 선택 panel은 Alpine `gameShell`이 선언적으로 렌더한다. Button은 `GameApp.selectEquipment(profileId)` → `GameScene.selectEquipment(profileId)` direct command를 호출하고, 선택 완료 결과는 `GameStatus` world status Signal이 `equipmentId/label`로 다시 표시한다. UI는 combat timing과 range를 직접 쓰지 않는다.

지역명, 목표와 시간대는 GameScene이 소유한 읽기 전용 world status를 `GameStatus` child Node가 변화 시에만 Signal로 발행하고 GameApp writer가 Alpine에 전달한다. Player HP도 같은 경계를 사용하므로 GameApp과 Alpine이 GameScene field를 직접 읽지 않는다. Alpine은 값을 표시만 하며 map runtime을 직접 수정하지 않는다. Render Lab의 낮/밤 전환은 GameApp 공개 intent를 거쳐 GameScene world time을 변경한다.

## In-Game HUD

게임 HUD는 참고 화면처럼 Canvas 좌상단을 적게 차지하는 presentation overlay다.

- HP, STAMINA, MENTAL은 얇은 3단 meter로 표시한다.
- MONEY는 meter 아래 한 줄, 도구 수량은 meter 오른쪽에 표시한다.
- 메뉴는 Canvas 우상단의 작은 버튼으로 유지한다.
- 지역명은 상단 중앙, 현재 목표는 좌하단 한 줄로 표시한다.
- 학원촌에서는 우상단에 균형형/중량형 장비 card를 표시하고 active 선택을 명확히 구분한다.
- HUD 값과 표시 여부는 Alpine `gameShell`이 소유하고 GameScene/Renderer에 넣지 않는다.
- HUD 크기 조정은 Canvas world scale, 캐릭터 크기 또는 gameplay 판정에 영향을 주지 않는다.

## Mobile Controls

Alpine `gameShell`은 하나의 control catalog에서 모바일 방향 pad와 action pad를 렌더링한다. 버튼에는 공통 action을 나타내는 `data-mobile-action`만 선언하고, 실제 pointer/touch event와 held/sequence 상태는 `MobileInputAdapter`가 소유한다.

- UI는 action ID를 DOM dataset으로만 노출한다.
- 버튼은 gameplay state나 keyboard event를 직접 만들지 않는다.
- 모바일 control의 표시와 반응형 배치는 CSS presentation 책임이다.
- 모바일 action pad는 기본공격 X와 강한공격 Y 두 버튼만 표시하고 작은 command guide로 지상/공중 `XX/XY/YX` branch를 안내한다.
- 메뉴의 모바일 진입 경로는 데스크톱 크기의 Orca 원격 viewport에서도 control 표시를 강제할 수 있다.
- 세부 입력·해제 계약은 `docs/input-system.md`를 따른다.

메뉴·화면 전환 버튼은 접근 가능한 `click`을 기본 경로로 사용하고, 모바일 webview가 합성 click을 누락하는 경우를 위해 `touchend.prevent`를 동일 intent에 연결한다. gameplay control의 멀티터치 계약과 화면 전환 UI의 단발성 touch fallback은 서로 분리한다.

## Lifecycle

- `menu → game`: GameScene을 spawn 상태로 reset하고, DOM 갱신 다음 frame에 Canvas 크기를 다시 측정한다.
- `menu → render-lab`: 현재 GameScene을 유지하고 Polygon/Retro 비교 Canvas를 활성화한다.
- `game/render-lab → menu`: 입력을 비우고 simulation 진행을 멈춘다.
- `page destroy`: animation frame, input listener와 ResizeObserver를 해제한다.

GameApp은 runtime scene tree의 root Node다. `start()`는 tree enter, `destroy()`는 children-first tree exit를 요청한다. GameScene status/render Signal connection, browser listener, input adapter와 ResizeObserver는 이 lifecycle에서 함께 연결·정리된다. 세부 순서와 Signal 규칙은 [`runtime-architecture.md`](./runtime-architecture.md)가 소유한다.

## Reference Adoption

- Ball Fight Simulator: Alpine 선언형 binding, `x-cloak`, UI action과 App 공개 API 분리
- Baeseongjin: mode menu 이후 App 시작, 메뉴 복귀 시 App lifecycle 정리

현재 화면 수가 적으므로 Ball Fight Simulator의 전역 `uiManager`와 template loader는 도입하지 않는다. 둘 이상의 화면에서 같은 독립 상태·수명주기가 반복될 때만 Alpine 컴포넌트를 추가 분리한다.
