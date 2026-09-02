# Human Feedback Inbox

아직 해석하지 않은 제품 feedback만 이 queue에 둔다. 구현 Task, Execution Goal, backlog와 완료 이력을 기록하지 않는다.

## Pending

### 모바일 설치 앱 화면 배율 불일치

모바일에서 앱으로 깔고 실행시 화면배율 안맞는다

### 전투 이동과 화면 전환의 끊김 제거

1. 모든 몹은 실제 몸체 충돌 판정을 가져야 하며 평상시 이동으로 적을 그대로 관통해 지나가면 안 된다. 다만 일반적인 적은 구르기의 유효 구간 동안 몸체 충돌을 통과해 상대 뒤로 넘어갈 수 있어야 하고, 적의 높이와 점프 궤적이 허용하면 점프로도 넘어갈 수 있어야 한다.
2. 유저가 피격될 때 머리 위에 나타나는 이펙트는 의미를 알 수 없으므로 제거한다. 피격 여부는 접촉점, 몸의 반응, 히트스톱, 방향성 흔들림과 캐릭터에 붙는 짧은 피격 표현으로 읽혀야 한다.
3. 일반 점프 뒤 땅에 닿을 때마다 플레이어가 멈추는 동작은 의도한 적이 없으므로 제거한다. 정상 착지는 이동 입력과 수평 흐름을 끊지 않고 바로 이어져야 한다.
4. Room·Chunk·건물·도로 등 화면 전환에서 입력이 끊기거나 프레임이 멈춰 렉처럼 느껴지면 안 된다. 전환 전부터 누르고 있던 이동 입력이 전환 뒤에도 자연스럽게 이어지고, 키보드와 모바일 모두 같은 감각을 가져야 한다.

#### 충돌과 회피 기준

- 살아 있는 일반 적, 인간형, 동원 기계, 엘리트와 보스는 각자의 실제 실루엣과 체급에 맞는 body collider를 가진다. Player가 걷기 입력만으로 collider 반대편에 순간 이동하거나 서로 겹친 상태로 남지 않는다.
- 일반 적을 향한 구르기는 authored active/무적 구간에만 body collision을 통과하고, 종료 시 적 뒤의 비어 있는 안전 위치에 복원된다. 벽·낭떠러지·다른 적 안으로 밀어 넣지 않으며 공간이 없으면 통과 결과를 만들지 않는다.
- 대형 적, 엘리트, 보스와 환경 일체형은 크기와 외형상 통과가 자연스러운 경우에만 별도 authored 규칙을 가진다. 일반 적의 roll-through 규칙을 모든 체급에 자동 적용하지 않는다.
- 점프는 별도 투명화가 아니라 실제 발·몸체 궤적이 적 collider 위를 넘었을 때 통과한다. 머리나 공격 부위에 부딪히면 그 접촉 결과가 유지된다.
- 적과 Player가 spawn, knockback 또는 map transition으로 겹치면 결정적인 최소 분리 방향으로 해소하고 떨림·왕복 밀림·벽 끼임을 만들지 않는다.

#### 피격과 착지 표현

- 머리 위에 떠 있는 의미 불명의 피격/무적 표식을 제거한다. 상태 피드백은 캐릭터 몸, 접촉점과 실제 자세 변화에 붙이며 이전 그래픽 품질 feedback의 절제된 순간 임팩트 규칙을 따른다.
- 일반 착지는 별도 landing recovery, 강제 idle, 수평 속도 초기화나 입력 무시를 발생시키지 않는다. 달리면서 점프했다면 같은 방향 이동이 착지 frame부터 이어진다.
- 착지 순간 새로운 jump·guard·roll·Basic·Strong 입력이 들어오면 기존 command buffer와 cancel 규칙 안에서 처리하고 보이지 않는 정지 시간을 추가하지 않는다.
- 명시적으로 설계된 피격 knockdown이나 특수한 높은 낙하가 나중에 필요하더라도 일반 점프 착지와 같은 상태를 공유해 매번 정지시키지 않는다.

#### 화면 전환 입력 연속성

- 전환 presentation 동안 source Room authority와 목적지 원자 교체는 유지하되 Input Adapter의 현재 held 상태와 monotonic command sequence를 임의 초기화하지 않는다.
- 상호작용키로 전환을 시작한 같은 입력이 목적지에서 점프·대화로 중복 실행되지는 않아야 하지만, 전환 전에 누르고 있던 좌우 이동은 목적지 첫 gameplay fixed-step부터 이어져야 한다.
- 전환 중 불필요한 동기 asset 작업, 전체 progression 재생성, 중복 listener 등록과 큰 layout 재계산으로 fixed-step이 끊기지 않게 한다. 로딩이 실제로 필요한 경우에는 입력을 잃은 것처럼 위장하지 말고 명시적인 transition 상태를 사용한다.
- keyboard, touch pointer hold, pointer cancel, 화면 회전과 standalone PWA 환경에서 같은 입력 연속성을 검증한다.

#### 확인 기준

- 일반 걷기, 적에게 밀기와 양쪽 동시 이동에서 Player와 적이 서로 관통하지 않는 deterministic collision fixture를 둔다.
- 일반 적 roll-through 성공, 공간 부족·벽·다른 적 때문에 실패, 점프 궤적으로 넘기, 대형/보스 비통과를 각각 검사한다.
- 연속 달리기 → jump → landing 후 위치·수평 속도·입력 수락이 끊기지 않고 의도하지 않은 landing recovery가 0인지 확인한다.
- 피격 전후 실제 viewport에서 머리 위 불명확한 이펙트가 사라지고 접촉점과 몸체 반응만으로 피격·가드·무적을 구분할 수 있는지 확인한다.
- 좌우 이동을 누른 채 exterior↔interior, Room↔Chunk와 장거리 도로 전환을 반복하고 목적지 첫 fixed-step의 held input, position continuity, 중복 command 0건과 눈에 띄는 hitch가 없는지 desktop/mobile에서 검증한다.

### 프레임 authored 본 포즈 애니메이션으로 동작 품질 개선

1. 구를 때 캐릭터 전체를 단순히 회전시키지 말고 별도의 구르기 모션을 만든다. bitmap sprite animation으로 교체하는 것은 아니며 현재 본 시스템으로 각 프레임의 자세를 직접 정의하고 순서대로 재생해 스프라이트 애니메이션처럼 명확한 pose 변화가 보이게 한다.
2. 기타 어색한 애니메이션도 같은 방식으로 개선한다. 순수 수치·수식 기반 본 애니메이션은 보조 움직임처럼 적절한 곳에만 사용하고, 일반적인 주요 행동은 authored frame 방식으로 만든다. 단순히 몸이나 검을 위아래로 흔드는 조잡한 동작을 완료 결과로 두지 않는다.

#### 애니메이션 구조

- Polygon/Vector 캐릭터와 본 계층은 유지한다. 새 action clip은 시간순 pose frame 목록을 소유하고 각 frame이 root, 몸통, 머리, 팔·다리, 장비와 무기의 local transform을 명시한다.
- 각 pose frame은 고정 duration과 다음 frame으로 넘어갈 때의 authored transition 방식(`hold`, 제한적 interpolation, 빠른 snap 등)을 가진다. 모든 본에 하나의 전역 sine/ease 수식을 적용해 동작을 생성하지 않는다.
- gameplay command owner가 startup·active·recovery, stamina, cancel과 hit 판정을 계속 소유한다. Animation clip은 같은 authored timeline의 현재 phase를 투영할 뿐 combat timing을 임의로 바꾸지 않는다.
- 무기 접촉 frame, 회피 무적 frame, body collision 통과 frame과 발이 지면에 닿는 frame은 clip의 안정된 ID로 gameplay timeline과 대응해 화면 pose와 실제 판정이 어긋나지 않게 한다.
- 캐릭터·장비 variant는 같은 clip을 공유할 수 있지만 신체 비율, 무기 길이와 장비 landmark가 달라 silhouette가 무너지면 variant별 pose 보정을 authored data로 제공한다.

#### 구르기 clip

- 구르기는 준비 자세에서 무게중심을 낮추고, 어깨와 머리를 말아 넣고, 팔과 검을 몸에 붙인 뒤, 다리가 지면을 차고 몸이 회전하며, 반대발로 풀려나오는 연속 pose를 가진다.
- 캐릭터 전체 polygon group을 중심점 기준으로 일정 각도 회전시키는 표현을 사용하지 않는다. 몸통·골반·머리·팔다리의 상대 위치가 frame마다 달라 실제 사람이 구르는 silhouette가 보여야 한다.
- roll-through body collision, 회피 active 구간과 종료 위치는 앞선 전투 이동 feedback의 규칙을 따르며 시각 frame과 판정 frame이 일치해야 한다.
- 구르기 종료 pose는 입력 방향과 현재 이동 흐름으로 자연스럽게 연결되고 강제 idle이나 별도 멈춤을 만들지 않는다.

#### 주요 action clip

- Basic·Strong·launcher·shield counter는 각각 준비, 힘 축적, 접촉, follow-through와 회수 pose를 직접 authored한다. 같은 팔을 위아래로 이동하거나 검 각도만 왕복해 서로 다른 공격으로 보이게 하지 않는다.
- guard, just guard, 피격, guard break, jump, fall, landing, NPC 작업과 적 공격도 실제 사용자 화면에서 어색함이 확인되면 frame-authored clip으로 전환한다.
- hitstop 동안 contact pose를 유지하고 재생 재개 뒤 follow-through로 이어진다. 화면 흔들림이나 파티클로 불완전한 본 동작을 가리지 않는다.
- idle 호흡, 천·가방·머리카락의 작은 지연, 조준 보정, 경사면 발 위치와 미세한 반동처럼 연속 수치가 자연스러운 보조 요소에는 procedural animation을 사용할 수 있다. 이는 주요 pose를 대체하지 않고 위에 제한적으로 합성한다.

#### 제작·재사용과 확인 기준

- 먼저 실제 Player의 idle/run/jump/landing/roll/Basic/Strong/guard/hit 핵심 clip 세트를 목표 품질로 완성하고 같은 authoring 구조를 NPC, 인간형 적과 비인간 관절형 몹에 재사용한다.
- 각 clip의 frame contact sheet 또는 pose strip을 생성해 frame별 실루엣, 발 지지, 무기 궤적과 장비 관통을 비교할 수 있게 한다.
- 실제 게임 속도와 viewport에서 재생해 동작이 pose 사이에서 떨리거나 관절이 뒤집히고, 몸체·무기가 순간 이동하거나 공격 판정과 접촉 pose가 어긋나는지 확인한다.
- 구르기 시작/중간/종료, 각 공격의 startup/contact/follow-through, 피격·가드·착지 frame을 stable Visual QA 상태로 직접 시작하고 desktop/mobile PNG와 실제 연속 재생을 모두 확인한다.
- reduced-motion은 카메라 흔들림과 과한 보조 motion을 줄일 수 있지만 action을 이해하는 핵심 pose frame을 삭제하지 않는다.
- 본 frame authoring을 사용했다는 사실만으로 완료하지 않는다. 현재 그래픽 Quality 선언에 맞는 무게중심, 타격 방향, silhouette와 실제 조작 감각이 독립 검증되어야 한다.

### 3D 스켈레톤 좌표를 2D 컷아웃으로 투영

고정 측면 시점에서 몸통과 캐릭터 전체를 화면 평면의 회전값으로 돌리면 종이 인형이 기울어지는 것처럼 부자연스럽다. 본 정의와 authored pose frame은 3D 좌표계를 사용하고, 실제 게임 렌더링은 이를 고정 측면 카메라로 2D에 투영해 기존 Canvas polygon/cutout으로 그리는 구조로 한다.

#### 범위

- 3D 캐릭터 모델, mesh, vertex skinning, texture/UV, perspective camera, WebGL과 Three.js 같은 외부 3D library는 도입하지 않는다.
- 3D로 계산하는 것은 skeleton joint의 위치·부모 관계·local rotation과 frame pose뿐이다. 외형은 투영된 관절 사이에 기존 2D polygon, capsule, head shape와 장비 shape를 생성해 표현한다.
- gameplay world, 이동, 중력, 지형, body collider, hitbox/hurtbox와 카메라는 계속 2D다. 표현용 `z`가 충돌 폭, 이동 가능 축이나 공격 범위를 암묵적으로 바꾸지 않는다.

#### 최소 스켈레톤과 투영

- Skeleton은 최소한 root, pelvis, chest, neck, head와 가까운/먼 쪽 shoulder·elbow·hand, hip·knee·foot joint를 가진다.
- 각 authored frame은 joint 또는 bone의 local 3D transform을 소유하며 부모 transform을 결합한 world pose를 만든다.
- 고정 측면 직교 카메라는 3D joint를 screen x/y와 depth로 투영한다. screen x/y는 기존 renderer 좌표가 되고 depth는 가까운/먼 본과 장비의 draw order를 결정한다.
- 팔·다리는 투영된 두 관절을 잇는 2D limb polygon으로, 머리는 head joint의 기존 shape로, 검·방패·가방은 해당 hand/chest joint의 2D attachment로 그린다.
- 몸통은 별도 3D 모델을 만들지 않고 투영된 가까운/먼 어깨와 골반 anchor를 연결한 단순 2D polygon으로 만든다. chest가 비틀리면 네 anchor의 투영 위치와 depth order가 달라져 측면→약한 3/4 silhouette가 자연스럽게 나타나야 한다.

#### 회전과 frame authoring

- 화면 평면 회전은 앞으로 숙이기, 뒤로 젖히기와 구르기 root 진행처럼 실제 side-view에서 보이는 제한된 기울기에만 사용한다.
- 몸통 비틀기, 가까운/먼 팔 교차와 어깨·골반 counter rotation은 3D skeleton pose로 authored한다. 전역 `torsoRotation` 숫자 하나로 전체 polygon을 돌려 대체하지 않는다.
- side view의 가까운/먼 사지 layer가 pose 중 교차할 때 depth sort가 안정적으로 바뀌고 한 frame에서 앞뒤가 떨리면 안 된다. 같은 depth에서는 stable authored tie-break order를 사용한다.
- 기존 frame-authored clip의 hold/snap/제한적 interpolation 규칙을 유지한다. 3D skeleton은 좋은 pose를 자동 생성하는 절차가 아니라 사람이 정의한 frame을 일관되게 투영하는 기반이다.

#### 재사용과 확인 기준

- Player 핵심 clip에서 skeleton과 projection을 먼저 검증하고, 신체 비율과 attachment profile만 바꿔 NPC·작업인형·실제 인간 적에 재사용한다. 비인간 몹은 필요한 joint graph를 별도 authored할 수 있지만 같은 transform/projection 계약을 사용한다.
- side, 약한 3/4, 공격 contact와 roll 중간 frame에서 shoulder·hip·hand·foot의 3D 좌표, projected 2D 위치와 depth order를 fixture로 고정한다.
- 기존 2D collider와 3D presentation skeleton을 나란히 확인해 몸통 비틀기나 구르기 중에도 화면 pose와 gameplay 판정이 허용 범위를 벗어나지 않는지 검증한다.
- 실제 viewport의 frame strip과 연속 재생에서 몸통이 납작하게 기울어지거나 가까운 팔이 갑자기 먼 팔 뒤로 튀고, torso polygon이 뒤집히거나 장비가 몸을 관통하면 실패다.
- 외부 3D dependency 없이 현재 static ESM·Canvas 2D production boundary와 PWA offline asset 계약을 유지한다.

### 기본 스켈레톤 동작은 인터넷 모션 레퍼런스 우선 사용

idle, walk, run, jump, fall, landing, roll, guard와 피격처럼 일반적인 인체 동작은 처음부터 감으로 직접 만들기보다 인터넷에서 적절한 모션 레퍼런스나 재사용 가능한 motion data가 있는지 먼저 조사하고 이를 현재 3D skeleton frame pose로 가져와 사용하는 방향으로 한다.

#### Reference-first 원칙

- 기본 action clip을 새로 만들기 전에 실제 인체 동작 영상, 연속 이미지, 공개 motion capture와 skeleton animation 자료를 검색한다. 검증된 공통 동작을 이유 없이 다시 발명하지 않는다.
- 실제 BVH·FBX·glTF 등의 motion data를 가져올 때는 public domain, CC0 또는 프로젝트가 재배포·수정할 수 있는 명확한 permissive license를 우선한다. 출처·license·원본 URL·가져온 날짜와 수정 내용을 clip metadata 또는 project reference 문서에 남긴다.
- 상용 게임·영화·애니메이션 영상과 라이선스가 불분명한 자료는 pose, 무게중심, timing과 silhouette를 관찰하는 시각 레퍼런스로만 사용한다. 원본 asset이나 추출 데이터를 그대로 저장·배포하지 않는다.
- 적절한 재사용 자료가 없어서 직접 authoring하는 경우에도 어떤 레퍼런스를 조사했고 왜 그대로 사용할 수 없었는지 짧은 근거를 남긴다.

#### 현재 스켈레톤으로 변환

- 외부 motion은 runtime에서 직접 의존하지 않고 development-time importer 또는 명시적 변환 단계로 현재 프로젝트의 3D skeleton joint 이름과 frame pose JSON/data로 변환해 repository에 보존한다.
- source skeleton의 joint를 root·pelvis·chest·head·near/far arm·leg에 명시적으로 mapping하고, 신체 비율·축 방향·단위·root motion과 frame rate를 정규화한다.
- 원본의 모든 frame을 그대로 유지하는 것이 목적이 아니다. 측면 액션 게임에서 읽히는 준비·접촉·follow-through key pose를 추출하고 불필요한 noise와 미세 motion을 줄인 뒤 앞서 정한 hold/snap/제한적 interpolation clip으로 재구성한다.
- 외부 모션의 timing이 gameplay startup·active·recovery를 바꾸지 않는다. command owner의 authored timing에 맞춰 pose frame을 retarget하며 접촉·회피·착지 frame ID를 실제 판정과 다시 대응한다.
- roll과 공격은 Player의 검·방패·가방, 얇은 비율과 고정 side-view projection에 맞게 손·어깨·골반·발 위치를 추가 보정한다. reference를 가져왔다는 이유로 장비 관통이나 읽히지 않는 3/4 pose를 허용하지 않는다.

#### 재사용과 오프라인 경계

- 정규화된 기본 human motion library는 Player에서 먼저 검증한 뒤 비율과 attachment 보정으로 NPC, 작업인형과 실제 인간 적이 공유한다. 각 캐릭터가 같은 raw 수식을 따로 구현하지 않는다.
- 비인간 skeleton은 체형이 유사한 동물·기계 motion reference를 별도로 조사하고, 인간 motion을 무리하게 retarget하지 않는다.
- 게임 runtime과 설치 PWA는 외부 URL에서 motion을 내려받지 않는다. 검증·변환된 local clip만 사용하고 필요한 asset은 offline cache inventory에 포함한다.

#### 확인 기준

- 각 기본 clip은 사용한 reference, license 상태, skeleton mapping과 핵심 수정 내용을 추적할 수 있어야 한다.
- source reference의 주요 pose와 최종 2D projected frame strip을 나란히 비교해 무게중심, 발 지지, 관절 순서와 이동 방향이 보존되는지 확인한다.
- 실제 게임 속도에서 reference motion을 그대로 느리게 재생하거나 frame 수만 늘린 결과가 아니라, 현재 전투 timing과 side-view silhouette에 맞게 재구성됐는지 독립 검증한다.
- license와 source를 확인할 수 없는 외부 animation data가 production source나 PWA cache에 포함되면 실패다.

## Feedback Guide

실제 제품을 사용하며 느낀 문제, 기대한 결과와 관찰한 상황을 가능한 한 원문에 가깝게 적는다.

- 좋은 예: `Dungeon이 한 화면 통로처럼 보여서 탐험하는 느낌이 없어.`
- 좋은 예: `공격이 막힌 건지 무적인 건지 화면에서 구분하기 어려워.`
- 좋은 예: `모바일에서 현재 목표가 안 보여서 어디로 가야 할지 모르겠어.`
- 피할 예: `MapManager class를 만들어.`
- 피할 예: `특정 Agent에게 구현 Task를 배정해.`
