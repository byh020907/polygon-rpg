# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — REF-05 prologue gameplay-scale composite를 새 저장의 의뢰·라이벌 동행·구조·제어핵 회수·고대 병기 각성·D-30·귀환·지도·차고 0%까지 실제 입력으로 이어 검증한다. 이번에 고친 기본/강공의 낮은 후방 준비와 빠른 횡·사선 접촉을 보존하고, desktop/mobile 실제 속도에서 전체 노출 공격·양방향 접촉과 인물·핵/팔·병기·차고·조명을 같은 data·pose sampler·Polygon renderer·UI로 판독한다. 현재 기술 기준선과 최종 reference/Composition 승인은 분리한다.

## Current Evidence / Gap

- 기본/강공 production pose가 몸 앞 수직 낙하 준비를 제거하고 낮은 후방 grip·얕은 검날·골반/흉곽 선행 회전·횡/사선 접촉·후반 감속으로 이어진다. 공중 공격과 gameplay timing/reach/stamina는 바꾸지 않았다. graphics review의 60Hz 연속 frame과 좌우 facing에서 준비→접촉→회수를 직접 판독했으며 이는 승인된 최종 action reference를 뜻하지 않는다.
- `test:combat`의 전체 공격 11종·좌우 contact/guard/sweep, `test:systems`, `test:intro` 32개 stage/interaction/reload/keyboard-touch, `test:visual`, `test:graphics` 590개 catalog, lint/format, release fingerprint `fe5698589d31`와 `git diff --check`가 PASS다. 새 회귀 검사는 기본/강공 startup 전체를 240Hz로 훑으며 production visible weapon의 가로/세로 비율과 바닥 관통을 양방향에서 고정한다.
- REF-02 제어핵/회수팔, REF-03 고대 병기, REF-04 차고 0%는 production Composition/Polygon depth renderer의 `runtime-baseline-unapproved` 기술 기준선으로 이어져 있고 이후 자유 순서 module overlay를 보존한다.

Human Feedback Priority Gap: REF-01 front/side/3/4와 action key pose, REF-02 Core/Retrieval Arm, REF-03 Ancient Machine, REF-04 Garage 0%의 승인 원본/Composition은 공급·승인되지 않았고 현재 결과는 기술 기준선이다. REF-05 composite의 새 저장 실제 속도 연속 플레이, 기본/강공 외 전체 노출 공격·양방향 접촉, actual mobile viewport 검증이 남았다. INBOX의 전체 그래픽 재작업·횡/사선 베기·접촉·모바일/연속 플레이 원문은 미완료로 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
