---
name: dev-team-loop
description: Register plain new Polygon RPG development requests from the team-lead main conversation verbatim into the Markdown inbox, then run the approval-free file-memory loop. Fresh ticks continue one IN entry in its executor worktree through checkpoint, independent verification, merge/push or recovery. No "register" keyword is required. Do not register questions, status/lifecycle requests, examples/hypotheticals, or work explicitly requested directly in the current task.
---

# Dev Team Loop

Use [`docs/feedback/INBOX.md`](../../../docs/feedback/INBOX.md) as the only queue and lifecycle record for new development. Do not create parallel queue files or approval-gated implementation tasks.

## Required Context

Read [`loop/PROMPT.md`](../../../loop/PROMPT.md), the inbox, [`docs/DESIGN.md`](../../../docs/DESIGN.md), [`docs/STATUS.md`](../../../docs/STATUS.md), [`docs/development/process.md`](../../../docs/development/process.md) and [`docs/development/quality-loop.md`](../../../docs/development/quality-loop.md). Preserve `AGENTS.md`, the immutable raw request and authorization boundaries.

Each fresh coordinator run continues the same inbox entry and executor branch/worktree. Conversation memory is disposable; main inbox metadata and Git commits are durable.

## Select One Mode

Choose the first matching mode.

1. **Cancel/Reopen:** The user changes an exact `IN-*` entry lifecycle. Read [`references/cancel.md`](references/cancel.md).
2. **Coordinator Tick:** This is a scheduled run or explicit one-tick reconcile. Read [`references/manage.md`](references/manage.md) and [`references/inbox-schema.md`](references/inbox-schema.md).
3. **Start/Continue:** This is bare `$dev-team-loop` or an explicit start/resume request. Read [`references/start.md`](references/start.md).
4. **Register:** The team-lead main receives a plain imperative to build, change or fix the project, even without the words `register` or `inbox`. Read [`references/register.md`](references/register.md) and [`references/inbox-schema.md`](references/inbox-schema.md).

If ambiguous, inspect inbox entries, executor refs, `git worktree list --porcelain`, commit ancestry and lease. Do not create a second writer or a parallel queue document.

## Shared Invariants

- One plain new development request appends one `IN-*` entry unless explicitly split. The entire current user message is copied exactly, including wording and whitespace.
- `docs/feedback/INBOX.md` owns status, execution contract, current best, blocker and result; `docs/STATUS.md` is its current-state projection.
- The inbox is main-owned. Executor branches never edit it; after each branch checkpoint/final, the coordinator records that evidence on main in the same lifecycle transition.
- New entries use deterministic `codex/loop/<lowercase-in-id>` branches. Do not call `create_thread`, fork or handoff.
- Each tick acquires/renews/releases the lease and performs one transition: accept/provision, implement/checkpoint, fresh verification/finalize, integrate or recover.
- Checkpoint writer and final verifier are different fresh runs. Only a fresh-run verified clean final may merge.
- Integration은 merge commit에 `done` 원문·결과를 먼저 보존하고, 같은 transition의 cleanup commit에서 그 exact block만 live INBOX에서 제거한다.
- Normal edits, checks, Korean commits, executor branch pushes and non-rewriting main merge/push do not require approval.
- Human input blocks only a concrete non-inferable Product Decision, Canonical Conflict, credential or external condition. Generic approval waiting is invalid.
- Do not force push, rebase shared history, guess-delete worktrees or lower quality thresholds.
- Keep automation active until explicit pause or completion proof including no nonterminal inbox entry.

## Team-Lead Wording

Report `무엇을 만들고 있음 → 무엇을 볼 수 있음 → 무엇이 실제로 막힘` in plain Korean. The raw request stays verbatim in Git; derived titles and summaries never replace it.
