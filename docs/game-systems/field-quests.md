# 의뢰와 한 달의 현장 운영

제품 경험은 [공식 위키](../../PRODUCT_GOAL.html#wiki-quests), 기술 경계는 [Architecture](../../ARCHITECTURE.md)가 소유한다. 기존 주요 사건·5지역·전투·6슬롯을 보존한다.

## 규칙

- 주요/연결은 기존 campaign issueWindow의 읽기 모델이다. 일반 칸을 차지하지 않고 일일 만료가 없다.
- 일반은 offered/accepted/completed/failed/expired 상태와 최대 4개의 살아 있는 슬롯을 가진다. 완료 칸은 오늘 아직 발급하지 않은 적격 profile로 보충한다. 같은 의뢰의 무한 재발급은 없다.
- day=floor(elapsedSegments/4)+1, phase=elapsedSegments%4. PC 시간·offline 경과·랜덤을 사용하지 않는다. profile ID 정렬과 day offset으로 순서를 고정한다.
- 미수락은 다음 아침에 expired, 수락 시 absolute segment deadline을 고정한다. deadline에 도달하면 event보다 먼저 실패를 판정한다. accepted carry-over도 4칸에 포함한다.
- 만료/실패는 이유를 알리고 기록한다. routine 실패는 world patch가 없고 중요한 의뢰만 성공/방치 fact를 쓴다.
- 실제 수락 뒤 field action 또는 해당 occurrence의 encounter completion만 objective를 충족한다. 어제의 clearedEncounterIds로 오늘 의뢰를 완료하지 않는다.
- 수락·보고·지급·메뉴는 무료다. 지정 현장 작업만 시작 전 1구간 비용을 확인하고 Campaign 시간 writer를 사용한다. 일반 전투/탐색은 무료다.
- completion과 reward claim은 한 progression 결과로 commit한다. 같은 instance 재실행/로드는 중복 지급하지 않는다.

## 최초 플레이 구간

차고 공개 후 폐광/항구 게시판을 이용한다. 도입 주요 의뢰는 처음부터 기존 진행을 보여 준다. 기존 장소/사람/소품/수거 유닛을 재사용하며 새 인물 과거사나 핵심 사건을 만들지 않는다.

| Profile                 | 기존 장소/기반                                  | 실제 작은 현장 사건                     |
| ----------------------- | ----------------------------------------------- | --------------------------------------- |
| mine-lamp-check         | abandoned-mine-roadhead / mine-gate-lantern     | 작업등 접속 점검, Gold/steel            |
| mine-rail-brace         | abandoned-mine-rescue-tunnel / floor-rail·brace | 지지대 확인, brace 선택 도움            |
| harbor-lamp-service     | harbor-shipyard-roadhead / gate-lamp            | 중요 1회 정비, 기한, 정비/임시조명 결과 |
| harbor-workline-clear   | occupied-drydock / keel-rail·chain              | 작업선 정리, cable-cut 또는 수동 대안   |
| mine-night-workline     | mine roadhead 작업등                            | 밤에 수락 회차 전용 수거 유닛 제압      |
| harbor-night-inspection | harbor roadhead 작업등                          | 밤 하역 신호 확인                       |

두 진입부 게시판 옆의 작은 휴식 지점에서는 기존 REST와 같은 1구간/완전 회복을 명시 확인한다. 밤 의뢰를 기다리기 위한 무의미한 왕복을 강제하지 않는다. 소비품이나 별도 회복 경제를 추가하지 않는다.

최초 소규모 제작 데이터이며 최종 전체 의뢰 목록 승인이 아니다. 터널/건선거 접근 사실을 availability에 반영한다. 주요 구조/선박 수리 상태를 일반 의뢰가 덮어쓰지 않는다.

광산 진입부 판금 틈/케이블 끝에 숨은 회수 하나를 둔다. 기본 cable-cut으로 처리하는 선택 경로이며 주요 길은 그대로 열린다. 최초 Gold/steel과 재사용 작업등을 지급하고 obtained fact로 중복 방지한다. 발견 전 총량/보상 위치를 메뉴에 나열하지 않는다.

## Quest 경계

QuestProfiles는 저작 데이터·최소 validator, QuestState는 결정적 전이, QuestReadModel은 주요/연결/일반 DTO, QuestWorldProfiles는 현장 배치·밤 조우·결과 patch·후일담 해설을 소유한다.

snapshot: {version:1,lastElapsedSegments,slots,records,issuedByDay,worldFacts,explorationIds}. record는 profileId/instanceId/issuedDay/status/acceptedAt/deadline/completedAt/outcome을 명시한다. 기록 상한 512와 ID/시간/상태 유효성을 검사한다.

API: createQuestState(elapsedSegments=0), assertQuestState(state), reconcileQuests(state,context,catalog), acceptQuest(state,instanceId,context,catalog), applyQuestEvent(state,event,context,catalog). context는 elapsedSegments/day/phaseId, campaign facts, 접근 지역/방과 field capability를 제공한다. 결과는 {changed,state,rewards,notifications}. Quest는 Gold를 직접 쓰지 않는다. occurrence/source를 검증하며 UI가 전투 성공을 직접 만들지 않는다.

worldOutcome은 명시된 target 상태·그림·짧은 NPC 반응만 바꾼다. night variant는 특정 조우에만 적용하며 활성 전투를 단순 시간 표시 변경으로 재생성하지 않는다. 후일담은 중요한 worldFacts만 지역/NPC 조각으로 투영하고 main final availability는 그대로 둔다.

## 재료·보상·성장

재료는 logical materialId→quantity 장부다. 기존 enchant/forge ID는 기존 owner가 단독 소유하고 새 일반 salvaged-steel만 progression.materials에 둔다. MaterialLedger API가 통합해 읽고 올바른 owner에 지급/소비한다. 같은 ID의 이중 저장/지급은 거부한다. 가방/무게/stack split은 없다.

RewardTransactions는 claimId와 bundle(Gold/materials/Training Mark/equipmentItemIds)을 원자 적용한다. rewardClaims가 중복을 막는다. 실제 변화에서 만든 acquisition DTO가 이름·수량·슬롯·특성을 담는다. 일반 묶음, 장비, 최초 특수 발견, 의뢰 완료, 핵심 부품을 구별한다. UI/VFX 수명은 보상 truth와 분리한다.

equipmentUpgrades[id]=level(0..3)은 Item ID/Set/특수 조합을 보존한다. 첫 단계는 가능하고 회수 부품 2/4개에서 상한 2/3을 연다. 초기 비용은 Gold 40×다음 단계, steel 3×다음 단계. 주무기는 단계당 피해 ×1.08, 방호/방어구는 대응 방어 반응 ×0.97. reach/timing/command는 유지하며 기본 level0 결과는 바꾸지 않는다. 도구는 재사용이며 내구도/탄약이 없다.

## Migration

v12는 엄격 검증한 v11에 quests/materials/rewardClaims/equipmentUpgrades를 초기값으로 추가한다. v10은 기존 10→11 뒤 11→12로 잇는다. main/recovery 공통 decoder를 사용하고 기존 경제/장비/조합/forge/enchant/날짜/대화/campaign을 보존한다. unknown/corrupt를 거부하며 load만으로 원본을 덮어쓰지 않는다.

rivalProgressSegments/rivalDelaySegments 저장 key는 유지하되 고대 병기 이동이라는 의미와 ancientMachine read model을 명확히 한다. 라이벌 견습생 자동 선점 AI를 만들지 않는다.

## 검증

주요/연결 유지, 4칸 결정적 보충, 미수락 만료/수락 실패·기한 경계, 중복 보상/로드, routine 무patch, 중요 성공/방치/후일담, 네 시간대/night 조우, soft path·메인 비봉쇄, 재료 owner·강화·KO 자원 보존과 v10/v11→12를 검사한다. 실제 PC/mobile에서 게시판→수락→현장 입력→보상→시간→월드 결과를 검수한다.
