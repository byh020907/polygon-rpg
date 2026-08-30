---
id: WI-20260830-171256
status: ready-for-integration
priority: high
lane: dedicated
created_at: 2026-08-30T17:12:56+09:00
depends_on:
  - WI-20260830-154954
reopens: null
review: team-lead
source: roadmap
source_ref: docs/development/roadmap.md#M4--장비command-성장-loop
task_title: WI-20260830-171256 — 장비·command 성장 loop
registration_base: d9dedad9c947b6641f1b27511b31a941113e4a5d
owned_paths:
  - docs/development/reports/WI-20260830-171256-equipment-command-growth-loop.md
  - docs/development/work-items/WI-20260830-171256-equipment-command-growth-loop.md
  - index.html
  - src/app/GameApp.js
  - src/combat/CombatCommandController.js
  - src/game/GameScene.js
  - src/game/GameStatusNode.js
  - src/game/encounter/FirstJourneyProgress.js
  - src/game/equipment/
  - src/game/progression/
  - src/game/training/TrainingEncounterNode.js
  - src/style.css
  - src/ui/gameShell.js
---

# 장비·command 성장 loop

## 팀장 원문 또는 파생 근거

Roadmap M4의 다음 미충족 수직 단위다. M3 첫 원정 loop가 메인에 완료됐으므로, 단일 훈련 재화·3단계 skill level·장비와 해금/level만 저장하는 가역적인 첫 candidate로 장비 교체와 기술 성장이 기존 격투 command route를 바꾸는 전체 loop를 구현한다.

완료 결과는 빠른 장비와 느린 장비의 frame·거리·stun trade-off, level/재화 기반 command 해금, skill level에 따른 피해·타수·공중 사용·cancel route 확장, 장비 구매·획득·교체와 최소 local save를 한 플레이 경로에서 확인할 수 있어야 한다. 플레이어 직접 stat 분배와 새 버튼 난사는 포함하지 않는다.

## 결과

학원촌↔훈련장 왕복에 단일 훈련 재화, 중량형 구매·장착, 3단계 command 수련과 최소 local save를 연결했다.

- 훈련 골렘 처치마다 인장 3개를 받고 학원촌 성장 panel에서 장비 구매 또는 command level에 사용한다.
- Lv.0 starter에서 Lv.1 지상 branch, Lv.2 공중 2회·2타, Lv.3 공중 3회·3타·loop cancel로 같은 A/S·X/Y route가 확장된다.
- 속공형은 27 frame·짧은 거리·낮은 경직, 중량형은 36 frame·긴 거리·높은 경직이며 공격·방어·launch·guard profile이 실제 판정에 적용된다.
- local save는 schema v1의 인장·장비 소유/장착·command level만 저장하고 M3 원정 상태는 저장하지 않는다.
- 적용 rubric은 기능 완결성·조작 명료성·타격감/Effect·Graphics·Reference 정합·회귀 안전성 모두 2다.
- `npm run check`, `git diff --check`, progression/command/장비 결정적 진단, 실제 mobile Canvas의 Portal→훈련 처치→인장→귀환→중량형 구매→reload 복원, `900×600` resize와 browser warning/error 검사를 통과했다.
- 마지막 writer 이후 독립 verifier가 소유 범위, 최소 저장 schema, Lv.0~3 route, 장비 trade-off, 보상 1회와 renderer read-only 경계를 재검증했고 actionable finding이 없었다.
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.

업무보고: [`WI-20260830-171256-equipment-command-growth-loop.md`](../reports/WI-20260830-171256-equipment-command-growth-loop.md)

## 피드백

없음

## 취소 기록

없음

## 연결

- Roadmap: `M4 — 장비·command 성장 loop`
- Depends on: `WI-20260830-154954`
- Report: `docs/development/reports/WI-20260830-171256-equipment-command-growth-loop.md`
- Final worktree commit: standalone coordinator 확인 대기
