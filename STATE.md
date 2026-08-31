# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`gap-analysis`

## Product Desired State Comparison

| Reference                | Status     | Current Evidence                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied  | Command owner가 Basic 12·Strong 24·guard 6·roll 18·block 34 비용, 0.45초 지연 뒤 초당 24 회복과 action별 exhausted 차단을 기록한다. Player/적 Strong은 느린 windup, 양방향 guard-break와 startup 피격 취소 transition을 가지며 120Hz trace, 실제 HUD·telegraph와 독립 verifier가 PASS했다.                                                                                                                                             |
| PG-COMBAT-FEEDBACK       | satisfied  | Neutral `PlayerMotionPose`와 82px shared foot authority에서 Player weapon·shield·hurt와 rendered body를 같은 pose로 만들고, blade↔weapon·torso↔hurt·hilt↔blade gap이 모두 0이다. 3-sample sweep 뒤 gap 0인 실제 polygon 교차만 contact로 승인하고 4px near-miss에는 contact position·part를 만들지 않는다. 7 pose·6 effect digest, 실제 120Hz hit, Polygon desktop·Retro 844×390 attack pose, console 0건과 fresh verifier가 PASS했다. |
| PG-WORLD-JOURNEY         | unverified | Stage별 story·Portal·HUD deterministic matrix는 PASS했지만, prepare→Field→Dungeon→Boss→보상→귀환을 debug 조작 없이 연속 완료하는 fresh runtime trace는 현재 evidence에 없다.                                                                                                                                                                                                                                                           |
| PG-WORLD-SPACE           | satisfied  | Academy Plaza는 생활 landmark와 실제 foreground를, 1200px Field/Canopy는 guardian combat glade와 실제 고저차 root 우회로를 가진다. 문·열린 길·뿌리 arch·석문·결정 계단의 70–92×100–112 개구부가 surface와 정렬되고 day/night/story route graph, camera travel, Polygon/Retro desktop/narrow 24 capture와 독립 verifier가 PASS했다.                                                                                                     |
| PG-GROWTH-CHOICE         | satisfied  | 첫 원정의 120 Gold로 학원촌에서 중량형 장비 또는 Command Lv.1 중 하나를 선택하며 훈련실을 건너뛴 인장 0 경로도 성립한다. 장비는 실제 거리·frame·경직·guard를, command는 연계 branch를 바꾸며 immutable transaction·중복 방지·reload·write failure probe와 verifier가 PASS했다.                                                                                                                                                         |
| PG-CHARACTER-READABILITY | satisfied  | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose의 현재 id/order/style/points digest를 durable fixture로 고정하고, 82px foot pivot에서 rendered body·hurt·검 연결을 수치 검증한다. Polygon/Retro desktop·844×390에서 Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향을 직접 판독했고 fresh verifier가 PASS했다.                                                                                              |
| PG-PLATFORM-ACCESS       | satisfied  | Desktop menu→game focus, 실제 keyboard Basic 비용, Polygon desktop·Retro 844×390과 console 0건이 current browser evidence로 PASS했다. Mobile adapter는 touch/pointer cancel·window blur·document hidden에서 held input을 clear하고 detach AbortSignal을 유지하며 durable platform check와 independent verifier가 PASS했다.                                                                                                             |
| PG-RECOVERY              | unverified | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단과 idempotent reward probe는 PASS했다. Room transition failure·stale command 차단·KO/reset 보상·shortcut invariant를 하나의 fresh failure-injection trace로 다시 확인할 evidence가 필요하다.                                                                                                                                                                     |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                                                                                                            |
| Module Boundaries                    | satisfied | `GameScene`은 map·equipment catalog·combat progression profile을 모두 명시 주입받고 concrete authored profile을 import하지 않는다. `GameApp` composition root와 test fixture만 frozen catalog/rule을 조립하며 direct-import regression check와 independent verifier가 PASS했다.                                                                                                       |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                                                                                                                  |
| State Ownership and Data Flow        | satisfied | `PLAYER_CHARACTER_FOOT_OFFSET=82`가 gameplay position·shared combat geometry·presentation foot pivot의 단일 authority다. `SharedCombatGeometry`가 Player/enemy weapon·shield·hurt와 bounded sweep을 immutable DTO로 계산하고 semantic contact part·실제 교점을 단독 판정한다. Encounter gameplay와 Polygon/Retro presentation이 같은 contract를 읽으며 기존 domain writer도 유지된다. |
| Rendering and Input                  | satisfied | Frozen input·renderer read-only·focus·reduced-motion 계약을 유지한다. `MobileInputAdapter`가 pointer/touch cancel, blur, hidden visibility와 detach를 하나의 AbortSignal lifecycle로 처리하며 platform probe와 fresh verifier의 actual EventTarget probe가 PASS했다.                                                                                                                  |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                                                                                        |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                                                                                                |
| Testing and Independent Verification | gap       | Full `npm run check`, `git diff --check`, current in-app Browser Polygon desktop·Retro 844×390 combat-hit·console 0건과 authored-content/mobile interruption durable checks가 PASS했고 최초 FAIL을 낸 verifier가 수리를 독립 PASS했다. 다만 debug-free 연속 원정과 transition/KO failure recovery를 current execution으로 묶는 evidence가 없다.                                       |

## Active Execution Goal

`EG-FIRST-JOURNEY-RUNTIME-RECOVERY-TRACE`

- Mapping: PG-WORLD-JOURNEY, PG-RECOVERY, Persistence and Recovery, Testing and Independent Verification.
- Gap: stage별 deterministic snapshot은 있지만 prepare→Field→Dungeon→Boss→보상→shortcut 귀환의 debug-free 연속 trace와 Room transition failure·stale input·KO/reset 보상 invariant을 current evidence로 확인하지 못했다.
- Scope: actual public command/trigger로 첫 원정을 연속 진행하는 deterministic/runtime trace와 transition/KO failure injection을 추가하고, 결함이 나오면 같은 Goal 안에서 소유 경계를 수리한다. 새 story·map·reward는 만들지 않는다.
- Verification: public-flow 120Hz trace, failure/reload invariants, full `npm run check`, in-app Browser 연속 flow smoke, fresh read-only verifier.

## Blockers

없음. 현재 Gap은 외부 판단 없이 수리·검증 가능하다.
