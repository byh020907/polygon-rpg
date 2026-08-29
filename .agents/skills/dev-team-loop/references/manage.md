# Manage Mode

The background manager is a replaceable Orca coordinator and the only Git writer in the main worktree. Its memory is not authoritative.

## Singleton Identity And Arbitration

The durable logical identity is:

```json
{
  "managerKey": "polygon-rpg-roadmap-manager-v1",
  "runObjective": "Polygon RPG roadmap loop [manager-key:polygon-rpg-roadmap-manager-v1]",
  "workspace": "the repository main worktree"
}
```

Resolve it before starting or recovering a manager:

1. Inspect ordinary non-legacy Runs with the exact objective, their bound coordinator terminals, every Polygon RPG Task/Dispatch and the repository main worktree.
2. A manager is live only when its bound coordinator terminal still exists, is writable and belongs to the main worktree. Idle or quiet output alone does not make it stale.
3. If exactly one live matching Run exists, reuse it.
4. If no live Run exists and exactly one matching stale Run exists, recover that same Run even when it currently has no open item or Task.
5. If multiple matching stale Runs exist, first select the only Run that owns all current open work-item Tasks/active Dispatches. If there is no open Task/Dispatch, select the Run with the greatest `updated_at`, breaking an exact timestamp tie by lexically smallest Run ID. Recover only that Run and treat the others as non-authoritative audit state.
6. If no matching Run and no conflicting Polygon RPG Task/Dispatch exists, start one manager conversation in main and create/bind one Run with the exact objective.
7. If multiple live candidates exist, open work/Dispatch ownership is split across Runs, or a nonmatching Run owns current Polygon RPG work, create and bind nothing. Return `manager-conflict` through the main-interface preflight receipt.

Terminal titles and recent output are discovery hints, not identity. Never create a second Run merely because the manager is idle, the terminal preview is old or a previous conversation ended at a prompt.

## Event Loop

For a `continue_roadmap` event, also read `start.md` for the operation and receipt schema.

For every registration, worker status, `worker_done`, cancellation, team-lead operation or restart:

1. Reconcile Git work items, roadmap, Orca Run/Task/Dispatch, worktree branch/status/comment and live terminals.
2. Process the triggering event exactly once.
3. Integrate or cancel settled work before starting dependent work.
4. When no open item owns the current milestone's next unmet gate, derive one work item for it.
5. Select ready items by priority and dependency.
6. Start workers until three are executing, unless the team lead authorized more.
7. Send lifecycle summaries to the main interface.
8. Continue after integration until a defined roadmap stop condition, otherwise wait for the next structured event without polling raw worker output.

`feedback` conversations and the manager itself do not count toward the three executing workers.

For `continue_roadmap`, deduplicate by `operationId`. Reconcile first, perform the logical action at most once, and echo the ID in a `continue_roadmap_receipt` using the schema in `start.md`. A receipt with `action: waiting` must not resume `feedback` without actual team-lead feedback in that work-item conversation.

## Registration

1. Allocate `WI-YYYYMMDD-HHmmss` as the stable ID. Check both Git work items and Orca Tasks; if the second collides, append the smallest deterministic suffix `-02`, `-03`, and so on. Use `<id>-<slug>.md` as the filename.
2. Create exactly one document from the schema by default. When `splitRequested` is true, use only the partitions explicitly named by the team lead and register each as an independent document, commit and receipt.
3. Preserve the team-lead original verbatim.
4. Infer priority, lane and dependencies without a product interview.
5. Commit only that new work-item document and push `main` immediately after fetching and verifying the remote tip.
6. Create the Orca Task using the work-item ID/path as its durable reference.

Reply to the main Interface with this receipt shape:

```json
{
  "kind": "registration_receipt",
  "workItemId": "WI-YYYYMMDD-HHmmss",
  "title": "short result-oriented title",
  "priority": "normal",
  "lane": "bugfix|maintenance|dedicated",
  "status": "queued|started",
  "worktree": null,
  "workerConversation": null,
  "dependencies": []
}
```

Populate worktree/conversation only after Orca confirms creation. Never return provisional IDs or guessed live state.

Do not store Run IDs, Dispatch IDs or terminal handles in Git.

## Roadmap Derivation

When no open item owns the approved current milestone's next unmet gate:

1. Compare the roadmap gate, integrated artifact, completed work items and every open item.
2. Choose the single largest unmet playable or quality gate that is not already owned.
3. Create a work item with `source: roadmap`, `source_ref` naming the milestone/gate and a factual derivation basis instead of invented team-lead prose.
4. Commit and push that document using the same durable registration rules, create its Orca Task and dispatch it when capacity allows.
5. After feedback/integration, reevaluate before deriving the next item.

Do not derive a new Product Requirement or speculative future-milestone item. Stop at team-lead feedback, a required product interview, Canonical Conflict, blocker, pause or no approved next milestone. A `continue_roadmap` operation resumes this reconciliation and never becomes a work item itself.

## Priority

Use this order unless the team lead overrides it:

1. explicit urgent/priority instruction;
2. bug or regression breaking the current playable slice;
3. current roadmap milestone's core path;
4. dependency that blocks other ready work;
5. oldest ready item.

Do not dispatch an item with incomplete dependencies.

## Placement

- Small bug/regression: permanent `bugfix` worktree, one item at a time, fresh conversation.
- Documentation, environment, internal maintenance or short research: permanent `maintenance` worktree, one item at a time, fresh conversation.
- Playable feature, large or ambiguous request: dedicated managed worktree and one conversation.

Reuse a lane only after its previous item is integrated or cancelled and the lane is clean at latest `main`. Never check out the same branch in two worktrees.

## Orca Coordination

- Maintain one current Run for the manager lifecycle.
- Map each work item to one authoritative root Task/Dispatch and Vertical Slice Director. Do not fan one work item out as peer root workers.
- Use supervised workers so completion, failure and cancellation have lifecycle authority.
- Give the worker its exact work-item path and tell it to use `dev-team-loop` Run mode.
- Treat bounded subtask workers as Director-owned lanes. Only the root Director can emit parent `feedback` or final `worker_done`; all executing subtask workers still count toward project capacity.
- Accept concise status messages; do not ingest raw worker logs into manager context.
- On `feedback`, release the execution slot but retain the conversation/worktree.
- On team-lead feedback in that conversation, mark the worker executing again when capacity allows.
- On valid `worker_done`, account for and release/retain the terminal according to current Orca guidance.

## Integration

1. Confirm the root Vertical Slice Director's final commit, work-item result, quality threshold, integrated artifact evidence and declared independent verification. Require a separate report only for a playable vertical slice or meaningful product milestone.
2. Confirm independent verification targeted the frozen candidate after the last writer change. If integration changes the candidate tree, rerun affected verification before push.
3. Fetch latest `origin/main`; never rewrite main or another shared branch.
4. Integrate in dependency order and resolve conflicts only in the owning scope.
5. Rerun checks affected by the new base or merge resolution.
6. Merge and push only from the manager-owned main worktree.
7. Review `규칙 후보`; promote only repeated or high-impact evidence to the single owning canonical document or deterministic check.
8. Mark the item `done`, update roadmap only when milestone state changed, and emit the lifecycle summary.
9. Sync a permanent lane to latest main before its next item; close a completed dedicated worktree.

Small proven bug fixes, document alignment and behavior-preserving internal changes may integrate automatically. Items with `review: team-lead`, including product feel, visuals and new features, wait for team-lead feedback.

## Pause And Resume

- Pause stops the current agent turn but preserves the conversation, worktree and unmerged diff.
- A paused item releases its execution slot but reserves its worktree; a permanent lane cannot consume another item until resume or cancel.
- If an urgent item needs the occupied lane, use a separate isolated worktree only when capacity and ownership allow it. Never reuse the paused checkout.
- Resume the same item, branch and conversation after reconciling current main and dependencies. Do not create a replacement Dispatch from a guess.

## Recovery

On manager restart, reconstruct state from Git work items, roadmap, Orca Task/Dispatch inbox, worktree comments/status, branches and terminals. If sources disagree, inspect the actual filesystem and branch before acting. Do not duplicate a Dispatch or cleanup from an assumption.

Rotate the manager conversation at a stable point when context becomes noisy. A replacement manager must reconstruct rather than inherit unverified prose memory.
