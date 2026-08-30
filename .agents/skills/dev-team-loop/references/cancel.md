# Cancel, Pause And Reopen

Lifecycle commands mutate Git desired state; they do not message or wait on a work-item conversation.

## Team-Lead Main

1. Resolve the exact item and its executor branch.
2. Record pause/cancel/reopen intent on clean current main with a Korean commit and push.
3. Return with what stops, which checkpoint/branch remains recoverable and any actual blocker.

## Coordinator Tick

- **Pause:** stop executor writes and integration. Preserve branch/worktree/checkpoints. Resume reuses them.
- **Cancel:** inspect branch HEAD, dirty owned/unknown paths, last valid checkpoint and validation. Record `cancelled` on main; do not merge partial code or delete branches/worktrees.
- **Reopen:** keep the old terminal item and create a new linked item with `reopens`, a new deterministic executor branch and fresh completion conditions.
- **Already integrated:** register a separate revert item when rollback is desired. Never rewrite shared history.

An unreachable or dirty executor is evidence, not permission to clean it. Unknown paths produce `blocked/conflict` until ownership is proven. Normal cancellation does not need approval prompts or a replacement task.
