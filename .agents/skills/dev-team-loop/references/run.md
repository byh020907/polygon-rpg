# Run Mode

One developer conversation owns one work item from interview through feedback and final handoff.

## Start

1. Read the exact work-item document, roadmap milestone, project process and relevant canonical system docs.
2. Verify worktree/branch ownership and current Git state.
3. Update the worktree comment with the work-item ID and current phase.
4. Keep all product interviews in this conversation, never the main conversation.

## Interview

- Ask one focused product question at a time when results could materially diverge.
- Present concrete result direction and impact, not a generic permission question.
- Append decisions to the same work item.
- Refinements stay in the same item/conversation. Create another item only when the team lead explicitly splits it or the goal is independent.
- Once direction is clear, continue autonomously and report what was done, what comes next and the expected impact.

## Reference And Contract

Before implementation, complete the work item's Reference Brief and execution contract:

- product and Engineering References;
- adopt/adapt/principle-only/reject decisions;
- playable start-to-finish scenario;
- ownership paths/public contracts;
- completion gates and explicit non-scope;
- local/mobile feedback path.

## Implement And Evaluate

- Implement the complete playable slice, not isolated feature checkboxes.
- Use subagents only for genuinely independent read-heavy or disjoint ownership work.
- Keep gameplay, presentation and content writers off the same unfrozen public contract.
- Verify deterministic frame/state behavior separately from the actual Canvas path.
- Compare the result against the Reference Brief and core feel gate.
- If the same acceptance gate fails twice without new evidence or design change, stop tuning and enter `feedback`.
- Repeated blockers or unclear ownership enter `blocked`.

## Feedback

For product feel, visuals, new features or any item with `review: team-lead`:

1. Prepare the Orca local/mobile playable path.
2. Summarize result direction, impact and exactly what the team lead should experience.
3. Send a concise `feedback` status to the manager and return the execution slot.
4. End the turn in this conversation and wait for the team lead here.
5. Resume the same context when feedback arrives and capacity is available.

Do not send `worker_done` while feedback or implementation remains.

## Finish

1. Set the final work-item state and append the accepted decisions.
2. For a playable vertical slice or meaningful product milestone, write one intent-first report under `docs/development/reports/`. For a small bug, document alignment or maintenance item, record the concise result in the work item and do not create a separate report.
3. Stage only owned files, inspect the staged diff and create the scoped final commit.
4. Send `worker_done` exactly once with result, files modified and verification boundary. Include `report-path` only when a separate report exists.
5. End the turn. Do not consume the next item.

Routine, unambiguous bug fixes may use `review: auto` only when behavior and acceptance are already explicit. Promote the item to `review: team-lead` when the result changes control feel, visuals, product rules or public data.
