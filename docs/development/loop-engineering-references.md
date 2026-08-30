# Autonomous Roadmap Loop Engineering References

이 문서는 Polygon RPG의 standalone roadmap coordinator를 일반적인 controller·durable workflow 원칙과 정렬하는 Engineering Reference다. 새 Engineering Method가 아니며 외부 workflow engine을 도입하는 계약도 아니다.

## 목표 상태와 관찰 상태

```text
Desired State
  approved roadmap M0~M5 완료
  open work item 없음
  마지막 vertical slice 품질·검증 통과
  clean main == origin/main

Observed State
  Git work item·roadmap
  executor branch·persistent worktree·dirty paths
  registration/final/integration commit graph
  automation·lease

Reconcile Tick
  observe → diff → forward/recovery action 하나 → durable result → exit
```

충돌과 프로세스 재시작은 예외적인 loop 종료가 아니라 current state가 desired state와 다른 한 종류다. Coordinator는 명시적 pause 또는 완료 증명 전까지 같은 상태를 다시 관찰하고 안전한 다음 action을 수행한다.

## 외부 공식 Reference

### Kubernetes Controllers

[Kubernetes Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)는 controller를 current state를 desired state에 가깝게 만드는 non-terminating control loop로 정의한다. Controller는 직접 작업하거나 다른 component에 작업을 요청하고, 완료 결과를 다시 shared state에 기록한다.

채택:

- roadmap과 work item을 desired state, executor branch/worktree/commit을 observed state로 분리한다.
- 한 tick의 성공을 “대화가 끝남”이 아니라 desired state와의 차이가 줄었는지로 판단한다.
- Work item ID, executor branch, owned paths와 commit ancestry를 ownership label처럼 사용한다.
- Approval-free scheduled coordinator가 persistent worktree를 직접 개발·검증·통합해 desired state를 실현한다.

수정 채택:

- Kubernetes API server 대신 Git main, executor branch/worktree와 commit evidence가 durable shared state다.
- Event stream 대신 10분 standalone scheduled tick으로 reconcile한다.

### Temporal Durable Execution

[Temporal Documentation](https://docs.temporal.io/)은 crash·network failure·infrastructure outage 뒤에도 durable execution history에서 작업을 이어가는 것을 핵심으로 설명한다.

채택:

- 이전 coordinator chat memory가 없어도 registration/checkpoint/final/integration commit과 work-item recovery record에서 재개한다.
- Interrupted run은 새 기능으로 넘어가지 않고 같은 executor branch/worktree를 먼저 resume한다.
- Worktree가 없어져도 local/remote executor branch의 clean checkpoint/final commit에서 같은 worktree를 재구성한다.

비채택:

- Temporal server, SDK, database와 deterministic workflow runtime은 현재 정적 ESM repository에 추가하지 않는다.

### AWS Step Functions Retry And Catch

[AWS Step Functions error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)은 예상 가능한 실패를 Retry하고, 반복 실패는 Catch를 통해 명시적인 recovery state로 전환한다.

채택:

- 같은 conflict를 매 tick 동일 문구로 보고하지 않는다.
- 두 번 반복되면 다음 safe recovery action으로 승격하고, 세 번 반복되면 dedicated recovery item/task로 전환한다.
- Title drift, interrupted task, archived task, base drift, missing task와 duplicate writer를 서로 다른 recovery class로 취급한다.

수정 채택:

- 별도 retry timer 대신 scheduled tick이 retry interval이다.
- Error payload 대신 work item의 `복구 기록`에 action과 commit/worktree evidence를 남긴다.

### OpenAI Scheduled Tasks, Permissions And Worktrees

[OpenAI Scheduled tasks](https://learn.chatgpt.com/docs/automations)는 standalone scheduled run이 매번 새 chat에서 무인 시작하고 local Git project 또는 worktree에서 실행될 수 있으며, 조직 정책이 허용하면 `approval_policy = "never"`를 사용한다고 설명한다. [OpenAI Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)는 변경 격리 경계를 제공한다.

채택:

- Coordinator context는 disposable하고 Git evidence만 durable하다.
- Scheduled run 자신을 autonomous writer로 사용해 unattended permission 경계를 유지한다.
- 실제 개발 identity는 one-work-item/one-executor-branch/persistent-worktree다.
- 구현 checkpoint와 fresh-run verification을 서로 다른 run으로 분리해 writer와 verifier를 분리한다.
- Scheduled run은 lifecycle transition 하나 뒤 종료한다.

비채택:

- Scheduled run이 `create_thread`로 별도 Codex-managed worktree task를 만들고 그 task의 승인을 기다리는 구조. 이 저장소의 2026-08-30 runtime evidence에서 child task는 `on-request`였고 prompt text로 권한 경계를 바꿀 수 없었다.
- Computer Use로 permission approval UI를 대신 누르는 구조.

### Fresh-Session File-Memory Loop Prompt

팀장이 제공한 자율 loop 개선 prompt는 매 회차 새 headless session, 파일 기반 기억, 한 결과만 구현, 검사 뒤 recoverable commit, 실제 화면 확인, 회차 log, 명시적 stop과 반복 feedback의 규칙 승격을 강조한다.

직접 채택:

- Codex standalone automation의 각 run을 새 coordinator task/context로 사용하고 이전 run 대화를 잇지 않는다.
- 한 tick은 state-changing action 하나만 수행한다.
- gameplay candidate는 deterministic checks 뒤 visual QA 전에 executor branch checkpoint commit으로 보존하고 push한다.
- 실제 Canvas artifact와 반복 failure evidence를 품질·규칙 승격 입력으로 사용한다.

Codex-native 수정 채택:

- `DESIGN/STATUS/INBOX`를 새로 만들지 않고 roadmap·canonical docs/work items/reports가 같은 책임을 나눠 소유한다.
- 날짜별 shell log 대신 Codex run task와 compact timestamp title, Git commit graph를 회차 기록으로 사용한다.
- `STOP` file 대신 automation `PAUSED`, item `paused/cancelled` 상태를 사용한다.
- shell `env` 대신 automation의 model, reasoning, cadence, project와 execution environment를 사용한다.
- 별도 무한 headless process 안에서 Codex scheduler를 다시 실행하지 않는다. 승인된 finite roadmap 완료와 명시 pause가 outer-loop stop을 소유한다.

## Local Engineering Reference

`C:/projects/baeseongjin`의 `coordinate-github-tasks`와 `github-task-flow`는 실제 worktree·branch·changed path·commit을 ownership 근거로 사용하고, 공유 hunk가 있을 때만 직렬화하며 다른 worktree를 추측 수정하지 않는다.

채택:

- Same repository라는 이유만으로 충돌로 보지 않고 실제 dirty path와 dependency commit을 확인한다.
- Base drift는 history rewrite가 아니라 latest main을 반영한 뒤 영향 검증을 다시 수행한다.
- Replacement와 duplicate reconciliation 전 원본 worktree/commit evidence를 보존한다.

`C:/projects/ball-fight-simulator`는 gameplay idempotency와 checkpoint 검증 사례는 제공하지만 autonomous Git orchestration reference는 아니므로 이번 loop 구조에는 직접 적용하지 않는다.

## Recovery State Table

| Observed drift                        | Reconcile action                               | 다음 tick의 기대 상태       |
| ------------------------------------- | ---------------------------------------------- | --------------------------- |
| Executor branch 있음, worktree 없음   | 같은 branch에서 persistent worktree 재생성     | Implementing 또는 verifying |
| Local branch 없음, remote branch 있음 | Remote tracking branch와 worktree 복구         | Recoverable writer          |
| Run interrupted, dirty owned paths    | Checkpoint/current best 대조 후 같은 item 계속 | Implementing                |
| Unknown dirty/overlapping paths       | 보존하고 exact conflict 기록                   | Conflict 또는 recovery item |
| Final commit base drift               | Executor branch에 non-rewriting main merge     | Fresh verification          |
| Clean final과 ready evidence 있음     | Owned diff 검증 후 main merge·done push        | Done                        |
| Push 실패, local commit 있음          | 같은 hash push 재시도                          | Remote durable state        |
| Main lifecycle가 branch보다 뒤짐      | Commit graph에서 idempotent 상태 정합          | Single authoritative phase  |
| 사람 질문·외부 blocker                | 새 dispatch만 보류, automation은 계속 관찰     | 답/외부 상태 변경 후 resume |
| 모든 completion proof 통과            | 완료 commit·push 후 automation pause           | Roadmap complete            |

## Completion Contract

다음 조건을 한 fresh snapshot에서 모두 확인할 때만 현재 approved roadmap이 완료다.

1. `docs/development/roadmap.md`의 M0~M5가 모두 `완료`다.
2. Open lifecycle work item이 없다.
3. 마지막 integrated vertical slice가 quality threshold와 실제 사용자 경로 검증을 통과했다.
4. `main`이 clean하고 `origin/main`과 같다.
5. Unreconciled executor commit, duplicate writer와 Canonical Conflict가 없다.

완료 증거를 Git에 push하기 전에는 automation을 멈추지 않는다. 완료 후 새 팀장 요청이 등록되면 같은 automation을 재활성화하고 새 desired state를 소비한다.

## 적용하지 않는 수렴 방식

- force push, shared-history rewrite와 broad reset
- executor branch/worktree의 guessed deletion
- 품질 threshold 하향 또는 실패를 완료로 재분류
- 미확인 사용자 변경 overwrite
- 외부 daemon, workflow database 또는 장기 실행 manager conversation
