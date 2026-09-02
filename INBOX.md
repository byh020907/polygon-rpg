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

## Feedback Guide

실제 제품을 사용하며 느낀 문제, 기대한 결과와 관찰한 상황을 가능한 한 원문에 가깝게 적는다.

- 좋은 예: `Dungeon이 한 화면 통로처럼 보여서 탐험하는 느낌이 없어.`
- 좋은 예: `공격이 막힌 건지 무적인 건지 화면에서 구분하기 어려워.`
- 좋은 예: `모바일에서 현재 목표가 안 보여서 어디로 가야 할지 모르겠어.`
- 피할 예: `MapManager class를 만들어.`
- 피할 예: `특정 Agent에게 구현 Task를 배정해.`
