# Polygon RPG Codex-Native Development Process

이 문서는 사용자가 팀장으로 제품 방향과 우선순위를 결정하고, Git queue를 기준으로 매번 새로 시작하는 standalone coordinator tick과 독립 work-item task가 roadmap을 지속 소비하는 프로젝트 운영 계약이다.

Reference-Guided Engineering은 각 loop 안의 Engineering Decision을 담당한다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, 각 work item의 품질 rubric과 개선 loop는 [`quality-loop.md`](./quality-loop.md)가 소유한다.

프로젝트 개발 요청에는 기본적으로 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. 사용자가 `이번 건은 직접 처리`처럼 workflow 우회를 명시한 요청만 현재 task에서 일반 작업으로 처리한다.

## 공식 Codex 실행 근거

- [OpenAI Worktrees 문서](https://learn.chatgpt.com/docs/environments/git-worktrees)는 worktree가 같은 project의 여러 독립 chat을 서로 방해하지 않고 실행하게 하며, 기본 Codex-managed worktree는 보통 하나의 chat에 전용이고 같은 chat이 다시 돌아오면 같은 worktree를 유지한다고 설명한다.
- [OpenAI Subagents 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents)는 subagent workflow가 parent/main thread에서 병렬 agent 결과를 수집·통합하고, main thread가 최종 응답을 만든다고 설명한다.
- [OpenAI Scheduled tasks 문서](https://learn.chatgpt.com/docs/automations)는 standalone scheduled task가 run마다 새 chat을 만들고, local Git project의 main checkout 또는 격리 worktree에서 실행할 수 있으며, skill을 prompt에서 명시적으로 호출할 수 있다고 설명한다.

따라서 Polygon RPG의 durable work item은 parent-main에 종속된 subagent가 아니라 사이드바에서 팀장이 직접 열 수 있는 사용자 소유 Codex task다. Subagent는 그 task 내부의 bounded helper다. Coordinator는 Codex 프로젝트 대상 standalone automation으로 매 tick 새 task/context에서 시작하며 heartbeat나 장기 실행 메인 대화가 아니다.

## 역할과 task 경계

### 팀장 — 사용자

- 핵심 재미, 제품 방향, 우선순위와 Reference를 결정한다.
- 사이드바의 work-item task를 직접 열어 실제 코드 트리, 실행 artifact와 검증을 본다.
- 구현된 기능의 구체적 관찰 질문과 blocking 제품 선택에 해당 task에서 직접 답한다.
- 이미 밝힌 의도, 계획 문서와 코드에서 추론 가능한 Engineering Decision을 반복 승인하지 않는다.

### 팀장 메인 task — Git Queue Intake / Status

- 팀장의 새 요청·우선순위·pause·cancel·reopen을 최소 Git work item 또는 queue mutation으로 기록하고 즉시 반환한다.
- 현재 만드는 기능, 팀장이 직접 열 업무 task와 실제 blocker만 조회·표시한다.
- standalone coordinator automation의 활성·중지 상태를 관리한다.
- work-item task 생성, 완료 wait/poll, 구현, 품질 tuning, artifact 대리 평가, feedback 중계와 main integration을 수행하지 않는다.
- changed tree와 검증 로그를 대화 context에 복제하거나 지속되는 outer-loop engine 역할을 하지 않는다.

### Standalone Roadmap Coordinator Tick

- 매 tick 독립된 실행 context에서 Git work item·roadmap·Codex task title/status·managed worktree·commit graph를 다시 읽는다.
- repo-local lease로 writer를 직렬화하고, main HEAD drift·dirty main·중복 task·겹치는 ownership·상충 commit이 있으면 mutation 없이 종료한다.
- ready item 하나의 독립 검증·main 통합·done 기록 또는 queued/roadmap item 하나의 등록·새 task 생성만 수행하고 종료한다.
- active task를 기다리거나 gameplay를 구현·tuning·대리 평가하지 않으며 feedback을 중계하지 않는다.
- 이전 coordinator/main 대화, transient task ID, subagent ID와 working context를 source of truth로 사용하지 않는다.

### Work-Item Task — Vertical Slice Director

- 하나의 work item에 하나만 존재하는 사용자 소유 Codex task이며 Lead Game Developer & QA Director다.
- Git repository에서는 기본적으로 Codex-managed worktree에서 시작해 다른 업무와 filesystem/index를 격리한다.
- 팀장의 명시적 의도를 구현 입력으로 받아 안전하고 되돌릴 수 있는 candidate를 먼저 구현한다.
- Reference 판단, 구현, 품질 loop, 실제 artifact, 직접 feedback, 업무보고와 final scoped commit을 처음부터 끝까지 소유한다.
- 팀장은 이 task를 직접 열고 feedback하며 Director는 같은 task/worktree에서 반영한다.
- final worktree commit을 만들되 push·merge·main roadmap 갱신·다음 item 시작은 하지 않는다.

### Task-Internal Subagent / Independent Verifier

- work-item task 안의 bounded exploration, 증명된 disjoint implementation 또는 frozen-candidate verification만 수행한다.
- parent work-item task가 공개 계약, path ownership, 결과 수집·통합과 전체 품질을 소유한다.
- subagent thread는 사용자 소유 work-item task나 durable queue item을 대체하지 않는다.
- 제품 범위, rubric, 팀장 feedback, final commit과 parent 완료를 소유하지 않는다.

## 구현 우선과 짧은 선택 인터뷰

- 명시된 의도는 구현 입력이며 재확인 요청이 아니다.
- 기본 흐름은 `구현 → 현재 결과 검증 → 실제 tree·동작·검증 공개 → 필요한 경우에만 팀장 판단 → final commit`이다.
- 계획, Reference Brief, 실행·품질 계약과 task list는 work-item task의 내부 context다.
- 현재 코드·roadmap·Reference에서 추론 가능하거나 안전하게 되돌릴 수 있는 선택은 먼저 구현한다.
- 구현을 실제로 막고 추론·가역 default가 불가능한 결정만 work-item task에서 한 번에 하나씩 묻는다. 질문은 Yes/No 또는 2~3개의 상호 배타적 선택지와 각 한 줄 영향만 제시한다.
- 메인 task는 질문이나 답을 대신 만들지 않는다. 구체적 판단 항목과 task link만 요약하고 답은 해당 task에서 받는다.

## Canonical 시작과 bounded continuous roadmap loop

기본 실행 장치는 saved Polygon RPG 프로젝트의 standalone recurring automation이다. Bare `$dev-team-loop`는 같은 stateless coordinator tick을 즉시 한 번 수동 실행하는 복구 명령이며, 호출 자체는 work item이 아니다.

```text
팀장 메인 대화 → Git queue 기록 → 즉시 종료
standalone coordinator tick → lease·Git/task/worktree reconcile
→ ready item 하나 통합 또는 next item 하나 등록·새 task 생성 → 종료
work-item task → 구현·품질·직접 feedback·final commit → ready-for-integration
다음 standalone tick → 통합 → 다음 tick에서 새 업무를 반드시 새 task로 시작
```

- coordinator tick은 장시간 wait하지 않고 active task가 있으면 상태만 남기고 종료한다.
- 완료 task를 다른 work item에 재사용하지 않는다.
- 다음 미충족 gate를 소유한 open item이 없으면 roadmap에서 vertical work item 하나를 파생한다.
- bounded continuous improvement는 구체적 관찰 질문, 안전한 가역 default가 없는 비가역 제품 결정, Canonical Conflict, 외부 blocker, pause/cancel, 승인된 다음 milestone 부재 또는 roadmap 완료에서만 새 task 생성을 멈춘다.
- 일반 task 완료, tick 종료, unchanged timeout, 한 기능 통합과 이전 대화 context 소실은 전체 loop 종료 조건이 아니다.

### Standalone automation 계약

- 이름: `Polygon RPG 무상태 roadmap coordinator`
- 대상: saved `polygon-rpg` Git project의 local standalone cron run
- 기본 주기: 10분. 한 tick이 20분 lease 안에서 reconcile 한 번만 수행하므로 다음 실행과 겹치면 새 writer를 만들지 않고 종료한다.
- automation prompt는 `AGENTS.md`와 `dev-team-loop` Coordinator Tick/Manage mode를 읽고 one-tick decision order를 실행한 뒤 종료하도록 한다.
- heartbeat, 메인 대화 wakeup, 장기 wait, daemon, Orca manager와 외부 database를 기반으로 사용하지 않는다.
- automation을 사용할 수 없는 환경에서는 구현됐다고 기록하지 않고, 수동 대체 명령은 bare `$dev-team-loop` 한 번뿐이다.

## Work Item 등록과 task 생성

### 한 요청은 한 이력

- 하나의 독립 개발 요청은 기본적으로 work item 하나다.
- 팀장이 명시적으로 분리하지 않으면 여러 세부 기능도 하나의 수직 결과로 다룬다.
- status, priority, pause·cancel·reopen, integration·push, roadmap continue와 기존 ID 대상 추가 지시는 새 item이 아니다.
- 메인은 등록 전에 요청 재확인이나 계획 승인을 받지 않는다.

### Durable 등록과 dispatch

```text
팀장 요청 → ID와 최소 Git queue 문서 생성·push → 메인 대화 종료
다음 coordinator tick → exact title·main HEAD 재확인
→ 저장 project가 Git repository인지 확인
→ `WI-... 제목`의 새 Codex task를 managed worktree로 생성 → 종료
```

- 위치: `docs/development/work-items/<id>-<slug>.md`
- 기본 ID: `WI-YYYYMMDD-HHmmss`; Git과 Codex task title을 확인해 충돌에는 `-02`, `-03`을 붙인다.
- 문서에는 exact `task_title`, `registration_base`와 검증 가능한 `owned_paths`를 기록한다. Transient task ID는 기록하지 않는다.
- work-item task는 registration commit 이후의 main을 starting state로 사용한다.
- task prompt에는 exact ID/path, Run mode, ownership, direct-feedback 책임, final evidence 순서와 final worktree commit 요구를 포함한다.
- `create_thread` 계열의 사용자 소유 task 생성 기능만 사용한다. `fork_thread`, handoff, rename, 완료 task 재사용과 root subagent 대체를 금지한다.
- 새 task prompt는 work item·roadmap gate·Run mode·ownership·완료 조건만 전달하며 main/이전 업무 history를 상속하지 않는다.
- task 생성 뒤 coordinator는 wait/poll하지 않는다. 부분 실패는 다음 tick이 exact title과 Git registration으로 복구한다.

## Git 책임과 메시지 언어

### Stateless coordinator tick

- registration commit, final worktree commit의 main 통합, work-item `done`/integration hash, roadmap·canonical owner 갱신과 push를 직렬화한다.
- 시작 시 `scripts/roadmap-coordinator-lock.mjs`의 20분 lease를 얻고 exact main HEAD를 고정한다. mutation 직전 HEAD가 바뀌면 release 후 종료한다.
- latest `origin/main`, registration base, parent graph, item-owned diff와 실제 검증을 확인하고 history rewrite 없이 fast-forward·merge·cherry-pick 중 증거에 맞는 방식을 사용한다.
- 같은 registration/integration commit이 이미 존재하면 idempotent success로 처리한다.

### Work-item task

- item-owned code, 문서, work-item result와 report만 stage해 worktree에서 scoped commit한다.
- final 응답에서 `git rev-parse HEAD`의 final worktree commit hash를 제공한다.
- 같은 commit 안에 자기 hash를 기록하려 하지 않는다. Main이 통합 후 source worktree hash와 integration hash를 문서에 기록한다.
- push, merge, rebase, branch/main queue 변경과 다음 item 소비를 하지 않는다.

### 한국어 메시지 기준

- 에이전트가 새로 작성하는 local commit의 subject와 필요한 body는 기본적으로 한국어다.
- 명시적 merge commit message도 한국어를 사용하지만 fast-forward나 cherry-pick에 불필요한 merge commit을 만들지 않는다.
- 코드 식별자, 경로, 명령, work-item ID, branch, hash와 외부 issue 제목은 정확성을 위해 원문을 보존할 수 있다.
- 과거 이력을 이 규칙만으로 rewrite하거나 amend하지 않는다.

## 팀장 안내 문장 기준

메인 대화의 진행 보고와 각 업무 대화의 팀장-facing 답변에는 `COMM-TEAMLEAD-PLAIN-KO`를 적용한다. 내부 Git 문서와 agent 간 기술 계약은 정확성을 위해 기존 전문 용어와 상태값을 유지할 수 있다.

- 실제 기능명과 쉬운 한국어를 먼저 쓴다. `M2 feedback`처럼 내부 ID와 영어 용어만 조합하지 않는다.
- 내부 ID, commit hash, 파일 경로와 명령은 정확성에 필요할 때만 한국어 설명 뒤의 보조 정보로 둔다. 같은 내부 용어를 반복해서 덧붙이지 않는다.
- 처음부터 내부 용어 목록을 팀장에게 보여 주지 않는다. 현재 상황에 필요한 뜻만 문장 안에서 자연스럽게 설명한다.
- 질문을 받으면 첫 문장으로 그 뜻을 답하고, 뒤에 필요한 상태나 선택지를 붙인다.
- 진행 보고는 `무엇을 만들고 있음 → 무엇을 볼 수 있음 → 무엇이 막힘` 순서로 짧고 구체적으로 쓴다. 해당 내용이 없으면 억지로 항목을 만들지 않는다.
- `의견을 기다립니다`, `확인해 주세요`, `피드백이 필요합니다`처럼 판단 대상을 알 수 없는 문장을 단독으로 쓰지 않는다.
- 사람의 판단이 필요하지 않으면 `feedback` 상태로 멈추지 않고 검증·final commit·메인 반영 준비까지 진행한다.
- 사람의 판단이 꼭 필요하면 한 메시지에 `구현된 기능과 실행·플레이 경로`, `볼 위치 또는 조작 방법`, `관찰 가능한 질문 1~3개`, `답에 따라 바뀌는 것 한 줄`을 모두 쓴다.
- 메인은 task link와 정확한 판단 항목을 요약할 수 있지만 질문과 답은 해당 업무 담당 대화에 둔다. 구체적 항목이 없으면 `의견 대기`라고 보고하지 않는다.

다음 치환은 팀장에게 보이는 문장을 작성할 때 쓰는 내부 기준이며, 이 표 자체를 먼저 노출하지 않는다.

| 내부 표현                | 팀장에게 보이는 표현                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `M2` 같은 milestone ID   | `학원촌과 훈련장을 오가는 기능`처럼 실제 기능명. 필요하면 처음 한 번만 `(M2)`를 붙인다. |
| `feedback`               | 구체적 관찰 질문이 있을 때만 실제 기능명과 함께 설명하고, 없으면 대기하지 않는다.       |
| `candidate`              | `현재 구현 결과`                                                                        |
| `gate`                   | `완료 조건`                                                                             |
| `artifact`               | 문맥에 따라 `실행 화면` 또는 `플레이 결과`                                              |
| `integration`            | `메인 반영`                                                                             |
| `work item`              | `업무`                                                                                  |
| `root agent`, `Director` | `업무 담당 대화` 또는 문맥상 생략                                                       |
| `managed worktree`       | 팀장에게 폴더 경로를 설명해야 할 때만 `격리된 작업 폴더`                                |

## Work Item 상태

```text
queued → implementing → feedback → ready-for-integration → integrating → done
                 └────────────────→ ready-for-integration
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

- Git 문서는 durable queue/result source다.
- 진행 중 live state는 Codex task와 managed worktree가 소유한다.
- `feedback`은 자동 검증으로 정할 수 없는 구체적 관찰 질문이 있을 때만 같은 task/worktree에서 답을 기다린다.
- `ready-for-integration`은 task가 threshold·검증·final commit을 끝냈지만 main에 아직 통합되지 않은 상태다.
- `integrating`과 `done`은 standalone coordinator tick이 commit evidence로 확정한다.

## Scheduling과 one-tick 관찰

기본 우선순위는 팀장 명시 우선순위, 현재 playable slice의 버그, 현재 milestone 핵심 경로, dependency, 오래된 queue 순이다.

- 기본 roadmap loop는 current vertical item을 한 tick에서 통합하고, 다음 tick이 다음 task를 만든다.
- worktree 격리는 shared-checkout writer 제한을 대체하지만 dependency와 integration-order 검증을 없애지 않는다.
- coordinator는 exact title 기준 compact task 상태를 한 번 읽고 raw log polling·완료 대기·main context 복제를 하지 않는다.
- 사람의 판단이 필요한 상태에서는 task link와 구체적 관찰 질문을 제시하고 팀장이 그 task를 직접 연다.
- 완료 task의 final hash가 없거나 dirty tree가 남으면 통합하지 않는다.
- concurrent tick은 lease를 얻지 못하면 새 item/task를 만들지 않고 종료한다. Lease 뒤 main HEAD drift가 보이면 mutation을 중단한다.

## Candidate-First Quality Loop

```text
work-item task 시작
→ 요청·roadmap·코드·Reference에서 내부 실행 기준 추론
→ safe reversible candidate 구현
→ 가장 큰 병목 하나 개선
→ 결정적 검사 + 실제 artifact 관찰
→ 같은 rubric 재평가
→ task-internal 독립 검증
→ 필요할 때만 task에서 구체적 관찰 질문
→ result/report와 final worktree commit
→ 다음 coordinator tick의 검증·통합
```

- 개발·feedback 최소 단위는 처음부터 끝까지 실행 가능한 사용자 시나리오다.
- Renderer는 읽기 전용 RenderFrame만 소비하고 시간 기반 상태는 simulation에서 진행한다.
- 수학·frame·판정 검증과 실제 Canvas/모바일 관찰을 분리한다.
- 사용자 요청 없는 영구 test·fixture·script를 추가하지 않는다.
- 적용 품질 축에 0 또는 1이 남으면 feedback candidate나 final commit으로 제출하지 않는다.

## 팀장 의견과 자동 메인 반영

검사와 기존 요구사항만으로 결론을 낼 수 있으면 팀장 답을 기다리지 않고 검증·final commit·메인 반영 준비까지 진행한다. `review: team-lead`는 포괄적인 의견 대기를 허용하는 상태가 아니다.

조작감·타격감·Graphics·Effect나 양립할 수 없는 제품 방향처럼 사람의 관찰이 꼭 필요할 때만 업무 담당 대화에서 판단을 요청한다. 요청은 실제 기능과 실행·플레이 경로, 팀장이 볼 위치나 조작 방법, 관찰 가능한 질문 1~3개, 답에 따라 바뀌는 것 한 줄을 포함한다.

팀장 메인은 업무 대화 링크와 정확한 판단 항목을 쉬운 한국어로 보여 줄 수 있다. 질문과 답변은 해당 업무 담당 대화에서 직접 진행하며, 구체적 항목이 없으면 `의견 대기`라고 보고하지 않는다.

standalone coordinator tick은 final worktree commit을 독립적으로 확인한 뒤에만 통합한다.

## 완료 결과 전달과 업무보고

업무 담당 대화의 최종 답변 순서는 다음과 같다.

1. 실제 변경 파일
2. 새 동작 또는 볼 수 있는 플레이 결과
3. 실행한 검증과 확인하지 못한 범위
4. 업무보고 또는 업무 결과 링크
5. 최종 commit hash

- 플레이 가능한 수직 단위나 의미 있는 milestone은 `docs/development/reports/WI-...-<slug>.md`를 만든다.
- 작은 bug·문서 정합·maintenance는 work item의 `결과`가 업무보고다.
- 팀장 메인 context는 위 상세를 복제하지 않고 Git queue 상태와 task link만 보여 준다.

## Pause, Cancel, Reopen, Recovery

### Pause

- 팀장 메인은 pause 명령을 Git queue에 기록하고 종료한다. 다음 coordinator tick이 exact task에 전달하고 기다리지 않는다.
- 이후 tick이 task link와 checkpoint hash를 기록하지만 통합하지 않는다.
- Resume은 새 task를 만들지 않고 같은 task/worktree를 연다.

### Cancel

- 팀장 메인은 cancel 명령을 Git queue에 기록하고 종료한다. 다음 coordinator tick이 exact task에 전달하고, 이후 tick이 last commit·dirty paths·validation·영향을 reconcile한다.
- coordinator는 partial implementation을 cherry-pick하지 않고 main work-item 문서만 `cancelled`로 기록·push한다.
- managed worktree를 broad cleanup으로 삭제하지 않는다. Durable cancellation evidence 뒤 보존이 불필요할 때만 task를 archive하며 Codex snapshot/restore 경계를 따른다.
- 이미 통합된 결과는 history rewrite로 취소하지 않고 별도 revert work item을 만든다.

### Reopen

- 과거 item은 `cancelled`로 유지하고 `reopens`로 연결한 새 item과 새 Codex task를 만든다.

### Recovery

다음을 대조한다.

1. Git-tracked work item과 roadmap
2. exact `WI-... 제목`의 Codex task link/status/history
3. managed worktree 또는 Codex restore snapshot
4. final/checkpoint commit graph와 실제 diff
5. reports와 검증 evidence

같은 task/worktree를 우선 복구한다. 원본이 존재하거나 writer가 남아 있으면 replacement task를 만들지 않는다. 원본 소실과 writer 부재가 증명된 경우에만 같은 ID의 recovery task를 만들고 work item에 사건을 기록한다.

## Durable recovery와 팀장 상태 계약

Git과 task/worktree/commit evidence로 다음을 복구한다.

- `ID`
- `title`
- exact `task_title`과 열 수 있는 `task link`
- `status`
- `stop condition`
- `integration result`
- `registration_base`, `owned_paths`, source/final/integration commit

Changed tree, artifact, 구현 로그, 품질 tuning, blocking 질문의 내용과 팀장 feedback은 work-item task에 둔다. 이전 main/coordinator 대화의 기억과 transient task/subagent ID는 복구 근거가 아니다.

위 키는 내부 상태 계약이다. 팀장에게 메인 진행 상황을 보여 줄 때는 ID나 상태값만 나열하지 않고 다음 순서로 자연스럽게 번역한다.

1. `무엇을 만들고 있음`: 실제 기능명과 현재 단계
2. `무엇을 볼 수 있음`: 열어 볼 업무 대화나 이미 메인에 반영된 결과
3. `무엇이 막힘`: 팀장이 판단할 관찰 질문, 선택 또는 외부 문제를 구체적으로 설명

업무 ID, 대화 링크와 메인 반영 commit은 필요한 문장 뒤에 정확성 보조 정보로 붙인다.
