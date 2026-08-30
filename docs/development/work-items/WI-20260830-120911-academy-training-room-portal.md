---
id: WI-20260830-120911
status: done
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

`Region → Room → Portal`로 Depth Lane runtime을 교체했다. 학원촌의 균형형/중량형 장비 선택 후 `↑` Portal과 0.32s camera travel로 fresh 훈련 Room Scene에 진입하고, M1 전투를 반복한 뒤 같은 Portal로 귀환한다.

`MapRuntime`이 완료 fixed-step에 active Room/spawn/collision/entity를 원자 교체하고 `RoomNode` Scene이 `TrainingEncounter` child lifecycle을 소유한다. Pending 입력은 sequence를 소비하며 Portal 범위 밖 Jump와 Guard/Roll은 보존된다. 중량형은 debug Animation Speed와 분리된 immutable profile로 startup/recovery·range·hitstun·weapon geometry를 함께 변경한다.

Deterministic Room/Portal/equipment/combat 진단, `npm run check`, `git diff --check`, 실제 Canvas 왕복, `844×390` 모바일, Polygon/Retro, resize와 console 경로가 통과했다. 독립 verifier가 발견한 Room 재진입 Signal 단절을 `onEnterTree()` 재연결로 수리해 connection `3 → 0 → 3`과 재진입 결과 전달을 확인했다. 문서·schema·legacy UI finding도 정합한 뒤 모든 적용 품질 축 2, actionable finding 없음으로 재검증을 통과했다.

최신 `origin/main` `5d497b2`를 기존 `14fc3a6` history에 non-rewriting merge하고 새 task metadata와 process를 우선 적용했다. Merge 뒤 장비 선택 → Portal 왕복 → M1 사건 → 귀환, KO respawn, 동일 RenderFrame, repository check와 독립 검증을 다시 통과했다. 구체적인 사람 관찰 질문이 없어 메인 반영 준비 상태로 완료했다.

Standalone coordinator가 source worktree의 clean 상태, registration base·parent graph·owned path diff를 독립 확인하고 source graph를 main에 fast-forward로 통합했다. `npm run check`, commit 범위 `git diff --check`, 양방향 Portal·active Room authority·장비 frame·Room Signal 재진입 결정적 진단과 실제 Canvas 학원촌→훈련장, Polygon/Retro, `844×390` 모바일 UI, resize·console 경로가 통과했다.

## 피드백

해당 없음.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M2 — 학원촌 ↔ 훈련장 Room Portal`
- Depends on: `WI-20260830-112538`
- Recovery source commit: `14fc3a66a462d594b1ab3f703cf50faf164ab53e`
- Source worktree commit: `a4bf49b0db74ca3102cbedba50d8ca88956b6b12`
- Main integration commit: `a4bf49b0db74ca3102cbedba50d8ca88956b6b12` (fast-forward)
- 업무보고: [`WI-20260830-120911-academy-training-room-portal.md`](../reports/WI-20260830-120911-academy-training-room-portal.md)
