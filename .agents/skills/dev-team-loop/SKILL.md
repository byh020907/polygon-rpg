---
name: dev-team-loop
description: Run Polygon RPG's roadmap queue, one-user-owned-Codex-task-per-work-item execution, worktree commit integration, status recovery, or cancellation. A bare `$dev-team-loop` starts or resumes the approved roadmap loop. Do not use when the user explicitly asks to handle a request directly in the current task.
---

# Dev Team Loop

Use one project workflow while loading only the instructions for the current role.

## Required Context

Read [`docs/development/process.md`](../../../docs/development/process.md) and the current milestone in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md). Preserve `AGENTS.md` precedence and all authorization boundaries.

The team-lead-facing main task is only the Git queue intake and status surface. A fresh standalone coordinator tick owns queue reconciliation, task dispatch and Git integration without relying on prior conversation memory. Every work item executes from implementation through feedback and final commit in a separate user-owned Codex task, using a Codex-managed worktree by default for Git repositories. A subagent is only an internal helper of that work-item task; it is never the work item itself.

## Select One Mode

Choose the first matching mode.

1. **Cancel:** The user cancels or reopens an exact work item, or a work-item task receives cancellation. Read [`references/cancel.md`](references/cancel.md).
2. **Run:** This user-owned Codex task prompt identifies one work-item path or ID. Read [`references/run.md`](references/run.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
3. **Coordinator Tick:** This is a standalone automation run or an explicit request to run one reconcile tick. Read [`references/manage.md`](references/manage.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
4. **Start/Continue:** This is a bare `$dev-team-loop` invocation or an explicit start/continue/resume roadmap request. Read [`references/start.md`](references/start.md); it delegates one manual coordinator tick and returns.
5. **Register:** The team-lead main task receives a new request, priority change, pause, cancel or reopen instruction. Read [`references/register.md`](references/register.md).

If the role is ambiguous, inspect Git work items, Codex task titles/status and repository/worktree commits. Do not create a second active task for the same item.

## Shared Invariants

- One independent team-lead development request creates one work item unless the team lead explicitly requests a split. Bare start/continue invocations and lifecycle operations do not.
- The approved roadmap is the default work source. When no open item owns its next unmet gate, derive one non-duplicate vertical work item and create a new Codex task for it.
- The team-lead main task only writes new requests and lifecycle commands to Git queue, reports compact state and manages the coordinator automation. It does not wait for completion, integrate, implement, tune quality or relay feedback.
- Every coordinator tick starts from a fresh standalone context, acquires the repo-local lease, reconciles Git/task/worktree/commit evidence once, performs one forward or recovery action, releases the lease and exits. Prior main/coordinator memory and transient IDs are never authoritative.
- A coordinator may repair a malformed work-item task title only when one open item, one matching task/worktree, registration ancestry and owned paths prove a unique identity. Ambiguity remains `task-conflict`.
- Each work item has exactly one user-owned Codex task and one Vertical Slice Director. The team lead opens that task directly to inspect code/artifacts and provide feedback there.
- Explicit team-lead intent is implementation input, never a request for reconfirmation. Implement a safe reversible candidate first; ask one short blocking choice only inside the work-item task when necessary.
- A Git work-item task uses a Codex-managed worktree by default. It owns its scoped files, verification, report and final worktree commit; it does not push, merge, consume another item or change main queue/roadmap state.
- Git work-item documents are minimal durable queue/result history. The work-item task and its worktree own live planning and execution evidence.
- Subagents are optional bounded helpers inside a work-item task for exploration, proven disjoint implementation or independent verification. Their parent work-item task integrates and verifies their results.
- Coordinator ticks own serialized registration/integration/result commits and pushes. Work-item tasks own only their final scoped worktree commit.
- When an agent authors Git messages, follow the Korean message policy in `docs/development/process.md`.
- Do not add permanent tests unless the user explicitly requests them. Remove temporary validation artifacts.
- Do not copy Reference IP, assets, commands, maps, names, balance values or content.
- No force push, shared-history rewrite, guessed cleanup or mutation of another task's worktree.
- Do not submit a candidate with an applicable quality axis below the threshold in `docs/development/quality-loop.md`.
- Subagent success is not work-item success. The Director must integrate all lanes, rerun the end-to-end path and pass independent verification.
- Human questions, canonical conflicts and external blockers suspend new vertical dispatch but do not stop the recurring automation; later ticks keep observing and recover when evidence changes. Pause only on explicit team-lead pause or after durable roadmap-completion proof.

## Team-Lead Wording

Apply [`docs/development/process.md`](../../../docs/development/process.md#팀장-안내-문장-기준) to every team-lead-facing reply. Never use a generic request for feedback or confirmation. If human judgment is unnecessary, continue through verification, final commit and integration readiness. If it is necessary, one message must state the implemented feature and play path, where/how to inspect it, 1–3 observable questions and one line describing what the answers change. Main may summarize those exact questions with the task link; answers stay in the work-item task.

## Completion

In a work-item task, use this team-lead-facing order: 실제 변경 파일; 새 동작 또는 플레이 결과; 검증; 업무 결과 링크; final commit hash. In the team-lead main task, report `what is being built → what task can be opened → what is actually blocked`. If there is no concrete question, do not report feedback waiting.
