# Polygon / Retro Rendering Pipeline

이 문서는 동일한 float 기반 장면을 Polygon Renderer와 Retro Pixel Renderer가 공유하는 현재 렌더링 계약을 소유한다.

## 상태 소유권

`GameScene`은 fixed-step에서 게임 상태를 한 번 갱신하고, 렌더 시점에 하나의 읽기 전용 `RenderFrame`을 만든다. `CanvasPolygonRenderer`와 `CanvasRetroRenderer`는 정확히 같은 객체를 받는다.

```text
FixedStepRunner
    ↓
GameApp Node.fixedProcess()
    ↓
GameScene Node.onPhysicsProcess()
    ↓
GameScene.createRenderFrame()
    ↓ renderFrameCreated Signal
GameApp
    ↓
    ├─ CanvasPolygonRenderer
    └─ CanvasRetroRenderer
```

Renderer는 animation time, 위치 또는 effect lifetime을 진행하지 않는다.

## 좌표계와 처리 순서

Polygon 출력:

```text
World float coordinates
→ Camera2D
→ CSS Screen Space float coordinates
→ Canvas2D rasterization
```

Retro 출력:

```text
World float coordinates
→ Camera2D
→ CSS Screen Space
→ Pixel Snap 선택 적용
→ Logical Pixel Space
→ Low-resolution Canvas rasterization
→ Alpha Threshold
→ RGB Posterization
→ Alpha edge Outline
→ Nearest-neighbor upscale
```

Pixel Snap은 world, scene 또는 animation 좌표를 수정하지 않는다. `screen / pixelSize` 결과를 정수화할 때만 적용한다.

## Fixed Render Viewport

게임, Polygon 비교와 Retro 비교 Canvas는 브라우저의 CSS 크기와 무관하게 PC Canvas 기준인 `1440×810` Render Viewport를 사용한다. `CanvasHost`는 실제 CSS 크기와 DPR로 backing canvas 예산을 계산하지만 카메라와 renderer에는 고정 Render Viewport를 제공한다. Camera는 이 viewport 안에 `960×540` World를 동일한 구도로 투영한다.

- 게임 기본 `pixelSize=4`의 Retro surface는 항상 `360×203`이다.
- 브라우저 resize는 backing canvas와 최종 presentation rectangle만 바꾼다.
- PC와 모바일은 같은 Camera projection, 보이는 World 범위와 logical pixel 배열을 공유한다.
- 화면 비율이 정확히 16:9가 아니면 고정 결과를 늘이거나 자르지 않고 중앙 letterbox로 맞춘다.
- Polygon과 Retro renderer 모두 같은 presentation rectangle을 사용하며 renderer가 gameplay state를 변경하지 않는다.

## Character Presentation Scale

현재 첫 맵 앞쪽 레인의 idle articulated silhouette는 무기와 그림자를 제외하고 약 `32×45` World unit으로, `48×48` logical cell 안에 들어가는 크기를 기준으로 한다. 작은 머리, 좁은 torso, 긴 팔·다리, 얇은 shield와 긴 blade로 날렵한 방향성을 만든다. `GameScene`은 원본 Polygon character 좌표를 발밑 pivot 기준 `0.265×`로 변환하고, 중간·뒤쪽 레인에서는 여기에 authored lane visual scale을 곱해 RenderFrame에 기록한다.

- gameplay position, jump height와 이동 속도는 이 배율의 영향을 받지 않는다.
- lane visual scale은 presentation에만 적용하며 gameplay surface나 connection 범위를 바꾸지 않는다.
- 캐릭터 크기 조정은 world/physics 좌표가 아니라 presentation geometry에서만 수행한다.
- 좌우 반전도 같은 presentation transform에서 처리한다.
- 향후 collider 또는 Skeleton을 이 배율에 암묵적으로 결합하지 않는다.

## Visible World Boundary

첫 맵의 Camera와 Canvas가 표시하는 World 범위는 `x=0~960`, `y=0~540`이다. 캐릭터 이동 경계는 이 보이는 범위에서 `48×48` cell의 반폭만 제외한 `x=24~936`을 사용한다.

- 화면에 보이지 않는 별도 내부 경계를 두지 않는다.
- 캐릭터 크기가 바뀌면 임의 margin이 아니라 cell/collider 반폭에서 경계를 다시 계산한다.
- Renderer는 경계를 재계산하거나 GameScene 위치를 보정하지 않는다.

## 모듈 책임

| 모듈                                        | 책임                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `src/core/FixedStepRunner.js`               | 120Hz fixed update, catch-up 상한, 보간 alpha와 dropped-step 계측          |
| `src/combat/CombatFrame.js`                 | 60Hz integer combat frame 정의·초 변환과 120Hz simulation sample           |
| `src/combat/CombatEvent.js`                 | bounded causal combat event identity, lifetime과 read-only snapshot        |
| `src/animation/CombatPoseLibrary.js`        | 0..1 progress 기반 Effector Target keyframe 보간                           |
| `src/animation/CharacterBonePoseLibrary.js` | idle·move·jump·guard·roll·ground/air combat의 전신 target pose             |
| `src/animation/TwoBoneIKSolver.js`          | 손 목표에서 어깨·팔꿈치·손 관절 자동 계산                                  |
| `src/combat/CombatCommandController.js`     | gameplay motion 정책, command edge, phase, sequence와 입력 buffer          |
| `src/combat/CombatCameraFeedback.js`        | combat event 강도에서 bounded directional camera offset 계산               |
| `src/combat/SpinContactConstraint.js`       | Spin pulse spacing, pull 상한과 종료 release를 계산하는 순수 constraint    |
| `src/core/Scene.js`                         | fresh root Node를 만드는 재사용 가능한 Scene composition                   |
| `src/core/SceneNode.js`                     | tree hierarchy, enter/ready/fixed-process/exit와 connection lifecycle      |
| `src/core/Signal.js`                        | 동기 사건 통지, 멱등 disconnect와 producer cleanup                         |
| `src/game/GameScene.js`                     | Scene root, float 기반 gameplay state와 Polygon item 단일 RenderFrame      |
| `src/game/GameStatusNode.js`                | player/world status 변화 감지와 lifecycle-owned Signal                     |
| `src/rendering/Camera2D.js`                 | World Space를 Screen Space로 투영                                          |
| `src/rendering/CanvasHost.js`               | 고정 Render Viewport, CSS 크기, DPR, backing 예산과 presentation rectangle |
| `src/rendering/ScenePainter.js`             | 전달받은 frame geometry만 Canvas path로 rasterize                          |
| `src/rendering/CanvasPolygonRenderer.js`    | float Screen Space 원본 비교 출력                                          |
| `src/rendering/CanvasRetroRenderer.js`      | logical resolution raster와 nearest upscale 조정                           |
| `src/rendering/RetroPostProcessor.js`       | threshold, posterization과 outline ImageData 처리                          |
| `src/app/GameApp.js`                        | 입력·Simulation Settings·세 Canvas 조립, RenderFrame 1회 생성              |

DOM 화면과 renderer control 상태는 `src/ui/gameShell.js`의 Alpine 컴포넌트가 소유한다. GameApp은 UI bridge의 읽기 전용 snapshot만 소비하고, GameScene의 `playerStatusChanged`와 `worldStatusChanged` Signal 결과를 bridge writer에 전달한다.

`createRenderFrame()`은 frame 생성을 시작하는 동기 command고 `renderFrameCreated`는 생성이 끝났다는 notification이다. GameApp이 이 Signal에 연결해 renderer를 선택하므로 GameScene은 Canvas renderer를 참조하지 않는다. 두 renderer에는 매 render pass에서 같은 immutable 객체 하나만 전달한다.

`showMesh` debug overlay도 RenderFrame의 opacity를 존중한다. opacity 0 item은 raster와 mesh를 모두 생략하고, 보이는 item의 mesh alpha는 item opacity에 비례한다. World-space Shoelace area가 `0.0001` 이하이면 authored 구조 오류인 `degenerateItemIds`, source는 유효하지만 pixel-snap 이후 projected area가 사라지면 renderer 한정 `rasterCollapseItemIds`로 분리한다. Polygon/Retro renderer는 두 진단을 render stats로 반환하고 `GameApp`은 구조 오류만 renderer 간 union해 `INVALID GEOMETRY` ID를, Retro raster collapse는 변동 가능한 개수만 별도 표시한다. 유효하지 않은 opacity는 Canvas가 이전 `globalAlpha`를 암묵적으로 유지하게 두지 않고 1로 정규화한다.

Combat camera feedback은 물리 위치나 `Camera2D` 상태를 바꾸지 않는다. Fixed-step presentation state가 수평축 최대 5 World unit, 140ms 이하의 짧은 방향성 offset을 RenderFrame에 기록하고 Polygon/Retro renderer가 동일하게 투영한다. Guard < Light hit < Heavy/finisher 순으로 강도를 제한하고 빠르게 제곱 감쇠해 전투 공간 가독성을 유지한다. OS `prefers-reduced-motion: reduce`에서는 offset을 즉시 0으로 만들고 hit-stop·flash·reaction만 유지한다.

Sword trail의 polygon은 gameplay-owned swept-contact geometry를 읽어 그린다. Renderer는 해당 geometry의 lifetime, opacity와 색상만 소비하고 hit 판정이나 sweep history를 진행하지 않는다.

RenderFrame의 `combatMotion.frame`은 현재 60Hz authored frame index와 startup/active/recovery 경계를, `combatEvents`는 fixed-step이 확정한 guard·evade·hit·launch·punish·landing event의 남은 presentation lifetime을 제공한다. `GameScene`만 event를 발행·진행하고 같은 frame을 받는 Polygon/Retro renderer는 event를 재판정하거나 중복 소비하지 않는다.

## Outline 불변식

Outline은 처리 전 alpha를 재사용 가능한 source buffer에 복사하고 output ImageData에만 기록한다. 같은 pass에서 새로 생성한 outline pixel을 source로 읽지 않으므로 1px 또는 2px 설정 이상으로 재귀 확장되지 않는다.

## 실시간 설정

- Play / Pause
- Pixel Size `2~10`
- Posterization Level `2~8`
- Outline `0~2`
- Alpha Threshold ON/OFF 및 threshold 값
- Pixel Snap ON/OFF
- Animation Speed
- Show Mesh
- Show Pixel Grid

Animation Speed는 input intent에 포함하지 않는다. `GameApp`이 별도 simulation/debug setting으로 `GameScene`에 전달하며 keyboard/mobile input snapshot은 action과 sequence만 유지한다.

## 현재 성능 경계

`RetroPostProcessor`의 `getImageData → CPU 처리 → putImageData`는 Canvas 2D 프로토타입 경계다. source outline buffer는 크기가 같으면 재사용하지만 `getImageData` 자체는 매 frame 수행한다. 실제 병목을 계측하기 전에는 WebGL이나 별도 worker로 확장하지 않는다.

## 월드 맵 경계

맵의 gameplay surface, active chunk/lane과 상태 패치는 `docs/world-map-system.md`가 소유한다. GameScene은 fixed-step에서 resolved map snapshot을 소비하고 RenderFrame에는 정렬된 읽기 전용 render item만 기록한다.

- Gameplay surface는 renderer item과 별도 계약이다.
- Renderer는 active lane, collision 또는 조건 패치를 해석하지 않는다.
- 앞·중간·뒤 lane의 표시 순서는 map runtime이 결정하며 Renderer는 전달받은 순서를 보존한다.
- 동적 지형과 lane 전환 progress는 fixed-step에서만 적용한다. `GameScene`은 previous/current position, visual scale과 render order를 interpolation alpha로 보간해 RenderFrame에 기록하고 Renderer는 transition을 진행하지 않는다.

## 현재 비범위

- Rigid 또는 weighted skinning
- 범용 force/impulse 물리와 복잡한 polygon collision response
- lifetime을 가진 다중 sample Sword Trail effect
- Global nearest-palette mapping
- WebGL renderer

이 기능들은 현재 RenderFrame과 Renderer 읽기 전용 경계를 유지한 채 후속 수직 작업으로 추가한다.
