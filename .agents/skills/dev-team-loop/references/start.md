# Start Or Continue Mode

Use this mode in the team-lead-facing main conversation when the team lead invokes `$dev-team-loop` without a separate development request, or explicitly says to start, continue or resume the approved roadmap.

## Canonical Start

The bare skill invocation is the canonical start command. It is an operation, not a work item.

1. Inspect Git work items, roadmap state, Orca Run/Task/Dispatch, worktrees and live terminals.
2. Resolve the manager using the singleton identity and arbitration contract in `manage.md`. Reuse or recover its Run; create a new manager only when no matching or conflicting manager state exists. If arbitration returns `manager-conflict`, the main interface emits the correlated conflict receipt below and stops without creating or binding a manager.
3. Generate one opaque operation ID for this invocation. Reuse that exact ID if delivery or receipt is uncertain, then send:

```json
{
  "kind": "continue_roadmap",
  "operationId": "opaque-main-invocation-id"
}
```

4. The manager reconciles active work before deriving anything. It may resume a genuinely resumable item or derive one item from the approved current milestone's next unmet gate.
5. If an item is waiting for team-lead feedback, do not resume it from the bare invocation. Return `waiting` with `stopCondition: team-lead-feedback`; only actual feedback in that work-item conversation resumes it.
6. Wait only for the correlated `continue_roadmap_receipt`. Do not wait in the main conversation for implementation.

Do not create a work item whose content is the skill invocation or “continue the roadmap.” Do not create a duplicate manager, root Task or Dispatch when recovery evidence already exists.

## Continued Operation

After the receipt, the manager keeps running `roadmap gate → work item → quality loop → feedback/integration → next gate` without another start invocation. A new invocation is needed only to recover or resume after pause, manager loss or an explicit stop. Feedback and product-decision stops require the missing answer in the same work-item conversation, not another bare invocation.

The loop remains bounded by the approved roadmap. Stop at team-lead feedback, a required product decision, Canonical Conflict, blocker, pause or no approved next milestone.

## Main Reply

After successful manager resolution, the manager replies with this exact shape and echoes `operationId`. If preflight cannot select a manager, the main interface emits the same shape with `managerState: conflict`, `action: blocked` and `stopCondition: manager-conflict`:

```json
{
  "kind": "continue_roadmap_receipt",
  "operationId": "opaque-main-invocation-id",
  "managerKey": "polygon-rpg-roadmap-manager-v1",
  "managerState": "started|reused|recovered|conflict",
  "milestone": "M1",
  "action": "active|resumed|derived|waiting|blocked|complete",
  "workItemId": null,
  "title": null,
  "status": null,
  "worktree": null,
  "stopCondition": null
}
```

Process one `operationId` idempotently. A replay returns the same logical outcome after state reconciliation instead of deriving another item.

Render only:

- current milestone;
- manager state (`started`, `reused`, `recovered` or `conflict`);
- active, resumed or newly derived work-item ID and title;
- current lifecycle state and worktree when started;
- the stop condition when no item can start.
