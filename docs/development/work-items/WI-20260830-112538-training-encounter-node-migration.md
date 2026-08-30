---
id: WI-20260830-112538
status: done
priority: high
lane: dedicated
created_at: 2026-08-30T11:25:38+09:00
depends_on:
  - WI-20260830-014120
reopens: null
review: auto
source: feedback
source_ref: WI-20260830-014120
---

# Training Encounter Scene·Node·Signal migration

## 팀장 원문 또는 파생 근거

팀장이 Godot의 Scene·Node·Signal을 충실히 반영해 시스템 유지보수성을 높이는 방향을 우선했고, 기반 candidate를 본 뒤 `규칙 다시읽고 진행해`라고 계속 지시했다. 선행 항목의 다음 검증된 병목인 training enemy state·AI·physics·contact writer와 player 결과 전달 경계를 수직 migration한다.

## 결과

`GameScene`의 training enemy state·AI·physics·juggle·retaliation·contact/hit resolution과 render snapshot을 active Room-owned `TrainingEncounter` Scene/Node로 이동했다. Player, `CombatEventBuffer`와 camera 최종 writer는 GameScene에 유지하고 encounter의 완료 결과만 owner-cleanup Signal로 적용한다.

광장에는 subtree가 없고 training Room 진입 시 fresh Scene이 attach된다. Room 이탈 시 child dispose, incoming connection 0과 encounter presentation 제거를 확인했으며 App exit/re-entry도 fresh Signal connection으로 복구된다. 120Hz 결정적 검사에서 enemy contact, Light guard, Heavy evade와 `A → S` rising launch가 통과했다.

결정적 검사에서 실제 Portal 왕복에 따른 fresh attach → detach/dispose, GameScene exit/re-entry Signal 3개 재연결, Light guard, Heavy evade, `A → S` rising launch, enemy contact와 player KO → HP/위치 reset을 확인했다. 실제 Browser에서는 모바일 control UI의 pointer hold로 광장 Portal → training Room, enemy contact와 player KO/reset, Render Lab의 Polygon/Retro 동일 encounter와 resize(`558×314 → 380×213`)를 확인했고 console warning/error는 없었다. 물리 모바일 viewport/coarse-pointer device는 별도로 재확인하지 않았다.

독립 verifier가 기능 2, 구조 명료성 3, lifecycle 안전성 3, Signal 결합도 3, Godot Reference 정합 2, 회귀 안전성 2로 PASS했고 actionable finding은 없었다. `review: auto` candidate를 main에 통합했다.

업무보고: `docs/development/reports/WI-20260830-112538-training-encounter-node-migration.md`

## 피드백

해당 없음.

## 취소 기록

해당 없음.

## 연결

- Depends on: `WI-20260830-014120`
- Integration commit: `7b314f7cbc1f990631b0d94fed057bbd1239c425`
- 업무보고: `docs/development/reports/WI-20260830-112538-training-encounter-node-migration.md`
- Independent verifier: PASS, actionable finding 없음
