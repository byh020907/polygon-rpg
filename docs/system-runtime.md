# 그래픽 시스템 공급·연결 계약

최종 그림은 Human/그래픽 담당자가 공급한다. 이 문서는 확정 제작 방향을 실행하는 입력 형식과 연결 지점이다. 기술 fixture의 등록·검사 통과는 디자인 승인이 아니다. 제품 기준은 [PRODUCT_GOAL](../PRODUCT_GOAL.html), 기술 authority는 [ARCHITECTURE](../ARCHITECTURE.md), 제작 요청은 [art handoff](art-handoff/index.html)를 따른다.

## 원본에서 게임까지

수정 원본은 하나의 *.master.svg다. npm run assets:compile은 source hash를 포함한 compiled JSON과 far/mid/near SVG를 생성한다. npm run assets:check는 재생성 결과와 원본의 일치를 검사한다. export를 직접 수정하지 않는다. 런타임은 미리 삼각분할한 topology를 재사용한다. 검토실의 SVG 불러오기는 같은 compiler/sampler를 사용하며, 선택한 LOD/pose를 테스트 플레이로 보낸다. 업로드는 저장 게임에 포함하지 않는다. 파일 512 KiB, 세션 8개/compiled 데이터 4 MiB 제한이며 ‘업로드 비우기’로 해제한다. 새 페이지에서 다시 선택해야 하는 업로드의 URL은 명시적인 복구 안내를 제공한다.

## 지원 SVG 입력

- 실제 polygon, rect, circle, ellipse, 단일 닫힌 path. path 명령 M/L/H/V/C/S/Q/T/Z와 affine translate/scale/rotate/matrix/skew를 지원한다.
- 의미 있는 g에 data-part, 선택 data-frame, data-pivot, data-joint를 둔다. data-anchor로 소켓/잡는 위치를 표기한다. viewBox와 part frame에서 부모축 [-1,1] 좌표 및 별도 extent/sizeRatio를 생성한다. 부모 transform은 한 번만 적용한다.
- data-lod는 common/far/mid/near, data-pose는 pose ID, data-replace는 part/whole이다. far 실루엣을 별도로 author할 수 있다.
- data-z는 부위 깊이, data-normal은 면 방향, data-material은 재질 ID, data-occlusion은 구조적 가림이다. data-role=occluder로 단순 그림자 형상을 분리한다. data-shadow는 contact/cast/none이다.
- 현재 subset은 arc A, 구멍/다중 contour, stroke, gradient/filter/use/image/text, 둥근 rect, 그룹 opacity 합성을 명시적으로 거부한다. 지원하지 않는 표현을 조용히 누락하거나 raster로 바꾸지 않는다. 필요한 외곽선은 닫힌 면으로 공급한다.
- 기본 compile 예산: 256 parts, 계층 32, anchors 256, shapes 256, 전체 vertex 8192, shape당 512. 곡선 분할은 compile 시 수행한다.

실제 예시는 public/graphics/system-reference.master.svg와 prologue-control-core.master.svg다. 전자는 기술 fixture, 후자는 기존 제어핵 실루엣 연결 자산이다. 캐릭터 연결 fixture는 scripts/fixtures/svg-character-system.master.svg이며 최종 주인공 디자인이 아니다.

## 캐릭터와 동작

RigFamily는 공용 관절명/계층을, Character Body Profile은 길이·비율·stance를 소유한다. 새 offset은 부모축 [-1,1]과 명시적 extent를 사용한다. 기존 world-unit skeleton은 내부 adapter다. sampleCharacterAnimation은 Body Profile → modifier → 요청된 Contact IK → authored override 순서다. IK는 명시한 두 관절 chain에만 적용하고 도달 불가 target은 제한 결과를 보고한다.

GameScene.setCharacterAnimationSettings로 bodyProfile, 선택 contacts/modifier, authoredOverride 또는 action별 tracks를 연결한다. svgAsset와 명시적인 svgRootFrame/jointMap을 함께 공급하면 실제 캐릭터 draw와 weapon/shield contact가 같은 SVG sample을 사용한다. 임의 업로드만으로 관절/크기를 추측해 주인공을 교체하지 않는다.

AuthoredPoseTrack은 시간별 pose ID/부분 교체와 joint 보간을 지원한다. 기본 부분 교체, 극단 pose는 wholeBody다. 장비는 각 LOD/pose에서 하나의 닫힌 convex visible contour를 공급한다. 누락·복수 contour·concave 장비를 보이지 않는 hull로 대신하지 않는다. 정상 3D 관절이 edge-on으로 보이면 같은 contour가 선/점으로 퇴화하며 진단에 collapsedPartIds를 남긴다. 원본의 잘못된 singular transform은 계속 거부한다.

RootMotionCurve는 정규화된 시간/이동 곡선이다. GameScene.setRootMotionCurve의 distance가 실제 거리 authority이며 roll/공격 전진에 곡선 delta를 warp한다. 기본 roll은 기존 감속 형태를 보존하고 새 공격의 기본 이동거리는 0이다. authored curve를 추가해도 벽/충돌과 gameplay 취소를 건너뛰지 않는다. 최종 key pose가 없는 동작을 새로 승인된 모션으로 취급하지 않는다.

## 장면·깊이·조명

SceneCompositionRuntime은 stable world object를 공유하는 Composition overlap/preload/unload를 관리한다. XYZ는 x 우측/y 높이/z 뒤쪽이다. Canvas로 넘어갈 때 y를 한 번 반전한다. z≥0의 기본 parallax는 1/(1+z)이며 scale은 자동 perspective 축소를 받지 않는다. scale/parallaxScale과 작은 renderBias를 별도로 둔다.

renderer의 실제 viewport·zoom·mobile scale·parallax로 활성/상주 범위를 구하고, 같은 projection에서 정확한 object culling과 screen occupancy LOD를 선택한다. raw LOD hysteresis와 authored bias/override를 분리하여 경계에서 흔들리지 않는다. rotation/scale을 적용한 anchor 하나로 Canvas/world 좌표를 모두 파생한다. 프레임은 시각 상태만 읽으며 gameplay identity/state를 새로 만들지 않는다.

SceneAssetRegistry는 resident/pending/총 byte 예산, abort/stale load/retry를 관리한다. unload 후 source catalog에서 다시 불러올 수 있다. 기존 맵은 명시적인 legacy adapter로 연결하며 renderOrder를 가짜 z로 변환하지 않는다. 실제 prologue 제어핵은 하나의 world-control-core를 기존 두 장소 표현에 연결한다. 이것이 모든 지역의 승인 Composition 완성을 뜻하지 않는다.

RegionalMaterialProfile은 공용 구조의 재질/색을 지역화한다. authored normal/material/occlusion과 런타임 light가 3~4단계 밝기를 만든다. contact는 접지 타원, cast는 단순 occluder의 광원→지면 투영, none은 생략한다. 작은 부품별 실시간 그림자를 만들지 않는다. 2.5D caster는 bounded projection으로 처리하며 부피 기반 3D 광학 시뮬레이터는 아니다.

## 전투 authority

SharedCombatGeometry의 semanticHurt가 실제 피해 판정이다. visual surface는 draw 전용이다. head/torso/limb의 ellipse/capsule/simple polygon이 bone을 따라가며 body/weak/armor/guard/immune response를 적용한다. 장식/케이블/smear를 자동 hurtbox로 만들지 않는다. 무적은 gameplay state다.

공격은 이전→현재 visible weapon sweep과 유한 gameplay envelope의 교차에만 맞는다. 기본 envelope는 전방/후방 reach와 원점 높이 ±reach이며 공격 profile이 더 구체적인 유한 범위를 제공할 수 있다. 적의 기존 verticalRange를 보존한다. 보이는 무기를 과장해도 뒤/위/아래 무한 범위로 확장되지 않는다. trail과 trace는 동일 무기 trajectory를 사용한다.

## 검증 및 남은 공급

npm run test:systems, test:combat, assets:check와 전체 npm run check를 실행한다. scripts/system-browser-qa.mjs는 PC 1280×720/mobile 844×390에서 업로드→LOD/pose→실제 테스트 이동→검토 복귀·저장 보존과 prologue identity/캐릭터 draw를 확인한다. 기술 데이터로 시스템을 검증한 뒤 최종 reference는 실제 gameplay scale에서 별도 검수한다.

남은 제작 공급은 Hero/Rival/Owner, 제어핵/회수팔 상태, 고대병기 각성, Garage 0%, prologue composite 순서다. 최종 SVG/pose/Composition을 받으면 기존 연결 계약에 꽂고 실루엣·비율·접점·광원·모바일 가독성을 다시 검수한다. 후반 콘텐츠/새 몹/새 lore를 시스템 작업만으로 확정하지 않는다.
