# Manage Mode

The team-lead-facing main task is the roadmap/queue coordinator and sole main-branch integration writer. Its memory is not authoritative.

## Task Identity And Recovery

Each open work item has one durable ID and at most one authoritative user-owned Codex task.

1. Reconcile Git-tracked work items, roadmap state, main checkout status, Codex task list/status and referenced commits.
2. Match by the exact task title `WI-... 제목`; verify its project and worktree context before trusting a summary.
3. Preserve the task link in compact main context, not as a guessed runtime ID in Git.
4. Resume the same task for feedback, pause recovery or a blocking answer. Do not create a replacement while its task/worktree remains recoverable.
5. If the task was archived, unarchive and continue it. If its managed worktree was cleaned, use the Codex restore path; the official managed-worktree snapshot is preferred to manual reconstruction.
6. Create a replacement task for the same item only after proving the original task/worktree is unavailable and no writer remains. Record the recovery event in the work item.
7. If multiple tasks claim the same item, commits disagree, or ownership overlaps, create nothing and report `task-conflict`.

## Registration And Dispatch

1. Allocate `WI-YYYYMMDD-HHmmss`, adding the smallest deterministic suffix on collision.
2. Create one minimal work-item document, preserving team-lead original or factual roadmap derivation.
3. Infer priority, lane and dependencies without reconfirmation.
4. Commit and push only the registration from main with a concise Korean message.
5. Use the Codex project listing to resolve the saved project and confirm it is a Git repository. Call the user-owned task creation surface—not a subagent spawn—to create a task titled `WI-... 제목` with the exact work-item path and Run-mode prompt, using a Codex-managed worktree based on the just-pushed integration branch. Do not override model/reasoning unless requested.
6. Use compact Codex task wait/read status, not subagent wait or raw-log polling, and retain the returned task link in main context.

## Coordinator Loop

1. Reconcile current item once.
2. Observe its task with compact wait/read calls.
3. If it needs feedback or a blocking choice, expose only its link/status/stop condition so the team lead can answer there.
4. If it returns a final commit, verify and integrate it before starting dependent work.
5. Reevaluate roadmap/queue and create the next item in a new task.

The default roadmap loop has one current vertical work-item task and serializes main integration. Independent urgent items may be queued; worktree isolation does not waive dependency or integration-order checks.

## Integration

1. Read the completed task's final evidence and obtain its final worktree commit hash.
2. Verify the commit exists, belongs to the expected registration base/worktree, changes only item-owned paths, includes `ready-for-integration` result/report evidence and has no unrelated parent history.
3. Inspect the actual diff and rerun affected checks and the user/play path in proportion to risk. A task summary alone is not integration evidence.
4. Fetch latest `origin/main`; never rewrite shared history. Resolve any base drift before integration.
5. Cherry-pick the verified final worktree commit onto main, or use another non-rewriting Git integration that preserves the exact scoped diff. Use Korean messages for any agent-authored integration commit.
6. Update the work item to `done` with the source worktree commit, resulting main integration commit and verification result. Update roadmap/canonical owner documents only when the integrated result requires it, then commit and push main.
7. Review rule candidates and promote only repeated or high-impact evidence to one canonical owner.
8. Reevaluate the roadmap and create the next work item in a new Codex task.

Do not integrate an item waiting for direct team-lead feedback, a blocking choice, failed threshold or unresolved conflict.

## Pause, Cancel And Recovery

- **Pause:** send the exact task a pause instruction. It stops writes, records changed paths/validation and creates a scoped checkpoint commit when safe. Main records the task link and checkpoint hash but does not integrate it. Resume the same task/worktree.
- **Cancel:** route cancellation to the exact task, stop further writes and collect its last commit/dirty-tree evidence. Main records `cancelled` on main and does not cherry-pick partial implementation. Do not manually delete its managed worktree; archive only after durable cancellation evidence exists and retention is no longer needed.
- **Recovery:** use Git work items, exact task title/link, task status, managed-worktree state and commit graph. Prefer reopening/restoring the same task. Never infer completion from prose or create duplicate writers.

## Main Context Contract

Keep only: work-item ID, title, task link, status, stop condition and integration result. Implementation details, product interview, quality tuning, changed tree, artifact evidence and feedback stay in the user-owned work-item task.

This is the internal memory shape, not the reply template. Team-lead-facing updates follow the canonical plain-Korean rule and lead with the actual feature: what is being made, what can be seen and what is blocked. Translate integration to `메인 반영`, feedback to `구현 결과에 대한 의견`, and omit internal role names. Add IDs, hashes and links only where they help the team lead act or verify.
