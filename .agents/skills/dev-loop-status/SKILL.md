---
name: dev-loop-status
description: Inspect Polygon RPG's Windows file-memory development loop, Task Scheduler, PID/STOP, raw Markdown inbox, STATUS, recent codex exec logs, visual artifacts, executor branches/worktrees, lease, merge/push and DESIGN convergence. Read-only by default; use for loop health, incomplete-session, stalled progress, permission or conflict diagnosis. Do not implement or mutate lifecycle state.
---

# Dev Loop Status

Run one read-only audit. `docs/feedback/INBOX.md` is the queue/lifecycle source, `docs/STATUS.md` is its current projection, and executor Git evidence proves progress.

## Required Context

Read completely:

- [`loop/PROMPT.md`](../../../loop/PROMPT.md)
- [`docs/DESIGN.md`](../../../docs/DESIGN.md)
- [`docs/STATUS.md`](../../../docs/STATUS.md)
- [`docs/feedback/INBOX.md`](../../../docs/feedback/INBOX.md)
- [`docs/development/process.md`](../../../docs/development/process.md)
- [`loop/env.ps1`](../../../loop/env.ps1)
- [`dev-team-loop` Manage mode](../dev-team-loop/references/manage.md)
- [`dev-team-loop` Inbox schema](../dev-team-loop/references/inbox-schema.md)

## Read-Only Boundary

Unless the user separately asks to repair/resume, do not acquire/release lease, edit files/task/worktrees, create entries/branches, commit, merge, push, clean or wait. Finish the audit before routing an authorized repair through `$dev-team-loop`.

## Evidence Snapshot

Collect one bounded snapshot without polling:

1. Fetch origin; record local/remote main, clean/dirty state, recent lifecycle/integration commits and partial merge state.
2. Parse every nonterminal `IN-*` entry. Verify raw blocks remain present, identify the one expected active entry and compare it with STATUS.
   For `direct-*`, also report `execution_mode`, claim time/base/owner and whether the current evidence is progressing or awaiting explicit resume.
3. Run `loop/control.ps1 status` read-only. Inspect Task Scheduler action/trigger/settings, enabled/state/result, explicit PATH configuration, `loop/runner.pid` owner and `loop/STOP` presence.
4. Read the five latest `logs/YYYY-MM-DD/<run>-<IN-ID>/summary.json`, matching JSONL exit evidence and last message. Do not poll or wait.
5. Inspect the active entry's local/remote executor ref, merge base, ahead/behind, branch-only commits and `loop/worktree.mjs status` output.
6. Inspect worktree HEAD/dirty paths, checkpoint/final containment, latest-main ancestry and owned-path boundary.
7. Read lease status without acquiring; report renewal age, TTL and expected HEAD.
8. For visual work, verify the latest PNG/metadata exists and its start/room/frame/viewport/console evidence matches the entry. Read the PNG only when judging visual quality.
9. Check duplicate writers, STATUS drift, unknown dirty paths, partial push/merge, repeated recovery failures and whether a successful session left its entry live without `blocked`.

Conversation summaries are diagnostics only. INBOX entry, branch/worktree and commit graph are authoritative; STATUS must be reconstructable from them.

## Health Classification

Choose exactly one:

- `INBOX_PENDING`: at least one `new` entry exists and no active entry owns execution yet.
- `HEALTHY_RUNNING`: one Codex entry session owns a live lease/PID and Git/log evidence has moved within the expected duration.
- `DIRECT_RUNNING`: one `direct-*` entry owns a live lease and its current-conversation branch/worktree evidence is moving.
- `DIRECT_RECOVERY_PENDING`: a `direct-*` claim is durable but has no live lease; background waiting is correct and an explicit `$dev-inbox-direct` resume or authorized recovery is needed.
- `RECOVERY_PENDING`: a prior abnormal session left checkpoint, dirty owned progress, final, partial integration or cleanup evidence that the next fresh session can deterministically resume.
- `RECOVERING`: latest run repaired a branch/worktree, phase, main drift or push with a clear continuation.
- `WAITING_HUMAN_OR_EXTERNAL`: one concrete non-inferable question/credential/external condition is recorded and the loop is normally stopped for that blocker.
- `PERMISSION_BLOCKED`: `codex exec` lacks permission for an in-scope operation despite the configured unattended policy.
- `CONFLICT`: duplicate writers, unknown paths, overlapping ownership, divergent commits, ambiguous merge or irreconcilable INBOX/STATUS state.
- `LOOP_DISABLED`: nonterminal input exists while Task Scheduler is missing/disabled or STOP is present outside intentional validation.
- `INCOMPLETE_SESSION`: exit 0 left the selected entry live without a concrete `blocked` state, or a session stopped normally at checkpoint/verifying/ready.
- `STALLED_SUSPECTED`: three configured restart/observation intervals passed without log, branch/worktree, commit or lease movement and no real blocker.
- `COMPLETION_PENDING`: DESIGN is complete and no nonterminal input exists, but task/main/STATUS/completion evidence has not converged.
- `DESIGN_COMPLETE`: approved DESIGN milestones, quality proof and clean main/origin converge, no nonterminal inbox/executor remains, and the Windows loop exited normally with completion proof.

## Drift Patterns

- `new` entry with an expected-active Windows task disabled/stopped.
- Active entry lacks its branch/worktree, or another active entry overlaps it.
- Background run selected any work while a `direct-*` claim exists.
- Raw request was rewritten rather than metadata being updated.
- Executor branch modified INBOX or STATUS.
- Branch checkpoint/final is unpushed or main INBOX marker lags unexplained.
- STATUS active entry/current best disagrees with INBOX and commit graph.
- Final lacks latest main or remains unmerged for two intervals.
- Main contains final while entry is not done, or merge/push is partial.
- Lease is older than TTL or repeated runs stay locked after expiry.
- Run summary is missing, exit/result contradicts remaining entry, or repeated failure does not escalate to repair.
- Visible work has no matching PNG/metadata/direct-read evidence.
- DESIGN complete while the outer loop stays active producing only idle/no-op runs.

## Team-Lead Report

Reply in plain Korean:

1. 무엇을 만들고 있는가 — raw intent's actual feature and durable phase.
2. 무엇을 볼 수 있는가 — INBOX entry, checkpoint/final or current artifact.
3. 무엇이 실제로 막혀 있는가 — one cause or 없음.
4. 판정 — one classification and reason.
5. 근거 — compact main/INBOX/STATUS/branch/worktree/task/PID/STOP/log/artifact/lease facts.
6. 다음 안전 조치 — next complete-work recovery or none when complete.

Distinguish Task Scheduler activity, one-session completion, Git progress and DESIGN convergence. Do not invent a task link.
