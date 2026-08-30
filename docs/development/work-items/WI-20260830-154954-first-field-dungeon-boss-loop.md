---
id: WI-20260830-154954
status: done
priority: high
lane: dedicated
created_at: 2026-08-30T15:49:54+09:00
depends_on:
  - WI-20260830-120911
reopens: null
review: team-lead
source: roadmap
source_ref: M3
task_title: WI-20260830-154954 — 첫 Field·Dungeon·Boss loop
registration_base: 7a61195fc9cda85865dbdff87cbf359782cbbe29
owned_paths:
  - docs/development/reports/WI-20260830-154954-first-field-dungeon-boss-loop.md
  - docs/development/work-items/WI-20260830-154954-first-field-dungeon-boss-loop.md
  - index.html
  - src/app/GameApp.js
  - src/game/GameScene.js
  - src/game/GameStatusNode.js
  - src/game/encounter/
  - src/game/map/
  - src/game/maps/
  - src/game/room/
  - src/game/training/
  - src/rendering/Camera2D.js
  - src/rendering/ScenePainter.js
  - src/style.css
  - src/ui/gameShell.js
---

# 첫 Field·Dungeon·Boss loop

## 파생 근거

승인된 roadmap의 다음 미충족 수직 단위인 `M3 — 첫 Field·Dungeon·Boss loop`에서 파생했다. M1과 M2는 완료되었으며, 학원촌 준비에서 시작해 Field Rooms 탐험·일반 조우·우회, 폐쇄 실습림 Dungeon, checkpoint, Boss 공략, 보상과 shortcut Portal 귀환까지 끊기지 않는 하나의 플레이 경로를 만든다. M3의 제품 방향과 확정 비범위는 바꾸지 않는다.

## 완료 조건

- 일반 적과 Boss가 M1의 같은 combat contract를 사용한다.
- 탐험 선택이 전투 여부와 장비 준비에 실제 영향을 준다.
- Boss는 체력만 큰 적이 아니라 guard 가능 기본공격, roll이 필요한 강공격, 분명한 punish window로 읽을 수 있는 frame·위치 문제를 제공한다.
- 학원촌 준비 → Field·Dungeon → checkpoint → Boss → 보상 → shortcut Portal 귀환을 debug 조작 없이 반복 플레이할 수 있다.
- 적용 품질 축에 0 또는 1이 없고, 결정적 검사·실제 Canvas 경로·마지막 writer 이후 독립 검증을 통과한다.

## 결과

학원촌 장비 준비에서 Field 정면 조우/우회, 폐쇄 실습림 checkpoint, Guard·Roll·Punish Boss, 120 Gold 보상과 shortcut 귀환까지 하나의 진행 상태와 Portal graph로 연결했다.

- 일반 적과 Boss는 M1의 같은 `TrainingEncounterNode.step(frame)`·contact·CombatEvent 계약을 사용한다.
- Field 감시 골렘을 이기면 최대 HP +20, 초록 Portal로 우회하면 보너스가 없어 탐험 선택이 Boss 준비에 영향을 준다.
- checkpoint가 HP 회복·Boss Portal 개방·KO 복귀 위치를 소유한다.
- Boss는 basic Guard, unblockable heavy Roll, recovery Punish 밖의 공격을 막으며 격파 뒤 보상 trigger와 shortcut을 순서대로 연다.
- 적용 rubric은 기능 완결성·조작 명료성·타격감/Effect·Graphics·Reference 정합·회귀 안전성 모두 2다.
- `npm run check`, `git diff --check`, 120Hz 전체 경로/전투 진단, 실제 Canvas/mobile pointer 경로, `900×600` resize와 browser warning/error 검사를 통과했다.
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.
- standalone coordinator가 final worktree commit의 범위·부모·clean 상태와 progression/encounter production module을 독립 검증하고 main에 fast-forward 반영했다. 학원촌 → Field 우회 → Dungeon checkpoint → Boss Room → checkpoint 복귀 Canvas 경로와 `900×600` 모바일 UI, browser warning/error 부재도 다시 확인했다.

업무보고: [`WI-20260830-154954-first-field-dungeon-boss-loop.md`](../reports/WI-20260830-154954-first-field-dungeon-boss-loop.md)

## 피드백

해당 없음.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M3 — 첫 Field·Dungeon·Boss loop`
- Depends on: `WI-20260830-120911`
- Report: `docs/development/reports/WI-20260830-154954-first-field-dungeon-boss-loop.md`
- Final worktree commit: `7f80fd36be5c2822774d1a2bbab84cd7f13d7be4`
- Main integration commit: `7f80fd36be5c2822774d1a2bbab84cd7f13d7be4` (fast-forward)
- Main 독립 검증: owned path, commit graph, `npm run check`, `git diff --check`, progression/encounter 결정적 검사와 실제 Canvas/resize/console 경로 통과
