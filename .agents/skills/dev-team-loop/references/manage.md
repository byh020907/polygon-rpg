# Inbox Direct Executor Coordinator Mode

This mode performs one fresh reconcile transition. `docs/feedback/INBOX.md` is the only queue/lifecycle source and `docs/STATUS.md` is its current projection.

## Fresh Snapshot And Lease

1. Rename the run `C yyyyMMdd-HHmm · 실행중` using Asia/Seoul time.
2. Read required canonical docs and every nonterminal inbox entry. Never use previous conversation memory as state.
3. Fetch origin; record clean/dirty main, inbox phases, executor refs/worktrees, branch commits, automation and lease.
4. Before a write, acquire a 30-minute exact-HEAD lease with `loop/lock.mjs`. Renew at least every 10 minutes and before every mutation; release the exact token in `finally`.
5. A live lease, unknown main change or unknown worktree path stops mutation without deleting evidence.

## Durable Identity

One execution is identified by:

- `IN-*` entry in main inbox;
- immutable raw block;
- `executor_branch: codex/loop/<lowercase-in-id>`;
- local/remote branch and registered persistent worktree;
- checkpoint/final/integration ancestry and owned paths.

Use `node loop/worktree.mjs status --repo <repo> --entry <IN-ID>` to inspect and `ensure ... --base <commit>` only under the lease. Never create a parallel queue document or implementation task.

Executor branches never modify INBOX or STATUS. After branch commit/push, update both on main and commit/push that evidence before ending the transition.

## One-Tick Decision Order

Execute the first matching transition and exit:

1. **Recover:** finish/retry one uniquely proven partial inbox/branch/worktree/push transition.
2. **Integrate:** verify and merge one `ready-for-integration` entry, then mark it done on main.
3. **Verify/finalize:** independently verify one `verifying` branch; record final or correction checkpoint on main.
4. **Implement/checkpoint:** advance one `implementing` entry by one focused iteration; record checkpoint/next phase on main.
5. **Accept/provision:** derive an execution contract for the highest-priority oldest `new` entry, mark it implementing, commit/push main, create and push its baseline branch/worktree.
6. **Human/external wait:** preserve one concrete blocker; keep automation active.
7. **Derive DESIGN entry:** only when approved DESIGN has an unmet gate and no nonterminal inbox entry, append one `new` entry with the exact canonical gate text as raw source. Do not provision it in the same tick.
8. **Complete:** no nonterminal inbox entry, approved DESIGN complete, quality proof valid, clean main/origin and no unreconciled executor writer; persist proof and pause.

One transition may contain branch commit/push and its main INBOX·STATUS evidence commit/push. Do not continue to the next phase or entry.

## Accept And Provision

1. Select by explicit priority then oldest ID. Ensure no other active entry exists.
2. Keep the raw block byte-for-byte unchanged.
3. Derive outside it: concise title, goal, completion conditions, non-scope, quality axes and exact owned paths.
4. Set `status: implementing`, `accepted_at`, deterministic executor branch and execution baseline on main; commit/push.
5. Renew against the new main HEAD. Ensure the persistent worktree from that commit and push the unchanged baseline branch with upstream.
6. If interrupted, next tick completes only the missing main/branch/worktree/push half. Do not implement in this tick.

## Implement And Checkpoint

1. Read the raw request and current main-owned execution contract/state, then relevant code, callers and References.
2. Work only in the executor worktree and owned paths. Never edit INBOX or STATUS in the branch.
3. Improve one largest bottleneck toward the complete vertical slice.
4. Run affected checks and `git diff --check`; prove a visual candidate is runnable when applicable.
5. Commit entry-owned code/canonical changes with a Korean message and push the executor branch.
6. On main, update the entry's checkpoint, baseline/current best, next bottleneck, validation and phase (`implementing` or `verifying`); project the same current state into STATUS, commit/push, and exit.

The writer run never marks its own candidate final or integrates it.

## Fresh Verification And Finalize

1. Require a fresh run that did not author the latest candidate.
2. Verify clean worktree, branch HEAD, latest-main ancestry, branch-only owned diff and deterministic checks.
3. For Canvas/UI/gameplay, run the real path and inspect controls, console, resize and applicable Polygon/Retro/mobile outputs.
4. Rescore the same rubric; any applicable 0/1 fails.
5. On failure, make at most one focused correction in the branch, commit/push, then update main INBOX·STATUS back to `implementing` with exact evidence.
6. On success, create/push a clean final commit, then update main INBOX·STATUS to `ready-for-integration` with final/result/validation evidence.

## Integration

1. If final lacks current `origin/main`, merge main into the executor branch without rewriting history, recheck, push and update main INBOX·STATUS to `verifying`.
2. Require clean executor worktree, final/result evidence and all branch-only paths inside owned paths.
3. On clean main at the lease HEAD, `git merge --no-ff --no-commit <executor_branch>`.
4. Before commit, update the main inbox entry to `done`, record final/result and integration as `the merge commit that marks this entry done`; update STATUS, DESIGN and canonical docs as required.
5. Run affected checks and `git diff --check`, create one Korean merge commit and normal-push main. Report the resulting hash without rewriting the commit to contain itself.
6. Preserve executor evidence; do not auto-delete branches/worktrees.

## Recovery And Stop Conditions

- Missing worktree with valid local/remote branch: recreate it.
- Dirty owned paths: continue from the current best; unknown paths are conflict.
- Main inbox phase behind branch evidence: commit graph wins and metadata is reconciled idempotently.
- Push failure: preserve and retry the same hash.
- Interrupted main merge: continue/abort only when intent and paths are unique.
- Same cause twice advances to the next safe repair; three repeats create a `blocked` recovery entry, not another queue system.

Do not use force push, shared-history rewrite, broad reset, guessed cleanup, replacement tasks or approval UI clicks.

## Titles And Completion

Release lease before normal exit. Final title is `C <stamp> · <IN suffix/roadmap> · <result>`, under 40 characters, using `진행`, `검증`, `통합`, `복구`, `대기`, `충돌`, `잠금중`, `중단` or `완료`.

Pause automation only when every approved milestone is complete, no inbox entry is nonterminal, latest quality proof passes, main equals origin and no executor writer/conflict remains. New registered inbox input reactivates it.
