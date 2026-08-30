# Register Mode

Use this mode in the team-lead-facing main task. It records desired state; the scheduled direct executor performs development later.

## Classify

- One independent development request creates one work item unless explicitly split.
- Priority, additional direction, pause, cancel, reopen, integration/push and status for an exact item update that item instead of creating a duplicate.
- Bare start/continue and overall status are lifecycle operations, not feature items.

## Record And Return

1. Preserve the complete original request or exact lifecycle command.
2. Fetch/reconcile main items and executor branches enough to prevent duplicate registration.
3. Allocate `WI-YYYYMMDD-HHmmss`, adding the smallest suffix on collision.
4. Write the minimal item with `executor: scheduled-coordinator`, deterministic `executor_branch`, registration base, scoped owned paths, completion conditions and source.
5. Commit/push the queue mutation from clean current main with a Korean message.
6. If the coordinator was paused after roadmap completion, reactivate the same automation without changing its project, schedule, execution environment, model or prompt.
7. Return with the feature, queued state and actual blocker. Do not wait for a run.

Do not create/fork/handoff a Codex task, implementation worktree or subagent here. Provision belongs to the next coordinator tick. Do not implement, tune, integrate or ask for plan approval.

If main is dirty/diverged or another lease owns mutation, preserve all evidence and report the exact boundary. Do not guess-clean.
