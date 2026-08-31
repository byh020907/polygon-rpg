# Region · Room · Portal World Map System

이 문서는 Polygon RPG의 월드 계층, active Room snapshot, Portal 전환과 동적 상태 패치 계약을 소유한다.

## 월드 계층

```text
World Map
└─ Region
   └─ Room / Chunk
      ├─ Gameplay Surface
      ├─ Entity / Trigger
      ├─ Render Item
      └─ Portal → 다른 Room의 Spawn
```

- `Region`은 생활권 또는 biome 단위다.
- `Room / Chunk`는 최소 gameplay·collision·entity·render snapshot 단위다.
- `Portal`은 문, 계단, 골목과 출구를 다른 Room의 spawn에 연결한다.
- 하나의 `MapRuntime`만 active Region/Room, spawn과 pending Portal transition을 쓴다.
- 자유로운 gameplay Z축과 Depth Lane은 사용하지 않는다.

Room은 region world space의 독립 bounds를 가지며 gameplay surface, entity와 render item은 Room 로컬 좌표로 authoring한다. `MapRuntime`이 resolved snapshot을 만들 때 world 좌표로 변환한다.

## Active Room Snapshot

`MapRuntime.getResolvedSnapshot()`은 한 fixed-step에서 서로 일치하는 다음 read model을 제공한다.

- active `regionId` / `roomId`
- active spawn
- active Room gameplay surface와 movement/camera bounds
- active Room entity·trigger
- 현재 사용 가능한 Portal
- renderer용 정렬된 render item
- pending Portal transition이 있을 때 source/destination Room의 presentation item

Destination Room render item은 camera travel 연결감을 위해 transition 중 표시할 수 있지만 destination collision, trigger와 entity는 완료 전에 active snapshot에 들어오지 않는다.

## Portal 입력과 전환

- Portal 범위 안에서 `↑` command sequence edge를 사용한다.
- Portal 범위 밖의 `↑`는 Jump로 남는다.
- `↓` Guard/crouch와 이동 + `↓` Roll은 Portal이 선점하지 않는다.
- 공중, Roll, active combat motion, hit/block stun 또는 기존 transition 중에는 새 Portal을 시작하지 않는다.
- transition 중 새 이동·Jump·combat command는 적용하지 않지만 held/sequence를 계속 소비해 도착 후 재생되지 않게 한다.
- 전환 duration은 양수이며 M2 Portal은 `0.32s`를 사용한다.

```text
beginPortalTransition(portalId) direct command
→ source Room authority 유지
→ player/camera presentation travel
→ duration에 도달한 fixed-step
→ active Room + spawn + collision + entity snapshot 원자 교체
→ old Room Scene exit/dispose, fresh Room Scene attach
→ roomChanged completion Signal
```

GameScene의 Player와 camera presentation state는 Room Scene 교체 밖에 존재한다. Room Scene은 자신의 entity subtree를 소유하며, 완료 fixed-step에 old Room이 제거된 뒤 새 Room을 attach한다.

## Camera Travel / Follow

- fixed-step의 camera position은 GameScene이 소유한다.
- Portal transition은 source camera anchor에서 destination anchor로 짧고 빠른 smooth travel을 진행한다.
- 도착 후 camera는 active Room bounds 안에서 Player를 delta-time 기반으로 follow한다.
- RenderFrame은 보간된 camera position과 combat offset을 결합한 읽기 전용 DTO만 제공한다.
- Polygon/Retro renderer는 Portal이나 Room을 해석하지 않고 같은 camera DTO를 투영한다.

## Gameplay Surface와 Render 분리

Gameplay surface는 충돌·이동을 위한 단순 geometry다. Render geometry의 풀, 돌, 건물, 전경과 장식은 gameplay collider를 자동 생성하지 않는다. Renderer는 resolved map snapshot과 RenderFrame을 읽기만 하며 map state, collision, entity AI 또는 effect lifetime을 변경하지 않는다.

### Portal presentation

- Portal의 gameplay anchor·interaction radius·spawn은 presentation geometry와 분리한다.
- 보이는 Portal은 공통 차원문 ring이 아니라 현재 Room의 재료와 silhouette를 따르는 문·뿌리 arch·석문·결정 틈으로 표현한다.
- 약 `32×45` World unit인 플레이어를 기준으로 내부 개구부는 폭 `21~26`, 높이 `43~45`, 외곽 문틀은 폭 `44~49`, 높이 `52~54`를 사용한다. 환경 장식이 문틀 밖으로 커져도 개구부는 이 사람 크기 기준을 유지한다.
- 외곽선은 Room 재료의 어두운 색으로 연결하고 경로 accent는 내부 개구부에만 얇게 사용한다. 내부 면은 Room의 어두운 공간색을 유지해 Polygon/Retro 모두에서 실제 문으로 읽히게 한다.
- Map definition은 stable `<id>-outer`·`<id>-inner` render item을 소유하고 상태 patch는 기존 ID를 그대로 켜고 끈다. Renderer는 style이나 Portal 의미를 해석하지 않는다.

## 월드 상태 패치

하나의 base map에 시간·날씨·story·quest·local event 패치를 결정적으로 적용한다.

```text
Resolved Map = Base + Time/Weather + World/Region Story + Quest + Local Event
```

패치는 stable object ID를 대상으로 `set-enabled`, `set-active-portal`, `set`, `override`만 사용한다. 같은 우선순위에서 같은 target/property를 두 번 쓰면 validator 오류다. 패치 적용 후에도 필수 Portal과 도달 경로가 남아야 한다.

## M2 기반

- `academy-region/academy-plaza`: 장비 선택과 훈련장 입구가 있는 생활 Room
- `academy-region/training-room`: M1 `TrainingEncounter` Scene을 소유하는 독립 전투 Room
- `academy-training-portal`: 두 Room의 spawn을 양방향으로 연결
- active Room만 collision/entity 판정에 참여
- 장비 선택 → Portal 진입 → M1 전투 → Portal 귀환을 debug 조작 없이 반복

## M3 Field · Dungeon · Boss 확장

- `field-crossing`과 `field-canopy`는 일반 조우 보상 또는 전투 우회를 선택하는 두 Field 경로다.
- `sealed-forest-dungeon`은 checkpoint trigger를 소유하며 활성화 전에는 Boss Portal이 꺼져 있다.
- `sealed-forest-boss`는 M1과 같은 encounter 계약의 boss profile, 보상 trigger와 귀환 shortcut Portal을 소유한다.
- `FirstJourneyProgress`가 route, checkpoint, boss 격파, 1회 보상과 귀환 상태를 쓰고 `MapRuntime`은 그 snapshot을 stable-ID patch로 해석한다.
- checkpoint patch는 Boss Portal을, boss 격파 patch는 보상 trigger를, 보상 획득 patch는 shortcut Portal을 순서대로 활성화한다.
- 일반 적과 Boss Room의 `combat-enemy`는 같은 Room-owned encounter Scene lifecycle을 사용하며, renderer는 resolved snapshot과 RenderFrame만 읽는다.

## Reference Adoption

- Godot: persistent Player와 교체 가능한 Room subtree 분리, parent-owned lifecycle, direct command와 completed Signal 분리를 Polygon RPG에 맞게 수정 채택
- Baeseongjin: frozen input sequence, pure camera target·delta smoothing, authority snapshot 후 presentation 갱신 원칙만 채택
- [Unravel 환경 설계](https://www.ea.com/games/unravel/news/unravel-game-environments): location마다 다른 환경 이야기를 갖게 하는 원칙을 Portal의 biome별 재료·silhouette에 차용
- [Far Cry 5 환경 탐색 설계](https://news.ubisoft.com/en-us/article/16TjVZmAtD85EWcvHtxHXL/far-cry-5-creating-curiosity-in-a-familiar-world): 실제 세계에서 이미 아는 길·출입구 언어로 이동 방향을 유도하는 원칙을 차용
- [Hollow Knight 공식 환경 화면](https://www.hollowknight.com/): 각 지역의 고유하고 어두운 환경 detail과 강한 개구부 silhouette 원칙만 차용
- [UK Approved Document M 출입문 치수](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/506503/BR_PDF_AD_M1_2015_with_2016_amendments_V3.pdf): 사람 대비 문 폭·높이 비례만 참고하고 건축 규격 자체는 gameplay에 적용하지 않음
- 비채택: Godot API/Resource 복제, autoload/global bus, Baeseongjin manager·Quadtree·authority 계층, Depth Lane visual scale transition
