# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다.

## Runtime Status

`RUNNING`

## Current Phase

`Human Feedback Priority — 모션·구르기·전체 화면 비율 재작업. Player/Enemy local-3D parent-child joint와 renderer/authoritative geometry 공유, 0.77 scale 및 forward roll fixture가 구현됐다. 별도 fresh Day 1 Browser flow의 same-grammar right+guard held action은 roll stamina 100→82를 실제로 만들었다. 다음 전선은 same fresh-save normal gameplay의 timed capture로 complete roll, Enemy response, desktop/mobile composition을 판독하는 것이다.`

## Human Feedback Priority

- INBOX 첫 항목(구르기·전체 모션 3D 투영·화면 비율)은 미완료다. `inputQa=1`은 별도 fresh-save local verification surface에서 keyboard/mobile와 같은 action·sequence snapshot으로 simultaneous held input을 만들고, blur/hidden 및 map/modal/screen change에서 latch와 UI state를 함께 clear한다. Actual right+guard input은 roll stamina 100→82를 만들었다. 그러나 complete real-time roll strip, Enemy response와 NPC·집·설비·landmark를 포함한 다섯 desktop/mobile scene의 연속 판독은 없다.
- INBOX의 PWA release metadata/update flow 및 visible-weapon↔authoritative-hit contact feedback도 pending이며, 첫 항목의 observable result가 완료될 때까지 후순위다.

## Desired-State Comparison

| Area                                      | Status    | Current evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL / Combat & Character    | gap       | `npm run test:combat` PASS: local-3D parent-child interpolation, motion timing, contact, stamina, cancellation, roll distance/evade/collision, keyboard/touch parity and shared Player/Enemy geometry remain fixed. New-origin fresh Day 1 Browser flow confirms same-grammar right+guard causes an actual roll (stamina 100→82). Full real-time roll strip and Enemy response are unverified. |
| PG-SCRAP-READABILITY / PG-VISUAL-FIDELITY | gap       | 0.77 player shared render/contact scale is fixture-verified at 107px/540px (~19.8%). Existing desktop/mobile fresh-save evidence covers dialogue, basic/air attack and non-occluding controls. Complete roll plus NPC/facility/landmark five-scene continuous comparison remains unverified.                                                                                                   |
| PG-PWA-OFFLINE                            | gap       | INBOX canonical release metadata, real A→B installed-worker update, and visible version UI are unimplemented/unverified.                                                                                                                                                                                                                                                                       |
| Weapon contact                            | gap       | INBOX actual gameplay reproduction, visible sweep/hurt overlay and all-attack/target verification are unimplemented/unverified.                                                                                                                                                                                                                                                                |
| Remaining campaign / story / final        | gap       | Regional encounter density, complete five-region flow, final battle and ending remain.                                                                                                                                                                                                                                                                                                         |
| PG-RECOVERY                               | satisfied | Pre-action/morning/core-event recovery slots and deterministic fixture remain current evidence.                                                                                                                                                                                                                                                                                                |

## Active Execution Goal

`INBOX motion feedback dependency chain: local-3D transform → interpolated parent-child samples → shared Enemy render/contact joints → player scale and roll strip → fresh-save real input. The input evidence surface now supports right+guard simultaneously without state injection and clears safely; capture the complete fresh-save roll time strip, Enemy response and five required desktop/mobile compositions next. Acceptance: no legacy 2D clip path for exposed Player/Enemy motion, equipment remains attached, and collision/evade/save/input contracts remain unchanged.`

## Verification

- `npm run test:combat`, `npm run test:platform`, `npm run test:pwa`, focused eslint/Prettier and `git diff --check` PASS.
- Codex in-app Browser at `127.0.0.1:5275/?inputQa=1`: fresh Day 1 player flow reached the rival objective; right and guard visibly latched together, actual roll reduced stamina 100→82, and `입력 해제` returned both latches to 0.
- Fresh-context independent verifier PASSed the QA lifecycle repair, but Human Feedback completion remains FAIL/unverified until continuous roll, Enemy and five-composition Browser captures exist.

## Blockers

없음.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its execution and verification reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`. It contains skeleton/roll/framing work and ground attack contact fixes; required continuous desktop/mobile visual evidence was not completed. Before reusing it, compare against newer main and pending INBOX, preserve both implementations, and independently verify the relevant changes. This reference is recovery evidence, not completion or permission to overwrite current work.
