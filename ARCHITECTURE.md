# Polygon RPG Engineering Desired State

이 문서는 Polygon RPG가 따라야 할 현재 Engineering Desired State다. 현재 file tree의 inventory, 개발 이력이나 Product UX 명세가 아니다. Product What은 [`PRODUCT_GOAL.html`](./PRODUCT_GOAL.html)이 단독 소유한다.

## System Context

- 제품은 browser에서 실행되는 single-player 2D action RPG다.
- 배포 결과는 static HTML, CSS와 JavaScript ES modules이며 production build service나 runtime server를 요구하지 않는다.
- Desktop과 mobile adapter가 같은 deterministic simulation과 presentation pipeline을 사용한다.
- 진행 data는 browser-local persistence boundary 안에 머물고 network service는 핵심 gameplay의 전제 조건이 아니다.
- 개발 runtime은 [`Product Goal Loop Method`](./.ai/methods/product-goal-loop/METHOD.md)를 따르되 특정 Agent, scheduler, worktree, CI 또는 orchestration 도구가 있어야만 수렴하는 구조를 만들지 않는다.

## Technology and Runtime Boundary

- Vanilla JavaScript ES modules와 Canvas 2D를 runtime 기반으로 사용한다.
- DOM UI는 repository에 vendoring한 Alpine.js ES module과 semantic HTML binding으로 관리한다.
- 하나의 animation-frame owner가 120Hz fixed simulation을 구동하고 60Hz integer combat frame을 결정적으로 sample한다.
- Production은 `index.html`과 static source를 직접 제공한다. Node.js는 local server, lint, inspection과 visual verification에만 사용한다.
- GitHub Pages production source는 `main /`이며 별도 deployment branch나 required build artifact를 두지 않는다.
- 외부 game/render runtime dependency는 Product와 Engineering Desired State가 요구하는 명확한 이점과 Human이 승인한 trade-off 없이는 추가하지 않는다.

## Module Boundaries

| Boundary                          | Responsibility                                                                                             | Must Not Know or Do                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Browser Bootstrap / UI Adapter    | Screen state, semantic controls, accessible interaction, UI intent와 status render                         | Mutable gameplay internals, map patch, combat frame 계산            |
| Debug Configuration Adapter       | Explicit hold gesture 뒤 개발자 panel을 열고 stable QA 설정을 URL query와 양방향 변환                      | 기본 user flow 노출, gameplay state 직접 쓰기, 저장 진행 재사용     |
| Application Composition           | Browser resource lifecycle, input/render/UI adapter 조립, one-frame orchestration                          | Domain rule 재구현, renderer별 gameplay 분기                        |
| Scene Runtime                     | Tree-owned enter/ready/fixed/exit/dispose lifecycle와 scoped completion signal                             | Global service lookup, implicit mutable singleton                   |
| Input Adapters                    | Keyboard/pointer lifecycle을 frozen common intent와 monotonic command sequence로 변환                      | Map, combat outcome, animation 또는 UI screen policy                |
| Game Orchestrator                 | Persistent Player, world/progression coordination, fixed-step command ordering, immutable RenderFrame 생성 | Canvas drawing, DOM mutation, storage serialization                 |
| Authored Content                  | Map, encounter, equipment, progression과 pose definition을 immutable data로 제공                           | Browser API, runtime state writer, concrete composition root        |
| Map Domain                        | Region/Room/Portal definition, active snapshot, stable-ID patch와 atomic transition                        | Renderer mutation, input device event, story UI 직접 작성           |
| Encounter / Combat Domain         | Enemy state, command phase, weapon↔hurt contact, juggle, guard/evade와 combat result                       | DOM, Canvas API, persistence adapter, Player mutable object 공유    |
| Progression Domain / Storage Port | Reward·unlock·route state transition과 versioned load/save contract                                        | UI layout, map geometry, direct browser-global dependency in policy |
| Enchantment Domain                | 단일 active sword enchant, affinity·상태 축적·부가효과와 확정 material transaction                         | Input adapter, Canvas effect, shield attack 변형                    |
| World Time Domain                 | 의미 있는 action ledger, World Clock·Deadline·Crisis와 stable rewind checkpoint                            | Render delta 기반 시간 진행, Chunk background simulation            |
| Shared Combat Geometry            | Pose와 gameplay dimensions에서 weapon, shield, hurt와 swept-contact geometry 계산                          | Canvas style, effect color, damage state write                      |
| Animation / Presentation Geometry | Gameplay motion state에서 target pose, IK와 read-only geometry 계산                                        | Hit 승인, physics state write, frame clock ownership                |
| Renderers                         | 같은 immutable RenderFrame을 Polygon/Retro surface에 투영                                                  | Simulation 진행, hit 재판정, effect lifetime 또는 map state write   |

Adapter는 policy를 호출하고 policy는 adapter를 import하지 않는다. Composition root만 concrete adapter와 domain owner를 연결한다.

Authored Content와 concrete adapter는 composition root에서 주입한다. Domain runtime이 특정 Region map, equipment catalog, UI profile이나 presentation adapter를 default import하지 않는다.

```text
DOM UI ───────┐
Keyboard ─────┼─→ Application Composition → Game Orchestrator
Mobile ───────┘                              │
                                             ├─→ Map Domain
                                             ├─→ Room / Encounter / Combat
                                             ├─→ Progression → Storage Port → Browser Adapter
                                             └─→ Animation Geometry
                                                       ↓
                                                Immutable RenderFrame
                                                       ↓
                                              Polygon / Retro Renderers
```

## Scene and Lifecycle Model

- Tree 참여에 따른 fixed processing과 lifecycle이 필요한 책임만 Scene Node가 된다. Immutable data, pure calculation과 stateless helper는 plain module로 유지한다.
- Reusable Scene은 매번 fresh root와 owned subtree를 만든다.
- Lifecycle 순서는 parent-enter → child-enter, child-ready → parent-ready, parent-fixed → child-fixed, child-exit → parent-exit다.
- Root owner가 child subtree, listener, incoming connection, browser resource와 Signal을 함께 해제한다.
- 행동 시작은 explicit command, 이미 완료된 사건 통지는 scoped Signal, 연속 상태는 immutable snapshot으로 전달한다.
- Global event bus, string path lookup과 Node마다 별도 animation frame을 두지 않는다.

## State Ownership and Data Flow

- Application composition이 browser listener, ResizeObserver, animation frame, screen state adapter와 renderer lifecycle을 소유한다.
- Game orchestrator가 Player, camera presentation, combat result 적용과 progression coordination의 최종 writer다.
- Map runtime만 active Region/Room, available Portal, spawn, collision/entity source와 pending transition을 쓴다.
- Active Room subtree가 Room-local entity lifecycle을, Encounter owner가 enemy/AI/juggle state를 쓴다. Encounter는 Player mutable state를 직접 소유하지 않고 완료 result를 root에 전달한다.
- Combat command owner가 startup/active/recovery, buffer, cancel과 combo cycle을 결정한다. Attack cancel은 confirmed damaging hit result 뒤 다른 attack으로만 열리고 whiff·block과 같은 attack의 연속 cancel을 거부한다. Guard cancel은 keyboard/touch가 공통 monotonic guard sequence로 전달하고 command owner가 authored stamina 비용을 한 번 지불할 수 있을 때만 연다. Animation module은 normalized motion state를 읽을 뿐 command timing을 바꾸지 않는다.
- Combat command owner가 stamina 잔량·회복, action별 비용, guard 유지 drain과 guard 시작 경과 시간을 결정한다. Guard contact result의 authored attack 위력별 drain은 한 번만 적용하고, 짧은 just-guard window 안의 guardable contact는 drain 대신 회복과 Basic-only counter window를 하나의 command transition으로 기록한다. Counter window 중 다른 action sequence는 소비하되 실행하지 않고 새 Basic만 전용 shield-counter motion으로 전환한다. Strong startup의 guard-break와 피격 interrupt도 같은 command transition에서 기록한다.
- Enchantment owner가 단일 active sword enchant, 확정 material unlock, 적 affinity, attack별 속성 축적·상태 지속과 부가효과 transition을 기록한다. Combat contact는 neutral enchant result를 적용하지만 shield contact에는 이를 요청하지 않는다.
- Encounter owner는 방패형 적과 Boss에만 guard·posture를 만들고 Strong·전용 shield counter의 posture damage, break와 bounded groggy를 단일 transition으로 기록한다. 일반 적은 이 상태를 갖지 않는다.
- Shared Combat Geometry는 gameplay와 RenderFrame builder가 함께 읽는 neutral contract다. Gameplay가 renderer/presentation module을 import해 판정을 계산하거나 renderer가 별도 contact geometry를 만들지 않는다.
- Story interaction owner가 현재 대화 speaker·line·world anchor·순차 reveal 진행도·advance 가능 여부와 story transition을 쓴다. UI presentation은 immutable dialogue DTO와 camera read model로 화자 위 bubble을 투영하되 gameplay state를 쓰지 않는다. 같은 jump action의 이동, 현재 줄 완성 또는 다음 대화 진행 우선순위는 game domain이 현재 interaction context에서 한 번 결정한다.
- Progression owner가 route, checkpoint, boss, reward, equipment와 unlock transition을 쓴다. 첫 지역·Boss material은 빠른 연계형, guard·posture 파쇄형, 긴 reach·배후 punish형 중 하나의 상호배타적 weapon archetype transaction으로 소비하고 숫자 상위호환을 만들지 않는다. Storage adapter는 versioned snapshot을 검증·직렬화할 뿐 rule을 결정하지 않는다.
- World Time owner가 authored action ID별 Clock 비용·Deadline 비용/연장과 Crisis 진입을 idempotent ledger로 쓴다. Map Runtime은 현재 world snapshot을 읽어 active Chunk를 resolve할 뿐 시간을 진행하거나 unloaded Chunk를 simulation하지 않는다.
- UI는 status DTO를 표시하고 public command만 호출한다. Renderer는 RenderFrame을 읽기만 한다.

```text
Frozen Intent
    ↓
Fixed Simulation
    ├─ command resolution
    ├─ physics/contact/result
    ├─ map/progression transition
    └─ bounded presentation event lifetime
    ↓
Immutable status + RenderFrame
    ├─→ UI status writer
    ├─→ Polygon renderer
    └─→ Retro renderer
```

## Combat, Time and Contact Contracts

- Simulation time은 explicit delta/fixed time으로 진행하고 gameplay duration을 render frame count에 묶지 않는다.
- Combat authored timing은 60Hz integer frame이고 120Hz simulation이 각 frame을 두 tick 동안 sample한다.
- Weapon hit는 current and recent swept blade geometry와 hurt geometry의 접촉으로 승인한다. Visual trail과 effect opacity는 damage authority가 아니다.
- Guard, roll invulnerability, hit/block stun, retaliation protection, juggle limit과 landing reset은 각 owner가 단일 state transition으로 기록한다.
- Combat event는 원인 ID, contact position과 bounded presentation lifetime을 가진 immutable result다. Renderer가 이를 재해석하거나 중복 소비하지 않는다.
- Guard result는 authored stamina damage와 just-guard eligibility를 command owner에 전달하고, just guard와 shield counter event는 실제 shield/target contact와 stamina delta를 immutable result로 보존한다. Presentation은 이 event에서 방패 섬광·원형 파동·spark·회복 표시를 만들며 combat 판정을 다시 계산하지 않는다.
- Sword contact는 attack kind, active enchant와 target affinity를 neutral enchant policy에 전달한다. Policy는 non-zero damage multiplier, 상태 축적·연장, posture와 interrupt/slow/burn result를 반환하며 Combat owner가 단 한 번 적용한다. Shield contact는 enchant policy를 호출하지 않는다.
- Camera feedback과 render interpolation은 gameplay position과 collider를 변경하지 않는다.

## World and Map Contracts

- World → Region → Room/Chunk → gameplay surface/entity/render item/Portal 계층을 사용한다.
- Gameplay surface와 render geometry는 분리한다. 장식이나 mesh가 collider를 암묵적으로 생성하지 않는다.
- Room-local authored data는 resolved snapshot에서 world coordinates로 변환한다.
- Portal transition 동안 source Room이 authority를 유지하고 완료 fixed-step에 Room, spawn, collision과 entity snapshot을 원자 교체한다.
- Conditional world 변화는 base map 복제가 아니라 stable object ID를 대상으로 한 deterministic patch로 적용한다.
- 같은 우선순위에서 같은 target/property를 중복 쓰거나 필수 이동 경로를 끊는 patch는 invalid다.
- Renderer는 active Room, Portal availability와 patch를 해석하지 않고 resolved read model만 소비한다.
- Portal/trigger/interaction authored content는 작은 Chunk 이동과 구분되는 stable Travel Segment 또는 의미 있는 world action ID·비용을 제공한다. World Time owner는 완료된 action만 commit하며 transition 실패나 같은 event 재진입에 이중 청구하지 않는다.
- Chunk resolve context는 World Clock phase, remaining Deadline, Crisis와 stable event flags로 제한한다. 이 context가 같으면 unload/reload 뒤 같은 NPC·facility·encounter·route patch를 만들고 offline 경과 시간은 context에 섞지 않는다.
- Deadline 0의 Crisis 전환과 최근 핵심 사건 직후 rewind snapshot은 World Time/Progression coordinator가 원자 적용한다. Meta progression은 보존하고 unreturned expedition reward만 폐기하며 retry-aware stable flag를 추가한다.
- Dungeon authored content는 signature rule의 입구 소개, 전투 결합, 숨은 분기 응용과 Boss 시험을 stable stage ID로 제공한다. Map/Encounter coordinator는 첫 방문의 핵심 gate만 blocking하고 cleared patch에서는 강제 전투를 제거하며 shortcut과 빠른 이동 경로를 결정적으로 연다.
- Boss authored profile은 읽을 수 있는 attack cycle과 arena interaction, weakness exposure 또는 part transition 중 하나를 명시하며 Encounter owner가 phase와 recovery window를 기록한다.
- 낮밤 patch는 필수 경로를 닫지 않는다. Night optional elite와 새 pattern은 stable encounter ID로 resolve되고 완료 시 확정 progression reward를 idempotent하게 지급한다.

## Rendering and Presentation Contracts

- Game state는 fixed-step에서 한 번 갱신되고 Polygon과 Retro renderer는 같은 immutable RenderFrame object를 받는다.
- Camera는 fixed world view를 CSS viewport와 DPR에서 독립적으로 투영하고 non-16:9 surface는 crop/stretch 대신 letterbox한다.
- Retro pipeline은 screen-space snap, low-resolution raster, alpha threshold, posterization, bounded outline과 nearest-neighbor upscale 순서를 유지한다.
- Character size와 stylistic scale은 presentation transform에만 적용하며 collider, movement, jump와 contact range에 암묵적으로 결합하지 않는다.
- Target pose는 effector와 body intent를 정의하고 analytic IK가 limb joint를 계산한다. Authored data에 joint result를 중복 저장하지 않는다.
- Effect와 particle geometry는 gameplay authority와 분리하되 gameplay가 확정한 event/contact를 그대로 시각화한다.
- Reduced-motion preference에서는 camera motion을 줄여도 판정 이해에 필요한 hit-stop, reaction과 state feedback을 제거하지 않는다.

## Input and UI Contracts

- Keyboard와 mobile adapter는 device event를 common action ID와 frozen sequence로 변환한다.
- Pointer ID별 held state, capture, cancel, blur/visibility cleanup은 adapter가 소유하고 release는 idempotent다.
- Map context와 command priority는 game domain이 결정하며 adapter가 Portal이나 combat state를 알지 않는다.
- Jump action이 현재 상호작용을 시작하거나 대화를 진행한 fixed-step에는 같은 sequence로 Player jump를 시작하지 않는다.
- Just-guard counter window 중 이동·jump·roll·guard·Strong은 game domain이 억제하고 입력 sequence 기준선을 갱신한다. 새 Basic sequence만 command owner가 전용 shield counter로 소비한다.
- UI screen state와 presentation settings는 gameplay input snapshot에 섞지 않는다.
- UI는 declarative binding과 accessible text/name을 사용하고 implicit browser globals나 element-name globals에 의존하지 않는다.
- 기본 menu는 실제 player flow만 제공하고 개발자 control을 노출하지 않는다. Game MENU의 짧은
  activation은 menu transition으로, 1초 연속 hold는 진행률이 보이는 debug panel activation으로 UI
  adapter가 구분하며 완료된 hold가 뒤이은 click을 menu transition으로 중복 소비하지 않게 한다.
- Debug Configuration Adapter는 stable scenario·renderer·phase·frame·reduced-motion DTO를 URL query로
  serialize하고 같은 query를 panel DTO로 parse하는 유일한 owner다. UI 적용은 explicit QA URL로
  재진입해 fresh non-persistent progression boundary를 사용하며 gameplay owner를 직접 변형하지 않는다.
- World-anchored dialogue UI는 authored interaction anchor와 camera read model을 screen-space로 투영하고 viewport safe area에서 clamp한다. 글자별 시각 reveal은 screen reader에 partial text를 반복 announce하지 않으며 full line을 별도 accessible status로 제공한다.
- Story owner는 NPC가 시작·완료한 핵심 대화의 stable conversation ID를 completion result로 내보내고 Progression owner가 viewed/completed ID의 final writer가 된다. Story는 current reaction과 별개로 이 snapshot에서 다시 읽을 수 있는 immutable transcript DTO를 resolve한다.
- Mobile/desktop은 같은 gameplay simulation과 world framing을 공유하고 layout만 presentation adapter가 조정한다.

## Persistence, Failure and Recovery

- Progression storage는 schema version과 typed fields를 검증하고 unknown/corrupt payload를 정상 state로 위장하지 않는다.
- Load/save failure는 explicit result로 application에 전달하며 domain state를 부분 적용하지 않는다.
- Reward, checkpoint, boss와 shortcut transition은 idempotent하게 해석되어 reload나 repeated trigger가 보상을 중복 지급하지 않는다.
- World Clock, Deadline, active enchant, material unlock, committed world-action ID와 stable rewind point는 versioned progression snapshot에 포함한다. Menu/dialogue/real-time delta와 wall clock은 저장 data를 암묵적으로 변경하지 않는다.
- Room transition, input sequence와 encounter reset은 interruption 뒤 숨은 command나 stale entity를 다음 Room으로 넘기지 않는다.
- Development Loop State는 Desired State가 아니며 root sources와 current code/evidence에서 재구성한다.

## Performance, Security and Compatibility

- Fixed runner는 catch-up 상한과 dropped-step diagnostics로 runaway simulation을 막는다.
- Canvas backing size는 CSS size와 DPR을 고려하되 logical viewport와 gameplay scale을 변경하지 않는다.
- CPU pixel post-processing은 측정된 병목이 있을 때만 worker/WebGL 대안을 검토한다.
- Static server는 repository root 탈출, backslash traversal과 허용되지 않은 method/path를 거부하고 올바른 MIME과 `nosniff`를 제공한다.
- Mobile verification tunnel은 공개 임시 URL이므로 secret, personal data나 production state를 노출하지 않는다.
- Runtime source는 external CDN, online account와 development-only server behavior에 의존하지 않는다.

## Verification Direction

- Syntax, lint와 formatting은 `npm run check`, patch whitespace는 `git diff --check`로 검사한다.
- Pure combat, map patch, progression과 input rule은 DOM 없는 deterministic fixtures로 검증한다. Guard 유지 drain, 공격 위력별 단일 contact drain, just-guard 경계·회복, Basic-only lock과 keyboard/touch parity를 120Hz trace로 고정한다.
- Enchantment fixture는 Basic/Strong·shield contact, 네 속성, 약점/중립/내성의 non-zero damage, 상태 축적·지속과 확정 material transaction을 120Hz trace로 고정한다.
- Combat fixture는 shield/Boss만 가진 posture, Strong·shield counter break, bounded groggy, damaging-hit-confirm-only cancel, whiff·block·same-attack cancel 거부와 keyboard/touch guard sequence·stamina 부족 거부를 120Hz trace로 고정한다.
- World Time fixture는 menu/dialogue/idle/load 0비용, Travel Segment와 core event의 단일 commit, shortcut 비용 감소, Deadline 가산/차감·Crisis, deterministic Chunk rebuild, reload와 rewind invariant를 고정한다.
- Journey fixture는 Dungeon signature stage, first-clear gate, cleared revisit shortcut, Boss cycle, NPC transcript와 night elite 확정 보상을 stable ID와 persistence round-trip으로 고정한다.
- Browser flow는 실제 menu → game → journey/encounter path, resize, keyboard/mobile adapter와 console error를 확인한다.
- Debug fixture는 short activation·1초 hold threshold·completed-hold click suppression, URL→panel과
  panel→URL round-trip, unknown scenario/renderer/phase와 frame range rejection을 고정한다. Browser에서는
  기본 menu의 debug-free 상태, hold progress, desktop/mobile panel, URL reload 복원을 확인한다.
- Visual 변경은 stable scenario와 frame에서 실제 browser viewport PNG를 만들고 직접 판독한다. Polygon/Retro, desktop/narrow viewport와 relevant pose/state를 같은 acceptance 기준으로 비교한다.
- Persistence는 versioned round-trip, corrupt payload, failure result와 idempotent reward recovery를 검증한다.
- Architecture verification은 import direction, state writer uniqueness, renderer read-only boundary와 forbidden direct dependency를 검사한다.
- 모든 Execution Goal은 구현 맥락과 분리된 verifier가 Product Goal, Architecture, actual product와 evidence를 비교한다. Verifier는 구현을 직접 고치지 않는다.
- 동일 원인의 defect/feedback이 두 번 확인되고 기계적으로 측정 가능할 때 가장 작은 durable check로 승격한다. 그 외 일회성 inspection scaffold는 완료 전에 제거한다.

## Engineering Conventions and Forbidden Structures

- Product behavior를 바꾸는 결정은 구현 전에 `PRODUCT_GOAL.html`, Engineering structure를 바꾸는 결정은 구현 전에 이 문서를 현재형으로 갱신한다.
- 같은 상태나 사건의 문제가 반복되면 증상별 patch보다 final writer와 dependency direction을 먼저 수정한다.
- Pure function → owned composition → explicit capability 순으로 가장 작은 책임 단위를 선택하며 현재 이점 없는 abstraction을 만들지 않는다.
- Mutable global state, circular import, renderer-side simulation, UI-side domain rule, gameplay-aware storage adapter와 hidden fallback success를 금지한다.
- UI가 concrete equipment/progression profile을 직접 import하거나 gameplay coordinator가 concrete map/content를 default import하지 않는다.
- Gameplay policy가 presentation adapter를 판정 근거로 import하지 않고, 하나의 coordinator에 새 domain·presentation 책임을 계속 누적하지 않는다.
- Product Desired State 밖의 speculative feature, unrelated refactor와 특정 automation 제품에 종속된 lifecycle을 만들지 않는다.
- Verification failure를 통과시키기 위해 acceptance, architecture constraint, test 또는 verifier scope를 낮추지 않는다.
- Placeholder, 생략된 구현과 설명 없는 TODO를 완료 결과로 남기지 않는다.
- Repository가 생성하는 commit subject와 명시적 merge message는 기본적으로 한국어를 사용하고 기술 token은 보존한다.
- Human 보고는 쉬운 한국어로 현재 결과, 확인 evidence, 남은 Gap과 필요한 판단을 먼저 전달한다.

## Development Runtime

- `AGENTS.md`는 Method와 네 Project Source만 bootstrap한다. Loop 동작 규칙을 복제하지 않는다.
- `INBOX.md`는 아직 처리하지 않은 Human feedback만 보존하고 Task backlog나 완료 기록을 소유하지 않는다.
- `STATE.md`는 current comparison, evidence, active Execution Goal과 runtime status만 유지한다.
- Gap이 있으면 runtime은 `RUNNING`을 유지하고 다음 Execution Goal을 자율 선택한다.
- 모든 Product와 Engineering Desired State가 current evidence로 충족될 때만 `IMPLEMENTATION_COMPLETE`가 된다.
- 실행 환경은 필요에 따라 Agent, local process, CI나 review tool을 사용할 수 있지만 repository contract와 완료 의미는 어느 하나에 의존하지 않는다.
