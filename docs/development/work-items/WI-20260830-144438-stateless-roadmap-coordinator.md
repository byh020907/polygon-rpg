---
id: WI-20260830-144438
status: done
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

프로세스·repo-local skill·M0 계약을 stateless one-tick 구조로 정합하고, 중첩 writer를 막는 repo-local lease와 standalone project automation을 추가했다. 변경 commit `5d497b2633c689b33956a6f9e5831b8f51b044f0`은 registration base `23c83e565806249ea2bb89353be27728a7276836`의 후손이며, 현재 `main`과 `origin/main`의 `81435dcd692c4131a892dcbeb46c0b2c8b176988`에 이미 포함되어 있어 같은 commit의 idempotent integration 성공으로 처리했다. 실제 diff의 15개 파일은 모두 이 항목의 `owned_paths` 안에 있었다.

Automation `polygon-rpg-roadmap-coordinator`는 `ACTIVE`, `FREQ=MINUTELY;INTERVAL=10`, `kind = "cron"`, `execution_environment = "local"`, saved Git project `polygon-rpg` 대상으로 설정되어 있다. Heartbeat가 아닌 standalone run마다 새 task가 생성되며, 이 검증 중 실제 다음 주기 run도 clean `main == origin/main` `81435dc`를 복구한 뒤 같은 HEAD의 live lease를 발견해 기다림·takeover·repository mutation·task 생성을 하지 않고 종료했다.

Repo-local skill quick validator, 변경 Markdown 14개의 local link 19개, `npm run check`, commit 범위 `git diff --check`가 통과했다. `AGENTS.md`는 UTF-8 기준 32,162 bytes로 32 KiB instruction budget 안이다. Lease forward test는 exact `81435dc` acquire 성공, 같은 HEAD 동시 acquire exit `2`, isolated dirty main exit `3`, expected HEAD drift exit `3`을 확인했다.

Room Portal recovery source `a4bf49b0db74ca3102cbedba50d8ca88956b6b12`는 clean Codex worktree `C:/Users/byh02/.codex/worktrees/546f/polygon-rpg`에 남아 있고 현재 main의 조상이다. `81435dcd692c4131a892dcbeb46c0b2c8b176988`가 M2 done·roadmap 기록을 추가했으며 source/main 사이에 미통합 중복 commit은 없다. Exact title inventory에는 M2 task 하나만 있고 이 전환 항목의 exact-title task는 없었다. 이 항목은 새 계약 도입 자체를 기존 main task에서 수행한 migration source였고 변경 commit이 이미 main에 있으므로 replacement task/worktree를 만들지 않았다. 현재 source task는 이 standalone tick의 delegator이고, coordinator/automation run은 repo-local lease로 직렬화되어 겹치는 writer가 없었다.

## 피드백

해당 없음. 명시된 실행 구조를 그대로 적용한다.

## 취소 기록

해당 없음.

## 연결

- Registration/base: `23c83e565806249ea2bb89353be27728a7276836`
- Room Portal recovery: `WI-20260830-120911`
- Source change commit: `5d497b2633c689b33956a6f9e5831b8f51b044f0`
- Main integration commit: `5d497b2633c689b33956a6f9e5831b8f51b044f0` (already contained; idempotent success)
- M2 recovery source: `a4bf49b0db74ca3102cbedba50d8ca88956b6b12`
- M2 durable result: `81435dcd692c4131a892dcbeb46c0b2c8b176988`
