# Work Item Schema

Store work items at `docs/development/work-items/<id>-<slug>.md`. The base ID is `WI-YYYYMMDD-HHmmss`; same-second registrations append `-02`, `-03`, and so on after checking Git and active Codex agent assignments.

A work item is a minimal durable queue/status/result record, not a plan for team-lead approval. Internal decomposition, Reference Briefs, execution/quality contracts and task lists remain in the root-agent thread unless a verified rule belongs in an existing canonical document.

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

`source: team-lead`는 최초 요청을 그대로 보존한다. `source: roadmap`은 팀장 발언을 꾸며 쓰지 않고 milestone, 미충족 gate와 현재 evidence를 기록한다.

## 결과

구현 후 실제 changed code tree, behavior/play path, 검증·독립 확인 경계, 품질 threshold, 영향과 업무보고 링크를 기록한다. 구현 전에는 `진행 중`처럼 최소 상태만 둔다.

## 피드백

실제 candidate를 본 팀장의 피드백과 그에 따른 변경 결과만 시간순으로 기록한다. 사전 계획 승인이나 긴 인터뷰 문서를 넣지 않는다.

## 취소 기록

취소·대체된 경우 이유, 부분 상태와 영향을 기록한다.

## 연결

root agent task name, 최종 commit과 업무보고를 기록한다. 별도 보고서가 없는 maintenance item은 이 work item의 `결과`가 업무보고다. 런타임 agent ID는 쓰지 않는다.
```

## Allowed Values

- `status`: `queued`, `implementing`, `feedback`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`
- `priority`: `urgent`, `high`, `normal`, `low`
- `lane`: `bugfix`, `maintenance`, `dedicated`
- `review`: `team-lead`, `auto`
- `source`: `team-lead`, `roadmap`, `feedback`, `quality-rule`
- `source_ref`: 팀장 요청이면 `null`, 파생 item이면 milestone·work item·rule ID 등 durable source

## Ownership

- The main coordinator creates and integrates the document.
- The root agent owns decision/body edits while active but does not stage, commit or push.
- The coordinator does not edit the same work-item body while its root agent is writing.
- Live agent IDs are not durable and never enter Git.
- Historical `inbox`, `interviewing` or `ready` items are reconciled to `queued` or `implementing` from actual agent/filesystem evidence; those states are not used for new items.
