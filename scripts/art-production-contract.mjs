// Current Human-confirmed production contract. This is editorial input for derived handoff pages.
export const APPROVAL_CANDIDATE_COUNT = 3;
export const APPROVAL_WORKFLOW_ROWS = [
  ['후보 제시', '같은 검토 조건에서 시각적으로 의미가 다른 3안을 한 번에 나란히 제시'],
  ['차이 설명', '실루엣·비율·구도·동작·재질 중 선택 결과를 바꾸는 핵심 차이를 각 안에 명시'],
  [
    'Human 선택',
    'Human이 고른 한 안만 다음 master SVG·Composition·authored pose 제작 기준으로 기록',
  ],
  [
    '후속 검증',
    '선택, 원본 제작, export 검사, runtime 적용과 gameplay-scale 검증을 별도 상태로 유지',
  ],
];
export const ART_DIRECTION_ROWS = [
  [
    '기준 스타일',
    '실제 게임에서 재현 가능한 정돈된 레오곡 계열 Flat Design. 고밀도 컨셉 일러스트를 목표로 하지 않습니다. 밝은 자연광·sky value·더 밝은 원경과 낮은 detail 밀도를 기본으로 합니다. 작은 캐릭터와 넓은 세계, 안정된 실루엣, 단순하고 명확한 vector/polygon, 작은 머리와 긴 가는 팔다리, 큰 면의 3~4단계 셀 명암. 특정 작품의 캐릭터 복제나 러프하고 삐뚤빼뚤한 손그림은 지양합니다.',
  ],
  [
    '생활형 산업 세계',
    '밝은 생활형 산업 왕국이며 낮은 채도를 칙칙함으로 해석하지 않습니다. 사람들이 오래된 설비를 고쳐 쓰며 생업을 이어갑니다. 낡음=멸망, 고철=쓰레기, 기계=디스토피아가 아닙니다. 옛 군수 규격은 생활 기계에 남은 잠금·인장·접속 방식입니다.',
  ],
  [
    '화면과 전투',
    'PC gameplay의 인간형 약 18~22%를 유지하고 모바일에서도 세계/스케일을 우선합니다. 일반 전투 자동 줌인 대신 silhouette·외곽선·배경 대비·telegraph·weapon trail·VFX로 읽힙니다. Boss 등 특별 연출만 framing 예외입니다.',
  ],
  [
    '배치',
    '주요 길·상호작용은 clean read, detail은 cluster, negative space는 의도적으로 남깁니다. 장식이 인물·공격 실루엣을 덮지 않게 합니다. 지역은 색뿐 아니라 구조·생활 설비·형태도 구별됩니다.',
  ],
  [
    '원본과 승인',
    '새 기본 원본은 의미 있는 부위/면/anchor를 가진 *.master.svg입니다. reference sheet는 예쁜 컨셉 한 장보다 실제 제작과 key pose의 기준입니다. 계약 확정, reference 승인, 현재 등록, runtime 검증을 구분합니다. 기존 PNG는 보관·보조 출력이며 SVG 승인의 증거가 아닙니다.',
  ],
  [
    '조명·그림자',
    '작가는 면 경계·재질·구조적 가림을 정의하고 엔진은 현재 광원에서 밝기를 계산합니다. 완성된 고정 그림자를 bake하지 않습니다. 작은 객체 contact / 큰 구조물 actual cast / 작은 장식 none을 구분합니다.',
  ],
  [
    '주인공',
    '약 7등신·짧은 작업복·cross strap·넓은 검/방패·낮은 준비를 유지합니다. 골반/흉곽 선행 후 팔이 따르는 횡/사선 베기와 CONTACT 뒤 감속, 실제 forward somersault를 기준으로 합니다.',
  ],
  [
    '기존 이야기 보존',
    '구조를 위해 제어핵을 떼고 재난을 수습하는 이야기, 자유 순서의 다섯 지역과 두 로봇의 역할은 유지합니다. 고대 병기는 사무적인 낡은 방송·과장된 조립/수거 행동으로 위협과 웃음을 함께 보이며 신체 공포물이 아닙니다.',
  ],
];
export const REGIONAL_IDENTITY = {
  'abandoned-mine': [
    '갈색 / 황토 / 경고 황색',
    '암갈색 철판·분진·암반·레일',
    '레일·지지대·보행식 굴착기를 생활 기반시설로 읽힙니다.',
  ],
  'harbor-shipyard': [
    '청회색 / 청록 / 녹슨 적색',
    '도장강·선체·굵은 케이블·물·안개',
    '크레인·도크·케이블은 생업 설비이며 염분 마모와 인양 구조가 특징입니다.',
  ],
  'greenhouse-plains': [
    '황동 / 탁한 녹색 / 수증기 백색',
    '유리·배관·밸브·재배 구조물',
    '배관·동력로는 농업 설비입니다. 응축수·녹청·압력 하드웨어로 지역화합니다.',
  ],
  'snow-trade-road': [
    '백청 / 남청 / 열선 주황',
    '눈·철도·장갑판·열선 리벳',
    '제설 열차와 신호/열선은 교역로를 유지하는 설비입니다.',
  ],
  'red-quarry': [
    '적철 / 짙은 갈색 / 먼지 베이지',
    '붉은 암반·절단날·중량 철판',
    '암반 절단기는 거대한 작업 도구이며 절개면과 중량 구조가 특징입니다.',
  ],
};
export const ENVIRONMENT_ROWS = [
  [
    'Unique Landmark',
    '지역을 기억하게 하는 고유 대형 자산',
    '굴착기·쌍둥이 크레인·지열 동력로·제설 열차·암반 절단기. 다른 Composition에서도 world identity는 하나입니다.',
  ],
  [
    'Prefab',
    '작가가 보기 좋게 조합한 중간 크기 자산',
    'workshop·cargo stack·pipe wall·scrap corner·dock stairs·small house·catwalk. 주요 화면의 승인된 조합 출발점입니다.',
  ],
  [
    'Kit',
    '정말 반복할 작은 요소',
    'crate·barrel·lamp·ladder·railing·sign·pipe straight/elbow·chain·small scrap. Kit만으로 Codex가 주요 화면을 임의 설계하지 않습니다.',
  ],
  [
    'Composition',
    '승인된 장면 전체 배치 데이터',
    '시각적 목적·랜드마크·사건 단위이며 화면 2개 같은 길이로 고정하지 않습니다. additive/overlap 연결과 preload/unload를 고려합니다.',
  ],
];
export const SVG_ROWS = [
  [
    'Field Cutter',
    '현장 절단검은 작업용 넓은 절단 장비입니다. 판타지 기사검 장식을 지양하고 작업강·수리 흔적·grip anchor/pivot·보이는 접촉 geometry를 공급합니다.',
  ],
  [
    'Field Shield',
    '현장 방호판은 낙하 잔해·기계 충격·Guard·압력/지지 장비입니다. 기사 방패 문장을 지양하며 grip anchor·guard surface·visual surface·재질을 분리합니다.',
  ],
  [
    '고물상 장비',
    'Cutter·Shield·Hook·Heavy Tool이 같은 작업장에 자연스럽게 존재합니다. 장비 설명 대사 대신 장비걸이·공구 취급·현장 행동으로 역할을 읽힙니다.',
  ],
  [
    '좋은 원본',
    '실제 vector polygon/path, 의미 있는 <g>와 part 이름, joint/pivot/anchor, 필요한 local depth. PNG embed·수천 자동 trace path·이름 없는 flat path·전체 merge는 기본 원본으로 받지 않습니다.',
  ],
  [
    'Master + export',
    '*.master.svg 하나에 common structure, far shape, mid shape, near detail, joint/pivot, state anchor를 둡니다. *.far.svg / *.mid.svg / *.near.svg는 export 결과이며 세 원본을 따로 수정하지 않습니다.',
  ],
  [
    'LOD 형태',
    'far에서는 붐을 굵게·집게를 크게·케이블을 줄이는 실루엣 보정을 허용합니다. mid는 주요 케이블/유압 구조, near는 실제 비율·접속부·세부 케이블과 interaction입니다.',
  ],
  [
    '그룹과 좌표',
    '부위별 이름/관절/피벗/anchor를 부위 분해표와 맞춥니다. SVG 저작 viewBox는 importer가 부모축 [-1,1] 로컬 데이터와 별도 크기 ratio로 연결합니다. SVG 좌표를 world XYZ로 그대로 복사하지 않습니다.',
  ],
  [
    '기계 local z',
    '기계 구조에 맞는 이름을 씁니다. 예: crane/rearSupport z:+3, body z:0, hook z:-1, frontCable z:-2. 이는 부위의 시각 깊이 예시이며 draw order를 위한 가짜 z의 예가 아닙니다.',
  ],
  [
    '면 정보',
    'torso front/side/underside, crane boom front/side 등 형태적으로 중요한 면을 직접 나눕니다. 필요시 data-normal / data-material / data-occlusion으로 방향·재질·구조적 가림을 전달합니다. 현재 광원에 따른 최종 밝기는 엔진 책임입니다.',
  ],
  [
    '재질',
    'painted steel / raw steel / brass / cloth / skin / stone / dirt / glass의 diffuse/specular 반응을 구분합니다. 표면에 완성 그림자를 bake하는 대신 면과 재질을 전달합니다.',
  ],
  [
    '현재 상태',
    'master SVG compiler·LOD export·검토실 업로드·실제 게임 연결을 기술 자산으로 검증합니다. 최종 그림 승인은 별도입니다. 공급 가능한 subset과 연결 API는 docs/system-runtime.md에 명시합니다. 기존 JS polygon과 보관 PNG는 교체 전 구현/참고 자료입니다.',
  ],
];
export const SHADOW_ROWS = [
  [
    'contact',
    'player / NPC / enemy / crate / barrel',
    '작은 객체가 바닥에 닿는 위치와 떠 있는 정도를 읽힙니다.',
  ],
  [
    'actual cast',
    'building / giant crane / giant machine / large bridge / large pipe / ancient machine',
    '큰 구조물이 현재 광원에서 투영하는 그림자. visual polygon과 1:1이 아닌 단순한 큰 실루엣 occluder를 별도 제공할 수 있습니다.',
  ],
  [
    'none',
    'cable / rivet / small scrap / thin sign detail / distant decoration',
    '작은 장식마다 그림자를 생성하지 않습니다.',
  ],
];
export const CHARACTER_ROWS = [
  [
    '장비 슬롯 외형',
    '투구=머리/얼굴 주변, 몸통=상체/작업복, 신발=발/종아리, 주무기/방패/도구=실제 부착 영역만 교체합니다. 기본 Body Profile과 다른 슬롯을 유지합니다. 장비는 보여야 하지만 캐릭터를 삼키지 않습니다.',
  ],
  [
    '시간대와 작은 결과',
    '아침/낮/저녁/밤의 하늘·면·작업등을 구별하되 지역 전체 이중 제작은 하지 않습니다. 중요한 부가 의뢰만 정비/임시 작업 상태와 짧은 주민 반응을 제작합니다. 방치는 폐허나 파멸이 아닙니다.',
  ],
  [
    'Rig Family + Body Profile',
    '공유하는 것은 bone naming·hierarchy·animation grammar입니다. 인물별 head/shoulder/hip 크기, arm/leg 길이, torso/limb SVG와 stance는 다릅니다. 같은 관절 언어이지 같은 몸이 아닙니다.',
  ],
  [
    'Family 구분',
    'Humanoid: protagonist/rival/owner/worker/human raider. 기계는 Biped Machine / Quadruped Machine / Multi-leg / Flying / Tracked Heavy 등 실제 구조별 family입니다. humanoid 팔다리 길이만 바꿔 기계로 만들지 않습니다.',
  ],
  [
    '일반 동작',
    'idle / walk / run / jump / 단순 NPC 동작은 Rig/FK + reusable clip으로 제작합니다. 중요한 액션과 동일한 방법 하나로 강제하지 않습니다.',
  ],
  [
    '중요 액션',
    'Basic / Strong / Air Attack / Roll / Guard Counter / Boss Telegraph / Boss Heavy Attack은 승인된 authored key pose가 기준입니다. READY / WINDUP / CONTACT / FOLLOW / RECOVER를 실제 gameplay scale로 제시합니다.',
  ],
  [
    'Pose 교체 범위',
    '기존 rig 위에서 필요한 torso/arm/forearm/weapon 등의 pose별 SVG 부분 교체가 기본입니다. forward roll / extreme smear / 전신 squash·compression은 whole-body authored SVG를 허용합니다. 각 교체 pose에도 joint/prop/contact anchor를 둡니다.',
  ],
  [
    'Retarget',
    'Shared Clip → Character Body Profile retarget → character modifier → 필요한 순간 Contact IK → 중요 액션 authored override. 같은 좌표를 모든 인물에게 복사하지 않습니다.',
  ],
  [
    'Contact IK',
    '발 접지·작업대를 짚는 손·양손 장비·방패 위치·prop interaction에 필요한 구간만 표시합니다. 일반 run/walk까지 상시 고정해 뻣뻣하게 만들지 않습니다.',
  ],
  [
    'Root curve',
    'Art는 자연스러운 root movement curve를, Gameplay는 rollDistance / attackAdvance / bossChargeDistance를 정합니다. Engine이 곡선을 허용 거리 안으로 warp합니다. 그림으로 이동거리를 늘리지 않습니다.',
  ],
  [
    '검과 trail',
    'Gameplay max reach / active window / movement 안에서 제작합니다. 유효 시간의 previous→current visible weapon sweep와 적 region 접촉 AND envelope 내부가 hit 조건입니다. 범위 안 비접촉, 범위 밖 과장된 검 접촉은 MISS입니다. trail과 trace는 같은 weapon trajectory를 사용합니다.',
  ],
  [
    'Hurt region',
    'head / torso / arm / leg / weakPoint / armor / shield가 해당 bone/part를 따라갑니다. collision은 circle / ellipse / capsule / simple polygon이며 response는 body / weak / armor / guard / immune입니다. 전체 rectangle 하나나 SVG 전체 윤곽 복사가 기본이 아닙니다.',
  ],
  [
    '시각 허용 오차',
    '그림의 신체와 semantic region이 멀어지지 않도록 허용 오차를 검수합니다. 머리카락·얇은 케이블·옷 장식·smear 끝은 자동 hurtbox가 아닙니다. 약점/장갑/방패를 그림에서 보이게 하고 구르기 무적은 gameplay state로 처리합니다.',
  ],
];
export const SVG_CHARACTER_GROUPS = [
  'head',
  'torso',
  'upperArm_L',
  'forearm_L',
  'hand_L',
  'upperArm_R',
  'forearm_R',
  'hand_R',
  'upperLeg_L',
  'lowerLeg_L',
  'boot_L',
  'upperLeg_R',
  'lowerLeg_R',
  'boot_R',
  'weapon',
  'shield',
  'strap',
  'pouch',
];
export const REFERENCE_ORDER = [
  [
    'REF-01',
    'Hero / Rival / Scrapyard Owner',
    'design·개별 body profile·SVG parts·front/side/3/4·representative pose. 같은 family 안에서 다른 몸과 도구로 읽히는지 확인.',
    'characters.html',
  ],
  [
    'REF-02',
    'Control Core / Retrieval Arm',
    'connected / captured rival / tension / detached / released. 동일 핵·손/갈고리·회수팔·소켓의 연결 anchor와 상태 관계.',
    'scenarios/prologue.html',
  ],
  [
    'REF-03',
    'Ancient Machine Awakening',
    'dormant / socket seal / mono-eye on / scrap assembly / incomplete march. 비공포 생활 산업 톤과 거대한 scale.',
    'scenarios/prologue.html',
  ],
  [
    'REF-04',
    'Garage 0%',
    'empty frame / core socket / independent module mounts. 이후 다섯 모듈을 자유 순서로 붙일 수 있는 하나의 기본 구조.',
    'scenarios/garage.html',
  ],
  [
    'REF-05',
    'Prologue gameplay-scale composite',
    '실제 1280×720과 mobile 화면에서 인물·핵/팔·각성 병기·차고·배치·조명·주요 동작을 함께 검수하고 승인.',
    'scenarios/prologue.html',
  ],
];
export const REFERENCE_CHECKS = [
  [
    '캐릭터',
    'front / side / 3/4 / representative pose / action key pose / SVG part breakdown / joint·pivot / material / occlusion / gameplay scale',
  ],
  [
    '애니메이션',
    'key pose sheet / silhouette / line of action / center of mass / torso twist / weapon path / contact pose / follow-through. 승인 pose와 재사용 clip을 구분.',
  ],
  [
    '환경',
    'Composition reference / Unique Landmark / Prefab breakdown / Kit / XYZ·depth relationship / far·mid·near / color·material profile / gameplay-scale composite',
  ],
];
