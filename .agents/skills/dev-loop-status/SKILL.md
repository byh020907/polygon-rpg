---
name: dev-loop-status
description: Inspect Polygon RPG's file-memory development loop, raw Markdown inbox, STATUS, recent runs, executor branches/worktrees, checkpoints, lease, merge/push and DESIGN convergence. Read-only by default; use for loop health, stalled progress, permission or conflict diagnosis. Do not implement or mutate lifecycle state.
---

# Dev Loop Status

Run one read-only audit. `docs/feedback/INBOX.md` is the queue/lifecycle source, `docs/STATUS.md` is its current projection, and executor Git evidence proves progress.

## Required Context

Read completely:

- [`loop/PROMPT.md`](../../../loop/PROMPT.md)
- [`docs/DESIGN.md`](../../../docs/DESIGN.md)
- [`docs/STATUS.md`](../../../docs/STATUS.md)
- [`docs/feedback/INBOX.md`](../../../docs/feedback/INBOX.md)
- [`dev-team-loop` Manage mode](../dev-team-loop/references/manage.md)
- [`dev-team-loop` Inbox schema](../dev-team-loop/references/inbox-schema.md)

## Read-Only Boundary

Unless the user separately asks to repair/resume, do not acquire/release lease, edit files/automation/worktrees, create entries/branches/tasks, commit, merge, push, clean or wait. Finish the audit before routing an authorized repair through `$dev-team-loop`.

## Evidence Snapshot

Collect one bounded snapshot without polling:

1. Fetch origin; record local/remote main, clean/dirty state, recent lifecycle/integration commits and partial merge state.
2. Parse every nonterminal `IN-*` entry. Verify raw blocks remain present, identify the one expected active entry and compare it with STATUS.
3. View automation config and the five latest compact coordinator results.
4. Inspect the active entry's local/remote executor ref, merge base, ahead/behind, branch-only commits and `loop/worktree.mjs status` output.
5. Inspect worktree HEAD/dirty paths, checkpoint/final containment, latest-main ancestry and owned-path boundary.
6. Read lease status without acquiring; report renewal age, TTL and expected HEAD.
7. Check duplicate active entries/writers, STATUS drift, unknown dirty paths, partial push/merge, repeated recovery failures and permission evidence.

Conversation summaries are diagnostics only. INBOX entry, branch/worktree and commit graph are authoritative; STATUS must be reconstructable from them.

## Health Classification

Choose exactly one:

- `INBOX_PENDING`: at least one `new` entry exists and no active entry owns execution yet.
- `HEALTHY_IMPLEMENTING`: one entry/branch is implementing with fresh checkpoint, owned dirty progress or live renewed lease.
- `HEALTHY_VERIFYING`: candidate checkpoint exists and a fresh run is independently verifying it.
- `READY_FOR_INTEGRATION`: clean final and main inbox `ready-for-integration` evidence satisfy latest-main ancestry.
- `RECOVERING`: latest run repaired a branch/worktree, phase, main drift or push with a clear continuation.
- `WAITING_HUMAN_OR_EXTERNAL`: one concrete non-inferable question/credential/external condition is recorded and automation remains active.
- `PERMISSION_BLOCKED`: scheduled run itself lacks permission for an in-scope operation.
- `CONFLICT`: duplicate writers, unknown paths, overlapping ownership, divergent commits, ambiguous merge or irreconcilable INBOX/STATUS state.
- `AUTOMATION_DOWN`: nonterminal input exists while automation is missing/paused/invalid or scheduled runs stopped.
- `STALLED_SUSPECTED`: three intervals passed without entry phase, branch/worktree, checkpoint, commit or lease movement and no real blocker.
- `COMPLETION_PENDING`: DESIGN is complete and no nonterminal input exists, but automation/main/STATUS/completion evidence has not converged.
- `DESIGN_COMPLETE`: approved DESIGN milestones, quality proof and clean main/origin converge, no nonterminal inbox/executor remains, and automation is intentionally paused.

## Drift Patterns

- `new` entry with automation still paused after registration.
- Active entry lacks its branch/worktree, or another active entry overlaps it.
- Raw request was rewritten rather than metadata being updated.
- Executor branch modified INBOX or STATUS.
- Branch checkpoint/final is unpushed or main INBOX phase lags unexplained.
- STATUS active entry/current best/next transition disagrees with INBOX and commit graph.
- Final lacks latest main or remains unmerged for two intervals.
- Main contains final while entry is not done, or merge/push is partial.
- Lease is older than TTL or repeated runs stay locked after expiry.
- Run title remains `실행중`, or repeated conflict does not escalate.
- DESIGN complete while automation stays active producing no-op runs.

## Team-Lead Report

Reply in plain Korean:

1. 무엇을 만들고 있는가 — raw intent's actual feature and durable phase.
2. 무엇을 볼 수 있는가 — INBOX entry, checkpoint/final or current artifact.
3. 무엇이 실제로 막혀 있는가 — one cause or 없음.
4. 판정 — one classification and reason.
5. 근거 — compact main/INBOX/STATUS/branch/worktree/automation/lease facts.
6. 다음 안전 조치 — one transition or none when complete.

Distinguish scheduler activity, Git progress and DESIGN convergence. Do not invent a task link.
