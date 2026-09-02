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
