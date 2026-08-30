# Polygon RPG Autonomous Development Process

이 문서는 메인 대화에서 등록한 원문을 Markdown inbox에 그대로 보존하고, 매번 새로 시작하는 standalone scheduled run이 Git desired state를 직접 개발·검증·통합해 approved design 완료로 수렴시키는 운영 계약이다. 단일 queue/lifecycle owner는 [`../feedback/INBOX.md`](../feedback/INBOX.md), 제품 방향은 [`../DESIGN.md`](../DESIGN.md), 현재 상태는 [`../STATUS.md`](../STATUS.md), 품질 기준은 [`quality-loop.md`](./quality-loop.md), controller 근거는 [`loop-engineering-references.md`](./loop-engineering-references.md)다.

프로젝트 개발 요청에는 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. `$dev-loop-status`는 같은 상태를 변경하지 않고 진단한다.

## 공식 Codex 실행 근거와 현지 판정

- [OpenAI Scheduled tasks](https://learn.chatgpt.com/docs/automations)는 standalone run이 매번 새 대화에서 무인 실행되고, Git project의 local checkout 또는 격리 worktree에서 실행될 수 있으며, 조직 정책이 허용하면 `approval_policy = "never"`를 사용한다고 설명한다.
- [OpenAI Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)는 Git worktree가 같은 repository의 변경을 독립 checkout으로 격리한다고 설명한다.
- 이 host의 실제 session evidence에서 local scheduled run은 `approval_policy = "never"`였고, 별도 managed task는 `on-request`였다. Prompt text는 이 권한 경계를 바꾸지 못한다.

따라서 scheduled run 자신이 autonomous writer다. 새 대화는 disposable context이고 지속 상태는 main inbox entry·전용 branch·persistent worktree·checkpoint/final/integration commit에 둔다. 별도 구현 task나 Computer Use 승인 클릭을 만들지 않는다.

## 역할과 소유권

### Product Director — 사용자

- 메인 대화에서 평소처럼 새 개발을 명령한다. 별도 `등록` 키워드는 필요 없다.
- 핵심 재미, 제품 방향, 우선순위와 approved DESIGN 범위를 결정한다.
- 자동 검사와 기존 의도로 결정할 수 없는 양립 불가 Product Decision이나 구체적 체감 질문에만 답한다.
- 명령, checkpoint, commit, merge, push와 안전한 복구를 반복 승인하지 않는다.

### Team-Lead Main — Inbox Intake / Status

- 일반적인 build/change/fix 명령을 새 개발 등록으로 해석하고 현재 사용자 메시지 전체를 한 글자도 재작성하지 않은 `IN-*` entry로 append한다.
- 질문·상태 조회·기존 entry lifecycle·예시/가정·현재 task 직접 처리 요청은 새 entry로 등록하지 않는다.
- Inbox append만 commit/push하고 완료 후 멈춘 automation을 재활성화한 뒤 즉시 반환한다.
- 상태·priority·pause·cancel·reopen은 exact entry metadata만 바꾸며 원문 block을 수정하지 않는다.
- 구현·품질 tuning·완료 대기·main integration은 수행하지 않는다. 사용자가 현재 대화에서 직접 처리를 명시한 workflow maintenance는 예외다.

### Standalone Direct Executor Tick

- Fresh context에서 `origin/main`, nonterminal inbox entry, executor refs/worktrees, commit graph와 lease를 다시 읽는다.
- `accept/provision`, `implement/checkpoint`, `fresh verification/finalize`, `integrate`, `recover` 중 한 lifecycle transition만 수행한다.
- Persistent worktree에서 직접 구현하고 branch를 push한다. Checkpoint/final 뒤 같은 transition에서 main inbox metadata를 commit/push한다.
- 다음 fresh run이 writer와 분리된 verifier가 되어 실제 Canvas/mobile path와 affected checks를 확인한다.
- Clean final을 non-rewriting merge commit으로 main에 통합하고 INBOX·STATUS·필요한 DESIGN을 정합해 push한다.
- 이전 run memory와 transient task ID를 source of truth로 사용하지 않는다.

### Optional Helper

Subagent는 한 run 내부의 bounded exploration, 증명된 disjoint implementation 또는 read-only verification만 수행한다. Parent run이 같은 executor branch에 결과를 통합하고 품질 gate를 소유한다.

## Durable 실행 구조

```text
메인 대화 → 원문 그대로 inbox entry append·main push → 즉시 종료
fresh tick → new entry 실행 계약 파생·persistent branch/worktree provision → main·branch push → 종료
fresh tick → 같은 worktree 직접 구현·검사 → checkpoint branch push·main inbox 갱신 → 종료
fresh tick → 독립 재검증·실제 화면 QA → final branch push·main inbox 갱신 → 종료
fresh tick → final diff 재검증 → main merge commit·INBOX done·STATUS/DESIGN 갱신·push → 종료
다음 fresh tick → 다음 inbox entry, DESIGN gate 또는 완료 증명
```

Run 종료, interruption, checkpoint와 한 entry 통합은 전체 loop 종료가 아니다. 명시적 pause 또는 durable completion proof만 automation을 멈춘다.

## Inbox Identity와 원문 불변

- 새 실행 ID는 `IN-YYYYMMDD-HHmmss`; 충돌에는 `-02`, `-03`을 붙인다.
- `docs/feedback/INBOX.md`가 새 개발의 유일한 queue, lifecycle, execution state와 result owner다.
- Main은 등록 대상으로 지정된 원문을 공백·오탈자·Markdown까지 그대로 `원문 — 불변` block에 넣는다. 요약 title, 목표와 완료 조건은 raw block 밖에 coordinator가 파생한다.
- 원문 정정은 새 entry와 `supersedes` link로 남긴다. Terminal/nonterminal status와 executor evidence가 같은 entry의 중복 소비를 막는다.
- Entry는 deterministic `executor_branch: codex/loop/<lowercase-in-id>`를 소유한다.
- Worktree 절대 경로는 저장하지 않는다. `git worktree list --porcelain`과 executor branch가 identity이며 기본 경로는 `~/.codex/loop-worktrees/polygon-rpg/<IN-ID>`다.
- `loop/worktree.mjs`는 branch/worktree를 재사용·재구성하고 예상 경로의 미등록 파일은 삭제하지 않는다.

## Main-Only Inbox Rule

Executor branch는 `docs/feedback/INBOX.md`와 `docs/STATUS.md`를 수정하지 않는다. Implementation/final commit에는 entry-owned code와 canonical 문서만 포함한다. Branch push 뒤 coordinator가 main checkout의 inbox entry와 STATUS에 checkpoint, phase, current best, validation과 result를 기록한다.

이 분리는 active branch가 실행되는 동안 메인 대화가 새 원문을 append해도 central inbox에서 merge conflict가 생기지 않게 한다. Main inbox가 lifecycle source이고 branch commit graph가 구현 evidence다. 둘이 어긋나면 commit graph와 immutable raw ID로 idempotent하게 정합한다.

## 상태와 one-tick transition

```text
new → implementing → verifying → ready-for-integration → integrating → done
          ↑              │
          └── correction checkpoint ──┘
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

1. **New / accept-provision:** 원문을 보존한 채 title·goal·completion·non-scope·quality axes·owned paths를 파생한다. Main entry를 `implementing`으로 commit/push하고 그 commit에서 worktree/baseline branch를 만들어 push한다.
2. **Implementing:** Worktree에서 가장 큰 병목 하나를 개선한다. Affected checks 뒤 checkpoint를 branch에 commit/push하고 main entry의 current best·next bottleneck·validation과 다음 phase를 commit/push한다.
3. **Verifying:** 새 run이 branch-only owned diff, 결정적 검사와 실제 artifact를 재검증한다. 실패하면 correction checkpoint와 `implementing`, 통과하면 clean final branch commit과 main `ready-for-integration`을 기록한다.
4. **Ready:** Final이 latest main을 포함하지 않으면 main을 branch에 non-rewriting merge하고 `verifying`으로 되돌린다. 통과하면 main에서 `--no-ff --no-commit` merge 후 INBOX `done`, result, STATUS와 필요한 DESIGN을 같은 integration commit에 정합하고 push한다.
5. **Done:** Final/result와 integration self-reference를 INBOX·STATUS에 남긴다. Branch/worktree를 자동 삭제하거나 history rewrite하지 않는다.

한 transition은 필요한 branch commit/push와 main inbox evidence commit/push를 함께 끝낼 수 있다. 다음 phase나 entry까지 연쇄 실행하지 않는다.

## Lease와 동시 실행

- 모든 write 전 `loop/lock.mjs acquire --repo <repo> --expected-head <main-head> --lease-minutes 30`으로 writer lease를 얻는다.
- 10분 이상 걸리면 각 단계 사이와 모든 mutation 직전에 current clean main HEAD로 renew한다.
- Coordinator-owned main commit 뒤 새 HEAD로 renew한다. Live lease가 있거나 main이 예상과 다르면 mutation 없이 종료한다.
- Stale takeover는 script rule만 사용하고 exact token을 `finally`로 release한다.
- 같은 repository라는 이유만으로 충돌로 보지 않고 entry ID, branch-only diff, owned paths와 ancestry를 확인한다.

## 승인 없는 실행과 실제 정지 조건

- 안전한 edit, 명령, 검사, checkpoint/final commit, executor branch push, non-rewriting main merge와 main push는 추가 승인을 묻지 않는다.
- Prompt나 child task로 권한을 우회하지 않는다. Scheduled run 자체의 tool permission 실패는 `blocked: execution-permission`으로 기록한다.
- 사람에게 묻는 것은 가역 default가 없는 Product Decision, Canonical Conflict, credential·외부 system뿐이다.
- 포괄적인 “승인해 주세요”나 “의견을 기다립니다” 상태는 금지한다.

## Candidate-First 품질 loop

```text
baseline 실행·채점 → 가장 큰 병목 하나 → safe reversible 구현
→ 결정적 검사 → branch checkpoint push → main inbox current-best 갱신
→ 다음 fresh run의 실제 artifact·독립 검증 → final 또는 correction
```

- 단위는 처음부터 끝까지 실행 가능한 사용자 시나리오다.
- 적용 품질 축에 0 또는 1이 남으면 final/integration으로 진행하지 않는다.
- 수학·frame·판정 검증과 실제 Canvas/mobile 관찰을 분리한다.
- 같은 원인의 결함·지적이 두 번 확인되고 기계 측정 가능할 때만 가장 작은 durable check로 승격한다.
- 사람 판단이 필요하면 entry에 실행 경로, 볼 위치·조작, 질문 1~3개와 답의 영향을 기록하고 automation은 ACTIVE로 관찰한다.

## 자동 복구

다음을 대조한다.

1. Main INBOX의 nonterminal entries, DESIGN과 STATUS
2. Executor local/remote ref와 registration ancestry
3. Registered worktree HEAD와 dirty paths
4. Checkpoint/final/integration graph와 branch-only diff
5. Entry current best, result와 validation evidence

- Branch는 있으나 worktree가 없으면 같은 branch에서 재생성한다.
- Dirty owned paths는 current best에서 계속하고 unknown paths는 conflict로 보존한다.
- Remote branch만 있으면 tracking branch/worktree를 복구한다.
- Inbox phase가 commit보다 뒤면 graph를 기준으로 metadata를 정합한다.
- Latest main drift는 branch에 merge하고 다시 `verifying`한다.
- Push 실패는 같은 hash를 재시도한다.
- Partial main merge는 intent와 staged paths가 유일할 때만 완료하거나 abort한다.
- 같은 실패를 두 번 단순 보고하지 않고 다음 safe repair로 승격한다.

Force push, shared-history rewrite, broad reset, guessed cleanup, threshold 하향과 별도 queue/task 생성은 복구 수단이 아니다.

## Pause, Cancel, Reopen

- **Pause:** Main entry를 `paused`로 commit/push하고 branch/worktree/checkpoint를 보존한다.
- **Cancel:** Partial branch evidence를 보존하고 entry를 `cancelled`로 기록한다. Partial code를 merge하지 않는다.
- **Reopen/Correction:** 사용자가 등록한 새 원문을 새 entry로 append하고 `supersedes`로 연결한다. 기존 raw block은 수정하지 않는다.
- 이미 통합된 변경 취소는 새 inbox entry로 revert 요청을 등록한다.

## Automation과 완료

- 이름: `Polygon RPG file-memory loop`
- 대상: saved local Git project, 기본 주기 10분
- 시작 제목: `C yyyyMMdd-HHmm · 실행중`
- 종료 제목: `C yyyyMMdd-HHmm · <IN suffix/roadmap> · <진행|검증|통합|복구|대기|충돌|잠금중|중단|완료>`

Automation은 approved milestone 모두 완료, nonterminal inbox entry 없음, 마지막 quality proof 통과, clean `main == origin/main`, unreconciled executor writer와 Canonical Conflict 없음이 한 fresh snapshot에서 증명된 뒤에만 completion evidence를 push하고 `PAUSED`가 된다. 새 inbox 등록은 같은 automation을 재활성화한다.

## 팀장 안내와 보고

팀장-facing 답변은 `무엇을 만들고 있음 → 무엇을 볼 수 있음 → 무엇이 실제로 막힘` 순서의 쉬운 한국어로 쓴다. 원문은 inbox에서 그대로 유지하고 derived title·summary는 원문을 대체하지 않는다.

완료 기록은 INBOX·STATUS에 실제 변경 파일, 새 동작/플레이 결과, 검증·미확인 범위와 checkpoint/final/integration evidence 순서로 남긴다.
