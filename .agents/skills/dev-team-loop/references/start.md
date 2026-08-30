# Start Or Continue Mode

Use this mode in the team-lead-facing main conversation when the team lead invokes `$dev-team-loop` without a separate development request, or explicitly says to start, continue or resume the approved roadmap.

## Canonical Start

The bare skill invocation is the canonical start command. It is an operation, not a work item, and explicitly authorizes this conversation to start or resume the next Codex root-agent work item.

1. Inspect Git work items, roadmap state, repository status and the current Codex subagent tree.
2. Reuse the exact root agent already associated with an open work item. If duplicates or conflicting writers exist, stop with `agent-conflict`.
3. Reconcile active work before deriving anything. Resume a genuinely resumable item or derive one item from the approved current milestone's next unmet gate.
4. If an item is waiting for team-lead feedback, do not resume it from the bare invocation. Return `waiting` with `stopCondition: team-lead-feedback`; actual feedback targeting that item resumes its existing root agent.
5. If no item owns the gate, register one roadmap-derived work item, commit and push only that durable registration, then spawn one root `worker` agent with the exact work-item path and Run-mode instruction.
6. Wait for the root agent's result or attention request. Keep raw exploration and command output inside the agent thread.

Do not create a work item whose content is the skill invocation or “continue the roadmap.” Do not create a separate manager task or duplicate root agent.

## Continued Operation

After start, the main coordinator keeps running `roadmap gate → work item → quality loop → feedback/integration → next gate` in this conversation until a defined stop condition.

- Use the native agent wait mechanism for active root agents; a timeout is only a checkpoint.
- Forward team-lead feedback to the same root agent with a follow-up task so its work-item context is preserved.
- Do not pause for approval of internal plans or work-item prose. A genuinely blocking decision is one short Yes/No or 2–3-choice interview; reversible choices become implemented defaults and are disclosed with the candidate.
- When a root agent completes, independently verify the frozen candidate, integrate from the main conversation, then reevaluate the roadmap before deriving another item.
- Do not keep a background manager task, polling terminal or external Run alive.

## Main Reply

For lifecycle-only start updates, render only:

- current milestone;
- active, resumed or newly derived work-item ID and title;
- current lifecycle state and root-agent thread when started;
- the stop condition when no item can start.

For feedback or completion, use the concrete result handoff defined by Run mode instead of this abbreviated start update.
