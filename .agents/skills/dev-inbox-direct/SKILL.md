---
name: dev-inbox-direct
description: Explicitly claim and complete one existing Polygon RPG INBOX item in the current conversation while showing implementation and QA progress. Use only when the user invokes `$dev-inbox-direct` or explicitly asks to work on an INBOX item here instead of leaving it to the background loop. Do not register a new request or start `codex exec`.
---

# Dev INBOX Direct

Use this skill for an observable, current-conversation execution lane. The Windows loop remains the unattended lane; this skill claims one item before implementation so background selectors and `$dev-team-loop` leave it alone.

## Required Context

Read `loop/PROMPT.md`, DESIGN, STATUS, the complete INBOX, process, quality loop, [`../dev-team-loop/references/manage.md`](../dev-team-loop/references/manage.md), [`../dev-team-loop/references/inbox-schema.md`](../dev-team-loop/references/inbox-schema.md) and [`references/execute.md`](references/execute.md).

## Selection

- Use the exact `IN-*` item named by the user; otherwise choose the highest-priority oldest `new` item.
- If one `direct-*` item already exists, resume that item instead of claiming another.
- Never steal an `implementing`, `verifying`, `ready-for-integration` or `integrating` item, a live lease, overlapping worktree or unknown dirty path.

## Direct-Lane Invariants

- Acquire the clean-main lease before claiming. Run `node loop/inbox.mjs claim-direct` with the expected HEAD, then commit/push the claim before implementation.
- A claim uses `direct-implementing`, deterministic executor branch metadata, `execution_mode: direct` and claim evidence. Background `next` must report the claim and select no work.
- Implement in this current conversation with concise commentary. Do not call `loop/control.ps1 start|run-once`, `codex exec`, `create_thread`, fork or handoff.
- Continue through affected checks, checkpoint, applicable visible PNG QA and same-conversation repairs, clean final, non-rewriting main integration, exact done cleanup, push and lease release.
- Use `direct-verifying` and `direct-integrating` only as durable interruption markers; they are not normal exit points.
- If interrupted, preserve the direct status, branch/worktree and evidence. A later explicit `$dev-inbox-direct` resumes it; the background loop waits.

Do not register the invocation text as a new INBOX item and do not continue to a second item.
