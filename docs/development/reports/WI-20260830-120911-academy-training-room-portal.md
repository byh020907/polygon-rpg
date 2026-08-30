# WI-20260830-120911 학원촌 ↔ 훈련장 Room Portal 업무보고

## 의도

M1 전투를 단일 테스트 공간에서 끝내지 않고, 학원촌에서 준비하고 독립 Room으로 이동해 싸운 뒤 돌아오는 첫 RPG 반복 경로로 만들었다. 기존 Depth Lane과 visual scale transition은 확장하지 않고 `Region → Room → Portal`로 교체했다.

## Changed code tree

```text
index.html / src/style.css
└─ 학원촌 균형형·중량형 장비 선택 UI

src/app/GameApp.js / src/ui/gameShell.js
└─ UI → GameApp → GameScene direct equipment command, status Signal 표시

src/game/equipment/EquipmentProfiles.js
└─ immutable combat timing·range·hitstun·weapon presentation profile

src/combat/CombatCommandController.js
└─ 60Hz integer startup/active/recovery frame에 equipment timing profile 적용

src/game/map/
├─ MapDefinition.js       Region·Room·Portal schema/validation
├─ MapRuntime.js          active Room/spawn/collision/entity 원자 교체
└─ MapStateResolver.js    Room/Portal stable-ID patch 탐색

src/game/maps/academyVillage.js
└─ academy-region의 academy-plaza / training-room과 양방향 Portal

src/game/room/RoomNode.js
└─ fresh Room Scene subtree, TrainingEncounter child·Signal lifecycle

src/game/GameScene.js
└─ persistent Player, Portal command/completion, camera travel/follow, Room Scene 교체

src/game/training/TrainingEncounterNode.js
└─ active Room movement bounds와 equipment hitstun profile 소비

docs/{world-map-system,runtime-architecture,rendering-pipeline,input-system,ui-architecture}.md
└─ 구현된 M2 ownership·lifecycle·DTO 계약
```

## 플레이 결과

1. `새 게임 시작`후 학원촌 우상단에서 `균형형` 또는 `중량형`을 선택한다.
2. 광장 왼쪽 Portal 범위에서 `↑`를 누르면 0.32s camera travel로 독립 훈련장 Room에 도착한다.
3. 범위 밖 `↑`는 Jump, `↓`는 Guard, 이동 + `↓`는 Roll로 유지된다.
4. 훈련장에서 M1 guard → roll-through → launcher → air combo를 같은 적·판정·RenderFrame으로 반복한다.
5. 도착 위치의 Portal에서 `↑`를 누르면 학원촌으로 돌아와 장비를 바꾸고 다시 진입할 수 있다.

중량형은 ID 분기가 아닌 data profile로 기본 강공격의 `46f → 54f`, startup `16f → 20f`, recovery `15f → 19f`, range `68 → 82.96`, hitstun scale `1.0 → 1.3`을 적용한다. Render Lab `Animation Speed`와 input DTO를 재사용하지 않는다.

## 원자 전환과 Scene lifecycle

- Pending 동안 active collision/entity는 source Room 하나다. Destination은 camera travel용 render item만 보인다.
- Duration에 도달한 fixed-step에 `MapRuntime` 하나가 active Room, spawn, collision surface와 entity source를 함께 교체한다.
- 같은 step에 old Room Scene을 exit/dispose하고 fresh Room Scene을 attach한 뒤 `roomChanged` completion Signal을 발행한다.
- Transition step은 encounter 판정 전에 return하므로 source/destination enemy가 완료 경계에 잘못 참여하지 않는다.
- Player/camera는 Room subtree 밖 GameScene에 persistent state로 남는다.

## Reference 채택

- **Godot 수정 채택:** reusable/nested Scene, parent-owned Node lifecycle, persistent Player와 replaceable Room subtree 분리, command는 direct method·완료 사건은 Signal.
- **Baeseongjin 원칙 채택:** frozen input의 monotonic sequence, fixed authority update 후 camera presentation, delta-time smoothing과 bounds clamp.
- **Ball Fight Simulator 수정 채택:** immutable injected combat config가 timeline consumer에 흐르는 경계.
- **비채택:** Godot runtime/editor API, global bus/NodePath, Baeseongjin manager·Quadtree·authority 계층, Reference 장비 명·수치·맵, Depth Lane scale/order transition.

## 검증

- `npm run check`: ESLint / Prettier 통과
- `git diff --check`: 통과
- 독립 verifier: Room exit/re-entry에서 encounter Signal이 끊기는 결함을 발견해 연결을 `RoomNode.onEnterTree()`에서 복구하도록 수정했다. 최초 enter `3`, exit `0`, re-enter `3`과 재진입 후 player result 전달을 확인했으며 최종 재검증에서 actionable finding이 없었다.
- 일회성 DOM 없는 120Hz 진단: Portal 밖 Jump, Room authority, pending input 소비, Room Scene 교체, 장비 frame/contact, camera travel, 양방향 귀환, active Room KO respawn 통과
- 실제 Canvas: 학원촌 장비 선택 → Portal 진입 → 훈련 enemy 표시 → Portal 귀환 확인
- `844×390` 모바일 가로: 장비 panel과 방향/action pad 표시 확인
- Render Lab: Polygon/Retro가 같은 Room/Player/Portal state를 소비함을 확인
- resize 및 browser console: 대면↔모바일↔대면 resize 후 warning/error 없음
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않음
- 검증 경계: RoomNode 수리 후 production module 결정적 재진입과 게임 Canvas·장비 UI·Polygon/Retro·resize·console을 다시 확인했다. Browser의 모바일 control UI와 pointer lifecycle은 이전 왕복 검사에서 사용했지만 물리 모바일 viewport/coarse-pointer device는 별도로 재확인하지 않았다.

## 품질 판정과 다음 loop

| 축                   | 수준 | 근거                                                                     |
| -------------------- | ---- | ------------------------------------------------------------------------ |
| 기능 완결성          | 2    | debug 없이 장비 선택→Portal 왕복→M1 전투 반복 가능                       |
| 조작 명료성          | 2    | Portal 범위만 `↑`을 소비하고 Guard/Roll·Jump 계약 보존                   |
| 타격감·Effect        | 2    | M1 CombatEvent/contact/camera feedback 경로 보존                         |
| Graphics·시각 일관성 | 2    | 독립 Room camera travel과 Polygon/Retro 공유 state                       |
| Reference 정합       | 2    | Scene subtree, owner lifecycle, completed Signal이 실제 Room 교체에 반영 |
| 회귀 안전성          | 2    | 결정적 진단, check/diff, Canvas/mobile/resize/console 통과               |

0.32초 camera travel 감속과 균형형/중량형 수치는 이후 실제 플레이에서 구체적인 문제가 관찰될 때 조정한다. 이번 업무는 정해진 동작과 검증을 모두 통과했고 별도 사람 판단 질문 없이 메인 반영 준비를 마쳤다.
