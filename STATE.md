# Derived Loop State

## Current Phase

WAITING_FOR_HUMAN — 도입 맵·진행 재구성의 씬 이미지 3안과 구간별 행동·변화·진행 조건을 제시한다. Human이 맵 방향을 선택해야 다음 지형/진행 구현을 확정할 수 있다. Codex heartbeat와 OpenCode 자동 실행은 Human pause 상태이며 명시적 재개 전까지 유지한다.

## Active Execution Goal

Human Feedback Priority — docs/art-handoff/prologue-map-candidates.html의 도입 동선 3안 중 Human이 선택한다. 같은 맵의 대화·처치 반복을 공간 이동·통로 개방·붕괴·달라진 귀환으로 바꾸는 것이 우선이다. 선택 후 지형·연결·상호작용·전투 목적·사건 전후를 함께 구현한다. 이번 시안은 REF-02~05 개별 자산 승인이나 runtime 변경이 아니다.

## Current Evidence / Gap

- Human이 현재 도입을 동일 맵의 대화·반복 처치로 느낀다는 피드백을 INBOX에 원문으로 보존했다. Product Goal은 장소·높이·통로·귀환 변화로 도입 진행을 체감해야 한다는 요구를 소유한다. 실제 맵 개편은 아직 미구현이다.
- 도입 후보는 1안 상층 진입/하층 귀환, 2안 레일 원정/변화한 귀환, 3안 폐병기 상·하 접근 분기/흉곽 합류다. 각 6개 장면과 장소·행동·지형 변화·다음 구간 조건을 scripts/prologue-scene-candidates.mjs에서 생성한다. 이미지·프롬프트는 docs/references/prologue-scenes에 보존한다.

- 모든 읽기용 HTML 문서는 Product Goal과 같은 위키 포맷을 공유한다. docs/wiki.css와 scripts/wiki-document.mjs가 51개 저장소 문서 및 모션 보고서의 기본 구조를 소유하며 AGENTS/Architecture/docs/document-format.md가 새 문서에도 같은 규칙을 요구한다. 기존 NPC 목록 주소는 현 목록으로 연결하면서 ID를 보존한다. 기존 캡처 보고서 12개의 표시를 갱신했고 PNG/JSON 3,206개와 재생 스크립트·시간 정보는 유지했다.

- 선택 이미지: docs/references/ref-01/appearance-option-2-selected.png. 공유 Ref01Appearance가 굵은 큰 부위 외곽선, 절제된 내부선, 두 단계 명암과 최저 밝기를 소유한다. 게임 인물과 원본 SVG 검토에도 같은 표현을 적용한다.
- 주인공 master는 25 parts/54 shapes로 소매·옷깃·교차 스트랩·버클·튜닉·부츠 커프·손·검 손잡이·방패 패널을 갖춘다. 라이벌은 27 parts/70 shapes로 조끼·스카프·손·감개·파우치·갈고리를, 주인은 28 parts/79 shapes로 넓은 작업복·앞치마·공구 벨트·장갑·장부·스패너를 갖춘다. 모든 원본은 실제 far/mid/near 구분과 provenance export를 유지한다.
- 주인공의 damaging weapon/shield contour와 기존 도달거리는 보존한다. 새 방패 장식에도 equipmentSlot을 부여해 방패 해제 시 장식이 남지 않는다. 11종 공격의 양방향 contact/miss/도달거리, 캐릭터 비율, 장비 적용과 shared pose/anchor 검사를 수행한다.
- 다섯 지역의 구형 정적 라이벌 그림을 같은 rival-scout cast SVG로 교체했다. 대화 entity/문구는 보존하고 available/in-progress/resolved/되돌림 상태의 단일 배치·표시·숨김·대화 조건을 검사한다.
- artifacts/ref-01-runtime은 PC/mobile idle/run/slash/heavy/roll 및 세 인물 비교를 포함한다. artifacts/ref-01-regional은 다섯 지역의 PC/mobile 실제 화면, artifacts/option2-detail-desktop 및 option2-detail-mobile은 실제 입력 연속 화면 318/341개를 포함한다. 문서에서 볼 수 있는 결과는 docs/references/ref-01/appearance-option2-runtime-desktop.png 및 appearance-option2-runtime-mobile.png이다.
- 기존 WebGL2 렌더러, PWA 자동 업데이트와 v10/v11 저장 보존은 유지한다. 이번 외형 적용을 게임 전체 또는 다음 reference의 Human 승인으로 확대하지 않는다.
- 이번 범위의 독립 검토, 전투 11종·장비·캐릭터·SVG export/anchor, 그래픽 2569 samples/870 RenderFrame 비교, 시스템, 프롤로그·지역 33개 흐름, PC/mobile 실제 화면과 PWA 검사를 통과했다. 원본 주인공 318-frame 연속 입력과 mobile 341-frame 입력에서 세부 장비가 유지되는지 판독했다.

Human Feedback Priority Gap: 도입 맵·진행 개편은 Human의 동선 선택 대기이며 실제 게임의 동일 공간 반복은 아직 해결되지 않았다. 확정 동선 안에서 REF-02 Core/Retrieval Arm, REF-03 Ancient Machine, REF-04 Garage 0%와 REF-05 composite의 원본/승인을 이어간다. 기존 강제 WEBGL_lose_context restore, legacy Chromium reopen, 다른 기기의 GPU·장시간 memory는 unverified다. 남은 INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안 local codex/enemy-silhouette-redesign / f4f350b37d081bfdc5863773f80521b4cccaf38f는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate opencode/product-goal-loop/20260905142359-2188ab1adfbe at 0d5a9dc remains unmerged in C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe. Report: .git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json.
