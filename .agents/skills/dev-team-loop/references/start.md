# Start Or Continue Mode

Use this mode only in the team-lead-facing main task when the team lead invokes bare `$dev-team-loop`, or explicitly starts, continues or resumes the approved roadmap.

## Canonical Start

The bare invocation is an operation, not a work item. It authorizes the main coordinator to reconcile the queue, observe the current work-item task, integrate a completed commit and create the next approved work item in a new Codex task.

1. Inspect Git work items, roadmap state, main checkout status and current Codex tasks.
2. Match an open item to exactly one task by its stable `WI-... 제목` title and recorded main-context task link. If duplicate active tasks or conflicting integration evidence exist, stop with `task-conflict`.
3. Reconcile current work before deriving anything. Observe an active task with the Codex task `wait`/`read` surface; do not use subagent status as its identity or reproduce internal logs.
4. Treat a task as waiting for the team lead only when it provides concrete observable questions or a blocking choice. Report the exact items with its link; answers stay in that task. A generic feedback state is not a stop condition.
5. If the task returned a final worktree commit, verify and integrate it using Manage mode, update Git/roadmap, then reevaluate the next gate.
6. If no open item owns the next gate, register one item, persist its registration on main, then create a new user-owned Codex task using the project's Codex-managed worktree environment.

Never create a work item whose content is the skill invocation or “continue the roadmap.” Never substitute a root subagent for the user-owned work-item task.

## Continued Operation

- Use task status tools for bounded waits and compact reads; unchanged timeouts are checkpoints, not failures.
- Main context retains only `ID`, `title`, `task link`, `status`, `stop condition` and `integration result`.
- Do not ask implementation questions, inspect/tune the candidate on behalf of the Director or relay feedback between tasks.
- After successful integration, derive the next approved gate and create it in a new Codex task. Never reuse a completed work-item task for a different item.
- Stop at concrete observable questions or a blocking choice pending in the work-item task, canonical conflict, external blocker, pause or no approved next milestone.

## Main Reply

Lead with the actual feature and exact observable questions in plain Korean, then provide the clickable task link and what the answers change. Keep lifecycle status and internal IDs as supporting evidence. If no concrete question exists, do not say that feedback is pending; keep the task moving toward verification, final commit and integration readiness.
