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

- status: implementing
- received_at: 2026-08-31T00:24:26+09:00
- priority: normal
- source: team-lead-main
- title: 유저 피격 effect 접촉 위치 정렬
- supersedes: null
- executor_branch: codex/loop/in-20260831-002426
- registration_base: c5536260668fa23a373a51736301f7596b7d660b
- accepted_at: 2026-08-31T00:31:19+09:00
- checkpoint_commit: null
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
- 현재 최선: `TrainingEncounterNode`가 enemy weapon과 player hurt polygon의 `visualContact.position`을 HIT event와 `combatContact`에 기록하고, `GameScene`이 동일 fixed-step event를 RenderFrame에 전달하는 기존 접촉 근거가 있다.
- 다음 병목: 실제 Canvas에서 잘못된 위치를 재현하고 HIT event의 world 좌표가 effect item으로 투영되는 경로의 누락 또는 잘못된 anchor를 한 곳으로 좁힌다.
- 검증: main `3dfde29b658d9f891406c5917b9f19b39834889c`에서 관련 source·caller와 rendering/animation canonical 경계를 확인했다. 구현·화면 검증은 다음 fresh writer run이 수행한다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

진행 전
