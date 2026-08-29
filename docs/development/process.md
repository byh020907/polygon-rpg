# Polygon RPG AI Development Process

이 문서는 사용자가 팀장으로 제품 방향과 우선순위를 결정하고, AI 개발 팀이 업무 이력의 등록·인터뷰·구현·피드백·통합과 다음 loop를 주도하는 프로젝트 운영 계약이다.

팀장·manager·worker 역할은 다음 개발 목표를 고르는 source가 아니라 Git·대화·병렬 실행의 ownership topology다. 기본 목표 선택은 승인된 roadmap과 통합 artifact의 품질 evidence가 담당한다.

Reference-Guided Engineering은 각 loop 안의 Engineering Decision을 담당한다. 이 문서는 그 Method의 비범위인 제품 인터뷰, 플레이 가능한 개발 단위, 피드백, 병렬 worktree와 autonomous improvement lifecycle을 프로젝트 요구사항으로 정의한다. 각 work item 내부의 개발 페르소나, 품질 rubric, 평가 기반 개선과 규칙 승격은 [`quality-loop.md`](./quality-loop.md)가 소유한다. 아직 다른 프로젝트에서 재사용할 독립 Method로 승격하지 않는다.

프로젝트 개발 요청에는 기본적으로 [`.agents/skills/dev-team-loop/SKILL.md`](../../.agents/skills/dev-team-loop/SKILL.md)를 사용한다. 사용자가 `이번 건은 직접 처리`처럼 workflow 우회를 명시한 요청만 일반 작업으로 처리한다.

## 역할과 대화 경계

### 팀장 — 사용자

- 핵심 재미, 제품 방향, 우선순위와 Reference를 결정한다.
- 결과물을 직접 플레이하고 방향 피드백을 제공한다.
- 여러 구현 결과가 제품적으로 양립하지 않을 때 최종 방향을 정한다.
- 파일 구조, class granularity와 같은 Engineering Decision을 반복 승인하지 않는다.

### 메인 대화 — 팀장 Interface

- 팀장이 생각나는 업무를 연속해서 전달하는 단일 창구다.
- 새 요청을 background manager에 전달하고 등록 결과와 lifecycle 요약만 보여 준다.
- 제품 인터뷰, 구현, Git write와 worker 세부 진행을 직접 수행하지 않는다.
- 전체 상태 조회, 우선순위 변경, pause·cancel·reopen, 병합·push 지시와 특정 이력 추가 지시를 manager에 전달한다.

### Background Manager — Main Integration Owner

- 메인 worktree의 별도 장기 대화로 유지한다.
- `main`, work item 등록 commit, queue, roadmap, 공용 계약, 병합 순서와 최종 push를 단일 소유한다.
- Git의 work item 이력을 durable source로, Orca Run·Task·Dispatch·worktree 상태를 live source로 사용한다.
- 실제 개발 worker 최대 3개를 감독하며 manager 자신은 이 제한에 포함하지 않는다.
- `feedback`에서 idle인 worker 대화도 실행 제한에 포함하지 않는다.
- worker 완료·취소·실패 뒤 lane을 최신 `main`으로 정렬하고 다음 ready 이력을 자동 소비한다.
- 방향이 정해진 뒤에는 “진행할까요?”라고 다시 묻지 않고 실행 결과와 다음 행동을 보고한다.
- 대화 기억을 source of truth로 사용하지 않는다. Context가 커지면 stable point에서 manager 대화를 교체하고 Git·Orca 상태로 복구한다.

### Work Item 대화 — Vertical Slice Director / Developer

- 하나의 work item에 유일한 Vertical Slice Director이자 Lead Game Developer & QA Director로서 팀장이 정한 제품 방향 안에서 통합된 플레이 artifact의 품질을 소유한다.
- 하나의 업무 이력, 하나의 대화 context와 하나의 실행 attempt를 소유한다.
- 인터뷰, Reference Brief, 실행·품질 계약, 평가 기록, 구현, 검증, 팀장 피드백과 업무보고를 같은 대화에서 유지한다.
- 자기 worktree, branch, 할당 경로와 고유 work item·업무보고만 수정한다.
- 하위 worker 결과를 통합한 뒤 전체 플레이 경로를 다시 평가하며 lane별 성공을 수직 단위의 품질로 대체하지 않는다.
- `worker_done` 뒤 새 업무를 임의로 시작하지 않는다.

### 조사·검증 Worker

- Reference 조사와 frozen candidate의 읽기 전용 검증처럼 writer와 충돌하지 않는 lane을 담당한다.
- 같은 worktree에서 writer가 수정 중인 diff를 완료 근거로 평가하지 않는다.
- parent work item의 제품 범위, rubric, 팀장 feedback과 최종 완료 상태를 소유하지 않는다.
- 검증 결과를 제품 방향으로 독자 승격하지 않는다.

## Outer Loop 입력과 업무 생성

기본 개발 동력은 팀장 메시지가 아니라 승인된 roadmap이다. 팀장 메시지는 새 제품 방향, 우선순위·상태 조작, 현재 candidate feedback 또는 roadmap 밖의 새 요청을 주입한다.

### Canonical 시작 명령

메인 대화에서 bare `$dev-team-loop`를 한 번 호출하면 approved roadmap loop를 시작하거나 복구한다. 이 호출은 work item이 아니다.

```text
$dev-team-loop
→ 기존 manager·work item·Orca 상태 reconcile
→ manager가 없으면 정확히 하나 시작
→ continue_roadmap operation
→ 기존 item 재개 또는 현재 milestone의 다음 gate 파생
→ feedback·blocker·pause까지 지속 소비
```

각 work item마다 스킬을 다시 호출하지 않는다. 명시적 pause·stop 또는 manager 유실 뒤에만 같은 호출로 복구·재개한다. Feedback·제품 결정 stop은 bare 호출이 아니라 해당 work-item 대화의 실제 답으로 해제한다.

Bare 호출은 feedback 내용이 아니다. Candidate가 `feedback`에서 기다리면 상태만 보고하고, 해당 work-item 대화에 실제 팀장 feedback이 도착할 때만 Director를 재개한다. Start operation은 상관 ID가 있는 receipt로 exactly-once 처리하며 manager는 repo-local singleton key와 Orca Run objective로 식별한다.

### Roadmap 자동 파생

현재 milestone의 다음 미충족 gate를 소유한 open work item이 없으면 background manager가 다음 vertical result 하나를 work item으로 파생한다.

1. roadmap의 현재 milestone, 실제 통합 artifact, 완료 이력과 열린 work item을 대조한다.
2. 아직 다른 item이 소유하지 않은 가장 큰 플레이·품질 gate를 선택한다.
3. `source: roadmap`과 정확한 milestone/gate를 기록하고 work item 하나를 생성·commit·push한다.
4. dependency와 worker capacity가 허용되면 Vertical Slice Director를 즉시 시작한다.
5. feedback·통합 뒤 같은 절차로 다음 gate를 다시 평가한다.

Manager는 roadmap에 없는 새 Product Requirement를 만들거나, 이미 열린 item과 중복되는 이력을 생성하거나, 한 milestone의 내부 lane을 peer root work item으로 임의 분할하지 않는다. 팀장 feedback, 남은 제품 인터뷰, Canonical Conflict, blocker, pause 또는 승인된 다음 milestone 부재에서는 파생을 멈추고 필요한 lifecycle만 보고한다.

### 한 요청은 한 이력

- 팀장이 한 번에 보낸 하나의 요청은 기본적으로 work item 하나로 등록한다.
- 요청 안에 여러 증상·세부 기능이 있어도 manager가 임의로 분리하지 않는다.
- 팀장이 `별도 이력으로 나눠`처럼 명시했을 때만 여러 work item으로 나눈다.
- 메인 대화에서는 등록 전에 인터뷰하지 않는다. 인터뷰가 메인 context와 queue 접수를 막지 않게 하기 위함이다.

### 메인에서 바로 처리하는 운영 요청

다음은 새 work item으로 만들지 않는다.

- 전체 진행 상태 조회
- work item 우선순위 변경
- pause·cancel·reopen
- 완료 candidate의 병합·push 지시
- roadmap 재정렬
- ID가 명시된 기존 work item 대화로 추가 지시 전달

`로드맵 계속 진행`, `다음 loop 실행`처럼 승인된 roadmap 소비를 재개하는 요청은 새 work item이 아니라 manager operation이다. 그 밖의 버그·기능·조사·개선 요청은 work item 하나로 등록한다.

### Durable 등록

```text
팀장 요청 또는 roadmap 미충족 gate
→ 메인 Interface 원문 전달 또는 manager 파생 근거 확정
→ manager가 고유 work item 문서 생성
→ 문서 하나짜리 접수 commit
→ origin/main에 즉시 push
→ queue 등록과 실행 가능 여부 판단
```

- 위치: `docs/development/work-items/<id>-<slug>.md`
- 기본 ID는 `WI-YYYYMMDD-HHmmss`이며 같은 초에 등록되면 Git·Orca 충돌 검사 뒤 `-02`, `-03` suffix를 붙인다.
- 접수 commit은 사용자 추가 승인 없이 main에 push한다.
- manager만 ID를 발급하고 work item 파일을 처음 생성한다.
- 팀장 요청은 원문을 그대로 보존한다. Roadmap 파생은 원문을 꾸미지 않고 milestone, gate와 현재 evidence를 정확히 기록한다.
- Runtime Run ID, Dispatch ID와 terminal handle은 Git에 기록하지 않는다.

## Work Item 상태

```text
inbox
→ queued
→ interviewing
→ ready
→ implementing
→ feedback
→ integrating
→ done
```

예외 상태:

- `blocked`: 외부 상태 또는 ownership 때문에 진행 불가
- `paused`: 현재 diff와 대화를 보존하고 실행 중단
- `cancelled`: 미병합 결과 폐기 후 종료
- `superseded`: 다른 work item이 목표를 대체

`interviewing`과 `implementing`인 실제 worker만 기본 동시 실행 3개에 포함한다. 팀장 피드백 뒤 재개된 worker도 다시 포함한다. Background manager가 소유하는 `integrating`과 idle `feedback`은 포함하지 않는다. `feedback`은 대화·worktree·미병합 결과를 유지한 채 slot을 반환하며, 팀장이 그 대화에 답하면 capacity가 있을 때 같은 context로 재개한다.

Git work item은 최초 접수와 최종 통합·취소 상태를 durable하게 보존한다. 세부 live 상태는 worker branch, Orca Task·Dispatch와 worktree comment가 소유해 main 파일과 worker 파일을 동시에 수정하지 않는다.

Pause는 대화·worktree·미병합 diff를 보존하고 실행 slot만 반환한다. Paused item은 해당 worktree를 계속 점유하므로 같은 permanent lane이 다른 item을 소비하지 않는다. Resume는 같은 item·branch·대화에서 현재 main과 dependency를 다시 확인한 뒤 이어간다.

## 우선순위와 지속 소비

팀장이 별도 순서를 지정하지 않으면 manager가 다음 순서로 ready queue를 소비한다.

1. 팀장이 명시한 긴급·우선 이력
2. 현재 플레이 가능한 수직 단위를 깨뜨리는 버그·회귀
3. 현재 roadmap milestone의 핵심 경로
4. 다른 이력의 진행을 막는 선행 계약·기반
5. 오래 대기한 이력

- dependency가 끝나지 않은 이력은 priority가 높아도 실행하지 않는다.
- 기본 worker 상한은 3개이며 팀장이 특정 이력의 추가 실행을 명시하면 초과할 수 있다.
- manager는 선택한 이유, lane과 대기 중인 blocker를 lifecycle 요약에 남긴다.
- 현재 roadmap의 다음 미충족 gate를 소유한 open item이 없으면 item 하나를 파생하고, stop condition이 없는 동안 `파생 → 실행 → feedback·통합 → 재평가`를 계속한다.

## Worktree Routing

### 장기 lane

- `bugfix`: 작은 버그·회귀 work item을 한 번에 하나씩 순차 소비한다.
- `maintenance`: 문서 정합, 개발 환경, 내부 정리와 짧은 조사 work item을 순차 소비한다.

두 lane은 Orca permanent worktree로 유지한다. 각 work item은 같은 lane worktree를 재사용해도 새 agent 대화/session에서 시작한다. 이전 work item이 완료·통합되고 lane이 최신 `main`으로 정렬되기 전에는 다음 work item을 받지 않는다.

### 전용 worktree

- 큰 기능과 플레이 가능한 수직 단위는 work item 전용 managed worktree를 만든다.
- 인터뷰부터 구현·피드백까지 같은 worktree와 대화에서 유지한다.
- 범위가 불명확한 요청도 context 보존을 위해 전용 worktree로 시작한다.
- 통합 완료 뒤 전용 worktree를 종료한다. 대화와 업무보고는 이력으로 유지한다.

Manager는 팀장에게 worktree 종류를 묻지 않고 원 요청의 예상 수명과 실제 dependency로 routing한다. 같은 Git branch를 둘 이상의 worktree에서 사용하지 않는다.

## Playable Reference Loop

```text
work item 등록
→ 전용 대화 인터뷰
→ Reference Brief
→ 수직 단위·품질 계약과 ownership 고정
→ baseline 평가
→ 가장 큰 품질 병목 하나 구현·개선
→ 결정적 검증 + 실제 artifact/Canvas 평가
→ 점수·현재 best·다음 병목 기록과 반복
→ Orca 로컬/모바일 플레이 피드백
→ Reference 비교 평가
→ 업무보고와 final commit
→ manager 통합
→ 같은 단위 재개선 또는 다음 queue 소비
```

### 개발 단위

개발과 팀장 피드백의 최소 단위는 개별 함수나 시스템이 아니라 처음부터 끝까지 실행 가능한 사용자 시나리오다.

좋은 수직 단위 예:

> 훈련 몬스터의 기본 공격을 가드하고, 강공격을 구르기로 통과해 배후를 잡은 뒤 띄우기와 공중 combo로 반격하고 착지한다.

Guard class, Roll state, Hitstop 함수와 Particle preset은 내부 구현 lane일 뿐 별도 팀장 피드백 단위가 아니다.

### 전용 대화 인터뷰

- 제품 결과가 둘 이상으로 갈릴 때 구현 전에 구체적으로 질문한다.
- 추상적인 “어떻게 할까요?”보다 각 선택의 결과 방향과 영향 범위를 제시한다.
- 같은 목표를 구체화하거나 방향을 바꾸는 답은 기존 work item과 대화에 누적한다.
- 완전히 독립된 목표 또는 팀장이 명시한 경우에만 새 work item을 만든다.
- 방향이 정해진 뒤 같은 선택을 허가 질문으로 반복하지 않는다.

### Reference Brief

```markdown
## Reference Brief

- 제품 Reference: 이번 플레이 경험에서 차용할 원칙
- Engineering Reference: 확인할 구현·caller·검증 경로
- 차용: Polygon RPG에 적용할 동작과 이유
- 비차용: 원작 전용 콘텐츠·수치·구조와 제외 이유
- 결과물: 이번 loop에서 플레이어가 경험할 시나리오
```

Reference의 캐릭터, 몬스터, 명칭, story, map, item, motion, sprite, sound와 UI를 복제하지 않는다.

### 구현과 검증

- [`quality-loop.md`](./quality-loop.md)의 공통 rubric으로 baseline과 target을 기록하고 한 iteration에 가장 큰 병목 하나만 개선한다.
- 게임 상태는 fixed-step에서 진행하고 Renderer는 읽기 전용 RenderFrame만 소비한다.
- 시간·frame·판정은 DOM 없는 일회성 진단으로 먼저 확인하고 임시 검증 코드는 완료 전에 제거한다.
- 사용자가 명시하지 않은 영구 test·fixture·test script는 추가하지 않는다.
- 화면과 조작은 실제 Canvas에서 확인하고 로컬 서버·검증 tab은 증거 확보 후 종료한다.
- core feel loop는 입력부터 hit reaction·effect·최종 Retro 출력까지 한 경로로 확인한다.
- 기능·결정적 검사가 먼저 통과한 장기 또는 위험한 tuning은 worker branch checkpoint로 보존할 수 있지만, final candidate는 rubric threshold와 실제 artifact 증거가 확보된 뒤에만 만든다.

### 재개선과 정지 조건

적용 품질 축에 0 또는 1이 남아 있으면 다음 기능으로 넘어가지 않고 같은 work item에서 가장 큰 병목을 반복 개선한다. 다음은 현재 roadmap의 핵심 실패 예다.

- 입력 의도와 화면 반응의 관계가 불명확하다.
- 공격 적중, guard, 회피와 punish 성공을 즉시 인지하기 어렵다.
- Reference에서 차용하기로 한 조작 문법이나 피드백 원칙이 실제 플레이에 드러나지 않는다.
- Polygon과 Retro 출력이 같은 판정·animation 결과를 전달하지 않는다.
- 플레이 경로가 중간 debug 조작이나 설명에 의존한다.

같은 acceptance gate가 두 번 연속 실패하고 새 환경 증거·팀장 피드백·설계 변화가 없으면 자율 tuning을 중단하고 `feedback`으로 전환한다. 같은 blocker가 반복되거나 ownership이 불명확하면 `blocked`로 전환한다. 반복 지적은 [`quality-loop.md`](./quality-loop.md)의 규칙 승격 절차로 자산화한다. 적용 rubric이 threshold를 통과하면 3점 polish가 남아 있어도 위험과 다음 병목을 기록하고 feedback 또는 다음 loop로 이동할 수 있다.

## Feedback와 통합

### Feedback 필요

다음 변경은 `feedback` 상태에서 팀장이 같은 worker 대화에 직접 개입한다.

- 조작감·타격감·그래픽과 effect
- 새 기능과 제품 방향 변경
- `review: team-lead`로 지정된 work item

### 자동 통합 가능

다음은 검증·업무보고 뒤 manager가 자동 통합할 수 있다.

- 명확하게 재현된 작은 버그
- 문서 정합
- 외부 동작을 바꾸지 않는 안전한 내부 수정

제품 결과가 달라지거나 판단이 갈리면 runner가 `review: auto`를 `review: team-lead`로 승격한다.

### 피드백 경로

1. 구현 worktree에서 정적·결정적 검증을 완료한다.
2. 적용 rubric을 재평가하고 현재 best, 남은 병목과 실제 증거 경로를 기록한다.
3. Orca 로컬 서버 또는 모바일 tunnel에서 통합된 플레이 경로를 연다.
4. 팀장이 worker 대화에서 직접 피드백한다.
5. 방향이 맞는 candidate만 final commit과 업무보고를 만든다.
6. Manager가 최신 `main`과 통합·재검증·push한다.
7. GitHub Pages는 안정화된 `main`의 공개 결과이며 개발 중 피드백 환경으로 사용하지 않는다.

## 병렬 ownership

- Background manager만 main Git write, roadmap, 공용 인덱스와 병합 순서를 소유한다.
- 하나의 work item에는 하나의 authoritative 대화·root Dispatch·Vertical Slice Director만 둔다. Manager는 같은 work item을 여러 peer worker에게 공동 할당하지 않는다.
- Vertical Slice Director만 해당 work item·업무보고·통합 artifact·품질 점수와 팀장 feedback을 소유한다.
- 하위 worker는 Director가 고정한 계약 안에서 자기 branch와 할당 경로만 수정하며 parent work item의 완료나 feedback을 직접 보고하지 않는다.
- 같은 hunk, public API, schema, 공용 index와 canonical 문서는 한 시점에 한 writer만 소유한다.
- 같은 저장소라는 이유만으로 직렬화하지 않고 실제 diff·공개 계약이 겹칠 때만 선행 병합 순서를 둔다.
- Director가 모든 lane을 통합하고 candidate fingerprint를 고정한 뒤 독립 verifier가 확인한다. 실패하면 같은 Director가 품질 loop로 돌아간다.
- 완료된 worker 대화는 commit·업무보고·검증 결과로 인계하고 다시 구현 task를 주입하지 않는다.

Vertical Slice Director는 다음 lane을 dependency 순서에 맞게 하위 task로 병렬화할 수 있다. 모든 실행 중 하위 worker는 프로젝트의 worker 상한에 포함한다.

- Gameplay: simulation state, 판정과 event DTO
- Presentation: 확정 event DTO를 소비하는 animation·VFX·camera
- Content: 확정 schema를 사용하는 Room·적·장비 definition
- Verification: frozen candidate의 수치·브라우저 경로

공개 DTO가 고정되기 전에 여러 worker가 중앙 `GameScene`이나 같은 canonical 문서를 동시에 수정하지 않는다. Read-heavy 조사·검증은 적극 병렬화하고 write-heavy 병렬화는 disjoint ownership이 증명될 때만 사용한다. 하위 lane이 끝나도 Director의 end-to-end 재실행·재채점 전에는 feedback candidate가 아니다.

## 취소와 재개

### 미실행 이력 취소

- `inbox` 또는 `queued`를 `cancelled`로 바꾸고 실행하지 않는다.

### 실행 중 취소

1. 정확한 work item ID와 worker ownership을 확인한다.
2. Agent turn을 중단한다.
3. 확정 결정, 현재 상태, 취소 이유와 영향을 work item에 기록한다.
4. 해당 이력이 단독 소유한 미병합 변경만 폐기한다.
5. 다른 변경과 섞였으면 자동 폐기하지 않고 `blocked`로 보고한다.
6. 결과를 main에 병합하지 않고 lane을 최신 `main`으로 정렬한다.
7. 완료 업무보고는 만들지 않는다.

이미 main에 병합된 이력은 취소하지 않는다. 영향 분석을 가진 별도 revert work item을 등록한다.

취소한 목표를 다시 요청하면 새 work item과 새 대화를 만들고 `reopens`로 과거 ID를 연결한다. 기존 cancelled 이력은 되살리지 않는다.

## 업무보고

업무보고는 source diff의 설명서가 아니라 팀장이 나중에 개발 의도와 흐름을 복원하는 기록이다.

- 위치: `docs/development/reports/WI-YYYYMMDD-HHmmss-<slice-slug>.md`
- 한 수직 단위·한 대화·한 보고서 파일을 사용한다.
- worker는 다른 보고서나 roadmap을 수정하지 않는다.
- 통합 뒤 보고서는 사실 오류 수정 외에는 다시 편집하지 않는다.
- 진행 중 상태는 Git 문서에 반복 기록하지 않고 Orca worktree comment/status를 사용한다.
- 작은 bug·문서 정합·maintenance는 work item의 **결과** 절로 충분하며 별도 보고서를 만들지 않는다.

```markdown
# 수직 단위 이름

## 의도

왜 이 플레이 경험을 만들었는가

## 결과

플레이어가 실제로 무엇을 할 수 있게 되었는가

## 영향

후속 시스템과 제품 방향에 미치는 영향

## 검증과 피드백

확인한 실행 경로, 적용 rubric의 최종 수준, 결과와 팀장 피드백

## 다음 loop

다음 결과물, 예상 영향과 남은 결정
```

파일 목록, 함수별 변경, 전체 diff 요약과 긴 command 출력은 기록하지 않는다. 필요한 구현 상세는 Git diff와 commit을 사용한다.

## 메인 lifecycle 알림

메인 대화에는 다음 요약만 남긴다.

- 등록: ID, 제목, 우선순위와 대기/실행 상태
- roadmap 파생: ID, milestone, 선택한 미충족 gate와 실행 상태
- 실행 시작: worker 대화와 worktree
- 피드백 준비: 확인할 플레이 결과
- 완료: 결과 방향, 영향과 통합 commit
- 취소·차단: 이유와 다음 행동

구현 중간 과정과 세부 인터뷰는 worker 대화에만 남긴다.

## Recovery

Background manager가 재시작되면 다음을 대조해 loop를 복구한다.

1. Git에 추적된 `work-items/`와 현재 roadmap
2. Orca Run·Task·Dispatch inbox
3. Worktree branch, status와 comment
4. 실행 중 terminal과 agent 상태

Git work item은 durable 이력이고 Orca orchestration은 live 실행 상태다. 둘이 다르면 실제 branch·filesystem·terminal 증거를 확인하고 추측으로 중복 dispatch하지 않는다. Manager와 메인 대화는 교체 가능하며 raw worker log를 장기 context로 유지하지 않는다.

## Roadmap 운영

- roadmap은 날짜 약속이나 기능 수가 아니라 플레이 가능한 milestone 순서와 품질 gate를 소유한다.
- Background manager만 수직 단위의 `대기 → 진행 → 피드백 → 완료` 상태를 바꾼다.
- 핵심 조작감·타격감·effect·graphics가 gate를 통과하지 못하면 콘텐츠 확장을 미루고 같은 수직 단위를 다시 연다.
- 새 제품 결정이 필요하지 않으면 manager가 현재 milestone의 다음 미충족 gate를 work item으로 파생하고 자율 진행한다. 팀장은 매 loop마다 새 지시를 보내지 않는다.
- 통합된 `규칙 후보`는 다음 item의 품질 계약에 반영해 loop 자체의 판단과 검증 능력도 누적 개선한다.
- 이 프로세스를 다른 프로젝트의 Method로 승격하는 결정은 충분한 반복 검증 뒤 사용자만 내린다.
