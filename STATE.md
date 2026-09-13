# Derived Loop State

## Current Phase

WAITING_FOR_HUMAN — Human이 선택한 1안의 지하 유적 도입 동선과 진행을 실제 runtime·문서·PC/mobile 입력 검증까지 반영했다. 다음 시각 제작 단계인 REF-02 Core/Retrieval Arm은 서로 다른 후보 3개를 제시한 뒤 Human 선택을 받아야 한다. Codex heartbeat와 OpenCode 자동 실행은 Human pause 상태이며 명시적 재개 전까지 유지한다.

## Active Execution Goal

Human Feedback Priority — 선택된 지하 유적 도입을 기준 Composition으로 사용해 다음 그래픽 제작 순서인 REF-02 Core/Retrieval Arm의 gameplay-scale 후보 3개를 준비하고 Human 선택 뒤에만 master/runtime 자산으로 확정한다. 현재 지하 맵의 기술용 핵·회수팔·고대 병기·차고 실루엣은 동선과 인과 검증용 baseline이며 REF-02~05 최종 디자인 승인이 아니다.

## Current Evidence / Gap

- Product Goal과 Architecture는 생활형 고물상 → 지하 유적 상층 선별 데크 → 케이블 수거 유닛 한 기로 실제 다리 개방 → 흉곽 경사로·지지판 조사 → 하부 제어실 붕괴·제어핵 구조·고대 병기 각성 → D-30 → 하층 정비로 귀환 → 핵 분석·0% 차고를 현재 도입으로 소유한다. 선택 기록은 docs/art-handoff/prologue-map-candidates.html, 지하 유적 정제 이미지는 docs/references/prologue-scenes/prologue-scene-option-1-underground-selected.png다. 2·3안은 비선택 비교 기록이다.
- runtime은 고물상·상층 데크·흉곽 경사로·하부 제어실·하층 정비 귀환로의 다섯 Room과 stage별 재개 위치를 사용한다. 기존 21 stage ID는 저장 호환을 유지하지만 실제 필수 전투는 길을 여는 한 번이며, 붕괴와 각성 완료는 각각 제어실과 정비 귀환로로 이동한다. 교량 아래 복귀 발판·상층 복귀 경사, 지하 조명 material, 고물상 interaction/portal 간격과 하층 왼쪽 방향 표식을 검증했다.
- blank save PC 1280×720 keyboard와 mobile 844×390 native touch가 고물상→상층→경사로→제어실→정비로→고물상을 실제 입력으로 완주했다. 정비로는 오른쪽 끝에서 왼쪽 portal까지 1,238px 이동하며 중간/최종 reload, 구조→핵 회수→각성→D-30 순서, 차고 0%, console error 0을 보존한다. 도입 runtime 33 checks와 map/systems/platform/graphics/story/campaign/visual 검사를 통과했다.

- 모든 읽기용 HTML 문서는 Product Goal과 같은 위키 포맷을 공유한다. docs/wiki.css와 scripts/wiki-document.mjs가 51개 저장소 문서 및 모션 보고서의 기본 구조를 소유하며 AGENTS/Architecture/docs/document-format.md가 새 문서에도 같은 규칙을 요구한다. 기존 NPC 목록 주소는 현 목록으로 연결하면서 ID를 보존한다. 기존 캡처 보고서 12개의 표시를 갱신했고 PNG/JSON 3,206개와 재생 스크립트·시간 정보는 유지했다.

- 선택 이미지: docs/references/ref-01/appearance-option-2-selected.png. 공유 Ref01Appearance가 굵은 큰 부위 외곽선, 절제된 내부선, 두 단계 명암과 최저 밝기를 소유한다. 게임 인물과 원본 SVG 검토에도 같은 표현을 적용한다.
- 주인공 master는 25 parts/54 shapes로 소매·옷깃·교차 스트랩·버클·튜닉·부츠 커프·손·검 손잡이·방패 패널을 갖춘다. 라이벌은 27 parts/70 shapes로 조끼·스카프·손·감개·파우치·갈고리를, 주인은 28 parts/79 shapes로 넓은 작업복·앞치마·공구 벨트·장갑·장부·스패너를 갖춘다. 모든 원본은 실제 far/mid/near 구분과 provenance export를 유지한다.
- 주인공의 damaging weapon/shield contour와 기존 도달거리는 보존한다. 새 방패 장식에도 equipmentSlot을 부여해 방패 해제 시 장식이 남지 않는다. 11종 공격의 양방향 contact/miss/도달거리, 캐릭터 비율, 장비 적용과 shared pose/anchor 검사를 수행한다.
- 다섯 지역의 구형 정적 라이벌 그림을 같은 rival-scout cast SVG로 교체했다. 대화 entity/문구는 보존하고 available/in-progress/resolved/되돌림 상태의 단일 배치·표시·숨김·대화 조건을 검사한다.
- artifacts/ref-01-runtime은 PC/mobile idle/run/slash/heavy/roll 및 세 인물 비교를 포함한다. artifacts/ref-01-regional은 다섯 지역의 PC/mobile 실제 화면, artifacts/option2-detail-desktop 및 option2-detail-mobile은 실제 입력 연속 화면 318/341개를 포함한다. 문서에서 볼 수 있는 결과는 docs/references/ref-01/appearance-option2-runtime-desktop.png 및 appearance-option2-runtime-mobile.png이다.
- 기존 WebGL2 렌더러, PWA 자동 업데이트와 v10/v11 저장 보존은 유지한다. 이번 외형 적용을 게임 전체 또는 다음 reference의 Human 승인으로 확대하지 않는다.
- 이번 범위의 독립 검토, 전투 11종·장비·캐릭터·SVG export/anchor, 그래픽 2569 samples/870 RenderFrame 비교, 시스템, 프롤로그·지역 33개 흐름, PC/mobile 실제 화면과 PWA 검사를 통과했다. 원본 주인공 318-frame 연속 입력과 mobile 341-frame 입력에서 세부 장비가 유지되는지 판독했다.

Human Feedback Priority Gap: 동일 공간 대화·5연전이던 도입 맵·진행 Gap은 선택된 지하 유적 동선과 실제 입력 증거로 닫혔다. 다음에는 이 Composition 안에서 REF-02 Core/Retrieval Arm 후보 3개를 먼저 비교하고, 선택 뒤 REF-03 Ancient Machine, REF-04 Garage 0%와 REF-05 composite의 원본·승인을 이어간다. 현재 기술용 polygon/SVG 외형을 최종 아트 승인으로 확대하지 않는다. 기존 강제 WEBGL_lose_context restore, legacy Chromium reopen, 다른 기기의 GPU·장시간 memory는 unverified다. 이번 범위와 무관한 남은 INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안 local codex/enemy-silhouette-redesign / f4f350b37d081bfdc5863773f80521b4cccaf38f는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate opencode/product-goal-loop/20260905142359-2188ab1adfbe at 0d5a9dc remains unmerged in C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe. Report: .git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json.
