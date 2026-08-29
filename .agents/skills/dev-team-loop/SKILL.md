---
name: dev-team-loop
description: Run Polygon RPG's quality-driven team-lead/AI development loop. Use for main-worktree development requests, queue and worker coordination, one-work-item developer conversations, artifact evaluation, integration, status changes, or cancellation. Route by the current worktree, work-item context, and request instead of requiring separate skills. Do not use when the user explicitly says to handle the request directly without the team workflow.
---

# Dev Team Loop

Use one project workflow while loading only the instructions for the current role.

## Required Context

Read [`docs/development/process.md`](../../../docs/development/process.md) and the current milestone in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md). Preserve `AGENTS.md` precedence and all authorization boundaries.

Use the available `orca-cli` skill for worktree/terminal operations and the `orchestration` skill for Run·Task·Dispatch, lifecycle messages and the manager event loop. These are internal dependencies; the team lead invokes only `dev-team-loop`.

## Select One Mode

Choose the first matching mode.

1. **Cancel:** The user cancels or reopens an exact work item, or a worker receives a cancellation. Read [`references/cancel.md`](references/cancel.md).
2. **Run:** The prompt or live Orca Dispatch identifies one work-item path/ID for this developer conversation. Read [`references/run.md`](references/run.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
3. **Manage:** This is the background manager conversation, an Orca coordinator event, or a main-worktree queue/status/priority/integration operation. Read [`references/manage.md`](references/manage.md) and [`references/work-item-schema.md`](references/work-item-schema.md).
4. **Register:** This is the team-lead-facing main conversation receiving a new development request. Read [`references/register.md`](references/register.md).

If the role is ambiguous, inspect the current Orca worktree, terminal, Run/Task/Dispatch and Git state. Never create a second background manager or duplicate Dispatch from a guess.

## Shared Invariants

- One team-lead message creates one work item unless the team lead explicitly requests a split.
- The main conversation does not interview or implement. The work-item conversation owns both.
- Each work item has exactly one root developer conversation and Vertical Slice Director. It owns the integrated artifact, rubric, team-lead feedback and final completion even when bounded subtask workers contribute.
- The background manager is the only main-worktree Git writer and excludes itself from the three-worker limit.
- A worker owns one work item and one conversation at a time. It never starts the next item itself.
- Git work-item documents are durable history; Orca orchestration and worktree state are live execution evidence.
- Keep main lifecycle messages concise. Keep interviews and implementation detail in the work-item conversation.
- Do not add permanent tests unless the user explicitly requests them. Remove temporary validation artifacts.
- Do not copy Reference IP, assets, commands, maps, names, balance values, or content.
- No force push, shared-branch history rewrite, guessed cleanup, or mutation of another worktree's branch/index.
- Use simple instruction-driven operation first. Add scripts or scheduled automation only after a demonstrated repeated failure justifies them.
- Do not submit a candidate with an applicable quality axis below the threshold defined in `docs/development/quality-loop.md`.
- Subtask success is not parent work-item success. The Director must integrate all lanes, rerun the end-to-end path and pass independent verification.

## Completion

Report the work-item ID, current lifecycle state, result direction, quality threshold and artifact evidence, impact, verification boundary and next loop. Do not repeat file-by-file diff details that Git already preserves.
