---
id: WI-20260830-120911
status: implementing
priority: high
lane: dedicated
created_at: 2026-08-30T12:09:11+09:00
depends_on:
  - WI-20260830-112538
reopens: null
review: team-lead
source: roadmap
source_ref: M2
task_title: WI-20260830-120911 — 학원촌 ↔ 훈련장 Room Portal
registration_base: 186ecb3c49cb70eddff67bd9414c9cb1723dae32
owned_paths:
  - AGENTS.md
  - docs/development/reports/WI-20260830-120911-academy-training-room-portal.md
  - docs/development/work-items/WI-20260830-120911-academy-training-room-portal.md
  - docs/input-system.md
  - docs/rendering-pipeline.md
  - docs/runtime-architecture.md
  - docs/ui-architecture.md
  - docs/world-map-system.md
  - index.html
  - src/app/GameApp.js
  - src/combat/CombatCommandController.js
  - src/game/GameScene.js
  - src/game/equipment/EquipmentProfiles.js
  - src/game/map/MapDefinition.js
  - src/game/map/MapRuntime.js
  - src/game/map/MapStateResolver.js
  - src/game/maps/academyVillage.js
  - src/game/room/RoomNode.js
  - src/game/training/TrainingEncounterNode.js
  - src/style.css
  - src/ui/gameShell.js
---

# M2 학원촌 ↔ 훈련장 Room Portal

## 팀장 원문 또는 파생 근거

승인된 roadmap의 다음 미충족 gate인 `M2 — 학원촌 ↔ 훈련장 Room Portal`에서 파생했다. 학원촌에서 장비를 선택하고 `↑` Portal 입력과 camera travel로 독립 Room을 왕복해 M1 전투를 반복하는 candidate를 구현한다. 첫 장비 기본값은 균형형과, 느린 startup/recovery 대신 사거리·경직이 높은 중량형이다.

## 결과

기존 authoritative task와 managed worktree의 `14fc3a6` candidate를 최신 main 기준으로 복구 중이다. 구체적인 사람 판단 질문이 없으므로 같은 task가 conflict·문서·검증을 수리하고 새 clean final commit을 `ready-for-integration`으로 반환한다.

## 피드백

해당 없음.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M2 — 학원촌 ↔ 훈련장 Room Portal`
- Depends on: `WI-20260830-112538`
- Recovery source commit: `14fc3a66a462d594b1ab3f703cf50faf164ab53e`
