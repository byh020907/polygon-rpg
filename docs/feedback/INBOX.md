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

- status: verifying
- received_at: 2026-08-31T00:24:26+09:00
- priority: normal
- source: team-lead-main
- title: 유저 피격 effect 접촉 위치 정렬
- supersedes: null
- executor_branch: codex/loop/in-20260831-002426
- registration_base: c5536260668fa23a373a51736301f7596b7d660b
- accepted_at: 2026-08-31T00:31:19+09:00
- checkpoint_commit: d35827623ef8c3b7a60dd7d57a86a3e3d274f6e5
- final_commit: null
- integration: null
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
- 현재 최선: checkpoint `d35827623ef8c3b7a60dd7d57a86a3e3d274f6e5`가 enemy→player `HIT` event만 골라 ring·spark를 immutable `event.position`에 생성한다. Player knockback·render interpolation 뒤에도 접촉점 anchor가 움직이지 않으며 rendering/animation canonical 문서가 같은 계약을 기록한다.
- 다음 병목: fresh verifier가 latest main ancestry와 branch-only owned diff를 확인하고, 훈련장·원정의 실제 피격을 Polygon/Retro·resize에서 독립 재현해 위치·console·guard/evade/적 피격 회귀를 판정한다.
- 검증: `npm run check`, `git diff --check` 통과. 임시 DOM 없는 검증에서 contact `(321.25, 234.75)`와 ring centroid가 일치했고 Player를 `(80, -35)` 이동한 뒤에도 동일했다. checkpoint push 뒤 실제 훈련장 Canvas에서 적 공격으로 HP가 감소하는 순간 effect가 weapon↔Player 접촉점에 표시됐고 console warning/error가 없었다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

Writer checkpoint `d35827623ef8c3b7a60dd7d57a86a3e3d274f6e5` push 완료. fresh 독립 검증 대기.

## IN-20260831-003439

- status: new
- received_at: 2026-08-31T00:34:39+09:00
- priority: normal
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: a2b926581d80f5b9fb1c842785f60a74000584e7
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
인박스 정리도 포함되어있지? 완료후
ㄴㄴ 이런게 워크트리로 반영할 대상이지
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
