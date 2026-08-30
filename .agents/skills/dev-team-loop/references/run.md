# Run Mode

One user-owned Codex task owns one work item from implementation through direct team-lead feedback and its final worktree commit. This task is the sole Vertical Slice Director and quality owner. Bounded subagents may help, but they do not become peer owners or user-facing work items.

## Start

1. Read the exact work-item document, roadmap milestone, project process, `docs/development/quality-loop.md` and relevant canonical system docs.
2. Verify the assigned path ownership, worktree status and starting commit. Preserve unrelated or inherited changes.
3. Confirm this is a Codex-managed worktree for a Git repository. If it is unexpectedly running in the shared local checkout, report `blocked: worktree-required` rather than becoming the main checkout writer.
4. Treat explicit team-lead intent as implementation input. Do not ask for approval of a plan, Reference Brief, execution contract, quality contract, task list or work-item prose.
5. Keep internal planning and implementation detail in this task. Do not send implementation or feedback through the main coordinator.

## Blocking Decision Interview

- Default to the safest reversible implementation that fits stated intent, roadmap, current code and verified References. Disclose the default after the candidate exists.
- Ask only when a decision genuinely blocks implementation, materially changes the product and cannot be safely inferred or made reversible.
- Ask exactly one short question in this work-item task. Its answer must be Yes/No or one of 2–3 mutually exclusive choices, each with a one-line impact.
- The team lead answers here. Record the accepted direction in the work item and continue in this same task/worktree.

## Implement And Evaluate

- Implement the complete playable slice, not isolated feature checkboxes.
- Use `baseline → largest bottleneck → one focused change → deterministic checks → artifact inspection → rescore`.
- Use subagents only for bounded exploration, proven disjoint implementation or independent verification. Freeze shared contracts and exact ownership first.
- Integrate every subagent result in this parent task, rerun the full playable path and rescore the combined artifact.
- Verify deterministic frame/state behavior separately from the actual Canvas path.
- Keep transient iteration detail in this task; record final threshold, evidence and durable rule candidates in the work item/report.
- Do not enter feedback or completion while an applicable quality axis is 0 or 1.
- If the same gate fails twice without new evidence or design change, preserve a threshold-passing current best for feedback; otherwise return `blocked` with failed evidence instead of weakening the threshold.

## Direct Feedback

For product feel, visuals, new features or `review: team-lead`:

1. Prepare the best available local/mobile playable path in this worktree.
2. Update the work-item result and any intent-first report with actual candidate evidence.
3. Present 실제 변경 파일, 새 동작 또는 플레이 결과, 검증 범위, 업무 결과 링크, 품질 수준과 남은 문제 in plain Korean. Apply the canonical team-lead wording rule; do not expose internal terms without explanation.
4. Wait here for team-lead feedback. The team lead opens this sidebar task and replies directly; the main coordinator does not relay it.
5. Apply feedback in this same task/worktree and repeat evaluation until accepted or blocked.

Do not create a final commit while required feedback or implementation remains.

## Finalize

1. Set the work-item state to `ready-for-integration` and record actual result, accepted feedback, quality threshold and verification evidence.
2. For a playable vertical slice or meaningful milestone, write one intent-first report under `docs/development/reports/`. Small maintenance items use the work-item result only.
3. Run affected syntax/lint/format checks, `git diff --check`, the actual user path and independent verification appropriate to the change.
4. Inspect and stage only item-owned paths. Create a scoped commit in this worktree with a concise Korean message. Do not push, merge, rebase, update main roadmap state or start another work item.
5. Confirm the final commit includes the intended changed tree and that the worktree is clean.
6. Finish with this exact team-lead-facing order: 실제 변경 파일; 새 동작 또는 플레이 결과; 검증; 업무 결과 링크; final commit hash.

The final hash is returned by this task, then verified and integrated by the main coordinator. It is not self-recorded inside the same commit.
