# Derived Loop State

## Current Phase

WAITING_FOR_HUMAN — 최우선 그래픽 재작업의 첫 승인 관문인 REF-01 1차 후보를 만들었다. Codex heartbeat와 OpenCode 자동 실행은 Human pause 상태이며 명시적 재개 전까지 유지한다.

## Active Execution Goal

Human Feedback Priority — Human이 `docs/references/ref-01/hero-rival-owner-candidate-v1.png`의 주인공·라이벌·고철장 주인 체형, 역할 실루엣과 주인공 대표 동작을 검토한다. 수정 또는 명시적 승인 전에는 master SVG parts 제작·runtime 교체·REF-02 확장으로 진행하지 않는다.

## Current Evidence / Gap

- 게임·그래픽 검토실·저장 없는 테스트 플레이는 같은 `WebGlPolygonRenderer`와 immutable RenderFrame/pose/geometry를 사용한다. 기존 CPU `DepthPolygonRasterizer`, ImageData/putImageData와 Canvas 2D production renderer는 제거했고 release `85c50776f3ef`은 네 WebGL module을 offline asset으로 포함한다.
- scene painter order와 연속 depth group을 분리하고 opaque depth/write → 가려지는 polygon stroke → back-to-front translucent no-write → visible silhouette 순서로 합성한다. DPR/resize, 4× review, shared thumbnail staging context, screen replacement rollback, resource dispose, context-loss 감지와 WebGL2 미지원 안내를 실제 browser fixture로 검사했다.
- 동일 Chrome/viewport render-only 기준에서 `scrap-art-benchmark` desktop p95 23.5→6.7ms, mobile p95 19.1→7.1ms, `combat-hit` desktop p95 66.6→6.9ms, mobile p95 22.5→9.0ms였다. 300-frame actual staged combat은 desktop/mobile p50 8.4/8.0ms, p95 15.6/16.1ms였고 heap은 GC 하강을 포함한 sawtooth라 단조 증가하지 않았다. production geometry를 사용한 5-enemy render stress는 desktop/mobile p95 5.6/11.9ms, garage는 9.9/8.0ms였다.
- `graphics:qa` 98 checks, desktop/mobile actual input motion 755/1141 frames, fresh-profile 도입 전체 browser flow, combat geometry/damage owner, mobile menu 34 viewport records와 인앱 browser 실제 화면·console을 확인했다. 게임 규칙·120Hz simulation/60Hz combat·저장 schema와 공격 contact는 변경하지 않았다.
- PWA는 active worker metadata 미식별을 새 cache 설치 실패로 취급하지 않는다. waiting worker 자체 build와 서버 최신 release가 일치할 때만 진행/recovery 저장 후 자동 적용하고, 미식별 waiting은 활성화하지 않는다. 실제 지속 Chromium profile에서 A offline → broken B 유지 → save 실패 차단 → 재확인 뒤 B 자동 적용·두 탭 자동 전환 → stale C 차단 → C 자동 적용·offline reopen과 single reload를 PASS했다. 새 PWA feedback은 Product/Architecture와 구현이 소유해 INBOX에서 제거했다.
- `PRODUCT_GOAL.html`은 기존 requirement ID·문장·표·링크를 보존하면서 상단 전역 바, 좌우 탐색, 문서 제목·도구·분류, 접을 수 있는 목차, 번호형 절과 표 중심의 위키 문서 구조로 재구성했다. wide/desktop/mobile/print에서 구조·접근성·overflow와 실제 화면을 검증한다.
- REF-01 candidate v1은 1672×941 한 장에서 주인공 front/side/3/4와 낮은 횡베기·접촉·강공 후반·전방 회전 구르기, 라이벌 front/side/3/4·갈고리 이동, 고철장 주인 front/side/3/4·정비·중량 도구 운반을 비교한다. 기존 주인공 기술 참고와 Human 첨부의 작고 단순한 머리·긴 팔다리 비율을 출발점으로 삼되 식별 가능한 디자인을 복제하지 않았다.
- `docs/art-handoff/reference-approval.html`은 후보 이미지, Human 검토 항목, `승인 대기 · runtime 미적용` 상태를 함께 표시한다. 생성·등록을 승인으로 오인하지 않도록 정적 검사에서 이미지 크기·링크·상태 문구·금지된 완료 표시를 확인한다.

Human Feedback Priority Gap: REF-01 후보는 Human 승인 전이며 master SVG parts와 runtime에는 적용하지 않았다. 주인공의 강공 후반이 높은 준비 자세로 오해되지 않는지, 구르기에서 방패를 포함한 장비 부착이 자연스러운지, 라이벌/주인의 체형과 도구가 의도에 맞는지는 Human 판단이 필요하다. REF-02 Core/Retrieval Arm, REF-03 Ancient Machine, REF-04 Garage 0%의 승인 원본/Composition도 아직 없다. 강제 `WEBGL_lose_context` restore와 실제 legacy Chromium reopen, 측정 기기 밖의 설치형 mobile GPU·장시간 memory는 계속 unverified다. 남은 INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 `artifacts/enemy-redesign`에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
