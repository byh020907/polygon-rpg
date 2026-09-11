# Derived Loop State

## Current Phase

RUNNING — Human이 2026-09-11에 Codex loop를 명시적으로 재개했다. OpenCode는 계속 pause 상태다.

## Active Execution Goal

Human Feedback Priority — 승인 주인공 스타일과 안정화된 횡·사선 베기를 기준선으로 유지하며 Hero/Rival/Owner의 실제 game data·pose sampler·renderer·검토 UI를 같은 대상으로 비교하고 gameplay-scale composite에서 외형·동작·장비 연결을 검증한다. 이후에만 Core/Retrieval Arm → Ancient Machine Awakening → Garage 0% → prologue composite 순서로 전진한다. 미공급 원본이나 승인되지 않은 reference/Composition을 임의 확정하지 않고 캠페인/후반 콘텐츠로 확장하지 않는다.

## Current Evidence / Gap

- 2026-09-11: 테스트 플레이에 판정 표시·다음 플레이어 접촉 자동 정지·일시정지·1/120초 단일 진행·현재 frame 복사를 연결했다. production frame의 visible/authoritative weapon·sweep·semantic hurt·contact·event·HP를 읽으며 normal game/save에는 진단 경로를 만들지 않는다. URL은 시작 배치만 복원하고 입력 결과는 복사 기록으로 남긴다.
- 이 worktree `C:/Users/byh02/.codex/worktrees/5907/polygon-rpg/artifacts/contact-review/`의 `machine-keyboard-right.json`은 실제 A 입력의 slash frame 10, HP 58→47과 launch를 기록한다. `machine-immune-contact.json`은 evade·58→58, `mobile-guard.json`/PNG는 844×390 모바일 버튼의 guard·58→58을 기록한다. `human-protected-contact.json`은 이미 hit 상태로 준비된 폐광 scenario에서 추가 A 입력이 retaliation-protected로 거부된 사례이며 최초 피해 증거로 쓰지 않는다. desktop/mobile PNG와 검토실 동일 선택 복귀를 확인했다.
- 2026-09-11 이번 tick: 격리된 in-app Browser의 `scrap-art-benchmark` 저장 없는 테스트 플레이에서 실제 keyboard `A`를 입력했다. 다음 접촉 자동 정지는 slash frame 10에서 `player → body · head · launch`, 적 HP `67 → 56`, player stamina `100 → 88`을 동시에 표시했다. 이 결과는 production renderer와 damage owner를 잇는 오른쪽 기본 공격 한 건의 추가 관찰 증거이며, fixture나 UI 모사 PASS가 아니다.
- 2026-09-11: 저장 없는 production input QA에서 keyboard 좌측 기본 공격을 실제로 입력했다. `artifacts/contact-review/left-keyboard-contact/attack-strip.png`의 좌측 slash strike는 수거 유닛을 가로지르고, telemetry는 `facing -1`, 적 HP `58 → 47`, `launch`를 기록한다. 같은 runner의 keyboard 공중 기본 공격은 `artifacts/contact-review/right-air-keyboard-contact/attack-strip.png`에서 착지 전 airSlash strike와 적 HP `58 → 46`, `hit`을 함께 기록한다. keyboard focus를 QA relay button이 아닌 production canvas로 돌리고, 좌측 공중 input은 방향키를 누른 채 jump/attack으로 보내도록 `scripts/motion-play-qa.mjs`를 보완했다. 이는 좌측 지상과 우측 공중의 실제 입력 evidence이며 mobile·나머지 공격군의 PASS를 뜻하지 않는다.
- `npm run test:combat`과 `git diff --check` PASS. 11개 공격군의 양방향 definite hit/miss·경계·sweep lifecycle·semantic hurt·damage-owner fixture는 통과했지만 실제 browser 입력 관찰은 위 기본 공격 한 건뿐이다. 전체 게임 완료 판정은 아니다.
- 2026-09-11: 테스트 플레이 URL의 `location.facing`을 `-1|1`로 검증·복원하고, restart도 같은 방향을 유지하게 했다. production RenderFrame의 immutable `player.facing`과 접촉 진단 요약이 이 방향을 읽는다. `npm run test:platform`, `npm run test:combat`, `git diff --check` PASS. 이는 좌우 실제 입력 검증을 위한 재현 기반이며, 왼쪽/공중/나머지 공격군의 Browser 접촉 PASS를 대신하지 않는다.
- 2026-09-11 Human이 PWA 관련 개선과 실환경 확인 대기를 완료로 확인했다. 해당 PWA feedback은 queue에서 닫았으며, 독립적으로 남은 모바일 메인 메뉴 비율 요구는 보존한다.
- 2026-09-11: 기본·강공의 검이 낮은 후방 준비 중 깊이축에서 edge-on으로 사라지고 뒤집히던 원인을 제거했다. 두 동작은 넓은 검날을 유지한 채 화면 아래의 준비 호 → 빠른 횡/사선 접촉 → 느린 follow-through로 이어지며, actual world wrist의 선행 가속·후반 감속과 renderer/contact 공용 geometry를 보존한다. `artifacts/slash-rework-candidate/{slash,heavy}-actor-strip.png`와 `artifacts/slash-rework-mobile/{slash,heavy}-actor-strip.png`에서 실제 속도 연속 frame을 판독했고, Codex in-app Browser의 desktop 및 844×390 `scrap-art-benchmark`에서 검·적·피격 접촉을 같은 위치로 확인했다.
- `npm run test:combat`, `npm run test:character`, `npm run test:graphics`, `npm run test:visual`, `npm run test:pwa`, `git diff --check` PASS. Ground slash/heavy는 전 구간 검날 투영 길이 90% 이상과 1/240초 sample의 연속 회전을 고정한다. 이 evidence는 현재 주인공 동작 구현의 기준선이며 새 reference/Composition 승인이나 전체 그래픽 완료를 뜻하지 않는다.

Human Feedback Priority Gap: 기본·강공의 낮은 준비와 연속 횡·사선 베기 구현은 이번 evidence로 안정화했지만, Human의 최종 동작 만족 확인과 전체 노출 공격·양방향·touch 실제 입력의 연속 판독, 도입부 처음부터의 실제 플레이는 남아 있다. 현재 art/composition은 시스템 검증용이며 Hero/Rival/Owner부터 시작하는 최종 reference/Composition 승인과 visual fidelity는 미검증이다. INBOX 원문은 보존한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
