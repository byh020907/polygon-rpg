# Register Mode

Use this mode only in the team-lead-facing main task.

## Classify

Do not create a work item for overall status, priority changes, pause/cancel/reopen, integration/push instructions, roadmap reordering, bare start/continue, or additional direction explicitly targeting an existing work-item ID. Other development requests create one work item unless the team lead explicitly requests a split.

## Register And Start Without Reconfirmation

1. Preserve the user's complete original message.
2. Treat it as implementation input. Do not ask approval for a restatement, plan, Reference Brief, execution/quality contract, task list or work-item document.
3. Reconcile Git work items and existing Codex tasks, then allocate the ID and create the Git-tracked document.
4. Commit and push the registration from main with a concise Korean message.
5. Resolve the saved project with the Codex project listing. For a Git repository, use the user-owned Codex task creation surface to create exactly one task in a Codex-managed worktree, titled `WI-... 제목`, with the exact work-item path and `dev-team-loop` Run instruction. Do not use subagent spawn as a substitute.
6. Keep coordinating only queue/status/integration. The work-item task owns implementation, direct feedback and its final commit.

Creation of the work item and its separate Codex task is part of the requested project workflow. It does not authorize unrelated tasks, model overrides, external side effects or a background manager task.

## Work-Item Task Prompt

Include:

- exact work-item ID/path and stable title;
- instruction to invoke `dev-team-loop` Run mode;
- expected worktree ownership and known path boundary;
- requirement to preserve other changes and avoid main/remote mutation;
- direct team-lead feedback responsibility;
- final evidence order and final scoped worktree commit requirement.

## Main Lifecycle Update

Return only the work-item ID/title, task link, queued/started status, stop condition and integration result if any. Do not copy internal planning or candidate evidence into main. Registration is followed by compact task observation until a defined stop condition.
