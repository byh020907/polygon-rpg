---
id: WI-20260830-190118
status: done
priority: high
lane: dedicated
created_at: 2026-08-30T19:01:18+09:00
depends_on:
  - WI-20260830-171256
reopens: null
review: team-lead
source: roadmap
source_ref: docs/development/roadmap.md#M5--region-확장과-품질-반복
task_title: WI-20260830-190118 — 첫 확장 Region 수직 단위
registration_base: abf7fe73e74e37d8246ece2655b739688f4d3d5a
owned_paths:
  - docs/development/reports/WI-20260830-190118-first-region-expansion-slice.md
  - docs/development/work-items/WI-20260830-190118-first-region-expansion-slice.md
  - index.html
  - src/animation/CombatPoseLibrary.js
  - src/app/GameApp.js
  - src/combat/
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

# 첫 확장 Region 수직 단위

## 팀장 원문 또는 파생 근거

승인된 roadmap의 다음 미충족 milestone인 `M5 — Region 확장과 품질 반복`의 첫 플레이 가능한 수직 단위다. 학원촌 준비에서 출발해 새 Field를 탐험하고, 새 마법 생물의 독자적인 frame·위치 문제를 풀며, Dungeon·Boss·영구 shortcut을 거쳐 귀환하는 하나의 완전한 조우를 만든다.

첫 candidate의 지역 주제, 생물의 외형과 전투 문법, 환경 변화는 현재 전투·월드 계약과 Reference Brief를 근거로 되돌릴 수 있는 국소 데이터로 먼저 구현한다. 원작 IP·asset·map·수치를 복제하지 않고, 기존 적의 색상과 체력만 바꾸는 파생은 완료로 취급하지 않는다.

## 완료 조건

- 학원촌 준비 → 새 Field 탐험·조우 → Dungeon → Boss → 영구 shortcut → 귀환을 debug 조작 없이 반복 플레이한다.
- 새 마법 생물은 M1·M3의 같은 combat contract를 사용하면서도 하나의 새로운 읽을 수 있는 frame·위치 문제를 제공한다.
- 대표 환경 변화가 gameplay surface·portal·collision과 정합하고 Polygon/Retro 공유 상태에서 같은 진행과 판정을 보여 준다.
- M1~M4의 guard·roll·punish·공중 연계, Room Portal, 첫 원정, 장비·command 성장과 save 경로를 훼손하지 않는다.
- `docs/development/quality-loop.md`의 적용 축에 0 또는 1이 없고, 결정적 검사·실제 Canvas 경로·마지막 writer 이후 독립 검증을 통과한다.
- 같은 원인의 결함·지적이 두 번 확인되어 기계적으로 측정 가능한 반복 방지 check 외에는 영구 test·script·fixture를 추가하지 않는다.

## 결과

`유리바람 협곡` 두 번째 Region을 학원촌에 연결했다. 풍식 사냥꾼의 지면 Sweep는 Guard·Roll을 관통하고 Jump 뒤 공중 Punish를 요구한다. 사냥꾼 격파 뒤 바람다리 surface·render geometry·실제 movement collision·Dungeon Portal이 함께 열리고, 관측소 checkpoint → 복합 Boss → 프리즘 180 Gold → 학원촌 shortcut 귀환까지 이어진다.

적용 품질 축은 모두 2 이상이다. `npm run check`, `git diff --check`, 120Hz Map/전투/회귀 진단, 실제 Canvas Field·Sweep jump·Polygon/Retro·`900×600` resize·console 확인을 통과했다. 실제 Boss 격파 이후 보상·shortcut 완료 순서는 production module 기반 결정적 전체 경로로 검증했다. 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.

Standalone coordinator는 clean final `340c5a78a8dcbbbd621a7b310ed7cc9495b0da5d`의 registration ancestry·최신 main 부모·owned paths를 확인하고 fast-forward로 메인에 반영했다. `npm run check`, `git diff --check`, 학원촌 중앙 Portal → 유리바람 Field 진입, 새 생물 silhouette와 `JUMP OVER SWEEP` 안내, 같은 Field 상태의 Polygon/Retro 출력, `900×600` resize와 browser warning/error 부재를 독립 재검증했다. `docs/runtime-architecture.md`의 두 Region 진행 writer와 story flag 병합 경계도 실제 구현에 맞게 정합했다.

업무보고: [`../reports/WI-20260830-190118-first-region-expansion-slice.md`](../reports/WI-20260830-190118-first-region-expansion-slice.md)

## 피드백

없음

## 취소 기록

없음

## 복구 기록

- Feature checkpoint `49b39ab5b6cb0a0b9c71af9352c09120981f4955`와 non-rewriting merge checkpoint `b6cb0ae0b65c20fbbccdd4a84c04012e7124099f`를 보존했다.
- Clean recovery final `340c5a78a8dcbbbd621a7b310ed7cc9495b0da5d`가 최신 main `1322baf25c68776b1136116c05735daf244e3594`와 위 checkpoint 이력을 모두 포함하고 source tree가 clean임을 확인했다.
- `C:/Users/byh02/.codex/worktrees/4f55/polygon-rpg`는 변경 없는 최신 main이었고, `C:/Users/byh02/.codex/worktrees/7308/polygon-rpg`의 미커밋 문서 차이는 final commit에 포함되지 않은 상태로 보존했다. 다른 worktree를 수정하거나 정리하지 않았다.

## 연결

- Roadmap: `M5 — Region 확장과 품질 반복`
- Depends on: `WI-20260830-171256`
- Report: `docs/development/reports/WI-20260830-190118-first-region-expansion-slice.md`
- Final worktree commit: `340c5a78a8dcbbbd621a7b310ed7cc9495b0da5d`
- Main integration commit: `340c5a78a8dcbbbd621a7b310ed7cc9495b0da5d` (fast-forward)
- Main 독립 검증: registration ancestry·latest main parent·owned paths·`npm run check`·`git diff --check`·실제 유리바람 Field·Polygon/Retro·`900×600` resize·browser warning/error 부재 통과
