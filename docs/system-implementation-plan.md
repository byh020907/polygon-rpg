# 시스템 우선 구현 계획

확정된 제작 계약을 실제 실행 경로에 연결한다. Human이 그래픽 디테일을 공급하므로 기존 그림과 명시적 기술 검증 자산을 사용한다. 최종 디자인 승인은 별도이며 자동 heartbeat는 재개하지 않는다.

## 결과 파일 구조

신규 = 추가 예정, 수정 = 기존 경로 연결. 세부 보조 파일은 해당 모듈 안에 둔다.

```text
polygon-rpg/
├─ src/
│  ├─ graphics/
│  │  ├─ svg/                         # 신규: compiler, normalized sampler
│  │  ├─ scene/                       # 신규: XYZ, Composition, residency, identity/LOD
│  │  ├─ GraphicsResourceSampler.js    # 수정: SVG/시스템 자산 샘플
│  │  └─ GraphicsResourceCatalog.js    # 수정: 시스템 검증/교체 자산 등록
│  ├─ animation/
│  │  ├─ CharacterAnimationPipeline.js # 신규: family/body/modifier/IK/override
│  │  ├─ RigFamily.js                 # 신규: 공유 계층/개별 체형
│  │  ├─ RootMotionCurve.js           # 신규: gameplay 거리 warp
│  │  └─ PlayerMotionPose.js          # 수정: production 공용 sampler
│  ├─ combat/
│  │  ├─ AttackEnvelope.js            # 신규: sweep의 허용 범위 clipping
│  │  ├─ SemanticHurtRegions.js       # 신규: primitive/response/오차
│  │  └─ SharedCombatGeometry.js      # 수정: 시각과 semantic contact 분리
│  ├─ game/GameScene.js               # 수정: 실제 prologue/pose 연결
│  ├─ game/training/TrainingEncounterNode.js # 수정: 실제 damage AND gate
│  ├─ rendering/                     # 수정: XYZ/normal/material/hybrid shadow
│  └─ ui/GraphicsReviewController.js  # 수정: SVG 불러오기/진단
├─ public/graphics/                   # 신규: 명시적 기술 master/exports/compiled
├─ scripts/
│  ├─ compile-svg-assets.mjs           # 신규: 재현 가능한 asset export/check
│  ├─ svg-asset-check.mjs              # 신규: importer/LOD/pose/budget
│  ├─ semantic-contact-check.mjs       # 신규: production damage 계약
│  └─ ... system/scene/rig/browser 검증
├─ docs/system-implementation-plan.md # 이 계획
└─ STATE.md / ARCHITECTURE.md / handoff # 구현 결과·공급 형식 정합
```

## 적용 순서와 완료 조건

1. SVG master compiler/sampler와 source hash가 있는 LOD/compiled 산출물을 만든다. 지원하지 않는 SVG를 조용히 변형하지 않고 오류로 알려준다.
2. Scene XYZ·z parallax·scale override·미세 renderBias, Composition overlap/residency, 단일 world identity와 screen-occupancy LOD/hysteresis를 실제 renderer/prologue에 연결한다. preload는 게임 trigger/시간/저장을 실행하지 않는다.
3. Family/Body Profile retarget·modifier·선택 Contact IK·부분/whole pose override·root curve warp를 공용 pose 경로에 적용한다. 기본 주인공 동작과 gameplay 이동거리는 보존한다.
4. Active visible sweep AND gameplay envelope와 semantic primitive/response를 실제 damage owner에서 검증한다. 기존 피해·stamina·timing 수치로 실패를 숨기지 않는다.
5. SVG 파일을 검토실에서 불러와 의미 그룹/LOD/pose/anchor를 보고, 같은 compile/sample 경로를 game/test play에서 사용한다. 공급받은 아트로 교체하는 입력 계약을 문서화한다.
6. 단위 계약·production GameScene hit/miss·PC/mobile 실제 viewport·저장/PWA/기존 도입 회귀와 생성 문서를 확인한 뒤 main에 통합한다. 최종 아트 미제공과 시스템 미구현을 구분해 보고한다.

## 조사 근거와 선택

- [W3C SVG 2 path](https://www.w3.org/TR/SVG/paths.html)와 [SVG 2](https://www.w3.org/TR/SVG/)의 그룹/transform/data 속성을 기준으로 지원 subset을 명시한다. Node XML은 [xmldom](https://github.com/xmldom/xmldom)의 DOMParser를 development dependency로 사용한다.
- [Three.js LOD](https://threejs.org/docs/pages/LOD.html)의 hysteresis처럼 진입/이탈 여유를 두되, 이 게임의 승인 계약에 따라 거리 대신 실제 projected occupancy를 기본값으로 쓴다.
- 그래픽 자체를 새로 확정하지 않는다. 기본 profile/기존 map adapter는 기존 결과 보존용, 기술 reference는 시스템 검증용이며 승인 아트의 대체물이 아니다.
