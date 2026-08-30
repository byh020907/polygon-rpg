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
---

# 제목

## 팀장 원문 또는 파생 근거

`source: team-lead`는 최초 요청을 그대로 보존한다. `source: roadmap`은 milestone, 미충족 gate와 현재 evidence를 기록한다.

## 결과

Work-item task가 actual changed tree, behavior/play path, 검증·독립 확인 경계, 품질 threshold, 영향과 업무보고 링크를 기록한다. 구현 전에는 `진행 중`처럼 최소 상태만 둔다.

## 피드백

해당 task에서 실제 candidate를 본 팀장의 피드백과 변경 결과만 시간순으로 기록한다.

## 취소 기록

취소·대체된 경우 task/worktree의 부분 상태, 마지막 commit과 영향을 기록한다.

## 연결

최종 worktree commit, main integration commit과 업무보고를 기록한다. Work-item task는 final hash를 응답으로 반환하고, main coordinator가 통합 뒤 두 hash를 Git 문서에 기록한다.
```

## Allowed Values

- `status`: `queued`, `implementing`, `feedback`, `ready-for-integration`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`
- `priority`: `urgent`, `high`, `normal`, `low`
- `lane`: `bugfix`, `maintenance`, `dedicated`
- `review`: `team-lead`, `auto`
- `source`: `team-lead`, `roadmap`, `feedback`, `quality-rule`

## Ownership

- Main coordinator creates the document, integrates the task commit, records integration results and updates roadmap/main history.
- The one user-owned work-item task owns body/result/report edits while active and creates its final scoped worktree commit.
- The team lead gives candidate feedback directly in that task.
- Task links stay in compact main context and exact sidebar titles; do not guess or persist ephemeral runtime handles as source of truth.
- Subagent IDs and internal task plans never enter Git.
- Historical `inbox`, `interviewing` or `ready` items are reconciled to the current states from task/worktree/Git evidence; those states are not used for new items.
