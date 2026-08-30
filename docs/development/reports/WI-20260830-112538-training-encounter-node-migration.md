# WI-20260830-112538 — Training Encounter Scene · Node · Signal migration

## 변경된 코드 트리

```text
src/game/GameScene.js
src/game/training/
├─ TrainingEncounterNode.js
└─ TrainingEncounterPresentation.js
docs/runtime-architecture.md
docs/development/work-items/WI-20260830-112538-training-encounter-node-migration.md
docs/development/reports/WI-20260830-112538-training-encounter-node-migration.md
```

## 의도

훈련 적을 추가·교체할수록 `GameScene`에 enemy state와 player mutation이 함께 늘어나던 구조를 끊었다. Active Room entity가 실제 Scene lifetime을 결정하고, encounter Node가 enemy의 simulation과 presentation snapshot을 끝까지 소유하며, player 결과는 Signal을 거쳐 root writer가 적용하도록 만들었다.

## 플레이 결과와 영향

```text
GameScene
├─ GameStatus
└─ TrainingEncounter (training Room에서만 attach)
```

- 광장에는 encounter subtree와 enemy presentation이 없다.
- Portal completion으로 training Room이 active가 되면 fresh subtree가 attach되고 기존 Light guard → Heavy roll-through → back punish → air combo → landing 흐름을 120Hz에서 진행한다.
- Enemy AI·physics·juggle·retaliation·contact/hit resolution과 immutable enemy render snapshot은 `TrainingEncounterNode`가 단독으로 쓴다.
- Enemy가 만든 hit/guard/motion, combat event와 camera 결과는 owner-cleanup Signal로 전달되고 `GameScene`이 player, `CombatEventBuffer`와 camera의 최종 writer로 적용한다.
- Room 이탈과 GameApp exit/dispose에서 incoming/outgoing connection, enemy contact와 presentation state가 함께 정리된다. 같은 App instance 재진입 시 fresh connection을 만든다.

## Reference 판단

- Godot nested Scene, parent-owned composition과 subtree lifetime — active Room entity에 따른 fresh encounter instance로 **수정 채용**.
- Godot Node의 local state writer와 ancestor-mediated sibling communication — GameScene이 immutable player frame을 command로 전달하고 결과 Signal을 적용하는 방식으로 **수정 채용**.
- Godot Signal은 이미 발생한 사건, command는 direct method라는 원칙 — `step/reset` command와 세 완료 Signal로 **직접 채용**.
- Baeseongjin `FixedStepRunner`의 단일 fixed writer와 immutable snapshot — 120Hz root traversal과 encounter render snapshot 분리 원칙만 **차용**.
- Ball Fight Simulator·Baeseongjin physics의 단일 body writer와 detection/response 분리 — enemy mutable state를 encounter 한 곳에 두고 player response를 root result adapter로 분리하는 원칙만 **차용**.
- Godot API, `.tscn`, NodePath, autoload/global bus, Reference의 manager·authority·gameplay data — **비차용**.

## 품질 평가

| 축               | 점수 | 근거                                                                                                         |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| 기능 완결성      | 2    | Room attach → enemy contact → player result, Light guard, Heavy evade, rising launch와 Room detach 경로 반복 |
| 구조 명료성      | 3    | enemy writer·render snapshot·lifecycle은 encounter, player/buffer/camera writer는 root로 단일화              |
| lifecycle 안전성 | 3    | Room detach dispose, producer/receiver connection 0, presentation cleanup과 App 재진입 재연결 확인           |
| Signal 결합도    | 3    | enemy가 player mutable state를 참조·수정하지 않고 완료 결과만 동기 Signal로 전달                             |
| Reference 정합   | 2    | Scene subtree, Node ownership, Signal event를 실제 M1 경로에 적용하고 engine API 복제 제외                   |
| 회귀 안전성      | 2    | lint/format/diff, 120Hz deterministic combat/lifecycle과 실제 Canvas 경로 확인                               |

적용 축은 모두 자동 통합 threshold 2 이상이다.

## 검증 경계

- DOM 없는 120Hz 480-step: enemy contact가 Signal을 거쳐 player HP `100 → 72`, enemy render item 12개 생성.
- 결정적 M1 판정: Light guard는 HP 100과 `guard`, Heavy roll window는 HP 100과 `evade`, 자연스러운 `A → S` command sequence는 enemy HP `160 → 130`과 airborne launch를 확인.
- Lifecycle: 실제 Portal 왕복에서 training Room attach, plaza 복귀 후 child disposed, root incoming connection 0과 enemy RenderFrame/presentation 제거를 확인했다. GameScene exit/re-entry에서는 3개 Signal이 fresh reconnect됐다.
- KO: idle 120Hz 경로에서 HP 0을 거쳐 HP 100, spawn X 164로 복구되고 encounter state가 reset됨을 확인했다.
- 실제 Browser: 모바일 control UI의 pointer hold로 광장 Portal → training Room 진입, enemy AI contact와 player KO/reset, 두 Canvas가 같은 training encounter를 표시하는 Render Lab을 확인했다. Viewport resize에서 Polygon/Retro가 `558×314 → 380×213`으로 함께 갱신됐고 console warning/error는 없었다.
- Repository: `npm run check`, `git diff --check` 통과.
- 독립 verifier: 기능 2, 구조 명료성 3, lifecycle 안전성 3, Signal 결합도 3, Godot Reference 정합 2, 회귀 안전성 2로 PASS. Actionable finding 없음.
- 검증 경계: Browser의 모바일 control UI와 pointer lifecycle은 사용했지만 물리 모바일 viewport/coarse-pointer device는 별도로 재확인하지 않았다.

## 다음 병목

이번 migration은 training encounter 하나를 명시적으로 조립한다. 여러 Room encounter가 생기기 전에는 registry/manager를 추가하지 않는다. 다음 구조 판단은 두 번째 실제 encounter가 요구하는 공통 Scene factory 경계가 확인될 때 현재 local contract에서 추출한다.
