# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다.

## Runtime Status

`RUNNING`

## Current Phase

`Human Feedback Priority — 캐릭터 모션·구르기·전체 화면 비율 재작업. Player와 Enemy authored strip의 fractional sample은 x/y/z·pitch/yaw/roll local transform을 보간한 뒤 parent-child matrix를 재합성해 world/projected joint를 만들며, Enemy renderer와 authoritative weapon/hurt geometry도 같은 sampled joint를 직접 소비한다. Player shared render/contact scale 0.77은 body/equipment silhouette를 960×540 viewport의 약 19.8%로 보존한다; forward-roll contact turn을 재작성했다. 다음 전선은 fresh-save prologue에서 연속 입력·구르기 chain을 실행하고 1280×720/844×390 frame strip을 실제 판독하는 것이다.`

## Human Feedback Priority

- INBOX 첫 항목(구르기·전체 모션 3D 투영·화면 비율)은 미완료다. `SkeletonPoseProjection.js`는 scalar screen-plane transform을 3축 local rotation matrix와 parent-child matrix composition으로 교체했으며, authored strip 사이도 projected 2D joint가 아니라 local transform에서 보간한다. `SharedCombatGeometry.js`와 `TrainingEncounterPresentation.js`는 Enemy의 sampled limb joint를 weapon origin, body/head hurt polygon, 몸통·머리·사지 렌더링에 직접 공유한다. Player shared render/contact scale 0.77은 actual body/equipment bounding box 107px/540px(약 19.8%)를 fixture로 고정하고, roll contact는 1.28 rad의 forward torso turn과 ground-level hand/feet tuck으로 재작성했다. in-app Browser에서 desktop과 844×390 mobile actual Canvas의 scale·HUD/control framing, deterministic roll contact frame을 판독했지만 fresh-save 연속 입력/구르기와 연속 frame strip은 아직 없다.
- INBOX의 PWA release metadata/update flow 및 visible-weapon↔authoritative-hit contact feedback도 pending이며, 첫 항목의 observable result가 완료될 때까지 후순위다.

## Desired-State Comparison

| Area                                      | Status    | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL / Combat & Character    | gap       | `npm run test:combat` PASS: Player 전 motion strip, combat active-frame alignment, 120Hz command/contact, roll distance/evade/collision 및 keyboard/touch parity를 유지한다. roll fixture는 readable forward torso turn (>=1.15 rad, < full spin), ground-level head/hand/feet tuck, parent-child local-3D recomposition을 검증한다. shared-geometry fixture는 machine/human의 idle·windup·attack·recovery·hit·guard·surrender에서 renderer limb/body/head와 authoritative sampled joint/polygon의 exact parity를 검증한다. fresh-save 연속 조작 판독은 남았다. |
| PG-SCRAP-READABILITY / PG-VISUAL-FIDELITY | gap       | Player shared render/contact scale 0.77은 960×540 logical viewport에서 body/equipment silhouette 107px(약 19.8%)를 fixture로 검증한다. in-app Browser의 desktop와 844×390 mobile Canvas에서 Player·facility·HUD·touch control framing을 판독했다. fresh-save prologue·roll chain 및 1280×720/844×390 representative scene frame strip은 아직 미검증이다.                                                                                                                                                                                                        |
| PG-PWA-OFFLINE                            | gap       | INBOX의 canonical release metadata, real A→B installed-worker update, version UI 요구는 미구현/미검증이다.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Weapon contact                            | gap       | INBOX의 actual gameplay reproduction, visible sweep/hurt overlay, all-attack/target contact verification은 미구현/미검증이다.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Remaining campaign / story / final        | gap       | 기존 verified playable frontier에서 regional encounter density, complete five-region flow, final battle and ending remain.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| PG-RECOVERY                               | satisfied | pre-action/morning/core-event recovery slots and deterministic recovery fixture remain current evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Active Execution Goal

`INBOX motion feedback, dependency chain: (1) actual 3D local transform + Player direct keyframe joint consumption done; (2) local-transform interpolation + parent-child world recomposition for Player/Enemy samples done; (3) Enemy renderer and combat geometry consume the same sampled limb positions without gameplay-authority change; (4) Player 18–22% scale fixture and forward-roll contact strip revised and deterministic fixtures PASS; (5) inspect all Player/Enemy strips and reframe representative prologue/garage scenes; (6) fresh-save input flow and desktop/mobile actual frame-strip evidence. Acceptance: no legacy 2D clip path for exposed Player/Enemy motion, equipment stays attached, and existing collision/evade/save/input contracts remain unchanged.`

## Verification

- `npm run test:combat` PASS after roll change: shared combat geometry, player presentation, local-transform motion continuity, enemy bone pose, stamina and posture/cancel checks.
- `prettier --check` and `git diff --check` PASS for the changed source/test files.
- Fresh-context independent verifier: partial pass. Fractional Player/Enemy samples recompute world joints from local transforms and Player/Enemy renderer/geometry share sampled joints. It rejected scale 1 because it produced 25.8%; 0.77 returns the measured body/equipment silhouette to 19.8%. Continuous visual evidence remains a gap.
- Codex in-app Browser: desktop and 844×390 mobile actual Canvas show the broader scene, Player, facility and HUD/touch controls together; deterministic baseline roll playback contact frame was visually inspected. This is not fresh-save/continuous-frame-strip evidence and does not close the feedback.

## Blockers

없음.
