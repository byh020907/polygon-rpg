---
name: dev-loop-status
description: Inspect Polygon RPG's approval-free Git-state roadmap loop, recent coordinator runs, executor branches/worktrees, checkpoints, lease, merge/push and completion convergence when progress appears stalled. Read-only by default; use for loop health, "진행 안 되는 것 같아", permission, duplicate/conflict or real-blocker diagnosis. Do not implement gameplay or mutate lifecycle state.
---

# Dev Loop Status

Run one read-only health audit. The durable writer is an executor branch/worktree advanced by fresh scheduled runs; a Codex work-item conversation is not expected for new items.

## Required Context

Read:

- [`docs/development/process.md`](../../../docs/development/process.md)
- current milestone/status in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md)
- [`dev-team-loop` Manage mode](../dev-team-loop/references/manage.md)
- [`dev-team-loop` work-item schema](../dev-team-loop/references/work-item-schema.md)

Scheduled runs are independent and normally unattended. The repo lease serializes writers; item/branch/worktree/commit evidence proves progress.

## Read-Only Boundary

Unless the user separately asks to repair/resume, do not:

- acquire, renew or release the coordinator lease;
- edit Git files, automation prompt/memory or worktrees;
- create tasks/items/branches, commit, merge, push, clean or archive;
- message/wait on coordinator runs.

If repair is requested, finish the audit first and route the exact transition through `$dev-team-loop`.

## Evidence Snapshot

Collect one bounded snapshot without polling:

1. Fetch `origin/main`; record local/remote HEAD, clean/dirty state and recent registration/checkpoint/integration commits.
2. Read open work-item frontmatter and roadmap status. Identify the single expected active vertical item and its `executor_branch`.
3. View automation `polygon-rpg-roadmap-coordinator`, local `automation.toml` and five recent `C yyyyMMdd-HHmm · <item> · <result>` runs. Confirm ACTIVE/PAUSED, cadence, project, local execution and whether titles/finals agree.
4. Inspect local and remote executor refs, merge base, ahead/behind and branch-only commits. Use `node scripts/roadmap-worktree.mjs status --repo <repo> --item <ID>` without `ensure`.
5. Inspect the registered persistent worktree path, HEAD and dirty paths. Read the branch copy of the work item for phase, baseline/current best/next bottleneck, checkpoint/final and checks.
6. Verify whether checkpoint/final is contained in main, whether latest main is contained in the branch, and whether branch-only changed paths fit `owned_paths`.
7. Read lease `status` without acquiring. Report owner age, renewed time, lease length and expected HEAD.
8. Check duplicate executor branches/worktrees, overlapping open `owned_paths`, partial MERGE_HEAD, repeated recovery failures, push drift and tool-level permission evidence.
9. Only for a pre-migration open item with `task_title` and no executor branch, inspect its legacy task/worktree enough to classify migration recovery.

Run conversation summaries are diagnostics only. Git work item, executor refs/worktree and commit graph decide current state.

## Health Classification

Choose exactly one primary state:

- `HEALTHY_IMPLEMENTING`: one item/branch is implementing with fresh checkpoint, dirty owned progress or a live renewed lease.
- `HEALTHY_VERIFYING`: a candidate checkpoint exists and the next/current fresh run is independently verifying it.
- `READY_FOR_INTEGRATION`: clean executor worktree, final commit and `ready-for-integration` evidence exist; latest main ancestry is satisfied.
- `QUEUED_FOR_PROVISION`: one queued item is on main and no executor branch/worktree exists yet.
- `RECOVERING`: latest run recreated a worktree/remote branch, merged main drift, fixed a partial transition or retried a push with a clear next phase.
- `WAITING_HUMAN_OR_EXTERNAL`: one concrete non-inferable question, credential or external condition is recorded; automation remains active.
- `PERMISSION_BLOCKED`: scheduled run itself actually lacks permission for an in-scope tool operation. A child-task approval prompt is an obsolete topology, not a reason to create another task.
- `CONFLICT`: duplicate writers, unknown dirty paths, overlapping ownership, divergent commits, partial ambiguous merge or main divergence prevents a unique safe transition.
- `AUTOMATION_DOWN`: open work exists but automation is absent/paused, project binding is invalid or scheduled runs stopped appearing.
- `STALLED_SUSPECTED`: no definitive blocker exists, but at least three intervals passed without branch/worktree/checkpoint/status/commit movement or renewed lease.
- `COMPLETION_PENDING`: roadmap and items are complete but automation is still active or main/remote/completion evidence has not converged.
- `ROADMAP_COMPLETE`: approved milestones/items, quality proof and clean main/origin converge, no executor work remains, and automation is intentionally paused.

Do not call a long implementation stalled when owned worktree changes, a fresh checkpoint or a renewed live lease proves progress. Do not call an active scheduler healthy if Git state never moves.

## Drift Patterns To Call Out

- `queued` item already has a branch/worktree or `implementing` item lacks both.
- Branch work-item phase and main lifecycle disagree without an explained partial transition.
- Executor branch checkpoint/final is not pushed, or remote branch is ahead while local worktree is missing.
- Final exists but latest main is absent from the branch, so re-verification is required.
- `ready-for-integration` remains unmerged for two coordinator intervals.
- Main contains final while item is not `done`, or a merge/push is partial.
- Worktree has paths outside `owned_paths` or two open items overlap.
- Lease renewal is older than its TTL or multiple runs repeatedly report `잠금중` after expiry.
- Recent title remains `실행중` after the run is interrupted, or title result disagrees with Git evidence.
- Repeated `승인 필요` came from a legacy managed-worktree task even though the scheduled direct executor has `never`; report topology drift.
- Same failure is reported twice without the next recovery action or three times without a recovery item.
- Roadmap complete while automation stays ACTIVE and keeps producing no-op runs.

## Team-Lead Report

Reply in plain Korean, in this order:

1. **무엇을 만들고 있는가** — feature and actual durable phase.
2. **무엇을 볼 수 있는가** — checkpoint/final/report or latest coordinator result; do not invent a work-item task link.
3. **무엇이 실제로 막혀 있는가** — one concrete cause or `없음`.
4. **판정** — one health classification and reason.
5. **근거** — compact main/branch/worktree/commit/automation/lease facts.
6. **다음 안전 조치** — one exact transition; say none when complete.

Never answer only with internal IDs, generic `진행 중` or `확인이 필요합니다`. Distinguish scheduler activity, Git progress and roadmap convergence.
