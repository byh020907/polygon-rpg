# Stateless Coordinator Tick

One fresh standalone run performs one reconciliation tick and exits. The coordinator has no durable conversational memory: Git work items, roadmap, exact Codex task titles, managed worktrees and commit graph are authoritative.

## Acquire And Snapshot

1. Fetch `origin/main` and inspect the main checkout, roadmap, work items, Codex task list/status, managed worktrees and commit graph.
2. Classify dirty/diverged main, overlapping writers and conflicting evidence before mutation, then route them through the recovery ladder instead of repeating a terminal conflict report.
3. Record the exact main HEAD, then acquire the repo-local 20-minute lease with:

   ```text
   node scripts/roadmap-coordinator-lock.mjs acquire --repo <repo> --expected-head <main-head> --lease-minutes 20
   ```

4. Exit successfully without waiting when another live lease exists. A stale lease may be taken over only by the script's deterministic lease rule; its preserved evidence must be reported.
5. Immediately before every mutation, confirm main HEAD still equals the acquired snapshot. On drift, release the lease and exit for the next tick.

Always release the exact token in a `finally`-style cleanup. A crash is recovered by the lease timeout; queue state never lives in the lock.

## Coordinator Run Title

Scheduled runs must distinguish themselves from work-item tasks without Computer Use.

1. After reading required instructions and before repository reconciliation, obtain the current Asia/Seoul stamp as `yyyyMMdd-HHmm` and call the Codex task-title tool for the calling task, omitting `threadId`, with `C <stamp> · 실행중`.
2. Keep the same stamp for the whole run. Before every normal exit, after releasing any acquired lease, rename the calling task to `C <stamp> · <item> · <result>`.
3. Use the roadmap source such as `M4` as `<item>`; otherwise use `WI-<last-six-digits>`, or `-` when no item applies.
4. Use exactly one short result: `진행확인`, `통합`, `업무생성`, `복구`, `충돌`, `잠금중`, `중단` or `완료`.
5. Keep the title under 40 characters. Never include prompts, paths, hashes or internal task IDs.

Title-tool failure is non-blocking: report it and continue the coordinator decision. An unexpected interruption may leave `실행중`, which is intentional diagnostic evidence. Never rename a work-item task; its exact `WI-... 제목` remains the durable recovery key.

## Task Identity And Recovery

1. Match each open item to at most one authoritative user-owned Codex task by exact title `WI-... 제목` and verify its project/worktree context.
2. Never persist a transient task ID as Git source of truth. Use stable work-item ID, exact title, registration base, owned paths, worktree and commit evidence.
3. If task creation succeeded but Git follow-up did not, the next tick discovers the exact title and reconciles it without creating another task.
4. If no exact-title task exists, classify title drift as safely repairable only when all of these are true:
   - exactly one open work item supplies the expected `task_title`, ID, path and `owned_paths`;
   - exactly one current or archived candidate task has that exact work-item ID or path in its original prompt/preview, not merely its summary;
   - the candidate belongs to the saved Polygon RPG project and its managed worktree exists;
   - the Git commit that first registered the work-item file is an ancestor of the candidate worktree HEAD;
   - the candidate worktree is clean or every dirty path is inside `owned_paths`;
   - no other task or worktree claims the item ID or overlaps its active owned paths;
   - the candidate title is null, truncated, prompt-shaped or the legacy delegation payload, not another well-formed `WI-...` title.
5. For proven unique drift, call the task-title tool on that candidate with the exact Git `task_title`, re-list current and archived tasks, and require exactly one exact match. Record the evidence in the automation run result, perform no Git or worktree mutation, and exit this tick with `복구`.
6. If a task was archived, a later tick may unarchive and resume the exact repaired task. Create a replacement only after proving the original task/worktree unavailable and no writer remains; record the recovery event.
7. Any failed repair precondition, duplicate task, overlapping owned paths, conflicting commit or dirty main produces `task-conflict`; create and integrate nothing.

## One-Tick Decision Order

After reconciliation, execute the first matching action and exit:

1. **Recoverable identity drift:** repair one uniquely proven malformed task title as defined above and exit.
2. **Recoverable lifecycle drift:** unarchive, resume, replace, rebase-by-merge or create a recovery item using the first applicable recovery-ladder action, then exit.
3. **Ready for integration:** verify and integrate exactly one item, update its result/roadmap and push. Do not dispatch another item in the same tick; the next tick continues.
4. **Active item:** if its authoritative task is implementing, report compact state and exit without wait/poll; the automation remains active.
5. **Human/external wait:** preserve the exact question/blocker, create nothing, keep the automation active and recheck on later ticks.
6. **Queued item without task:** recheck exact task titles and main HEAD, ensure registration is already pushed, then create exactly one user-owned managed-worktree task and exit.
7. **No active item:** select one highest-priority queue request or next unmet approved roadmap gate, register its minimal work item on main, commit/push, create exactly one new user-owned managed-worktree task, then exit.
8. **Roadmap complete:** persist completion proof, push it, pause this automation and exit.

Map the chosen action to the final run-title result: recovery action=`복구`; unresolved ambiguity=`충돌`; ready integration=`통합`; active item=`진행확인`; human/external wait=`대기`; queued/new item dispatch=`업무생성`; live lease=`잠금중`; handled unexpected failure=`중단`; roadmap complete=`완료`.

There is at most one default vertical work item in `implementing`, `feedback`, `ready-for-integration` or `integrating`. A normal task completion, coordinator response end, unchanged timeout or lost prior context is not a roadmap stop condition.

## Autonomous Recovery Ladder

Recover the loop's own state without waiting for the team lead. Perform at most one state-changing action per tick and preserve evidence before any replacement.

1. Repair uniquely proven title drift using the rules above.
2. If an exact task is idle/interrupted without a ready commit and no human question exists, send one recovery prompt to the same task describing the missing gate and current Git evidence; do not create a replacement.
3. If the task is archived, unarchive it in one tick; a later tick resumes the same task/worktree.
4. If a final candidate conflicts with latest main, send the same task a non-rewriting `origin/main` merge/revalidation instruction and require a new clean final commit.
5. If the task is unavailable but its clean worktree/final commit and owned-path evidence are complete, integrate the commit directly. Otherwise preserve a scoped checkpoint when safe and create one replacement recovery task for the same item from the proven commit.
6. If duplicate tasks exist, choose an authoritative task only when registration ancestry and commit containment strictly dominate all others. Preserve and archive redundant tasks without deleting worktrees. Divergent unique commits create a high-priority recovery item/task that reconciles them; they do not end the automation.
7. If main is dirty or diverged, finish or retry a known interrupted coordinator mutation when its paths and commit intent are uniquely proven. Unknown external/user changes remain untouched, but the automation stays active and reports the exact boundary each tick.
8. Do not repeat the same conflict-only outcome indefinitely. After two consecutive identical failures, the next tick must attempt the next safe recovery action. After three, register or resume a dedicated recovery item rather than merely reporting again.

Recovery never authorizes force push, shared-history rewrite, guessed deletion, lowering quality thresholds or overwriting unproven user changes.

## Completion Proof

The automation remains `ACTIVE` until all conditions are true in one fresh snapshot:

- every approved roadmap milestone is marked `완료`, including the finite M5 completion gate;
- no work item is `queued`, `implementing`, `feedback`, `ready-for-integration`, `integrating`, `blocked` or `paused`;
- the last integrated vertical slice passes its required checks and quality thresholds;
- main is clean and equals `origin/main`;
- no canonical conflict or unreconciled owned commit remains.

Then commit and push one durable roadmap-completion record, recheck the same proof, update automation `polygon-rpg-roadmap-coordinator` to `PAUSED` while preserving its full configuration, rename the run result `완료` and exit. Absence of a task, a temporary blocker or one successful milestone is never completion.

## Registration And Dispatch

1. Allocate `WI-YYYYMMDD-HHmmss`, adding the smallest deterministic suffix on collision.
2. Record exact `task_title`, `registration_base`, `owned_paths` and source in the minimal work-item document.
3. Commit and push registration from main with a concise Korean message.
4. Re-fetch and recheck main HEAD plus exact task title before task creation.
5. Resolve the saved Git project and call the user-owned `create_thread` surface with a Codex-managed worktree based on the pushed registration commit. Never use `fork_thread`, handoff, rename, a completed task or a root subagent.
6. The prompt contains only exact work-item path/title, roadmap gate, Run mode, ownership and completion contract. It does not inherit main or previous-work history.
7. Do not wait or poll after creation. A later tick observes it.

## Integration

1. Read the completed task's final evidence and obtain its final worktree commit hash.
2. Verify the registration base is an ancestor or otherwise explicitly reconciled; inspect parent history and actual diff.
3. Verify only `owned_paths` changed, the work item is `ready-for-integration`, the report/result exists and the source worktree is clean.
4. Rerun affected deterministic checks and the actual user/Canvas path in proportion to risk. A task summary alone is not evidence.
5. Fetch latest `origin/main` and confirm it still equals the lease snapshot. Never rewrite shared history.
6. Integrate by fast-forward, merge or cherry-pick only when the commit graph and scoped diff make that operation unambiguous. Use Korean messages for agent-authored commits.
7. Mark the item `done` with source worktree commit, resulting main integration commit and verification result. Update roadmap/canonical owner documents only as required, commit and push.
8. Preserve task/worktree/commit evidence before optional task archive. Never guess-delete a worktree.

## Pause, Cancel And Recovery

- **Pause/cancel intake:** the team-lead main task records the command in Git and exits. A coordinator tick sends it to the exact task and exits without waiting. A later tick reconciles its checkpoint/cancellation evidence.
- **Resume:** reuse the same task/worktree. Do not create a replacement while recoverable.
- **Recovery:** derive state only from Git items, exact titles, task status/history, managed worktree and commit graph. A generic `feedback` with no concrete question is sent back to the same task for validation and finalization.

## Main And Coordinator Replies

The team-lead main surface shows only: what is being built, which exact task can be opened and what is actually blocked. Coordinator ticks keep internal state out of the main conversation and finish after the single atomic action. Feedback questions and answers remain in the work-item task.
