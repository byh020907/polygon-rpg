# Polygon RPG Autonomous Development Process

이 문서는 메인 대화의 개발 요청을 Markdown inbox에 원문 그대로 보존하고, Windows의 상주 PowerShell loop가 매번 기억 없는 새 `codex exec` session을 열어 요청 하나를 완전히 개발·검증·통합하는 운영 계약이다. Queue는 [`../feedback/INBOX.md`](../feedback/INBOX.md), 제품 방향은 [`../DESIGN.md`](../DESIGN.md), 현재 상태는 [`../STATUS.md`](../STATUS.md), 실행 prompt는 [`../../loop/PROMPT.md`](../../loop/PROMPT.md), 품질 기준은 [`quality-loop.md`](./quality-loop.md)가 소유한다.

## 실행 원칙

- Outer loop는 [`loop/loop.ps1`](../../loop/loop.ps1)이며 한 번만 실행된 채 entry 사이를 반복한다.
- Entry마다 `codex exec --ephemeral`을 새로 호출한다. `resume`, `fork`, `--continue`와 이전 대화 ID를 사용하지 않는다.
- 한 Codex session은 INBOX entry 하나를 선택해 복구·구현·검사·visible PNG QA·수정 반복·commit·main merge·INBOX 정리·STATUS 갱신까지 끝낸다.
- `implementing`, `verifying`, `ready-for-integration`은 중단 복구용 durable marker다. 정상적인 session 종료점이 아니다.
- 정상 범위 edit, 검사, Korean commit, branch push, non-rewriting main merge/push에는 승인을 묻지 않는다.
- 사람의 새 판단이 꼭 필요한 Product Decision, credential 또는 외부 system만 `blocked` 정상 종료 사유다. Tool 오류나 미완료 구현은 비정상 종료해 Task Scheduler restart가 새 session으로 복구한다.

[OpenAI Codex](https://github.com/openai/codex)는 `codex exec`을 non-interactive 실행 경로로 제공한다. 이 저장소는 설치된 CLI의 `--ephemeral`, `--json`, `--output-last-message`, `--cd`, `--model`, `--sandbox` 옵션을 실제 확인하고 사용한다. Prompt text로 권한을 우회하지 않고 실행기 자체에 `approval_policy="never"`와 명시적 PATH를 준다.

## 역할과 소유권

### Product Director — 사용자

- 메인 대화에서 평소처럼 새 개발을 명령한다. 별도 `등록` 키워드는 필요 없다.
- 등록 전에 구체화하고 싶으면 `$dev-inbox-interview` 또는 “인터뷰 먼저”를 사용한다.
- 제품 방향과 양립 불가 선택만 결정한다. 실행·commit·merge·복구를 반복 승인하지 않는다.

### Team-Lead Main — Intake / Status

- 새 build/change/fix 명령의 현재 메시지 전체를 한 글자도 바꾸지 않은 `IN-*` entry로 append하고 commit/push한다.
- 질문, 상태 조회, 기존 lifecycle 조작, 예시, 사전 인터뷰와 현재 task에서 직접 처리하라는 system maintenance는 등록하지 않는다.
- 구현이나 완료 대기는 소유하지 않는다. Windows loop가 꺼져 있으면 등록 뒤 `loop/control.ps1 start`로 재개할 수 있다.

### Complete-Work Executor Session

- Fresh context에서 main, INBOX, STATUS, DESIGN, executor branch/worktree, commit graph와 lease를 다시 읽는다.
- 기존 checkpoint, dirty owned path, final, partial merge와 남은 done block을 먼저 복구한다.
- 같은 entry를 처음부터 clean main integration까지 직접 완결한다.
- 화면이 적용되는 작업은 실제 Chrome 창으로 PNG를 저장하고 이미지를 직접 읽은 뒤 같은 session에서 수정·재촬영한다.
- 성공하면 entry가 live INBOX에서 사라진 상태로 종료한다. `blocked`가 아니면서 entry가 남아 있으면 outer loop가 실패로 판정한다.
- Outer loop는 session 종료 뒤 origin을 다시 fetch하고 partial merge 없는 clean `main == origin/main`, clean executor worktree, executor local/remote final 일치와 main 포함, lease 해제를 검사한다. Entry 부재만으로는 성공하지 않으며 이 durable postcondition 중 하나라도 빠지면 abnormal failure로 재시작한다.

Subagent는 한 session 내부의 bounded helper일 뿐이며 parent session이 같은 executor branch에 통합하고 전체 결과를 검증한다.

### Direct Conversation Executor

- 사용자가 `$dev-inbox-direct` 또는 현재 대화에서 INBOX 항목을 직접 진행하라고 명시할 때만 사용한다.
- 구현 전 clean-main lease를 획득하고 `loop/inbox.mjs claim-direct`로 exact `new` entry를 `direct-implementing`으로 commit/push한다.
- `direct-*` claim이 있으면 background selector는 다른 entry와 ROADMAP을 시작하지 않고 대기한다.
- 현재 대화가 implementation, visible QA, repair, final, main integration과 cleanup을 직접 소유하며 `codex exec`이나 Windows loop에 다시 전달하지 않는다.
- 중단되면 direct status와 branch/worktree evidence를 보존한다. 다음 explicit direct invocation이 resume하며 background loop가 ownership을 추측하지 않는다.

## Durable 구조

```text
메인 대화 → 원문 INBOX append·main push → 즉시 반환
PowerShell outer loop → next entry 선택
fresh codex exec session
  → 현재 evidence 복구
  → worktree에서 완전한 결과 구현
  → 결정적 검사·checkpoint push
  → visible Chrome PNG capture·직접 판독·같은 session 수리 반복
  → clean final push
  → latest main non-rewriting merge
  → terminal INBOX/result·STATUS를 merge commit에 보존
  → exact done block cleanup·actual merge hash 기록·push
session 종료 → STOP 확인 → 다음 entry용 새 codex exec
```

`loop/completion.mjs`가 위 종료 postcondition을 한 번에 판정한다. Runtime 검사와 fixture 검증이 같은 pure decision을 사용하며, `loop/loop.ps1`은 그 결과를 run summary에 그대로 남긴다.

Conversation은 disposable context이고 지속 기억은 DESIGN, STATUS, INBOX, Git commit, executor ref/worktree, log와 visual artifact다.

## Inbox identity와 main ownership

- ID는 `IN-YYYYMMDD-HHmmss`; 같은 초 충돌은 `-02`, `-03`을 붙인다.
- Live queue는 `docs/feedback/INBOX.md` 하나다. 등록 원문의 공백·표현·오탈자·Markdown을 바꾸지 않는다.
- Entry는 deterministic `codex/loop/<lowercase-in-id>` branch를 사용한다. 기본 worktree는 `~/.codex/loop-worktrees/polygon-rpg/<IN-ID>`다.
- Executor branch는 INBOX와 STATUS를 수정하지 않는다. Implementation과 final에는 entry-owned code/canonical 문서만 둔다.
- Main integration merge commit이 terminal raw/result를 보존한 뒤 cleanup commit이 exact `done` block만 live INBOX에서 제거한다.
- Status와 branch evidence가 어긋나면 immutable ID와 commit graph로 정합한다. 원문 정정은 새 entry와 `supersedes` link로 남긴다.

## Lifecycle marker와 session invariant

```text
new → implementing → verifying → ready-for-integration → integrating → done → live block cleanup
          ↑              │
          └── correction checkpoint ──┘
```

한 session은 필요하면 이 marker를 모두 갱신하지만 marker마다 종료하지 않는다.

Direct lane은 `new → direct-implementing → direct-verifying → direct-integrating → done → cleanup`을 사용하며 같은 completion gate를 통과한다.

1. **Accept / recover:** 실행 계약과 owned paths를 파생하고 deterministic branch/worktree를 만들거나 복구한다.
2. **Implement:** 처음부터 끝까지 실행 가능한 사용자 결과를 구현한다. 가장 큰 품질 병목을 해결하되 entry의 완료 조건 전체를 끝낸다.
3. **Checkpoint:** Affected deterministic checks 뒤 runnable current best를 branch에 commit/push한다. 화면 확인 전 중단 복구점이다.
4. **Visual verify / repair:** `loop/visual-qa.ps1`로 entry에 맞는 stable `GAME_START`와 fixed `GAME_FRAME` PNG를 만든다. 직접 읽고 기준 미달이면 같은 session에서 수정, 검사, checkpoint, capture를 반복한다.
5. **Final:** 적용 품질 축에 0/1이 없고 회귀 검사가 통과하면 clean final을 push한다.
6. **Integrate:** Latest main을 확인하고 필요하면 branch에 non-rewriting merge 후 재검증한다. Main에서 `--no-ff --no-commit`으로 합쳐 INBOX terminal result와 STATUS를 같은 merge commit에 기록한다.
7. **Cleanup:** 실제 merge hash를 STATUS에 기록하고 `loop/inbox.mjs remove-done`으로 exact live block만 제거해 push한다.

Interruption은 다음 fresh session이 같은 entry evidence에서 복구한다. 그러나 계획, 한 improvement, checkpoint, verification 또는 ready 상태를 정상 완료로 보고 종료하지 않는다.

## Lease와 동시 실행

- 모든 main write 전 `loop/lock.mjs`로 renewable writer lease를 획득한다.
- Outer loop의 `loop/runner.pid`가 같은 checkout의 중복 process를 막고 Task Scheduler는 `MultipleInstances IgnoreNew`를 사용한다.
- Live lease, 예상과 다른 main HEAD 또는 다른 writer가 있으면 destructive mutation을 하지 않고 evidence를 재조회한다.
- 10분 이상 걸리는 session은 mutation 사이에 lease를 renew한다. Main commit 뒤에는 새 HEAD로 renew한다.
- Exact token을 `finally`에서 release한다. Stale takeover는 script rule만 사용한다.

## 자동 복구

다음 desired/observed state를 매 session 시작에 대조한다.

1. Main INBOX nonterminal entries, DESIGN과 STATUS
2. Local/remote executor ref, registration ancestry와 latest main
3. Registered worktree HEAD, dirty owned/unknown paths
4. Checkpoint/final/integration graph, partial merge와 branch-only diff
5. Previous run log, last message와 visual QA metadata

- Branch만 있으면 같은 branch의 worktree를 재생성한다.
- Dirty owned paths는 current best에서 계속하고 unknown paths는 보존한 채 conflict로 판정한다.
- Remote branch만 있으면 tracking ref/worktree를 복구한다.
- Inbox marker가 graph보다 뒤처지면 graph에 맞춰 metadata를 정합한다.
- Latest main drift는 branch에 merge하고 affected checks와 PNG를 다시 확인한다.
- Push 실패는 같은 hash를 재시도한다. Partial merge는 staged intent가 유일할 때만 완료하거나 안전하게 abort한다.
- Integration 뒤 done block이 남았으면 다음 entry를 고르기 전에 exact cleanup을 끝낸다.
- Entry가 사라졌어도 main dirty/partial merge·origin 미동기화·executor worktree dirty·ref 미푸시/미통합·lease 잔류 중 하나가 있으면 그 session은 incomplete로 실패시키고 다음 fresh session이 durable evidence에서 복구한다.
- 같은 실패를 반복 보고하지 않고 다음 안전한 repair를 실행한다.
- Direct claim이 있으면 background loop는 idle하고 explicit direct resume 또는 authorized recovery를 기다린다.

Force push, shared-history rewrite, broad reset, guessed worktree cleanup, 품질 threshold 하향과 별도 queue/task 생성은 복구가 아니다.

## Windows 실행과 정지

- 환경과 절대 실행 경로: [`loop/env.ps1`](../../loop/env.ps1)
- Outer loop: [`loop/loop.ps1`](../../loop/loop.ps1)
- 제어: [`loop/control.ps1`](../../loop/control.ps1) `install|start|stop|status|enable|disable|run-once|uninstall`
- Task Scheduler는 사용자 로그인 시 시작하고 abnormal exit만 제한 횟수 재시작한다. `STOP` 또는 queue completion의 exit code 0은 재시작하지 않는다.
- `install`은 task를 **비활성 상태**로 등록한다. 두 번의 `run-once` 검증 뒤 `start` 또는 `enable`로 켠다.
- `stop`은 `loop/STOP`을 만들고 현재 entry가 완결된 뒤 정상 종료시킨다. 실행 중 강제 종료 요청이 아니다.
- 날짜별 `logs/YYYY-MM-DD/<run>-<IN-ID>/`에 JSONL event, 마지막 message와 summary를 남긴다.

Queue가 비면 `ROADMAP` fresh session이 DESIGN·STATUS·현재 코드를 대조해 남은 playable vertical job 하나를 완결한다. 더 할 approved scope가 없을 때만 STATUS에 `- Loop completion: VERIFIED`와 proof를 commit/push하고 outer loop가 정상 종료한다. Queue-empty snapshot만으로 멈추지 않는다.

## 완료 보고

완료 evidence에는 변경 파일, 실제 동작, deterministic checks, 직접 판독한 PNG 경로, console/viewport, checkpoint/final/integration hash와 미확인 범위를 남긴다. 팀장 답변은 `무엇이 완성됨 → 어디서 볼 수 있음 → 실제 blocker` 순서의 쉬운 한국어로 쓴다.
