# Register Mode

Use this mode in the team-lead main task for any plain new development imperative. `인박스에 등록해`, a skill invocation or other special wording is not required.

## Classify Before Append

Register when the current user message asks to build, change, fix, refactor or otherwise mutate the Polygon RPG project.

Do not create a new entry when the message is:

- a question, explanation, review or loop/status check;
- priority, pause, cancel, resume, reopen or feedback for an existing `IN-*` entry;
- explicitly presented as an example, hypothetical, draft or wording demonstration;
- an explicit request to interview, discuss or refine requirements before INBOX registration;
- bare `$dev-team-loop`, which runs one manual transition;
- explicitly requested to be handled directly in the current task.

When a message mixes a real registration request with a question, register only if the user clearly identifies which exact text is the request. Otherwise answer the question without guessing a raw block.

## Append The Raw Request

1. Read the canonical [`docs/feedback/INBOX.md`](../../../../docs/feedback/INBOX.md).
2. By default, preserve the entire current user message exactly. Do not summarize, translate, fix spelling, normalize whitespace or merge it with earlier messages. Use a smaller designated block only when the user explicitly marks that block as the request.
3. Check existing `new` entries for an accidental exact duplicate. A repeated raw request is added again only when the user explicitly wants another execution.
4. Allocate `IN-YYYYMMDD-HHmmss` in Asia/Seoul time with the smallest suffix collision.
5. Append one entry with `status: new`, explicit priority when given, current main as `registration_base`, null executor/result fields and the immutable raw block. Use a Markdown fence longer than any backtick run in the raw text.
6. Do not derive a title, completion contract or owned paths in the main task. The coordinator derives them outside the raw block when it accepts the entry.
7. Commit/push only the inbox append with a Korean message.
8. Reactivate the existing coordinator automation if paused, preserving its schedule, prompt, project, environment and model.
9. Return the inbox ID and state. Do not implement, provision, wait or create another queue file/task.

Priority/lifecycle instructions for an existing `IN-*` entry update only its metadata and never rewrite its raw block.

If main is dirty/diverged or another lease owns mutation, preserve all evidence and report the exact boundary. Do not guess-clean.
