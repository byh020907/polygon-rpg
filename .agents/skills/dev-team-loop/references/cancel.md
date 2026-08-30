# Cancel Mode

Cancellation is terminal for one exact work item. Reopening creates a new item and a new user-owned Codex task linked with `reopens`.

## Team-Lead Main Intake

1. Require and resolve the exact work-item ID and authoritative task link/title.
2. Record the cancellation command on current clean main with a Korean scoped commit and push.
3. Return immediately. Do not wait, interrupt a subagent, manipulate another task's files or relay a reply.

## Stateless Coordinator Ticks

1. A tick finds the durable cancellation command and sends it to the exact authoritative task, then exits without waiting.
2. A later tick reconciles the task's last commit, dirty-tree paths, validation state and cancellation impact.
3. Mark the item `cancelled` with that evidence and push main. Do not cherry-pick partial implementation.
4. Do not manually delete the managed worktree. Archive only after durable cancellation evidence exists and continued recovery is unnecessary.

Report the outcome to the team lead in plain Korean: what work stopped, what remains visible or recoverable and whether anything is blocked. Keep the item ID, last commit and folder terminology as supporting evidence only when needed.

If the task cannot be reached, preserve its worktree and record `blocked` until ownership is proven. Never guess-clean a worktree.

## Work-Item Task

1. Stop new implementation and any item-owned subagents.
2. Inspect the current tree without broad reset or cleanup.
3. Report decisions, changed paths, last valid commit, uncommitted state, validation and cancellation impact.
4. Do not push, merge, integrate partial code or create a completion report. A safe checkpoint commit is allowed only when it preserves recoverable item-owned evidence and the cancellation request does not require discarding it.
5. End with `cancelled` or `blocked` evidence for the next coordinator tick.

## Already Integrated And Reopen

- Already integrated work is not cancelled by history rewrite. Register a new revert work item with impact analysis.
- Reopen creates a new work item and new Codex task, sets `reopens` to the old ID and reads the old request/result/cancellation evidence. The original remains `cancelled`.
