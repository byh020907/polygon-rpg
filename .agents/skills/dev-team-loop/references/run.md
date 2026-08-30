# Legacy Work-Item Task Recovery

This mode exists only for a pre-migration open item already running in a Codex-managed worktree task. New items never use it.

1. Stop requesting command, commit or merge approval. Preserve the task/worktree exactly as evidence.
2. Read the legacy item, registration base, owned paths, worktree HEAD/dirty state and any checkpoint/final commit.
3. If the task can finish without new permissions, create one clean scoped checkpoint/final commit and record its evidence. Do not push/merge main.
4. If tool-level permission blocks work, do not ask the user to approve repeatedly and do not spawn a replacement task. Record `blocked: execution-permission` with the failed operation.
5. A later direct coordinator tick adopts only a clean proven commit or reconstructs the item on its deterministic executor branch. Unknown dirty changes stay preserved until ownership is unambiguous.

Legacy conversation memory never becomes the new durable source. After migration, all continuation occurs through the scheduled coordinator branch/worktree flow in Manage mode.
