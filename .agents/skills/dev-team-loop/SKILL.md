---
name: dev-team-loop
description: Run Polygon RPG's approval-free Git-state roadmap loop. Fresh scheduled or manual ticks directly continue one work item in its persistent executor branch/worktree, checkpoint, independently verify, merge and push, or recover/cancel it. A bare `$dev-team-loop` runs one reconcile transition. Do not use when the user explicitly asks to handle a feature directly in the current task.
---

# Dev Team Loop

Use the repository's Git-state controller instead of a long-lived supervisor conversation or an approval-gated work-item task.

## Required Context

Read [`docs/development/process.md`](../../../docs/development/process.md), [`docs/development/quality-loop.md`](../../../docs/development/quality-loop.md) and the current milestone in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md). Preserve `AGENTS.md`, explicit user scope and authorization boundaries.

The team-lead main task is the queue/status surface. Each fresh standalone coordinator run is the autonomous writer: it continues the same durable executor branch/worktree, performs one lifecycle transition, checkpoints or finalizes it, and later merges/pushes it without requesting command or merge approval. Conversation memory is disposable.

## Select One Mode

Choose the first matching mode.

1. **Cancel/Reopen:** The user changes an exact work item's lifecycle. Read [`references/cancel.md`](references/cancel.md).
2. **Coordinator Tick:** This is a scheduled run or an explicit one-tick reconcile request. Read [`references/manage.md`](references/manage.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
3. **Start/Continue:** This is bare `$dev-team-loop` or an explicit start/resume request. Read [`references/start.md`](references/start.md).
4. **Register:** The team-lead main task receives a new request, priority change or pause instruction. Read [`references/register.md`](references/register.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
5. **Legacy Run Recovery:** A pre-migration Codex-managed task explicitly names an old open item. Read [`references/run.md`](references/run.md). Do not create this mode for new items.

If ambiguous, inspect main work items, executor refs, `git worktree list --porcelain`, commit ancestry and lease. Do not create a second writer.

## Shared Invariants

- One independent team-lead request creates one work item unless the team lead explicitly splits it. Lifecycle and status requests do not.
- The approved roadmap is the default work source. When no open item owns its next unmet gate, derive one non-duplicate vertical item.
- New items use `executor: scheduled-coordinator` and deterministic `codex/roadmap/<lowercase-id>` branches. Do not call `create_thread`, fork, handoff or create a managed-worktree task for autonomous implementation.
- Persistent worktree, local/remote executor branch and commits are durable state. Run titles and transient task IDs are diagnostic only.
- Each tick acquires/renews/releases the repo lease and performs one lifecycle transition: provision, implement/checkpoint, fresh verification/finalize, integrate or recover.
- A long tick renews its 30-minute lease at least every 10 minutes and before every mutation. Main drift or unknown paths stop mutation without deleting evidence.
- The scheduled writer directly edits the executor worktree, runs the quality loop, commits Korean messages, pushes its branch, and later merges/pushes main. These normal operations do not require a separate approval question.
- The fresh run after the last writer is the independent verifier. A writer run cannot mark its own new candidate ready and integrate it in the same tick.
- Checkpoint commits preserve runnable current best; only a later fresh-run verified clean final is integration-ready.
- Integration uses a non-rewriting merge commit that includes the final branch and `done`/roadmap records atomically. Never force push, rebase shared history or guess-delete worktrees.
- Human input blocks only a concrete, non-inferable Product Decision, Canonical Conflict, credential or external system condition. Generic approval/feedback waiting is invalid.
- Do not add permanent tests for one-off failures. Two confirmed mechanically measurable repetitions may justify the smallest durable check.
- Do not stop automation until explicit pause or durable approved-roadmap completion proof.

## Team-Lead Wording

Report `무엇을 만들고 있음 → 무엇을 볼 수 있음 → 무엇이 실제로 막힘` in plain Korean. Do not ask for approval of plans, edits, commands, commits, merges or pushes. A real human decision includes the implemented path, inspection method, 1–3 observable questions and what the answer changes.

## Completion

For a transition, report actual changed files/result, verification, executor checkpoint/final or integration hash, and the next durable phase. For status-only main replies, show the feature and real blocker without dumping internal logs.
