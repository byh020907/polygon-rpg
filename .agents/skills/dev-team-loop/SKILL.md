---
name: dev-team-loop
description: Run Polygon RPG's roadmap queue, one-user-owned-Codex-task-per-work-item execution, worktree commit integration, status recovery, or cancellation. A bare `$dev-team-loop` starts or resumes the approved roadmap loop. Do not use when the user explicitly asks to handle a request directly in the current task.
---

# Dev Team Loop

Use one project workflow while loading only the instructions for the current role.

## Required Context

Read [`docs/development/process.md`](../../../docs/development/process.md) and the current milestone in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md). Preserve `AGENTS.md` precedence and all authorization boundaries.

The team-lead-facing main task is only the roadmap, queue and Git-integration coordinator. Every work item executes from implementation through feedback and final commit in a separate user-owned Codex task, using a Codex-managed worktree by default for Git repositories. A subagent is only an internal helper of that work-item task; it is never the work item itself.

## Select One Mode

Choose the first matching mode.

1. **Cancel:** The user cancels or reopens an exact work item, or a work-item task receives cancellation. Read [`references/cancel.md`](references/cancel.md).
2. **Run:** This user-owned Codex task prompt identifies one work-item path or ID. Read [`references/run.md`](references/run.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
3. **Start/Continue:** This is a bare `$dev-team-loop` invocation in the main task or an explicit start/continue/resume roadmap request. Read [`references/start.md`](references/start.md).
4. **Manage:** The main coordinator is handling queue, task status, priority, integration, pause or recovery. Read [`references/manage.md`](references/manage.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
5. **Register:** The main coordinator receives a new development request. Read [`references/register.md`](references/register.md).

If the role is ambiguous, inspect Git work items, Codex task titles/status and repository/worktree commits. Do not create a second active task for the same item.

## Shared Invariants

- One independent team-lead development request creates one work item unless the team lead explicitly requests a split. Bare start/continue invocations and lifecycle operations do not.
- The approved roadmap is the default work source. When no open item owns its next unmet gate, derive one non-duplicate vertical work item and create a new Codex task for it.
- The main task only registers, queues, observes with compact task status, verifies commits, integrates, updates roadmap/Git history and starts the next item. It does not interview for product details, implement, tune quality or relay team-lead feedback.
- Each work item has exactly one user-owned Codex task and one Vertical Slice Director. The team lead opens that task directly to inspect code/artifacts and provide feedback there.
- Explicit team-lead intent is implementation input, never a request for reconfirmation. Implement a safe reversible candidate first; ask one short blocking choice only inside the work-item task when necessary.
- A Git work-item task uses a Codex-managed worktree by default. It owns its scoped files, verification, report and final worktree commit; it does not push, merge, consume another item or change main queue/roadmap state.
- Git work-item documents are minimal durable queue/result history. The work-item task and its worktree own live planning and execution evidence.
- Subagents are optional bounded helpers inside a work-item task for exploration, proven disjoint implementation or independent verification. Their parent work-item task integrates and verifies their results.
- The main coordinator owns registration commits, serialized integration into main, roadmap/result metadata commits and pushes. Work-item tasks own only their final scoped worktree commit.
- When an agent authors Git messages, follow the Korean message policy in `docs/development/process.md`.
- Do not add permanent tests unless the user explicitly requests them. Remove temporary validation artifacts.
- Do not copy Reference IP, assets, commands, maps, names, balance values or content.
- No force push, shared-history rewrite, guessed cleanup or mutation of another task's worktree.
- Do not submit a candidate with an applicable quality axis below the threshold in `docs/development/quality-loop.md`.
- Subagent success is not work-item success. The Director must integrate all lanes, rerun the end-to-end path and pass independent verification.
- Stop roadmap derivation only for concrete observable questions pending in the work-item task, a genuinely blocking unresolved product decision, canonical conflict, blocker, pause or absence of an approved next milestone.

## Team-Lead Wording

Apply [`docs/development/process.md`](../../../docs/development/process.md#팀장-안내-문장-기준) to every team-lead-facing reply. Never use a generic request for feedback or confirmation. If human judgment is unnecessary, continue through verification, final commit and integration readiness. If it is necessary, one message must state the implemented feature and play path, where/how to inspect it, 1–3 observable questions and one line describing what the answers change. Main may summarize those exact questions with the task link; answers stay in the work-item task.

## Completion

In a work-item task, use this team-lead-facing order: 실제 변경 파일; 새 동작 또는 플레이 결과; 검증; 업무 결과 링크; final commit hash. In the main task, lead with the actual feature and exact observable question before internal state, then add the task link. If there is no concrete question, do not report feedback waiting.
