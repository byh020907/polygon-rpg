# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다.

## Runtime Status

`RUNNING`

## Current Phase

`Human Feedback Priority — 현재 기획을 막는 모션·공격 판정의 구형 구조를 먼저 audit하고 현재 Engineering Desired State를 확정한다. 이번 tick은 mobile Visual QA resize가 Canvas를 지운다는 실제 gap을 고쳤다. fresh Day 1 input flow의 roll·rival dialogue·collector encounter와 desktop/mobile composition은 관찰했지만, 첫 feedback의 전체 연속 motion/attack 검증은 아직 닫히지 않았다.`

## Human Feedback Priority

- INBOX의 새 인터뷰 확정 항목(현재 기획 기반 구조 교체)은 최우선 미완료다. 모션·공격 판정에서 반복 수정의 병목이 되는 legacy assumption과 compatibility 잔재를 Desired State·현재 code·실제 play로 audit한 뒤, 필요한 Architecture 현재형 갱신과 같은 영역의 재구성을 먼저 선택한다. 기존 모션·공격 feedback은 대체하지 않는다.
- INBOX 첫 항목(구르기·전체 모션 3D 투영·화면 비율)은 미완료다. `inputQa=1` fresh Day 1 flow에서 right+guard는 roll stamina 100→82, rival dialogue와 collector encounter까지 실제 입력으로 진행됐다. 1280×720/844×390 visual QA resize cycle은 같은 immutable frame을 재투영해 world가 유지되고, normal mobile에도 Player·NPC·collector·facility·landmark와 비가림 touch control이 보인다. 그러나 complete real-time roll strip, Enemy response와 요구된 다섯 scene의 연속 판독은 없다.
- INBOX의 PWA release metadata/update flow 및 visible-weapon↔authoritative-hit contact feedback도 pending이며, 첫 항목의 observable result가 완료될 때까지 후순위다.

## Desired-State Comparison

| Area                                      | Status    | Current evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL / Combat & Character    | gap       | `npm run test:combat` PASS: local-3D parent-child interpolation, motion timing, contact, stamina, cancellation, roll distance/evade/collision, keyboard/touch parity and shared Player/Enemy geometry remain fixed. New-origin fresh Day 1 Browser flow confirms same-grammar right+guard causes an actual roll (stamina 100→82). Full real-time roll strip and Enemy response are unverified. |
| PG-SCRAP-READABILITY / PG-VISUAL-FIDELITY | gap       | 0.77 player shared render/contact scale is fixture-verified at 107px/540px (~19.8%). Existing desktop/mobile fresh-save evidence covers dialogue, basic/air attack and non-occluding controls. Complete roll plus NPC/facility/landmark five-scene continuous comparison remains unverified.                                                                                                   |
| PG-PLATFORM-ACCESS / Visual QA            | gap       | `GameApp` now replays its frozen manual Visual QA frame after CanvasHost resize; focused platform fixture and in-app 1280×720 → 844×390 cycle show the intro world instead of a cleared black canvas. Full feedback acceptance remains unverified. |
| Current-plan architecture                 | gap       | New INBOX interview explicitly permits replacing legacy bottlenecks without backward compatibility before release. Motion/contact legacy assumptions and affected Architecture/test/debug contracts have not yet been audited or redesigned. |
| PG-PWA-OFFLINE                            | gap       | INBOX canonical release metadata, real A→B installed-worker update, and visible version UI are unimplemented/unverified.                                                                                                                                                                                                                                                                       |
| Weapon contact                            | gap       | INBOX actual gameplay reproduction, visible sweep/hurt overlay and all-attack/target verification are unimplemented/unverified.                                                                                                                                                                                                                                                                |
| Remaining campaign / story / final        | gap       | Regional encounter density, complete five-region flow, final battle and ending remain.                                                                                                                                                                                                                                                                                                         |
| PG-RECOVERY                               | satisfied | Pre-action/morning/core-event recovery slots and deterministic fixture remain current evidence.                                                                                                                                                                                                                                                                                                |

## Active Execution Goal

`INBOX dependency chain: audit current motion/contact legacy bottlenecks against Product Goal + Architecture → write required current Engineering Desired State (including permitted no-compatibility boundary) → replace the smallest blocking ownership path → fresh-save real input and continuous desktop/mobile evidence. Do not remove the existing roll/3D projection/contact feedback; acceptance remains no exposed legacy 2D clip, attached equipment, unchanged collision/evade/save/input behavior, and actual continuous play evidence.`

## Verification

- `npm run test:platform`, `npm run test:combat`, focused ESLint/Prettier and `git diff --check` PASS.
- Codex in-app Browser: fresh Day 1 `inputQa=1` actual input reached rival dialogue then first collector encounter; right+guard made roll stamina 100→82. Normal 844×390 showed Player, NPC, collector, large wreck/facility and non-occluding touch controls. Visual QA 1280×720 → 844×390 resize retained the same intro world after the fix.
- The first Human Feedback remains FAIL/unverified until continuous roll/Enemy and all required five desktop/mobile compositions are independently inspected; new current-plan architecture priority is unstarted.

## Blockers

없음.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its execution and verification reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`. It contains skeleton/roll/framing work and ground attack contact fixes; required continuous desktop/mobile visual evidence was not completed. Before reusing it, compare against newer main and pending INBOX, preserve both implementations, and independently verify the relevant changes. This reference is recovery evidence, not completion or permission to overwrite current work.
