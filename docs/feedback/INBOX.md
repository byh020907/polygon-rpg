# Polygon RPG Feedback Inbox

이 파일은 팀장이 메인 대화에서 **등록을 요청한 원문 그대로**를 보존하는 새 개발 업무의 단일 Git queue이자 lifecycle source of truth다.

## Ownership

- Team-lead main은 별도 키워드 없이 받은 일반적인 새 개발 명령 한 건을 `new` entry 하나로 append하고 commit/push한다.
- 질문·상태 조회·기존 entry lifecycle·예시/가정·현재 task 직접 처리 요청은 append하지 않는다.
- `원문`은 공백·표현·언어·오탈자·Markdown을 포함해 바꾸거나 요약하지 않는다.
- Coordinator는 원문 밖의 metadata, 실행 계약, 실행 상태, 결과와 연결만 갱신한다.
- Executor branch는 이 파일과 `docs/STATUS.md`를 수정하지 않는다. Branch commit 뒤 coordinator가 main에서 두 파일을 갱신한다.
- Entry ID와 terminal status가 duplicate consumption을 막는다. 한 entry는 executor branch 하나에서 한 번만 실행한다.

## Entry Contract

- ID: `IN-YYYYMMDD-HHmmss`; 같은 초 충돌은 `-02`, `-03`.
- Status: `new`, `implementing`, `verifying`, `ready-for-integration`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`.
- Priority: `urgent`, `high`, `normal`, `low`.
- 새 entry의 derived title, executor branch, accepted time와 owned paths는 coordinator가 원문 밖에 채운다.
- 원문 정정은 새 entry를 append해 `supersedes`로 연결한다.
- 동일한 `new` 원문은 명시적인 중복 등록 요청이 없으면 다시 append하지 않는다.
- `implementing`부터 `integrating`까지 active entry는 기본적으로 하나다.

## Entry Shape

아래 shape는 계약 설명이며 실제 entry가 아니다.

````markdown
## <IN-ID>

- status: <lifecycle>
- received_at: <ISO-8601 Asia/Seoul>
- priority: <priority>
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: <full-main-before-append>
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
<등록 요청한 메인 대화 원문 그대로>
```

### 실행 계약 — coordinator 소유

- 목표: 미정
- 완료 조건: 미정
- 비범위: 미정
- 적용 품질 축: 미정

### 실행 상태 — coordinator 소유

- 기준선: 미정
- 현재 최선: 미정
- 다음 병목: 미정
- 검증: 미정
- 실제 blocker: 없음

### 결과 — coordinator 소유

진행 전
````

원문에 backtick fence가 있으면 가장 긴 backtick 연속 길이보다 하나 긴 fence를 사용한다. Fence 바깥의 원문 내용은 한 글자도 바꾸지 않는다.

## Entries

<!-- 메인 대화에서 등록을 요청한 새 원문은 이 아래에 append한다. -->

## IN-20260831-002426

- status: done
- received_at: 2026-08-31T00:24:26+09:00
- priority: normal
- source: team-lead-main
- title: 유저 피격 effect 접촉 위치 정렬
- supersedes: null
- executor_branch: codex/loop/in-20260831-002426
- registration_base: c5536260668fa23a373a51736301f7596b7d660b
- accepted_at: 2026-08-31T00:31:19+09:00
- checkpoint_commit: d35827623ef8c3b7a60dd7d57a86a3e3d274f6e5
- final_commit: 70d320127d5d5b48a80bb499fedf55d52829d21a
- integration: the merge commit that marks this entry done
- owned_paths:
  - src/combat/CombatEvent.js
  - src/game/GameScene.js
  - src/game/training/TrainingEncounterNode.js
  - docs/animation-system.md
  - docs/rendering-pipeline.md

### 원문 — 불변

```text
유저 피격시 이팩트가 엉뚱한곳에 나와 수정해  인박스 추가해'
```

### 실행 계약 — coordinator 소유

- 목표: 적 공격에 플레이어가 피격될 때 effect를 실제 weapon↔hurt 접촉의 world 좌표에 고정해 Polygon/Retro 화면에서 타격 지점과 일치시킨다.
- 완료 조건: 훈련장과 원정 전투의 플레이어 피격 경로에서 effect가 실제 접촉 위치에 나타나고, knockback·camera feedback·render interpolation 중에도 캐릭터와 무관한 위치로 이탈하지 않으며, guard·evade·적 피격 표시를 회귀시키지 않는다. `npm run check`, `git diff --check`, 실제 Canvas의 Polygon/Retro·resize·console 검증을 통과한다.
- 비범위: damage·hitstun·공격 frame·collision 판정·전투 balance 변경, 범용 particle system 도입, map·HUD·asset 변경.
- 적용 품질 축: 기능 완결성, 조작 명료성, 타격감·Effect, Graphics·시각 일관성, Reference 정합, 회귀 안전성.

### 실행 상태 — coordinator 소유

- 기준선: 팀장 관찰상 플레이어 피격 effect가 실제 피격 지점과 다른 곳에 나타난다.
- 현재 최선: final `70d320127d5d5b48a80bb499fedf55d52829d21a`의 enemy→player `HIT` ring·spark를 immutable `event.position`에 고정한 결과를 main에 non-rewriting merge했다.
- 다음 병목: 없음. 다음 fresh run은 가장 오래된 `new` entry를 accept/provision한다.
- 검증: `npm run check`, `git diff --check`, clean local/remote branch, latest-main ancestry와 branch-only owned paths 통과. DOM 없는 검증에서 contact `(321.25, 234.75)`와 ring centroid가 Player를 `(80, -35)` 이동한 뒤에도 같았고 player-hit item 7개, guard/enemy-hit event 격리와 evade streak를 확인했다. 실제 훈련장 적 공격에서 HP `43→36`, 유리바람 Field에서 `100→85`가 되는 피격 frame의 weapon↔hurt contact feedback을 확인했고, 원정 적 강공격으로 enemy HP `75→49`가 되어 적 피격 회귀가 없었다. 같은 combat state를 Polygon/Retro render lab에서 비교하고 `900×600` resize 뒤 복원했으며 console warning/error가 없었다. 적용 품질 축은 모두 2 이상이다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

Final `70d320127d5d5b48a80bb499fedf55d52829d21a`을 main에 non-rewriting merge했다. 실제 훈련장·유리바람 Field 피격, Polygon/Retro shared state, resize, console과 회귀 검증 evidence를 보존했다.

## IN-20260831-003439

- status: done
- received_at: 2026-08-31T00:34:39+09:00
- priority: normal
- source: team-lead-main
- title: 완료 entry 자동 정리
- supersedes: null
- executor_branch: codex/loop/in-20260831-003439
- registration_base: a2b926581d80f5b9fb1c842785f60a74000584e7
- accepted_at: 2026-08-31T01:30:57+09:00
- checkpoint_commit: 83bd913672a4b7efe2a78cd9456d7bcd57212869
- final_commit: c5daca93afba8b1efd9d7c6385da0b1a4c690486
- integration: the merge commit that marks this entry done
- owned_paths:
  - AGENTS.md
  - loop/PROMPT.md
  - loop/inbox.mjs
  - .agents/skills/dev-team-loop/SKILL.md
  - .agents/skills/dev-team-loop/references/manage.md
  - .agents/skills/dev-team-loop/references/inbox-schema.md
  - docs/development/process.md
  - docs/development/quality-loop.md
  - docs/development/loop-engineering-references.md

### 원문 — 불변

```text
인박스 정리도 포함되어있지? 완료후
ㄴㄴ 이런게 워크트리로 반영할 대상이지
```

### 실행 계약 — coordinator 소유

- 목표: 성공적으로 통합을 마친 `done` entry를 live INBOX에서 자동 정리해, 현재 실행할 항목만 빠르게 읽히게 하면서 원문·결과·통합 근거는 Git history와 STATUS에서 복구 가능하게 보존한다. 이 process 변경 자체는 전용 executor worktree의 checkpoint와 fresh verification을 거쳐 통합한다.
- 완료 조건: main-owned integration이 완료된 entry의 정확한 Markdown block만 결정적으로 제거하고 다른 `new`·nonterminal entry와 각 `원문 — 불변` byte를 바꾸지 않는다. 임의 삭제나 별도 queue 문서를 만들지 않으며, interruption 뒤 commit graph에서 entry 결과와 integration을 재구성할 수 있다. 실제 current INBOX를 직접 훼손하지 않는 fixture/copy 검증, `npm run check`, `git diff --check`, branch/worktree ownership·recovery 규칙 정합을 통과한다.
- 비범위: nonterminal·paused·blocked·cancelled·superseded entry 정리, executor branch/worktree 자동 삭제, Git history rewrite, 별도 archive/queue/service 도입, gameplay·rendering 변경.
- 적용 품질 축: 기능 완결성, Reference 정합, 회귀 안전성.

### 실행 상태 — coordinator 소유

- 기준선: 현재 live INBOX는 integration이 끝난 `done` entry도 계속 보존해 새 entry와 함께 누적한다.
- 현재 최선: final `c5daca93afba8b1efd9d7c6385da0b1a4c690486`을 main에 non-rewriting merge해 terminal 원문·결과를 merge commit에 보존했다.
- 다음 병목: 없음. 같은 integration transition에서 이 exact `done` block을 정리하고 STATUS에 실제 merge hash를 기록한다.
- 검증: clean local/remote executor branch와 latest-main ancestry, branch-only owned paths를 확인했다. `npm run check`, branch/worktree `git diff --check`가 통과했다. 실제 current INBOX byte stream과 file copy에서 기존 `done` block만 제거되고 두 nonterminal 원문 byte가 그대로 유지됐다. 4-backtick 안의 3-backtick·가짜 `## IN-*`와 tilde fence는 entry 경계로 오인하지 않았고, 중복 entry와 `implementing` entry 삭제를 거부했다. CLI atomic replacement 뒤 임시 파일이 남지 않았으며 잘못된 live main expected HEAD에서는 exit 3으로 쓰기를 거부하고 INBOX hash를 보존했다. 기능 완결성·Reference 정합·회귀 안전성은 모두 2 이상이다. Baeseongjin의 worktree ownership은 원칙만 차용하고 branch 삭제 절차는 적용하지 않았다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

Final `c5daca93afba8b1efd9d7c6385da0b1a4c690486`을 main에 non-rewriting merge했다. 실제 INBOX copy, arbitrary fence, duplicate/non-done 거부, live main guard와 atomic cleanup 검증 evidence를 terminal 원문·결과와 함께 보존했다.

## IN-20260831-005246

- status: new
- received_at: 2026-08-31T00:52:46+09:00
- priority: normal
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: 8711bfb8ed2821de19370b4951b4e979e3e5c527
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
현재 reference 관련 규칙을 초기구성 어느정도 완료되었으니까 빼고 대신 같은 레포의 principle 메서드규칙을 추가해줘
```

### 실행 계약 — coordinator 소유

- 목표: 미정
- 완료 조건: 미정
- 비범위: 미정
- 적용 품질 축: 미정

### 실행 상태 — coordinator 소유

- 기준선: 미정
- 현재 최선: 미정
- 다음 병목: 미정
- 검증: 미정
- 실제 blocker: 없음

### 결과 — coordinator 소유

진행 전
