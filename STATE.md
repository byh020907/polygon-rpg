# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — 최신 Human Feedback의 기획/그래픽/애니메이션 제작 계약을 문서에 정립했다. 이번 범위는 문서이며 runtime·그래픽 원본·게임 규칙은 변경하지 않는다. Codex heartbeat와 OpenCode runner의 Human pause를 유지한다. 전체 제품이나 아래 새 production 계약의 IMPLEMENTATION_COMPLETE 판정이 아니다.

## Current Phase

Human Feedback Priority — Reference-led production 계약. 생활형 산업 세계·세계/스케일 우선·지역 Color Identity는 Product Goal, Master SVG/Composition/XYZ/LOD/Rig/pose/root/contact의 소유권은 Architecture, 제작 자료와 REF-01~05 승인 순서는 handoff, 에이전트 작업 태도는 AGENTS에 배치한다. 도입·자유 순서 다섯 지역·최종전·저장/시간 구조를 보존한다.

## Active Execution Goal

문서 계약 정합·생성·독립 내용/viewport 검증을 마쳤으며 활성 자동 실행은 없다. 새로운 runtime 구현과 reference sheet 제작은 아직 시작하지 않는다. 다음 제작 순서는 Hero/Rival/Owner → Core/Retrieval Arm → Ancient Awakening → Garage 0% → prologue gameplay-scale composite 승인이다. 승인 후 enemy archetype → 폐광↔항구 → 나머지 지역으로 확장한다. 자동 재개는 명시적 지시 전까지 금지한다.

## Human Feedback Priority — Implementation Gaps

아래는 현재 source의 정적 조사 결과이며 새 계약의 구현 승인/시각 검증 결과가 아니다. 문서 완료로 제거하지 않는다.

| 새 계약                                   | 현재 evidence / 후속 Gap                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 생활형 산업·Color Identity·세계 우선 화면 | 지역 색/재질 data는 있지만 승인 reference/composite의 형태·18~22%·clean read·일반 전투 zoom 없음·다섯 지역 식별은 새 기준으로 검증 필요. src/game/ScrapArtDirectionProfiles.js                                                         |
| Scene XYZ·z parallax·override/renderBias  | MapRuntime/ScenePainter는 주로 XY·renderOrder·항목 parallax. actor depth raster가 공통 scene XYZ 완료를 뜻하지 않음. src/game/map/MapRuntime.js, src/rendering/ScenePainter.js                                                         |
| Composition/Prefab/Kit·연속 로딩          | 기존 Room renderItems와 전환 중 overlap은 승인 Composition·preload/unload 체계가 아님. 같은 world object의 상태 보존과 additive 연결 검증 필요. src/game/map/MapDefinition.js, MapRuntime.js                                           |
| 단일 landmark·occupancy LOD               | room/local ID 중심. world identity 하나의 far/mid/near, override/bias, hysteresis 경로 미구현. src/graphics/MapGraphicResources.js                                                                                                     |
| Master SVG·LOD export·면 정보             | 현재 JS nodes/polygon 원본과 보관 PNG. semantic group/joint/pivot/state anchor/local depth를 읽는 master importer/exporter 미구현. src/graphics/EnemyReferenceProfiles.js, EnemyReferenceModel.js                                      |
| 지역 재질/고유 shape·Hybrid Shadow        | 일부 material/light/caster 기반은 있으나 authored SVG normal/material/occlusion과 contact/caster/none 분리·단순 occluder 연결은 새 계약으로 검증/구현 필요. src/rendering/CellLighting.js, ScenePainter.js                             |
| Rig Family + Body Profile                 | 일부 인물 비율 data·고정 PLAYER_RIG·4개 검토 견본은 전체 family 통합 증거가 아님. src/game/character/CharacterPresentationProfiles.js, src/animation/PlayerRig.js                                                                      |
| 체형 retarget·선택 Contact IK             | 현재 MotionClipRetargeter의 mapping/균일 scale, PlayerRig의 저작 시 IK와 차이. body retarget→modifier→필요 Contact IK→authored override 경로 필요. src/animation/MotionClipRetargeter.js, PlayerRig.js                                 |
| 중요 key pose·부분/whole-body SVG         | 현재 코드 생성 key frame과 ForwardRollClip은 승인 SVG pose replacement가 아님. READY/WINDUP/CONTACT/FOLLOW/RECOVER와 anchor 보존 검증 필요. src/animation/CharacterBonePoseLibrary.js, ForwardRollClip.js                              |
| Gameplay 거리 + root curve warp           | 이동 authority 일부는 gameplay에 있으나 authored root curve를 roll/attack/counter/charge 거리로 warp하는 공통 계약 미확인. src/game/GameScene.js, src/animation/ForwardRollClip.js                                                     |
| Visible weapon sweep AND envelope         | 현재 shared sweep·spatial reach는 있으나 동일 contact의 독립 max-reach envelope AND gate 미확인. 빠른 회전/방향/이력과 동일 trail trajectory 검증 필요. src/combat/SharedCombatGeometry.js, src/game/training/TrainingEncounterNode.js |
| Semantic Hurt Region                      | 부위 polygon 추적은 있으나 visual surface 공유에서 안정 primitive·body/weak/armor/guard/immune response·시각 오차 계약으로 정렬 필요. 무적은 gameplay state. src/combat/SharedCombatGeometry.js                                        |

기존 INBOX의 전투 접촉 불만은 계속 유효하되 최신 sweep AND envelope / semantic primitive 계약으로 해결해야 한다. 이전 visual/hurt 동일 topology나 모든 동작 3D strip 규칙으로 되돌리지 않는다. 폐광→항구 연결 전투/귀환 등 기존 playable frontier Gap도 남는다.

## Verification

- 독립 source 조사와 문서 검증에 기존 explorer 한 명을 재사용했다. 23항의 owner 배치, Master 단일 원본·부분/whole-body pose·AND envelope·semantic hurt·REF 순서, obsolete 문구와 기존 이야기 보존을 대조했다.
- artifacts/art-contract/scope-check.json: 이전 Product Goal의 도입/자유 캠페인/대화/인물/시간/지도/성장/최종전/복구/PWA 10개 계약 본문 보존, runtime src·sw·index·public assets·package 변경 없음 확인.
- npm run docs:art 및 docs:art:check: 새 4개 계약 페이지와 기존 역할/시나리오/592개 ID·검토 링크를 재생성/검사한다. 생성 원본은 scripts/art-production-contract.mjs와 scripts/art-handoff-content.mjs, renderer는 generate-art-handoff.mjs다. 기존 목록/보관 PNG는 승인본으로 승격하지 않는다.
- art-handoff-qa의 PC/mobile·print·reference/링크 검증은 문서의 판독성과 연결을 검증하며 새 production renderer/animation 구현 검증이 아니다. 근거는 artifacts/art-contract/qa.log와 artifacts/art-handoff PNG.
- lint/format 및 release-metadata-check로 문서/생성 흐름과 runtime 원본 보존을 확인한다. 별도 구현 테스트 통과로 새 계약 준수를 주장하지 않는다.

## Human 확인 / Pause

제작 계약은 확정되었고 개별 reference/composite 승인은 별도다. 미정 인물 설정·적 종류·지역 사건을 추가하지 않는다. 기존 이야기의 무기 소유권·자유 순서·온실 지형 등 decisions.html 확인 항목을 유지한다. 설치형 Android/iOS와 전체 게임 최종 만족은 이번 문서 범위 밖이다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
