# WI-20260830-190118 첫 확장 Region 수직 단위 업무보고

## 의도

M1~M4의 전투·Room Portal·원정·성장 계약을 복제하지 않고, 학원촌을 출발점으로 두 번째 독립 Region인 `유리바람 협곡`을 추가했다. 새 생물은 기존 Guard/구르기 해법만 반복하지 않고 지면 Sweep를 점프로 넘은 뒤 공중 Punish하는 frame·높이 문제를 제공한다. Field의 횡풍 장벽은 생물 격파 뒤 gameplay surface, 실제 이동 collision bound, render geometry와 Dungeon Portal이 같은 상태 패치에서 함께 바뀐다.

## Changed code tree

```text
src/game/maps/glasswindRegion.js / academyVillage.js
└─ 유리바람 Field·관측소 Dungeon·폭풍눈 Boss, cross-region Portal, 바람다리와 shortcut patch

src/game/encounter/
├─ RegionExpansionProgress.js   새 Region phase/checkpoint/boss/reward/shortcut 단일 writer
└─ EncounterProfiles.js         풍식 사냥꾼과 폭풍 유리핵의 고유 pattern profile

src/game/training/
├─ TrainingEncounterNode.js          Sweep의 jump-safe/guard-hit/roll-hit contact 판정
└─ TrainingEncounterPresentation.js  60Hz Sweep frame, 바닥 telegraph와 날개 silhouette

src/game/GameScene.js
└─ 두 journey story flag 병합, portal/trigger/KO checkpoint dispatch, 새 HUD와 Gold 합산

index.html / src/ui/gameShell.js
└─ Region 중립 표기와 학원촌의 새 원정 안내
```

## 플레이 결과

1. 학원촌에서 장비를 고르고 중앙 청록 Portal로 `유리바람 협곡 · 벼랑길`에 진입한다. 기존 왼쪽 훈련장과 오른쪽 첫 원정 Portal은 그대로 남는다.
2. 날개가 있는 `풍식 사냥꾼`은 `24/18/26` combat frame의 청록 지면 Sweep를 사용한다. Sweep는 Guard와 Roll을 관통하지만 점프 높이에서는 빗나가므로, `↑ → A/S` 공중 반격이 새로운 해법이다. 공중에 오래 머물면 기존 공용 anti-air contract로 대응한다.
3. 사냥꾼 격파 전에는 횡풍 장벽과 `movementBounds.maxX`가 절벽을 막는다. 격파 fixed-step 뒤 바람다리 surface·render geometry·이동 경계·Dungeon Portal이 동시에 활성화된다.
4. 바람잠긴 관측소 중앙의 바람닻에 접근하면 HP를 회복하고 Boss Portal과 이 Region의 KO checkpoint를 연다.
5. `폭풍 유리핵의 섭정`은 기본공격 Guard, Sweep Jump, 강공격 Roll을 구분하고 각 recovery의 Punish window에서만 피해를 받는다.
6. Boss 격파 뒤 황금 프리즘을 한 번 회수하면 180 Gold와 학원촌 직행 shortcut이 열린다. shortcut 귀환 뒤 같은 game session에서 전체 원정을 반복할 수 있다.

## Baseline → current best

- **Baseline:** 학원촌과 첫 실습림 원정만 존재했고 두 번째 Region, 새 생물 문법과 대표 환경 변화가 없었다.
- **첫 candidate:** 세 Room, 네 Portal, 별도 progress writer, Sweep 공격과 바람다리 상태 패치를 한 수직 경로로 연결했다.
- **가장 큰 품질 병목:** 일반 생물의 초기 105 HP가 기존 Field보다 높아 새 Sweep 해법을 배우기 전에 반복 시간이 길었다.
- **Current best:** 일반 생물은 75 HP로 낮춰 속공형/중량형 모두 3회 안팎의 성공적인 punish에서 다리가 열리게 했다. Boss는 100 HP와 Guard/Jump/Roll 복합 판별을 유지한다.

## Reference 채택

- **직접 재사용:** 현재 Polygon RPG의 immutable `MapDefinition`, cross-region `MapRuntime`, Room-owned encounter Scene, shared RenderFrame과 M1 contact/event 계약.
- **Polygon에 맞게 수정:** Baeseongjin의 immutable Area catalog·validator 원칙을 현재 Region/Room/Portal stable ID와 atomic patch에 적용하고, fixed input·single-writer progression 경계를 새 Region progress로 국소화했다.
- **원칙만 차용:** Reference의 deterministic fixed-step, wrong-room state 배제, gameplay event에서 read-only presentation DTO로 흐르는 방향과 실제 Canvas/DPR 확인 방식.
- **비채택:** Reference의 Area/Sector 콘텐츠, vertical stacking, multiplayer authority, palette·수치·effect preset, mutable effect array와 update/draw 결합 entity.

## 검증

- `npm run check`: ESLint / Prettier 통과
- `git diff --check`: 통과
- 일회성 DOM 없는 Map 진단: 2 Region·9 Room·11 Portal 정의, cross-region spawn, Field 이전/이후 surface·movement collision·Portal 원자 변경, checkpoint 이전 Boss Portal 잠금, 보상 1회, shortcut 학원촌 귀환 통과
- 일회성 전투 진단: Sweep jump-safe, Guard 피해, Roll 피해와 `24/18/26` authored frame 통과; 기존 training Light Guard와 Heavy Roll 회귀 통과
- GameScene/RenderFrame 진단: M3 Room, M4 학원촌 status, 두 progress flag 병합, frozen item/frame 유지 통과
- 실제 Canvas public controls: 메뉴 → 학원촌 중앙 Portal → 유리바람 Field, 독립 silhouette, `LOW SWEEP · JUMP REQUIRED`, 점프 중 Sweep 통과를 확인
- 실제 Render Lab: 같은 유리바람 Field 상태를 Polygon/Retro 두 Canvas가 함께 표시하고 renderer console warning/error가 없음을 확인
- `900×600` resize: mobile controls와 고정 `360×203 logical` 유지, warning/error 없음
- 독립 verifier가 유리바람 phase HUD가 기존 M3 Field에 남는 scope 회귀를 발견했다. active Region/학원촌 광장으로 표시 범위를 제한한 뒤 기존 M3 label·ward와 새 Region checkpoint ownership을 다시 통과했다.
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.

## 품질 판정

| 축                   | 수준 | 근거                                                                                         |
| -------------------- | ---- | -------------------------------------------------------------------------------------------- |
| 기능 완결성          | 2    | 준비→Field→환경 해제→Dungeon checkpoint→Boss→보상→shortcut 귀환이 한 상태 경로로 연결        |
| 조작 명료성          | 2    | Sweep의 바닥 telegraph, HUD의 Jump 요구와 anti-air reset을 기존 Guard/Heavy와 구분           |
| 타격감·Effect        | 2    | 공용 contact/event/camera 위에 Sweep 바닥 ribbon과 Boss recovery Punish를 같은 frame에 표시  |
| Graphics·시각 일관성 | 2    | 날개 silhouette, 횡풍 장벽·바람다리와 Polygon/Retro 동일 RenderFrame이 새 Region을 구분      |
| Reference 정합       | 2    | current map/encounter convention을 우선하고 immutable catalog·single writer 원칙만 수정 채택 |
| 회귀 안전성          | 2    | check/diff, Map·전투·RenderFrame 결정적 진단, 실제 Canvas/resize/console 경로 통과           |

적용 품질 축에 0 또는 1이 없고 기능 완결성과 회귀 안전성이 2 이상이다. 별도 사람 판단 질문 없이 main integration 준비가 가능하다.

## 문서 상태와 남은 위험

- `docs/runtime-architecture.md`의 기존 Scene 설명에서 빠져 있던 `RegionExpansionProgress`와 두 진행의 story flag 병합 경계는 coordinator integration 기록에서 실제 구현에 맞게 정합했다.
- shortcut의 영구성은 M3와 같은 현재 game session의 world state 계약이다. M4 save schema는 성장 상태만 저장하므로 메뉴 reset/reload 뒤 Region shortcut은 초기화된다.
- 실제 Canvas에서는 새 Field 진입·Sweep 예고·점프 회피와 Polygon/Retro/resize를 확인했다. Boss 격파부터 shortcut 귀환까지는 production module을 사용한 120Hz 결정적 전체 경로로 확인했다.
- `CONFLICT`, `ORPHANED`, 추가 `UNVERIFIED`: 발견하지 않았다.
