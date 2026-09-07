# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다.

## Runtime Status

`RUNNING`

## Current Phase

`Human Feedback Priority — 캐릭터 모션·구르기·전체 화면 비율 재작업. Player와 Enemy authored strip의 fractional sample은 x/y/z·pitch/yaw/roll local transform을 보간한 뒤 parent-child matrix를 재합성해 world/projected joint를 만들며, Enemy renderer와 authoritative weapon/hurt geometry도 같은 sampled joint를 직접 소비한다. 다음 전선은 fresh-save prologue에서 연속 입력·구르기 chain을 실행하고 1280×720/844×390 frame strip을 실제 판독하는 것이다.`

## Human Feedback Priority

- INBOX 첫 항목(구르기·전체 모션 3D 투영·화면 비율)은 미완료다. `SkeletonPoseProjection.js`는 scalar screen-plane transform을 3축 local rotation matrix와 parent-child matrix composition으로 교체했으며, authored strip 사이도 projected 2D joint가 아니라 local transform에서 보간한다. `SharedCombatGeometry.js`와 `TrainingEncounterPresentation.js`는 Enemy의 sampled limb joint를 weapon origin, body/head hurt polygon, 몸통·머리·사지 렌더링에 직접 공유한다. 아직 fresh-save 연속 입력/구르기와 실제 desktop/mobile frame strip 판독은 없다.
- INBOX의 PWA release metadata/update flow 및 visible-weapon↔authoritative-hit contact feedback도 pending이며, 첫 항목의 observable result가 완료될 때까지 후순위다.

## Desired-State Comparison

| Area                                      | Status    | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL / Combat & Character    | gap       | `npm run test:combat` PASS: Player 전 motion strip, combat active-frame alignment, 120Hz command/contact, roll distance/evade/collision 및 keyboard/touch parity를 유지한다. local interpolation fixture는 projected-joint midpoint와 다른 recomposed near-hand 위치 및 world matrix를, Enemy fixture는 모든 family/action sample의 skeletonFrame/world matrix를 검증한다. shared-geometry fixture는 machine/human의 idle·windup·attack·recovery·hit·guard·surrender에서 renderer limb/body/head와 authoritative sampled joint/polygon의 exact parity를 검증한다. fresh-save 연속 조작 판독은 남았다. |
| PG-SCRAP-READABILITY / PG-VISUAL-FIDELITY | gap       | 기존 camera scale과 source-art profiles는 유지된다. 새 투영을 반영한 실제 in-app browser start scene에서 compact Player/NPC/facility framing과 ground basic attack을 확인했지만, fresh-save prologue·roll chain 및 1280×720/844×390 representative scene frame strip은 아직 미검증이다. 현재 환경에는 지정된 in-app Browser control skill이 제공되지 않아 이를 PASS로 추정하지 않았다.                                                                                                                                                                                                                |
| PG-PWA-OFFLINE                            | gap       | INBOX의 canonical release metadata, real A→B installed-worker update, version UI 요구는 미구현/미검증이다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Weapon contact                            | gap       | INBOX의 actual gameplay reproduction, visible sweep/hurt overlay, all-attack/target contact verification은 미구현/미검증이다.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Remaining campaign / story / final        | gap       | 기존 verified playable frontier에서 regional encounter density, complete five-region flow, final battle and ending remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PG-RECOVERY                               | satisfied | pre-action/morning/core-event recovery slots and deterministic recovery fixture remain current evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Active Execution Goal

`INBOX motion feedback, dependency chain: (1) actual 3D local transform + Player direct keyframe joint consumption done; (2) local-transform interpolation + parent-child world recomposition for Player/Enemy samples done; (3) migrate Enemy renderer and combat geometry to the same sampled limb positions without changing gameplay authority; (4) redesign/inspect full roll and all Player/Enemy strips as continuous motion; (5) reframe representative prologue/garage scenes; (6) fresh-save input flow and desktop/mobile actual frame-strip evidence. Acceptance: no legacy 2D clip path for exposed Player/Enemy motion, equipment stays attached, and existing collision/evade/save/input contracts remain unchanged.`

## Verification

- `npm run test:combat` PASS: shared combat geometry, player presentation, local-transform motion continuity, enemy bone pose, stamina and posture/cancel checks.
- `prettier --check` and `git diff --check` PASS for the changed source/test files.
- Fresh-context independent verifier: partial pass. Fractional Player/Enemy samples now recompute world joints from local transforms; Player renderer/geometry continues to consume direct joints. Enemy renderer and authoritative geometry still require direct sampled-joint consumption; continuous visual evidence remains a gap.
- Codex in-app browser, localhost baseline roll playback: a compact Player, enemy and broad training space were visually observed in the actual Canvas. This is not fresh-save/mobile/continuous-frame-strip evidence and does not close the feedback.

## Blockers

없음.
