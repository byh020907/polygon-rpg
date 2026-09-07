# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다.

## Runtime Status

`RUNNING`

## Current Phase

`Human Feedback Priority — 캐릭터 모션·구르기·전체 화면 비율 재작업. 3축 local transform과 parent-child world composition, side-view projection을 실제 Player authored keyframe에 연결했고, Player leg는 재계산 IK 대신 authored hip→knee→foot를 그대로 렌더한다. 그러나 보간 sample은 아직 이미 투영된 2D joint를 blend해 world joint를 잃으므로, 먼저 local 3D transform 보간→world 재합성으로 고친 뒤 Enemy presentation/geometry의 모든 limb 이관, fresh-save 연속 입력 및 desktop/mobile frame strip 판독을 수행한다.`

## Human Feedback Priority

- INBOX 첫 항목(구르기·전체 모션 3D 투영·화면 비율)은 미완료다. `SkeletonPoseProjection.js`는 scalar screen-plane transform을 3축 local rotation matrix와 parent-child matrix composition으로 교체했으며, `CharacterBonePoseLibrary.js`와 `EnemyBonePoseLibrary.js`의 authored joints가 pitch/yaw/z를 공급한다. `PlayerCombatPresentation.js`는 authored knee를 직접 사용한다.
- INBOX의 PWA release metadata/update flow 및 visible-weapon↔authoritative-hit contact feedback도 pending이며, 첫 항목의 observable result가 완료될 때까지 후순위다.

## Desired-State Comparison

| Area | Status | Current evidence |
| --- | --- | --- |
| PG-COMBAT-CONTROL / Combat & Character | gap | `npm run test:combat` PASS: Player 전 motion strip, combat active-frame alignment, 120Hz command/contact, roll distance/evade/collision 및 keyboard/touch parity를 유지한다. 추가한 3-axis parent probe는 parent yaw가 child z를 world x로 돌리는 것을 검증한다. 독립 verifier는 fractional Player roll/Enemy attack sample이 `worldJoints`를 잃고 projected 2D joint만 blend하며, enemy renderer가 scalar offset만 쓰는 것을 확인했다. |
| PG-SCRAP-READABILITY / PG-VISUAL-FIDELITY | gap | 기존 camera scale과 source-art profiles는 유지된다. 새 투영을 반영한 실제 in-app browser start scene에서 compact Player/NPC/facility framing과 ground basic attack을 확인했지만, fresh-save prologue·roll chain 및 1280×720/844×390 representative scene frame strip은 아직 미검증이다. |
| PG-PWA-OFFLINE | gap | INBOX의 canonical release metadata, real A→B installed-worker update, version UI 요구는 미구현/미검증이다. |
| Weapon contact | gap | INBOX의 actual gameplay reproduction, visible sweep/hurt overlay, all-attack/target contact verification은 미구현/미검증이다. |
| Remaining campaign / story / final | gap | 기존 verified playable frontier에서 regional encounter density, complete five-region flow, final battle and ending remain. |
| PG-RECOVERY | satisfied | pre-action/morning/core-event recovery slots and deterministic recovery fixture remain current evidence. |

## Active Execution Goal

`INBOX motion feedback, dependency chain: (1) actual 3D local transform + Player direct keyframe joint consumption done; (2) interpolate local transforms and recompute parent-child world joints for every runtime sample; (3) migrate Enemy renderer and combat geometry to the same sampled joint positions without changing gameplay authority; (4) redesign/inspect full roll and all Player/Enemy strips as continuous motion; (5) reframe representative prologue/garage scenes; (6) fresh-save input flow and desktop/mobile actual frame-strip evidence. Acceptance: no legacy 2D clip path for exposed Player/Enemy motion, equipment stays attached, and existing collision/evade/save/input contracts remain unchanged.`

## Verification

- `npm run test:combat` PASS: shared combat geometry, player presentation, motion continuity, enemy bone pose, stamina and posture/cancel checks.
- `prettier --write` completed for six changed source/test files; `git diff --check` PASS.
- Fresh-context independent verifier: partial pass only. Matrix composition and Player knee chain are present; local-transform interpolation, Enemy direct-joint rendering, explicit knee endpoint tests and continuous visual evidence remain gaps.
- Codex in-app browser, localhost start scene: visual menu and gameplay scene observed; actual ground basic attack responds. Continuous roll/fresh-save/mobile evidence remains required, not inferred from fixtures.

## Blockers

없음.
