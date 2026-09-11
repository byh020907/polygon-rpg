# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — 모바일 메인 메뉴에서 제목·게임 시작/이어하기·버전/업데이트 상태가 844×390 landscape와 좁은 portrait의 실제 보이는 높이·safe area 안에서 겹침이나 잘림 없이 읽히고 주요 버튼에 접근되는지 현재 output으로 다시 확인하고 수정한다. 전체 그래픽 재작업 우선순위와 기존 도입/주인공 모션 기술 기준선을 보존하며 승인되지 않은 reference나 캠페인 확장으로 넓히지 않는다.

## Current Evidence / Gap

- 기본 `slash`와 강한 `heavy`에 별도 `drive` key를 두어 load→drive에서 흉곽 이동이 손보다 먼저 일어나고, 손은 root 뒤에 남았다가 contact에서 앞을 통과한다. Basic tip 상승은 39.157px, Strong은 86.604px라 얕은 횡궤적과 큰 사선이 구분되고 기존 31/46 frame timing·stamina·이동 계약은 유지된다.
- `attack-contact-check`의 production `GameScene` damage owner에서 Basic/Strong 양방향 경계는 각각 147.109px/144.956px로 대칭이며 miss/hit·HP·event·sweep lifecycle을 PASS했다. desktop keyboard/mobile touch의 8개 실제 입력 strip은 검·방패·가방 연결, 머리 위 준비 없음, 바닥 비관통, Basic 100→88/Strong 100→76 stamina와 contact 결과를 보존한다.
- 그래픽 검토실은 정상 속도 측정과 정확한 12-frame 단일-cycle strip 생성을 분리했다. 최종 `graphics:qa` 98 checks에서 Slash 0..26, Heavy 0..40을 복원했고 다음 cycle의 wrap frame은 evidence에서 제외했다.
- `npm run check`, `npm run test:pwa`, `npm run graphics:qa`, `git diff --check`가 PASS했다. 구현과 분리된 verifier도 코드·8개 actual-input strip·전투 fixture를 다시 비교해 이번 횡/사선 베기 목표를 PASS했다.

Human Feedback Priority Gap: 모바일 메인 메뉴 화면 비율은 최신 actual viewport 재검증과 수정이 남았다. 전체 그래픽 재작업은 계속 최우선이며 REF-01 front/side/3/4와 action key pose, REF-02 Core/Retrieval Arm, REF-03 Ancient Machine, REF-04 Garage 0%의 승인 원본/Composition은 아직 공급·승인되지 않아 현재 결과는 기술 기준선이다. Human의 최종 손맛·reference 직접 비교, mobile continuous intro/reload와 clean final composition은 unverified다. INBOX의 전체 그래픽 재작업·접촉·모바일/연속 플레이 복합 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 `artifacts/enemy-redesign`에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
