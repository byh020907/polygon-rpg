# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — 실제 입력으로 보이는 무기·sweep·semantic hurt·damage 결과를 함께 판독하는 combat 검증 전선을 계속한다. 이번 단계는 production pose/contact path → 실제 keyboard/touch input → hit/guard presentation 순서다. 다음은 844×390 native touch viewport에서 공중·기계형의 실제 contact 결과를 frame timeline과 함께 판독하는 일이며, 캠페인/후반 콘텐츠 확장은 이 전선과 승인 기반의 graphics reviewable data 안정화 전에는 재개하지 않는다.

## Current Evidence / Gap

- 2026-09-11: damaging frame은 `GameScene`의 같은 immutable contact geometry를 renderer와 encounter가 공유한다. `attack-contact-check`는 실제 command lifecycle의 좌·우 Basic strike와 모든 render interpolation alpha에서 visible weapon === authoritative weapon 및 active sweep을 고정했고, 전체 11개 player attack의 contact/miss/semantic hurt/envelope fixture가 PASS했다.
- Local in-app Browser의 저장 없는 폐광 combat test play에서 desktop `A`와 mobile control `X`가 각각 실제 적 HP를 78→67로 바꿨고, 접촉 frame에서 blade/sweep·semantic body와 hit feedback이 함께 보였다. 같은 Browser의 굴착기 Boss basic은 HP 118/118을 유지하되 production trace가 `guard` event를 기록했다. 따라서 이 경우는 invisible miss가 아니라 의도된 Boss guard response다. Keyboard strong trace는 HP 118→98·Posture 118→68을 기록했다.
- 설치형 PWA의 Release A→B·저장 유지·offline 재실행은 Human 확인 대기로 분리되어 있으며, 다른 제품 Gap 진행을 막지 않는다.

`npm run test:combat` PASS: shared pose/contact geometry, semantic body/guard/armor/immune response, sweep lifecycle와 11개 공격의 좌우 boundary fixture가 통과했다. `artifacts/contact-ground-right/evidence.json`, `artifacts/contact-ground-left-v2/evidence.json`, `artifacts/contact-heavy-right/evidence.json`은 각각 production polygon renderer의 실제 keyboard input에서 basic 좌우와 strong의 visible contact(weapon)·semantic body contact·HIT/launch event·enemy HP 감소(78→67, 78→67, 78→58)를 기록했다. QA overlay도 `?inputQa=1&inputQaStart=scrap-art-benchmark&inputQaX=730&inputQaOverlay=1`에서 같은 production frame과 contact를 표시한다.

그러나 이 결과는 Human Feedback 완료 증거가 아니다. `scripts/motion-play-qa.mjs`는 capture마다 mutable telemetry를 깊게 복사하도록 고쳤지만, 현재 844×390 CDP raw-touch air trace는 jump만 기록하고 attack command를 재현하지 못해 native mobile touch evidence로 쓸 수 없다. 공중 contact, native mobile viewport의 machine body/모든 노출 공격과 실제 player-driven 좌·우 입력은 계속 unverified다. `artifacts/motion-contact-preflight/{slash,heavy,air}-strip.png`의 실제 시간 frame strip에서 준비 자세의 무게/낮은 side pull 품질도 승인된 현 주인공 스타일 기준으로 재검토가 필요하다. 현재 art/composition은 시스템 검증용이며 최종 reference/Composition 승인이나 visual fidelity PASS가 아니다. PWA Release A→B 실기기/설치형 검증은 Human 대기이며 자동 PASS가 아니다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
