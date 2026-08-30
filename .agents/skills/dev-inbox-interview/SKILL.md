---
name: dev-inbox-interview
description: Interview and refine a prospective Polygon RPG development request before it enters the Markdown INBOX. Use when the user invokes `$dev-inbox-interview`, says to interview or discuss first, or wants requirements clarified before registration. While active, do not register or implement. Show one final proposed request and register only after the user explicitly approves that exact text.
---

# Dev Inbox Interview

Turn an early idea into one executable user-owned request without polluting the live INBOX with interview drafts.

## Boundary

- This mode overrides `dev-team-loop` automatic registration while the interview is active.
- Do not edit INBOX, STATUS, automation or code during the interview.
- Keep interview state in this conversation only. Do not create draft files, entries, branches or tasks.
- Read [`docs/DESIGN.md`](../../../docs/DESIGN.md) and [`docs/STATUS.md`](../../../docs/STATUS.md). Inspect relevant current code or external product References read-only when that lets you avoid asking an Engineering question.
- Ask about Product Requirement, player experience, observable behavior, scope and trade-offs. Infer module boundaries, state ownership, naming and verification mechanics from the repository and its current Engineering Method.

## Interview Loop

Maintain these compact facts in conversation:

- intended player/user scenario;
- observed current problem or desired change;
- must-have behavior and explicit non-scope;
- observable acceptance evidence;
- product Reference or priority when relevant;
- one unresolved decision.

Ask at most one material question per reply. Prefer 2–3 mutually exclusive choices with one-line consequences when realistic; use an open question only when choices would invent product direction. Do not ask for approval of plans, commands, tests or implementation details.

When the user is unsure, recommend a reversible default and explain what it changes. Continue until another answer would not materially change the request's player-visible result or scope.

## Finalize Before Registration

1. Produce one concise proposed request in the user's language inside a fenced `text` block. It may synthesize the interview; do not claim it is a verbatim prior message.
2. Include the complete scenario, required observations, important non-scope and requested References. Keep Engineering implementation choices out unless the user explicitly owns them.
3. Ask the user to reply `등록` to accept that exact block, or state one correction. Do not append it yet.
4. On a correction, revise the block and ask again. On cancel, end with no mutation.
5. On explicit `등록`, read [`dev-team-loop` Register mode](../dev-team-loop/references/register.md) and its inbox schema. Append only the approved fenced content as the immutable raw request, excluding interview chatter, wrapper text and the word `등록`; commit/push and reactivate automation as that mode requires.

If the user asks to implement directly instead, leave interview mode and handle the explicit direct request under normal repository rules without creating an INBOX entry.
