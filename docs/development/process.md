# Polygon RPG Codex-Native Development Process

이 문서는 사용자가 팀장으로 제품 방향과 우선순위를 결정하고, Codex 앱의 메인 대화와 subagent thread가 업무 등록·인터뷰·구현·피드백·통합을 지속하는 프로젝트 운영 계약이다.

Reference-Guided Engineering은 각 loop 안의 Engineering Decision을 담당한다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, 각 work item의 품질 rubric과 개선 loop는 [`quality-loop.md`](./quality-loop.md)가 소유한다.

프로젝트 개발 요청에는 기본적으로 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. 사용자가 `이번 건은 직접 처리`처럼 workflow 우회를 명시한 요청만 일반 작업으로 처리한다.

## 역할과 대화 경계

### 팀장 — 사용자

- 핵심 재미, 제품 방향, 우선순위와 Reference를 결정한다.
- 결과물을 직접 플레이하고 방향 피드백을 제공한다.
- 양립하지 않는 제품 방향의 최종 선택을 소유한다.
- 파일 구조와 class granularity 같은 Engineering Decision을 반복 승인하지 않는다.

### 메인 대화 — 팀장 Interface / Roadmap Coordinator

- 팀장이 생각나는 업무를 연속해서 전달하는 단일 창구다.
- Git work item 등록, queue, roadmap 파생, agent 배치, 검증, commit·push와 통합을 소유한다.
- 제품 인터뷰와 구현은 하지 않고 work item의 root agent thread에 맡긴다.
- root agent의 요약만 받아 메인 context의 중간 로그 오염을 막는다.
- main branch와 Git 이력을 변경하는 유일한 주체다.
- 별도 background manager task나 외부 orchestration Run을 만들지 않는다.

### Work Item Root Agent — Vertical Slice Director

- 하나의 work item에 하나만 존재하는 Lead Game Developer & QA Director다.
- 인터뷰, Reference Brief, 실행·품질 계약, 구현, 평가, feedback 준비와 최종 handoff를 같은 subagent thread에서 유지한다.
- 팀장 feedback은 메인 coordinator가 같은 agent에 follow-up task로 전달한다.
- 할당 파일을 수정할 수 있지만 branch, worktree, stage, commit, push와 다른 agent의 변경은 건드리지 않는다.
- 하위 agent 결과를 통합한 실제 플레이 artifact를 다시 평가하며 lane별 성공을 parent 품질로 대체하지 않는다.
- 완료 또는 feedback 결과를 보낸 뒤 새 work item을 임의로 시작하지 않는다.

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
- feedback 상태는 bare 호출로 해제하지 않는다. 팀장의 실제 feedback이 같은 work item을 대상으로 도착해야 기존 root agent를 재개한다.
- 다음 미충족 gate를 소유한 open item이 없으면 coordinator가 roadmap에서 vertical work item 하나를 파생한다.
- 팀장 feedback, 제품 결정, Canonical Conflict, blocker, pause 또는 승인된 다음 milestone 부재에서 멈춘다.

## Work Item 등록

### 한 요청은 한 이력

- 하나의 독립 개발 요청은 기본적으로 work item 하나다.
- 여러 증상이나 세부 기능이 있어도 팀장이 명시적으로 분리하지 않으면 나누지 않는다.
- status, priority, pause·cancel·reopen, merge·push, roadmap continue와 기존 ID 대상 추가 지시는 새 item이 아니다.
- 메인 대화는 등록 전에 제품 인터뷰를 하지 않는다.

### Durable 등록

```text
팀장 요청 또는 roadmap gate
→ ID 할당과 work item 문서 생성
→ 문서 하나짜리 scoped commit
→ origin/main push
→ root agent 시작 또는 queued 유지
```

- 위치: `docs/development/work-items/<id>-<slug>.md`
- 기본 ID: `WI-YYYYMMDD-HHmmss`; Git과 live agent assignment를 확인해 같은 초 충돌에는 `-02`, `-03`을 붙인다.
- 팀장 원문은 그대로 보존한다. Roadmap 파생은 milestone, gate와 현재 evidence를 사실대로 기록한다.
- Runtime agent ID와 thread handle은 Git에 기록하지 않는다.

## Work Item 상태

```text
inbox → queued → interviewing → ready → implementing
→ feedback → integrating → done
```

예외 상태는 `blocked`, `paused`, `cancelled`, `superseded`다.

- Git 문서는 등록과 최종 상태의 durable source다.
- 진행 중 live state는 Codex subagent tree와 실제 filesystem/Git 상태가 소유한다.
- `feedback`은 root agent thread와 변경을 보존하며, 팀장 feedback을 같은 agent에 전달해 재개한다.
- Pause는 agent와 변경을 보존하고 새 write를 중단한다.

## 우선순위와 실행 제한

기본 우선순위는 다음과 같다.

1. 팀장이 명시한 긴급·우선 이력
2. 현재 플레이 수직 단위를 깨뜨리는 버그·회귀
3. 현재 roadmap milestone의 핵심 경로
4. 다른 이력의 선행 dependency
5. 오래 대기한 ready item

- dependency가 끝나지 않은 item은 실행하지 않는다.
- 공유 checkout에서는 write-heavy root item을 한 번에 하나만 실행한다.
- 최대 3개 실제 agent는 현재 root item 안의 read-heavy 조사, frozen verification 또는 증명된 disjoint ownership lane에만 사용한다.
- 여러 agent가 같은 public contract, canonical 문서, central `GameScene` hunk를 동시에 쓰지 않는다.
- 별도 filesystem 격리가 실제로 필요하고 팀장이 별도 Codex task 생성을 명시한 경우에만 Codex-managed worktree task를 사용한다.

## Playable Reference Loop

```text
work item 등록
→ root agent 인터뷰
→ Reference Brief와 품질 계약
→ baseline 평가
→ 가장 큰 병목 하나 개선
→ 결정적 검사 + 실제 artifact 관찰
→ 같은 rubric 재평가
→ feedback 또는 final handoff
→ 독립 검증
→ coordinator commit·push·통합
```

개발과 feedback의 최소 단위는 함수나 내부 시스템이 아니라 처음부터 끝까지 실행 가능한 사용자 시나리오다.

### Reference Brief

```markdown
## Reference Brief

- 제품 Reference: 차용할 플레이 원칙
- Engineering Reference: 확인한 구현·caller·검증 경로
- 차용: Polygon RPG에 적용할 동작과 이유
- 비차용: 원작 전용 콘텐츠·수치·구조와 제외 이유
- 결과물: 이번 loop의 시작부터 끝까지 플레이 시나리오
```

Reference의 캐릭터, 몬스터, 명칭, story, map, item, motion, sprite, sound와 UI를 복제하지 않는다.

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

Root Director가 로컬/모바일 플레이 경로, 현재 rubric, 남은 병목과 관찰할 지점을 메인 coordinator에 반환한다. Coordinator는 메인 대화에 간결히 보고하고 같은 root agent를 유지한다. 팀장 feedback이 오면 `follow-up`으로 같은 agent를 재개한다.

### 자동 통합 가능

- 명확하게 재현된 작은 버그
- 문서 정합
- 외부 동작을 바꾸지 않는 안전한 내부 수정

Coordinator는 마지막 writer 뒤 독립 검증, affected checks, staged diff를 확인하고 scoped commit·push한다. 제품 결과가 달라지면 `review: auto`를 `review: team-lead`로 승격한다.

## 취소와 재개

### 미실행

- `inbox` 또는 `queued`를 `cancelled`로 바꾸고 root agent를 시작하지 않는다.

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
- 보고서는 의도, 플레이 결과, 영향, 검증·feedback과 다음 loop를 기록한다.
- 파일 목록, 함수별 변경과 긴 command output은 Git diff에 맡긴다.

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
- feedback 준비: 확인할 플레이 결과와 남은 병목
- 완료: 결과 방향, 영향, quality threshold와 integration commit
- 취소·차단: 이유와 다음 행동

세부 인터뷰, 구현 로그와 supporting-agent 원문은 root agent thread에 둔다.
