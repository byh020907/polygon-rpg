# Manage Mode

The team-lead-facing main conversation is the roadmap coordinator and the only Git integration writer. Its memory is not authoritative.

## Agent Identity And Recovery

Each open work item has one durable ID and at most one authoritative root developer agent.

1. Reconcile Git-tracked work items, roadmap state, repository status and the current Codex agent tree.
2. Match a root agent by the exact work-item ID/path in its assigned task. Titles and recent prose are hints, not identity.
3. Reuse the one matching live or idle root agent with a follow-up task.
4. If no agent exists for a resumable open item, spawn one replacement only after confirming that no writer is still active and tell it to reconstruct from Git and the work item.
5. If multiple agents claim the same item, ownership is split, or unrelated changes overlap the item, create nothing and report `agent-conflict`.

Do not persist agent IDs in Git. The work-item ID, file, commits and reports are durable; agent handles are live routing state.

## Coordinator Loop

For registration, worker results, cancellation, team-lead operations or recovery:

1. Reconcile Git work items, roadmap, agent state and the actual checkout.
2. Process the triggering event once.
3. Integrate or cancel settled work before starting dependent work.
4. Derive one roadmap item only when no open item owns the next unmet gate.
5. Keep one write-heavy root item active. Permit parallel supporting agents only inside its frozen, disjoint contract.
6. Wait for the root agent's final result or attention request without polling raw logs.
7. Continue after automatic integration until a defined roadmap stop condition.

## Registration

1. Allocate `WI-YYYYMMDD-HHmmss` as the stable ID. Check Git work items and active agent assignments; on collision append the smallest deterministic suffix `-02`, `-03`, and so on.
2. Create exactly one document from the schema unless the team lead explicitly requested a split.
3. Preserve the team-lead original verbatim, or record factual roadmap derivation evidence.
4. Infer priority, lane and dependencies without reconfirming the request.
5. Commit only the new work-item document with a concise, result-oriented Korean subject and push `main` after verifying the remote tip.
6. Spawn one root `worker` agent with the exact work-item path and Run-mode instruction when capacity and dependencies allow.

Reply with the confirmed ID, title, priority, lane, queued/started state, root-agent task name and dependencies. Never return guessed live state.

## Roadmap Derivation

When no open item owns the approved current milestone's next unmet gate:

1. Compare the roadmap gate, integrated artifact, completed work items and every open item.
2. Choose the single largest unmet playable or quality gate that is not already owned.
3. Register it with `source: roadmap` and an exact milestone/gate reference.
4. Start its root Director when safe, then wait for its quality-loop result.

Do not invent a Product Requirement or speculative future-milestone item. Use safe reversible defaults and disclose them with the candidate. Stop only at team-lead feedback on a concrete candidate, one genuinely blocking product decision, Canonical Conflict, blocker, pause or no approved next milestone.

## Priority And Placement

Use this order unless the team lead overrides it:

1. explicit urgent/priority instruction;
2. bug or regression breaking the current playable slice;
3. current roadmap milestone's core path;
4. dependency blocking other work;
5. oldest queued item.

The root agent works in the shared checkout under strict path ownership. `lane` is scheduling metadata, not a permanent workspace. When concrete filesystem or branch isolation is required, use a Codex-managed worktree only with an explicitly created task; otherwise serialize write-heavy work.

## Codex Coordination

- Map each work item to one authoritative root `worker` agent and Vertical Slice Director.
- Give it the exact work-item path and tell it to use `dev-team-loop` Run mode.
- Use `explorer` agents for narrow codebase questions and a read-only verifier for the frozen candidate.
- Supporting agents return to the Director; only the root Director may declare parent feedback readiness or completion.
- On feedback, retain the root agent. Forward actual feedback with a follow-up task instead of spawning a replacement.
- On completion, independently verify after the last writer change, then account for and close or retain supporting agents.

## Integration

1. Confirm the root Director's actual changed code tree, behavior/play path, quality threshold, integrated artifact evidence, work-report path and declared verification boundary.
2. Freeze writes and run an independent read-only verification of the current candidate.
3. Fetch latest `origin/main`; never rewrite shared history.
4. Inspect and stage only paths owned by the item, run affected checks and create a scoped commit from the main conversation. Use a concise, result-oriented Korean subject and Korean body when one is needed. If integration genuinely requires an explicitly authored merge commit, its message follows the same rule; do not create one for a fast-forward merge solely to provide a message.
5. Push `main`, mark the item `done`, and update roadmap only when milestone state changed.
6. Review rule candidates and promote only repeated or high-impact evidence to one canonical owner.
7. Reevaluate the roadmap before starting another root item.

Items with product feel, visuals, new features or `review: team-lead` wait for feedback on the concrete candidate before integration. The user-facing handoff leads with code tree, behavior/play path, verification and work-report link and never ends in a plan approval request. Small proven bug fixes, document alignment and behavior-preserving internal changes may integrate automatically.

## Pause, Cancel And Recovery

- Pause preserves the root agent, work item and checkout changes while stopping new writes.
- Resume the same root agent after reconciling Git and dependencies.
- Cancellation interrupts the exact agent, then discards only proven item-owned uncommitted changes.
- On coordinator restart, reconstruct from Git work items, roadmap, agent state and the actual filesystem. Never duplicate an agent or cleanup from a guess.
