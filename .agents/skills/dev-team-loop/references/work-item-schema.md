# Work Item Schema

Store work items at `docs/development/work-items/<id>-<slug>.md`. The base ID is `WI-YYYYMMDD-HHmmss`; same-second registrations append `-02`, `-03`, and so on after checking Git and Orca state.

```markdown
---
id: WI-YYYYMMDD-HHmmss
status: queued
priority: normal
lane: dedicated
created_at: YYYY-MM-DDTHH:mm:ss+09:00
depends_on: []
reopens: null
review: team-lead
source: team-lead
source_ref: null
---

# 제목

## 팀장 원문 또는 파생 근거

`source: team-lead`는 최초 요청을 그대로 보존한다. `source: roadmap`은 팀장 발언을 꾸며 쓰지 않고 milestone, 미충족 gate와 현재 evidence를 기록한다.

## 접수 해석

요청 결과와 초기 영향 범위를 짧게 쓴다.

## 인터뷰와 결정

전용 대화의 확정 결정과 대체 이유를 시간순으로 기록한다.

## 실행 계약

플레이 경로, 완료 gate, ownership과 비범위를 기록한다.

## 품질 계약

단일 Vertical Slice Director, 적용 rubric 축, 목표 수준, baseline, 실제 통합 artifact·플레이 증거 경로와 정지 조건을 기록한다. 하위 task가 있으면 고정된 계약, 할당 경로와 반환 산출물을 기록하되 품질 ownership은 나누지 않는다.

## 평가 기록

현재 best 점수, 마지막 iteration의 변화, 좋아지거나 나빠진 근거와 다음 품질 병목을 유지한다.

## 규칙 후보

반복 feedback·결함의 원인, 적용 범위, 오탐 비용과 문서 규칙 또는 자동 검사로 승격할 근거를 기록한다.

## Reference Brief

제품·Engineering Reference의 차용·비차용 판단을 기록한다.

## 결과

완료된 사용자 결과, 영향과 검증 경계를 간결하게 기록한다.

## 취소 기록

취소·대체된 경우 이유, 부분 상태와 영향을 기록한다.

## 연결

worktree/branch, 최종 commit과 업무보고를 기록한다. Runtime ID는 쓰지 않는다.
```

## Allowed Values

- `status`: `inbox`, `queued`, `interviewing`, `ready`, `implementing`, `feedback`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`
- `priority`: `urgent`, `high`, `normal`, `low`
- `lane`: `bugfix`, `maintenance`, `dedicated`
- `review`: `team-lead`, `auto`
- `source`: `team-lead`, `roadmap`, `feedback`, `quality-rule`
- `source_ref`: 팀장 요청이면 `null`, 파생 item이면 milestone·work item·rule ID 등 durable source

## Ownership

- The manager creates the document on main.
- Once dispatched, the worker owns decision/body edits on its branch.
- The manager uses Orca live state rather than concurrently editing the active worker's file.
- Integration brings the final worker version back to main.
- Cancel mode may update main only after the worker is stopped and its partial branch will not be merged.
