# Polygon RPG Autonomous Development Process

이 문서는 file-memory 개발 loop의 역할·소유권·durable state 경계를 정의한다. 실제 등록, 실행, 직접 처리, 상태 판정, 복구와 제어의 **유일한 절차 원본**은 [`loop/PROMPT.md`](../../loop/PROMPT.md)다. Skill은 prompt mode를 선택하는 trigger adapter이고 별도 실행 절차를 소유하지 않는다.

## Source ownership

| Source                                         | 소유 내용                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| [`../DESIGN.md`](../DESIGN.md)                 | 안정된 제품 방향, milestone, non-scope, 품질 계약                           |
| [`../feedback/INBOX.md`](../feedback/INBOX.md) | immutable raw request, queue schema와 lifecycle source of truth             |
| [`../STATUS.md`](../STATUS.md)                 | 현재 위치, current best, blocker와 완료 evidence의 재구성 가능한 projection |
| [`loop/PROMPT.md`](../../loop/PROMPT.md)       | 모든 operational mode의 실제 실행·QA·commit·복구·판정 절차                  |
| [`quality-loop.md`](./quality-loop.md)         | persona, quality rubric과 반복 개선 기준                                    |
| Git, lease, log, artifact                      | 실행과 통합을 증명하는 durable runtime evidence                             |

Conversation과 session ID는 memory가 아니다. STATUS가 어긋나면 immutable INBOX ID와 Git graph, executor ref/worktree, lease, log와 artifact로 재구성한다.

## Trigger adapters

| Trigger                                  | Prompt mode                             | 책임                                         |
| ---------------------------------------- | --------------------------------------- | -------------------------------------------- |
| `$dev-inbox-interview` / interview-first | `INTERVIEW`                             | mutation 없이 요청 구체화와 exact 원문 승인  |
| 일반 새 개발 명령 / `$dev-inbox-add`     | `INBOX_INTAKE`                          | 원문 등록만 하고 반환                        |
| `$dev-team-loop`                         | `CONTROL`                               | background loop 켜기·끄기·상태               |
| Windows outer loop                       | `BACKGROUND_ENTRY` / `ROADMAP_CONVERGE` | fresh session 하나의 실행 mode 지정          |
| `$dev-inbox-direct`                      | `DIRECT`                                | 기존 entry 하나를 현재 대화가 claim하고 완결 |
| `$dev-loop-status`                       | `STATUS`                                | read-only evidence snapshot과 판정           |
| `$dev-loop-recover`                      | `RECOVER`                               | 안전한 supervisor 복구·재기동                |
| Exact entry pause/cancel/reopen          | `LIFECYCLE`                             | 원문을 보존한 lifecycle mutation             |

Trigger skill은 mode 이름, 명시적 경계와 canonical prompt 링크만 가진다. Claim 순서, 검사 목록, health 분류, recovery 정책이나 commit 절차를 skill reference에 복제하지 않는다.

## 역할과 소유권

### Product Director — 사용자

- 메인 대화에서 평소처럼 새 개발을 명령한다. 별도 `등록` 키워드는 필요 없다.
- 등록 전에 구체화하려면 `$dev-inbox-interview`를 사용한다.
- 제품 방향과 양립 불가 선택만 결정한다. 실행·commit·merge·복구를 반복 승인하지 않는다.

### Team-Lead Main — intake와 control

- 새 build/change/fix 메시지를 `INBOX_INTAKE`로 전달한다.
- 질문, 상태/제어, 기존 lifecycle, 예시, interview와 direct-work 요청은 새 entry로 만들지 않는다.
- 구현·품질 tuning·완료 대기를 소유하지 않는다.
- `$dev-team-loop`는 background 개발을 직접 하지 않고 Task Scheduler controller만 조작한다.

### Background Complete-Work Session

- [`loop/loop.ps1`](../../loop/loop.ps1)이 entry마다 새 `codex exec --ephemeral` session을 연다. `resume`, `fork`, `--continue`와 이전 대화 ID를 사용하지 않는다.
- Outer loop는 exact entry와 `BACKGROUND_ENTRY`, 또는 queue 이후 `ROADMAP_CONVERGE`만 전달한다.
- Fresh parent session은 canonical prompt를 다시 읽고 entry 하나를 current evidence에서 clean main integration과 live-INBOX cleanup까지 완결한다.
- Parent는 candidate final 뒤 turn history를 상속하지 않는 mandatory read-only verifier subagent를 띄운다. Verifier는 exact candidate만 독립 검증하며 code·Git·lifecycle을 수정하지 않는다.
- FAIL은 같은 parent가 수리하고 새 verifier에게 다시 맡긴다. Exact candidate PASS 전에는 integration하지 않는다.
- `implementing`, `verifying`, `ready-for-integration`과 checkpoint는 interruption marker이지 정상 session 종료점이 아니다.
- Entry 부재만으로 성공하지 않는다. Outer loop는 clean pushed main, integrated/pushed executor final, clean worktree와 released lease를 함께 검증한다.

### Direct Conversation Session

- Explicit `$dev-inbox-direct`만 existing entry를 `direct-*`로 claim한다.
- Claim이 있으면 background selector는 다른 entry와 ROADMAP을 시작하지 않는다.
- 현재 대화가 같은 completion gate까지 소유하며 `codex exec`이나 Windows loop에 재위임하지 않는다.
- 중단 evidence는 보존하고 다음 explicit direct invocation이 resume한다.

Verifier subagent는 merge gate를 소유하는 필수 read-only 독립 역할이다. 그 밖의 subagent는 한 execution session 안의 bounded helper일 뿐이며 parent가 같은 executor branch에 통합한다.

## Durable architecture

```text
사용자 명령 ──INBOX_INTAKE──> immutable INBOX entry + main push
                                      │
Task Scheduler ──outer loop──> fresh BACKGROUND_ENTRY session
                                      │
                    developer branch/worktree + candidate final
                                      │
                    fresh read-only verifier subagent PASS
                                      │
                       main merge + terminal evidence + cleanup
                                      │
                 completion postcondition ──> next fresh session

explicit DIRECT ──claim──> 같은 completion postcondition
STATUS ──read only──> evidence report
RECOVER ──safe restart──> outer loop가 fresh recovery 수행
CONTROL ──on/off/status──> 즉시 반환
```

## Queue와 Git ownership

- Entry ID는 `IN-YYYYMMDD-HHmmss`; 동일 초 collision은 suffix로 구분한다.
- 원문은 공백·표현·오탈자·Markdown까지 immutable이다. 변경된 요청은 새 entry와 `supersedes` link로 남긴다.
- 한 entry는 deterministic `codex/loop/<lowercase-in-id>` branch와 persistent worktree 하나를 가진다.
- Executor branch는 INBOX와 STATUS를 수정하지 않는다.
- Main integration commit이 terminal raw/result와 STATUS를 먼저 보존하고 cleanup commit이 exact `done` block만 live queue에서 제거한다.
- Background와 direct active status는 합쳐서 한 writer만 허용한다.

## Lifecycle와 recovery boundary

Background lifecycle은 `new → implementing → verifying → ready-for-integration → integrating → done → cleanup`, direct lifecycle은 `new → direct-implementing → direct-verifying → direct-integrating → done → cleanup`이다. 이 상태는 session 간 checkpoint지만 한 run이 의도적으로 잘게 끊기는 workflow가 아니다.

Main mutation은 renewable lease와 expected HEAD를 사용한다. Unknown dirty paths, duplicate writers, divergent commits와 ambiguous partial merge는 보존하고 `CONFLICT`로 분류한다. Stale lease takeover, worktree 복구, done cleanup과 completion 판정은 repository helper가 결정적으로 수행한다.

Background abnormal exit는 Task Scheduler restart가 새 memoryless session을 열어 durable evidence에서 복구한다. Supervisor 자체가 멈추면 `$dev-loop-recover`가 canonical `RECOVER` mode로 안전한 상태만 수리하거나 재기동하고 즉시 반환한다. `direct-*` claim은 background로 넘기지 않는다.

## Windows supervisor

- 환경과 절대 실행 경로: [`loop/env.ps1`](../../loop/env.ps1)
- Outer loop: [`loop/loop.ps1`](../../loop/loop.ps1)
- 제어: [`loop/control.ps1`](../../loop/control.ps1) `install|start|stop|status|enable|disable|run-once|uninstall`
- Task Scheduler는 로그인 시작, `MultipleInstances IgnoreNew`, abnormal exit restart와 unlimited execution time을 사용한다.
- `install`은 validation을 위해 disabled로 등록한다.
- `start`는 STOP을 제거하고 task를 enable/start한다.
- `stop`은 task를 disable해 다음 trigger를 막고 STOP을 기록한다. 실행 중 entry는 강제 종료하지 않고 완결 후 정상 종료한다.
- `run-once`는 명시적인 진단·validation 경로이며 `$dev-team-loop` bare 호출의 의미가 아니다.
- 날짜별 `logs/YYYY-MM-DD/<run>-<IN-ID>/`에 JSONL event, last message와 summary를 남긴다.

Queue가 비어도 approved DESIGN이 남아 있으면 `ROADMAP_CONVERGE`가 playable job을 계속 완결한다. 전체 milestone과 quality proof, clean Git/inbox/executor 상태가 수렴했을 때만 completion proof를 남기고 outer loop가 정상 종료한다.

## Authorization과 report

Normal edit·affected check·Korean commit·branch push·non-rewriting main merge/push는 승인 대상이 아니다. 사람 입력은 가역 default가 없는 Product Decision, Canonical Conflict, credential 또는 외부 차단에만 필요하다. Force push, shared-history rewrite, broad reset, guessed cleanup, 별도 queue/task와 품질 threshold 하향은 복구가 아니다.

완료 evidence에는 변경 결과, deterministic checks, 적용 가능한 실제 PNG/metadata, checkpoint/final/integration hash와 미확인 경계를 남긴다. 팀장 보고는 `무엇이 완성됨 → 어디서 볼 수 있음 → 실제 blocker` 순서의 쉬운 한국어를 사용한다.
