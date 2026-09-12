# Derived Loop State

## Current Phase

RUNNING — 선택된 REF-01 master SVG를 실제 주인공·프롤로그 cast와 검토실에 연결했다. Codex heartbeat와 OpenCode 자동 실행은 Human pause 상태이며 명시적 재개 전까지 유지한다.

## Active Execution Goal

Human Feedback Priority — REF-01 선택 콘셉트 대비 단순한 vector 외형·중요 pose의 완성도를 개선하고 실제 gameplay scale에서 검토한다. 현재 주인공/프롤로그 cast 연결을 유지하며 지역별 구형 정적 라이벌은 잔존 Gap으로 추적한다. 새 시각적 선택은 3안을 제시하고 Human 선택을 받는다.

## Current Evidence / Gap

- 게임·그래픽 검토실·저장 없는 테스트 플레이는 같은 `WebGlPolygonRenderer`와 immutable RenderFrame/pose/geometry를 사용한다. 기존 CPU `DepthPolygonRasterizer`, ImageData/putImageData와 Canvas 2D production renderer는 제거했고 release `85c50776f3ef`은 네 WebGL module을 offline asset으로 포함한다.
- scene painter order와 연속 depth group을 분리하고 opaque depth/write → 가려지는 polygon stroke → back-to-front translucent no-write → visible silhouette 순서로 합성한다. DPR/resize, 4× review, shared thumbnail staging context, screen replacement rollback, resource dispose, context-loss 감지와 WebGL2 미지원 안내를 실제 browser fixture로 검사했다.
- 동일 Chrome/viewport render-only 기준에서 `scrap-art-benchmark` desktop p95 23.5→6.7ms, mobile p95 19.1→7.1ms, `combat-hit` desktop p95 66.6→6.9ms, mobile p95 22.5→9.0ms였다. 300-frame actual staged combat은 desktop/mobile p50 8.4/8.0ms, p95 15.6/16.1ms였고 heap은 GC 하강을 포함한 sawtooth라 단조 증가하지 않았다. production geometry를 사용한 5-enemy render stress는 desktop/mobile p95 5.6/11.9ms, garage는 9.9/8.0ms였다.
- `graphics:qa` 98 checks, desktop/mobile actual input motion 755/1141 frames, fresh-profile 도입 전체 browser flow, combat geometry/damage owner, mobile menu 34 viewport records와 인앱 browser 실제 화면·console을 확인했다. 게임 규칙·120Hz simulation/60Hz combat·저장 schema와 공격 contact는 변경하지 않았다.
- PWA는 active worker metadata 미식별을 새 cache 설치 실패로 취급하지 않는다. waiting worker 자체 build와 서버 최신 release가 일치할 때만 진행/recovery 저장 후 자동 적용하고, 미식별 waiting은 활성화하지 않는다. 실제 지속 Chromium profile에서 A offline → broken B 유지 → save 실패 차단 → 재확인 뒤 B 자동 적용·두 탭 자동 전환 → stale C 차단 → C 자동 적용·offline reopen과 single reload를 PASS했다. 새 PWA feedback은 Product/Architecture와 구현이 소유해 INBOX에서 제거했다.
- `PRODUCT_GOAL.html`은 기존 requirement ID·문장·표·링크를 보존하면서 상단 전역 바, 좌우 탐색, 문서 제목·도구·분류, 접을 수 있는 목차, 번호형 절과 표 중심의 위키 문서 구조로 재구성했다. wide/desktop/mobile/print에서 구조·접근성·overflow와 실제 화면을 검증한다.
- REF-01 candidate v1은 1672×941 한 장에서 주인공 front/side/3/4와 낮은 횡베기·접촉·강공 후반·전방 회전 구르기, 라이벌 front/side/3/4·갈고리 이동, 고철장 주인 front/side/3/4·정비·중량 도구 운반을 비교한다. 기존 주인공 기술 참고와 Human 첨부의 작고 단순한 머리·긴 팔다리 비율을 출발점으로 삼되 식별 가능한 디자인을 복제하지 않았다.
- Human이 REF-01 option 1을 제작 방향으로 선택했다. `docs/art-handoff/reference-approval.html`은 선택 기록과 `master SVG/runtime 미적용` 상태를 분리하고, 이후 새 시각 판단은 의미 있게 다른 3안을 한 번에 비교해 Human이 고른 안만 제작 authority로 넘기는 계약을 표시한다.
- 선택 방향을 `scrapyard-apprentice` 22 parts/26 shapes, `rival-scout` 25 parts/32 shapes, `scrapyard-owner` 26 parts/34 shapes의 Humanoid master SVG로 옮겼다. 각 원본은 material/normal/occlusion, ground와 역할별 tool grip/tip anchor, 고유 체형·복장·도구와 실제 far/mid/near 디테일 차이를 유지하며 adjacent LOD SVG·compiled JSON 및 source provenance를 생성·검사한다.

- 실제 createGameScene가 주인공 master를 기본 연결하고 게임·검토실이 같은 visible weapon/shield를 사용한다. 잘못 뒤를 향하던 master 검 부착을 전방 축에 정렬하고 기존 장비/공격별 길이와 도달거리를 보존했다. 11종 공격의 양방향 contact·miss·도달거리와 실제 damage owner 검사를 통과했다.
- 라이벌/주인은 SVG 원본 limb 축과 길이를 canonical pose에 매핑한다. 80개 자세·방향 표본에서 8개 limb endpoint 및 hook/wrench/ledger grip의 손 부착, 게임/검토 동일 형상과 고유 ID를 검증했다. 원본이 사용하는 leather의 조명 반응도 명시했다.
- artifacts/ref-01-runtime의 desktop/mobile은 주인공 idle/slash/roll과 세 인물 비교를 실제 renderer로 캡처했다. artifacts/ref-01-play-desktop 및 ref-01-play-mobile은 실제 입력 연속 화면 245/336개를 포함한다. 선택 콘셉트 대비 낮은 세부 밀도·단순한 형태는 여전히 시각 품질 Gap이며 연결 성공을 최종 아트 승인으로 취급하지 않는다.

Human Feedback Priority Gap: REF-01은 주인공/프롤로그 runtime 연결까지 검증했고, 선택 raster에 비해 단순한 vector 형태·세부와 추가 authored key pose는 미완성이다. 다섯 지역에 남은 정적 라이벌 외형은 아직 전환하지 않았다. REF-02 Core/Retrieval Arm부터 새 시각 판단은 3안 Human gate를 거치며, REF-03 Ancient Machine, REF-04 Garage 0%의 승인 원본/Composition도 아직 없다. 강제 WEBGL_lose_context restore와 실제 legacy Chromium reopen, 측정 기기 밖의 설치형 mobile GPU·장시간 memory는 계속 unverified다. 남은 INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 `artifacts/enemy-redesign`에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
