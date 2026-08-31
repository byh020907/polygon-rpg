# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`recompare`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 Basic 12·Strong 24·guard 6·roll 18·block 34 비용, 0.45초 지연 뒤 초당 24 회복과 action별 exhausted 차단을 기록한다. Player/적 Strong은 느린 windup, 양방향 guard-break와 startup 피격 취소 transition을 가지며 120Hz trace, 실제 HUD·telegraph와 독립 verifier가 PASS했다.                                                                                             |
| PG-COMBAT-FEEDBACK       | satisfied | Player/enemy weapon·shield·hurt와 3-sample sweep이 같은 immutable semantic geometry DTO에서 판정·표현되고 실제 polygon 교점이 유한 contact position으로 effect에 전달된다. 7 feedback의 Polygon/Retro desktop/narrow 재현, effect anchor assertion, 실제 120Hz hit event와 수리 후 fresh verifier가 PASS했다.                                                                          |
| PG-WORLD-JOURNEY         | satisfied | Academy의 세라·공방에서 출발해 Field 출정 표식, Dungeon 관문·checkpoint 기록석, Boss 결과·보상 잔향과 귀환한 세라 반응까지 progression별 named dialogue가 이어진다. 120Hz stage matrix가 locked/stale target, jump 단일 소비, Portal·HUD 정합을 고정했고 Polygon/Retro desktop/narrow와 독립 verifier가 PASS했다.                                                                      |
| PG-WORLD-SPACE           | satisfied | Academy Plaza는 생활 landmark와 실제 foreground를, 1200px Field/Canopy는 guardian combat glade와 실제 고저차 root 우회로를 가진다. 문·열린 길·뿌리 arch·석문·결정 계단의 70–92×100–112 개구부가 surface와 정렬되고 day/night/story route graph, camera travel, Polygon/Retro desktop/narrow 24 capture와 독립 verifier가 PASS했다.                                                     |
| PG-GROWTH-CHOICE         | satisfied | 첫 원정의 120 Gold로 학원촌에서 중량형 장비 또는 Command Lv.1 중 하나를 선택하며 훈련실을 건너뛴 인장 0 경로도 성립한다. 장비는 실제 거리·frame·경직·guard를, command는 연계 branch를 바꾸며 immutable transaction·중복 방지·reload·write failure probe와 verifier가 PASS했다.                                                                                                         |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                                                                                                                    |
| PG-PLATFORM-ACCESS       | satisfied | `ScreenFocusOwner`가 menu→game/render-lab 진입 focus와 launcher 복귀를 sequence로 소유하고 stale·same-screen 요청을 거부한다. Canvas가 지역·목표·진행·동적 vitals·combat을 가진 semantic status region을 참조하며 editable control Arrow와 native button activation이 gameplay input과 충돌하지 않는다. 844×390, reduced-motion Polygon/Retro, console 0건과 독립 verifier가 PASS했다. |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                                                                                                                |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                                                                                                                          |
| Module Boundaries                    | gap       | `TrainingEncounterNode`는 presentation import와 item ID 판정을 제거하고 semantic combat geometry만 읽으며 enemy renderer 조립은 `GameScene` presentation 경계로 이동했다. UI·progression·map public boundary도 유지한다. 다만 `GameScene` 안에 Player pose/IK, character item과 combat effect presentation builder가 집중되어 Animation/Presentation Geometry 책임을 직접 수행하는 Gap은 남아 있다. |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                                                                                                                                |
| State Ownership and Data Flow        | satisfied | `SharedCombatGeometry`가 pose·gameplay dimension에서 Player/enemy weapon·shield·hurt와 bounded sweep을 immutable DTO로 계산하고 semantic contact part·실제 교점을 단독 판정한다. Encounter gameplay와 Polygon/Retro presentation이 같은 contract를 읽으며 progression, story, map과 combat command의 기존 단일 writer도 유지된다.                                                                   |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame과 read-only Polygon/Retro pipeline을 유지한다. Focus가 사라지는 screen 전환을 제거했고 Render Lab range input은 Arrow를 직접 받으며 Space/Enter native activation은 gameplay에 매핑되지 않는다. Reduced motion은 camera feedback만 끄고 contact·reaction·semantic combat status를 유지한다.                                                          |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                                                                                                      |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                                                                                                              |
| Testing and Independent Verification | satisfied | `npm run check`가 shared geometry, 실제 120Hz GameScene contact, stamina·guard-break·Strong interrupt, story·map·growth·platform probe를 실행한다. edge-only polygon 교차와 null enemy 회귀 fixture를 추가했고 `git diff --check`, in-app Browser Polygon/Retro desktop·844×390 contact, console 0건과 수리 후 fresh read-only verifier가 PASS했다.                                                 |

## Active Execution Goal

### EG-PLAYER-COMBAT-PRESENTATION-BOUNDARY

- Desired-State mapping: Architecture `Module Boundaries`, `Animation / Presentation Geometry`, `Rendering and Presentation Contracts`; Product `PG-COMBAT-FEEDBACK`, `PG-CHARACTER-READABILITY`, `PG-PLATFORM-ACCESS` 회귀 방지.
- Gap evidence: `GameScene.js`가 Player target pose와 bone pose를 직접 sample하고 `createCharacterItems`, block/hit/evade/punish effect builder와 item depth/style projection까지 소유한다. Game Orchestrator가 immutable RenderFrame을 조립하는 범위를 넘어 Animation/Presentation Geometry와 renderer-facing item 생성 책임을 집중 수행한다.
- Scope: Player pose/IK·character item과 combat effect projection을 browser API와 mutable gameplay를 모르는 plain presentation owner로 분리한다. `GameScene`은 gameplay snapshot, shared combat geometry와 immutable event를 전달해 RenderFrame을 조립하고 Polygon/Retro는 같은 output을 유지한다.
- Non-scope: combat timing·damage·balance, Player/encounter state ownership, map/story/growth, renderer 스타일 재설계와 새 visual feature.
- Verification: forbidden presentation-builder ownership/import 검사, fixed pose·effect item parity fixture, 기존 shared geometry·120Hz combat trace와 full `npm run check`, Polygon/Retro desktop/narrow pose/contact matrix, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
