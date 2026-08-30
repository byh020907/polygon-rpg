---
id: WI-20260830-171256
status: queued
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

진행 중

## 피드백

없음

## 취소 기록

없음

## 연결

미연결
