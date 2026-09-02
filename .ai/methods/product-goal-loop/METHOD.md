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

AI의 bootstrap/router입니다. 적용할 Method, Project Sources와 프로젝트별 사용자 지침을 지정합니다. 사용자는 `Project Direction`에서 Loop Agent의 Persona와 원하는 Quality를 짧은 자연어로 선언할 수 있습니다. Method의 Loop 규칙을 다시 복사하지 않습니다.

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
   ├─ Project Direction
   │    └─ Persona / Quality
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
Project Direction  = Agent가 판단할 Persona와 선언적 Quality
CODE               = 두 Desired State에 수렴해야 하는 구현
STATE.md           = 비교와 Loop 진행 상태의 파생 snapshot
INBOX.md           = Human Feedback 입력
Execution Goal     = Gap을 닫기 위한 임시 실행 단위
```

`PRODUCT_GOAL.html`과 `ARCHITECTURE.md`는 코드에 맞춰 사후 보정하는 문서가 아닙니다. 코드, `STATE.md`, `INBOX.md`, Execution Goal, test, commit, PR, issue와 과거 대화는 Desired State의 source of truth가 아닙니다.

Product What은 `PRODUCT_GOAL.html`이, Engineering How는 `ARCHITECTURE.md`가 소유합니다. 한 문서가 다른 문서의 책임을 침범하지 않게 합니다. 두 Desired State가 명시적으로 충돌하면 코드를 임의로 한쪽에 맞추지 말고 충돌과 제품 영향을 제시해 Human 판단을 받습니다.

## Project Direction

사용자는 `AGENTS.md` 안에 다음처럼 Project Direction을 선언할 수 있습니다.

```markdown
## Project Direction

### Persona

<어떤 경험과 관점을 가진 제작자처럼 판단할 것인지 자연어로 선언>

### Quality

<완성된 결과가 외부에서 어느 수준으로 평가받기를 원하는지 자연어로 선언>
```

Persona와 Quality는 checklist, backlog나 기술 specification이 아닙니다. 사용자는 짧고 선언적인 원문만 제공하며, Agent가 이를 현재 Domain의 판단과 검증에 해석합니다. 내용이 길어지는 프로젝트는 `AGENTS.md`에서 별도 project-specific direction 문서를 링크할 수 있지만 Method가 새 파일을 강제하지 않습니다.

### Persona

Persona는 Loop Agent가 어떤 경험, 취향과 제작 관점으로 판단해야 하는지를 선언합니다. Agent는 이를 다음에 사용합니다.

- Product Goal 안에서 우선순위와 trade-off를 판단하는 관점
- UX, visual, interaction과 polish를 해석하는 방향
- 무엇을 평범한 demo와 인상적인 실제품으로 구분하는지에 대한 감각
- 반복되는 구현 선택에서 유지할 일관된 제작 태도

Persona는 명시적인 Product Goal이나 Architecture를 무시할 권한이 아닙니다. Persona에 영향을 준 작품이나 제작 관점이 언급돼도 기능, asset과 구조를 그대로 복제하지 않습니다. Persona 해석이 제품 의미를 크게 바꾸는 여러 방향으로 갈리면 필요한 Human Interview만 진행합니다.

### Quality

Quality는 최종 결과가 어느 정도의 가치와 완성도로 평가받아야 하는지를 선언합니다. 가격, 시장 반응, 평판, 사용자가 느껴야 할 인상처럼 구현 항목으로 직접 환원되지 않는 문장도 사용할 수 있습니다.

Agent는 사용자의 Quality 원문을 전문 용어, 점수표나 장황한 checklist로 교체하지 않습니다. 대신 현재 Product Goal과 Architecture를 기준으로 다음을 내부적으로 수행합니다.

```text
선언적 Quality
    ↓
현재 제품에서 부족한 완성도 해석
    ↓
Quality Gap 발견
    ↓
Execution Goal과 verification에 반영
```

사용자가 technical criterion을 다시 작성하게 하지 않습니다. Agent가 기능 completeness, failure/recovery, persistence, UX, visual coherence, accessibility, performance와 Engineering quality 중 현재 제품에 실제로 관련된 항목만 도출합니다.

Quality가 높은 실제품을 요구한다고 해서 새로운 제품 기능, business model이나 대규모 infrastructure를 임의로 발명하지 않습니다. 명시된 제품을 실제 사용 가능한 수준으로 완성하는 데 필요한 polish와 adjacent state는 scope completeness로 다루고, 제품 의미를 확장하는 선택은 Human에게 묻습니다.

### External Outcome

판매량, 사용자 수, 평점처럼 출시 후에만 확인할 수 있는 Quality 결과는 구현만으로 달성됐다고 주장하지 않습니다.

- 구현 중에는 그 결과를 기대할 만한 제품 완성도와 구매·사용 이유가 있는지 best available evidence로 검증합니다.
- `IMPLEMENTATION_COMPLETE`는 제품이 선언된 Quality를 시장이나 Human에게 검증받을 수 있는 구현 상태에 도달했다는 뜻입니다.
- 실제 외부 결과는 관찰되기 전까지 `unverified`로 보고합니다.
- Human이 외부 결과 자체를 hard stop condition으로 명시했다면 evidence가 생길 때까지 `EXTERNALLY_BLOCKED` 또는 Human Review 상태를 유지합니다.
- 출시 이후 market result와 Human Feedback이 들어오면 `INBOX.md`를 통해 새 Gap과 Loop를 시작합니다.

Project Direction은 Product Desired State나 Engineering Desired State의 대체물이 아닙니다. Product Goal이 제품의 What을, Architecture가 Engineering How를 계속 소유하며 Project Direction은 Agent의 판단 관점과 기대 완성도를 제공합니다.

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

문서는 사람에게 PPT나 제품 설계서처럼 읽기 좋아야 하고, 동시에 AI가 DOM의 의미 구조만으로 정확히 해석할 수 있어야 합니다. 수정 후에는 Human desktop을 방해하지 않는 제어 가능한 verification surface에서 desktop, 좁은 viewport와 print view를 확인하고, CSS를 제외한 text/HTML structure만으로도 같은 제품 의도가 전달되는지 검사합니다. 적절한 surface가 없으면 외부 browser로 임의 fallback하지 않고 visual 항목을 `unverified`로 남깁니다.

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
- **Clear Project Direction Change**: Persona 또는 Quality 선언이 명확하게 바뀜
- **Ambiguous Product Decision**: 둘 이상의 의미 있는 제품 설계가 가능함
- **Ambiguous Direction Decision**: Persona나 Quality를 여러 제작 방향으로 해석할 수 있음
- **Engineering Implication**: 확정된 Product Goal 변화로 Architecture가 달라져야 함

Existing Desired-State Gap은 Goal을 수정하지 않고 Gap 분석으로 보냅니다. Clear Product Goal Change는 구현 전에 `PRODUCT_GOAL.html`에 반영합니다. Clear Project Direction Change는 사용자의 선언 원문을 `AGENTS.md` 또는 명시된 direction 문서에 반영합니다. Engineering Implication이 있으면 구현 전에 `ARCHITECTURE.md`도 현재 Desired State로 갱신합니다. Ambiguous Direction Decision은 technical checklist를 요구하지 않고 의미 있게 다른 결과만 짧게 질문합니다. Goal의 history로 feedback을 옮기지 않으며, 완료 전 최신 `INBOX.md`와 다시 맞춘 뒤 현재 Product Goal, Architecture 또는 Project Direction이 Human 원문의 의도를 완전히 소유한다고 확인된 정확한 항목만 제거합니다. `STATE.md`에 Gap이나 후속 작업을 기록했다는 이유만으로 원문을 제거하지 않습니다.

Human은 development execution이 끝나기를 기다리지 않고 `INBOX.md`에 feedback을 추가할 수 있습니다. Feedback 등록 경로는 Human의 원문 의미를 보존하고 `INBOX.md`만 변경해야 하며, 실행 중인 코드나 작업 공간을 함께 수정해서는 안 됩니다. 아직 해석하지 않았거나 Desired State에 반영하지 않은 feedback은 정리, 통합과 충돌 해결 과정에서도 보존합니다.

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
- Project Direction에서 현재 구현에 영향을 주는 Persona/Quality Gap과 evidence
- 판정을 뒷받침하는 현재 execution/inspection evidence
- 현재 active Execution Goal이 있다면 mapping, scope, verification과 안전한 resume에 필요한 보존 작업/evidence reference
- 최고 permission preflight가 실패했다면 Runtime Status `EXTERNALLY_BLOCKED`, blocker reason `PERMISSION_BLOCKED`, 마지막 확인 evidence와 필요한 environment action
- Human decision, environment 또는 permission blocker

완료된 Execution Goal, 과거 시도와 장기 변경 이력을 누적하지 않습니다. 내용이 없거나 오래됐거나 실제 제품과 충돌하면 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, 현재 코드와 실행 결과에서 다시 만듭니다. State 재구성은 안전하게 보존된 작업과 verification evidence를 폐기한다는 뜻이 아닙니다. `STATE.md`를 근거로 Desired State를 바꾸지 않습니다.

`STATE.md`는 Project Direction 원문을 복제하거나 점수표로 바꾸는 문서가 아니며 scheduler database나 실행 소유권 registry도 아닙니다. 동시에 실행 가능한 writer 수를 통제하는 정보와 task/conversation lifecycle은 실행 환경이 별도로 관리합니다. State에는 fresh context가 현재 작업을 검증하고 이어가는 데 필요한 최소 recovery reference와 현재 Direction-related Gap/evidence만 둡니다.

## Execution Goal

Execution Goal은 확인된 Gap을 닫기 위해 AI가 내부적으로 만드는 임시 개발 단위입니다. issue나 영구 문서로 보존할 필요가 없습니다.

각 Execution Goal에는 최소한 다음이 있어야 합니다.

- 대응하는 Product Goal requirement와 Architecture section
- 관련된 Persona 또는 Quality 선언과 이번 Gap에 대한 해석
- 현재 제품에서 관찰한 Gap과 evidence
- 이번 실행이 바꾸는 scope와 바꾸지 않는 scope
- 완료를 판정할 test와 independent verification 방법

Execution Goal은 하나의 고정된 제품 기능이나 issue 크기가 아닙니다. 현재 Desired State와 실제 제품 사이의 Gap을 가장 효과적으로 줄이면서 독립적으로 구현하고 검증할 수 있는 적절한 크기로 선택합니다. Goal에 없는 기능, 추측성 확장과 무관한 refactoring을 섞지 않습니다. 최신 shared project state와 `INBOX.md`를 안전하게 통합하고 영향받은 verification을 다시 통과한 뒤에만 완료로 판정하며, 그 후 폐기하고 `STATE.md`에서 active 항목을 제거합니다.

verification이 실패해도 목표와 scope가 여전히 유효하면 같은 Execution Goal 안에서 원인을 분석하고 합리적인 범위의 수정과 검증을 반복합니다. evidence로 Gap의 정의나 필요한 scope가 달라졌을 때만 Execution Goal을 다시 구성합니다.

Execution Goal이 오래 걸리더라도 새 Human Feedback이 들어왔다는 이유만으로 무조건 중단하지 않습니다. 현재 작업을 안전하게 완료하고 최신 상태와 통합한 뒤 다음 Loop에서 새 feedback을 처리할 수 있습니다. 다만 새 정보로 현재 실행을 계속하는 것이 안전하지 않거나 확정된 Product Desired State와 명백히 충돌함이 드러나면 해당 영역을 멈추고 Human gate로 전환합니다.

## Loop Runtime Contract

이 Method는 한 번의 Task 수행이 아니라 현재 Desired State에 도달할 때까지 이어지는 autonomous loop를 전제로 합니다. 기본 실행 단위는 다음과 같습니다.

```text
Wake
    ↓
실행 가능성 확인
    ├─ 다른 writer active → 아무것도 건드리지 않고 종료
    └─ 실행 가능 → 최고 권한 execution 생성
                       ↓
                  전체 permission preflight
                       ├─ 실패/timeout/확인 불가 → ownership 반환, EXTERNALLY_BLOCKED
                       │                            blocker: PERMISSION_BLOCKED
                       └─ 성공 → Start 또는 안전한 Resume
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
현재 작업 안전하게 보존
    ↓
최신 shared project state와 INBOX에 맞춤
    ↓
영향받은 검증 재실행
    ↓
STATE 갱신
    ↓
Desired State와 다시 비교
```

자율 실행 가능한 Gap이 남아 있으면 Human의 별도 지시를 기다리지 않습니다.

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

### Feedback Intake Continues During Development

Human Feedback 입력과 실제 개발 실행은 서로의 완료를 기다리지 않습니다.

- Human은 active Execution Goal이 끝나기 전에도 feedback을 즉시 `INBOX.md`에 추가할 수 있습니다.
- Feedback 등록은 `INBOX.md`만 변경하며 현재 development code, server, browser와 작업 공간을 건드리지 않습니다.
- Human의 원문 의미를 임의로 요약하거나 구현 Task로 치환하지 않습니다.
- 실행 중 도착한 feedback은 현재 Execution Goal을 자동 취소하지 않습니다. 현재 Goal을 안전하게 완료한 뒤 다음 Loop에서 처리할 수 있습니다.
- Product Goal 변화라면 실제로 `PRODUCT_GOAL.html`에 반영하고 Architecture implication까지 확인한 항목만 제거합니다.
- Existing Desired-State Gap이라면 현재 Desired State text가 Human 원문의 의도를 완전히 소유하는지 확인한 뒤에만 제거합니다. State 기록만으로 원문을 대체하지 않습니다.
- 아직 처리하지 않은 feedback은 최신 상태 통합과 충돌 해결 과정에서도 모두 보존합니다.

구체적인 feedback 입력과 shared state 반영 방식은 adapter가 선택합니다. Canonical 요구는 장시간 개발과 독립적으로 feedback을 안전하게 추가하고 보존할 수 있다는 것입니다.

### One Development Writer per Product

같은 Product Goal과 code state를 변경하는 development execution은 동시에 하나만 writer가 될 수 있습니다.

- scheduler나 반복 trigger의 wake는 반드시 새 개발을 시작한다는 뜻이 아닙니다.
- 이미 development execution이 active라면 새 wake는 code, server, browser와 작업 공간을 건드리지 않고 종료합니다.
- 정상 완료, 실패, `WAITING_FOR_HUMAN`, `EXTERNALLY_BLOCKED`와 예외를 포함한 모든 종료 경로에서 실행 소유 상태를 정리합니다.
- 비정상 종료가 의심되면 즉시 다른 writer를 시작하지 않습니다. 실행 환경이 정한 안전한 recovery 조건을 확인한 뒤에만 작업을 이어받습니다.
- 실행 소유 상태를 표현하고 복구하는 구체 방식은 adapter가 선택합니다.

실행 소유 정보는 `STATE.md`, Product Goal 또는 Architecture의 source of truth가 아닙니다.

### Require the Highest Permission for Development Execution

실제 autonomous development execution은 항상 실행 환경이 제공하는 최고 permission profile로 실행합니다. Agent가 작업 내용을 보고 필요한 권한을 선택하거나 최소 권한을 추정하지 않습니다.

- Prompt의 `자율 실행`, `승인 없이 진행` 같은 문장은 실제 Runtime Permission을 변경하지 않습니다.
- 새 task나 session이 부모 execution의 permission을 상속한다고 가정하지 않습니다.
- 새 development execution이 실제 최고 permission profile이며 전체 lifecycle과 승인된 final action을 approval 대기 없이 닫을 수 있는지 preflight를 완료하기 전에는 development ownership을 인수하지 않습니다.
- 최고 권한이 아니면 code, server, browser, worktree와 development용 temporary resource를 건드리지 않고 Runtime Status `EXTERNALLY_BLOCKED`, blocker reason `PERMISSION_BLOCKED`를 보고합니다. Permission 확인만을 위해 preflight가 만든 최소 resource가 있다면 실패 경로에서 반드시 정리합니다.
- Dispatcher가 임시로 확보한 시작 권한이 있다면 permission 확인 실패 시 즉시 반환합니다.
- Permission 설정이 달라지지 않았다면 scheduler wake는 같은 blocked execution을 반복 생성하지 않습니다.
- Dispatcher와 feedback-only intake처럼 development를 수행하지 않는 얇은 adapter는 제한된 권한으로 동작할 수 있습니다.

최고 권한 확인은 구현 command만을 위한 것이 아닙니다. Execution이 시작할 전체 lifecycle을 승인 대기 없이 닫을 수 있어야 합니다.

```text
최고 permission 적용 확인
        ↓
code 변경 / test / build
        ↓
server / Visual QA / integration
        ↓
temporary resource와 process 정리
        ↓
final action과 ownership 반환
```

구현은 가능하지만 cleanup, integration 또는 승인된 final action에서 approval을 기다리는 permission profile은 최고 권한으로 인정하지 않습니다. 최고 권한 적용을 확인할 수 없으면 가능한 데까지만 부분 실행하지 않고 Human 또는 environment 설정으로 전환합니다.

Runtime Permission은 기술적으로 무엇을 실행할 수 있는지를 뜻하며 Human Authorization은 무엇을 실행해도 되는지를 뜻합니다. 최고 권한은 명시된 작업 범위를 넓히거나 Human gate를 제거하지 않습니다. 승인되지 않은 production 배포, 결제, 외부 전송과 destructive action은 최고 권한 execution에서도 기존 Human gate를 따릅니다.

실제 permission profile, 적용 상태와 동일 blocker의 반복 wake 억제는 execution environment가 소유합니다. `STATE.md`에는 permission registry를 복제하지 않고 Runtime Status `EXTERNALLY_BLOCKED`, blocker reason `PERMISSION_BLOCKED`, 마지막 확인 evidence와 필요한 Human/environment action만 기록합니다.

### Preserve Work and Recover Safely

실행 시작 시 작업 공간에 변경이 있다는 이유만으로 종료하거나 reset하지 않습니다. 먼저 남은 변경과 evidence의 출처를 구분합니다.

- 현재 execution이 만든 작업
- 이전 execution이 남긴 복구 가능한 작업
- Human 또는 다른 작업이 만든 출처 불명의 변경
- 별도 feedback 입력 경로가 만든 최신 `INBOX.md` 변경

현재 또는 이전 execution의 작업임을 State와 durable evidence로 안전하게 확인할 수 있으면 이어서 진행할 수 있습니다. 출처를 확실히 알 수 없는 변경은 수정, 삭제, 이동하거나 자기 작업으로 간주하지 않습니다. Shared project state에 새 feedback이 생겼다는 이유로 현재 개발 작업을 버리지 않습니다. 파괴적이거나 추측에 의존한 cleanup으로 다른 작업을 덮어쓰지 않습니다.

### Fresh Context Keeps Durable Work

fresh session은 이전 conversation의 암묵적 기억과 transient reasoning을 버리고 현재 파일과 evidence에서 다시 판단한다는 뜻입니다.

Fresh context에서 버리는 것은 다음과 같습니다.

- 이전 conversation의 암묵적 기억
- transient reasoning
- 검증되지 않은 추측성 plan

안전하게 이어받을 수 있는 것은 다음과 같습니다.

- `PRODUCT_GOAL.html`과 `ARCHITECTURE.md`
- `AGENTS.md`의 Project Direction 원문
- 현재 `STATE.md`
- 아직 처리되지 않은 `INBOX.md` 원문
- 현재 Execution Goal
- 안전하게 보존된 code change 또는 work reference
- test, visual verification와 independent verifier evidence
- blocker와 recovery에 필요한 최소 상태

```text
fresh context
≠ fresh repository
≠ restart from zero
```

비정상 종료 뒤에도 이전 작업임을 안전하게 확인할 수 있으면 새 session이 해당 작업을 이어서 완료합니다. 확인할 수 없으면 변경을 보존한 채 Human 판단을 요청합니다.

### Reconcile the Latest State Before Completion

현재 Execution Goal을 완료하고 최종 반영하기 전에 실행 중 도착한 최신 shared project change를 확인합니다.

```text
현재 작업을 안전하게 보존
        ↓
최신 shared project 상태 확인
        ↓
비파괴적으로 안전하게 통합
        ↓
새 INBOX Feedback 전부 보존
        ↓
이번 실행에서 처리했고 현재 Desired State가 원문 의도를 완전히 소유하는 Feedback만 제거
        ↓
관련 test와 verification 다시 수행
        ↓
최종 통합과 STATE 갱신
```

새 feedback이 현재 Execution Goal과 독립적이면 이를 보존한 채 현재 Goal을 완료하고 다음 Loop에서 처리합니다. 최신 변경과 안전하게 통합할 수 없으면 현재 작업과 원본 feedback을 모두 보존하고 `WAITING_FOR_HUMAN` 또는 `EXTERNALLY_BLOCKED`로 전환합니다. 처리하지 않은 `INBOX.md` 항목이 남아 있는 동안 `IMPLEMENTATION_COMPLETE`로 전환하지 않습니다.

### Separate Trigger from Development Execution

자동 trigger가 Product Goal Loop 전체를 직접 수행할 필요는 없습니다.

- trigger는 지금 새 execution을 시작해도 되는지만 판단하는 얇은 dispatcher일 수 있습니다.
- trigger 자체는 제품 구현, test, server 조작이나 Visual QA를 수행하지 않습니다.
- 실제 implementation, verification와 reporting은 Human이 진행 상황과 결과를 확인할 수 있는 execution task나 session이 담당할 수 있습니다.
- execution을 시작하지 못했다면 trigger가 선점한 실행 권한을 반환합니다.
- execution이 성공적으로 만들어졌다면 실제 execution이 작업 ownership을 이어받습니다.

Scheduler, task/session creation과 ownership handoff 방법은 실행 환경이 선택합니다.

### Keep Automation Observable without Clutter

자동 실행이어도 active Execution Goal, 현재 phase, verification 결과와 blocker를 Human이 관찰할 수 있어야 합니다. 반대로 trigger와 완료된 background execution이 task/conversation 목록에 계속 쌓여서는 안 됩니다.

- trigger 역할만 수행한 surface는 역할이 끝난 뒤 정리할 수 있습니다.
- 자동 생성 execution surface는 실행 중에는 숨기거나 archive하지 않고 Human이 진행 상황을 볼 수 있게 합니다.
- Human interaction이 없고 정상적으로 Execution Goal을 완료·이관했거나 no-op으로 끝나 Human action이 필요 없는 자동 execution은 terminal state와 evidence를 남긴 뒤 archive할 수 있습니다.
- `WAITING_FOR_HUMAN`, `EXTERNALLY_BLOCKED`와 unresolved failure는 Human이 확인하거나 다른 visible surface로 명시적으로 이관하기 전까지 archive하지 않습니다.
- Human이 직접 지시하거나 후속 대화를 남긴 execution은 보존합니다.
- archive는 삭제와 구분하며 필요하면 다시 확인할 수 있어야 합니다.
- code, `STATE.md`와 verification evidence가 correctness를 소유하며 conversation 보존 여부가 결과의 신뢰성을 결정하지 않습니다.

### Perform Visual Verification without Disrupting the Human Desktop

실제 viewport와 product output을 판독하는 Visual Verification 품질 기준은 유지합니다.

- 현재 development execution만 Visual QA를 수행합니다.
- Agent가 제어하고 정리할 수 있는 embedded, in-app 또는 headless verification surface를 우선합니다.
- 명시적인 Human 요청이 없으면 외부 browser 창을 반복적으로 실행하지 않습니다.
- 실행이 시작한 server, browser, temporary tab과 process는 모든 종료 경로에서 정리합니다.
- 적절한 verification surface가 없으면 외부 browser로 임의 fallback하지 않고 해당 항목을 `unverified`로 남깁니다.

Canonical 기준은 특정 browser 제품이 아니라 **Human의 desktop 작업을 방해하지 않으면서 실제 product output을 판독할 수 있는가**입니다.

### Runtime Adapter Boundary

Canonical Method는 다음 행동만 요구합니다.

- Feedback을 execution 중에도 안전하게 받을 수 있음
- 같은 제품을 수정하는 development writer가 동시에 하나뿐임
- 중단됐지만 출처가 확인된 안전한 작업을 이어갈 수 있음
- 완료 전 최신 feedback과 shared project change를 잃지 않았는지 확인함
- 자동 execution의 진행 상황과 결과를 Human이 관찰할 수 있음
- Visual QA가 Human 환경을 불필요하게 방해하지 않음

구체적인 version-control, scheduling, task lifecycle과 browser 운영 절차는 이 문서 밖의 adapter example일 뿐 필수 dependency가 아닙니다. 구현 중심 용어와 환경별 절차를 Product Goal Loop의 핵심 vocabulary로 만들지 않습니다.

### Runtime Status Transitions

현재 evidence에서 자율 실행 가능한 Gap이 있는 동안 Runtime status는 `RUNNING`입니다. 검증 실패는 같은 Execution Goal 안에서 원인과 접근을 바꾸며 수리합니다. 다음 경우에는 autonomous execution을 멈추고 `WAITING_FOR_HUMAN`으로 전환합니다.

- 제품 의도를 확정할 수 없음
- 중요한 선택지 사이에 사용자 판단이 필요함
- 안전하게 추론할 수 없는 외부 결정이 필요함
- 반복 실패 evidence상 더 이상의 자율 진행에 의미 있는 대안이 없음

필요한 결정과 evidence를 `STATE.md`에 blocker로 남기고, feedback queue로 다룰 수 있는 내용은 `INBOX.md`에 전달하거나 Human Interview를 시작합니다. 같은 실패 횟수만으로 기계적으로 중단하지 말고 원인 분석, 다른 접근과 검증 가능성을 먼저 소진합니다.

모든 현재 Product와 Engineering Desired State가 current evidence로 충족되고, 자율적으로 해결할 수 있는 Project Direction Gap과 처리하지 않은 `INBOX.md` feedback도 없을 때만 Runtime status를 `IMPLEMENTATION_COMPLETE`로 전환합니다. 이 상태에서는 maintenance, refactoring이나 새 기능을 임의로 만들어 Loop를 계속하지 않습니다.

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

feedback이 기존 Desired State 위반을 드러낸 경우에는 Product Goal을 바꾸지 않고 Gap만 다시 엽니다. 각 환경은 특정 도구에 종속되지 않은 위 Runtime Contract를 자신의 adapter로 구현합니다.

## Autonomous Development Loop

AI는 다음 순서를 알려진 Gap이 없어질 때까지 반복합니다.

### 1. Start or Resume the Runtime

`AGENTS.md`가 지정한 Method와 Project Sources의 경로를 읽고 `STATE.md`의 runtime status와 현재 phase를 확인합니다. State는 참고하되 아직 current evidence와 일치한다고 가정하지 않습니다.

- `IMPLEMENTATION_COMPLETE`이고 새 `INBOX` 항목이 없으면 새 작업을 발명하지 않고 종료 상태를 유지합니다.
- `WAITING_FOR_HUMAN`이고 새 Human input이 없으면 같은 질문을 반복할 execution을 만들지 않습니다.
- `EXTERNALLY_BLOCKED`이고 관련 외부 조건이 달라지지 않았다면 같은 blocker를 반복할 execution을 만들지 않습니다.

Code, server 또는 browser를 변경하기 전에 실행 환경의 adapter를 통해 같은 제품의 active development execution이 없는지 확인하고 임시 시작 권한을 확보합니다. 다른 writer가 active라면 어떤 development surface도 건드리지 않고 이번 wake를 종료합니다.

새 execution은 실제 permission profile이 실행 환경이 제공하는 최고 권한인지, 그리고 implementation부터 cleanup·integration·승인된 final action까지 전체 lifecycle을 approval 대기 없이 닫을 수 있는지 preflight합니다. Preflight 전체가 성공한 뒤에만 임시 시작 권한을 development ownership으로 인수합니다. 실패, timeout, 확인 불가능 또는 task 조기 종료이면 어떤 개발 작업도 시작하지 않고 자신이 만든 preflight resource를 정리한 뒤 Runtime Status `EXTERNALLY_BLOCKED`와 blocker reason `PERMISSION_BLOCKED`를 기록하고 임시 시작 권한을 반환합니다. Permission 설정이 달라지지 않은 다음 wake는 동일한 blocked task를 반복 생성하지 않습니다.

최고 권한 확인 뒤 비정상 종료 흔적이나 남은 change가 있다면 자동 reset하지 않고 현재 작업, 복구 가능한 이전 작업, 출처 불명 작업과 feedback-only change로 분류한 뒤 안전한 항목만 이어받습니다.

### 2. Process INBOX

Loop 시작 시 처리할 pending feedback을 확인하고 원문 단위로 식별합니다. 명확한 Product Goal, Architecture 또는 Project Direction 변화는 해당 source에 먼저 반영합니다. 모호하면 Human Interview를 진행하고, 답을 기다리는 영역 밖에서 안전하게 진행할 Gap이 있으면 계속합니다.

이번 execution이 선택한 feedback도 최종 최신 상태 통합 전에는 성급히 제거하지 않습니다. 실행 중 새로 도착한 feedback은 현재 작업을 자동 중단하지 않고 `INBOX.md`에 그대로 남겨 다음 Loop가 처리하게 합니다.

### 3. Confirm Desired States and Project Direction

`PRODUCT_GOAL.html` 전체와 `ARCHITECTURE.md` 전체를 읽고 현재 Desired State, requirement identifier, acceptance criteria, engineering boundary와 제약을 확인합니다. `AGENTS.md`에 Project Direction이 있으면 Persona와 Quality 원문도 함께 읽고 개발 판단과 완료 수준에 적용합니다. commit, PR, issue나 과거 대화로 Desired State 또는 Project Direction을 대체하지 않습니다.

### 4. Observe the Actual Product and Code

요구의 성격에 맞는 evidence를 수집합니다.

- 실행 가능한 build, test와 static analysis
- 실제 user flow, state transition과 failure behavior
- UI render, responsive layout, accessibility와 interaction
- persistence, integration, performance와 recovery behavior
- module boundary, dependency direction, state ownership과 data flow

실행하거나 검사할 수 없는 영역은 충족으로 추정하지 않고 `unverified`로 둡니다.

Visual evidence가 필요하면 Human desktop을 방해하지 않는 제어 가능한 verification surface가 있는지 먼저 확인합니다. 없으면 외부 browser를 임의로 열지 않고 해당 항목을 `unverified`로 유지합니다.

### 5. Compare with Both Desired States

Product Goal의 각 requirement와 Architecture의 각 의도된 구조를 현재 제품에 비교합니다. Project Direction이 있다면 Persona가 요구하는 제작 관점과 Quality가 선언한 완성도에 비해 현재 결과가 demo 수준에 머무는지도 평가합니다. Gap을 다음처럼 분류합니다.

- **missing**: 필요한 product behavior나 engineering structure가 없음
- **incorrect**: 존재하지만 Desired State와 다름
- **unverified**: 신뢰할 현재 evidence가 없음
- **extraneous**: 두 Desired State가 정당화하지 않는 사용자 동작이나 engineering scope가 있음
- **blocked**: Human 결정이나 외부 조건 없이는 안전하게 진행할 수 없음

`extraneous`가 명백한 scope expansion이면 제거합니다. 의도된 동작이나 구조일 가능성이 있지만 판단이 모호하면 Desired State에 자동 편입하지 않고 Human에게 질문합니다. 비교 결과로 `STATE.md`를 현재 snapshot에 맞게 갱신합니다.

Direction-derived Gap은 사용자의 원문을 바꾸지 않고 현재 제품에서 관찰한 부족함으로 설명합니다. Persona나 Quality를 이유로 새로운 제품 기능을 발명하지 않으며, 제품 의미를 넓혀야만 해결할 수 있다면 Human 판단을 요청합니다.

### 6. Create One Execution Goal

제품 가치, dependency, risk와 Project Direction을 고려해 다음 Gap을 선택합니다. 함께 바뀌어야 검증 가능한 Product, Architecture와 Direction-related Gap은 하나의 Execution Goal로 묶을 수 있지만, 독립적으로 검증 가능한 다른 목적은 분리합니다.

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
2. Product Goal의 사용자 관찰 결과, Architecture의 구조적 조건과 Project Direction에서 도출한 현재 품질 기대를 각각 확인합니다.
3. 모든 Execution Goal에 구현 맥락과 분리된 verification pass를 수행합니다. 가능한 환경에서는 별도 Agent, reviewer 또는 독립 task를 사용하고, 그렇지 않으면 fresh context와 명시적 acceptance criteria로 다시 검사합니다.
4. verifier는 구현 plan이나 `STATE.md`의 완료 표시가 아니라 Desired State, 실제 제품, 코드와 evidence를 비교합니다.
5. verifier는 판정과 evidence를 반환하고 구현을 직접 고치지 않습니다. 실패하면 implementer가 목표와 scope가 유효한 동안 같은 Execution Goal 안에서 원인을 분석하고 수리한 뒤 다시 검증합니다.
6. 검증의 깊이와 evidence 범위는 risk에 비례시킵니다.

자동 test 통과만으로 UI, 사용성이나 주관적 제품 경험까지 충족됐다고 간주하지 않습니다. Goal, Architecture, acceptance criteria나 verifier를 약화해 구현을 통과시키지 않습니다.

Visual Verification은 Loop Runtime Contract의 비방해 원칙을 따릅니다. 안전한 surface가 없으면 `unverified`로 판정합니다.

### 9. Reconcile Latest State, Update STATE, and Recompare

Execution Goal을 완료로 판정하기 전에 다음 순서로 최신 상태와 맞춥니다.

1. 현재 작업과 verification evidence를 안전하게 보존합니다.
2. execution 시작 뒤 변경된 최신 shared project state를 확인합니다.
3. 현재 작업을 버리거나 출처가 확인된 변경을 덮어쓰지 않는 방식으로 최신 변경을 통합합니다.
4. 실행 중 추가된 `INBOX.md` feedback을 모두 보존하고, 이번 실행에서 처리했으며 현재 Desired State가 Human 원문의 의도를 완전히 소유한다고 확인된 정확한 항목만 제거합니다. State 기록만으로는 제거하지 않습니다.
5. 통합으로 영향받은 test, runtime check와 independent verification을 다시 수행합니다.
6. `STATE.md`의 active Execution Goal, evidence와 Desired State 판정을 현재 결과로 교체합니다.

그 뒤 `PRODUCT_GOAL.html`과 `ARCHITECTURE.md` 전체를 다시 비교하고 새 변경이 다른 요구를 깨뜨렸는지 확인합니다. 안전한 통합이 불가능하거나 출처 불명의 change가 겹치면 어느 쪽도 삭제하지 않고 blocker로 전환합니다.

실행 가능한 Product, Architecture 또는 Direction-related Gap이나 명확한 pending feedback이 남으면 runtime status를 `RUNNING`으로 유지하고 Human의 별도 지시를 기다리지 않은 채 다음 Loop와 Execution Goal을 선택합니다. Human 판단이 필요한 feedback만 남으면 `WAITING_FOR_HUMAN`, 외부 조건이 필요한 Gap만 남으면 `EXTERNALLY_BLOCKED`로 전환합니다. 모든 Desired State가 current evidence로 충족되고 자율적으로 해결할 Direction-related Gap과 pending feedback도 없을 때만 `IMPLEMENTATION_COMPLETE`로 전환하고 새 개발 Task를 만들지 않습니다.

```text
verified Execution Goal
        ↓
두 Desired State 전체 재비교
        ├─ 실행 가능한 Gap/feedback → RUNNING → 다음 Loop
        ├─ Human 판단 필요          → WAITING_FOR_HUMAN
        ├─ 외부 조건 필요           → EXTERNALLY_BLOCKED
        └─ Gap/feedback 없음         → IMPLEMENTATION_COMPLETE
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

이 지점은 제품 수명의 종료가 아니라 outer feedback loop의 Human gate입니다. 새 feedback이 `INBOX.md`에 들어오면 다음 단일-writer execution이 이를 관찰하고 필요한 Interview와 Desired State 갱신을 거쳐 runtime을 `RUNNING`으로 전환합니다. Feedback 등록 경로 자체는 `STATE.md`나 development code를 수정하지 않습니다. 사람이 만족할 때까지 feedback과 수렴을 반복합니다.

Execution surface의 visibility와 archive는 Loop Runtime Contract의 lifecycle 규칙을 따릅니다. 실행 중인 surface를 먼저 숨기지 않습니다.

## Human Gates

사람은 개발 Task queue의 관리자가 아니라 제품 의도와 실제 만족의 최종 판단자입니다.

다음에는 Human 판단을 요청합니다.

- feedback이 여러 제품 설계로 해석될 때
- Persona 또는 Quality 선언이 서로 다른 제작 방향으로 해석돼 결과가 크게 달라질 때
- Product Goal과 Architecture가 충돌하거나 중요한 정보가 없을 때
- 취향, 사용감, 사업 판단과 의미 있는 Engineering trade-off를 evidence만으로 확정할 수 없을 때
- 안전하게 검증할 환경, data나 permission이 없을 때
- 새 development execution에 실행 환경의 최고 permission profile이 실제로 적용되지 않았거나 확인할 수 없을 때
- 출처를 확인할 수 없는 change를 수정하거나 버리지 않고서는 진행할 수 없을 때
- 최신 shared project state와 현재 작업을 비파괴적으로 통합할 수 없을 때
- 반복 실패 evidence상 원인 분석과 대안 시도 후에도 의미 있는 자율 진행 경로가 없을 때
- 배포, 외부 전송, 결제, production data 변경 등 비가역적이거나 외부에 영향을 주는 행동에 명시적 사전 승인이 없을 때

다음에는 매번 승인을 요청하지 않습니다.

- 확인된 Gap 안의 routine 구현과 Engineering 선택
- local test, build, inspection과 가역적 verification
- 현재 Desired State 범위의 defect fix와 필요한 refactoring
- 한 Execution Goal이 끝난 뒤 다음 확인된 Gap을 선택하는 일

## Stop and Escalation Rules

Inner development loop는 다음 상태 중 하나에서만 멈춥니다.

- **Desired State satisfied**: `IMPLEMENTATION_COMPLETE` — Product Goal과 Architecture 전체에 current evidence가 있고 자율적으로 해결할 Project Direction Gap, 알려진 Gap과 pending `INBOX.md` feedback이 없음
- **Human decision required**: `WAITING_FOR_HUMAN` — 제품 의미, Desired State 충돌이나 중요한 trade-off를 확정해야 함
- **Externally blocked**: `EXTERNALLY_BLOCKED` — 필요한 환경, dependency, data 또는 최고 permission profile이 없어 검증 가능한 진전이 불가능함
- **Safety gate**: `WAITING_FOR_HUMAN` — 비가역적이거나 외부 영향 행동 앞에서 승인이 필요함

같은 실패를 근거 없이 반복하지 않습니다. 실패 evidence로 원인과 접근을 바꾸고, 대안으로도 검증 가능한 진전이 불가능할 때 blocker와 필요한 결정을 구체적으로 제시합니다.

Execution Goal 완료, plan checkbox 소진, 일부 test 통과, commit 또는 PR 생성은 그 자체로 Loop 종료 조건이 아닙니다.

이미 active writer가 있어 development를 시작하지 않은 wake는 실패나 blocker가 아니라 정상적인 no-op입니다. 실제 execution은 모든 terminal path에서 자신이 시작한 server/browser/process와 실행 소유 상태를 정리하되, 복구해야 할 code change와 evidence를 파괴하지 않습니다.

## Reporting

Human에게 작업 이력보다 현재 제품 상태를 중심으로 보고합니다.

- 현재 active Execution Goal과 Loop phase
- 새 execution의 최고 permission preflight 결과와 blocker reason `PERMISSION_BLOCKED` 여부
- 두 Desired State에서 충족한 결과
- Persona와 Quality 선언이 현재 구현 판단과 완성도에 어떻게 반영됐는지에 대한 짧은 설명
- 실제로 수행한 verification과 current evidence
- 아직 처리하지 않은 feedback과 최신 상태 통합 결과
- 남은 Gap, `unverified`와 blocker
- Human이 제품에서 확인하거나 답해야 할 질문

판매량, 평점 같은 external Quality outcome은 구현 evidence와 분리해 `verified`, `unverified` 또는 관찰된 실제 결과로 보고합니다. 구현만으로 외부 성과를 달성했다고 주장하지 않습니다.

변경 파일, commit과 PR은 provenance를 보여 주는 supporting reference일 수 있습니다. Desired State 충족 evidence는 실행, 관찰과 구조 검사 결과여야 하며, Git 이력을 현재 Product나 Engineering 설계의 대체물로 사용하지 않습니다.

Human이 active execution의 진행과 결과를 확인할 수 있어야 하지만 task/conversation 자체가 correctness의 source of truth는 아닙니다. 구체적인 visibility와 archive는 Loop Runtime Contract를 따르고, 실제 결과는 code, 현재 `STATE.md`와 verification evidence에서 확인 가능해야 합니다.
