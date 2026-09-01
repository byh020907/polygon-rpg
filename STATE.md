# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`inbox-processing`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 guard 유지 초당 10, authored attack별 block drain과 부족 시 break를 단독 기록한다. Guard 시작 7/60초 안의 guardable contact는 drain 없이 +36을 회복하고 22/60초 동안 새 Basic만 전용 `shieldBash`로 소비한다. Counter recovery까지 이동·jump·roll·guard·Strong·cancel/queue를 막고 stale sequence를 재생하지 않는 120Hz keyboard/touch trace와 fresh verifier가 PASS했다.      |
| PG-COMBAT-FEEDBACK       | satisfied | Shared pose/geometry가 Player weapon·shield·hurt와 rendered body를 같은 좌표로 만들고 gap 0인 실제 polygon 교차만 승인한다. Just guard는 immutable shield contact에 방패 섬광·원형 파동·8-way spark·hit-stop·stamina +표시를, counter는 실제 shield↔hurt contact와 전용 pose/impact를 만든다. Polygon/Retro × desktop/844×390 × start/active/end 24조합, 실제 판독과 console 0건이 PASS했다.   |
| PG-WORLD-JOURNEY         | satisfied | Story owner가 모든 대화를 authored world anchor와 28 chars/s·문장부호 pause로 순차 reveal한다. reveal 중 jump는 현재 줄만 완성하고 다음 새 sequence만 advance/close하며 Player jump를 억제한다. Production keyboard first-journey 120Hz trace, Polygon/Retro desktop·844×390 start/mid/end와 독립 verifier가 PASS했다.                                                                         |
| PG-WORLD-SPACE           | satisfied | Academy Plaza는 생활 landmark와 실제 foreground를, 1200px Field/Canopy는 guardian combat glade와 실제 고저차 root 우회로를 가진다. 문·열린 길·뿌리 arch·석문·결정 계단의 70–92×100–112 개구부가 surface와 정렬되고 day/night/story route graph, camera travel, Polygon/Retro desktop/narrow 24 capture와 독립 verifier가 PASS했다.                                                             |
| PG-GROWTH-CHOICE         | satisfied | 첫 원정의 120 Gold로 학원촌에서 중량형 장비 또는 Command Lv.1 중 하나를 선택하며 훈련실을 건너뛴 인장 0 경로도 성립한다. 장비는 실제 거리·frame·경직·guard를, command는 연계 branch를 바꾸며 immutable transaction·중복 방지·reload·write failure probe와 verifier가 PASS했다.                                                                                                                 |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose의 현재 id/order/style/points digest를 durable fixture로 고정하고, 82px foot pivot에서 rendered body·hurt·검 연결을 수치 검증한다. Polygon/Retro desktop·844×390에서 Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향을 직접 판독했고 fresh verifier가 PASS했다.                                                      |
| PG-PLATFORM-ACCESS       | satisfied | 844×390에서 active bubble은 x=276.8..576.8·bottom=239.3으로 화자·Player·control을 가리지 않고, available 공방 chip은 108.7px로 canvas safe inset 안에 남는다. Partial text는 aria-hidden이고 full line만 polite status로 제공한다. Keyboard/touch parity, pointer cleanup, Polygon/Retro actual render와 독립 verifier가 PASS했다.                                                             |
| PG-RECOVERY              | satisfied | Map commit 뒤 destination add, source exit와 teardown 뒤 예외를 던지는 source dispose failure를 각각 주입했다. source location·position·camera와 fresh attached Room을 복구하고 실패 중 jump/Strong을 재생하지 않은 채 재시도한다. KO는 held input 기준선을 소비하고 checkpoint의 fresh Room에서 회복하며 Boss·120 Gold·reward trigger 비활성·shortcut을 보존했고 focused verifier가 PASS했다. |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                                                                                                               |
| Module Boundaries                    | satisfied | `GameApp` composition root가 map·equipment·progression과 encounter scene/profile/factory를 조립해 `GameScene`→`RoomNode`→encounter/presentation에 명시 전달한다. Leaf의 concrete authored import 0건, exact prior import fixture와 full runtime을 포함한 durable boundary check 및 fresh verifier가 PASS했다.                                                                            |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                                                                                                                     |
| State Ownership and Data Flow        | satisfied | `CombatCommandController`가 stamina, guard elapsed, just-guard/counter window와 action lock transition의 final writer다. Encounter는 authored stamina damage와 exact shared contact만 전달하고 `GameScene`은 immutable result를 적용한다. Presentation은 JUST_GUARD/COUNTER event를 읽을 뿐 판정을 다시 계산하지 않는다. Story·geometry·UI의 기존 owner 경계도 current probe를 유지한다. |
| Rendering and Input                  | satisfied | Production keyboard/touch가 같은 typewriter complete→advance→close sequence를 만들고 `GameApp`이 960×540 camera view를 world-anchor projection에 명시 전달한다. Active bubble과 available chip은 renderer와 무관하게 같은 화자를 가리키며 partial text를 반복 announce하지 않는다. Input cleanup·focus·reduced-motion 기존 계약과 current in-app Browser 판독이 PASS했다.                |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                                                                                           |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                                                                                                   |
| Testing and Independent Verification | satisfied | Full `npm run check`와 `git diff --check`, guard hold·위력별 drain·7/60 경계·+36 회복·22/60 lock·실제 shield contact·counter recovery fixture가 PASS했다. in-app Browser 24조합과 실제 keyboard/touch Basic parity는 console 0건이었다. Independent verifier가 shieldBash recovery 이동/jump 재개 결함을 찾아냈고 수리본 전체를 최종 PASS했다.                                           |

## Active Execution Goal

`EG-SWORD-ENCHANTMENT-EVENT-WORLD-CLOCK`

- Mapping: 병렬 INBOX로 들어온 검 인챈트와 사건 기반 World Clock/Deadline feedback을 다음 fresh tick에서 Product·Engineering Desired State에 먼저 반영한다.
- Current Gap: 이번 tick의 just-guard candidate가 독립 검증된 뒤 새 feedback이 `origin/main`에 도착했다. 원문을 보존했으며 아직 Desired State나 제품에 반영하지 않았다.
- Scope: reference는 복제 없이 원칙 수준으로 조사하고, enchant weakness/resistance·상태 효과·확정 재료 교체와 authored Travel Segment·event-driven time cost·deterministic Chunk reconstruction·Crisis/recovery를 현재형 Product/Architecture 계약으로 확정한다. 구현은 dependency와 독립 검증 단위에 따라 가장 작은 완전한 제품 Goal부터 선택한다.
- Verification: deterministic enchant/status/time/Deadline/Chunk/recovery fixture, 실제 keyboard/touch journey, Polygon/Retro desktop/narrow와 independent verifier를 사용한다.

## Blockers

없음. Human이 실제 제품을 사용하고 새 feedback이 있으면 `INBOX.md`에 반영한다.
