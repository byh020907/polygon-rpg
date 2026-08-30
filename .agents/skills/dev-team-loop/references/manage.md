# Direct Executor Coordinator Mode

This mode is one fresh scheduled/manual reconcile transition. It directly advances Git state; it does not dispatch a separate implementation conversation.

## 1. Acceptance Contract

Reduce the difference between approved roadmap/queue state and observed Git state by exactly one recoverable lifecycle transition. Success requires evidence in main or the executor branch. A chat response alone is not progress.

## 2. Fresh Snapshot

1. Rename the calling run to `C yyyyMMdd-HHmm · 실행중` using Asia/Seoul time.
2. Read required canonical docs and the full open work item. Do not use previous run memory as state.
3. Fetch origin. Record clean/dirty main, local/remote main HEAD, open items, executor refs/worktrees, branch-only commits and automation status.
4. Read legacy task evidence only for a pre-migration open item. New item matching never depends on a Codex task title.
5. Select the first safe transition from the decision order below.

## 3. Lease

Before any Git/worktree write, acquire:

```text
node scripts/roadmap-coordinator-lock.mjs acquire --repo <repo> --expected-head <main-head> --lease-minutes 30
```

- Exit `잠금중` without mutation when another lease is live.
- Renew with the exact token/current clean main HEAD between research, implementation, verification and commit phases, at least every 10 minutes:

  ```text
  node scripts/roadmap-coordinator-lock.mjs renew --repo <repo> --token <token> --expected-head <main-head> --lease-minutes 30
  ```

- If main HEAD changes outside this run or main becomes unexpectedly dirty, stop mutation.
- After a coordinator-owned main commit, renew against the new clean HEAD before more state changes.
- Release the exact token in `finally`. Stale takeover is script-owned; never delete the lock manually.

## 4. Durable Identity

New item identity is:

- work-item ID/path on main;
- `executor_branch: codex/roadmap/<lowercase-id>`;
- local or `origin/<executor_branch>` ref;
- `git worktree list --porcelain` entry when present;
- registration/checkpoint/final/integration commit ancestry;
- `owned_paths` and branch-only diff.

Use `node scripts/roadmap-worktree.mjs status --repo <repo> --item <ID>` to inspect. Use `ensure ... --base <registration-or-provision-commit>` only under the lease. It reuses a registered worktree, recreates one from the local/remote executor branch, or creates the deterministic branch/worktree. It never deletes an unexpected path.

Legacy `task_title` and managed worktrees are evidence only for historical items. Never create a new task to escape a permission failure.

## 5. One-Tick Decision Order

Execute the first matching transition and exit:

1. **Recover:** repair a uniquely proven missing worktree from its executor branch, recover a remote branch, finish/retry a proven partial push/status transition, or record exact conflict evidence.
2. **Integrate:** one clean `ready-for-integration` branch passes integration gates; merge, mark done/roadmap, commit and push.
3. **Verify/finalize:** one branch is `verifying`; a fresh run independently checks actual diff and artifact, then makes a final commit or correction checkpoint.
4. **Implement/checkpoint:** one item is `implementing`; perform one focused iteration in its persistent worktree, validate, checkpoint and push.
5. **Provision:** one queued item exists; mark it implementing on main, commit/push, then ensure its executor branch/worktree from that provision commit.
6. **Human/external wait:** preserve one concrete non-inferable question or external blocker. Create no writer and keep automation active.
7. **Register roadmap item:** no open item owns the next unmet approved gate; create/push one minimal item. Provision occurs next tick.
8. **Complete:** all completion proof conditions pass; persist any missing completion evidence, push, pause the automation and exit.

One transition may contain the commit/push/state record needed to make that transition durable. Do not continue into the next phase or next item in the same run.

## 6. Provision

1. Confirm registration is on current main and dependencies are done.
2. Ensure the item records `executor: scheduled-coordinator`, deterministic branch and scoped `owned_paths`.
3. Change main status to `implementing`; commit/push a Korean scoped message.
4. Renew the lease using the new main HEAD.
5. Ensure the worktree at that provision commit and push the unchanged baseline executor branch with its upstream. This makes recovery independent of one local worktree.
6. If interrupted after main push, local branch creation or branch push, the next tick completes only the missing part idempotently. Do not implement in the provision tick.

## 7. Implement And Checkpoint

1. Read the executor-branch item state, relevant code/callers and required References.
2. Fix one largest bottleneck toward the complete vertical slice. Use a safe reversible default for inferable decisions.
3. Keep all edits inside `owned_paths`; expand scope on main in a separate proven transition when necessary.
4. Run affected deterministic checks and `git diff --check`. For a runnable visual candidate, start the actual app path enough to prove it is inspectable.
5. Update the branch item's `실행 상태`: current phase, baseline, current best, next bottleneck, checks and checkpoint hash placeholder.
6. Commit only item-owned changes with a Korean message. Push the executor branch normally, creating its upstream when it is first provisioned.
7. If the complete candidate and deterministic path pass, set branch status to `verifying`; otherwise remain `implementing` with the next bottleneck. The new commit itself is the recoverable checkpoint.

Do not mark the candidate final or integrate it in the writer run.

## 8. Fresh Verification And Finalize

1. Require a fresh run whose current turn did not author the candidate checkpoint.
2. Fetch and verify executor worktree clean, branch HEAD, registration/latest-main ancestry and branch-only owned diff.
3. Re-run affected syntax/lint/format, `git diff --check` and domain checks after the last writer.
4. For Canvas/UI/gameplay changes, run the real user path and inspect shared state, controls, console, resize and applicable Polygon/Retro/mobile outputs. Code execution is not visual proof.
5. Rescore the same rubric. Any applicable 0/1 fails finalization.
6. On failure, implement at most one focused correction, update evidence, checkpoint/push and return to `implementing`. A later fresh run verifies again.
7. On success, update result/report and branch item to `ready-for-integration`, record checks and final evidence, create a clean Korean final commit and push.

## 9. Integration

1. Fetch latest origin. If the final does not contain current `origin/main`, merge `origin/main` into the executor branch without rewriting history, rerun affected checks, checkpoint/push and return to `verifying`.
2. Require clean executor worktree, `ready-for-integration`, final/report evidence and all branch-only changed paths within `owned_paths`.
3. Require clean main at the lease HEAD. Run appropriate independent checks again when risk warrants.
4. On main, run `git merge --no-ff --no-commit <executor_branch>`. Resolve only unambiguous item-owned conflicts; otherwise abort the merge and record conflict.
5. Before the merge commit, set the work item to `done`, record final and integration intent, update roadmap/canonical owner as required, and stage only the merge plus coordinator-owned records.
6. Run affected checks and `git diff --check`; create one Korean integration merge commit and normal-push main.
7. In the item, identify integration as `the merge commit that marks this item done`; report the actual resulting hash from Git after commit. Never add or rewrite a commit merely to insert its own hash.
8. Preserve executor branch/worktree evidence. Do not auto-delete local or remote branches.

## 10. Recovery Ladder

- Missing worktree + valid local/remote executor branch: recreate worktree from the same branch.
- Dirty worktree with only owned paths: inspect and continue from the current best; commit nothing unverified.
- Unknown dirty path or overlapping item: preserve and report `conflict`.
- Branch state ahead of main item: commit graph wins; reconcile main lifecycle without duplicating work.
- Main drift: merge current main into executor branch and require fresh verification.
- Push failure: preserve local commit and retry the same hash on a later tick.
- Interrupted main merge: continue or abort only when MERGE_HEAD, item and staged paths uniquely prove intent.
- Same cause twice: attempt the next safe repair. Three repeats: register/resume a high-priority recovery item with exact evidence.

Never use force push, rebase shared history, broad reset, guessed cleanup, threshold reduction, a replacement approval task or Computer Use approval clicks.

## 11. Human And Permission Boundaries

Scheduled execution already owns approved in-scope edits, commands, checkpoints, branch push, main merge and main push. Do not ask the team lead to approve those operations.

Pause only for a concrete Product Decision without a reversible default, Canonical Conflict, missing credential/external system, or actual tool-level permission failure. Record the exact failed operation/evidence. Tool permission failure is not repaired by creating a different task.

## 12. Completion Proof And Titles

Keep automation `ACTIVE` until one fresh snapshot proves:

- every approved milestone complete;
- no open lifecycle item;
- latest integrated slice passes quality and actual-path verification;
- clean `main == origin/main`;
- no unreconciled executor commit/branch writer or Canonical Conflict.

Then persist/push completion evidence if needed and pause `polygon-rpg-roadmap-coordinator` while preserving configuration.

Release the lease before every normal exit. Final title is `C <stamp> · <item> · <result>`, under 40 characters, with result `진행`, `검증`, `통합`, `복구`, `대기`, `충돌`, `잠금중`, `중단` or `완료`. An unexpected `실행중` title is interruption evidence.
