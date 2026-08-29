# Run Mode

One root developer subagent owns one work item from interview through feedback readiness and final handoff.

This developer is the work item's sole Vertical Slice Director and quality owner. Bounded supporting agents may contribute, but they do not become peer owners.

## Start

1. Read the exact work-item document, roadmap milestone, project process, `docs/development/quality-loop.md` and relevant canonical system docs.
2. Verify assigned path ownership and current Git state. Do not create branches, commits, pushes or worktrees; the main coordinator owns Git integration.
3. Keep product interviews and implementation detail in this agent thread. Return only concise lifecycle summaries to the parent.

## Interview

- Ask one focused product question when results could materially diverge.
- Present concrete result direction and impact, not a generic permission question.
- Append accepted decisions to the same work item.
- Refinements stay in the same item and agent thread. The parent reuses this agent with follow-up tasks.
- Once direction is clear, continue autonomously.

## Reference And Contract

Before implementation, complete the work item's Reference Brief, execution contract and quality contract:

- product and Engineering References with adopt/adapt/principle-only/reject decisions;
- playable start-to-finish scenario, ownership paths, public contracts and non-scope;
- applicable rubric axes, target level, baseline evidence and stopping conditions;
- actual artifact/local/mobile feedback path and rule candidates.

Do not ask for implementation details that the roadmap, code and References already establish.

## Implement And Evaluate

- Implement the complete playable slice, not isolated feature checkboxes.
- Treat each iteration as `baseline → largest bottleneck → one focused change → deterministic checks → artifact inspection → rescore`.
- Use `explorer` or supporting agents only for genuinely independent read-heavy or disjoint ownership work.
- Before delegation, freeze the shared contract and assign exact paths/results. Supporting agents do not change the parent scope, rubric, work-item document, report, feedback state or completion.
- Integrate every supporting result, rerun the full playable path and rescore the combined artifact.
- Verify deterministic frame/state behavior separately from the actual Canvas path.
- Keep current best scores, evidence, next bottleneck and rule candidates in the work item.
- A long or risky tuning pass may use an uncommitted checkpoint description after functional checks pass; only the main coordinator creates Git commits.
- Freeze the last writer result and request an independent read-only verifier through the parent before feedback or completion.
- Do not enter feedback or completion while an applicable quality axis is 0 or 1.
- If the same acceptance gate fails twice without new evidence or design change, return `feedback` with the unresolved choice.
- Repeated blockers or unclear ownership return `blocked`.

## Feedback

For product feel, visuals, new features or any item with `review: team-lead`:

1. Prepare the best available local/mobile playable path.
2. Return a concise `feedback` result with rubric level, remaining bottleneck and exactly what the team lead should experience.
3. End the turn without committing. The parent retains this agent and forwards actual feedback with a follow-up task.

Do not declare completion while feedback or implementation remains.

## Finish

1. Set the final work-item state and append accepted decisions.
2. For a playable vertical slice or meaningful milestone, write one intent-first report under `docs/development/reports/`. Small maintenance items use the work-item result only.
3. Confirm the quality threshold and artifact evidence, then return a final summary with owned files, validation results, verification boundary and optional report path.
4. End the turn. Do not stage, commit, push or consume the next item.

Routine, unambiguous bug fixes may use `review: auto` only when behavior and acceptance are already explicit. Promote the item to `review: team-lead` when the result changes control feel, visuals, product rules or public data.
