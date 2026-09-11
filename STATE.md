# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — REF-01의 미승인 기술 기준선 위에서 라이벌·고물상인의 실제 도입 map 배치를 같은 cast Body Profile·3D pose sampler·Polygon depth renderer로 교체하고, 기존 정적 사각형 몸체와 중복되지 않게 stage별 등장·도구 연결·말풍선 anchor를 실제 플레이에서 검증한다. 승인 주인공 스타일과 횡·사선 베기를 보존하며 최종 SVG/reference를 임의 확정하지 않는다. 이 연결 뒤 Core/Retrieval Arm → Ancient Machine Awakening → Garage 0% → prologue gameplay-scale composite 순서로 전진한다.

## Current Evidence / Gap

- 2026-09-11: `player:protagonist`, `npc:cast:rival-scout`, `npc:cast:scrapyard-owner`, `scene:ref-01-cast-lineup`을 stable REF-01 resource로 등록했다. 라이벌·고물상인은 서로 다른 immutable Body Profile을 사용하고 공용 3D pose → combat geometry → Polygon depth presentation에서 idle/run과 갈고리·표식띠·고글·장부·렌치 부착을 sample한다. 모든 항목은 `runtime-baseline-unapproved`다.
- Codex in-app Browser에서 desktop과 844×390으로 611개 catalog의 URL 복원, idle/run, 개별 보기와 실제 960×540 배경 합성을 확인했다. Hero/Rival/Owner가 작은 gameplay scale로 같은 장면에서 읽히고 console error가 없었다. 이는 reference/Composition 승인이 아니다.
- `npm run test:graphics`, `npm run docs:art:check`, `npm run test:character`, `npm run test:systems`, `npm run test:visual`, `npm run release:metadata:check`, `git diff --check` PASS. 독립 Sol/high verifier도 공용 sampler/renderer, stable ID, 승인 상태 분리를 PASS 판정했다.
- 승인된 주인공의 작은 머리·긴 팔다리와 낮은 준비 횡·사선 베기 기준은 유지된다. 전체 노출 공격·양방향·touch의 실제 입력 판독과 도입부 처음부터의 연속 플레이는 아직 남아 있다.

Human Feedback Priority Gap: REF-01 front/side/3/4 master SVG와 representative/action key pose는 공급·승인되지 않았다. 이번 cast line-up은 기술 기준선이며 실제 도입 map의 라이벌·고물상인은 아직 기존 정적 폴리곤 배치를 사용한다. 이 배치를 같은 cast presenter로 연결한 뒤 실제 대사·stage·mobile gameplay에서 검증해야 한다. Core/Retrieval Arm 이후의 승인 순서와 INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
