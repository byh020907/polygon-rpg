# Polygon RPG Codex-Native Development Process

이 문서는 사용자가 팀장으로 제품 방향과 우선순위를 결정하고, Codex 앱의 메인 대화와 subagent thread가 업무 등록·구현·실체 기반 피드백·통합을 지속하는 프로젝트 운영 계약이다.

Reference-Guided Engineering은 각 loop 안의 Engineering Decision을 담당한다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, 각 work item의 품질 rubric과 개선 loop는 [`quality-loop.md`](./quality-loop.md)가 소유한다.

프로젝트 개발 요청에는 기본적으로 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. 사용자가 `이번 건은 직접 처리`처럼 workflow 우회를 명시한 요청만 일반 작업으로 처리한다.

## 역할과 대화 경계

### 팀장 — 사용자

- 핵심 재미, 제품 방향, 우선순위와 Reference를 결정한다.
- 구현된 결과의 코드 트리와 실제 플레이 artifact를 보고 방향 피드백을 제공한다.
- 양립하지 않는 제품 방향의 최종 선택을 소유한다.
- 이미 밝힌 의도, 계획 문서, 파일 구조와 class granularity 같은 Engineering Decision을 반복 승인하지 않는다.

### 메인 대화 — 팀장 Interface / Roadmap Coordinator

- 팀장이 생각나는 업무를 연속해서 전달하는 단일 창구다.
- Git work item 등록, queue, roadmap 파생, agent 배치, 검증, commit·push와 통합을 소유한다.
- 구현은 work item의 root agent thread에 맡긴다. 구현을 막는 제품 결정이 있을 때만 root agent의 짧은 선택형 질문 하나를 전달한다.
- root agent의 요약만 받아 메인 context의 중간 로그 오염을 막는다.
- main branch와 Git 이력을 변경하는 유일한 주체다.
- 별도 background manager task나 외부 orchestration Run을 만들지 않는다.

### Work Item Root Agent — Vertical Slice Director

- 하나의 work item에 하나만 존재하는 Lead Game Developer & QA Director다.
- 팀장의 명시적 의도를 구현 입력으로 받아 안전하고 되돌릴 수 있는 기본 후보를 먼저 구현한다.
- Reference 판단, 실행·품질 계약과 task 분해는 내부 context로만 유지하고 팀장 승인 대상으로 만들지 않는다.
- 구현, 평가, 실제 artifact 준비와 최종 handoff를 같은 subagent thread에서 유지한다.
- 팀장 feedback은 메인 coordinator가 같은 agent에 follow-up task로 전달한다.
- 할당 파일을 수정할 수 있지만 branch, worktree, stage, commit, push와 다른 agent의 변경은 건드리지 않는다.
- 하위 agent 결과를 통합한 실제 플레이 artifact를 다시 평가하며 lane별 성공을 parent 품질로 대체하지 않는다.
- 완료 또는 feedback 결과를 보낸 뒤 새 work item을 임의로 시작하지 않는다.

## 구현 우선 원칙

- 팀장이 명시한 의도는 구현 입력이며 재확인 요청이 아니다.
- 기본 흐름은 `구현 → 구체 candidate 검증 → 실제 changed code tree·실행 결과·업무보고 공개 → 결과 기반 feedback`이다.
- 계획, Reference Brief, 실행 계약, 품질 계약, task list와 work-item 문구는 내부 agent context다. 팀장에게 승인·확인을 요청하지 않고 Git에도 필요한 source/result 이외에는 최소화한다.
- 현재 코드·roadmap·Reference에서 추론 가능한 선택과 안전하게 되돌릴 수 있는 선택은 먼저 구현하고 candidate handoff에서 선택과 영향을 밝힌다.
- 구현을 진짜로 막고, 추론할 수도 되돌릴 수도 없는 결정만 한 번에 하나씩 질문한다. 질문은 Yes/No 또는 2~3개의 상호 배타적 선택지와 각 한 줄 영향만 제시하며 긴 문서를 질문으로 보내지 않는다.

### Supporting Agent / Independent Verifier

- `explorer`는 좁은 코드베이스 질문과 Reference 조사를 담당한다.
- supporting worker는 root Director가 고정한 disjoint 경로·산출물만 소유한다.
- verifier는 마지막 writer 변경 뒤 frozen candidate를 읽기 전용으로 검증한다.
- 제품 범위, rubric, feedback와 parent work-item 완료를 소유하지 않는다.

## Canonical 시작과 지속 loop

메인 대화에서 bare `$dev-team-loop`를 호출하면 approved roadmap loop를 시작하거나 복구한다. 이 호출은 work item이 아니다.

```text
$dev-team-loop
→ Git work item·roadmap·agent tree·checkout reconcile
→ 기존 root agent 재사용 또는 다음 미충족 gate 파생
→ root agent 품질 loop
→ feedback 또는 coordinator 검증·통합
→ 다음 gate 재평가
```

- 메인 대화 자체가 coordinator이므로 별도 manager task를 만들지 않는다.
- Bare 호출은 다음 root agent를 시작·재개하고 stop condition까지 감독할 권한을 명시한다.
- feedback 상태는 bare 호출로 해제하지 않는다. 구현된 candidate를 본 팀장의 실제 feedback이 같은 work item을 대상으로 도착해야 기존 root agent를 재개한다.
- 다음 미충족 gate를 소유한 open item이 없으면 coordinator가 roadmap에서 vertical work item 하나를 파생한다.
- 구현된 candidate에 대한 팀장 feedback, 가역 default로 진행할 수 없는 제품 결정, Canonical Conflict, blocker, pause 또는 승인된 다음 milestone 부재에서 멈춘다.

## Work Item 등록

### 한 요청은 한 이력

- 하나의 독립 개발 요청은 기본적으로 work item 하나다.
- 여러 증상이나 세부 기능이 있어도 팀장이 명시적으로 분리하지 않으면 나누지 않는다.
- status, priority, pause·cancel·reopen, merge·push, roadmap continue와 기존 ID 대상 추가 지시는 새 item이 아니다.
- 메인 대화는 등록 전에 요청을 재확인하거나 계획 승인을 받지 않는다.

### Durable 등록

```text
팀장 요청 또는 roadmap gate
→ ID 할당과 최소 queue/status work item 생성
→ 문서 하나짜리 scoped commit
→ origin/main push
→ root agent 시작 또는 queued 유지
```

- 위치: `docs/development/work-items/<id>-<slug>.md`
- 기본 ID: `WI-YYYYMMDD-HHmmss`; Git과 live agent assignment를 확인해 같은 초 충돌에는 `-02`, `-03`을 붙인다.
- 팀장 원문은 그대로 보존한다. Roadmap 파생은 milestone, gate와 현재 evidence를 사실대로 기록한다. 사전 계획·승인 섹션은 만들지 않는다.
- Runtime agent ID와 thread handle은 Git에 기록하지 않는다.

## Git 메시지 언어 기준

- 에이전트가 새로 작성하는 local commit의 subject와 필요한 body는 기본적으로 한국어로 작성한다.
- 에이전트가 merge commit 메시지를 명시적으로 작성하는 경우에도 subject와 필요한 body를 한국어로 작성한다.
- subject는 구현 결과가 바로 드러나도록 간결하게 쓴다. `feat:`, `docs:` 같은 영문 Conventional Commit prefix는 요구하지 않으며, 한국어 범주 표현도 필요할 때만 사용한다.
- 코드 식별자, 경로, 명령, work-item ID, branch 이름, commit hash, 외부 issue·PR 제목과 그 밖의 기술 token은 정확성을 위해 원문을 보존할 수 있다.
- 예시는 `훈련방 전투 입력 판정 정리`, `업무 등록: 장비 선택과 Room Portal`, `WI-... 훈련방 조우 통합`, `Scene·Node·Signal 구조 변경 되돌림`이며 고정 형식은 아니다.
- fast-forward merge에는 새 merge 메시지가 없으므로 이 기준을 맞추기 위해 merge commit을 만들지 않는다.
- 과거 영문 메시지는 이 기준만으로 rewrite하거나 amend하지 않는다. Git 또는 provider가 에이전트 통제 밖에서 생성한 메시지도 공유 이력을 다시 쓰지 않고, 이후 에이전트가 직접 작성하는 메시지부터 이 기준을 적용한다.

## Work Item 상태

```text
queued → implementing → feedback → integrating → done
                  └──────────────→ integrating → done
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

- Git 문서는 등록과 최종 상태의 durable source다.
- 진행 중 live state는 Codex subagent tree와 실제 filesystem/Git 상태가 소유한다.
- `feedback`은 root agent thread와 변경을 보존하며, 팀장 feedback을 같은 agent에 전달해 재개한다.
- Pause는 agent와 변경을 보존하고 새 write를 중단한다.
- 과거 `inbox`·`interviewing`·`ready` item은 실제 agent/filesystem evidence에 따라 `queued` 또는 `implementing`으로 reconcile하고 새 item에는 사용하지 않는다.

## 우선순위와 실행 제한

기본 우선순위는 다음과 같다.

1. 팀장이 명시한 긴급·우선 이력
2. 현재 플레이 수직 단위를 깨뜨리는 버그·회귀
3. 현재 roadmap milestone의 핵심 경로
4. 다른 이력의 선행 dependency
5. 오래 대기한 queued item

- dependency가 끝나지 않은 item은 실행하지 않는다.
- 공유 checkout에서는 write-heavy root item을 한 번에 하나만 실행한다.
- 최대 3개 실제 agent는 현재 root item 안의 read-heavy 조사, frozen verification 또는 증명된 disjoint ownership lane에만 사용한다.
- 여러 agent가 같은 public contract, canonical 문서, central `GameScene` hunk를 동시에 쓰지 않는다.
- 별도 filesystem 격리가 실제로 필요하고 팀장이 별도 Codex task 생성을 명시한 경우에만 Codex-managed worktree task를 사용한다.

## Candidate-First Playable Reference Loop

```text
work item 등록
→ root agent가 요청·roadmap·코드·Reference에서 내부 실행 기준 추론
→ 안전하고 되돌릴 수 있는 기본 candidate 구현
→ 가장 큰 병목 하나 개선
→ 결정적 검사 + 실제 artifact 관찰
→ 같은 rubric 재평가
→ 독립 검증
→ 실제 코드 트리·플레이 경로·검증·업무보고 handoff
→ concrete feedback 또는 자동 통합
→ coordinator commit·push·통합
```

개발과 feedback의 최소 단위는 함수나 내부 시스템이 아니라 처음부터 끝까지 실행 가능한 사용자 시나리오다.

### 내부 Reference 판단

Root Director는 필요한 제품·Engineering Reference, 실제 source/caller/검증 경로와 `직접 재사용`·`수정`·`원칙만 차용`·`비차용` 판단을 agent thread에서 수행한다. 별도 Reference Brief 승인을 요청하지 않으며, 구현에서 확인된 채택 결과만 업무보고에 남긴다. Reference의 캐릭터, 몬스터, 명칭, story, map, item, motion, sprite, sound와 UI를 복제하지 않는다.

### 구현과 평가

- [`quality-loop.md`](./quality-loop.md)의 rubric으로 baseline과 target을 기록한다.
- 한 iteration에서 가장 큰 품질 병목 하나만 개선한다.
- 게임 상태는 fixed-step에서 진행하고 Renderer는 읽기 전용 RenderFrame만 소비한다.
- 수학·frame·판정은 DOM 없는 일회성 진단과 실제 Canvas 경로를 분리해 확인한다.
- 사용자 요청 없는 영구 test·fixture·test script를 추가하지 않는다.
- root Director는 모든 supporting 결과를 통합한 뒤 전체 플레이 경로를 다시 실행·채점한다.
- 마지막 writer 변경 뒤 독립 verifier가 frozen candidate를 확인한다.
- 적용 품질 축에 0 또는 1이 남으면 candidate로 제출하지 않는다.

## Feedback와 통합

### Feedback 필요

다음은 팀장 feedback 전까지 통합하지 않는다.

- 조작감·타격감·Graphics·Effect
- 새 기능과 제품 방향 변경
- `review: team-lead` item

Root Director는 다음 순서로 candidate를 반환한다.

1. 실제 changed code tree
2. 동작·플레이 경로와 팀장이 직접 볼 결과
3. 실행한 검증, 독립 verifier 범위와 남은 위험
4. 업무보고 링크. 별도 보고서가 없는 maintenance item은 work item의 `결과`를 링크한다.
5. rubric과 남은 병목

Coordinator는 이를 메인 대화에 간결히 보고하고 같은 root agent를 유지한다. `확인/승인해 달라`로 끝내지 않으며, 팀장이 concrete feedback을 보내면 `follow-up`으로 같은 agent를 재개한다.

### 자동 통합 가능

- 명확하게 재현된 작은 버그
- 문서 정합
- 외부 동작을 바꾸지 않는 안전한 내부 수정

Coordinator는 마지막 writer 뒤 독립 검증, affected checks, staged diff를 확인하고 scoped commit·push한다. 제품 결과가 달라지면 `review: auto`를 `review: team-lead`로 승격한다.

## 취소와 재개

### 미실행

- `queued`를 `cancelled`로 바꾸고 root agent를 시작하지 않는다. 과거 `inbox` item도 같은 방식으로 처리한다.

### 실행 중

1. 정확한 work item과 root agent ownership을 확인한다.
2. 해당 agent와 item-owned supporting agent를 interrupt한다.
3. 결정, 부분 상태, 취소 이유와 영향을 기록한다.
4. item 단독 소유가 증명된 uncommitted 변경만 targeted patch로 폐기한다.
5. 소유권이 섞였으면 보존하고 `blocked`로 보고한다.
6. 구현 code를 통합하거나 완료 보고서를 만들지 않는다.

이미 main에 통합된 결과는 취소하지 않는다. 영향 분석을 가진 별도 revert work item을 등록한다. Reopen은 새 item과 새 root agent를 만들고 `reopens`로 과거 ID를 연결한다.

## 업무보고

- 위치: `docs/development/reports/WI-YYYYMMDD-HHmmss-<slice-slug>.md`
- 플레이 가능한 수직 단위나 의미 있는 milestone만 별도 보고서를 만든다.
- 작은 bug·문서 정합·maintenance는 work item의 `결과` 절로 충분하다.
- 보고서는 실제 changed code tree, 의도, 플레이 결과, 영향, 검증·feedback과 다음 loop를 기록한다.
- 함수별 diff와 긴 command output은 Git diff에 맡기되, 팀장이 구현 범위를 바로 파악할 수 있는 compact tree는 생략하지 않는다.

## Recovery

Coordinator context가 교체되면 다음을 대조한다.

1. Git-tracked work items와 roadmap
2. Codex subagent tree의 live/idle/done 상태
3. 실제 checkout의 status, diff와 commits
4. reports와 마지막 검증 evidence

Git과 filesystem이 live agent 요약보다 우선한다. 같은 item을 주장하는 agent가 둘이거나 writer ownership이 겹치면 새 agent를 만들지 않고 `agent-conflict`로 멈춘다.

## 메인 lifecycle 알림

메인 대화에는 다음만 남긴다.

- 등록: ID, 제목, priority와 queued/started 상태
- 실행 시작: root agent task name
- feedback 준비: 실제 changed code tree, 플레이 경로, 검증, 업무보고 링크와 남은 병목
- 완료: 실제 changed code tree, 결과 방향, 영향, 검증, 업무보고 링크, quality threshold와 integration commit
- 취소·차단: 이유와 다음 행동

blocking 질문의 판단 근거, 구현 로그와 supporting-agent 원문은 root agent thread에 둔다.
