# WI-20260830-014120 — Godot Scene · Node · Signal 기반 runtime 구조

## 변경된 코드 트리

```text
src/core/{Scene,SceneNode,Signal}.js
src/app/GameApp.js
src/game/{GameScene,GameStatusNode}.js
docs/{runtime-architecture,rendering-pipeline,ui-architecture}.md
AGENTS.md
```

Work item과 이 보고서는 실제 결과·feedback·검증 경계를 기록한다.

## 의도

새 Room, encounter와 UI를 추가할 때 `GameApp`과 `GameScene`의 직접 field 접근·수동 teardown을 계속 늘리지 않도록, 실제 M1 실행 경로에 재사용 가능한 Scene composition, tree-owned Node lifecycle과 connection이 정리되는 Signal 경계를 세웠다. Godot API나 editor를 복제하지 않고 세 개념이 해결하는 ownership 문제만 Vanilla JavaScript ESM에 맞게 적용했다.

## 플레이 결과와 영향

```text
GameApp root Node
└─ GameScene Scene instance / root Node
   └─ GameStatus child Node
```

- GameApp enter/exit가 input, browser listener, ResizeObserver, RAF, child scene과 Signal connection을 함께 관리한다.
- 기존 120Hz runner는 root Node의 fixed traversal을 호출하고 GameScene이 같은 input/simulation setting으로 combat·world state를 갱신한다.
- GameStatus child는 gameplay update 뒤 player/world status 변화를 발행한다. GameApp과 Alpine은 GameScene HP/world field를 직접 polling하지 않는다.
- GameScene은 한 RenderFrame만 만든 뒤 `renderFrameCreated`를 발행한다. GameApp이 같은 객체를 Polygon/Retro renderer에 전달하며 renderer read-only 계약은 유지된다.
- 메뉴 → 새 게임, Portal → training encounter, Render Lab과 resize가 같은 runtime tree에서 유지된다. Gameplay frame/balance와 asset은 변경하지 않았다.

## Reference 판단

- Godot reusable/nested scene subtree — 현재 규모에 맞춘 `Scene(rootFactory)`로 **수정 채용**.
- Godot Node enter/ready/fixed-process/exit와 parent-child lifetime — `SceneNode` tree로 **수정 채용**.
- Godot Signal observer와 connection cleanup — synchronous snapshot dispatch, idempotent disconnect와 Node-owned cleanup으로 **수정 채용**.
- Signal은 response notification이고 command는 직접 method라는 scene organization 원칙 — **직접 채용**.
- `.tscn`, PackedScene, NodePath, editor owner, autoload/global bus와 group — 현재 문제를 해결하지 않아 **비차용**.
- Baeseongjin GameApp/fixed-step과 Ball Fight Simulator Alpine 경계 — App resource lifecycle과 UI intent/state 분리 원칙만 **차용**.
- Current Repository의 `FixedStepRunner`, input adapter, `MapRuntime`, `CombatEventBuffer`, immutable RenderFrame과 renderer 계약 — **직접 유지**.

## 품질 평가

| 축                   | 점수 | 근거                                                                                                   |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| 기능 완결성          | 2    | Scene tree fixed-step으로 spawn → Portal → training encounter → RenderFrame 경로 반복                  |
| 구조 명료성          | 2    | Scene root, Node lifecycle, status child와 command/Signal ownership이 코드·canonical doc에서 일치      |
| lifecycle 안전성     | 3    | parent/child 순서, hot add/remove, re-entry, recursive dispose와 producer/receiver cleanup 결정적 확인 |
| Signal 결합도        | 2    | UI status와 RenderFrame consumer가 GameScene mutable field/renderer reference에서 분리                 |
| Godot Reference 정합 | 2    | 세 핵심 개념을 실제 M1 orchestration에 적용하고 engine/editor 전용 API는 제외                          |
| 회귀 안전성          | 2    | lint/format/diff, DOM 없는 Portal/frame 검사, Browser Canvas/Render Lab/resize와 console 확인          |

적용 축 모두 feedback threshold 2 이상이다.

## 검증 경계

- inline deterministic Node/Signal 검사: reentrant snapshot emission, idempotent disconnect, enter/ready/fixed/exit 순서, dynamic child, Scene fresh instance와 recursive cleanup 통과.
- DOM 없는 GameScene 검사: 120Hz 이동 → Portal completion → training enemy spawn → immutable shared RenderFrame identity와 status/frame Signal cleanup 통과.
- 실제 Browser: 메뉴와 새 게임 Canvas 출력, HUD status, Polygon/Retro 동시 출력, viewport resize 뒤 두 Canvas backing/CSS resize, console warning/error 없음.
- `npm run check`, `git diff --check`를 final candidate에서 실행했고 통과했다.
- 독립 verifier: lifecycle·reentrancy·cleanup, GameApp 재진입 resource 중복 방지, Portal/RenderFrame, Browser Canvas/Render Lab/resize/console과 repository check 모두 PASS. 수리 finding 없음.
- HEAD `7a3b732` 재정합: 새 commits는 workflow 문서만 변경했고 `src`·`package.json` 변화가 없음을 확인한 뒤 deterministic Portal/RenderFrame, `npm run check`, `git diff --check`를 다시 PASS했다. Browser surface 재연결은 불가능해 기존 unchanged runtime candidate의 Browser·독립 verifier PASS를 유지한다.
- Browser automation의 held-key 한계로 guard → roll → launcher → air combo 전체를 다시 자동 입력하지는 않았다. Gameplay logic과 command/frame 데이터는 변경하지 않았고 기존 M1 팀장 플레이 경로를 유지했다.

## 다음 병목

`GameScene`의 training enemy state·AI·physics·contact resolution은 아직 player state와 교차 mutation한다. 다음 구조 vertical slice에서는 active Room entity에 따라 `TrainingEncounter` scene을 attach/detach하고 enemy state writer를 Node로 옮기며, player hit/guard/motion 결과와 combat presentation 요청을 root-owned Signal로 연결해야 한다. class 이름만 분리하고 mutable enemy object를 공유하는 방식은 채택하지 않는다.

## 팀장 피드백

- 2026-08-30 `규칙 다시읽고 진행해`: implementation-first 규칙을 현재 HEAD에서 다시 확인하고 concrete candidate 승인·통합 계속 지시로 반영했다.
