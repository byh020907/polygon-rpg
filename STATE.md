# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — 완성된 테스트 플레이 접촉 진단으로 좌우·공중·전체 공격군의 실제 입력과 연속 동작을 판독한다. production pose/contact → 실제 keyboard/touch → hit/guard presentation의 dependency를 유지하며, 현재 영역의 실제 검증과 승인 기반 graphics review 안정화 전에는 캠페인/후반 콘텐츠로 확장하지 않는다.

## Current Evidence / Gap

- 2026-09-11: 테스트 플레이에 판정 표시·다음 플레이어 접촉 자동 정지·일시정지·1/120초 단일 진행·현재 frame 복사를 연결했다. production frame의 visible/authoritative weapon·sweep·semantic hurt·contact·event·HP를 읽으며 normal game/save에는 진단 경로를 만들지 않는다. URL은 시작 배치만 복원하고 입력 결과는 복사 기록으로 남긴다.
- 이 worktree `C:/Users/byh02/.codex/worktrees/5907/polygon-rpg/artifacts/contact-review/`의 `machine-keyboard-right.json`은 실제 A 입력의 slash frame 10, HP 58→47과 launch를 기록한다. `machine-immune-contact.json`은 evade·58→58, `mobile-guard.json`/PNG는 844×390 모바일 버튼의 guard·58→58을 기록한다. `human-protected-contact.json`은 이미 hit 상태로 준비된 폐광 scenario에서 추가 A 입력이 retaliation-protected로 거부된 사례이며 최초 피해 증거로 쓰지 않는다. desktop/mobile PNG와 검토실 동일 선택 복귀를 확인했다.
- 2026-09-11 이번 tick: 격리된 in-app Browser의 `scrap-art-benchmark` 저장 없는 테스트 플레이에서 실제 keyboard `A`를 입력했다. 다음 접촉 자동 정지는 slash frame 10에서 `player → body · head · launch`, 적 HP `67 → 56`, player stamina `100 → 88`을 동시에 표시했다. 이 결과는 production renderer와 damage owner를 잇는 오른쪽 기본 공격 한 건의 추가 관찰 증거이며, fixture나 UI 모사 PASS가 아니다.
- `npm run test:combat`과 `git diff --check` PASS. 11개 공격군의 양방향 definite hit/miss·경계·sweep lifecycle·semantic hurt·damage-owner fixture는 통과했지만 실제 browser 입력 관찰은 위 기본 공격 한 건뿐이다. 전체 게임 완료 판정은 아니다.
- 설치형 PWA의 Release A→B·저장 유지·offline 재실행은 Human 확인 대기로 분리되어 있으며, 다른 제품 Gap 진행을 막지 않는다.

Human Feedback Priority Gap: 공중·전체 노출 공격과 양방향의 실제 입력 연속 프레임, 준비 자세의 무게/낮은 side pull, 도입부의 연속 실제 플레이는 아직 미완료다. 11개 공격 좌우 contact/miss fixture 통과나 이번 접촉 진단 완료로 해당 INBOX를 닫지 않는다. 현재 art/composition은 시스템 검증용이며 최종 reference/Composition 승인과 visual fidelity는 미검증이다. INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
