# Product Goal Loop Engineering

이 문서는 이 Method를 명시적으로 선택한 AI Agent가 개발 전체 과정에서 따라야 할 canonical definition입니다.

## Project Structure

이 Method를 적용하는 프로젝트는 다음 최소 구조를 사용합니다.

```text
project/
├─ AGENTS.md
├─ PRODUCT_GOAL.html
├─ ARCHITECTURE.md
├─ INBOX.md
├─ STATE.md
└─ .ai/
   └─ methods/
      └─ product-goal-loop/
         └─ METHOD.md
```

이 문서를 `.ai/methods/product-goal-loop/METHOD.md`에 두고 `AGENTS.md`에서 명시적으로 선택합니다. 프로젝트가 다른 경로를 사용한다면 `AGENTS.md`가 각 파일의 정확한 경로를 하나씩 지정해야 합니다.

## File Responsibilities

### AGENTS.md

AI의 bootstrap/router입니다. 적용할 Method, Project Sources와 프로젝트별 사용자 지침을 지정합니다. Method의 Loop 규칙을 다시 복사하지 않습니다.

### .ai/methods/product-goal-loop/METHOD.md

재사용 가능한 개발 방법론의 canonical definition입니다. 이 Method를 선택한 Agent가 Goal을 해석하고 Gap을 해결하고 검증하는 동작 규칙을 정의합니다. Product Spec이나 특정 Agent용 Skill이 아닙니다.

### PRODUCT_GOAL.html

Product Desired State입니다. 사용자가 어떤 제품을 경험해야 하는지, 즉 **Product What**의 유일한 source of truth입니다.

### ARCHITECTURE.md

Engineering Desired State입니다. 어떤 기술 구조와 Engineering 원칙으로 제품을 만들어야 하는지, 즉 **Engineering How**의 source of truth입니다.

### INBOX.md

Human이 실제 제품을 보고 전달한 아직 처리되지 않은 개선/변경 요청의 입력 queue입니다. 개발 Task backlog가 아닙니다.

### STATE.md

두 Desired State 대비 현재 제품과 Loop의 현재 상태입니다. source of truth가 아니며 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, 코드와 실행 결과에서 재구성할 수 있어야 합니다.

관계는 다음과 같습니다.

```text
AGENTS.md
   │
   ├─ METHOD.md
   │    └─ 개발 Loop의 동작 방식
   │
   ├─ PRODUCT_GOAL.html
   │    └─ Product What
   │
   └─ ARCHITECTURE.md
        └─ Engineering How

PRODUCT_GOAL + ARCHITECTURE
            ↓
           CODE
            ↓
           STATE

Human
  ↓
INBOX
  ↓
PRODUCT_GOAL 변경
  ↓
다시 Loop
```

## Purpose

Product Goal Loop Engineering은 `PRODUCT_GOAL.html`과 `ARCHITECTURE.md`를 현재 원하는 최종 상태로 유지하고, 실제 제품과 코드가 두 Desired State에 계속 수렴하도록 AI가 자율적으로 개발하는 방법입니다.

```text
PRODUCT_GOAL + ARCHITECTURE
            ↓
현재 제품과 비교
            ↓
Gap 발견
            ↓
Execution Goal 생성
            ↓
구현 → 테스트 → 독립 검증
            ↓
두 Desired State 전체와 다시 비교
```

문서를 코드의 사후 설명서로 관리하지 않습니다. 원하는 상태를 먼저 정의하고 코드를 그 상태에 맞춥니다.

## Method Isolation

이 문서가 명시적으로 선택되었을 때만 이 Method를 적용합니다. 같은 저장소나 directory의 sibling Method는 자동으로 읽거나 적용하지 않습니다. 여러 Method는 프로젝트가 `AGENTS.md`에서 각각 명시한 경우에만 함께 사용합니다.

이 Method는 특정 AI Agent, model, Skill, 기술 stack, framework, issue tracker, Git workflow 또는 배포 방식에 의존하지 않습니다.

## Core Invariant

```text
PRODUCT_GOAL.html = Product Desired State
ARCHITECTURE.md    = Engineering Desired State
CODE               = 두 Desired State에 수렴해야 하는 구현
STATE.md           = 비교와 Loop 진행 상태의 파생 snapshot
INBOX.md           = Human Feedback 입력
Execution Goal     = Gap을 닫기 위한 임시 실행 단위
```

`PRODUCT_GOAL.html`과 `ARCHITECTURE.md`는 코드에 맞춰 사후 보정하는 문서가 아닙니다. 코드, `STATE.md`, `INBOX.md`, Execution Goal, test, commit, PR, issue와 과거 대화는 Desired State의 source of truth가 아닙니다.

Product What은 `PRODUCT_GOAL.html`이, Engineering How는 `ARCHITECTURE.md`가 소유합니다. 한 문서가 다른 문서의 책임을 침범하지 않게 합니다. 두 Desired State가 명시적으로 충돌하면 코드를 임의로 한쪽에 맞추지 말고 충돌과 제품 영향을 제시해 Human 판단을 받습니다.

## PRODUCT_GOAL.html

`PRODUCT_GOAL.html`은 일회성 개발 Goal이 아니라 제품이 존재하는 동안 유지되는 **현재 최종 제품 설계의 snapshot**입니다. Markdown 원본이나 별도의 generated HTML을 함께 관리하지 않습니다.

```text
잘못된 구성
PRODUCT_GOAL.md → PRODUCT_GOAL.html
PRODUCT_GOAL.md + PRODUCT_GOAL.html

올바른 구성
PRODUCT_GOAL.html 하나만 Product Desired State
```

### Required Content

제품과 비교 가능한 현재형 Desired State를 semantic HTML로 작성합니다.

- Product intent와 target user outcome
- 핵심 user flow와 제품 behavior
- requirement와 중요한 edge/failure behavior
- 화면, interaction, responsive와 accessibility expectation
- 제품 자체가 반드시 만족해야 하는 constraint
- requirement와 연결된 observable acceptance criteria

Requirement와 acceptance criteria에는 가능한 한 안정적인 identifier를 부여합니다. identifier는 Goal 항목, Gap, Execution Goal과 verification evidence를 연결하기 위한 것이며 개발 순서나 과거 version을 나타내지 않습니다.

### Semantic HTML Rules

- heading, section, article, list, table, figure, figcaption 같은 HTML 구조와 text만 읽어도 제품 의미를 이해할 수 있어야 합니다.
- CSS의 색상, 크기, 위치 또는 시각적 grouping에만 중요한 의미를 숨기지 않습니다.
- 화면 mockup, user flow와 feature matrix를 시각화할 수 있지만 caption, label과 text description을 함께 둡니다.
- JavaScript 실행이나 외부 API/data loading이 있어야 requirement를 알 수 있는 구조를 만들지 않습니다.
- external stylesheet, font 또는 asset이 없어도 문서의 의미와 기본 가독성이 유지되어야 합니다.
- CSS는 layout, typography, color, print와 responsive presentation만 담당합니다.

문서는 사람에게 PPT나 제품 설계서처럼 읽기 좋아야 하고, 동시에 AI가 DOM의 의미 구조만으로 정확히 해석할 수 있어야 합니다. 수정 후에는 browser에서 desktop, 좁은 viewport와 print view를 확인하고, CSS를 제외한 text/HTML structure만으로도 같은 제품 의도가 전달되는지 검사합니다.

### Content Boundaries

다음은 `PRODUCT_GOAL.html`에 넣지 않습니다.

- 기술 stack, module boundary, class, database column과 dependency 선택
- test framework, build command와 coding convention
- backlog, Execution Goal과 개발 plan
- changelog, 과거 version, 완료 기록과 개발 일지
- 현재 코드가 우연히 가진 동작을 정당화하기 위한 사후 설명
- CSS나 JavaScript에만 존재하는 requirement

브라우저에서만 동작해야 한다, 계정 없이 사용할 수 있어야 한다, 특정 data가 사용자 device를 떠나면 안 된다는 조건처럼 사용자 경험과 제품 정체성을 규정하는 제약은 Product Goal에 둘 수 있습니다. 그 제약을 어떤 stack이나 storage로 구현할지는 `ARCHITECTURE.md`가 소유합니다.

### Updating the Product Desired State

Human Feedback이 원하는 제품 상태를 명확히 바꾸면 구현 전에 기존 requirement를 현재형으로 수정하거나 교체하고 obsolete한 내용을 제거합니다. `v1`, `v2`의 과거 내용을 Goal 안에 누적하지 않습니다. Git이 파일 이력을 보존할 수는 있지만 현재 설계를 이해하기 위해 그 이력을 읽을 필요가 없어야 합니다.

기존 Goal을 충족하지 못했다는 feedback은 Goal을 바꾸지 않고 Gap으로 처리합니다. 실제 코드에 Goal 밖 동작이 있다는 이유로 이를 Goal에 자동 편입하지 않습니다.

## ARCHITECTURE.md

`ARCHITECTURE.md`는 현재 코드를 사후 설명하는 inventory가 아니라 **Engineering Desired State**입니다. 코드가 따라야 할 의도된 구조를 현재형으로 작성합니다.

프로젝트에 관련된 다음 항목을 정의합니다.

- 기술 stack과 runtime boundary
- system, module과 책임 경계
- 허용되는 dependency direction
- state ownership과 data flow
- storage, integration과 error/recovery boundary
- performance, security, compatibility와 운영 제약
- testing과 verification 방향
- 중요한 Engineering convention과 금지된 구조

User flow, 화면 동작과 business rule을 Architecture가 새로 발명하지 않습니다. Product Goal의 requirement를 file/class/database schema로 다시 복사하지 말고, 그 requirement를 안정적으로 실현하는 Engineering structure를 정의합니다.

Product Desired State나 프로젝트 제약으로 Engineering Desired State가 달라져야 하면 코드를 바꾸기 전에 `ARCHITECTURE.md`를 새 현재형 설계로 갱신합니다. 반복 가능한 routine Engineering 판단은 Agent가 프로젝트 지침 안에서 결정할 수 있습니다. 의미 있는 trade-off, 운영 위험, 비용 또는 제품 결과가 달라지는 선택은 Human gate로 보냅니다. 구현 후 이미 만들어진 구조를 정당화하기 위해 Architecture를 뒤따라 수정하지 않습니다.

## INBOX.md and Human Interview

Human은 개발 Task 대신 실제 제품의 문제, 원하는 결과와 사용 경험을 전달합니다.

```text
피해야 할 입력 중심
- 필터 component 구현
- DB column 추가

권장 feedback 중심
- 완료 Todo가 계속 보여서 복잡해
- 오늘 해야 할 일을 쉽게 보고 싶어
- 모바일에서 사용하기 불편해
```

`INBOX.md`는 아직 처리하지 않은 feedback을 원문에 가깝게 유지합니다. 각 항목을 다음 중 하나로 분류합니다.

- **Existing Desired-State Gap**: Product Goal 또는 Architecture가 이미 요구하지만 제품이 충족하지 못함
- **Clear Product Goal Change**: 원하는 Product Desired State가 명확하게 바뀜
- **Ambiguous Product Decision**: 둘 이상의 의미 있는 제품 설계가 가능함
- **Engineering Implication**: 확정된 Product Goal 변화로 Architecture가 달라져야 함

Existing Desired-State Gap은 Goal을 수정하지 않고 Gap 분석으로 보냅니다. Clear Product Goal Change는 구현 전에 `PRODUCT_GOAL.html`에 반영합니다. Engineering Implication이 있으면 구현 전에 `ARCHITECTURE.md`도 현재 Desired State로 갱신합니다. 처리된 feedback은 Goal의 history로 옮기지 않고 `INBOX.md`에서 제거합니다.

### Human Interview Rules

Ambiguous Product Decision은 임의로 확장하지 않고 필요한 부분만 Human에게 묻습니다.

- 실제로 여러 해석이 있고 사용자 판단이 필요할 때는 의미 있게 구분되는 선택지를 우선 제시합니다.
- 한 선택지가 압도적으로 자연스럽거나 요구가 충분히 명확하면 형식적인 객관식을 만들지 않습니다.
- `거의 확실한 답 / 기타 / 기타`처럼 선택의 의미가 없는 구성을 만들지 않습니다.
- 한 번에 현재 진행에 필요한 판단만 짧게 묻습니다.
- 선택지만으로 의도를 확정하기 어려울 때만 자유 서술을 요청합니다.
- 답을 받기 전에는 해당 영역의 Product Goal이나 구현을 확장하지 않습니다.

별도로 명시된 Interview Method나 Skill이 있다면 그 규칙을 함께 적용할 수 있습니다. 이 Method는 다른 Interview 기능을 자동 선택하지 않습니다.

## STATE.md

`STATE.md`는 현재 비교와 Loop 진행을 재개하기 위한 **derived snapshot**입니다. 다음 정보만 현재 상태로 유지합니다.

- Runtime status: `RUNNING`, `WAITING_FOR_HUMAN`, `EXTERNALLY_BLOCKED` 또는 `IMPLEMENTATION_COMPLETE`
- 현재 Loop phase
- Product Goal과 Architecture 항목별 `satisfied`, `gap`, `unverified`, `blocked` 판정
- 판정을 뒷받침하는 현재 execution/inspection evidence
- 현재 active Execution Goal이 있다면 mapping, scope와 verification
- Human decision, environment 또는 permission blocker

완료된 Execution Goal, 과거 시도와 장기 변경 이력을 누적하지 않습니다. 내용이 없거나 오래됐거나 실제 제품과 충돌하면 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, 현재 코드와 실행 결과에서 다시 만듭니다. `STATE.md`를 근거로 Desired State를 바꾸지 않습니다.

## Execution Goal

Execution Goal은 확인된 Gap을 닫기 위해 AI가 내부적으로 만드는 임시 개발 단위입니다. issue나 영구 문서로 보존할 필요가 없습니다.

각 Execution Goal에는 최소한 다음이 있어야 합니다.

- 대응하는 Product Goal requirement와 Architecture section
- 현재 제품에서 관찰한 Gap과 evidence
- 이번 실행이 바꾸는 scope와 바꾸지 않는 scope
- 완료를 판정할 test와 independent verification 방법

Execution Goal은 하나의 고정된 제품 기능이나 issue 크기가 아닙니다. 현재 Desired State와 실제 제품 사이의 Gap을 가장 효과적으로 줄이면서 독립적으로 구현하고 검증할 수 있는 적절한 크기로 선택합니다. Goal에 없는 기능, 추측성 확장과 무관한 refactoring을 섞지 않습니다. 완료 후 폐기하고 `STATE.md`에서 active 항목을 제거합니다.

verification이 실패해도 목표와 scope가 여전히 유효하면 같은 Execution Goal 안에서 원인을 분석하고 합리적인 범위의 수정과 검증을 반복합니다. evidence로 Gap의 정의나 필요한 scope가 달라졌을 때만 Execution Goal을 다시 구성합니다.

## Loop Runtime Contract

이 Method는 한 번의 Task 수행이 아니라 현재 Desired State에 도달할 때까지 이어지는 autonomous loop를 전제로 합니다. 기본 실행 단위는 다음과 같습니다.

```text
Loop Start
    ↓
INBOX 처리
    ↓
PRODUCT_GOAL / ARCHITECTURE 확인
    ↓
현재 제품과 비교
    ↓
Gap 분석
    ↓
가장 적절한 Execution Goal 선택
    ↓
구현
    ↓
테스트 / 독립 검증
    ↓
STATE 갱신
    ↓
Desired State와 다시 비교
```

Gap이 남아 있으면 Human의 별도 지시를 기다리지 않습니다.

```text
Gap 있음
  ↓
다음 Execution Goal
  ↓
Implement
  ↓
Verify
  ↓
STATE 갱신과 전체 Gap 재분석
```

현재 evidence에서 해결할 Gap이 있는 동안 Runtime status는 `RUNNING`입니다. 검증 실패는 같은 Execution Goal 안에서 원인과 접근을 바꾸며 수리합니다. 다음 경우에는 autonomous execution을 멈추고 `WAITING_FOR_HUMAN`으로 전환합니다.

- 제품 의도를 확정할 수 없음
- 중요한 선택지 사이에 사용자 판단이 필요함
- 안전하게 추론할 수 없는 외부 결정이 필요함
- 반복 실패 evidence상 더 이상의 자율 진행에 의미 있는 대안이 없음

필요한 결정과 evidence를 `STATE.md`에 blocker로 남기고, feedback queue로 다룰 수 있는 내용은 `INBOX.md`에 전달하거나 Human Interview를 시작합니다. 같은 실패 횟수만으로 기계적으로 중단하지 말고 원인 분석, 다른 접근과 검증 가능성을 먼저 소진합니다.

모든 현재 Product와 Engineering Desired State가 current evidence로 충족되면 Runtime status를 `IMPLEMENTATION_COMPLETE`로 전환합니다. 이 상태에서는 maintenance, refactoring이나 새 기능을 임의로 만들어 Loop를 계속하지 않습니다.

```text
IMPLEMENTATION_COMPLETE
        ↓ Human이 실제 제품 확인
Human Feedback
        ↓
INBOX
        ↓
필요 시 Interview
        ↓
PRODUCT_GOAL 갱신
        ↓
ARCHITECTURE 영향 확인
        ↓
새로운 Gap 발생
        ↓
RUNNING으로 전환하여 Loop 재개
```

feedback이 기존 Desired State 위반을 드러낸 경우에는 Product Goal을 바꾸지 않고 Gap만 다시 엽니다. Scheduler, worktree, Agent orchestration, CI, automation runner와 같은 실제 실행 메커니즘은 특정 도구에 종속시키지 않습니다. 각 환경은 이 Runtime Contract를 만족하는 방식으로 구현합니다.

## Autonomous Development Loop

AI는 다음 순서를 알려진 Gap이 없어질 때까지 반복합니다.

### 1. Start or Resume the Runtime

`AGENTS.md`가 지정한 Method와 Project Sources의 경로를 읽고 `STATE.md`의 runtime status와 현재 phase를 확인합니다. State는 참고하되 아직 current evidence와 일치한다고 가정하지 않습니다. `IMPLEMENTATION_COMPLETE`이고 새 `INBOX` 항목이 없다면 새 작업을 발명하지 않고 종료 상태를 유지합니다.

### 2. Process INBOX

새 feedback을 분류합니다. 명확한 Product Goal 변화와 그 Engineering implication을 Desired State 문서에 먼저 반영합니다. 모호하면 Human Interview를 진행하고, 답을 기다리는 영역 밖에서 안전하게 진행할 Gap이 있으면 계속합니다.

### 3. Confirm Both Desired States

`PRODUCT_GOAL.html` 전체와 `ARCHITECTURE.md` 전체를 읽고 현재 Desired State, requirement identifier, acceptance criteria, engineering boundary와 제약을 확인합니다. commit, PR, issue나 과거 대화로 Desired State를 대체하지 않습니다.

### 4. Observe the Actual Product and Code

요구의 성격에 맞는 evidence를 수집합니다.

- 실행 가능한 build, test와 static analysis
- 실제 user flow, state transition과 failure behavior
- UI render, responsive layout, accessibility와 interaction
- persistence, integration, performance와 recovery behavior
- module boundary, dependency direction, state ownership과 data flow

실행하거나 검사할 수 없는 영역은 충족으로 추정하지 않고 `unverified`로 둡니다.

### 5. Compare with Both Desired States

Product Goal의 각 requirement와 Architecture의 각 의도된 구조를 현재 제품에 비교합니다. Gap을 다음처럼 분류합니다.

- **missing**: 필요한 product behavior나 engineering structure가 없음
- **incorrect**: 존재하지만 Desired State와 다름
- **unverified**: 신뢰할 현재 evidence가 없음
- **extraneous**: 두 Desired State가 정당화하지 않는 사용자 동작이나 engineering scope가 있음
- **blocked**: Human 결정이나 외부 조건 없이는 안전하게 진행할 수 없음

`extraneous`가 명백한 scope expansion이면 제거합니다. 의도된 동작이나 구조일 가능성이 있지만 판단이 모호하면 Desired State에 자동 편입하지 않고 Human에게 질문합니다. 비교 결과로 `STATE.md`를 현재 snapshot에 맞게 갱신합니다.

### 6. Create One Execution Goal

제품 가치, dependency와 risk를 고려해 다음 Gap을 선택합니다. 함께 바뀌어야 검증 가능한 Product와 Architecture 항목은 하나의 Execution Goal로 묶을 수 있지만, 독립적으로 검증 가능한 다른 목적은 분리합니다.

### 7. Execute Autonomously

확정된 두 Desired State와 프로젝트 지침 안의 routine 구현 선택은 AI가 자율적으로 수행합니다. 매 Execution Goal마다 Human 승인을 요청하지 않습니다.

- 기존 Desired State를 충족하는 구현 선택은 합리적으로 결정하고 진행합니다.
- 새로운 product behavior가 필요해지면 Goal이 이미 정당화하는지 확인합니다.
- 새로운 Engineering Desired State가 필요하면 구현 전에 Architecture를 의도적으로 갱신합니다.
- 문서가 모순되거나 제품 의미를 정할 정보가 없으면 해당 영역을 멈추고 질문합니다.
- verification 실패 시 Desired State를 구현에 맞게 낮추지 않고 원인을 고칩니다.

### 8. Test and Independently Verify

완료는 구현자의 자기 보고가 아니라 current evidence로 판정합니다.

1. 변경에 직접 대응하는 test, build, static check와 runtime check를 수행합니다.
2. Product Goal의 사용자 관찰 결과와 Architecture의 구조적 조건을 각각 확인합니다.
3. 모든 Execution Goal에 구현 맥락과 분리된 verification pass를 수행합니다. 가능한 환경에서는 별도 Agent, reviewer 또는 독립 task를 사용하고, 그렇지 않으면 fresh context와 명시적 acceptance criteria로 다시 검사합니다.
4. verifier는 구현 plan이나 `STATE.md`의 완료 표시가 아니라 Desired State, 실제 제품, 코드와 evidence를 비교합니다.
5. verifier는 판정과 evidence를 반환하고 구현을 직접 고치지 않습니다. 실패하면 implementer가 목표와 scope가 유효한 동안 같은 Execution Goal 안에서 원인을 분석하고 수리한 뒤 다시 검증합니다.
6. 검증의 깊이와 evidence 범위는 risk에 비례시킵니다.

자동 test 통과만으로 UI, 사용성이나 주관적 제품 경험까지 충족됐다고 간주하지 않습니다. Goal, Architecture, acceptance criteria나 verifier를 약화해 구현을 통과시키지 않습니다.

### 9. Update STATE and Recompare the Whole Desired State

test와 verifier evidence로 `STATE.md`의 active Execution Goal과 관련 판정을 먼저 갱신합니다. 그 뒤 `PRODUCT_GOAL.html`과 `ARCHITECTURE.md` 전체를 다시 비교하고 새 변경이 다른 요구를 깨뜨렸는지 확인해 State 전체를 현재 snapshot으로 교체합니다.

Gap이 하나라도 남으면 runtime status를 `RUNNING`으로 유지하고, Human의 별도 지시를 기다리지 않은 채 다음 Execution Goal을 선택합니다. 모든 항목이 current evidence로 충족되면 `IMPLEMENTATION_COMPLETE`로 전환하고 새 개발 Task를 만들지 않습니다.

```text
verified Execution Goal
        ↓
두 Desired State 전체 재비교
        ├─ Gap 있음 → RUNNING → 다음 Execution Goal
        ├─ Blocked   → WAITING_FOR_HUMAN 또는 EXTERNALLY_BLOCKED
        └─ Gap 없음 → IMPLEMENTATION_COMPLETE
```

### 10. Human Review and Feedback Loop

알려진 Gap이 모두 사라지면 Human이 실제 제품을 사용하고 feedback할 수 있는 상태로 제시합니다.

```text
IMPLEMENTATION_COMPLETE
        ↓
Human이 실제 제품 사용
        ↓
feedback 없음 ──→ 현재 상태 유지
feedback 있음 ──→ INBOX
                      ↓
              필요 시 Interview
                      ↓
          PRODUCT_GOAL 갱신
                      ↓
       ARCHITECTURE 영향 확인
                      ↓
                  새 Loop
```

이 지점은 제품 수명의 종료가 아니라 outer feedback loop의 Human gate입니다. 새 feedback이 `INBOX.md`에 들어오면 필요한 Interview와 Desired State 갱신을 거쳐 runtime을 `RUNNING`으로 되돌립니다. 사람이 만족할 때까지 feedback과 수렴을 반복합니다.

## Human Gates

사람은 개발 Task queue의 관리자가 아니라 제품 의도와 실제 만족의 최종 판단자입니다.

다음에는 Human 판단을 요청합니다.

- feedback이 여러 제품 설계로 해석될 때
- Product Goal과 Architecture가 충돌하거나 중요한 정보가 없을 때
- 취향, 사용감, 사업 판단과 의미 있는 Engineering trade-off를 evidence만으로 확정할 수 없을 때
- 안전하게 검증할 환경, data나 permission이 없을 때
- 반복 실패 evidence상 원인 분석과 대안 시도 후에도 의미 있는 자율 진행 경로가 없을 때
- 배포, 외부 전송, 결제, production data 변경 등 비가역적이거나 외부에 영향을 주는 행동에 명시적 사전 승인이 없을 때

다음에는 매번 승인을 요청하지 않습니다.

- 확인된 Gap 안의 routine 구현과 Engineering 선택
- local test, build, inspection과 가역적 verification
- 현재 Desired State 범위의 defect fix와 필요한 refactoring
- 한 Execution Goal이 끝난 뒤 다음 확인된 Gap을 선택하는 일

## Stop and Escalation Rules

Inner development loop는 다음 상태 중 하나에서만 멈춥니다.

- **Desired State satisfied**: `IMPLEMENTATION_COMPLETE` — Product Goal과 Architecture 전체에 current evidence가 있고 알려진 Gap이 없음
- **Human decision required**: `WAITING_FOR_HUMAN` — 제품 의미, Desired State 충돌이나 중요한 trade-off를 확정해야 함
- **Externally blocked**: `EXTERNALLY_BLOCKED` — 필요한 환경, dependency, data 또는 permission이 없어 검증 가능한 진전이 불가능함
- **Safety gate**: `WAITING_FOR_HUMAN` — 비가역적이거나 외부 영향 행동 앞에서 승인이 필요함

같은 실패를 근거 없이 반복하지 않습니다. 실패 evidence로 원인과 접근을 바꾸고, 대안으로도 검증 가능한 진전이 불가능할 때 blocker와 필요한 결정을 구체적으로 제시합니다.

Execution Goal 완료, plan checkbox 소진, 일부 test 통과, commit 또는 PR 생성은 그 자체로 Loop 종료 조건이 아닙니다.

## Reporting

Human에게 작업 이력보다 현재 제품 상태를 중심으로 보고합니다.

- 두 Desired State에서 충족한 결과
- 실제로 수행한 verification과 current evidence
- 남은 Gap, `unverified`와 blocker
- Human이 제품에서 확인하거나 답해야 할 질문

변경 파일, commit과 PR은 provenance를 보여 주는 supporting reference일 수 있습니다. Desired State 충족 evidence는 실행, 관찰과 구조 검사 결과여야 하며, Git 이력을 현재 Product나 Engineering 설계의 대체물로 사용하지 않습니다.
