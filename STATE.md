# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 Basic 12·Strong 24·guard 6·roll 18·block 34 비용, 0.45초 지연 뒤 초당 24 회복과 action별 exhausted 차단을 기록한다. Player/적 Strong은 느린 windup, 양방향 guard-break와 startup 피격 취소 transition을 가지며 120Hz trace, 실제 HUD·telegraph와 독립 verifier가 PASS했다.                                                                                             |
| PG-COMBAT-FEEDBACK       | satisfied | 7 feedback의 start/active/end를 Polygon/Retro와 desktop/narrow에서 재현했다. hit·block·punish·launch effect는 immutable event contact를 직접 중심으로 쓰며 effect centroid assertion, landing ground·boot-bottom assertion과 수리 후 fresh verifier PASS가 있다.                                                                                                                       |
| PG-WORLD-JOURNEY         | satisfied | Academy의 세라·공방에서 출발해 Field 출정 표식, Dungeon 관문·checkpoint 기록석, Boss 결과·보상 잔향과 귀환한 세라 반응까지 progression별 named dialogue가 이어진다. 120Hz stage matrix가 locked/stale target, jump 단일 소비, Portal·HUD 정합을 고정했고 Polygon/Retro desktop/narrow와 독립 verifier가 PASS했다.                                                                      |
| PG-WORLD-SPACE           | satisfied | Academy Plaza는 생활 landmark와 실제 foreground를, 1200px Field/Canopy는 guardian combat glade와 실제 고저차 root 우회로를 가진다. 문·열린 길·뿌리 arch·석문·결정 계단의 70–92×100–112 개구부가 surface와 정렬되고 day/night/story route graph, camera travel, Polygon/Retro desktop/narrow 24 capture와 독립 verifier가 PASS했다.                                                     |
| PG-GROWTH-CHOICE         | satisfied | 첫 원정의 120 Gold로 학원촌에서 중량형 장비 또는 Command Lv.1 중 하나를 선택하며 훈련실을 건너뛴 인장 0 경로도 성립한다. 장비는 실제 거리·frame·경직·guard를, command는 연계 branch를 바꾸며 immutable transaction·중복 방지·reload·write failure probe와 verifier가 PASS했다.                                                                                                         |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                                                                                                                    |
| PG-PLATFORM-ACCESS       | satisfied | `ScreenFocusOwner`가 menu→game/render-lab 진입 focus와 launcher 복귀를 sequence로 소유하고 stale·same-screen 요청을 거부한다. Canvas가 지역·목표·진행·동적 vitals·combat을 가진 semantic status region을 참조하며 editable control Arrow와 native button activation이 gameplay input과 충돌하지 않는다. 844×390, reduced-motion Polygon/Retro, console 0건과 독립 verifier가 PASS했다. |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                                                                                                                |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                                                                 |
| Module Boundaries                    | gap       | UI screen/focus는 injected focus port를 가진 plain owner가 소유하고 `GameApp`은 DOM focus policy를 알지 않는다. UI의 immutable status DTO·public command와 injected Map query도 유지한다. 다만 `GameScene`이 combat·animation·progression 조립을 집중 소유하고 encounter가 presentation geometry를 import하는 Gap은 남아 있다.             |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                                                                       |
| State Ownership and Data Flow        | gap       | Progression owner가 Gold 지갑, 소유·장착·해금·부족 사유를 immutable transaction으로 단독 판정하고 `GameScene`은 commit 후 journey/region owner를 같은 snapshot으로 복원해 stale Gold writer를 막는다. Story/combat owner 분리는 유지되지만 shared combat geometry neutral owner는 아직 없다.                                               |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame과 read-only Polygon/Retro pipeline을 유지한다. Focus가 사라지는 screen 전환을 제거했고 Render Lab range input은 Arrow를 직접 받으며 Space/Enter native activation은 gameplay에 매핑되지 않는다. Reduced motion은 camera feedback만 끄고 contact·reaction·semantic combat status를 유지한다. |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                                             |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                                                     |
| Testing and Independent Verification | satisfied | `npm run check`가 combat·story·map·growth와 새 platform probe를 실행한다. Focus entry/return·stale rejection, Canvas 대체 status, keyboard control boundary와 reduced-motion QA request를 DOM 없이 고정했다. in-app Browser desktop/844×390 6 capture, console 0건과 fresh read-only verifier가 PASS했다.                                  |

## Active Execution Goal

### EG-SHARED-COMBAT-GEOMETRY

- Desired-State mapping: Architecture `Module Boundaries`, `State Ownership and Data Flow`, `Shared Combat Geometry`, `Combat, Time and Contact Contracts`; Product `PG-COMBAT-CONTROL`, `PG-COMBAT-FEEDBACK` 회귀 방지.
- Gap evidence: `GameScene`은 Player hit 승인을 위해 `createPlayerCombatPresentationItems()`에서 sword item polygon을 다시 찾고, `TrainingEncounterNode`는 enemy hurt·weapon contact와 hit reaction 길이를 얻기 위해 `TrainingEncounterPresentation`을 직접 import한다. Gameplay contact authority가 neutral geometry contract가 아니라 presentation item ID와 생성 순서에 의존한다.
- Scope: pose와 gameplay dimension에서 Player/enemy weapon·shield·hurt 및 bounded swept-contact geometry를 계산하는 neutral owner를 만든다. Encounter hit 승인과 RenderFrame builder가 같은 immutable geometry DTO를 읽게 하고 presentation import를 encounter에서 제거한다. 현재 timing·damage·contact 위치와 Polygon/Retro 출력은 유지한다.
- Non-scope: 새 공격·적·balance·시각 스타일, broader `GameScene` orchestration 분해, world/story/growth 변경.
- Verification: DOM 없는 Player/enemy geometry·sweep·contact fixture, forbidden presentation import 검사, 기존 120Hz combat trace와 contact/effect assertion, Polygon/Retro contact matrix, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
