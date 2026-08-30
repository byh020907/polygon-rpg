---
id: WI-20260830-144438
status: ready-for-integration
priority: urgent
lane: maintenance
created_at: 2026-08-30T14:44:38+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
task_title: WI-20260830-144438 — Git 기반 무상태 roadmap coordinator 전환
registration_base: 23c83e565806249ea2bb89353be27728a7276836
owned_paths:
  - AGENTS.md
  - .agents/skills/dev-team-loop/
  - docs/development/process.md
  - docs/development/quality-loop.md
  - docs/development/roadmap.md
  - docs/development/reports/README.md
  - docs/development/work-items/WI-20260830-120911-academy-training-room-portal.md
  - docs/development/work-items/WI-20260830-144438-stateless-roadmap-coordinator.md
  - scripts/roadmap-coordinator-lock.mjs
---

# Git 기반 무상태 roadmap coordinator 전환

## 팀장 원문 또는 파생 근거

지속되는 메인 대화가 감독·대기하는 구조를 폐기한다. 팀장 메인은 요청과 lifecycle 명령을 Git queue에 기록하고 즉시 종료하며, 프로젝트 대상 standalone recurring automation이 매번 새 context에서 Git work item·roadmap·exact Codex task title·managed worktree·commit graph를 복구한다. 각 tick은 ready item 하나의 통합 또는 다음 gate 하나의 새 사용자 소유 worktree task 생성만 수행하고 종료해야 한다.

기존 제품 비전, Lead Game Developer & QA Director, 업무별 독립 대화, candidate-first 품질 loop, M1~M5 제품 roadmap, 한국어 Git 메시지, 사용자 요청 없는 영구 test 금지는 보존한다. Room Portal drift를 첫 recovery/forward scenario로 실제 검증한다.

## 결과

프로세스·repo-local skill·M0 계약을 stateless one-tick 구조로 정합하고, 중첩 writer를 막는 repo-local lease와 standalone project automation을 추가한다. 실제 automation과 Room Portal recovery 결과는 main 통합 뒤 이 항목에 기록한다.

## 피드백

해당 없음. 명시된 실행 구조를 그대로 적용한다.

## 취소 기록

해당 없음.

## 연결

- Registration/base: `23c83e565806249ea2bb89353be27728a7276836`
- Room Portal recovery: `WI-20260830-120911`
