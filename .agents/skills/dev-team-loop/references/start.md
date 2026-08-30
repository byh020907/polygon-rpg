# Start Or Continue Mode

Bare `$dev-team-loop` and explicit start/continue/resume requests authorize exactly one manual stateless coordinator tick. They do not create a work item and do not turn the current conversation into a long-running supervisor.

## Manual Tick

1. Read `references/manage.md` and run its Acquire, Snapshot and One-Tick Decision Order once.
2. Recover only from current Git, exact Codex task titles/status, managed worktrees and commit graph. Do not use prior main/coordinator memory.
3. Integrate at most one ready item, or dispatch at most one queued/roadmap item, or report one active/conflict/stop state.
4. Release the coordinator lease and return immediately. Do not wait for a work-item task after dispatch.

The recurring project automation is the default continuation mechanism. Manual start is a recovery and immediate-tick surface, not an outer conversation loop.

## Dispatch Suspension And Completion

Do not dispatch a new vertical item when there is an authoritative implementing/feedback/blocked/paused item, a concrete observable question, an irreversible product choice without a safe default, Canonical Conflict or external blocker. The recurring automation remains active, observes the same evidence and performs safe recovery when possible.

A task completion, tick response, unchanged timeout, successful integration or missing previous conversation context is not a loop stop. Pause the automation only for an explicit team-lead pause or after Manage mode's durable completion proof.

## Reply

Report in plain Korean: what is being built, which exact task can be opened and what is actually blocked. Include lifecycle IDs/hashes only as supporting evidence. Never copy implementation logs or relay feedback.
