# Work Item Schema

Store work items at `docs/development/work-items/<id>-<slug>.md`. New autonomous items are owned by the scheduled coordinator and a deterministic Git branch, not by a Codex task title.

```markdown
---
id: WI-YYYYMMDD-HHmmss
status: queued
priority: normal
lane: dedicated
created_at: YYYY-MM-DDTHH:mm:ss+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
executor: scheduled-coordinator
executor_branch: codex/roadmap/wi-yyyymmdd-hhmmss
registration_base: <full-main-commit>
owned_paths:
  - exact/path/or/directory/
---

# 제목

## 팀장 원문 또는 파생 근거

`source: team-lead`는 요청 원문을 보존한다. `source: roadmap`은 milestone과 미충족 gate를 기록한다.

## 완료 조건

처음부터 끝까지 실행 가능한 결과, 품질 threshold, 필수 검증과 명시적 비범위를 쓴다.

## 실행 상태

- 단계: implementing | verifying | ready-for-integration
- 기준선:
- 현재 최선:
- 다음 병목:
- 마지막 checkpoint:
- 검증:

이 절은 executor branch에서 각 checkpoint와 함께 갱신한다. Main copy는 lifecycle queue view일 수 있으므로 다음 run은 branch copy와 commit graph를 함께 읽는다.

## 결과

실제 변경 파일, 새 동작/플레이 결과, 품질 수준, 검증과 report를 기록한다.

## 판단 대기

사람 판단이 정말 필요할 때만 구현된 경로, 볼 위치/조작, 질문 1~3개와 답이 바꾸는 것을 기록한다. 일반 승인 요청은 기록하지 않는다.

## 취소 기록

취소·대체 시 branch, checkpoint, dirty paths와 영향을 기록한다.

## 복구 기록

Worktree recreation, remote-branch recovery, main drift merge, correction checkpoint, push retry와 conflict evidence를 시간순으로 기록한다.

## 연결

Roadmap, report, checkpoint/final source commit을 기록한다. Main integration은 `이 문서를 done으로 만든 merge commit`처럼 self reference로 적고 실제 hash는 Git graph/run result에서 읽는다.
```

## Allowed Values

- `status`: `queued`, `implementing`, `verifying`, `ready-for-integration`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`
- `priority`: `urgent`, `high`, `normal`, `low`
- `lane`: `bugfix`, `maintenance`, `dedicated`
- `review`: `auto`, `team-lead`
- `source`: `team-lead`, `roadmap`, `feedback`, `quality-rule`
- `executor`: new items use `scheduled-coordinator`

`executor_branch` is the durable writer identity. Use `codex/roadmap/<lowercase-id>`. `registration_base` anchors initial main ancestry; integration uses the current merge base and branch-only diff. `owned_paths` is the smallest practical write boundary and must be expanded on main before out-of-scope edits.

Do not store absolute worktree paths, transient run/task/subagent IDs or internal plans. Git discovers the worktree from the branch. A missing local worktree can be rebuilt from the local/remote executor ref.

Historical items may retain `task_title`, Codex-managed worktree evidence and old states. Preserve them as legacy result history; do not copy those fields into new items.

## Ownership

- Team-lead main records queue/lifecycle intent and pushes it.
- Fresh coordinator runs own provision, implementation checkpoints, fresh verification, final branch commit, integration and roadmap status.
- One item has one executor branch and at most one registered persistent worktree writer.
- Team-lead feedback is durable input on main or the item; it never transfers Git ownership to a conversation.
- Optional subagents do not own branches, work items, final status or integration.
