# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`RUNNING` — PWA 실기기 검증은 Human 확인 대기이지만 전역 blocker가 아니며, 폐광 산촌 전선을 계속 검증·구현한다.

## Current Phase

`Human Feedback Priority / Verified Playable Frontier — in-app Day 1 폐광 연결로에서 held 입력으로 대기 광부→작업반장→구조 현황판을 완료했고, 선행 연결 이슈 2개가 없으면 9구간 core-event 확정이 disabled인 것을 실제 UI로 확인했다. 온실 연결 이슈 완료부터 이어지는 새 저장 경로, 폐광 core event·갱도·마지막 작업·after-state와 mobile 연속 입력은 계속 미검증이다.`

## Active Execution Goal

`PG-CAST-CONTINUITY` / Architecture Story Interaction·Authored Campaign Content·Rendering, Input and Accessibility — 새 저장의 폐광 산촌에서 작업반장·대기 광부·라이벌과 굴착기 흐름이 before/in-progress/resolved 상태로 실제 입력에 따라 변하고, 연결 이슈·갱도 전투·마지막 작업·부품 회수 후 같은 지역의 생활/설비 변화가 desktop과 mobile에서 읽힌다. 이번 tick은 in-app Day 1 폐광 연결로에서 continuous held input으로 대기 광부→작업반장→구조 현황판을 실제 순서대로 완료했고, `mine-rescue-operation` preview가 두 연결 이슈 미해결 상태에서 disabled임을 판독했다. 다음 tick은 새 저장의 Day 1 실제 입력에서 온실 연결 완료→폐광 core event→갱도/마지막 작업/after-state와 mobile을 검증한다.`

## Desired-State Comparison

| Area                                              | Status                       | Current evidence                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pixel depth / protagonist design / sword and roll | satisfied                    | 작은 셀의 약한 픽셀화와 안티앨리어싱 없는 단단한 경계를 유지한다. 가는 선·소수 위치·측면의 얇은 도형도 최소1픽셀 윤곽을 유지하고 뒤쪽 가림은 보존한다. 작은 머리·긴 팔다리·낮은 횡·사선 베기와 실제 전방 회전을 actual frame strip 및 combat/character/visual fixture로 검증했다.                                                                                                         |
| Shared geometry / contact                         | satisfied                    | 보이는 weapon·sweep·hurt geometry와 damage owner의 공통 계약을 11종 공격, 좌우, 중복 피해, guard fixture 및 실제 representative input으로 확인했다.                                                                                                                                                                                                                                       |
| PWA release update                                | unverified · Human 확인 대기 | release metadata/cache/save-before-apply fixture는 PASS. persistent profile A→B waiting/apply/save/offline 재실행은 Human이 확인하며 자동 PASS로 닫지 않는다.                                                                                                                                                                                                                             |
| Story terminology                                 | satisfied                    | 도입·다섯 지역 cast의 현장 대사와 transcript가 동일 authored catalog를 사용하며 현장 행동·결과로 용어를 푼다.                                                                                                                                                                                                                                                                             |
| Mine cast frontier                                | partial                      | In-app Day 1 폐광 연결로에서 QA held input으로 대기 광부→작업반장→구조 현황판을 완료하고, 두 연결 이슈가 없을 때 mine core preview의 시작 버튼이 disabled임을 확인했다. `npm run test:campaign`은 연결 이슈의 대상 지역 완료·순서 독립 reconciliation과 9구간 core event contract를 PASS했다. 실제 온실 연결 적 처치·폐광 core/after-state와 mobile continuous input은 아직 unverified다. |
| Remaining product                                 | gap                          | 전체 캠페인/최종전/PWA 실기기 등 미검증 Desired State를 완료로 추정하지 않는다.                                                                                                                                                                                                                                                                                                           |

## Verification

- Rendering reference: [Godot integer viewport scaling](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html#stretch-scale-mode)과 [Unity Pixel Perfect / Upscale Render Texture](https://docs.unity3d.com/kr/Packages/com.unity.render-pipelines.universal@8.2/manual/2d-pixelperfect.html)을 참고했다. game world·actor·그림자를 정수 RGBA 버퍼에서 처리하고 최종 Canvas는 putImageData 1회로 출력한다.

- 정지 외곽선 재검증: 기존 global alpha 외곽선은 불투명 world에 합친 캐릭터를 찾지 못했다. 현재는 actor의 실제 불투명 pixel mask에서 윤곽을 완성한 뒤 전용 IntegerPixelSurface로 world를 합성하고 정수 배율로 복제한다. 이전 desktop/mobile/DPR2 정지 상태에서 약98% 달랐던 actor 윤곽 픽셀이 현재 143개 최종 정지 frame 모두 실제 게임과 일치했다. `artifacts/idle-outline-before`, `artifacts/idle-outline-final`에 비교 및 pixel 좌표 evidence를 보존한다.

- 픽셀 표현 조정: 기본 셀4→3, Retro 월드·그림자 경계를 정수 coverage로 생성하고 nearest-neighbor 확대를 유지한다. 독립 1280×720/844×390 실제 입력 캡처 `artifacts/fine-pixel-independent-desktop`, `artifacts/fine-pixel-independent-mobile`에서 작은 픽셀·번짐 없는 경계와 기존 동작을 확인했다. visual/platform/PWA metadata 검사 PASS.

- Highest permission preflight와 loop guard verified. 사용자 첨부 원본은 수정·stage·commit하지 않았다.
- `npm run test:campaign`, `npm run lint`, changed-file Prettier check, `git diff --check` PASS. `npm run release:metadata`와 `npm run release:metadata:check` PASS; deployable release metadata regenerated.
- Codex in-app Browser `?inputQa=1&inputQaRenderer=polygon&inputQaStart=scrap-mine-roadhead`: Day 1/D-30 새 시작에서 mine briefing·시설 확인 뒤 연결 이슈를 열고, actual long-road travel과 shipyard briefing·시설 확인을 거쳐 core event는 blocked인 채 점거 건선거로 전이했다. 첫 active linked enemy `건선거 케이블 수거 유닛 · HP 76/76`을 확인했다.
- Independent verifier: shipyard linked route/bridge and focused fixture PASS; 발견한 active-primary ownership defect는 GameScene 및 campaign domain validation으로 수리했고 campaign regression PASS. Greenhouse runtime route는 다음 actual flow에서 확인한다.
- 이번 actual desktop 판독: 건선거 spawn 직후 Player x=126, 케이블 수거 유닛 x=720이며 사거리 밖의 Basic 반복은 완료 증거가 아니다. Player를 x=602까지 이동한 뒤 physical `A` 1회가 `HP 76/76 → 65/76`, stamina `100 → 93`을 만들었다. `npm run test:intro` PASS; 독립 verifier는 production completion signal→zero-cost immutable linked action→`clearedEncounterIds`→남은 부두 수거반 투영 fixture(`scripts/scrap-awakening-check.mjs:2675-2709`)를 재확인했다.

- linked-route return repair: 항구 두 연결 전투를 actual desktop Basic 입력으로 끝낸 직후 마지막 적 처치가 `scrapPendingLinkedIssueRegionIds`에서 항구를 제외해 bidirectional 건선거 출구를 비활성화하는 것을 관찰했다. route patch는 active issue의 immutable `scrapLinkedIssueRegionIds`를 읽도록 바꿨다. `node scripts/scrap-awakening-check.mjs`는 항구와 온실에서 production encounter completion 뒤 출구 patch 유지와 실제 jump portal 귀환을 확인했고, `npm run test:campaign`, `npm run lint`, release metadata check, changed-file Prettier 및 `git diff --check`도 PASS했다.

- 이번 in-app QA desktop 판독: `?inputQa=1&inputQaRenderer=polygon&inputQaStart=scrap-mine-roadhead`에서 실제 held input으로 x=730→558→676→849를 이동하며 대기 광부·작업반장(각 3문장)·구조 현황판(2문장)을 순서대로 완료했다. core-event preview는 `연결 이슈 2개를 현장에서 먼저 해결해야 합니다`를 보이며 `사건 시작 · 9구간`이 disabled였다. 이는 아직 target-region encounter를 끝낸 새 저장의 연속 흐름이나 mobile evidence는 아니다.

## Blockers

없음. PWA persistent A→B는 Human 확인 대기이며 다른 개발을 멈추지 않는다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`; it was compared but not merged or deleted.
