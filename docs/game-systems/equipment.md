# 장비 시스템

## 개요

장비는 위험 지역 수거·복구 작업에 사용하는 전투 + 현장 작업 통합 장비다. 주인공의 대표 장비는 현장 절단검과 방호판이지만 게임 시스템 자체는 검 전용이 아니다.

> 검은 시스템이 아니다. 검은 장비 시스템의 첫 번째 구현이다.

제품 경험은 [공식 게임 위키](../../PRODUCT_GOAL.html#equipment-system)가 소유하고, 아래 저작·저장 계약은 [ARCHITECTURE](../../ARCHITECTURE.md)의 장비 계약을 구체화한다. 클래스별 사용 설명서가 아니라 이후 장비를 추가할 때 따를 시스템 명세다.

## 세계관상의 위치

고물상인은 전직 현장 수거·복구반이다. 같은 기본 교육을 받은 두 견습생 중 주인공은 현장 안전 확보·위험 기계 제압, 라이벌은 탐색·측량·선점·회수를 맡는다. 현장검 + 방패와 갈고리 + 측량 장비는 이 역할의 차이다. 기사 장비나 무관한 판타지 마법검으로 바꾸지 않는다. 장비걸이·공구·수리 흔적·첫 의뢰의 실제 행동으로 보여 주며 직업을 설명하는 장문 대사를 추가하지 않는다.

## 기본 Command Grammar

Move / Jump / Roll / Basic / Strong / Guard를 유지한다. Stamina, Startup/Active/Recovery, Just Guard, Basic 전용 Guard Counter, damaging-hit-confirm cancel, Strong guard break, startup interrupt, posture, invulnerability와 공중 combo를 보존한다. 장비 변경은 같은 입력으로 다른 현장 장비를 사용하는 것이다. 방패를 해제하면 방패 Guard/Just Guard/Counter는 사용할 수 없다. 별도 맨손 방어 기술을 발명하지 않는다.

## 장비 시스템 계층

Equipment Family → Moveset → Equipment Item → Loadout → Modification / Enchantment.

| 계층                       | 소유하는 판단                                                                     |
| -------------------------- | --------------------------------------------------------------------------------- |
| Family                     | 슬롯, 손 사용, 전투 역할, 호환 Family, 현장 기능, enchant 가능 여부               |
| Moveset                    | 장비 조합의 command·timing·stamina·공격/방어 profile·animation profile            |
| Item                       | 실제 획득·장착 대상. Family, visual/material, 수치 modifier, 출처, 제작/성장 정보 |
| Loadout                    | 현재 슬롯별 Item 선택. 소유와 호환을 검증                                         |
| Resolved Loadout           | 한 번 합성한 전투·표현·field·세트/특수 시너지 결과                                |
| Modification / Enchantment | 지역 재료와 Item별 성장. 동작 코드의 복제본이 아님                                |

Item은 Basic/Strong 실행 코드를 소유하지 않는다. Combat Core는 concrete Item ID를 모르며 command/moveset/timing/attack/guard/geometry/contact만 받는다.

### 슬롯과 Hand Usage

최신 Human Feedback의 6슬롯이 이전 Main/Off/Utility 3슬롯 예시를 대체한다.

| 사용자 명칭 | 저장 key        | 초기 Family  | 기본 장착             |
| ----------- | --------------- | ------------ | --------------------- |
| 주무기      | weaponItemId    | field-cutter | field-cutter-balanced |
| 방패        | shieldItemId    | field-shield | field-shield-standard |
| 투구        | helmetItemId    | helmet       | null                  |
| 몸통        | bodyArmorItemId | body-armor   | null                  |
| 신발        | bootsItemId     | boots        | null                  |
| 도구        | toolItemId      | tool         | null                  |

주무기는 필수이며 나머지는 null 가능하다. 손 사용은 oneHand/twoHand/none(착용 방어구·도구)이다. twoHand + 방패는 기본 거부하고 명시된 Family 호환 예외만 허용한다. 새 조합을 검+방패 ID if문으로 검증하지 않는다. 현재 실제 Two-Hand 무기를 추가하지 않는다.

## 초기 장비

Field Cutter + Field Shield로 시작한다. 기존 5 variant의 시간·피해·reach·hitstun·launch·posture·방어·guard·geometry modifier와 구매/제작 비용은 그대로 이전한다. 기본 방패와 새 최소 방어구 Item의 단독 modifier는 중립값이다. 기존 신체 작업복은 기본 복장이며 방어구 슬롯의 전투 효과와 구분한다.

| 이전 v10 ID           | 현재 Item ID          |
| --------------------- | --------------------- |
| balanced-sword        | field-cutter-balanced |
| heavy-sword           | field-cutter-heavy    |
| swift-chain-sword     | field-cutter-swift    |
| posture-breaker-sword | field-cutter-breaker  |
| rear-punish-sword     | field-cutter-reach    |

초기 방어구는 작업모·작업 덧옷·작업화의 최소 연결 Item만 둔다. 기존 그림을 기술 placeholder로 사용하며 새 기사풍 디자인을 승인하지 않는다. 초기 소유 목록에 포함하되 자동 장착하지 않아 기존 기본 전투 결과를 보존한다. 도구 Family/슬롯은 동작하지만 최종 도구 콘텐츠 목록이나 전투 중 quick swap을 이번에 추가하지 않는다.

## 미래 장비군

Breaker(충격/파쇄/높은 posture), Pole(긴 reach/견제/밀기·당기기), Two-Hand Heavy(큰 공격/방패 제약), Utility(갈고리/측량/현장 작업)를 받을 수 있는 Family 계약을 둔다. 실제 플레이 콘텐츠·최종 개수는 미정이다.

## 전투 연결

현재 production Field 연결은 기존 방패 충격 방어의 pressure-block assist evaluator다. Guard 결과와 같은 RenderFrame에 도움 여부를 노출하며 새로운 사건이나 필수 gate를 추가하지 않는다.

cutter-shield-standard는 Basic/Strong/Air Basic/Guard/Just Guard/Counter와 기존 stamina/timing/cancel을 참조한다. 방패 없는 Cutter는 동일 공격 grammar에서 방패 command만 비활성인 moveset으로 resolve한다. Item modifier는 scales를 곱하고 명시된 command modifier만 적용한다. 공통 Combat Skill의 ground/air combo, air actions, loop cancel, damage progression은 장비와 독립이다.

## 공격 판정

Visible Weapon Sweep이 적 Semantic Hurt Region에 닿고, 같은 접촉이 Gameplay Attack Envelope 안일 때만 hit다. 범위 안이어도 그림이 닿지 않으면 MISS, 그림이 닿아도 최대 범위 밖이면 MISS다. 이전/현재 무기 contour와 trail은 같은 authored geometry에서 파생한다. Item reach와 graphics 길이를 각 caller가 따로 해석하지 않는다.

## Field Capability

| Family         | 기능                                              |
| -------------- | ------------------------------------------------- |
| field-cutter   | cable-cut, light-plate-cut, light-machine-disable |
| field-shield   | debris-guard, pressure-block, brace               |
| 미래 Breaker   | heavy-joint-break, cracked-structure-break        |
| 미래 Pole/Hook | pull, retrieve, distant-operate                   |

필드 요청은 capabilityId와 mode(assist/require)를 사용한다. evaluator는 available/allowed/assisted와 이유를 반환한다. assist가 없으면 원래 상호작용을 유지하고, require는 명시된 author 요청에만 적용한다. 이번 캠페인에 새 mandatory require gate를 만들지 않는다. 기존 가장 이른 안전/기계정지/지지 흐름을 연결하며 적합한 사건이 없으면 production evaluator + scene fixture + review 표시로 검증한다.

## Field Capability와 진행

장비를 던전 열쇠로 남발하지 않는다. 현재 목적은 현장 작업 장비라는 것을 플레이로 보여 주는 것이다. 우회·속도·보너스·안전 해결·선택 경로 확장은 가능하나 신규 필수 gating은 미정이다.

## Animation 연결

Moveset → Animation Profile → 공유 일반 rig clip과 authored key pose다. Item마다 전체 animation을 복제하지 않는다. 중요한 동작의 reference authority, 부분/whole-body 교체, body retarget/선택 Contact IK, gameplay 거리 root warp 계약은 [시스템 공급 계약](../system-runtime.md)을 따른다.

## Graphics 연결

원본은 의미 있는 부위 그룹을 가진 구조화 SVG다. 무기는 grip anchor/pivot/blade visual/contact geometry/material/local depth, 방패는 grip anchor/guard surface/visual surface/material을 공급한다. embedded PNG나 자동 trace는 authority가 아니다. 최종 SVG 미공급 상태에서는 기존 placeholder와 동일한 visible/contact geometry를 재사용한다. 모든 실제 Item은 review catalog에 등록하고 Slot/Family/Set/특수 시너지 관련 여부/Capability/Visual/Geometry를 읽는다. 미발견 특수 시너지의 정답 조건은 플레이어 UI에 유출하지 않는다.

## 성장

Family → Item 획득 → 지역 소재/Modification → 특성 변화. 상점·대장간·제작·강화·인챈트·퀘스트/보스 보상의 레오곡 baseline을 따른다. 기존 비용/재료/선택/보상은 보존한다. 초기 enchant는 Cutter만 지원하며 Shield/Armor enchant를 자동 허용하지 않는다.

### 세트 시너지

동일 setId의 서로 다른 장착 조각 수로 평가한다. 조건과 효과는 처음부터 공개한다. 최소 field-work-set(작업모/덧옷/작업화)만 연결한다. 초기 작은 연결 규칙은 2부위 Guard 부담 2% 감소, 3부위 받는 피해 2% 감소다. 기존 기본 Loadout에는 방어구를 자동 장착하지 않으므로 기존 결과를 바꾸지 않는다. 다수 세트/지역 세트 목록은 만들지 않는다.

### 특수 시너지와 발견

세트 수와 별도인 authored 교차조합 catalog다. 자동 조합 생성·텍스트 정답 힌트는 금지한다. 최소 연결 규칙은 중량 Cutter + 기본 방패 + 작업화의 ‘지지 반격’: Just Guard 뒤 Basic 반격의 posture 피해 15% 증가다. 일반 Basic/Strong 피해·timing을 바꾸지 않는다. 효과는 ID 분기 대신 guardCounterPostureScale hook으로 합성한다. 이 초기 소규모 효과는 구현 판단으로 명시한 조정 가능한 수치이며 Human이 최종 balance를 승인했다는 뜻이 아니다.

관련 Item을 한 번도 소유하지 않았으면 숨기고, 관련 장비 보유 이력이 있으면 이름/조건/효과 없이 ???만 노출한다. 실제 올바른 장착 시 발견되어 이름·정확한 조건·효과가 영구 공개된다. 장비를 해제/처분하거나 저장 후 다시 열어도 발견은 보존한다. Set 보너스는 이 발견 규칙을 쓰지 않는다.

## UI

장비 상세는 이름, Family, Slot, Hand Usage, Moveset, Basic/Strong/Guard 방식, Reach/Stamina/Posture 성격, Field Capability를 보여 준다. 6슬롯 장착 상태와 해제 가능 여부를 분명히 한다. 상점의 구매·제작은 기존 NPC 대화 경로를 유지하고, 소유 장비 장착과 도감은 장비 화면에서 제공한다. 미발견 특별조합은 ??? 이외 힌트를 생성하지 않는다. 도구는 독립 장착/상세를 지원하며 future quick-select는 별도 입력 설계로 남긴다.

## 스토리 연결

작업장에 Cutter/Shield/Hook/Heavy Tool을 같은 생활 장비로 배치한다. 주인공·라이벌·고물상인의 기존 행동과 도구로 역할을 보여 준다. 이름·성별·과거 사건이나 새로운 설명 대사는 임의 추가하지 않는다.

## 저장 및 마이그레이션

schema v11은 gold/trainingMarks/combatSkillLevel/viewedConversationIds/scrapCampaign을 그대로 보존하고 ownedEquipmentItemIds, loadout 6슬롯, everOwnedEquipmentItemIds, discoveredSpecialSynergyIds, equipmentForge, enchantment.equipmentEnchantments를 저장한다.

v10→v11은 저장 decoding 경계의 단일 명시 migration이다. LEGACY_EQUIPMENT_ID_ALIASES는 이 경계와 migration test에서만 쓰고 runtime core의 Item authority로 남기지 않는다. owned/equipped ID와 forge selectedProfileIdsByGroup을 새 ID로 변환하고 equipped는 weaponItemId, 기본 방패는 자동 소유·장착, 기본 작업 방어구 3개는 소유에 추가하고 나머지 슬롯은 null이다. weaponForge→equipmentForge, selectedProfileIdsByGroup→selectedItemIdsByGroup, swordEnchantments→equipmentEnchantments로 이동한다. 기존 element/level/재료/선택·캠페인·대화·경제를 보존한다. ever-owned는 보존된 소유 목록으로 시작하고 발견 목록은 기존에 없으므로 빈 목록이다. v11 재읽기는 같은 결과다.

Malformed v10을 기본값으로 세탁하거나 덮어쓰지 않는다. 이전 저장을 먼저 엄격 검증하고 변환 후 새 schema/Item/소유/호환/forge/enchant를 다시 검증한다. main save와 recovery slot에 같은 migration을 사용하며 쓰기 실패 시 원본을 유지한다. v10 외 더 오래된 캠페인 호환 문제를 이번에 추정 복원하지 않는다.

## 확정

- 수거·복구 직업 역할과 기본 Field Cutter + Field Shield.
- 6슬롯 Family/Moveset/Item/Loadout, 공통 command grammar.
- 전투·현장 기능·그래픽·애니메이션·성장·UI의 단일 resolve 경로.
- 공개 Set 조건과 authored Special Synergy 발견/영구 도감의 분리.
- 기존 v10 저장 보존과 기본 전투 결과 회귀 금지.

## 아직 미정

출시 무기군 개수, Breaker/Pole 실제 콘텐츠, 실시간 전투 무기 교체, 장비별/장비군별 skill tree, 강제 Field gating, Shield/Armor enchant, 최종 세트·특수 시너지 수, 모든 도구 종류. 이 문서는 해당 콘텐츠를 새로 확정하지 않는다.

## 구현 경계와 검증

EquipmentFamilyProfiles / EquipmentMovesetProfiles / EquipmentItemProfiles / EquipmentLoadout / EquipmentFieldCapabilities / EquipmentSetProfiles / SpecialSynergyProfiles / EquipmentSynergy를 equipment 모듈에 둔다. resolveEquipmentLoadout(loadout, catalog)는 immutable 결과를 반환한다. catalog는 families/movesets/items/sets/specialSynergies와 getItem/getFamily/getMoveset을 제공한다. resolved 결과는 mainItem/offHandItem/utilityItem, mainFamily/offHandFamily, moveset, combatTiming, attackModifiers/defenseModifiers/guardModifiers, geometryProfile, animationProfile, fieldCapabilities, activeSetBonuses/activeSpecialSynergies, commandModifiers를 제공한다. Armor Item은 resolved 결과의 itemsBySlot에서도 접근한다.

검증은 schema/catalog/호환/두손 fixture, modifier parity, 실제 damage/guard/counter, field scene, 5ID migration과 recovery, malformed 거부, 세트·발견·저장, 모든 Item의 graphics/UI, 기존 전체 검사와 실제 PC/mobile gameplay를 포함한다. npm run verify는 전체 완료 흐름에 새 검사도 포함한다. 문서만 또는 catalog만 만든 상태는 완료가 아니다.
