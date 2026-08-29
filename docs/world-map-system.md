# World Map System

이 문서는 Polygon RPG의 전체 월드 구성, 생활 영역·필드·던전 구분, 청크·깊이 레인과 동적 상태 패치 계약을 소유한다. 현재 구현은 이 장기 구성을 한 번에 완성하지 않고, 학원촌의 작은 수직 단위에서 시작해 같은 계약 안에서 확장한다.

## 제품 방향

월드는 중앙의 대마력핵에서 네 방향으로 뻗은 마력맥을 중심으로 구성한다. 각 마력맥은 서로 다른 기후와 생활권을 만들며, 주요 던전의 마력 닻은 세계의 마력 순환을 조절한다.

```text
                         북부 빙설권
                  산악촌 ─ 설원 ─ 빙하동굴
                          │
서부 생장권         중앙 학원권          동부 열곡권
숲 ─ 밀림 ─── 학원촌 ─ 마법학교 ─── 협곡 ─ 광산촌 ─ 화산
                          │
                         남부 해양권
                  해변 ─ 항구도시 ─ 난파선 ─ 바닷속 유적
                          │
                       제0 연구소
                          │
                      세계 대마력핵
```

전체 구성을 유지하되 실제 콘텐츠는 다음 순서의 수직 단위로 확장한다.

1. 학원촌의 한 청크와 세 깊이 레인
2. 폐쇄 실습림과 첫 던전
3. 항구·광산·산악 생활권 중 하나
4. 주요 권역과 던전 추가
5. 제0 연구소와 대마력핵

## 공간 유형

### 생활 영역

- 전투를 기본적으로 허용하지 않는다.
- 각 깊이 레인의 gameplay surface는 대부분 평평하다.
- 상점, 훈련, 지도 이동과 주요 NPC를 도착 지점 가까이에 둔다.
- 앞·중간·뒤 레인을 지정된 골목, 계단과 문으로만 전환한다.
- 낮·밤과 스토리 상태에 따라 NPC, 조명과 대사가 달라진다.
- 필수 서비스는 시간대 때문에 사용할 수 없게 만들지 않는다.

### 필드

- 생활 영역과 던전을 물리적으로 연결하는 탐험 공간이다.
- 여러 출구, 우회로와 능력 기반 지름길을 제공한다.
- 낮·밤, 날씨와 지역 상태에 따라 적, 비밀길과 장식이 달라진다.
- 발견한 거점으로 지도 이동할 수 있고 일반 조우는 피할 수 있다.

### 던전

- 명확한 입구, 독립 지도, 대표 기믹, 체크포인트와 보스를 가진다.
- 내부 이동은 제한하지만 입구와 체크포인트에서 안전하게 나갈 수 있다.
- 클리어 후 생활 거점 또는 필드로 돌아가는 영구 숏컷을 연다.
- 같은 지형을 반복하기보다 권역의 마력 닻과 하나의 대표 환경 변화를 중심으로 설계한다.

## 월드 계층

```text
World
└─ Region
   └─ Chunk
      ├─ Depth Lane
      │  ├─ Gameplay Surface
      │  ├─ Entity / Trigger
      │  └─ Render Item
      └─ Lane / Chunk Connection
```

- `Region`: 생활권 또는 바이옴 단위다.
- `Chunk`: 로드, 상태 해석과 검증의 최소 단위다. 초기에는 한 번에 하나의 작은 청크만 사용하고 이후 active + adjacent 청크로 확장한다.
- `Depth Lane`: 자유로운 Z 이동이 아니라 별도의 횡스크롤 평면이다.
- `Connection`: 계단, 골목, 문, 승강기처럼 지정된 위치에서 lane 또는 chunk를 전환한다.

플레이어의 점프 높이 `y`와 공간 깊이 `laneId`를 같은 값으로 표현하지 않는다. 충돌과 상호작용은 active lane만 사용하며, 인접 lane은 읽기 전용 presentation으로 함께 보일 수 있다.

## Gameplay Surface와 Render 분리

Gameplay surface는 충돌과 이동을 위한 단순한 선분 중심 데이터다.

- 수평 지면
- 완만한 경사
- 수직 벽과 천장
- 한 방향 발판
- 움직이는 발판 또는 문을 위한 dynamic surface

Render geometry는 surface와 material을 기반으로 생성하되 별도 DTO로 유지한다. 풀, 돌, 울퉁불퉁한 절벽과 전경은 gameplay collision을 만들지 않는다. 특별한 랜드마크만 render override를 작성한다.

Renderer는 resolved map snapshot과 RenderFrame을 읽기만 하며 map state, collision 또는 effect lifetime을 변경하지 않는다.

## 깊이 레인 전환

- 연결점 근처에서만 앞·뒤 레인 전환을 허용한다.
- 초기 입력은 기존 `↑/↓`를 문맥적으로 사용한다. 연결점에서만 전환이 점프·방어보다 우선하며, 그 밖의 위치에서는 기존 전투 동작을 보존한다.
- 공중, 공격 motion 또는 전환 중에는 새 전환을 시작하지 않는다.
- Connection은 양수인 `transition.durationSeconds`를 가지며 생략 시 `0.28`초를 기본값으로 사용한다.
- `beginTransition()`은 pending transition을 만들되 active lane과 collision은 source lane에 유지한다.
- `advanceTransition(deltaSeconds)`가 fixed-step마다 elapsed/progress를 갱신하고 `GameScene`은 player 위치, lane visual scale과 render order를 보간한다.
- 전환 중 이동·점프·전투 command와 새 lane 전환을 차단하되 input edge와 sequence는 소비한다.
- Duration에 도달한 fixed-step에서 active lane, spawn과 collision snapshot을 destination으로 원자 교체한다. Renderer는 보간된 RenderFrame만 읽는다.
- lane 교체와 dynamic collision 변경은 render 중 수행하지 않는다.

## 월드 상태와 패치

하나의 base map에 작은 조건 패치를 조합한다. 낮맵과 밤맵을 별도 복제하지 않는다.

```text
Resolved Map
= Base
+ Time / Weather
+ World Story
+ Region Story
+ Quest
+ Local Event
```

조건은 `all`, `any`, `not`과 다음 fact를 조합할 수 있다.

- 시간대와 날씨
- story / quest flag
- 보유 능력과 아이템
- NPC 상태
- 지역 오염도·경계도
- local event와 고정 seed

패치는 안정된 object ID를 대상으로 `set-enabled`, `set-active-connection`, `set`, `override` 연산만 수행한다. 앞의 두 연산은 `enabled`를 기록하고, `set`은 지정 property를 교체하며, `override`는 지정 필드를 shallow merge한다. 같은 우선순위에서 같은 target/property를 두 번 기록하면 값의 동일 여부와 무관하게 validator 오류로 처리한다.

콘텐츠에서는 시스템의 모든 조합을 사용하려 하지 않는다. 한 지역은 base, 낮/밤, 대표 날씨 1~~2개, 주요 story phase 2~~3개와 특별 event 1개 정도를 기준으로 한다.

## 동적 충돌 안전

- 기본 지형은 낮·밤만으로 변경하지 않는다.
- 문, 다리, 수문과 움직이는 발판은 dynamic surface 또는 entity로 분리한다.
- 상태 변경은 fixed-step 경계에서 원자적으로 적용한다.
- 플레이어와 겹치는 위치에 새 collider를 활성화하지 않는다.
- 위험한 지형 변경은 청크 재진입, 컷신 또는 명시적인 안전 위치에서만 적용한다.
- 패치 후 필수 portal과 도달 경로가 남는지 검증한다.

## 시간과 편의성

- 시간은 필드에서 천천히 흐르며 지도 이동과 휴식으로 원하는 시간대로 넘길 수 있다.
- 메인 스토리와 필수 기능은 시간 때문에 영구적으로 놓치지 않는다.
- 생활 영역의 주요 서비스는 낮·밤 모두 접근 가능하다.
- 발견한 거점은 비용 없이 지도 이동할 수 있다.
- 통과하지 못한 능력 gate와 열린 숏컷은 월드맵에 기록한다.

## 첫 수직 단위

첫 구현은 전체 권역을 축소하지 않고 다음 한 조각으로 계약을 검증한다.

- 학원촌 청크 1개와 격리된 전투 실험 청크 1개
- 앞쪽 광장, 중간 주택가, 뒤쪽 언덕의 평평한 세 lane
- 지정된 연결점 두 종류
- 낮·밤 presentation variant
- 동일 RenderFrame을 소비하는 Polygon / Retro Renderer
- active lane만 사용하는 surface와 spawn

전투 입력 검증을 위해 학원촌 중앙광장 왼쪽에는 `dungeon-portal` connection을 둔다. `↑`로 진입하는 `combat-test-dungeon/training-floor`는 독립 chunk이며 HP, Light/Heavy/Anti-air 패턴, guard/evade/hitstun, launch physics, progressive gravity, 6-hit juggle limit과 자동 복구를 가진 combat mob 한 개를 제공한다. 이 방은 combo와 presentation 검증용이고 정식 던전의 보스·체크포인트·보상 계약을 대신하지 않는다.

이 수직 단위가 안정된 뒤 chunk streaming, editor JSON loader, condition validator, 지도 이동과 정식 던전을 같은 공개 계약 안에서 추가한다.
