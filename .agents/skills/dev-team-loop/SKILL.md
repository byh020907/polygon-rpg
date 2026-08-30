---
name: dev-team-loop
description: Start or run Polygon RPG's Codex-native quality-driven roadmap loop. A bare `$dev-team-loop` invocation starts or resumes autonomous consumption of the approved roadmap. Also use for work-item registration, root-agent coordination, feedback, integration, status changes, or cancellation. Do not use when the user explicitly says to handle the request directly without the team workflow.
---

# Dev Team Loop

Use one project workflow while loading only the instructions for the current role.

## Required Context

Read [`docs/development/process.md`](../../../docs/development/process.md) and the current milestone in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md). Preserve `AGENTS.md` precedence and all authorization boundaries.

Use Codex native subagent threads for work-item execution and bounded parallel lanes. The main conversation remains the team-lead interface and roadmap coordinator; do not create a separate manager task. Use external orchestration, worktree, browser or emulator tools only when the task explicitly requires that surface.

## Select One Mode

Choose the first matching mode.

1. **Cancel:** The user cancels or reopens an exact work item, or a worker receives a cancellation. Read [`references/cancel.md`](references/cancel.md).
2. **Run:** The current subagent prompt identifies one work-item path/ID for this developer conversation. Read [`references/run.md`](references/run.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
3. **Start/Continue:** This is a bare `$dev-team-loop` invocation in the team-lead-facing main conversation or an explicit start/continue/resume roadmap request. Read [`references/start.md`](references/start.md).
4. **Manage:** This is the main coordinator handling queue, status, priority, integration, recovery or a root-agent lifecycle result. Read [`references/manage.md`](references/manage.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
5. **Register:** This is the team-lead-facing main conversation receiving a new development request. Read [`references/register.md`](references/register.md).

If the role is ambiguous, inspect Git work items, the current Codex subagent tree and repository state. Never create a second root agent for an item that already has one.

## Shared Invariants

- One independent team-lead development request creates one work item unless the team lead explicitly requests a split. Bare start/continue invocations and lifecycle operations do not.
- The approved current roadmap is the default work source. When no open item owns its next unmet gate, derive one non-duplicate vertical work item without waiting for another team-lead prompt.
- The main conversation coordinates, records, verifies and integrates; it does not perform the work item's implementation itself.
- Each work item has exactly one root developer subagent and Vertical Slice Director. Reuse that same agent with follow-up tasks for feedback and revision.
- Explicitly stated team-lead intent is implementation input, never a request for reconfirmation. Planning, Reference Briefs, execution contracts, quality contracts, task lists and work-item prose are internal agent context; do not ask the team lead to approve them.
- Implement a safe, reversible default first. Validate the concrete candidate, then hand off its actual changed code tree, behavior/play path, verification and work-report link so feedback can target real output.
- Ask only when one decision genuinely blocks implementation, cannot be inferred from approved intent or evidence and cannot be made reversible. Ask exactly one short interview question whose answer is Yes/No or one of 2–3 mutually exclusive choices, each with a one-line impact. Never send a document as the question.
- Git work-item documents are minimal durable queue/result history. Codex subagent state and the current filesystem/Git state own internal planning and live execution evidence.
- Keep one write-heavy root work item active at a time in the shared checkout. Add bounded subagents only for demonstrated parallel value with disjoint ownership; read-heavy exploration and frozen-candidate verification are preferred.
- The main coordinator is the only branch, commit, push, queue, roadmap and integration writer. Worker agents edit only assigned files and do not mutate Git history.
- When the coordinator authors Git messages, follow the Korean message policy in `docs/development/process.md`: use Korean by default without manufacturing merge commits or rewriting existing history.
- Do not add permanent tests unless the user explicitly requests them. Remove temporary validation artifacts.
- Do not copy Reference IP, assets, commands, maps, names, balance values or content.
- No force push, shared-branch history rewrite, guessed cleanup or mutation of another agent's owned changes.
- Do not submit a candidate with an applicable quality axis below the threshold defined in `docs/development/quality-loop.md`.
- Subtask success is not parent work-item success. The Director must integrate all lanes, rerun the end-to-end path and pass independent verification.
- Stop roadmap derivation at team-lead feedback on a concrete candidate, a genuinely blocking unresolved product decision, canonical conflict, blocker, pause or the absence of an approved next milestone.

## Completion

Lead with the actual changed code tree, behavior/play path, verification and work-report link. Then report the work-item ID, lifecycle state, quality threshold, impact, verification boundary and next loop. Do not end with a request to confirm or approve; the team lead may respond with concrete feedback.
