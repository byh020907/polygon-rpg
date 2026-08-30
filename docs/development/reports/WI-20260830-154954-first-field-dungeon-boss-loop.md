# WI-20260830-154954 첫 Field·Dungeon·Boss loop 업무보고

## 의도

M1 전투와 M2 Room/Portal 기반을 별도 데모로 남기지 않고, 학원촌 준비에서 Field 탐험·일반 조우 또는 우회, 폐쇄 실습림 Dungeon, checkpoint, Boss 공략, 보상과 shortcut 귀환까지 한 번에 이어지는 첫 RPG loop로 만들었다. 일반 적과 Boss는 같은 encounter/contact 계약을 사용하고, 진행 상태 하나가 checkpoint·보상·shortcut 순서를 쓴다.

## Changed code tree

```text
src/game/maps/firstJourney.js / academyVillage.js
└─ Field 갈림길·우회로, 봉인 회랑·Boss Room, Portal graph, 상태 patch와 시각 geometry

src/game/encounter/
├─ EncounterProfiles.js      일반 적/Boss의 역할·패턴·감지 거리 data
└─ FirstJourneyProgress.js   route/checkpoint/boss/reward/return 단일 상태 writer

src/game/training/TrainingEncounterNode.js / TrainingEncounterPresentation.js
└─ M1 combat 계약을 일반 적·Boss가 공유하고 heavy telegraph·punish window·완료 Signal 표시

src/game/room/RoomNode.js / src/game/GameScene.js
└─ encounter 완료 전달, trigger 적용, checkpoint 부활, 보상·shortcut과 status 조립

src/game/map/MapRuntime.js
└─ active Room trigger를 world 좌표의 resolved snapshot에 포함

index.html / src/style.css / src/ui/gameShell.js
└─ 원정 단계, 준비 효과, encounter 해법·이름·HP와 Gold 표시
```

## 플레이 결과

1. 학원촌에서 균형형/중량형 장비를 고르고 오른쪽 황금 Portal로 Field에 진입한다.
2. Field 감시 골렘은 전투 구역에 들어가기 전까지 대기한다. 정면 조우를 이기면 `수호 수액`으로 최대 HP가 20 증가하고, 적 앞 초록 Portal을 사용하면 전투를 우회하지만 보너스를 받지 않는다.
3. 두 경로는 폐쇄 실습림 봉인 회랑에서 합류한다. 청록 checkpoint에 접근하면 HP가 모두 회복되고 Boss Portal이 열린다.
4. Boss의 기본공격은 `↓` Guard, 붉은 heavy는 이동+`↓` Roll, 청록 recovery는 공격 가능한 punish window로 표시된다. Punish 밖 공격은 Boss가 막으므로 체력보다 frame·위치 해법이 전투를 소유한다.
5. Boss 격파 뒤 황금 결정에 접근하면 120 Gold를 한 번만 받고 shortcut Portal이 열린다. Portal로 학원촌에 돌아오면 완료 목표가 표시되고 장비를 바꿔 loop를 반복할 수 있다.
6. Boss에서 쓰러지면 활성 checkpoint로 Room authority와 Player 위치가 함께 돌아오며 Boss는 fresh encounter로 다시 시작한다.

## Baseline → current best

- **Baseline:** 학원촌↔훈련장 M2 왕복만 존재했고 Field, Dungeon, checkpoint, Boss, reward와 shortcut 상태가 없었다.
- **첫 candidate:** 네 M3 Room과 전체 Portal graph, 공용 encounter profile, 진행 상태, checkpoint·보상 patch와 HUD를 연결했다.
- **가장 큰 품질 병목:** Field 적이 입장 즉시 추적해 시간이 지나면 우회 Portal이 실제 선택이 아니게 됐다. Field profile에 210 World unit 감지 거리를 두어 플레이어가 전투 구역에 들어오기 전에는 대기하도록 고쳤다.
- **Current best:** 우회는 안전하지만 수호 수액이 없고, 정면 조우는 Boss 준비 HP를 높인다. Boss는 punish 밖 공격을 막는 대신 90 HP로 2~3회 성공적인 punish route 안에서 끝나도록 첫 milestone 반복 시간을 제한했다.

## Reference 채택

- **직접 재사용:** Polygon의 `FixedStepRunner`, `MapRuntime`, replaceable `RoomNode`, M1 `TrainingEncounterNode.step(frame)`과 `CombatEvent` 계약.
- **Polygon에 맞게 수정:** Ball Fight Simulator의 normal/Boss spec이 같은 combat caller를 쓰는 책임 분리, Baeseongjin의 checkpoint·progression single-writer와 telegraph→active→recovery 상태 원칙.
- **원칙만 차용:** fixed `dt`와 one-shot input의 DOM 없는 검증, gameplay event에서 read-only presentation DTO로 흐르는 방향.
- **비채택:** 랜덤 floor/run economy, 대형 HuntingManager, multiplayer authority, Boss state-pool hierarchy, Reference의 명칭·맵·asset·balance 수치.

## 검증

- `npm run check`: ESLint / Prettier 통과
- `git diff --check`: 통과
- 일회성 DOM 없는 120Hz 진단: 정면/우회 두 경로, Field 감지 gate, checkpoint 이전 Boss Portal 잠금, checkpoint 회복·부활, Boss 격파, 보상 1회, shortcut 활성과 학원촌 귀환 통과
- 공용 encounter 진단: basic Guard 무피해, heavy Guard 피해, heavy Roll evade, punish 밖 Boss guard, recovery Punish, 완료 Signal 1회 통과
- 실제 Canvas/mobile pointer 경로: 학원촌→Field 우회→Dungeon→checkpoint→Boss Room 진입, basic/heavy/punish 상태 변화, checkpoint KO 복귀를 public controls로 확인
- 실제 Canvas current best: Field 입장 후 4.2초 대기해도 감시 골렘이 원위치를 지키고 HP 100 유지, 초록 Portal 우회 성공, Boss 이름과 `HP 90/90` 표시 확인
- `900×600` resize: 고정 `360×203 logical` 유지, browser warning/error 없음
- 독립 verifier: 14개 changed/untracked path의 ownership, 정면/우회·checkpoint·Boss·보상 1회·shortcut 전체 경로, 공용 encounter 판정, Room 교체 후 4개 Signal connection, RenderFrame read-only digest를 재검증했고 actionable finding이 없었다.
- reward·shortcut의 격파 이후 최종 상태는 같은 production module을 사용한 120Hz 결정적 전체 경로로 확인했다.
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.

## 품질 판정

| 축                   | 수준 | 근거                                                                               |
| -------------------- | ---- | ---------------------------------------------------------------------------------- |
| 기능 완결성          | 2    | 준비→Field 선택→Dungeon→checkpoint→Boss→보상→shortcut 귀환 상태가 한 경로로 연결   |
| 조작 명료성          | 2    | Portal/우회/checkpoint와 Guard·Roll·Punish 성공 조건을 HUD와 telegraph로 구분      |
| 타격감·Effect        | 2    | M1 contact/event/camera feedback을 유지하고 heavy 붉은 aura·punish 청록 aura 추가  |
| Graphics·시각 일관성 | 2    | Room별 silhouette·Portal 색·checkpoint/reward 대비와 동일 RenderFrame 경계 유지    |
| Reference 정합       | 2    | 기존 Room/encounter convention 우선, progression single writer와 data profile 적용 |
| 회귀 안전성          | 2    | 결정적 경로·전투 진단, check/diff, 실제 Canvas/mobile/resize/console 검증          |

적용 품질 축에 0 또는 1이 없으며 별도 사람 판단 질문 없이 메인 반영 준비가 가능하다.

## 문서 상태와 남은 위험

- work-item task에서 발견한 `docs/runtime-architecture.md`와 `docs/world-map-system.md`의 M3 설명 누락은 standalone coordinator가 main 통합 기록과 함께 실제 Scene/Signal·progress/trigger/Room 계약으로 정합했다. 남은 `STALE` 상태는 없다.
- `CONFLICT`, `ORPHANED`, `UNVERIFIED`: 발견하지 않았다.
- Browser 자동 입력은 key hold 사이에 실제 시간이 계속 흐르므로 Boss 격파 후 보상/귀환까지 한 번에 캡처하지 못했다. 해당 완료 순서는 production module의 120Hz 결정적 경로로 검증했고, Canvas에서는 Boss 진입·패턴·checkpoint 재도전까지 확인했다.
