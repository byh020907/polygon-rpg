# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`RUNNING` — PWA 실기기 검증은 Human 확인 대기이지만 전역 blocker가 아니며, 폐광 산촌 전선을 계속 검증·구현한다.

## Current Phase

`Human Feedback Priority / Verified Playable Frontier — 새 Day 1 폐광 입력으로 작업반장 3줄→현황판→연결 이슈 modal→항구 용접공·현황판을 실제 입력으로 진행했다. 현황판 뒤 연결 전투 경로가 막혀 있던 gap을 수리했고, 갱도·전투·마지막 작업을 거친 지역 after-state 및 mobile 연속 입력은 계속 미검증이다.`

## Active Execution Goal

`PG-CAST-CONTINUITY` / Architecture Story Interaction·Authored Campaign Content·Rendering, Input and Accessibility — 새 저장의 폐광 산촌에서 작업반장·대기 광부·라이벌과 굴착기 흐름이 before/in-progress/resolved 상태로 실제 입력에 따라 변하고, 연결 이슈·갱도 전투·마지막 작업·부품 회수 후 같은 지역의 생활/설비 변화가 desktop과 mobile에서 읽힌다. 이번 tick은 주목표가 활성화된 뒤 항구·온실의 required field-combat route를 열고, encounter completion을 active issue window만 소유하는 domain action으로 연결했다. 실제 desktop에서 항구 현황판 뒤 점거 건선거 portal과 케이블 수거 유닛(HP 76/76) spawn까지 확인했다. 다음 tick은 두 linked combat 완료→폐광 core event→갱도/마지막 작업/after-state를 실제 입력으로 검증한다.`

## Desired-State Comparison

| Area                                              | Status                       | Current evidence                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pixel depth / protagonist design / sword and roll | satisfied                    | 작은 셀의 약한 픽셀화와 안티앨리어싱 없는 단단한 경계를 유지한다. 가는 선·소수 위치·측면의 얇은 도형도 최소1픽셀 윤곽을 유지하고 뒤쪽 가림은 보존한다. 작은 머리·긴 팔다리·낮은 횡·사선 베기와 실제 전방 회전을 actual frame strip 및 combat/character/visual fixture로 검증했다. |
| Shared geometry / contact                         | satisfied                    | 보이는 weapon·sweep·hurt geometry와 damage owner의 공통 계약을 11종 공격, 좌우, 중복 피해, guard fixture 및 실제 representative input으로 확인했다.                                                                                                                               |
| PWA release update                                | unverified · Human 확인 대기 | release metadata/cache/save-before-apply fixture는 PASS. persistent profile A→B waiting/apply/save/offline 재실행은 Human이 확인하며 자동 PASS로 닫지 않는다.                                                                                                                     |
| Story terminology                                 | satisfied                    | 도입·다섯 지역 cast의 현장 대사와 transcript가 동일 authored catalog를 사용하며 현장 행동·결과로 용어를 푼다.                                                                                                                                                                     |
| Mine cast frontier                                | partial                      | Browser 새 Day 1에서 작업반장 3줄→현황판→연결 이슈 2개 modal→항구 용접공·현황판을 actual held input으로 진행했다. 항구 core event는 mine 주목표 때문에 계속 blocked이며, 수리 뒤 점거 건선거 portal과 케이블 수거 유닛 spawn을 실제 확인했다. linked combat 완료·온실 연결·폐광 core/after-state와 mobile continuous input은 아직 unverified다. |
| Remaining product                                 | gap                          | 전체 캠페인/최종전/PWA 실기기 등 미검증 Desired State를 완료로 추정하지 않는다.                                                                                                                                                                                                   |

## Verification

- Rendering reference: [Godot integer viewport scaling](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html#stretch-scale-mode)과 [Unity Pixel Perfect / Upscale Render Texture](https://docs.unity3d.com/kr/Packages/com.unity.render-pipelines.universal@8.2/manual/2d-pixelperfect.html)을 참고했다. game world·actor·그림자를 정수 RGBA 버퍼에서 처리하고 최종 Canvas는 putImageData 1회로 출력한다.

- 정지 외곽선 재검증: 기존 global alpha 외곽선은 불투명 world에 합친 캐릭터를 찾지 못했다. 현재는 actor의 실제 불투명 pixel mask에서 윤곽을 완성한 뒤 전용 IntegerPixelSurface로 world를 합성하고 정수 배율로 복제한다. 이전 desktop/mobile/DPR2 정지 상태에서 약98% 달랐던 actor 윤곽 픽셀이 현재 143개 최종 정지 frame 모두 실제 게임과 일치했다. `artifacts/idle-outline-before`, `artifacts/idle-outline-final`에 비교 및 pixel 좌표 evidence를 보존한다.

- 픽셀 표현 조정: 기본 셀4→3, Retro 월드·그림자 경계를 정수 coverage로 생성하고 nearest-neighbor 확대를 유지한다. 독립 1280×720/844×390 실제 입력 캡처 `artifacts/fine-pixel-independent-desktop`, `artifacts/fine-pixel-independent-mobile`에서 작은 픽셀·번짐 없는 경계와 기존 동작을 확인했다. visual/platform/PWA metadata 검사 PASS.

- Highest permission preflight와 loop guard verified. 사용자 첨부 원본은 수정·stage·commit하지 않았다.
- `npm run test:campaign`, `npm run lint`, changed-file Prettier check, `git diff --check` PASS. `npm run release:metadata`와 `npm run release:metadata:check` PASS; deployable release metadata regenerated.
- Codex in-app Browser `?inputQa=1&inputQaRenderer=polygon&inputQaStart=scrap-mine-roadhead`: Day 1/D-30 새 시작에서 mine briefing·시설 확인 뒤 연결 이슈를 열고, actual long-road travel과 shipyard briefing·시설 확인을 거쳐 core event는 blocked인 채 점거 건선거로 전이했다. 첫 active linked enemy `건선거 케이블 수거 유닛 · HP 76/76`을 확인했다.
- Independent verifier: shipyard linked route/bridge and focused fixture PASS; 발견한 active-primary ownership defect는 GameScene 및 campaign domain validation으로 수리했고 campaign regression PASS. Greenhouse runtime route는 다음 actual flow에서 확인한다.

## Blockers

없음. PWA persistent A→B는 Human 확인 대기이며 다른 개발을 멈추지 않는다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`; it was compared but not merged or deleted.
