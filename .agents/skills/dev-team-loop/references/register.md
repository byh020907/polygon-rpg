# Register Mode

Use this mode only in the team-lead-facing main conversation.

## Classify

Do not create a work item for:

- overall status requests;
- priority changes;
- pause, cancel or reopen requests;
- merge or push instructions;
- roadmap reordering;
- additional direction explicitly targeting an existing work-item ID.

Everything else that asks for a bug fix, feature, investigation, improvement or planning result is a new work item.

## Register Without Interviewing

1. Preserve the user's complete original message.
2. Do not clarify, decompose or implement it in the main conversation.
3. Treat one message as one item. Split only on explicit user instruction.
4. Send a structured registration request to the single background manager.
5. If no live manager exists, start exactly one manager conversation in the main worktree, then deliver the request.
6. Wait only for the registration receipt, not for implementation.

The manager allocates the ID, creates and pushes the Git-tracked document, then decides whether to queue or dispatch it.

Use this payload shape so the manager does not have to infer message semantics:

```json
{
  "kind": "register_work_item",
  "originalRequest": "complete team-lead message",
  "requestedPriority": null,
  "requestedLane": null,
  "splitRequested": false,
  "requestedItems": null,
  "targetWorkItemId": null
}
```

Set optional values only when the team lead stated them. When split is explicit, `requestedItems` contains only the team-lead-named partitions; otherwise it stays null. Do not invent a target ID or mark a split from punctuation alone.

## Main Reply

Return only:

- work-item ID and title;
- inferred priority and lane;
- queued or started state;
- worker conversation/worktree when started;
- any dependency preventing start.

Do not copy the future interview into the main conversation.
