# Manage Mode

The background manager is a replaceable Orca coordinator and the only Git writer in the main worktree. Its memory is not authoritative.

## Event Loop

For every registration, worker status, `worker_done`, cancellation, team-lead operation or restart:

1. Reconcile Git work items, roadmap, Orca Run/Task/Dispatch, worktree branch/status/comment and live terminals.
2. Process the triggering event exactly once.
3. Integrate or cancel settled work before starting dependent work.
4. Select ready items by priority and dependency.
5. Start workers until three are executing, unless the team lead authorized more.
6. Send lifecycle summaries to the main interface.
7. Wait for the next structured event without polling raw worker output.

`feedback` conversations and the manager itself do not count toward the three executing workers.

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
