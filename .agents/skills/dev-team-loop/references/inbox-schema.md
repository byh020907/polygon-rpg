# Inbox Schema

[`docs/feedback/INBOX.md`](../../../../docs/feedback/INBOX.md) is the canonical schema and live queue. Read it completely before registering or advancing an entry.

## Identity And State

- New IDs use `IN-YYYYMMDD-HHmmss` with the smallest collision suffix.
- The immutable raw request is copied exactly from the team-lead main message.
- A live entry owns lifecycle, execution contract, current best, blocker, result and checkpoint/final evidence. Its terminal merge commit preserves the complete `done` block; after cleanup, STATUS and Git ancestry own the current integration projection.
- New work has no parallel queue or per-entry task document.
- One entry owns one deterministic `codex/loop/<lowercase-in-id>` branch and at most one persistent worktree writer.
- `direct-implementing`, `direct-verifying` and `direct-integrating` reserve the repository's execution lane for `$dev-inbox-direct`; background selection returns no work while one exists.

## Main-Only Inbox Rule

Executor branches never edit `docs/feedback/INBOX.md` or `docs/STATUS.md`. The complete-work session pushes branch checkpoint/final evidence, updates both files on main, then continues through integration and cleanup. This keeps new main-dialogue appends conflict-free and makes the main inbox authoritative.

When a branch needs current process or code from main, merge latest `origin/main` without rewriting history. The old inbox snapshot carried by the branch remains untouched, so the merge takes the current main copy.

## Done Cleanup

- Integration first creates a merge commit containing the exact raw block, terminal result and `status: done`.
- At that clean merge HEAD, run `node loop/inbox.mjs remove-done --repo <repo> --entry <IN-ID> --expected-head <merge-head>` and commit the exact block removal plus STATUS's actual integration hash.
- The helper recognizes entry headings only outside Markdown fences, requires exactly one matching block and exactly one metadata `status: done`, and preserves every byte outside the removed block.
- A remaining `done` block means cleanup was interrupted and is recovered before any later entry. Never prune nonterminal, paused, blocked, cancelled or superseded entries.

## Raw Request Invariant

- Do not summarize, translate, normalize whitespace, fix spelling or rewrite Markdown inside `원문 — 불변`.
- Choose a Markdown fence longer than any backtick run in the request.
- Lifecycle corrections change metadata only. A changed request is a new entry linked with `supersedes`.
- Do not consume one `new` entry twice. Status plus executor branch/commit evidence is authoritative even if a transition was interrupted.

## Executor-Derived Fields

From the raw request, DESIGN, current repository and verified References, derive outside the raw block:

- concise title;
- executor branch and accepted timestamp;
- exact owned paths;
- goal, completion conditions, non-scope and quality axes;
- baseline, current best, next bottleneck and validation;
- checkpoint/final/integration evidence.

These fields are execution decisions, not a rewritten request and not a plan-approval document.
