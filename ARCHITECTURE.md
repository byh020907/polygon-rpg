# Polygon RPG Engineering Desired State

이 문서는 캐주얼 고철 아포칼립스 캠페인이 따라야 할 현재 Engineering Desired State다. 현재 file tree의 inventory나 개발 이력이 아니며 Product What은 [`PRODUCT_GOAL.html`](./PRODUCT_GOAL.html)이 단독 소유한다.

## System Context

- 제품은 browser에서 실행되는 single-player 2D side-view action RPG다.
- 배포 결과는 static HTML, CSS와 JavaScript ES modules이며 runtime server나 account를 요구하지 않는다.
- Desktop과 mobile adapter는 같은 deterministic simulation, campaign state와 presentation pipeline을 사용한다.
- 진행 data는 browser-local persistence boundary 안에 머문다.
- 개발 runtime은 [`Product Goal Loop Method`](./.ai/methods/product-goal-loop/METHOD.md)를 따르되 특정 Agent, scheduler, CI나 browser automation에 correctness를 의존하지 않는다.

## Technology and Runtime Boundary

- Vanilla JavaScript ES modules, Canvas 2D와 vendored Alpine.js ES module을 사용한다.
- 하나의 animation-frame owner가 120Hz fixed simulation을 구동하고 60Hz integer combat frame을 결정적으로 sample한다.
- Production은 `index.html`과 static source를 직접 제공한다. Node.js는 local server, lint, fixtures와 visual verification에만 사용한다.
- PWA는 manifest와 root-scoped Service Worker를 사용한다. 현재 release의 필수 static asset은 atomic versioned cache로 준비하고 Service Worker lifecycle은 shell에 explicit status만 전달한다.
- 생성된 release metadata의 asset inventory를 Service Worker도 그대로 사용한다. 별도로 수동 관리하는 offline 파일 목록을 두지 않는다.
- 같은 release generation이 asset별 digest와 경량 network-only version probe를 만든다. 업데이트 owner는 복귀·pageshow·명시 확인과 제한된 주기에서 probe를 조회하고 변경된 build ID의 Service Worker 및 imported metadata를 같은 build URL로 준비한다. 파일별 digest 검증이 끝난 완전한 cache만 활성화할 수 있다.
- Runtime source는 CDN, external account, wall clock과 development-only server behavior에 의존하지 않는다.
- GitHub Pages production source는 `main /`이며 별도 build artifact를 요구하지 않는다.

## Module Boundaries

| Boundary                       | Responsibility                                                                                                                       | Must Not Know or Do                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Browser Bootstrap / UI Adapter | Screen·modal state, semantic controls, accessible interaction, status render                                                         | Mutable gameplay internals, route·time rule 재구현      |
| PWA Lifecycle Adapter          | Manifest/install prompt, Service Worker lifecycle, version-ready status와 명시적 apply 요청                                          | Campaign state·storage schema·gameplay input 직접 write |
| Debug Configuration Adapter    | Hold 뒤 QA panel, stable campaign scenario와 URL 양방향 변환                                                                         | Player 저장 재사용, gameplay state 직접 쓰기            |
| Application Composition        | Browser resource, input/render/UI/domain owner 조립                                                                                  | Domain rule 재구현, renderer별 gameplay 분기            |
| Scene Runtime                  | Tree-owned lifecycle와 scoped signal                                                                                                 | Global lookup, implicit mutable singleton               |
| Input Adapters                 | Keyboard/pointer를 frozen common intent·sequence로 변환                                                                              | Map, combat, campaign time 또는 modal policy            |
| Game Orchestrator              | Player·combat·map·story·progression coordination과 immutable RenderFrame/status                                                      | DOM, Canvas drawing, storage serialization              |
| Authored Campaign Content      | 도입·반복 cast·다섯 region·교차 issue graph·route·사건 단계·시간·연장·part·map patch·robot·ending profile와 immutable 표시명 profile | Browser API, mutable runtime writer                     |
| Campaign Domain                | 4구간 날짜, D-DAY, 고대 병기 route·우회 거리, primary/linked issue window, region result, part·대항 병기 completion과 action ledger  | Render delta 시간, UI layout, unloaded Chunk simulation |
| Map Domain                     | Region/Room/Chunk, active snapshot, stable-ID patch와 atomic transition                                                              | Campaign action 결정, renderer mutation                 |
| Encounter / Combat Domain      | Command phase, enemy state, contact, guard/evade/posture와 result                                                                    | DOM, persistence, campaign route mutation               |
| Progression Domain             | 장비·인챈트·command·회수 part와 campaign transaction coordination                                                                    | UI layout, concrete storage/browser API                 |
| Story Interaction              | Blocking/ambient 말풍선, 독백, active speaker·line·anchor·reveal·대화 기록과 authored event request                                  | DOM bubble geometry, campaign state 직접 mutation       |
| Storage Port                   | Versioned snapshot와 recovery slot validation·load/save result                                                                       | Gameplay rule, hidden fallback success                  |
| Shared Combat Geometry         | Pose에서 weapon/shield/hurt/swept-contact geometry 계산                                                                              | Canvas style, damage write                              |
| Art Direction Profiles         | 저채도 palette, depth layer, material, light, effect와 HUD presentation token의 immutable 정의                                       | Gameplay rule, Canvas/DOM 직접 write                    |
| Renderers                      | 같은 immutable RenderFrame을 Polygon로 투영                                                                                          | Simulation, hit 재판정, state write                     |

Adapter는 policy를 호출하고 policy는 adapter를 import하지 않는다. Concrete map, campaign/equipment profile과 adapter는 composition root에서 주입한다.

```text
Keyboard / Touch / DOM intent
             ↓
      Application Composition
             ↓
        Game Orchestrator
       ├─ Combat / Encounter
       ├─ Map / Story
       ├─ Campaign Domain ─→ Operation Map DTO
       └─ Progression ─→ Storage Port
             ↓
       Immutable RenderFrame
       └─ Polygon Renderer
```

## State Ownership and Data Flow

- 현재 고철 campaign만 production progression의 세계 진행을 소유한다. 폐기된 학원·first journey·glasswind 진행과 그 금고를 현재 저장에 병렬 보유하거나 현재 통화·체력·story를 계산하는 우회 경로로 사용하지 않는다. 현재 통화는 progression의 단일 필드이며 도메인 transaction으로만 변경한다. 현행 schema만 복원하고 호환되지 않는 개발 save는 명시적인 초기화 안내로 처리한다.

- Application composition이 listener, ResizeObserver, animation frame, screen/modal adapter와 renderer lifecycle을 소유한다.
- Game orchestrator가 Player, combat result 적용과 domain coordination의 최종 writer다.
- Campaign owner만 현재 날짜·구간, remaining D-DAY, current region, rival route progress, region state, part collection, robot completion과 committed action ID를 쓴다.
- Campaign owner는 현재 주목표 하나와 연결 이슈 최대 두 개의 stable ID·dependency·해결 상태도 함께 쓰며 UI는 이 read model을 그대로 투영한다.
- Operation map과 HUD는 같은 frozen Campaign Read Model을 투영하고 campaign state를 직접 쓰지 않는다.
- Map runtime만 active Region/Room, available entrance, collision/entity source와 pending transition을 쓴다. Campaign context를 읽어 stable patch를 resolve할 뿐 시간을 소비하지 않는다.
- Progression owner가 equipment, enchant, reward와 campaign transaction을 원자 결합하고 Storage adapter는 typed snapshot을 검증·직렬화할 뿐 rule을 결정하지 않는다.
- Story owner가 active dialogue DTO와 authored event request를 내보내고 orchestrator가 campaign/progression transition을 승인한다.
- Story owner는 world-anchored blocking dialogue, 이동을 막지 않는 ambient bubble과 protagonist monologue를 같은 authored beat에서 구분하고, 완료된 중요 conversation ID를 progression transcript index에 기록한다.
- Renderer와 UI는 frozen DTO를 읽기만 한다.
- RenderFrame은 gameplay state와 별도로 immutable art-direction profile, parallax depth, surface
  normal/material, occluder, light source와 timed impact cue를 제공한다. Renderer가 이 presentation
  fact를 소비하되 combat contact, visibility나 collision 결과를 다시 결정하지 않는다.

## Campaign and World-Time Contracts

- Campaign clock은 하루를 `morning`, `day`, `evening`, `night` 네 authored segment로 표현한다. 내부 minute 표현을 쓰더라도 public transaction은 segment 단위다.
- 새 campaign은 Day 1 morning, 수도 도착까지 30일에서 시작한다. D-DAY 0은 terminal game-over state다.
- Long-distance route, full-rest, KO return과 core event만 명시된 segment 비용을 가진다. Dialogue, shop, inventory, instant enchant, normal combat, local exploration, Room/Chunk transition과 offline time은 비용이 0이다.
- 모든 시간 action은 `preview → optional warning → confirm → single commit` 순서다. 예상 결과 DTO에는 비용, 결과 날짜·구간·D-DAY, rival movement와 game-over 여부가 포함된다.
- Stable action ID는 ledger에서 idempotent하고 repeatable action은 caller가 고유 occurrence ID를 제공한다. 취소·실패한 transition은 commit하지 않는다.
- Authored Campaign Profile은 다섯 region의 stable ID, label, color/material language, route, event segment cost, D-DAY extension, industrial machine, part와 robot module을 immutable data로 제공한다.
- Authored Campaign Profile은 약 10시간/부품당 약 2시간의 target pacing, issue dependency graph와 각 issue의 region·cast·required encounter/state change를 제공한다. Cross-region dependency는 item delivery만으로 완료되지 않고 destination issue의 authored interaction, exploration, combat 또는 world patch 중 하나 이상을 요구한다.
- Issue activation policy는 공간적으로 열린 다섯 region과 별개로 primary issue 하나 및 linked issue 최대 두 개만 active로 만든다. 완료 transaction이 다음 연결을 결정하며 UI가 모든 region request를 임의로 나열하지 않는다.
- Region core event의 소비 시간은 마지막 작업으로 생기는 2~5일 상당의 실제 우회 거리보다 크다. Player-first 완료는 region을 resolved로 만들고, 지도 route patch와 일치하는 distance-derived D-DAY 변화를 기록하며 part를 지급한다. 임의의 부품 보상 연장은 금지한다.
- 지역 부품은 군수 인장 해제, 현지 산업기계 오작동 해결과 마지막 작업을 하나의 region success transaction으로 확정할 때 한 번만 지급한다. 그 마지막 작업이 만든 stable route patch와 거리 기반 D-DAY 변화는 같은 transaction에 기록한다.
- Rival position과 route는 time-consuming commit에서만 deterministic하게 전진하고 같은 snapshot/context는 같은 read model을 만든다. Background simulation과 wall-clock catch-up을 금지한다.
- 다섯 part를 모두 가진 snapshot만 final battle available을 참으로 resolve한다.
- D-DAY 0 이후 combat/map command를 성공 처리하지 않고 game-over presentation sequence가 state의 terminal reason을 투영한다.
- Main issue chain을 authored 최단 집중 경로로 실행한 pacing fixture는 초기 D-DAY budget의 약 75~80%를 소비한다. Optional issue와 실수는 남은 budget을 사용하고 반복되는 큰 손실은 D-DAY 0으로 연결한다.
- Final battle snapshot은 armor·weapon·control-core phase와 제어핵 재설치 completion을 ledger에 남긴다. Epilogue read model은 대항 병기 module 반환, 다섯 region 기계 복귀, 고대 병기 복구 장비 전환과 두 견습생의 공식 수거팀 인정을 한 번만 투영한다.

## Operation Map Contract

- Campaign Domain은 current location, route nodes/edges, rival node·direction·arrival estimate, region event status, travel/event cost, success extension, collected part와 robot completion을 하나의 immutable DTO로 만든다.
- Game MENU short activation과 고물상 wall-map interaction은 동일한 operation-map UI command를 호출한다. 1초 hold debug completion은 뒤 click/keyup을 소비해 map을 중복 열지 않는다.
- Map modal은 gameplay input을 멈추고 time을 소비하지 않으며 닫으면 같은 simulation state로 돌아간다.
- UI adapter는 responsive layout과 focus trap을 소유하지만 route 판단·예상값을 계산하지 않는다.
- HUD는 Campaign Read Model에서 날짜·구간·D-DAY만 compact하게 표시한다.

## Combat and Character Contracts

- Combat authored timing은 60Hz integer frame이며 120Hz simulation이 각 frame을 두 tick 동안 sample한다.
- Command owner는 stamina, startup/active/recovery, damaging-hit-confirm cancel, just guard, Basic-only shield counter, Strong guard break/interrupt와 shield/Boss posture를 단일 transition으로 기록한다.
- 구르기 pose strip은 머리·어깨 선행 진입→골반과 두 발의 공중 뒤집힘→전방 한 바퀴→발 접지→달리기의 authored local-3D frame이다. 골반 계층의 명시적 누적 회전은 clip 내부 보간에서 winding을 보존하고 다른 clip의 shortest-arc 보간과 구분한다. RollTimeline의 회피 시간·이동 거리·stamina·충돌 계약은 그대로 유지한다.
- 머리·의상·가방·검·방패는 투영된 해당 관절의 위치와 방향에 부착한다. roll 전용 검 축소, 고정 화면 각도, 이미 합성된 머리 방향에 몸통 회전을 재합산하는 보정과 완성 그림 전체 회전을 금지한다. Render/contact는 동일한 attachment transform을 사용한다.
- 공격 접촉은 같은 공격 인스턴스·facing·active sample의 swept geometry와 현재 적의 신체 geometry가 결정한다. 오래된 중심 거리·높이 상수로 실제 polygon 접촉을 사전 거부하지 않으며 공격 변경·취소·복구·방향 변경은 sweep history를 초기화한다.
- 공격별 world-space 도달 범위는 하나의 authored spatial profile이 먼저 정의하고 장비는 그 범위의 명시적 modifier만 제공한다. 애니메이션은 해당 범위에 맞게 무기와 관절 사슬을 사이징하며 공격 도중 길이를 매 frame 늘렸다 줄이지 않는다. 같은 크기로 구성된 pose·무기·방패·sweep가 renderer와 피해 승인의 공통 geometry다. 별도 hitbox 거리나 독립 무기 길이 배율로 같은 공격 범위를 이중 관리하지 않는다.
- 지상·점프 중 공격을 포함한 Player 전 모션과 몹 계열 8-action은 같은 authored local-3D strip과 side-view projection contract를 사용하며 낡은 2D 전용 클립을 남기지 않는다.
- Weapon hit는 shared swept blade↔hurt geometry 접촉으로 승인하고 renderer/effect는 hit authority가 아니다.
- Giant final-battle profile은 scale·pose·arena presentation을 바꾸되 같은 command owner, contact/result와 stamina rules를 사용한다.
- Character Presentation Profile은 role silhouette, front/side proportions, equipment/tool landmarks, representative pose와 minimum viewport readability를 immutable data로 정의한다. Encounter profile은 인간 수거반과 기계 적을 같은 combat DTO로 투영하되 renderer가 family별 presentation만 읽는다.
- 주요 humanoid clip은 root·pelvis·chest·neck/head·near/far limb의 local 3D skeleton frame을 immutable data로 소유하고, fixed side-view orthographic projection이 Canvas cutout의 2D joint/depth order를 만든다. z는 presentation depth만이며 2D map/collider/hit authority를 바꾸지 않는다. raw 외부 motion은 runtime에 넣지 않고 license·URL·mapping을 기록한 development-time retarget/import로 local key frame만 남긴다.
- 3D 단계는 본 계층·local translation·정규화 Quaternion만 소유한다. SLERP와 계층형 FK가 부모 방향을 상속하고 본 길이를 유지한다. 정투영은 위치와 local axis를 screen XY 및 camera depth로 나누며, 3D mesh·skinning·texture renderer를 만들지 않는다.
- 캐릭터 surface는 투영 이후 본 선분의 가변 폭 profile을 길이·폭 방향으로 나누어 생성한다. 원형 limb·타원 torso·얇은 cloth/blade의 단면 profile이 방향에 따른 폭·두께를 정의한다. 2D vertex와 surface depth channel은 분리하며 같은 triangle 안에서 보간한 깊이로 pixel Z를 판정한다. 기본색·cell shading·외곽선은 가림을 공유하고 반투명 검 궤적은 불투명 depth를 검사하되 depth를 쓰지 않는다.
- 깊이 raster는 불투명 pixel의 surface 소유와 동률 순서를 결정적으로 기록한다. 외곽선은 실제로 보이는 surface 경계만 그리며 자기 곡면 깊이 때문에 점선처럼 잘리거나 뒤쪽 부위의 선이 앞쪽 면을 긁지 않는다. 피부·천·금속의 색은 후처리 양자화 없이 material과 cell lighting에서 결정한다.
- 주인공 rig와 appearance는 작은 단순한 머리, 약 7등신의 가늘고 긴 팔다리, 짧은 작업상의·바지·크로스스트랩과 넓은 검의 일관된 profile을 사용한다. 머리·의상·장비의 표면 정의와 shared hurt/weapon outline은 같은 silhouette에서 파생한다. 겹친 장식 면을 무작정 늘리거나 별도 머리 크기·무기 형상을 renderer마다 유지하지 않는다.
- 게임·미리보기·timeline·투명 PNG·frame sheet는 같은 pose sampler와 renderer를 호출한다. 검 공격은 준비→빠른 연속 베기→감속→복귀, 골반·가슴·팔·손목 시차, 팔꿈치 굽힘 제약과 고정된 파지 방향을 유지하며 별도의 QA용 그림을 만들지 않는다.
- 기본·강공격은 머리 위로 검을 올리는 windup을 사용하지 않는다. 몸 옆의 낮은 준비 위치에서 골반·흉곽의 XYZ 회전과 팔 사슬이 앞을 가로지르는 횡·사선 arc를 만들며, 새로운 pose에도 기존 spatial reach와 integer contact timeline을 적용한다.
- Character/Enemy 구현 전에는 protagonist, core NPC job family, collector unit, industrial creature와 regional boss의 front/side/pose board를 실제 gameplay scale로 비교한다.
- Render items는 rivet, plate, cable, work cloth와 repair-mark 공통 language 및 region-specific color/material tag를 읽는다. 기존 academy/fantasy presentation을 fallback으로 사용하지 않는다.

## World, Map and Story Contracts

- World → Region → Room/Chunk → surface/entity/render item/entrance 계층을 사용한다.
- Gameplay surface와 render geometry를 분리하고 polygon top edge를 render/collision이 함께 읽는다. One-way platform은 이전 발 위치와 하강 상태로만 collision을 승인한다.
- Room transition은 source authority 아래 수행하고 완료 fixed-step에 Room, spawn, collision/entity snapshot을 원자 교체한다.
- Conditional 변화는 stable object ID patch로 적용한다. 같은 priority/target/property 중복 writer와 필수 경로 차단은 invalid다.
- Long-distance connection은 실제 road end에서 destination/cost preview를 열고 confirm 뒤 travel presentation과 spatially connected destination Chunk로 전환한다. Magic portal/world-map teleport 표현을 사용하지 않는다.
- 각 region profile은 NPC briefing, observed facility state, journey/combat, boss, replacement/final work, machine separation, part claim과 after-state stage를 제공한다.
- Story는 named speaker의 world-anchored bubble로 진행하고 active interaction에만 DOM presentation을 만든다. Reveal 중 jump는 line complete를 우선하며 같은 input으로 Player가 jump하지 않는다.
- Story beat는 `blocking`, `ambient`, `monologue` presentation mode를 명시한다. Blocking은 필요한 짧은 구간에만 gameplay input을 잠그고 ambient는 이동 중에도 수명과 world anchor를 유지하며 monologue는 새 장소·수상한 물체·중요한 선택에서만 Player anchor를 사용한다.
- Bottom objective DTO는 짧은 imperative action과 필요한 command hint만 제공하고 세계관·감정·사건 경위를 포함하지 않는다. 서사 문장은 bubble DTO와 transcript만 소유한다.
- 완료된 중요 conversation은 immutable authored transcript catalog와 viewed conversation ID로 다시 열 수 있다. Transcript UI는 현재 scene beat를 진행시키거나 campaign event를 재실행하지 않는다.
- Introduction awakening은 자동 회수팔에 붙잡힌 라이벌, 회수팔의 직접 제어를 끊는 제어핵 회수, 비상 장갑으로 봉쇄되는 접속부, 중앙 지휘소 좌표를 따르는 고대 병기의 비상 운용, 동원 신호, D-30 notice, 마을 귀환과 garage reveal을 saveable staged event로 기록한다. 제어핵은 위치를 송출하지 않는 수동 장치다.
- Recurring cast profile은 고물상인·라이벌과 각 region의 결정권자/생활 당사자/연결 인물을 stable ID로 정의하고 before/in-progress/after location, work pose, damage state와 conversation을 map patch로 바꾼다. 사용자 노출 역할명은 별도 immutable cast/name profile이 단일 소유하며 stable ID·저장 schema와 분리한다.

## Rendering, Input and Accessibility

- Game state는 fixed-step에서 한 번 갱신되고 모든 출력 경로의 Polygon renderer는 같은 immutable RenderFrame을 받는다.
- Camera feedback, interpolation과 giant scale은 gameplay position/collider를 암묵적으로 변경하지 않는다.
- Polygon cutout과 smooth vector cartoon은 같은 source geometry를 공유한다. Scene art profile은 실제
  camera에서 character scale, 5개 안팎 parallax layer, low-saturation palette, landmark density와
  material vocabulary를 정의하며 region code가 renderer drawing procedure를 복제하지 않는다. 인간형은
  desktop viewport 높이의 약 18~22%로 작게 읽히는 framing을 유지해 캐릭터·NPC·집·설비가 한 화면에
  생활 공간과 함께 들어오며 oversized fallback zoom을 사용하지 않는다.
- Directional/point light는 position, direction, intensity, range와 functional accent를 frozen data로
  제공한다. Renderer의 lighting pass는 surface normal, material response와 explicit occluder를 계산한
  뒤 luminance를 3~4단계로 quantize하고 contact/projected shadow를 합성한다. 단순 원형 overlay나
  pre-painted shading을 light authority로 사용하지 않는다.
- Metal highlight, cloth falloff, soil/stone irregular face response는 material profile로 분리한다.
  Short-lived attack light도 동일한 lighting pass를 사용한다.
- Combat presentation cue는 windup/contact/hit-stop/recoil/decay phase, strength와 direction을
  immutable timing으로 제공한다. Camera adapter는 direction-first offset과 빠른 감쇠만 담당하고,
  reduced-motion은 offset amplitude를 줄여도 contact flash, pose recoil과 hit stop을 제거하지 않는다.
- HUD token은 thin metal frame, edge placement, compact default와 danger/time-change expansion을
  정의한다. DOM adapter는 semantic status와 MENU short/hold 경계를 유지하며 Canvas의 attack tell과
  interaction target을 가리지 않는다.
- Bottom objective ribbon은 현재 action과 command만 compact하게 표시한다. Story title·briefing·감정 설명은 이 HUD surface에 렌더하지 않는다.
- 게임·검토실·연구실은 CanvasPolygonRenderer 하나만 사용한다. 저해상도 surface, 좌표 snap, pixel-size/alpha-threshold/posterization 설정, 정수 nearest-neighbor 확대와 비교용 Retro canvas를 두지 않는다. UI/CLI/URL 기본값·검증·문서도 같은 계약을 따른다. 오래된 renderer query는 URL 읽기 경계에서만 polygon으로 정규화하고 폐기된 renderer를 다시 만들지 않는다.
- 깊이 가림의 raster buffer는 폴리곤 표면의 z/소유권을 판정하는 내부 구현이며 픽셀화 효과가 아니다. 프레임의 geometry와 material을 Canvas backing 좌표에서 rasterize한 뒤 identity transform으로 1:1 합성한다. 검토실 확대는 CSS 크기와 DPR에 맞춰 backing을 다시 만들고 geometry를 재렌더하며 전체 canvas는 3M pixel budget을 넘지 않는다. CSS 확대나 새 evidence sheet에도 pixelated/nearest-neighbor 처리를 적용하지 않는다.
- 캐릭터 외곽 윤곽은 depth 합성 후 실제로 보이는 불투명 pixel 소유 mask에서 완성하고 배경 합성 전에 확정한다. 완성된 월드 화면의 투명도 경계에서 캐릭터를 뒤늦게 찾지 않는다. 내부 부위선은 depth를 따르고, 반투명 효과는 확정된 외곽선을 지우지 않는다. 배경이 있는 정지 gameplay와 투명 preview의 동일 캐릭터 픽셀을 함께 검증한다.
- Keyboard와 mobile adapter는 common action ID와 monotonic sequence를 만들며 pointer capture/cancel/blur cleanup은 idempotent다.
- UI screen state, operation-map modal과 debug panel state는 gameplay input에 섞지 않는다.
- Debug panel은 특정 gameplay screen이나 작전 지도 해금에 종속되지 않는 공통 modal이다. 메인 제목과 gameplay MENU/MAP이 같은 hold controller를 사용하고, opener별 focus 복귀·background inert·scene 교체 뒤 viewport 갱신을 UI adapter가 소유한다.
- PWA Lifecycle Adapter는 `beforeinstallprompt`, iOS standalone 안내, update waiting과 controller change를 UI command로 변환한다. 설치·갱신은 사용자 입력으로만 시작하며 game screen에서 자동 prompt/reload하지 않는다.
- standalone game start는 orientation lock을 best-effort로 요청하되 fullscreen을 기본 요청하지 않는다. safe-area inset은 UI adapter layout token으로만 소비한다.
- Semantic controls는 accessible name과 keyboard focus order를 가지며 modal은 focus를 trap하고 opener로 복귀한다.
- Mobile/desktop은 같은 simulation과 world framing을 공유하고 safe area/layout만 adapter가 조정한다.
- Reduced motion은 camera shake를 낮춰도 warning, contact, D-DAY와 state-change feedback을 제거하지 않는다.

## Persistence, Failure and Recovery

- Progression storage는 schema version과 typed campaign/equipment fields를 검증하고 unknown/corrupt payload를 정상 state로 위장하지 않는다.
- Snapshot에는 campaign clock, D-DAY, rival route, region states, part/robot completion, action ledger, equipment, enchant와 progression이 함께 들어간다.
- Storage는 `latest morning`, `latest core event`, `pre-action` recovery slot을 구분한다. Morning boundary, core completion 직후와 time action confirm 직전에 orchestrator가 explicit save request를 보낸다.
- Load/save failure는 explicit result로 UI에 전달하고 domain state를 부분 적용하지 않는다.
- 저장 초기화는 메인 UI adapter의 명시적 확인 뒤 기존 application reset capability로 실행한다. UI는 storage key나 schema를 직접 삭제·변환하지 않는다. 초기화 성공 뒤 PWA 상태를 다시 확인하고, 다음 버전 전환도 정상 저장 성공을 요구한다. 취소·초기화 실패에는 전환을 요청하지 않는다.
- cache version 전환은 ProgressionStorage와 독립이다. update 적용 전 UI adapter가 explicit save를 요청하고, cache 실패는 active cache와 typed progress snapshot을 유지한다.
- Service Worker cache는 scope와 release별로 분리한다. root navigation의 query가 달라도 해당 release의 shell을 사용하며, 열려 있는 client는 자신이 시작한 build의 cache에 고정한다. client/build 기록은 worker 재시작을 견디고, 새 navigation은 새 release를 선택한다. 정리는 현재 release와 살아 있는 client가 사용하는 release를 보존하며 다른 scope·앱 cache를 삭제하지 않는다.
- PWA lifecycle owner는 최초 동일 build 활성화와 다른 build 활성화를 구분하고 installing worker와 waiting worker를 모두 관찰한다. 업데이트 확인·설치·저장·활성화·reload를 lifecycle 사실에서 도출한 단계로 표시하며 UI는 불확정 진행 표시를 사용한다. 최초 등록 대기도 busy로 노출하고 적용 중 menu는 inert로 중복 입력을 막는다. 오류는 busy보다 우선하며 새 lifecycle timer/가짜 진행률을 UI에서 만들지 않는다. 기존의 duplicate apply, 무한 확인 대기와 사라진 waiting worker를 명시적으로 처리한다. 다른 창의 활성화 후 다시 열기도 저장 성공 뒤 한 번만 수행한다.
- 현재 page의 build와 별개로 실제 active/waiting/installing worker의 build를 비교한다. 과거 bare-URL worker의 무한 설치가 native 등록 작업을 막았고 정상 active/controller/waiting이 없는 경우에는 bounded timeout 뒤 브라우저 완전 종료·재실행 복구를 명시한다. 캐시·저장 삭제나 상시 unregister, 다른 scope 우회로 이를 성공처럼 위장하지 않는다.
- Game-over restart는 사용자가 선택한 recovery snapshot을 원자 복원하며 story 안의 rewind flag를 만들지 않는다.
- Reward, part, boss와 route transition은 reload/repeated trigger에서 중복 지급하지 않는다.
- Room transition, input sequence와 encounter reset은 interruption 뒤 stale command/entity를 다음 Room으로 넘기지 않는다.

## Graphics Resource Review Boundary

- 독립 Render Lab screen/canvas/입력 경로는 제거한다. 그래픽 검토 adapter는 sample 재생과 diagnostics만 소유하고, interactive test play는 기존 GameApplication이 저장 없는 별도 GameApp context로 실행한다. test context도 기존 simulation·input·renderer를 사용하며 종료 시 listener/RAF를 반환한다. 정상 save/recovery port를 만들거나 호출하지 않는다.
- Catalog 기반 탐색 tree와 선택 대상의 문맥 command를 UI가 분리하여 소유한다. 원형 찾기 tree는 catalog의 모든 resource leaf를 포함하고 category→region→room 그룹과 제한된 페이지로 최종 선택까지 책임진다. thumbnail/search는 보조 경로다. 원형 반경은 버튼 충돌을 피하는 최소 간격으로 줄이고 하위 이동은 동일 중심에서 펼친다. 모든 선택은 기존 stable ID/URL codec을 통과한다. pointer/touch/keyboard, edge-clamp, focus 복귀와 취소의 단일 owner를 두며 바깥 클릭이 게임 입력으로 새지 않는다.
- Test play target은 catalog의 실제 placement/장비 정보에서 composition adapter가 만든 검증된 요청이다. 지원되지 않는 producer는 이유와 함께 실행 불가로 표시하며 다른 장면으로 조용히 대체하지 않는다. 검토 선택과 test source는 URL로 복원하고 test에서 검토실로 돌아갈 때 같은 선택을 유지한다.

- 몹 유형 reference는 인간형·사족 짐승형·날개 비행형·궤도 기계형의 별도 의미 본 계층과 공용 clip을 가진다. 외형·본 배치/비율과 유형별 motion source를 분리하여 컨셉 아트로부터 새 profile을 만들 때 clip을 복제하지 않는다. 먼저 검토실의 대표 네 개와 본 비율 변형으로 retargeting을 검증하고 실전 몹 전파는 Human의 유형별 시안 검토와 명시적 적용 요청 이후로 둔다.
- Reference 원본의 부착 위치와 모든 vertex는 부모 축 기준 [-1,1] 로컬 정규좌표다. 부모 extent와 child size ratio가 크기를 소유하고 quaternion rotation을 포함한 부모 transform을 한 번 합성한 뒤 2D로 투영한다. 자식은 부모 위치·크기·회전에 따라간다. CPU에서 매 frame 이미지나 source topology를 다시 만들지 않고 정적 triangulation을 한 번 compile한다. 수동 sprite 재생성은 디자인 원본 계약이 아니다.

- Immutable graphics catalog는 production content와 producer를 연결하는 유일한 등록 경로다. 주인공, NPC, 모든 현재 적, 장비, 배경·전경·지형·건물·설비·소품, 시간에 따른 효과와 UI를 stable resource/action/frame ID로 식별한다. 원본 map의 비활성 item과 patch variant도 inventory에 포함한다. 아직 구현되지 않은 motion이나 리소스를 가짜 preview로 만들지 않는다.
- 검토 sampler는 게임이 사용하는 pose·공격 크기·shared geometry·presentation producer와 Polygon renderer를 호출한다. 별도 캐릭터 보드 그림, QA 전용 무기 크기 계산과 복제 UI markup을 유지하지 않는다. 등록된 production data가 바뀌면 같은 ID의 검토 출력도 함께 바뀐다.
- UI adapter가 선택, 필터, frame index, 60Hz 정상 재생·정지, viewport와 확대 배율을 소유한다. URL codec이 모든 재현 조건을 검증하고 같은 page의 debug 진입/복귀와 정합시킨다. Copy는 사용자 입력에서만 clipboard에 리소스·동작·프레임·renderer·조명·배치·URL을 쓴다. 외부 피드백 전송이나 player save mutation은 하지 않는다.
- 정적 리소스는 thumbnail·실제 크기·확대로, animated producer는 action별 frame strip과 동일 sample의 연속 재생으로 검토한다. 장면 배치는 실제 map resolution과 광원·차폐를 그대로 사용하고 개별 보기에서도 scene provenance를 표시한다. UI는 production component 자체와 동일 read model을 별도 저장 없는 검토 context에서 표시한다.
- Catalog coverage fixture는 원본 content/producer inventory와 등록 ID를 비교하고 누락·중복을 실패시킨다. Actual desktop/mobile PNG·연속 frame, 접근 가능한 control, 복사와 URL 왕복, player game debug 비노출은 독립 verifier가 판독한다.

## Performance, Security and Compatibility

- Human의 릴리즈 선언 전 제품 버전은 0.x.y이며 개발용 save·내부 API·옛 형식의 하위 호환 유지 의무는 없다. 현재 기획을 막는 호환 계층은 제거할 수 있으며 호환되지 않는 저장은 정상 복구로 위장하지 않고 초기화 사실을 알린다.
- Fixed runner는 catch-up 상한과 dropped-step diagnostics로 runaway simulation을 막는다.
- Canvas backing size는 CSS size와 DPR을 고려하되 logical viewport/gameplay scale을 변경하지 않는다.
- Static server는 repository root 탈출, backslash traversal과 허용되지 않은 method/path를 거부하고 올바른 MIME과 `nosniff`를 제공한다.
- Mobile verification tunnel은 secret, personal data나 production state를 노출하지 않는다.

## Verification Direction

- Syntax, lint와 formatting은 `npm run check`, patch whitespace는 `git diff --check`로 검사한다.
- Combat/input/map/progression rule은 DOM 없는 deterministic fixtures로 검증한다.
- Campaign fixture는 Day 1 morning/D-30, 네 segment rollover, zero-cost action, one-segment travel, preview warning, idempotent commit, 마지막 작업의 route patch·거리 기반 D-DAY 변화, five-part final unlock과 D-DAY 0 terminal boundary를 고정한다.
- Persistence fixture는 campaign round-trip, incompatible schema의 명시적 거부/초기화 안내, corrupt/write failure와 recovery slot selection을 검증한다.
- 시작 화면의 명시적 디버그 버튼과 기존 hold 진입은 같은 panel owner를 사용하고 닫을 때 실제 opener로 focus를 돌려준다.
- Browser flow는 MENU short operation map, MENU hold debug separation, HUD/map same-state projection, desktop/mobile focus·overflow와 console error를 확인한다.
- PWA fixture는 manifest field/icon purpose, root scope·navigation fallback, complete cache inventory, offline first-visit fallback, waiting update의 user-applied single reload 및 storage/cache 분리를 고정한다.
- Prologue fixture는 의뢰→라이벌 동행→탐색·전투→회수팔 붕괴/구조 요청→독백→제어핵 회수·구조→접속부 봉쇄·각성→귀환의 stage order, input-lock 경계, transcript, save/reload와 중복 보상 방지를 고정한다.
- Story Browser flow는 목표 HUD를 숨긴 상태에서 원인·감정·다음 행동이 world bubble과 실제 action으로 이해되는지, bubble 없이 objective ribbon만으로 전체 story가 누출되지 않는지, ambient 이동과 transcript replay가 campaign state를 다시 쓰지 않는지 확인한다.
- Region fixture는 authored cast/issue graph completeness, primary 1 + linked 2 window, cross-region dependency의 실제 encounter/state-change 조건, order independence, stable before/in-progress/after map patch와 robot module accumulation을 고정한다.
- Pacing fixture는 집중 main chain이 initial D-DAY budget의 약 75~80%를 사용하고 optional/error path가 남은 여유를 소비하며 반복 실패가 terminal boundary에 닿음을 고정한다.
- Visual 변경은 stable intro/region/robot/last-segment/game-over/final-battle scenario를 actual Browser viewport PNG로 만들고 직접 판독한다.
- Visual fidelity 기준 장면은 protagonist, NPC, normal enemy, representative terrain, foreground/background,
  dynamic light, one attack/hit set와 HUD를 한 stable combat scenario에 포함한다. Desktop 1280×720과
  mobile 844×390의 actual PNG와 grayscale 변환에서 role, attack tell, collision terrain와 interaction
  target을 직접 판독하고 effect/HUD occlusion도 확인한다.
- Lighting fixture는 quantized level 수, directional/point falloff, occluder shadow, material response와
  transient attack-light lifetime을 DOM 없는 deterministic input으로 고정한다. Impact fixture는
  strength별 hit-stop, direction-first camera offset, recoil/decay와 reduced-motion fallback을 고정한다.
- Character implementation 전 design comparison은 front/side/representative pose와 actual gameplay scale에서 role·attack readability를 판정한다.
- Ending fixture는 armor/weapon 파괴, control core 노출, 첫 device 재설치와 epilogue의 지역별 기계 반환·공식 수거팀 state를 idempotent하게 고정한다.
- Architecture verification은 dependency direction, campaign/time final writer uniqueness, renderer read-only와 UI policy-free boundary를 검사한다.
- 모든 Execution Goal은 구현 맥락과 분리된 verifier가 Desired State, actual product와 evidence를 비교한다. Verifier는 구현을 직접 고치지 않는다.

## Engineering Conventions and Forbidden Structures

- Product behavior를 바꾸는 결정은 구현 전에 `PRODUCT_GOAL.html`, Engineering structure를 바꾸는 결정은 구현 전에 이 문서를 현재형으로 갱신한다.
- Pure function → owned composition → explicit capability 순으로 가장 작은 책임 단위를 선택하고 speculative abstraction을 만들지 않는다.
- Mutable global state, circular import, renderer-side simulation, UI-side campaign rule, gameplay-aware storage adapter와 hidden fallback success를 금지한다.
- UI가 concrete campaign/equipment profile을 직접 import하거나 gameplay coordinator가 concrete authored map/content를 default import하지 않는다.
- Region별 flow code 복제, portal별 time charge, wall-clock/offline progress와 background Chunk simulation을 금지한다.
- Placeholder, 설명 없는 TODO와 verification 범위 축소를 완료 결과로 남기지 않는다.
- Repository commit subject와 explicit merge message는 기본적으로 한국어를 사용하고 기술 token은 보존한다.
- Human 보고는 쉬운 한국어로 현재 결과, verification evidence, 남은 Gap과 필요한 판단을 먼저 전달한다.

## Development Runtime

- `AGENTS.md`는 Method와 네 root Project Source만 bootstrap한다.
- `INBOX.md`는 아직 처리하지 않은 Human feedback만 보존하고 `STATE.md`는 current comparison/evidence만 유지한다.
- Gap이 있으면 runtime은 `RUNNING`이고 모든 Product와 Engineering Desired State가 current evidence로 충족될 때만 `IMPLEMENTATION_COMPLETE`가 된다.
- 실행 환경은 Agent, local process, CI나 review tool을 사용할 수 있지만 repository contract와 완료 의미는 어느 하나에 의존하지 않는다.
