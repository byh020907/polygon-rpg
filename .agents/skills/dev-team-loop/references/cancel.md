# Cancel Mode

Cancellation is terminal for one exact work item. Reopening creates a new item linked with `reopens`.

## Before Mutation

1. Require the exact work-item ID.
2. Inspect its Git document, authoritative root agent, current checkout changes and lifecycle.
3. Interrupt the exact root agent and any item-owned supporting agents before changing files.
4. Determine whether the item is unstarted, uncommitted or already integrated.

## Unstarted

- Mark `inbox` or `queued` as `cancelled`.
- Record the reason and do not spawn an agent.
- Commit and push the cancellation document from the main conversation.

## Running Or Feedback

1. Confirm the exact root agent is stopped.
2. Record confirmed decisions, partial state, cancellation reason and impact.
3. Verify every changed path belongs only to this item.
4. Discard only proven item-owned, uncommitted implementation with targeted patches or file operations. Do not use broad reset/cleanup commands.
5. If user or other-agent ownership is mixed or uncertain, preserve everything and mark `blocked` instead.
6. Do not merge code and do not create a completion report.
7. Commit and push only the cancellation history after the checkout is safe.

The user's cancellation authorizes discarding this item's proven agent-owned partial implementation, not unrelated changes.

## Already Integrated

Do not rewrite or silently revert main. Register a new work item describing the desired revert and link the integrated item.

## Reopen

- Create a new work item and root agent.
- Set `reopens` to the cancelled item ID.
- Read the old decisions and cancellation reason before the new interview.
- Leave the original item `cancelled`.
