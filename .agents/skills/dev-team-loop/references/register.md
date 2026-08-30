# Register Mode

Use this mode in the team-lead main task when the user explicitly asks to register a development request.

## Append The Raw Request

1. Read the canonical [`docs/feedback/INBOX.md`](../../../../docs/feedback/INBOX.md).
2. Preserve exactly the message text the user designated for registration. Do not summarize, translate, fix spelling, normalize whitespace or merge it with earlier prose unless the user included those messages in the request.
3. Check existing `new` entries for an accidental exact duplicate. A repeated raw request is added again only when the user explicitly wants another execution.
4. Allocate `IN-YYYYMMDD-HHmmss` in Asia/Seoul time with the smallest suffix collision.
5. Append one entry with `status: new`, explicit priority when given, current main as `registration_base`, null executor/result fields and the immutable raw block. Use a Markdown fence longer than any backtick run in the raw text.
6. Do not derive a title, completion contract or owned paths in the main task. The coordinator derives them outside the raw block when it accepts the entry.
7. Commit/push only the inbox append with a Korean message.
8. Reactivate the existing coordinator automation if paused, preserving its schedule, prompt, project, environment and model.
9. Return the inbox ID and state. Do not implement, provision, wait or create another queue file/task.

Priority/lifecycle instructions for an existing `IN-*` entry update only its metadata and never rewrite its raw block.

If main is dirty/diverged or another lease owns mutation, preserve all evidence and report the exact boundary. Do not guess-clean.
