# Polygon RPG Autonomous Development Process

이 문서는 사용자가 제품 방향을 정하고, 매번 새로 시작하는 standalone scheduled run이 Git에 기록된 desired state를 직접 개발·검증·통합해 roadmap 완료로 수렴시키는 운영 계약이다. 제품 milestone은 [`roadmap.md`](./roadmap.md), 품질 기준은 [`quality-loop.md`](./quality-loop.md), 일반 controller 근거는 [`loop-engineering-references.md`](./loop-engineering-references.md)가 소유한다.

프로젝트 개발 요청에는 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. `$dev-loop-status`는 같은 상태를 변경하지 않고 진단한다.

## 공식 Codex 실행 근거와 현지 판정

- [OpenAI Scheduled tasks](https://learn.chatgpt.com/docs/automations)는 standalone run이 매번 새 대화에서 무인 실행되고, Git project의 local checkout 또는 격리 worktree에서 실행될 수 있으며, 조직 정책이 허용하면 scheduled task가 `approval_policy = "never"`를 사용한다고 설명한다.
- [OpenAI Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)는 Git worktree가 같은 repository의 변경을 독립 checkout으로 격리한다고 설명한다.
- 이 저장소의 실제 session evidence에서는 local scheduled run은 `approval_policy = "never"`였지만, run이 `create_thread`로 생성한 Codex-managed worktree task는 `on-request`였다. Prompt의 “승인 없이 진행” 문장은 이 도구 권한 경계를 바꾸지 못한다.

따라서 autonomous writer는 승인 요청이 생기는 별도 work-item task가 아니라 **scheduled run 자신**이다. 새 대화는 disposable execution context이고, 지속 상태는 work item·전용 branch·persistent worktree·checkpoint/final/integration commit에 둔다. Computer Use로 승인 버튼을 대신 누르거나 prompt로 시스템 권한을 우회하지 않는다.

## 역할과 소유권

### Product Director — 사용자

- 핵심 재미, 제품 방향, 우선순위와 approved roadmap 범위를 결정한다.
- 새 요구·수정·pause·cancel·reopen을 메인 대화에 남긴다.
- 자동 검사와 기존 의도로 결정할 수 없는 양립 불가 제품 선택이나 실제 체감 질문에만 답한다.
- 명령 실행, checkpoint, commit, merge, push와 안전한 복구를 반복 승인하지 않는다.

### Team-Lead Main — Git Queue / Status

- 요청 원문과 lifecycle 명령을 최소 Git work item에 기록하고 main에 commit/push한 뒤 즉시 반환한다.
- automation이 완료 후 멈춰 있었다면 같은 automation을 재활성화한다.
- 현재 기능, 실행 단계, 볼 수 있는 결과와 실제 blocker를 Git evidence에서 요약한다.
- gameplay 구현·품질 tuning·완료 대기·main integration은 수행하지 않는다. 사용자가 현재 대화에서 직접 처리를 명시한 workflow 자체 maintenance는 예외다.

### Standalone Direct Executor Tick

- 매 run fresh context에서 `origin/main`, roadmap, open work item, executor branch/worktree, commit graph와 lease를 다시 읽는다.
- 하나의 open item에 대해 `provision`, `implement/checkpoint`, `fresh verification/finalize`, `integrate`, `recover` 중 **한 lifecycle transition**만 수행하고 종료한다.
- persistent worktree에서 직접 코드를 작성하고 품질 loop를 실행한다. 별도 사용자 소유 task를 생성·재개·승인 대기하지 않는다.
- deterministic checks가 통과한 runnable candidate를 checkpoint commit으로 보존하고 executor branch를 push한다.
- 다음 fresh run이 마지막 writer와 분리된 verifier가 되어 실제 Canvas/mobile path와 affected checks를 다시 확인한다.
- clean final을 non-rewriting merge commit으로 main에 통합하고 work item·roadmap을 갱신해 push한다. Merge/commit/push 허가는 승인된 loop 범위에 포함된다.
- transient run/task ID와 이전 대화 memory를 source of truth로 사용하지 않는다.

### Optional Helper

Subagent는 한 scheduled run 내부의 bounded exploration, 증명된 disjoint implementation 또는 read-only verification에만 사용할 수 있다. Parent run이 결과를 수집·통합하고 같은 executor worktree와 quality gate를 소유한다. 새 Codex task·handoff·별도 writer는 autonomous work item을 대체하지 않는다.

## Durable 실행 구조

```text
팀장 메인 → work item 등록·main push → 즉시 종료
fresh tick → lease → queued item의 전용 branch/worktree provision → main·baseline branch push → 종료
fresh tick → 같은 worktree 직접 구현·검사 → checkpoint commit·branch push → 종료
fresh tick → 독립 재검증·실제 화면 QA → final commit·branch push → 종료
fresh tick → final diff 재검증 → main merge commit·done/roadmap 기록·push → 종료
다음 fresh tick → 다음 queue/roadmap item 또는 완료 증명
```

대화 종료, run interruption, 한 checkpoint, 한 item 통합과 이전 context 소실은 전체 loop 종료가 아니다. 명시적 pause 또는 durable roadmap 완료만 automation을 멈춘다.

## Work Item과 executor identity

- 위치: `docs/development/work-items/<id>-<slug>.md`
- ID: `WI-YYYYMMDD-HHmmss`; 충돌에는 `-02`, `-03`을 붙인다.
- 새 item은 `executor: scheduled-coordinator`와 deterministic `executor_branch: codex/roadmap/<lowercase-id>`를 기록한다.
- `registration_base`는 등록 commit 직전 main, `owned_paths`는 branch-only diff가 허용되는 최소 write boundary다.
- worktree 절대 경로는 Git 문서에 저장하지 않는다. `git worktree list --porcelain`과 executor branch가 identity이며, 기본 경로는 `~/.codex/roadmap-worktrees/polygon-rpg/<ID>`다.
- `scripts/roadmap-worktree.mjs ensure --repo <repo> --item <ID> --base <commit>`은 기존 branch/worktree를 재사용하고, 없으면 보존된 local/remote branch에서 복구하거나 새 worktree를 만든다. 예상 경로에 미등록 파일이 있으면 삭제하지 않고 중단한다.
- 과거 item의 `task_title`과 Codex-managed worktree는 legacy evidence로 보존하지만 새 item identity나 writer로 사용하지 않는다.

진행 중 baseline, current best, 다음 병목, checkpoint/final hash와 검증 evidence는 executor branch의 work-item `실행 상태`에 기록한다. Main의 item은 queue와 lifecycle phase를 표시하고, 다음 run은 branch의 더 최신 item body와 actual diff를 함께 읽는다.

## 상태와 one-tick transition

```text
queued → implementing → verifying → ready-for-integration → integrating → done
             ↑              │
             └── fix/checkpoint ──┘
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

1. **Queued / provision:** main에 executor identity와 `implementing`을 기록·push하고 persistent worktree를 provision commit에서 생성한 뒤 baseline executor branch도 push한다. 중간에 끊기면 다음 run이 main/local/remote branch 존재 여부로 idempotent하게 완성한다.
2. **Implementing:** 같은 worktree에서 가장 큰 병목 하나를 구현한다. affected deterministic checks 뒤 runnable checkpoint와 실행 상태를 commit하고 executor branch를 push한다. Candidate가 완전하면 branch item을 `verifying`으로 둔다.
3. **Verifying:** 새 run이 branch-only diff, owned paths, Reference 결정, 결정적 검사와 실제 artifact를 독립 재검증한다. 실패하면 원인과 다음 병목을 기록한 correction checkpoint를 만들고 `implementing`으로 되돌린다. 통과하면 clean final commit과 `ready-for-integration`을 push한다.
4. **Ready:** latest `origin/main`이 final의 조상이 아니면 executor branch에 non-rewriting merge하고 재검증 대상으로 되돌린다. 조상이면 main에서 `git merge --no-ff --no-commit <executor_branch>` 후 item을 `done`으로, 필요한 roadmap/report를 같은 integration commit에 정합하고 검사 뒤 push한다.
5. **Done:** source final, main integration hash와 검증 evidence를 Git에 남긴다. Executor branch/worktree를 자동 삭제하거나 history rewrite하지 않는다.

한 transition 안의 commit·push·상태 기록은 하나의 recoverable state change다. Transition 뒤 다음 item까지 연쇄 실행하지 않는다.

## Lease와 동시 실행

- main mutation 또는 executor worktree write 전 `scripts/roadmap-coordinator-lock.mjs acquire --repo <repo> --expected-head <main-head> --lease-minutes 30`으로 writer lease를 얻는다.
- 10분 이상 걸리는 run은 각 조사·구현·검증·commit 단계 사이와 모든 mutation 직전에 `renew --token <token> --expected-head <current-main-head> --lease-minutes 30`을 실행한다.
- Renew는 main branch·exact HEAD·clean state가 모두 맞을 때만 성공한다. Coordinator 자신이 main commit을 만든 뒤에는 새 HEAD로 renew한다.
- 다른 live lease가 있으면 아무것도 만들지 않고 종료한다. Heartbeat가 30분 끊긴 stale lease만 script의 deterministic rule로 takeover하며 기존 owner evidence를 보존한다.
- 항상 exact token을 `finally` 방식으로 release한다. Crash는 timeout 뒤 다음 run이 복구한다.
- 같은 repository라는 이유만으로 충돌로 보지 않고 branch-only diff, `owned_paths`, dependency와 commit ancestry를 확인한다.

## 승인 없는 실행과 실제 정지 조건

- Scheduled run은 현재 host에서 확인된 `approval_policy = never`와 local full-access execution을 사용한다. Automation prompt는 이 경계를 좁히는 별도 task를 만들지 않는다.
- 안전한 file edit, 명령, 검사, checkpoint, executor branch push, non-rewriting main merge와 main push는 추가 승인을 묻지 않는다.
- Prompt로 권한을 우회하거나 Computer Use로 승인 UI를 조작하지 않는다. 조직 정책이 `never`를 허용하지 않아 tool permission이 막히면 `blocked: execution-permission`으로 정확히 기록한다.
- 사람에게 묻는 것은 현재 요구·roadmap·Reference로 추론할 수 없고 가역 default도 없는 양립 불가 Product Decision, Canonical Conflict, credential/외부 system 차단뿐이다.
- 조작감·Graphics 같은 정성 축도 기존 의도와 rubric으로 합리적 candidate를 만들 수 있으면 먼저 구현·검증·통합한다. 포괄적인 “승인해 주세요”나 “의견을 기다립니다” 상태는 금지한다.

## Candidate-First 품질 loop

```text
baseline 실행·채점
→ 가장 큰 병목 하나
→ safe reversible 구현
→ 결정적 검사
→ runnable checkpoint commit·branch push
→ 다음 fresh run의 실제 artifact·독립 검증
→ final commit 또는 correction checkpoint
```

- 개발 단위는 처음부터 끝까지 실행 가능한 사용자 시나리오다.
- 적용 품질 축에 0 또는 1이 남으면 final/integration으로 진행하지 않는다.
- 수학·frame·판정 검증과 실제 Canvas/mobile 관찰을 분리한다.
- 같은 원인의 결함·지적이 두 번 확인되고 기계적으로 측정 가능할 때만 가장 작은 durable check로 승격한다.
- 팀장 판단이 정말 필요하면 최신 coordinator run 제목을 `C yyyyMMdd-HHmm · <item> · 대기`로 남기고 work item에 `볼 위치·조작 방법·질문 1~3개·답이 바꾸는 것`을 기록한다. Automation은 ACTIVE로 관찰만 계속한다.

## 자동 복구

다음 evidence를 순서대로 대조한다.

1. main의 open item·roadmap과 automation 상태
2. `executor_branch` local/remote ref와 registration ancestry
3. `git worktree list --porcelain`, worktree HEAD와 dirty paths
4. checkpoint/final/integration commit graph와 branch-only diff
5. work-item 실행 상태, report와 검증 evidence

복구 action은 다음 순서로 하나만 수행한다.

- branch는 있으나 worktree가 없으면 같은 branch에서 worktree를 재생성한다.
- worktree dirty면 owned paths와 마지막 checkpoint를 확인해 같은 item을 이어간다. Unknown path는 보존하고 `conflict`로 분류한다.
- local branch가 없고 remote executor branch가 있으면 remote branch를 tracking해 복구한다.
- `verifying`/`ready` evidence가 commit보다 앞서면 commit graph를 우선하고 상태를 정합한다.
- latest main drift는 executor branch에 merge하고 다시 `verifying`한다. Rebase·force push·shared-history rewrite를 하지 않는다.
- partial main merge는 MERGE_HEAD, owned diff와 intended item이 유일할 때만 완료하거나 abort 후 재시도한다. Unknown main change는 건드리지 않는다.
- 같은 실패를 두 번 단순 보고하지 않는다. 다음 safe repair로 승격하고 세 번 반복되면 high-priority recovery item에 exact evidence를 기록한다.

Guessed worktree 삭제, broad reset, 품질 threshold 하향, 미확인 사용자 변경 overwrite와 별도 승인 대화 생성은 복구 수단이 아니다.

## 자동 main 반영

Integration은 다음 조건을 모두 만족해야 한다.

- executor worktree가 clean이고 branch item이 `ready-for-integration`이다.
- final commit과 report/result가 존재하고 latest `origin/main`을 포함한다.
- `git diff <merge-base>...<final>`의 모든 path가 `owned_paths` 안이다.
- affected syntax/lint/format, `git diff --check`, 실제 사용자/Canvas path와 fresh-run independent verification이 통과했다.
- main이 clean하고 lease의 exact HEAD와 같다.

Coordinator는 명시적 한국어 merge commit으로 executor branch와 main 상태 기록을 함께 통합하고 일반 push한다. Work item 안의 integration reference는 self-referential hash 대신 `이 문서를 done으로 만든 merge commit`으로 기록하며 실제 hash는 Git graph와 run 결과가 제공한다. Fast-forward만 해 두고 status 기록을 뒤에 남기는 두 단계 partial integration을 기본값으로 사용하지 않는다. Push 실패는 commit을 보존하고 다음 run이 같은 hash를 재시도한다.

## Pause, Cancel, Reopen

- **Pause:** 메인이 item을 `paused`로 commit/push한다. Tick은 branch/worktree를 보존하고 write하지 않는다. Resume은 같은 branch/worktree를 쓴다.
- **Cancel:** partial branch와 checkpoint evidence를 보존하고 main item을 `cancelled`로 기록한다. Partial implementation을 merge하거나 worktree를 자동 삭제하지 않는다.
- **Reopen:** 기존 item은 terminal 상태로 유지하고 `reopens`로 연결한 새 item·새 executor branch를 만든다.
- 이미 통합된 변경을 취소하려면 history rewrite 대신 별도 revert work item을 등록한다.

## Automation과 run 제목

- 이름: `Polygon RPG 무상태 roadmap coordinator`
- 대상: saved `polygon-rpg` local Git project
- 기본 주기: 10분
- 각 run 시작 제목: `C yyyyMMdd-HHmm · 실행중`
- 정상 종료: `C yyyyMMdd-HHmm · <M/WI> · <결과>`; 결과는 `진행`, `검증`, `통합`, `복구`, `대기`, `충돌`, `잠금중`, `중단`, `완료` 중 하나다.
- `실행중`이 남으면 interruption evidence다. 이전 run memory는 current state가 아니다.

Automation은 approved milestone 모두 완료, open lifecycle item 없음, 마지막 slice 품질 통과, clean `main == origin/main`, unreconciled executor branch/commit과 Canonical Conflict 없음이 한 fresh snapshot에서 모두 증명된 뒤에만 completion record를 push하고 `PAUSED`로 바뀐다. 새 요청 등록 시 같은 automation을 다시 `ACTIVE`로 만든다.

## 팀장 안내 문장

팀장-facing 답변은 쉬운 한국어로 `무엇을 만들고 있음 → 무엇을 볼 수 있음 → 무엇이 실제로 막힘` 순서로 쓴다. 내부 ID·branch·hash는 정확성 보조 정보로만 붙인다. 질문에 답할 때는 첫 문장에 뜻을 직접 답한다.

구체적 판단 항목 없이 `승인`, `feedback`, `확인`을 요청하지 않는다. 판단이 필요하면 구현된 기능과 실행 경로, 볼 위치·조작, 관찰 질문 1~3개와 답에 따라 달라지는 것을 한 번에 제시한다.

업무 완료 기록은 실제 변경 파일, 새 동작/플레이 결과, 실행한 검증과 미확인 범위, report 링크, checkpoint/final/integration hash 순서로 남긴다. 작은 bug·maintenance는 work-item `결과`가 report를 대신한다.
