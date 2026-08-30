# Register Mode

Use this mode only in the team-lead-facing main task. The main task is a Git queue intake/status surface, not the coordinator runtime.

## Classify

- A new independent development request creates one minimal work item unless the team lead explicitly requests a split.
- Priority, pause, cancel, reopen and additional direction for an exact item update that item's durable queue command; they do not create a second feature item.
- Overall status, automation state and bare start/continue are lifecycle operations, not work items.

## Record And Return

1. Preserve the user's complete original request or exact lifecycle command.
2. Reconcile Git work items and exact Codex task titles only enough to prevent duplicate registration.
3. Allocate the stable ID and write the minimal work-item/queue update with `task_title`, `registration_base`, `owned_paths` when known and source evidence.
4. Commit and push only that queue mutation from clean, current main with a concise Korean message.
5. Return immediately after reporting what was queued, which existing task can be opened and any real blocker.

Do not create a work-item task, implement, integrate, wait/poll, tune quality or relay feedback in this main request. The next standalone coordinator tick rechecks Git and creates or resumes the authoritative task.

If the main task cannot safely mutate because main is dirty, behind/ahead, or an ownership conflict exists, record nothing and report exact evidence. Do not guess-clean or move another task's worktree.

## Durable Partial-Failure Rule

Task creation is coordinator-owned and happens only after the registration commit is pushed. If a coordinator creates a task and exits before any follow-up record, a later tick finds the exact `WI-... 제목` and reconciles it. Transient task IDs are not stored in Git.
