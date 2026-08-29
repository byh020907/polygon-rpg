# Cancel Mode

Cancellation is terminal for one exact work item. Reopening creates a new item linked with `reopens`.

## Before Mutation

1. Require the exact work-item ID.
2. Inspect its Git document, Orca Task/Dispatch, worktree, branch, terminal and current lifecycle.
3. Stop new writes and signal the worker through the authoritative Dispatch when one exists.
4. Determine whether the item is unstarted, unmerged, or already integrated.

## Unstarted

- Mark `inbox` or `queued` as `cancelled`.
- Record the reason and do not dispatch it.
- Commit and push the cancellation document from the manager-owned main worktree.

## Running Or Feedback

1. Stop the exact supervised worker; do not close unrelated terminals.
2. Record confirmed decisions, partial state, cancellation reason and impact in the work item.
3. Verify every changed path belongs only to this item.
4. Discard only that agent-owned, unmerged implementation. Do not use broad reset/cleanup commands.
5. If user/other-work ownership is mixed or uncertain, preserve everything and mark `blocked` instead.
6. Do not merge code and do not create a completion report.
7. Commit/push the cancellation history from main, then clean and sync a permanent lane or close the dedicated worktree.

The user's cancellation authorizes discarding this item's proven agent-owned partial implementation, not unrelated changes.

## Already Integrated

Do not rewrite or silently revert main. Register a new work item describing the desired revert and link the integrated item.

## Reopen

- Create a new work item and conversation.
- Set `reopens` to the cancelled item ID.
- Read the old decisions and cancellation reason before the new interview.
- Leave the original item `cancelled`.
