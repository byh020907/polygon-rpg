---
id: WI-20260830-154954
status: queued
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

진행 중.

## 피드백

해당 없음.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M3 — 첫 Field·Dungeon·Boss loop`
- Depends on: `WI-20260830-120911`
