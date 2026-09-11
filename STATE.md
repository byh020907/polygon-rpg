# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — 기존 승인 주인공 스타일을 보존하면서 실제 gameplay의 기본 횡베기와 강한 사선 베기를 양방향 정상 속도·접촉에서 다시 다듬는다. 낮은 준비, 골반·흉곽 선행, 빠른 접촉과 후반 감속이 한 동작으로 읽혀야 하며 이번에 복구한 공중 칼날 면·판정과 완료된 도입/REF-02/03/04 기술 기준선을 회귀시키지 않는다.

## Current Evidence / Gap

- `scripts/graphics-review-qa.mjs`는 주인공 공격 11개를 desktop actual Browser에서 좌우 각각 1×/60fps로 연속 재생한다. 22개 시퀀스 모두 준비부터 회수까지 최소 85.2%의 서로 다른 frame을 실제 Canvas pixel로 통과했고 12-frame strip을 `artifacts/graphics-review`에 남겼으며 suite의 console/runtime error는 0이다.
- `airSlash`, `airHeavy`, `airReturn`, `airCross`의 손목 3D depth 회전을 90도 edge-on singularity 밖의 연속 곡선으로 다시 저작했다. 실제 review frame의 칼날 최소 면적은 기존 최대 대비 2–11%에서 59–64%로 회복되었고 좌우 strip에서 반전 pop 없이 넓은 cutter 면이 유지된다.
- 같은 pose sample을 쓰는 `attack-contact-check`는 11개 공격의 양방향 miss/edge/hit·HP·event·sweep lifecycle을 production `GameScene` damage owner까지 PASS했다. 네 공중 공격의 mirrored contact 경계는 약 118~126px이며 damage/stamina/active window/camera는 변경하지 않았다.
- 실제 입력 Browser에서 `airSlash`/`airHeavy` 좌우 연속 actor strip을 추가로 판독했고, Codex in-app Browser에서 오른쪽 `airSlash`와 왼쪽 `airCross`를 정상 속도로 재생해 칼날 면 유지와 새 console error 없음도 확인했다.
- `npm run check`와 `npm run test:pwa`는 PASS했다. 연속 full check에서 드러난 field graphics Browser의 navigation/import 경합은 HTTP document complete 대기 후 재현 없이 통과한다.
- 구현과 분리된 verifier는 22개 1× strip, 네 공중 공격의 좌우 동일 접촉 경계, `test:combat`의 실제 damage owner·HP/event·stamina/timing 보존과 in-app Browser spot check를 다시 확인해 PASS했다.

Human Feedback Priority Gap: Human이 기본 횡베기 동작을 여전히 어색하다고 판정했으므로 현재 낮은 베기 결과는 완료가 아닌 다음 시각 개선 대상이다. REF-01 front/side/3/4와 action key pose, REF-02 Core/Retrieval Arm, REF-03 Ancient Machine, REF-04 Garage 0%의 승인 원본/Composition은 공급·승인되지 않았으며 현재 결과는 기술 기준선이다. mobile에서의 continuous intro/reload는 검증되지 않았고, `inputQa` 패널이 포함된 capture는 clean final composition 증거가 아니다. INBOX의 전체 그래픽 재작업·횡/사선 베기·접촉·모바일/연속 플레이 원문은 미완료로 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 `artifacts/enemy-redesign`에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
