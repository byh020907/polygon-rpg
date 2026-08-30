---
name: dev-loop-status
description: Inspect Polygon RPG's current roadmap loop, recent coordinator automation runs, exact work-item tasks, managed worktrees, leases and commits when progress appears stalled. Read-only by default; use for loop status, health checks, "진행 안 되는 것 같아", duplicate/conflict diagnosis, or finding the real blocker. Do not use it to implement gameplay or mutate lifecycle state.
---

# Dev Loop Status

Run one read-only health audit of Polygon RPG's autonomous roadmap loop. This skill explains current state; it does not become a coordinator tick or a recovery writer.

## Required Context

Read:

- [`docs/development/process.md`](../../../docs/development/process.md)
- current milestone and status in [`docs/development/roadmap.md`](../../../docs/development/roadmap.md)
- [`dev-team-loop` Manage mode](../dev-team-loop/references/manage.md)
- [`dev-team-loop` work-item schema](../dev-team-loop/references/work-item-schema.md)

Official Codex boundaries: standalone scheduled tasks create independent runs and local Git work can use the project checkout; managed worktrees isolate task changes. Do not assume the scheduler serializes repository writers—the repo lease and evidence checks own that guarantee.

## Read-Only Boundary

Unless the user separately asks to repair or resume the loop, do not:

- acquire or release the coordinator lease;
- edit Git files, automation memory or task prompts;
- create, rename, archive, resume, interrupt or message a task;
- create a work item, integrate a commit, commit, push or clean a worktree;
- wait for an active task to finish.

If repair is requested, finish the audit first and route the exact recovery through `$dev-team-loop`; do not silently combine diagnosis and mutation.

## Evidence Snapshot

Collect one bounded snapshot rather than polling:

1. Fetch `origin/main`; record local/remote HEAD, clean/dirty state and recent integration/registration commits.
2. Read open work-item frontmatter and the roadmap milestone table. Identify the single expected active vertical item.
3. View the `polygon-rpg-roadmap-coordinator` automation and its local `automation.toml` when available. Check `ACTIVE/PAUSED`, cadence, project, local/worktree mode and the five most recent runs. Discover new runs by the compact `C yyyyMMdd-HHmm · <item> · <result>` title as well as the legacy automation title; confirm automation ID/summary rather than relying on the prefix alone.
4. List recent and, only when needed, archived Codex tasks. Match an item only by its exact `task_title`; a null, truncated, prompt-shaped or merely substring-matching title is not authoritative.
5. Read at most the latest three turns of the expected task without copying raw logs. Record status, last update, concrete question/blocker and final commit evidence.
6. Inspect its managed worktree: path, HEAD, clean/dirty paths, registration-base ancestry and whether its final commit is already contained in main.
7. Read coordinator lease status without acquiring it. Report owner age and expected HEAD when present.
8. Check duplicate exact-title tasks, overlapping open `owned_paths`, repeated coordinator conflict outcomes and task/work-item status drift. When an exact title is missing, apply the Manage-mode uniqueness checks and distinguish auto-repairable identity drift from ambiguous conflict.

Use task summaries only for discovery. Git documents, exact task identity, worktree state and commit graph decide the result.

## Health Classification

Choose exactly one primary state:

- `HEALTHY_ACTIVE`: one exact task is running or has fresh worktree/task progress; coordinator correctly exits without duplication.
- `HEALTHY_IDLE`: no open item exists and the roadmap is complete or explicitly paused.
- `READY_FOR_INTEGRATION`: exact task is idle/completed, worktree is clean and a final commit plus `ready-for-integration` evidence exists.
- `QUEUED_FOR_DISPATCH`: one queued item exists, registration is on main and no authoritative task exists yet.
- `RECOVERABLE_IDENTITY_DRIFT`: no exact-title task exists, but exactly one prompt/worktree/registration/ownership-backed candidate satisfies every safe title-repair condition.
- `RECOVERING`: the latest coordinator performed title repair, same-task resume/unarchive, base-drift repair, evidence-based replacement or recovery-item escalation and the next tick has a clear continuation.
- `WAITING_HUMAN_OR_EXTERNAL`: a concrete question or external condition suspends new dispatch, but the automation remains active and continues observing.
- `BLOCKED`: the exact task contains a concrete product question, external blocker or failed verification evidence.
- `CONFLICT`: task title is missing/mismatched, duplicate writers/tasks exist, ownership overlaps, commits disagree, or main is dirty/diverged.
- `AUTOMATION_DOWN`: automation is absent/paused, project binding is invalid, or recent scheduled runs stopped appearing.
- `STALLED_SUSPECTED`: no definitive conflict exists, but at least three automation intervals passed without task updates, worktree changes, commit movement or a concrete blocker.
- `ROADMAP_COMPLETE`: every approved milestone and work item is complete, final quality/main-origin proof passed and the automation is intentionally paused.

Do not label a long implementation `STALLED_SUSPECTED` merely because coordinator runs keep exiting. A live task with fresh commentary, filesystem changes or commit progress is healthy.

## Drift Patterns To Call Out

- Work item `queued` while an exact task is already active.
- Work item `ready-for-integration` while the task is completed but coordinator repeatedly reports conflict.
- Task title null/truncated/prompt-shaped instead of exact `WI-... 제목`; report `RECOVERABLE_IDENTITY_DRIFT` only when the unique-candidate proof passes, otherwise `CONFLICT`.
- Final worktree commit exists but is absent from main after multiple coordinator intervals.
- Main already contains the source commit while the work item is not `done`.
- A live/stale lease blocks multiple scheduled runs.
- Automation runs every cadence but repeats the same no-mutation conflict.
- Queued item has no task after two completed coordinator runs.
- A recent coordinator title remains `실행중` after its turn is idle/interrupted, or its title result disagrees with the final turn evidence.
- The same conflict appears in two runs without escalation, or three runs pass without a recovery item/task; this violates autonomous convergence.

## Team-Lead Report

Reply in plain Korean, in this order:

1. **무엇을 만들고 있는가** — feature name and real stage.
2. **무엇을 열어 볼 수 있는가** — exact task title and clickable task when available.
3. **무엇이 실제로 막혀 있는가** — one concrete cause, or `없음`.
4. **판정** — one health classification with a one-sentence reason.
5. **근거** — compact main/task/worktree/commit/automation/lease facts.
6. **다음 안전 조치** — one exact action; say no action is needed when healthy.

Never answer with only internal IDs, generic “진행 중”, or “확인이 필요합니다”. Distinguish “automation is running” from “roadmap is progressing”.
