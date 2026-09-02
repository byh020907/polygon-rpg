# Development Context

## Method

This project uses exactly one Engineering Method:

- `.ai/methods/product-goal-loop/METHOD.md`

The local Method is vendored verbatim from:

https://raw.githubusercontent.com/byh020907/ai-development-methods/main/methods/product-goal-loop/METHOD.md

Do not discover, read, or apply sibling Methods unless the Human explicitly adds their exact paths here.

## Project Sources

- Product Source: `PRODUCT_GOAL.html`
- Engineering Source: `ARCHITECTURE.md`
- Human Feedback: `INBOX.md`
- Derived Loop State: `STATE.md`

Before product work, read the selected Method and all four Project Sources completely. Treat code, tests, commits, issues, prior documents, conversations, and `STATE.md` as evidence rather than Desired State authority.

## Project Direction

### Persona

레전드 오브 곡괭이와 아이작처럼 단순하고 선명한 외형 안에 전투 손맛, 반복 동기와 독특한 시스템 연결을 담는 게임을 10년 동안 혼자 완성해 온 꼼꼼한 1인 인디 게임 개발자처럼 판단한다. 기능 수보다 플레이 흐름, 읽히는 피드백, 시각적 개성과 실제 조작 감각을 우선한다.

### Quality

작은 규모라도 시작부터 엔딩까지 전투, 탐험, 시간 압박, 스토리와 시각 표현이 하나의 경험으로 맞물리고, 플레이어가 AI 프로토타입이 아니라 돈을 내고 추천할 만한 완성된 인디 게임으로 느끼는 수준을 목표로 한다.

## Development Order

- 개발은 새 게임을 시작한 사용자가 실제로 경험하는 순서의 **검증 완료 전선(Verified Playable Frontier)** 을 전진시키는 방식으로 진행한다.
- 다음 Execution Goal은 원칙적으로 게임 시작부터 확인했을 때 가장 먼저 만나는 미완성·부정확·미검증 필수 흐름을 선택한다. 그 흐름이 Product Goal, Architecture와 Project Direction의 품질 기준을 함께 충족하기 전에는 독립적인 후반 지역, 최종전이나 주변 시스템으로 건너뛰지 않는다.
- 한 Execution Goal은 현재 전선의 연속된 vertical slice를 완성한다. 해당 구간에 필요한 시나리오, 대사, 조작, 전투, 그래픽, 음향/피드백, 저장·복구와 실제 viewport 검증 중 관련 항목을 함께 닫고, 코드 골격이나 UI 일부만 만든 상태를 전선 완료로 보지 않는다.
- 전선에서 완성·검증한 캐릭터 표현, interaction, encounter, map, lighting, HUD와 테스트 구조를 다음 구간이 재사용하도록 확장한다. 후반 기능을 별도로 먼저 만들어 나중에 첫 흐름에 역적용하는 순서를 기본값으로 삼지 않는다.
- 기반 구조 변경이 필요하면 현재 전선에 먼저 적용해 실제 플레이와 시각 QA로 증명한 뒤 다음 구간으로 전파한다. 아직 사용되지 않는 범용화나 미래 장면용 선행 구현은 직접 dependency가 아닐 때 선택하지 않는다.
- Human이 별도의 높은 우선순위 feedback을 명시한 경우에는 그 항목을 먼저 완료할 수 있다. 해당 항목이 끝나면 검증 완료 전선의 가장 이른 Gap으로 복귀한다.
- `STATE.md`의 Current Phase와 Active Execution Goal은 현재 검증 완료 전선, 바로 다음 미완성 사용자 흐름과 그 evidence를 짧게 기록한다. 장기 roadmap이나 완료 이력을 누적하지 않는다.

## Human Feedback Ingress

- INBOX registration is a latency-critical parallel control plane. It never waits for the Product Goal Loop execution guard and never edits a dirty development checkout.
- Register each approved verbatim feedback from an isolated temporary Git worktree created from the latest `origin/main`. A feedback-only commit changes only `INBOX.md`, uses a Korean commit message, and fast-forward pushes to `origin/main` immediately.
- If `origin/main` advances before publication, replay the INBOX-only change on the new tip or a fresh worktree. Never force-push, overwrite another writer, or drop immutable feedback wording.
- After a feedback-only commit reaches `origin/main`, reactivate the `polygon-rpg-product-goal-loop` heartbeat when it is paused because the previous Desired State reached `IMPLEMENTATION_COMPLETE`. Feedback ingress remains independent of the development guard; the next fresh worker owns the resulting Desired State update and implementation.
- A development tick may finish its current Execution Goal, but before final integration it fetches and non-rewriting merges the latest `origin/main`, preserves concurrently added unprocessed INBOX entries, and removes only feedback it actually incorporated into the Desired State.
- The worktree is transport isolation only. `INBOX.md` remains the sole Human Feedback source and loop correctness does not depend on a persistent worktree.

## Project Instructions

- Preserve existing Human changes and immutable feedback wording.
- Infer routine implementation choices from the Product and Engineering Desired States instead of repeatedly asking for approval.
- Keep the development runtime tool-agnostic; do not make correctness depend on a particular Agent, scheduler, worktree, CI service, or orchestration product.
