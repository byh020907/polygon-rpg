# Scene · Node · Signal Runtime Architecture

이 문서는 Polygon RPG의 Vanilla JavaScript ESM runtime에서 Scene, Node와 Signal이 소유하는 composition, lifecycle과 communication 계약을 정의한다. Godot Engine은 Engineering Reference이며 Godot runtime, editor API나 resource format을 의존성으로 사용하지 않는다.

## 핵심 계약

```text
Scene = fresh root Node와 그 내부 subtree를 만드는 재사용 가능한 조립 단위
Node = tree 참여 여부에 따라 lifecycle과 fixed processing이 활성화되는 책임 단위
Signal = producer가 consumer를 소유하지 않는, 이미 발생한 사건의 동기 통지
```

Scene·Node·Signal은 이름을 붙이는 분류가 아니라 실제 ownership을 바꿀 때만 사용한다. immutable data, 수학 helper, command state machine과 renderer처럼 독립 lifecycle이 필요 없는 객체는 plain ESM object/class로 유지한다.

## 현재 Scene Tree

```text
GameApp Node
└─ GameScene Scene instance / root Node
   ├─ GameStatus Node
   └─ Room Scene instance / root Node
      └─ TrainingEncounter Scene instance / root Node (`combat-enemy` entity가 있을 때만)
```

- `GameApp`은 browser resource, input attach/detach, ResizeObserver, animation frame과 scene instance lifetime을 소유한다.
- `GameScene`은 persistent Player, camera presentation, 120Hz fixed-step combat·world state, `FirstJourneyProgress`의 route/checkpoint/reward 진행과 단일 read-only RenderFrame을 소유한다.
- `GameStatus`는 GameScene 뒤의 같은 fixed traversal에서 player/world status 변화를 감지하고 Signal을 발행한다.
- `Room`은 active Room snapshot과 entity subtree의 lifecycle을 소유하고 Portal completion fixed-step에 fresh Scene으로 교체된다.
- `TrainingEncounter`는 active Room의 `combat-enemy` entity가 존재하는 동안만 attach된다. training/field/boss profile을 같은 `step(frame)`·contact·CombatEvent 계약으로 해석하며 enemy state, AI, physics, juggle, retaliation, 양방향 contact resolution과 encounter render snapshot을 소유한다.
- Alpine UI bridge와 renderer는 Scene 내부 child나 mutable field를 탐색하지 않고 root command와 Signal만 사용한다.

Scene instance의 child는 구현 세부다. 외부 assembler는 root가 명시적으로 공개한 command와 Signal만 사용한다. Sibling dependency가 필요하면 공통 ancestor가 생성자 주입과 Signal connection을 조립한다.

## Node Tree와 Lifecycle

Node tree의 기본 순서는 다음과 같다.

```text
enter:          parent → children
ready:          children → parent
fixed process:  parent → children
exit:           children → parent
dispose:        children cascade → parent permanently disposed
```

- tree 밖 Node는 fixed processing에 참여하지 않는다.
- `addChild()`로 tree 안에 추가한 subtree는 즉시 enter/ready하고, `removeChild()`는 exit하지만 재사용 가능 상태를 유지한다.
- `dispose()`는 parent가 child subtree, incoming connection과 owned Signal을 함께 정리하는 영구 종료다.
- Node마다 별도 `requestAnimationFrame`을 만들지 않는다. `GameApp`의 단일 runner가 fixed traversal을 호출한다.
- `SceneNode`는 parent fixed update 전에 child snapshot을 고정한다. Portal completion은 parent인 GameScene update에서 old Room을 제거하고 fresh Room을 추가하므로 old child는 같은 step에 건너뛰고 fresh child는 다음 step부터 process한다. 이미 child traversal이 시작된 subtree를 바꿔야 할 때는 frame-boundary queue를 먼저 도입한다.

GameApp의 start/destroy는 Node enter/exit와 같은 경계다. browser listener용 AbortController는 enter마다 새로 만들고 exit에서 abort하므로 같은 App instance의 재진입도 이전 listener를 재사용하지 않는다.

## Signal과 Command

Signal은 상태가 바뀐 뒤의 notification이다. 행동을 시작하는 intent에는 root의 명시적 method를 사용한다.

| 종류                | 현재 예                                                                            | 계약                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Command             | `enterGame()`, `reset()`, `selectEquipment()`, `beginPortalTransition()`           | caller가 행동 시작을 요청하고 callee가 ownership 안에서 수행                        |
| Signal              | `playerStatusChanged`, `worldStatusChanged`, `renderFrameCreated`                  | producer가 완료된 결과를 동기적으로 알리고 consumer를 직접 참조하지 않음            |
| Completion Signal   | `roomChanged`, `playerResultResolved`, `combatEventOccurred`, `encounterCompleted` | Room/encounter가 이미 완료한 교체·판정 결과를 알리고 GameScene이 root writer로 적용 |
| Pull snapshot       | input snapshot, UI render settings, immutable RenderFrame                          | 연속 상태 또는 한 frame의 전체 read model                                           |
| Presentation buffer | `CombatEventBuffer`                                                                | lifetime이 있는 bounded render data이며 publish/subscribe Signal이 아님             |

Signal dispatch는 emit 시작 시 listener snapshot을 사용한다. Connection disconnect는 멱등적이며 receiver Node의 exit/dispose와 producer Node의 owned Signal cleanup 양쪽에서 해제된다. Signal callback에서 같은 tree를 즉시 dispose하거나 재배치하지 않는다.

전역 event bus는 사용하지 않는다. 연속 위치·velocity·input을 매 step Signal로 전송하지 않으며, state ownership이 필요한 command를 Signal로 위장하지 않는다.

## State Ownership과 Dependency Direction

```text
Alpine UI state ──snapshot──→ GameApp
Keyboard/Mobile adapters ──frozen intent──→ FixedStepRunner
FixedStepRunner ──fixed traversal──→ GameScene
GameScene ──status Signal──→ GameApp ──writer──→ Alpine UI state
GameScene ──RenderFrame Signal──→ GameApp ──same object──→ Polygon / Retro renderer
```

- `MapRuntime`만 active Region/Room, Portal transition, spawn, collision/entity source와 world context를 쓴다.
- `GameScene`은 player와 root combat result의 최종 gameplay writer이며 `FirstJourneyProgress`로 Field route, checkpoint, boss, reward와 shortcut 상태를 쓴다. `TrainingEncounter`는 enemy state의 유일한 writer이며 player state를 직접 수정하지 않는다.
- GameScene은 연속 player snapshot을 direct `step()` command로 전달하고, encounter가 발행한 완료 결과 Signal을 동기적으로 적용한다. Enemy와 player가 서로의 mutable object를 공유하지 않는다.
- Renderer는 RenderFrame을 읽기만 하고 physics, animation, combat event lifetime이나 Signal을 진행하지 않는다.
- UI bridge는 status DTO를 표시만 하며 GameScene/MapRuntime field를 직접 수정하지 않는다.
- input adapter는 common intent snapshot만 만들고 Scene tree나 combat command 결과를 알지 않는다.

## Godot Reference 채택 범위

수정 채용:

- reusable/nested scene subtree와 한 root 공개 경계
- parent-child lifetime과 deterministic enter/ready/process/exit 순서
- ancestor-mediated dependency injection과 sibling communication
- signal observer pattern, receiver/outgoing connection cleanup
- variable render와 fixed simulation 분리

비차용:

- `.tscn`, `PackedScene`, ResourceLoader와 editor serialization
- NodePath 문자열 탐색, editor `owner`, notification integer와 ClassDB
- autoload singleton, global signal bus, group/tag lookup
- 모든 plain object를 Node로 만드는 범용 component 계층

근거: [Godot 핵심 개념](https://docs.godotengine.org/en/stable/getting_started/introduction/key_concepts_overview.html), [Scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html), [Node lifecycle](https://docs.godotengine.org/en/stable/classes/class_node.html), [Signals](https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html).

## Room / Encounter lifecycle

- `MapRuntime`이 active Room을 확정하면 GameScene이 resolved snapshot으로 fresh `Room` Scene을 attach하고 Room이 `combat-enemy` entity에 맞는 profile 기반 `TrainingEncounter` child를 조립한다.
- Portal pending 동안 old Room Scene은 authority를 유지하지만 encounter step을 진행하지 않는다. Completion fixed-step에 MapRuntime이 Room/spawn/collision/entity를 원자 교체한 뒤 old Room을 exit/dispose하고 fresh Room을 attach한다.
- Producer Signal cleanup이 GameScene의 incoming connection도 해제하며 enemy contact와 presentation state는 다음 Room으로 누출되지 않는다.
- Room 교체는 parent fixed update 안에서 완료되며 `SceneNode`가 traversal 시작 시 고정한 child snapshot 때문에 새 child는 다음 step부터 process한다.
- `CombatEventBuffer`는 lifetime이 있는 presentation buffer로 root에 남고, encounter는 완료된 event descriptor만 Signal로 전달한다. Camera feedback도 root가 적용하며 renderer는 둘을 읽기만 한다.
- Field/Boss encounter의 `encounterCompleted`는 Room이 GameScene에 전달한다. GameScene만 진행 상태와 map patch를 갱신하며 encounter subtree는 checkpoint, 보상 또는 Portal 활성 상태를 직접 쓰지 않는다.
