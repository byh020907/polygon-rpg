# Work Item Schema

Store work items at `docs/development/work-items/<id>-<slug>.md`. The base ID is `WI-YYYYMMDD-HHmmss`; same-second registrations append `-02`, `-03`, and so on after checking Git and current Codex task titles.

A work item is a minimal durable queue/status/result record, not a plan for team-lead approval. Internal decomposition, Reference Briefs, execution/quality contracts and task lists remain in its user-owned Codex task unless a verified rule belongs in an existing canonical document.

```markdown
---
id: WI-YYYYMMDD-HHmmss
status: queued
priority: normal
lane: dedicated
created_at: YYYY-MM-DDTHH:mm:ss+09:00
depends_on: []
reopens: null
review: team-lead
source: team-lead
source_ref: null
task_title: WI-YYYYMMDD-HHmmss — 제목
registration_base: <full-main-commit>
owned_paths:
  - exact/path/or/directory/
---

# 제목

## 팀장 원문 또는 파생 근거

`source: team-lead`는 최초 요청을 그대로 보존한다. `source: roadmap`은 milestone, 미충족 gate와 현재 evidence를 기록한다.

## 결과

업무 담당 대화가 실제 변경 파일, 새 동작 또는 플레이 결과, 검증·독립 확인 범위, 품질 수준, 영향과 업무보고 링크를 기록한다. 구현 전에는 `진행 중`처럼 최소 상태만 둔다. 팀장에게 보이는 문장은 쉬운 한국어를 먼저 사용한다.

## 피드백

해당 업무 담당 대화에서 현재 구현 결과를 본 팀장의 의견과 변경 결과만 시간순으로 기록한다.

## 취소 기록

취소·대체된 경우 task/worktree의 부분 상태, 마지막 commit과 영향을 기록한다.

## 연결

최종 worktree commit, main integration commit과 업무보고를 기록한다. Work-item task는 final hash를 응답으로 반환하고, 다음 standalone coordinator tick이 통합 뒤 두 hash를 Git 문서에 기록한다.
```

## Allowed Values

- `status`: `queued`, `implementing`, `feedback`, `ready-for-integration`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`
- `priority`: `urgent`, `high`, `normal`, `low`
- `lane`: `bugfix`, `maintenance`, `dedicated`
- `review`: `team-lead`, `auto`
- `source`: `team-lead`, `roadmap`, `feedback`, `quality-rule`

`task_title` is the durable Codex task identity. `registration_base` pins the main commit from which the task was dispatched. `owned_paths` is the coordinator-verifiable write boundary; use the smallest practical explicit file or directory list and update it on main before scope expansion. Do not store transient task IDs.

## Ownership

- The team-lead main task creates or updates queue intent and returns. Stateless coordinator ticks dispatch, integrate, record results and update roadmap/main history.
- The one user-owned work-item task owns body/result/report edits while active and creates its final scoped worktree commit.
- The team lead gives candidate feedback directly in that task.
- Exact sidebar titles, registration base, owned paths, worktree and commit evidence recover identity. Task links may stay in a compact status response, but ephemeral runtime handles are not Git source of truth.
- Subagent IDs and internal task plans never enter Git.
- Historical `inbox`, `interviewing` or `ready` items are reconciled to the current states from task/worktree/Git evidence; those states are not used for new items.
