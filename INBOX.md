# Human Feedback Inbox

아직 해석하지 않은 제품 feedback만 이 queue에 둔다. 구현 Task, Execution Goal, backlog와 완료 이력을 기록하지 않는다.

## Pending

### 높은 우선순위: 최신 시나리오·시스템·디자인과 전체 문서 정합성 감사

최근 시나리오, 시간 시스템, 지역 진행, 몹 스펙트럼, 그래픽 방향과 PWA 구조가 크게 바뀌었는데 INBOX 처리 후 README, PRODUCT_GOAL.html, ARCHITECTURE.md, STATE.md와 사용자 노출 문구에 과거 설정이 남아 있다. 기능을 더 추가하기 전에 현재 확정된 설계가 모든 책임 문서에서 모순 없이 읽히도록 높은 우선순위로 정리한다.

#### 현재 확인된 불일치

- README가 폐기된 `고철 대왕` 명칭과 예전 제어장치 회수 설명을 사용한다.
- README의 GitHub Pages 배포 대상에 manifest, Service Worker, offline fallback과 icon 자산이 빠져 있다.
- README의 `npm run check` 설명이 실제 명령과 현재 선택적/최종 전체검사 정책을 반영하지 않는다.
- PRODUCT_GOAL.html에 폐기된 `수송대 추격`, `놓친 부품 수송대`와 Recover 흐름이 남아 있다.
- ARCHITECTURE.md에 `rival-first convoy`, 2구간 convoy chase와 이를 고정하는 fixture 설명이 남아 있다.
- STATE.md에 actual convoy 추격·원인 projection이 남은 Gap으로 기록되어 최신 `동원 신호 → 현지 오작동 → 마지막 작업 → 실제 경로 차단 → 대항 병기 부품` 흐름과 충돌한다.

#### 문서 책임별 정리

- PRODUCT_GOAL.html은 최신 Product Desired State만 소유한다. `고대 병기`, `제어핵`, `동원 신호`, `군수 인장`, 현지 산업기계 오작동, 기계의 마지막 작업에 의한 물리적 우회, 대항 병기 완성, 최신 대사 규칙과 몹 스펙트럼을 현재형으로 일관되게 표현한다.
- 폐기된 수색대 파견, 기계의 본체 귀환, 제어핵 추적, 장비 대기 절차, 수송대/convoy 추격과 부품 획득만으로 D-DAY가 자동 연장되는 설명은 Product Goal에서 제거한다. 과거 설계나 변경 이력으로 보존하지 않는다.
- ARCHITECTURE.md는 최신 Product Goal을 구현하는 현재 Engineering Desired State만 소유한다. Campaign state, map route patch, 군수 인장 해제, 지역 machine malfunction, 마지막 작업과 거리 기반 D-DAY 계산 계약을 같은 용어로 정렬하고 폐기된 convoy state·fixture·projection 계약을 제거한다.
- STATE.md는 최신 Product Goal·Architecture와 현재 코드 evidence를 다시 비교해 작성한다. 현재 코드나 fixture에 convoy 구현이 남아 있다면 Desired State로 정당화하지 말고 obsolete/extraneous 구현 Gap으로 기록한다.
- README는 Desired State의 복제본이 아니라 현재 사람이 프로젝트를 실행·검증·설치·배포하는 entry point로 정리한다. 최신 한 줄 게임 소개, 실제 도입 흐름과 용어, 모바일 PWA 설치/오프라인 상태, 현재 명령어, 선택적 검사와 완료 후보 전체검사 정책, 실제 GitHub Pages 배포 자산을 정확히 안내한다.
- AGENTS.md와 vendored METHOD.md는 project router와 canonical Method 책임을 유지한다. 최신 시나리오 설명이나 checklist를 중복 복사하지 않는다.
- UI, Visual QA scenario label, test fixture 이름·메시지와 코드 주석에서 사람이 보는 과거 용어도 함께 검색한다. 내부 stable ID를 반드시 바꿀 필요는 없지만 사용자에게 노출되거나 현재 설계를 오해시키는 문자열은 최신 용어로 정렬한다.

#### 정합성 규칙

- 최신 Human Interview와 Project Direction을 Desired State 판단 기준으로 삼고, 현재 코드에 남아 있다는 이유로 폐기 설정을 문서에 다시 편입하지 않는다.
- 같은 개념은 문서마다 다른 별명을 사용하지 않는다. 사람·UI의 일상 명칭과 고대 병기의 짧은 자동 방송에서 사용하는 공식 용어 경계도 최신 대사 규칙에 맞춘다.
- README, Product Goal, Architecture와 State가 각각 자신의 책임만 가지며 시나리오 전문, 구현 세부와 현재 evidence를 서로 중복하지 않는다.
- 문서 수정만으로 완료하지 않는다. 문서가 드러낸 obsolete 코드·fixture·UI 흐름은 STATE에 구현 Gap으로 남아 이후 루프가 실제 제품을 최신 설계로 수렴하게 한다.

#### 확인 기준

- README.md, PRODUCT_GOAL.html, ARCHITECTURE.md, STATE.md, 사용자 노출 UI와 관련 fixture를 대상으로 폐기 용어·수송대/convoy 흐름 검색을 수행하고 허용된 historical evidence가 아닌 현재형 문맥에서는 0건이어야 한다.
- PRODUCT_GOAL.html은 desktop, 좁은 viewport와 print view에서 semantic structure와 가독성을 확인하고 CSS 없이도 최신 제품 의미가 유지되어야 한다.
- README의 모든 로컬 link, 명령어, PWA 파일 경로와 GitHub Pages 배포 목록을 현재 repository에서 검증한다.
- PRODUCT_GOAL과 ARCHITECTURE의 requirement/contract를 STATE가 같은 최신 용어로 판정하며, 구현되지 않은 항목을 satisfied로 올리지 않는지 독립 검증한다.
- INBOX 항목은 Product Goal·Architecture·README·STATE가 최신 의도를 완전히 소유하고 obsolete 구현 Gap이 보존된 것을 확인한 뒤에만 제거한다.

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

## Feedback Guide

실제 제품을 사용하며 느낀 문제, 기대한 결과와 관찰한 상황을 가능한 한 원문에 가깝게 적는다.

- 좋은 예: `Dungeon이 한 화면 통로처럼 보여서 탐험하는 느낌이 없어.`
- 좋은 예: `공격이 막힌 건지 무적인 건지 화면에서 구분하기 어려워.`
- 좋은 예: `모바일에서 현재 목표가 안 보여서 어디로 가야 할지 모르겠어.`
- 피할 예: `MapManager class를 만들어.`
- 피할 예: `특정 Agent에게 구현 Task를 배정해.`
