# Polygon / Retro Rendering Pipeline

이 문서는 동일한 float 기반 장면을 Polygon Renderer와 Retro Pixel Renderer가 공유하는 현재 렌더링 계약을 소유한다.

## 상태 소유권

`GameScene`은 fixed-step에서 게임 상태를 한 번 갱신하고, 렌더 시점에 하나의 읽기 전용 `RenderFrame`을 만든다. `CanvasPolygonRenderer`와 `CanvasRetroRenderer`는 정확히 같은 객체를 받는다.

```text
FixedStepRunner
    ↓
GameScene.update()
    ↓
GameScene.createRenderFrame()
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

## Character Presentation Scale

현재 첫 맵 앞쪽 레인의 캐릭터 본체는 무기와 그림자를 제외한 약 `35×48` World unit으로, `48×48` logical cell 안에 들어가는 크기를 기준으로 한다. `GameScene`은 원본 Polygon character 좌표를 발밑 pivot 기준 `0.265×`로 변환하고, 중간·뒤쪽 레인에서는 여기에 authored lane visual scale을 곱해 RenderFrame에 기록한다.

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

| 모듈                                     | 책임                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `src/core/FixedStepRunner.js`            | 120Hz fixed update, catch-up 상한, 보간 alpha와 dropped-step 계측 |
| `src/animation/CombatPoseLibrary.js`     | 관절 회전 없이 Effector Target keyframe 보간                      |
| `src/animation/TwoBoneIKSolver.js`       | 손 목표에서 어깨·팔꿈치·손 관절 자동 계산                         |
| `src/combat/CombatCommandController.js`  | command edge, phase, sequence와 후속 입력 buffer                  |
| `src/game/GameScene.js`                  | float 기반 장면 상태와 Polygon item으로 구성한 단일 RenderFrame   |
| `src/rendering/Camera2D.js`              | World Space를 Screen Space로 투영                                 |
| `src/rendering/CanvasHost.js`            | Canvas context, CSS 크기, DPR과 backing pixel 예산                |
| `src/rendering/ScenePainter.js`          | 전달받은 frame geometry만 Canvas path로 rasterize                 |
| `src/rendering/CanvasPolygonRenderer.js` | float Screen Space 원본 비교 출력                                 |
| `src/rendering/CanvasRetroRenderer.js`   | logical resolution raster와 nearest upscale 조정                  |
| `src/rendering/RetroPostProcessor.js`    | threshold, posterization과 outline ImageData 처리                 |
| `src/app/GameApp.js`                     | 입력과 세 Canvas 조립, 프레임당 RenderFrame 1회 생성              |

DOM 화면과 renderer control 상태는 `src/ui/gameShell.js`의 Alpine 컴포넌트가 소유하며, GameApp은 UI bridge의 읽기 전용 snapshot만 소비한다.

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

## 현재 성능 경계

`RetroPostProcessor`의 `getImageData → CPU 처리 → putImageData`는 Canvas 2D 프로토타입 경계다. source outline buffer는 크기가 같으면 재사용하지만 `getImageData` 자체는 매 frame 수행한다. 실제 병목을 계측하기 전에는 WebGL이나 별도 worker로 확장하지 않는다.

## 월드 맵 경계

맵의 gameplay surface, active chunk/lane과 상태 패치는 `docs/world-map-system.md`가 소유한다. GameScene은 fixed-step에서 resolved map snapshot을 소비하고 RenderFrame에는 정렬된 읽기 전용 render item만 기록한다.

- Gameplay surface는 renderer item과 별도 계약이다.
- Renderer는 active lane, collision 또는 조건 패치를 해석하지 않는다.
- 앞·중간·뒤 lane의 표시 순서는 map runtime이 결정하며 Renderer는 전달받은 순서를 보존한다.
- 동적 지형과 lane 전환은 fixed-step에서 적용하고 render 중 상태를 변경하지 않는다.

## 현재 비범위

- 전체 Skeleton hierarchy
- Rigid 또는 weighted skinning
- 범용 force/impulse 물리와 복잡한 polygon collision response
- lifetime을 가진 다중 sample Sword Trail effect
- Global nearest-palette mapping
- WebGL renderer

이 기능들은 현재 RenderFrame과 Renderer 읽기 전용 경계를 유지한 채 후속 수직 작업으로 추가한다.
