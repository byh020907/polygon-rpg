# File-Memory Loop Engineering References

이 문서는 Polygon RPG complete-work loop의 설계 근거와 recovery matrix를 소유한다. 실제 실행 계약은 [`process.md`](./process.md), 품질 기준은 [`quality-loop.md`](./quality-loop.md), 환경값은 [`../../loop/env.ps1`](../../loop/env.ps1)이 canonical owner다.

## 채택한 controller model

```text
Desired state
  DESIGN · live INBOX · quality contract · clean origin/main
Observed state
  main · executor refs/worktrees · lease · run log · visual artifact
Complete-Work Reconcile Session
  recover → implement → check → visible QA → repair → final → integrate → cleanup
Outer supervisor
  Windows PowerShell loop + Task Scheduler abnormal-exit restart
```

이 구조는 long-running process의 desired/observed reconciliation, durable checkpoint, idempotent retry와 explicit termination을 게임 개발의 Git/file memory에 맞춰 사용한다.

### Kubernetes controller 원칙

[Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)는 desired state를 observed state에 가깝게 만드는 non-terminating control loop를 설명한다.

채택:

- 성공 기준은 conversation 종료가 아니라 entry가 clean main에 통합되고 live queue에서 정리됐는지다.
- 매 fresh session이 current Git/file evidence에서 재구성한다.
- State marker와 checkpoint는 restart 후 idempotent recovery를 가능하게 한다.

수정:

- Event watch 대신 local outer process가 queue를 확인한다.
- 하나의 successful reconcile session이 transition 하나가 아니라 **entry 하나 전체**를 완결한다.

### Durable execution 원칙

[Temporal Durable Execution](https://docs.temporal.io/workflow-execution)는 failure 뒤 durable progress에서 resume하는 실행 모델을 설명한다.

채택:

- DESIGN, STATUS, INBOX, Git commit/ref/worktree와 artifact만 durable state다.
- Checkpoint는 화면 QA 전과 correction마다 runnable current best를 보존한다.
- 재시작은 session history가 아니라 commit graph와 file state에서 이어간다.

수정:

- 별도 workflow database 대신 Git과 Markdown을 사용한다.
- Worktree가 사라져도 local/remote executor branch에서 재구성한다.

### Erlang/OTP supervision 원칙

[Erlang supervisor behavior](https://www.erlang.org/doc/system/sup_princ.html)는 child failure restart와 정상 종료를 구분한다.

채택:

- Codex nonzero exit 또는 미완료 entry는 abnormal failure다.
- `STOP`, concrete external blocker와 verified completion의 exit 0은 정상 종료다.
- Task Scheduler는 abnormal exit만 제한 횟수 재시작한다.
- Loop task는 `MultipleInstances IgnoreNew`, process는 PID guard를 사용한다.

수정:

- Restart intensity는 `loop/env.ps1`의 count/delay가 소유한다.
- 같은 failure를 반복할 때는 log와 durable evidence에서 다음 repair로 승격한다.

### GitHub Actions concurrency 원칙

[GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)는 동일 key의 concurrency group에서 동시 실행을 제한한다.

채택:

- Repository main write는 하나의 renewable lease로 직렬화한다.
- 동일 checkout의 outer runner는 PID guard와 Task Scheduler instance policy로 중복을 막는다.
- 다른 entry의 branch/worktree를 수정하지 않는다.

### OpenAI Codex non-interactive 실행

[OpenAI Codex](https://github.com/openai/codex)의 `codex exec`은 script/CI용 non-interactive path다. 설치된 CLI help에서 `exec`, `--ephemeral`, `--json`, `--output-last-message`, `--cd`, `--model`, `--sandbox`를 검증했다.

채택:

- Entry마다 `codex exec --ephemeral`을 새로 실행한다.
- `resume`, `fork`, `--continue`를 사용하지 않는다.
- Explicit PATH와 executable absolute path를 제공한다.
- `approval_policy="never"`를 executor process에 직접 준다.
- JSONL event와 last message를 날짜별 run log에 보존한다.

비채택:

- Codex app scheduled conversation이 또 다른 task를 만들고 승인을 기다리는 coordinator 구조
- 한 session이 checkpoint만 남기고 다음 scheduled conversation에 verifier/integration을 떠넘기는 구조
- Prompt text로 execution permission을 우회하는 구조

## 팀장 제공 fresh-session prompt 반영

팀장 prompt의 핵심은 `새 headless session`, `파일 기반 기억`, `한 회차의 완전한 작업`, `검사 후 recoverable commit`, `실제 창 PNG 직접 판독`, `날짜별 log`, `STOP`, `명시적 environment`다.

직접 채택:

- `loop/loop.ps1`, `loop/PROMPT.md`, `loop/env.ps1`, `loop/STOP`, `logs/`
- DESIGN/STATUS/INBOX 우선 읽기와 session 종료 전 STATUS 인수인계
- 실제 visible Chrome capture 후 종료하는 `loop/visual-qa.ps1`
- Windows Task Scheduler logon trigger와 control script

저장소에 맞게 수정:

- Shell은 host OS에 맞춰 PowerShell을 사용한다.
- Executor는 Claude가 아니라 `codex exec`이다.
- “하나만 만들기”는 entry 전체를 끝내는 동안 병목을 하나씩 수리한다는 inner-loop 규칙이다.
- Checkpoint 뒤 visual QA, final, integration과 cleanup을 같은 session에서 계속한다.
- Queue가 비면 `ROADMAP` session이 DESIGN의 남은 playable job 하나를 완결한다. 전체 완료 proof를 STATUS/Git에 남긴 뒤에만 정상 종료한다.

## Recovery matrix

| Observed drift                             | 같은 fresh session의 reconcile action                      | 성공 상태                                |
| ------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| `new`, executor ref 없음                   | 계약 파생, branch/worktree 생성, 구현 계속                 | 같은 session에서 integrated/cleaned      |
| Branch 있음, worktree 없음                 | 동일 branch로 재구성                                       | 구현/검증 계속                           |
| Dirty owned paths                          | current best와 diff 확인 후 계속                           | checkpoint 갱신                          |
| Unknown dirty paths                        | 보존하고 exact owner/conflict 기록                         | 안전한 resolution 또는 concrete block    |
| Checkpoint만 있음                          | affected checks와 visible PNG를 새로 실행                  | final/integration 계속                   |
| Final이 latest main 미포함                 | main을 branch에 non-rewriting merge, 재검증                | latest-main final                        |
| Ready entry                                | final diff/check 재확인 후 main merge                      | integration commit                       |
| Partial main merge                         | intent/staged paths가 유일하면 완료, 아니면 안전하게 abort | clean main                               |
| Integration 뒤 done block 잔류             | exact parser로 block만 제거, actual hash 기록              | live queue cleanup                       |
| Entry 부재지만 durable postcondition 미달  | origin 재조회, main/ref/lease의 빠진 증거부터 복구         | clean pushed integrated final·no lease   |
| Push 실패                                  | 같은 commit hash push 재시도                               | local==remote                            |
| Codex crash/tool failure                   | nonzero exit; Task Scheduler restart                       | 새 ephemeral session이 evidence에서 복구 |
| Concrete product/credential/external block | INBOX·STATUS에 exact blocker 기록                          | blocked 정상 종료                        |
| STOP present                               | 현재 entry 완결 뒤 outer loop exit 0                       | task normal stop                         |

## Completion proof

Outer loop는 단순히 queue가 잠시 비었다는 이유로 프로젝트를 완료 판정하지 않는다. 정상적인 roadmap completion에는 다음이 같은 fresh snapshot에서 모두 필요하다.

- Approved DESIGN milestone과 quality proof 완료
- Nonterminal live INBOX entry 없음
- Unreconciled executor branch/worktree·partial merge·live lease 없음
- Clean `main == origin/main`
- Canonical Conflict와 concrete blocker 없음
- Completion evidence가 STATUS/Git에 push됨

Entry run의 더 좁은 성공 조건은 `loop/completion.mjs`가 판정한다. Live entry 부재, partial merge 없는 clean `main == origin/main`, clean executor worktree, deterministic executor local/remote ref 일치와 main ancestry, lease 해제가 같은 snapshot에서 모두 참이어야 한다. 이 조건은 문서상 권고가 아니라 outer supervisor가 nonzero recovery를 결정하는 executable postcondition이다.

Task Scheduler는 설치 직후 disabled다. `run-once` 두 회가 Codex fresh-session 실행, Git integration, log와 visible QA 경로를 검증한 뒤에만 `start`/`enable`한다.

## 관찰 가능한 evidence

- `logs/YYYY-MM-DD/<yyyyMMdd-HHmmss>-<IN-ID>/events.jsonl`
- 같은 폴더의 `last-message.md`, `summary.json`
- `artifacts/visual-qa/<run>-<IN-ID>/*.png`와 JSON metadata
- INBOX lifecycle/current best/blocker, STATUS projection
- Executor/local/remote ref, checkpoint/final/integration commit graph
- Task Scheduler state/result, PID guard와 STOP presence

`$dev-loop-status`는 이 evidence를 read-only로 점검한다. 자동 repair는 다음 complete-work session이 소유한다.
