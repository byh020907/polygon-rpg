# Run Mode

One root developer subagent owns one work item from implementation through concrete-candidate feedback and final handoff.

This developer is the work item's sole Vertical Slice Director and quality owner. Bounded supporting agents may contribute, but they do not become peer owners.

## Start

1. Read the exact work-item document, roadmap milestone, project process, `docs/development/quality-loop.md` and relevant canonical system docs.
2. Verify assigned path ownership and current Git state. Do not create branches, commits, pushes or worktrees; the main coordinator owns Git integration.
3. Treat the team lead's explicit intent as implementation input. Do not reinterpret it as a request to approve a plan, Reference Brief, execution contract, quality contract, task list or work-item document.
4. Keep internal planning and implementation detail in this agent thread. Return only concise lifecycle summaries and concrete result evidence to the parent.

## Blocking Decision Interview

- Default to the safest reversible implementation that fits the stated intent, roadmap, current code and verified References. Disclose the default after the candidate exists; do not request pre-approval.
- Ask only when a decision genuinely blocks implementation, materially changes the product and cannot be safely inferred or made reversible.
- Ask exactly one short question. Its answer must be Yes/No or one of 2–3 mutually exclusive choices, each with a one-line impact. Never send a planning document as the question.
- Record the answer as concise feedback in the same work item, then continue autonomously in the same agent thread.

## Internal Execution Frame

Before editing, determine only the internal context needed to execute safely:

- product and Engineering References with adopt/adapt/principle-only/reject decisions;
- playable start-to-finish scenario, ownership paths, public contracts and non-scope;
- applicable rubric axes, target level, baseline evidence and stopping conditions;
- actual artifact/local/mobile feedback path and rule candidates.

Keep this transient in the agent thread unless a verified decision belongs in a canonical owner document or the implemented result belongs in the work item/report. Do not make completion of planning sections a lifecycle gate. Do not ask for details that the request, roadmap, code and References already establish.

## Implement And Evaluate

- Implement the complete playable slice, not isolated feature checkboxes.
- Treat each iteration as `baseline → largest bottleneck → one focused change → deterministic checks → artifact inspection → rescore`.
- Use `explorer` or supporting agents only for genuinely independent read-heavy or disjoint ownership work.
- Before delegation, freeze the shared contract and assign exact paths/results. Supporting agents do not change the parent scope, rubric, work-item document, report, feedback state or completion.
- Integrate every supporting result, rerun the full playable path and rescore the combined artifact.
- Verify deterministic frame/state behavior separately from the actual Canvas path.
- Keep current best scores, iteration evidence, next bottleneck and rule candidates in the agent thread while active; record the final threshold, result evidence and durable rule candidates in the work item/report.
- A long or risky tuning pass may use an uncommitted checkpoint description after functional checks pass; only the main coordinator creates Git commits.
- Freeze the last writer result and request an independent read-only verifier through the parent before feedback or completion.
- Do not enter feedback or completion while an applicable quality axis is 0 or 1.
- If the same acceptance gate fails twice without new evidence or design change, preserve the best threshold-passing candidate and return concrete `feedback`; if no candidate passes, return `blocked` with the failed evidence instead of weakening the threshold.
- Repeated blockers or unclear ownership return `blocked`.

## Feedback

For product feel, visuals, new features or any item with `review: team-lead`:

1. Prepare the best available local/mobile playable path.
2. Update the work-item result and, when applicable, its intent-first report with the actual candidate evidence.
3. Return a concise `feedback` result that leads with:
   - the actual changed code tree;
   - the behavior/play path and exactly what the team lead should experience;
   - verification and independent-verifier boundary;
   - the work-report link (a dedicated report when one exists, otherwise the work-item result).
4. Include the rubric level and remaining bottleneck after the concrete evidence.
5. End without asking the team lead to confirm or approve. Concrete feedback targeting this result resumes the same agent.

Do not declare completion while feedback or implementation remains.

## Finish

1. Set the final work-item state and record the actual result and accepted feedback.
2. For a playable vertical slice or meaningful milestone, write one intent-first report under `docs/development/reports/`. Small maintenance items use the work-item result only.
3. Confirm the quality threshold and artifact evidence, then return a final summary led by the changed code tree, behavior/play path, validation, verification boundary and work-report path.
4. End the turn. Do not stage, commit, push or consume the next item.

Routine, unambiguous bug fixes may use `review: auto` only when behavior and acceptance are already explicit. Promote the item to `review: team-lead` when the result changes control feel, visuals, product rules or public data.
