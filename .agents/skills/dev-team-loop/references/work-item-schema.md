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
---

# 제목

## 팀장 원문

최초 요청을 그대로 보존한다.

## 접수 해석

요청 결과와 초기 영향 범위를 짧게 쓴다.

## 인터뷰와 결정

전용 대화의 확정 결정과 대체 이유를 시간순으로 기록한다.

## 실행 계약

플레이 경로, 완료 gate, ownership과 비범위를 기록한다.

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

## Ownership

- The manager creates the document on main.
- Once dispatched, the worker owns decision/body edits on its branch.
- The manager uses Orca live state rather than concurrently editing the active worker's file.
- Integration brings the final worker version back to main.
- Cancel mode may update main only after the worker is stopped and its partial branch will not be merged.
