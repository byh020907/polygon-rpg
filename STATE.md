# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`gap-analysis`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 guard 유지 초당 10, authored attack별 block drain과 부족 시 break를 단독 기록한다. Guard 시작 7/60초 안의 guardable contact는 drain 없이 +36을 회복하고 22/60초 동안 새 Basic만 전용 `shieldBash`로 소비한다. Counter recovery까지 이동·jump·roll·guard·Strong·cancel/queue를 막고 stale sequence를 재생하지 않는 120Hz keyboard/touch trace와 fresh verifier가 PASS했다.      |
| PG-COMBAT-FEEDBACK       | satisfied | Shared pose/geometry가 Player weapon·shield·hurt와 rendered body를 같은 좌표로 만들고 gap 0인 실제 polygon 교차만 승인한다. Just guard는 immutable shield contact에 방패 섬광·원형 파동·8-way spark·hit-stop·stamina +표시를, counter는 실제 shield↔hurt contact와 전용 pose/impact를 만든다. Polygon/Retro × desktop/844×390 × start/active/end 24조합, 실제 판독과 console 0건이 PASS했다.   |
| PG-COMBAT-ENCHANT        | gap       | 단일 검 인챈트, 네 속성 affinity·상태 축적/효과, 확정 material 해금·대장간 교체와 방패치기 제외가 새 Desired State로 확정됐지만 current combat/progression에는 아직 구현 evidence가 없다.                                                                                                                                                                                                      |
| PG-WORLD-JOURNEY         | satisfied | Story owner가 모든 대화를 authored world anchor와 28 chars/s·문장부호 pause로 순차 reveal한다. reveal 중 jump는 현재 줄만 완성하고 다음 새 sequence만 advance/close하며 Player jump를 억제한다. Production keyboard first-journey 120Hz trace, Polygon/Retro desktop·844×390 start/mid/end와 독립 verifier가 PASS했다.                                                                         |
| PG-WORLD-SPACE           | satisfied | Academy Plaza는 생활 landmark와 실제 foreground를, 1200px Field/Canopy는 guardian combat glade와 실제 고저차 root 우회로를 가진다. 문·열린 길·뿌리 arch·석문·결정 계단의 70–92×100–112 개구부가 surface와 정렬되고 day/night/story route graph, camera travel, Polygon/Retro desktop/narrow 24 capture와 독립 verifier가 PASS했다.                                                             |
| PG-WORLD-TIME            | gap       | Fixed-step 실시간 경과를 제거하고 authored Travel Segment 성공, training·guardian·Boss·KO에서만 Clock/Deadline을 commit한다. 기술 Room·idle·취소 transition 0비용, shortcut 감소, 사건 연장/idempotence, v2→v3·reload, same-context Chunk rebuild와 HUD를 deterministic probe·in-app Browser·fresh verifier가 PASS했다. Crisis 전체 Chunk 대응·핵심 방어 사건·실패 rewind는 아직 없다.         |
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
| Enchantment Domain                   | gap       | 단일 active enchant와 material transaction, affinity/status final writer·shield 제외 경계가 Architecture에 추가됐지만 구현은 아직 없다.                                                                                                                                                                                                                                                  |
| World Time and Chunk Reconstruction  | gap       | Pure immutable World Time owner와 composition-injected authored profile이 Clock·Deadline·Crisis flag를 쓰고 Map Runtime은 context만 읽는다. Travel completion 뒤 commit, event idempotence, shortcut cost, persistence와 deterministic reload는 PASS했다. Crisis patch·active Chunk 재구성, defense failure rewind와 expedition reward rollback은 남아 있다.                             |
| Rendering and Input                  | satisfied | Production keyboard/touch가 같은 typewriter complete→advance→close sequence를 만들고 `GameApp`이 960×540 camera view를 world-anchor projection에 명시 전달한다. Active bubble과 available chip은 renderer와 무관하게 같은 화자를 가리키며 partial text를 반복 announce하지 않는다. Input cleanup·focus·reduced-motion 기존 계약과 current in-app Browser 판독이 PASS했다.                |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                                                                                           |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                                                                                                   |
| Testing and Independent Verification | satisfied | Full `npm run check`와 `git diff --check`가 PASS했다. 새 world-time fixture는 120Hz idle·기술 Room·실패 transition 0비용, travel/event/KO 단일 비용, shortcut 감소, Deadline 연장·Crisis 경계, v1/v2 migration·v3 round-trip과 same-context Chunk rebuild를 고정한다. in-app Browser desktop/844×390 HUD와 console 0건, fresh read-only verifier가 current slice를 PASS했다.             |

## Active Execution Goal

`EG-WORLD-CLOCK-CRISIS-REWIND`

- Mapping: `PG-WORLD-TIME`, Architecture의 World Time Domain·World/Map·Persistence/Recovery 계약.
- Current Gap: World Clock·Deadline action ledger와 deterministic Chunk context는 구현됐지만 Deadline 0에서 모든 Chunk의 Crisis 대응 상태, 핵심 방어 사건, 실패 시 최근 핵심 사건 직후 rewind와 meta progression/미귀환 보상 분리 evidence가 없다.
- Scope: Crisis context의 NPC·시설·elite·필수 route patch와 side activity 차단, 핵심 방어 encounter, stable rewind point·retry-aware NPC flag·unreturned expedition reward rollback을 구현한다. 검 인챈트는 다음 독립 Goal로 남긴다.
- Verification: Deadline 경계 전후 deterministic Chunk matrix, actual keyboard/touch Crisis defense flow, 실패 주입·reload·rewind invariant, Polygon/Retro desktop/844×390과 fresh independent verifier를 사용한다.

## Blockers

없음. Human이 실제 제품을 사용하고 새 feedback이 있으면 `INBOX.md`에 반영한다.
