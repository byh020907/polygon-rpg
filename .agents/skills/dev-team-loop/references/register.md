# Register Mode

Use this mode only in the team-lead-facing main conversation.

## Classify

Do not create a work item for:

- overall status requests;
- priority changes;
- pause, cancel or reopen requests;
- merge or push instructions;
- roadmap reordering;
- starting, continuing or resuming the approved roadmap;
- additional direction explicitly targeting an existing work-item ID.

Everything else that asks for a bug fix, feature, investigation, improvement or planning result is a new work item.

## Register And Start Without Reconfirmation

1. Preserve the user's complete original message.
2. Treat the request as implementation input. Do not ask the team lead to approve a restatement, plan, Reference Brief, execution contract, quality contract, task list or work-item document.
3. Treat one message as one item. Split only on explicit user instruction.
4. Reconcile Git work items and active Codex agent assignments.
5. Allocate the ID, create the Git-tracked document, commit and push that registration from the main conversation.
6. Spawn exactly one root `worker` agent when dependencies and ownership allow; otherwise leave it queued.
7. Emit a concise registration/start update, then keep coordinating the root agent in the same main turn until feedback, completion, blocker or another defined stop condition.

The user request explicitly authorizes creation of the work item and its root subagent thread. It does not authorize a separate manager task or unrelated tasks.

## Root Agent Prompt

Include:

- the exact work-item ID and path;
- an instruction to invoke `dev-team-loop` Run mode;
- the owned paths or responsibility boundary known at registration;
- a reminder that other agents may share the checkout and must not revert their edits;
- a prohibition on branch, commit, push and worktree mutations.

## Main Lifecycle Update

This is an intermediate commentary update, not the final response for the coordinator turn.

Return only:

- work-item ID and title;
- inferred priority and lane;
- queued or started state;
- root-agent task name when started;
- any dependency preventing start.

Do not copy internal planning into the main conversation. Registration alone is not a reason to end the coordinator turn while the root agent is still active.
