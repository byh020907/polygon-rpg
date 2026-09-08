# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`RUNNING` — PWA 설치형 A→B 검증은 Human 확인 대기지만 전역 blocker가 아니다. Human Feedback Priority의 실제 폐광 연결 이슈 전선을 계속 검증한다.

## Current Phase

`Human Feedback Priority / Verified Playable Frontier — 새 저장에서 폐광의 작업반장·구조 현황판을 실제 입력으로 마쳐 두 연결 이슈가 열리고, 폐광→고물상→항구 실제 연결로를 확정해 건선거까지 진행했다. 항구 케이블 수거 유닛은 Strong으로 HP 76→56까지 실제로 맞았으나, KO 뒤 held 이동·공격이 그대로 적용되어 재접근·재KO가 이어질 수 있음을 재현했다. KO 복귀 뒤 release 전까지 이전 held input을 중립화하는 수리는 fixture로 검증했으며, 수리된 새 저장의 항구 완료·귀환은 아직 실제 검증되지 않았다.`

## Active Execution Goal

`PG-CAST-CONTINUITY` / Architecture Authored Campaign Content·Campaign Domain·Story Interaction·Rendering/Input — dependency chain은 KO stale-held-input 복귀 수리 → 항구 건선거 cable 확보 → 온실 압력 버팀쇠 확보 → 폐광 core event/갱도/마지막 작업/after-state다. 새 저장의 production input으로 이 흐름을 끝까지 완료하고, 작업반장·대기 광부·라이벌과 설비가 before/in-progress/resolved 상태로 변하는지 desktop/mobile에서 판독한다. 범위에는 linked encounter의 실제 combat/recovery 결과와 portal 귀환이 포함되며, fixture의 KO fence PASS로 성공하지 못한 actual 전투를 대체하지 않는다.`

## Desired-State Comparison

| Area | Status | Current evidence |
| --- | --- | --- |
| Pixel depth / protagonist design / sword and roll | satisfied | IntegerPixelSurface와 실제 게임 정지 프레임에서 외곽선·저해상도 nearest-neighbor 확대·작은 머리/긴 팔다리·낮은 횡/사선 베기와 전방 구르기를 확인했다. |
| Shared geometry / contact | satisfied | 항구 건선거의 production Strong 1회가 보이는 수거 유닛 HP 76→56으로 반영됐다. combat fixture는 renderer/authoritative sweep/hurt/damage contract를 통과한다. |
| PWA release update | unverified · Human 확인 대기 | release metadata, cache/save-before-apply fixture는 PASS. persistent installed PWA의 A→B waiting/apply/offline 재실행은 Human 확인이 필요하다. |
| Story terminology | satisfied | 도입과 다섯 지역 cast는 같은 authored catalog의 현장 bubble/transcript로 행동·결과를 먼저 전달한다. |
| Mine linked-region frontier | partial | 실제 폐광 briefing·facility·disabled core preview와 항구 briefing·facility·건선거 portal까지 확인했다. 첫 linked enemy damage와 KO reset은 actual로 확인했고, KO 때 남은 held input이 즉시 재진입시키지 않도록 수리했다. 양 linked encounter 완료, portal return, greenhouse branch, mine core/after-state, mobile 연속 입력은 unverified다. |
| Remaining product | gap | 전체 캠페인/최종전과 Human PWA 확인을 포함한 Product/Architecture의 미검증 조건을 완료로 추정하지 않는다. |

## Verification

- Highest permission preflight와 loop guard verified. 사용자 첨부 원본은 수정·stage·commit하지 않았다.
- Codex in-app Browser (`?inputQa=1&inputQaRenderer=polygon&inputQaStart=scrap-mine-roadhead`)에서 새 저장의 폐광 작업반장 3문장·구조 현황판 2문장·연결 이슈 2개 표시를 실제 `↑`/이동 입력으로 확인했다.
- 같은 session에서 폐광→고물상→항구의 1구간 연결로를 확정하고 조선소 용접공·도크 현황판을 완료한 뒤 건선거 portal에 들어갔다. 케이블 수거 유닛은 Strong 1회에 `76/76 → 56/76`; 이후 KO는 encounter를 `76/76`으로 reset하고 campaign clock을 한 segment 전진시켰다. 완료·귀환 evidence가 아니므로 남은 링크를 PASS로 처리하지 않는다.
- KO 당시 held input을 neutralize하지 않아 다음 frame에 stale 이동·공격이 재적용될 수 있던 원인을 `GameScene`에서 확인했다. `node scripts/scrap-recovery-check.mjs`, `node scripts/scrap-campaign-check.mjs`, `npm run lint`, targeted Prettier 및 `git diff --check`는 PASS이며, KO 직후 held 이동·Strong이 release 전에는 실행되지 않고 release 뒤 새 이동만 허용되는 recovery fixture를 추가했다.
- `node scripts/scrap-awakening-check.mjs`, `npm run test:campaign`, `npm run lint`, `npm run release:metadata:check`, `git diff --check` PASS.
- Independent verifier는 linked-flow fixture가 `encounter.completeForVisualQa()`로 shipyard/greenhouse 완료를 seed한다는 점을 확인했다. domain wiring은 통과하지만 fresh-save production combat·귀환 증거가 아니므로 Active Execution Goal을 완료 처리하지 않았다.

## Blockers

없음. PWA persistent A→B는 Human 확인 대기이며 다른 개발을 멈추지 않는다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
