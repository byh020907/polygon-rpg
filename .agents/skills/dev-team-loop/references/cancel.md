# Cancel Mode

Cancellation is terminal for one exact work item. Reopening creates a new item and a new user-owned Codex task linked with `reopens`.

## Main Coordinator

1. Require and resolve the exact work-item ID and authoritative task link/title.
2. Inspect its Git document, task status, worktree/commit evidence and lifecycle.
3. Send cancellation to that exact task. Do not replace this with a subagent interrupt or manipulate another task's files.
4. Wait for the task to stop writing and return its last commit, dirty-tree paths, validation state and cancellation impact.
5. Mark the main work-item document `cancelled` with that evidence and a Korean scoped commit; push main.
6. Do not cherry-pick partial implementation. Do not manually delete the managed worktree. Archive the task only after durable cancellation evidence exists and continued recovery is unnecessary.

Report the outcome to the team lead in plain Korean: what work stopped, what remains visible or recoverable and whether anything is blocked. Keep the item ID, last commit and folder terminology as supporting evidence only when needed.

If the task cannot be reached, preserve its worktree and record `blocked` until ownership is proven. Never guess-clean a worktree.

## Work-Item Task

1. Stop new implementation and any item-owned subagents.
2. Inspect the current tree without broad reset or cleanup.
3. Report decisions, changed paths, last valid commit, uncommitted state, validation and cancellation impact.
4. Do not push, merge, integrate partial code or create a completion report. A safe checkpoint commit is allowed only when it preserves recoverable item-owned evidence and the cancellation request does not require discarding it.
5. End with `cancelled` or `blocked` evidence for the main coordinator.

## Already Integrated And Reopen

- Already integrated work is not cancelled by history rewrite. Register a new revert work item with impact analysis.
- Reopen creates a new work item and new Codex task, sets `reopens` to the old ID and reads the old request/result/cancellation evidence. The original remains `cancelled`.
