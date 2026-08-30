# Stateless Coordinator Tick

One fresh standalone run performs one reconciliation tick and exits. The coordinator has no durable conversational memory: Git work items, roadmap, exact Codex task titles, managed worktrees and commit graph are authoritative.

## 1. Acceptance Criterion

한 tick은 fresh evidence에서 roadmap desired state와 observed Git/task/worktree state의 차이를 정확히 분류하고, 검사와 ownership이 증명된 안전한 forward 또는 recovery action 하나만 수행해 그 차이를 줄여야 한다. 필요한 검사를 통과하지 못하면 commit, integration 또는 dispatch하지 않는다.

## 2. Read First

이 순서와 범위로 읽는다. 이전 coordinator task의 대화나 summary는 읽을 문서가 아니다.

1. `AGENTS.md`: 전체. precedence, Canonical Rule Registry와 verification pipeline.
2. `.agents/skills/dev-team-loop/SKILL.md`: 전체. Coordinator Tick mode와 shared invariants.
3. 이 문서와 `work-item-schema.md`: 전체.
4. `docs/development/process.md`: 역할·one-tick lifecycle·Git 책임·상태·복구 계약.
5. `docs/development/quality-loop.md`: integration 대상의 rubric, artifact, current best와 final commit 계약.
6. `docs/development/roadmap.md`: milestone 표, 현재 미완료 milestone 전체와 approved completion gate.
7. `docs/development/work-items/`: open lifecycle item의 frontmatter와 본문 전체. 완료 item은 ancestry·중복 판정에 필요한 범위만.
8. integration/recovery일 때만 해당 report와 `loop-engineering-references.md` 전체.

## 3. Rules And Reasons

- 매 tick은 standalone scheduled run의 새 task/context다. 대화를 이어 쓰면 transient memory가 durable state로 오인되어 중복 dispatch와 잘못된 recovery가 생긴다.
- 한 tick에서 state-changing action은 하나다. registration, dispatch와 integration을 연쇄하면 중간 실패 뒤 어느 evidence가 authoritative인지 모호해진다.
- 기억은 Git roadmap·work item·report와 exact task/worktree/commit evidence에 둔다. task summary, transient ID와 coordinator 대화는 다음 run이 독립 검증할 수 없다.
- mutation 전 repo lease와 exact main HEAD를 확인한다. scheduled run과 bare manual tick이 겹쳐도 writer가 하나여야 한다.
- gameplay 구현·tuning·artifact 품질 판정은 work-item task가 소유한다. Coordinator가 대신 수정하면 one-item/one-director와 worktree 격리가 깨진다.
- task 생성·조회·제목 복구는 Codex app task tool로만 수행한다. Git만 보고 task state를 추측하면 duplicate writer를 만들 수 있다.
- force push, history rewrite, guessed cleanup, 다른 task worktree 수정과 미확인 사용자 변경 overwrite를 하지 않는다. 자동 복구는 evidence를 보존해야 다음 fresh run이 이어갈 수 있다.

## 4. One-Tick Sequence

`문서 읽기 → run title 기록 → fresh snapshot → lease → One-Tick Decision Order의 action 하나 → 실제 evidence 검사 → 필요한 commit/task/status 기록 → lease 해제 → final run title과 결과 보고`

다음 action을 같은 tick에 미리 수행하지 않는다. Work-item task를 만들거나 재개한 뒤 wait/poll하지 않고, integration 뒤 다음 item을 dispatch하지 않는다.

## 5. Commit Ordering

- Coordinator-owned Git mutation은 exact diff, ownership과 affected checks가 통과한 즉시 scoped commit/push로 durable하게 만든 뒤 종료한다. 화면을 볼 gameplay 변경은 이 tick이 작성하지 않는다.
- Work-item task는 deterministic checks가 통과하면 실제 화면·팀장 관찰 전에 recoverable candidate checkpoint commit을 만든다. 이 commit은 final quality approval이 아니며, visual QA와 독립 검증 뒤의 clean final commit만 integration 대상이다.
- 회차가 중단됐는데 commit도 task/worktree evidence도 없으면 완료로 추측하지 않는다. 다음 tick은 남은 durable evidence만으로 recovery를 시작한다.

## 6. Checks And QA

- 최소 evidence: branch/HEAD, clean/dirty main, latest `origin/main`, open item identity, lease, relevant task/worktree와 commit ancestry.
- Git mutation: affected syntax/lint/format, `git diff --check`, `owned_paths`와 parent graph를 검사한다.
- 화면이 있는 결과를 통합할 때는 work-item task가 실제 Canvas/mobile artifact를 직접 읽었고 같은 state, console과 resize path를 확인했는지 검증한다. 코드가 실행되는 것과 화면이 합격인 것은 다른 증거다.
- 같은 원인의 실패나 팀장 지적이 두 번 확인되면 work item에 rule candidate를 남긴다. 기계적으로 잴 수 있으면 이 반복 방지 계약을 사용자 승인으로 간주해 가장 작은 canonical check로 승격한다.
- 정상 종료는 action, 검사, commit/task evidence와 다음 fresh tick이 읽을 durable state를 빠짐없이 남긴다.

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
