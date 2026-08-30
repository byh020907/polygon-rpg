# Polygon RPG Codex-Native Development Process

이 문서는 사용자가 팀장으로 제품 방향과 우선순위를 결정하고, Codex 앱의 메인 task와 work-item task가 업무 등록·구현·직접 피드백·Git 통합을 지속하는 프로젝트 운영 계약이다.

Reference-Guided Engineering은 각 loop 안의 Engineering Decision을 담당한다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, 각 work item의 품질 rubric과 개선 loop는 [`quality-loop.md`](./quality-loop.md)가 소유한다.

프로젝트 개발 요청에는 기본적으로 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. 사용자가 `이번 건은 직접 처리`처럼 workflow 우회를 명시한 요청만 현재 task에서 일반 작업으로 처리한다.

## 공식 Codex 실행 근거

- [OpenAI Worktrees 문서](https://learn.chatgpt.com/docs/environments/git-worktrees)는 worktree가 같은 project의 여러 독립 chat을 서로 방해하지 않고 실행하게 하며, 기본 Codex-managed worktree는 보통 하나의 chat에 전용이고 같은 chat이 다시 돌아오면 같은 worktree를 유지한다고 설명한다.
- [OpenAI Subagents 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents)는 subagent workflow가 parent/main thread에서 병렬 agent 결과를 수집·통합하고, main thread가 최종 응답을 만든다고 설명한다.

따라서 Polygon RPG의 durable work item은 parent-main에 종속된 subagent가 아니라 사이드바에서 팀장이 직접 열 수 있는 사용자 소유 Codex task다. Subagent는 그 task 내부의 bounded helper다.

## 역할과 task 경계

### 팀장 — 사용자

- 핵심 재미, 제품 방향, 우선순위와 Reference를 결정한다.
- 사이드바의 work-item task를 직접 열어 실제 코드 트리, 실행 artifact와 검증을 본다.
- 구현된 candidate에 대한 feedback과 blocking 제품 선택을 해당 task에 직접 남긴다.
- 이미 밝힌 의도, 계획 문서와 코드에서 추론 가능한 Engineering Decision을 반복 승인하지 않는다.

### 메인 task — Roadmap / Queue / Integration Coordinator

- approved roadmap의 다음 미충족 gate와 Git work-item queue를 소유한다.
- work item 등록, 별도 Codex task 생성, compact wait/read, final commit 검증·통합, roadmap/Git 갱신과 다음 task 생성을 수행한다.
- 제품 인터뷰, 구현, 품질 tuning, artifact 대리 평가와 팀장-팀원 feedback 중계를 수행하지 않는다.
- main branch의 registration/integration/result commit과 push를 소유한다.
- context에는 `ID`, `title`, `task link`, `status`, `stop condition`, `integration result`만 유지한다.
- 별도 manager task, work-item 대체 root subagent 또는 외부 orchestration loop를 만들지 않는다.

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
- 기본 흐름은 `구현 → concrete candidate 검증 → task에서 실제 tree·동작·검증·업무보고 공개 → 팀장의 직접 feedback`이다.
- 계획, Reference Brief, 실행·품질 계약과 task list는 work-item task의 내부 context다.
- 현재 코드·roadmap·Reference에서 추론 가능하거나 안전하게 되돌릴 수 있는 선택은 먼저 구현한다.
- 구현을 실제로 막고 추론·가역 default가 불가능한 결정만 work-item task에서 한 번에 하나씩 묻는다. 질문은 Yes/No 또는 2~3개의 상호 배타적 선택지와 각 한 줄 영향만 제시한다.
- 메인 task는 이 질문이나 답을 대신 만들거나 전달하지 않는다. `stop condition: work-item-input`과 task link만 남긴다.

## Canonical 시작과 roadmap loop

메인 task에서 bare `$dev-team-loop`를 호출하면 approved roadmap loop를 시작하거나 복구한다. 호출 자체는 work item이 아니다.

```text
$dev-team-loop
→ Git work item·roadmap·Codex task·commit reconcile
→ 기존 work-item task compact 관찰 또는 다음 gate 등록
→ 새 Codex-managed worktree task 생성
→ task 내부 구현·품질·직접 feedback·final commit
→ 메인 commit 검증·통합·Git/roadmap 갱신
→ 다음 gate를 반드시 새 Codex task로 시작
```

- feedback 또는 blocking 선택 대기 중이면 메인은 task link와 stop condition만 보고하고 멈춘다.
- 완료 task를 다른 work item에 재사용하지 않는다.
- 다음 미충족 gate를 소유한 open item이 없으면 roadmap에서 vertical work item 하나를 파생한다.
- Canonical Conflict, 외부 blocker, pause 또는 승인된 다음 milestone 부재에서도 멈춘다.

## Work Item 등록과 task 생성

### 한 요청은 한 이력

- 하나의 독립 개발 요청은 기본적으로 work item 하나다.
- 팀장이 명시적으로 분리하지 않으면 여러 세부 기능도 하나의 수직 결과로 다룬다.
- status, priority, pause·cancel·reopen, integration·push, roadmap continue와 기존 ID 대상 추가 지시는 새 item이 아니다.
- 메인은 등록 전에 요청 재확인이나 계획 승인을 받지 않는다.

### Durable 등록과 dispatch

```text
팀장 요청 또는 roadmap gate
→ ID와 최소 work-item 문서 생성
→ main registration commit·push
→ 저장 project가 Git repository인지 확인
→ `WI-... 제목`의 새 Codex task를 managed worktree로 생성
→ task link/status/stop condition만 main context에 보존
```

- 위치: `docs/development/work-items/<id>-<slug>.md`
- 기본 ID: `WI-YYYYMMDD-HHmmss`; Git과 Codex task title을 확인해 충돌에는 `-02`, `-03`을 붙인다.
- work-item task는 registration commit 이후의 main을 starting state로 사용한다.
- task prompt에는 exact ID/path, Run mode, ownership, direct-feedback 책임, final evidence 순서와 final worktree commit 요구를 포함한다.
- ephemeral runtime handle은 Git source of truth로 저장하지 않는다. 정확한 `WI-... 제목`과 main의 clickable task link로 찾는다.

## Git 책임과 메시지 언어

### Main coordinator

- registration commit, final worktree commit의 main 통합, work-item `done`/integration hash, roadmap·canonical owner 갱신과 push를 소유한다.
- latest `origin/main`을 확인하고 history rewrite 없이 통합한다.
- final worktree commit은 commit graph와 diff를 실제로 확인한 뒤 cherry-pick 또는 동등한 non-rewriting 방식으로 통합한다.

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

## Work Item 상태

```text
queued → implementing → feedback → ready-for-integration → integrating → done
                 └────────────────→ ready-for-integration
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

- Git 문서는 durable queue/result source다.
- 진행 중 live state는 Codex task와 managed worktree가 소유한다.
- `feedback`은 같은 task/worktree를 보존하고 팀장의 직접 답을 기다린다.
- `ready-for-integration`은 task가 threshold·검증·final commit을 끝냈지만 main에 아직 통합되지 않은 상태다.
- `integrating`과 `done`은 메인 coordinator가 commit evidence로 확정한다.

## Scheduling과 task 관찰

기본 우선순위는 팀장 명시 우선순위, 현재 playable slice의 버그, 현재 milestone 핵심 경로, dependency, 오래된 queue 순이다.

- 기본 roadmap loop는 현재 vertical work-item task 하나를 완료·통합한 뒤 다음 task를 만든다.
- worktree 격리는 shared-checkout writer 제한을 대체하지만 dependency와 integration-order 검증을 없애지 않는다.
- 메인은 `wait`/`read` 계열의 compact task 상태만 사용하고 raw log를 polling하거나 main context에 복제하지 않는다.
- feedback/attention 상태에서는 task link와 stop condition을 제시하고 팀장이 그 task를 직접 연다.
- 완료 task의 final hash가 없거나 dirty tree가 남으면 통합하지 않는다.

## Candidate-First Quality Loop

```text
work-item task 시작
→ 요청·roadmap·코드·Reference에서 내부 실행 기준 추론
→ safe reversible candidate 구현
→ 가장 큰 병목 하나 개선
→ 결정적 검사 + 실제 artifact 관찰
→ 같은 rubric 재평가
→ task-internal 독립 검증
→ task에서 팀장 direct feedback
→ result/report와 final worktree commit
→ main 검증·통합
```

- 개발·feedback 최소 단위는 처음부터 끝까지 실행 가능한 사용자 시나리오다.
- Renderer는 읽기 전용 RenderFrame만 소비하고 시간 기반 상태는 simulation에서 진행한다.
- 수학·frame·판정 검증과 실제 Canvas/모바일 관찰을 분리한다.
- 사용자 요청 없는 영구 test·fixture·script를 추가하지 않는다.
- 적용 품질 축에 0 또는 1이 남으면 feedback candidate나 final commit으로 제출하지 않는다.

## Direct Feedback와 자동 통합

조작감·타격감·Graphics·Effect, 새 기능·제품 방향 또는 `review: team-lead` item은 work-item task에서 팀장의 직접 feedback을 거친다. Task는 actual changed tree, 플레이 경로, 검증, report/work-item link, rubric과 남은 병목을 보여준다.

명확한 작은 버그, 문서 정합과 외부 동작을 바꾸지 않는 안전한 내부 수정은 `review: auto`로 task가 검증·commit까지 완료할 수 있다. 제품 결과가 달라지면 task가 `review: team-lead`로 승격하고 직접 feedback을 기다린다.

메인은 두 경우 모두 final worktree commit을 독립적으로 확인한 뒤에만 통합한다.

## 완료 handoff와 업무보고

Work-item task의 final 응답 순서는 다음과 같다.

1. actual changed tree
2. 동작·플레이 경로
3. 실행한 검증과 독립 확인 경계
4. 업무보고 또는 work-item 결과 링크
5. final worktree commit hash

- 플레이 가능한 수직 단위나 의미 있는 milestone은 `docs/development/reports/WI-...-<slug>.md`를 만든다.
- 작은 bug·문서 정합·maintenance는 work item의 `결과`가 업무보고다.
- main context는 위 상세를 복제하지 않고 task link와 integration result만 남긴다.

## Pause, Cancel, Reopen, Recovery

### Pause

- 메인이 exact task에 pause를 전달하면 task는 새 write를 멈추고 changed paths, validation과 safe checkpoint commit을 남긴다.
- 메인은 task link와 checkpoint hash를 기록하지만 통합하지 않는다.
- Resume은 새 task를 만들지 않고 같은 task/worktree를 연다.

### Cancel

- exact task가 write/subagent를 멈추고 last commit, dirty paths, validation과 영향을 반환한다.
- 메인은 partial implementation을 cherry-pick하지 않고 main work-item 문서만 `cancelled`로 기록·push한다.
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

## 메인 context 계약

메인에는 다음만 남긴다.

- `ID`
- `title`
- `task link`
- `status`
- `stop condition`
- `integration result`

Changed tree, artifact, 구현 로그, 품질 tuning, blocking 질문의 내용과 팀장 feedback은 work-item task에 둔다.
