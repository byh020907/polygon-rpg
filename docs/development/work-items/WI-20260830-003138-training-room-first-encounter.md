---
id: WI-20260830-003138
status: integrating
priority: high
lane: dedicated
created_at: 2026-08-30T00:31:38+09:00
depends_on: []
reopens: null
review: team-lead
source: roadmap
source_ref: M1
---

# 훈련방 첫 전투 조우

## 팀장 원문 또는 파생 근거

승인된 roadmap의 다음 미충족 milestone인 `M1 — 훈련방 첫 전투 조우`에서 파생했다.

플레이어가 기본 검·방패로 훈련 몬스터의 기본 공격을 guard하고, 강공격을 구르기로 통과해 배후를 잡은 뒤 launcher → 공중 combo → 착지까지 반복 플레이할 수 있는 첫 전투 수직 단위를 완성한다.

## 접수 해석

현재 motion demo를 120Hz fixed-step 위의 결정적 전투 조우로 확장한다. 입력·판정·적 패턴·animation·VFX·camera를 하나의 플레이 가능한 경로로 통합하며 Polygon/Retro renderer가 동일한 gameplay 결과를 표현하게 한다.

## 인터뷰와 결정

- M1 시작 인터뷰에서 기본 공격, 강공격, guard, roll의 실제 키 조합과 command 우선순위를 팀장에게 결과·영향과 함께 확인한다.
- 2026-08-30 인터뷰 요청: 현재 입력 계약을 보존해 기본공격 `A`/모바일 `X`, 강공격 `S`/모바일 `Y`, Guard `↓` held, Roll `←/→ + ↓` edge를 사용하고 `controls lock/공간전환 > Roll > Jump cancel > 동시 A/S의 Strong > idle Guard` 순으로 해석하는 안을 권장했다. 이 안은 새 입력 버튼 없이 기존 adapter·mobile catalog·combo guide를 유지한다. Roll 전용 키는 입력·모바일 UI·가이드를 함께 바꾸고, 동시 입력의 Basic 우선은 launcher chord 오인을 늘린다.
- 2026-08-30 팀장 결정: 권장안을 M1 canonical 입력 계약으로 확정했다. 기본공격 `A`/모바일 `X`, 강공격 `S`/모바일 `Y`, Guard `↓` held, Roll `←/→ + ↓` edge를 사용하며 Roll 시작 방향은 고정한다. 우선순위는 `controls lock/공간전환 > 방향+↓ Roll > ↑ Jump cancel > 동시 A/S Strong > idle Guard`이고 active 중에는 가장 최근 유효 공격 하나만 buffer한다.
- 2026-08-30 팀장 feedback: “피드백할 건 많은데 일단 넘기고 우선순위 높은 내용을 알려주겠다.” 현재 M1 candidate는 추가 체감 수정 없이 승인해 통합 대상으로 넘긴다. 이후 전달될 높은 우선순위 feedback은 이 candidate 통합을 막지 않으며 coordinator가 별도 후속 이력 또는 명시적 reopen으로 처리한다.
- module boundary, combat frame data, state ownership, event/effect buffer와 camera 책임은 현재 코드와 Engineering Reference 증거로 Director가 결정한다.
- 원작 캐릭터·몬스터·명칭·motion·수치·asset·command열은 차용하지 않는다.

## 실행 계약

- 먼저 `CombatFrame`, `CombatEvent`, RenderFrame extension과 writer ownership을 고정한다.
- 60Hz integer combat frame data를 120Hz simulation이 결정적으로 샘플하는 timeline 또는 동등하게 읽기 쉬운 시간 계약을 만든다.
- 방향+공격 command resolution, input history/buffer, hitbox/hurtbox, facing, guard, damage, hit/block stun을 구현한다.
- roll movement/invulnerability/통과/배후 판정과 enemy의 guardable basic, roll-required heavy, punish window를 연결한다.
- launcher, airborne, juggle 제한, 공중 combo와 landing을 연결한다.
- 실제 contact와 sword trail은 별도 `combatContact` DTO와 gameplay-owned weapon geometry가 제공하고, hit-stop·flash/reaction·impact·camera는 gameplay 판정 branch가 직접 갱신한다. Bounded `CombatEvent`는 확정된 guard·evade·hit·launch·punish·landing result lifetime과 evade/punish procedural feedback만 전달한다.
- Polygon/Retro renderer가 동일한 판정·animation state를 읽기 전용으로 소비하게 한다.
- debug 조작 없이 시나리오 전체를 반복 플레이하고 입력 실패와 판정 실패를 화면에서 구분할 수 있게 한다.
- 사용자 요청 없는 영구 test·fixture·test script는 추가하지 않는다.

## 품질 계약

- 적용 축: 기능 완결성, 조작감, 타격감, Effect, Graphics, Reference 정합, 회귀 안전성.
- 최소 threshold: `docs/development/quality-loop.md`의 모든 적용 축 2 이상이며, 0 또는 1이 남은 candidate는 제출하지 않는다.
- 증거: DOM 없는 결정적 combat 진단, 실제 Canvas의 Polygon/Retro 플레이 경로, resize와 console 상태, 마지막 writer 뒤 독립 검증.
- feedback gate: 팀장이 로컬 또는 모바일 플레이 경로에서 guard → roll 배후 회피 → launcher → 공중 combo → 착지 방향을 확인한다.

## 평가 기록

- Baseline: work item 파생 문구와 달리 현재 `main`에는 training enemy, 실제 weapon/hurt polygon contact, guard·damage·stun, roll invulnerability, launcher·juggle·landing, hit-stop·camera feedback이 이미 통합돼 있다. 아직 60Hz integer frame data와 명시적인 `CombatFrame`/`CombatEvent` DTO는 없고 전투 writer와 presentation snapshot 조립이 `GameScene`에 집중돼 있어 M1 실행 계약 대비 구조·실제 플레이 증거를 다시 평가해야 한다.
- Iteration 1 병목: roadmap은 Guard 가능한 Light → Roll이 필요한 Heavy를 요구했지만 runtime의 첫 공격은 Heavy이고 Heavy도 Guard 가능했다. 첫 neutral을 Light로 시작하고 Heavy의 Guard를 제거했으며 60Hz integer `CombatFrame`, bounded causal `CombatEvent`, RenderFrame 진단을 추가했다. 실제 Heavy contact를 Roll 무적으로 통과하면 cyan evade afterimage, enemy attack recovery 배후에서 Rising이 적중하면 gold punish burst가 발생한다.
- Iteration 2 병목: 첫 frozen candidate의 독립 검증에서 portal 위치의 같은 snapshot에 `↑ + 수평 + ↓`가 들어오면 공간 전환과 Roll이 동시에 생성되는 우선순위 위반을 발견했다. Jump edge가 portal/connection transition을 시작한 tick에는 Guard/Roll branch를 건너뛰고 이후 controller도 lower-priority combat command를 받지 않게 수정했다. 같은 snapshot에 Basic/Strong까지 포함한 재현에서 transition만 생성되고 목적지에서도 Roll·숨은 combat command가 재개되지 않았다. 또한 canonical 문서가 존재하지 않는 CONTACT event/consumer를 단정한 표현을 제거하고 `combatContact` DTO, direct 판정 feedback과 result event lifetime의 실제 경계를 구분했으며 Landing 표현을 실제 8 combat frame과 정합했다.
- Current best rubric: 기능 완결성 2, 조작 명료성 2, 타격감·Effect 2, Graphics·시각 일관성 2, Reference 정합 2, 회귀 안전성 2. 첫 Light guard는 HP 100을 유지하고 다음 Heavy guard는 HP 80, Heavy roll-through는 HP 100과 배후 통과, `AS → ↑+A → A`는 `launch:rising → hit:airSlash → hit:airReturn → landing` event를 남겼다. 120Hz 다섯 sample의 60Hz frame index는 `[0, 0, 1, 1, 2]`였고 동시 A/S는 Heavy를 선택했다. Portal에서 `↑ + → + ↓ + A + S`를 함께 발행해도 transition만 시작되고 Roll·Guard·attack은 생성 또는 지연 실행되지 않았다.
- Actual artifact: `npm run dev`의 `http://127.0.0.1:5173/`에서 새 게임 → 광장 왼쪽 portal `↑` → 전투 실험 던전. Render Lab은 같은 RenderFrame을 Polygon/Retro에 동시에 표시한다. Desktop load, `900×600` resize, Polygon/Retro 비교와 console error 부재를 확인했다.
- 다음 병목: 현재 integration gate에는 없음. 팀장이 추후 전달할 guard timing, Heavy telegraph·Roll 거리, punish·air chase 등의 높은 우선순위 체감 feedback은 통합 이후 별도 loop에서 다룬다.

## 규칙 후보

- 현재 없음. Heavy를 Guard 가능하게 만든 구현/roadmap 불일치는 이번에 처음 확인됐고 canonical 문서와 runtime을 즉시 정합했다. 같은 원인이 반복되면 enemy attack profile의 guardability와 roadmap encounter grammar를 비교하는 규칙 후보로 승격한다.

## Reference Brief

- 제품 Reference: roadmap에 기록된 관대한 기본 combo, Guard 가능한 기본 공격, Roll이 필요한 Heavy, 배후 punish와 숙련자용 cancel·공중 route의 원칙만 사용했다. 원작 command열·motion·수치·asset은 사용하지 않았다.
- 현재 Polygon RPG — 직접 재사용: 120Hz `FixedStepRunner`, monotonic input sequence, `CombatCommandController`, Target Pose/IK, gameplay swept-contact geometry와 Polygon/Retro 공유 RenderFrame을 유지했다.
- Baeseongjin — 수정: `FixedStepRunner`/`InputSampler`/`GameApp` caller의 frozen input 경계와 `CombatEffectBuffer`의 causal event → local presentation ownership을 현재 단일-player 규모에 맞춘 bounded immutable event로 축소했다. broad scene snapshot, multiplayer viewer/manager, mutable allocating particle array와 preset 값은 비차용했다.
- Ball Fight Simulator — 원칙만 차용: `commandIntent`와 `BatBallAbility`의 sequence별 command cycle·단일 정산, collision detection/response 분리, Canvas effect 가시성의 문제 정의를 확인했다. 현재 M1은 rigid-body response가 필요하지 않아 공용 impulse solver를 가져오지 않았고, mutable `SlashTrail` entity 대신 기존 gameplay-owned swept ribbon과 bounded event lifetime을 유지했다.
- 결과물: 훈련방에서 Light guard → Heavy roll-through → 배후 Rising punish → air combo → landing을 반복하는 통합 artifact와 동일한 Polygon/Retro feedback.

## 결과

팀장이 현재 candidate를 추가 수정 없이 승인했다. 모든 적용 rubric 축 2 이상이고 독립 re-verifier가 actionable finding 없이 통과했으므로 coordinator integration-ready 상태다. 이후 높은 우선순위 체감 feedback은 현재 통합과 분리해 처리한다.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M1 — 훈련방 첫 전투 조우`
- 업무보고: `docs/development/reports/WI-20260830-003138-training-room-first-encounter.md`
