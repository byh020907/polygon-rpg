# Start Or Continue Mode

Bare `$dev-team-loop` or an explicit start/resume request authorizes one manual Direct Executor Coordinator transition. It does not create a work item, a long-running supervisor or an approval-gated task.

1. Read [`manage.md`](manage.md) and [`work-item-schema.md`](work-item-schema.md).
2. Reconstruct current state from main work items, executor refs/worktrees, commit graph, automation and lease.
3. Perform exactly one provision, implementation checkpoint, fresh verification/finalize, integration, recovery or completion transition.
4. Release the lease and return. The recurring automation owns later transitions.

Do not wait/poll after the transition and do not chain into the next item. A run ending is not a roadmap stop. Pause only for explicit team-lead pause or Manage mode's durable completion proof.

Report in plain Korean what is being built, the current durable phase/checkpoint or integrated result, and the exact real blocker. Do not request approval for normal execution or merge.
