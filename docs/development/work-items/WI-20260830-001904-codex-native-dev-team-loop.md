---
id: WI-20260830-001904
status: done
priority: high
lane: maintenance
created_at: 2026-08-30T00:19:04+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
---

# dev-team-loop를 Codex 앱 네이티브 흐름으로 전환

## 팀장 원문 또는 파생 근거

> 흠 너무 오르카에 종속된거 같기도하고 저거 스킬먼저 바꿀래

> 코덱스 기반 앱

## 접수 해석

Git work item과 품질 loop는 유지하되, 별도 Orca manager·Run·Task·Dispatch를 필수 기반으로 사용하지 않고 Codex 앱의 메인 대화와 native subagent thread로 roadmap을 운영한다.

## 인터뷰와 결정

- 메인 대화가 팀장 Interface와 roadmap coordinator를 함께 소유한다.
- work item마다 하나의 root subagent thread를 만들고 feedback 시 같은 agent를 재사용한다.
- 공유 checkout에서는 write-heavy root item을 직렬화하고 최대 3개 supporting agent는 read-heavy·disjoint lane에만 사용한다.
- main branch, commit, push와 통합은 메인 coordinator만 수행한다.
- Orca는 명시적으로 필요한 브라우저·에뮬레이터 등 외부 surface에서만 선택적으로 사용한다.

## 실행 계약

- `dev-team-loop`의 모든 mode reference에서 Orca orchestration 필수 계약을 제거한다.
- `AGENTS.md`, process, quality-loop, roadmap과 report ownership을 같은 변경에서 정합한다.
- gameplay runtime과 기존 완료 work item 이력은 변경하지 않는다.
- skill validation, format, link, diff와 현실적인 routing 검증을 통과한다.

## 품질 계약

- 적용 축: 기능 완결성, Reference 정합, 회귀 안전성.
- 목표: 모든 적용 축 2 이상.
- 증거: 공식 OpenAI Codex subagent/worktree 문서, skill validator, 문서 링크 검사와 repository check.
- 정지 조건: Codex-native lifecycle에 중복 root agent나 Git writer ownership 모호성이 남으면 완료하지 않는다.

## 평가 기록

- Baseline: Orca runtime과 update prompt까지 통과해야 manager를 만들 수 있어 roadmap 시작 자체가 외부 앱 상태에 결합됐다.
- Current best: 메인 coordinator와 root/supporting subagent의 native lifecycle로 전환하고 외부 orchestration을 비필수화했다.
- Forward test: bare start, 새 bug 등록, 기존 ID 통합과 cancel routing이 별도 manager·중복 root·worker Git write를 만들지 않음을 확인했다.
- 남은 병목: 없음. 실제 M1 시작은 다음 bare invocation에서 새 계약으로 수행한다.

## 규칙 후보

- 외부 orchestration 제품은 해당 surface가 명시적으로 필요할 때만 project core workflow의 필수 dependency로 승격한다.

## Reference Brief

- 차용: Codex subagent thread의 parent orchestration, UI 가시성, follow-up reuse와 read-heavy parallelism.
- 수정: Codex worktree는 기본 전제가 아니라 명시적 task isolation이 필요한 경우에만 사용한다.
- 비차용: Orca Run·Task·Dispatch singleton과 terminal liveness arbitration.

## 결과

- `dev-team-loop`와 모든 mode reference를 Codex native subagent lifecycle로 전환했다.
- 메인 대화가 roadmap coordinator와 유일한 Git writer를 소유하고, work item마다 root agent 하나를 feedback 시 재사용하도록 고정했다.
- 공유 checkout의 write-heavy item을 직렬화하고 supporting agent는 read-heavy·disjoint lane에만 허용했다.
- AGENTS, process, quality-loop, roadmap과 report ownership을 같은 변경에서 정합했다.
- Skill validator, local link 검사, `npm run check`, `git diff --check`와 독립 forward test를 통과했다.

## 취소 기록

해당 없음.

## 연결

- Bootstrap migration: 새 lifecycle 활성화 전 메인 coordinator가 일회성으로 수행하고 독립 verifier가 검증함
- Final commit: `72c63044b4c6b2390b4bc5614f46b462176b7e9d`
- 업무보고: maintenance item이므로 별도 보고서 없음
