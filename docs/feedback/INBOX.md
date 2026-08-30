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

## IN-20260831-005246

- status: implementing
- received_at: 2026-08-31T00:52:46+09:00
- priority: normal
- source: team-lead-main
- title: Core Engineering Principles 전환
- supersedes: null
- executor_branch: codex/loop/in-20260831-005246
- registration_base: 8711bfb8ed2821de19370b4951b4e979e3e5c527
- accepted_at: 2026-08-31T02:32:37+09:00
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths:
  - AGENTS.md
  - README.md
  - docs/DESIGN.md
  - docs/development/quality-loop.md
  - docs/reference-repositories.md
  - docs/runtime-architecture.md

### 원문 — 불변

```text
현재 reference 관련 규칙을 초기구성 어느정도 완료되었으니까 빼고 대신 같은 레포의 principle 메서드규칙을 추가해줘
```

### 실행 계약 — coordinator 소유

- 목표: 초기 Engineering 기준을 세우기 위해 선택했던 Reference-Guided Engineering과 두 로컬 exemplar의 mandatory local-first 규칙을 제거하고, 같은 Method 저장소의 Core Engineering Principles를 이 프로젝트의 유일한 Engineering Method로 채택한다. 기존에 검증된 Polygon RPG의 architecture·runtime·process 계약은 보존하면서 순수 함수 → Is-A → Has-A → Can-Do 판단, Node·Scene·Scene Tree·Signal의 개념 경계, 예상 확장 구조화, 반복 문제의 ownership 재검토, 단일 문서 owner와 목적 단위 Git 기록을 canonical 규칙으로 정합한다.
- 완료 조건: `AGENTS.md`의 Method link·선택 선언·Canonical Rule Registry·context routing·implementation policy가 Core Engineering Principles 원문과 일치하고 `METHOD-REFERENCE-GUIDED`, `REF-LOCAL-FIRST`, Reference-Guided 전용 우선순위·정책과 mandatory local exemplar 경로가 제거된다. README·DESIGN·quality/runtime 문서와 reference repository 문서의 현재 역할을 교차 검증해 old Method 강제 규칙은 제거하거나 canonical owner로 통합하되, established project 계약과 현재 동작을 설명하는 근거는 잃지 않는다. Method source/link 무결성, 관련 용어 검색, `npm run check`, `git diff --check`를 통과한다.
- 비범위: gameplay·rendering·input·world 동작 변경, 제품 경험 Reference와 autonomous loop의 출처/evidence를 단어가 같다는 이유만으로 삭제, 새 runtime dependency 도입, 기존 architecture를 새 Method 예시에 맞춰 불필요하게 재구현, 다른 sibling Method 병용.
- 적용 품질 축: 기능 완결성, Method 원문 정합, 문서 단일 소유권, 회귀 안전성.

### 실행 상태 — coordinator 소유

- 기준선: 현재 `AGENTS.md`는 Reference-Guided Engineering을 유일한 Method로 선택하고 두 로컬 저장소의 mandatory local-first 조사, 별도 reference repository index와 전용 §8 policy를 요구한다. README·DESIGN·quality 문서에도 이 초기화 방식의 강제 규칙이 남아 있다.
- 현재 최선: Core Engineering Principles의 현재 upstream 원문과 단독 AGENTS 예제를 확인했고, 기존 Polygon RPG는 이미 Scene/Node/Signal lifecycle, 문서 index·canonical owner, 목적 단위 Korean Git 기록과 확장 가능한 event 경계를 갖추고 있어 Method를 교체하면서 established 계약을 보존할 수 있다.
- 다음 병목: old Reference-Guided 규칙과 현재 프로젝트에 남겨야 할 검증 근거를 구분해, 중복 없이 Core Engineering Principles 일곱 규칙의 canonical owner와 검사 경로를 구현한다.
- 검증: clean `main == origin/main` `d301219b50fa816a65ff25c7688451de4c302e2c`, no live lease와 해당 executor ref/worktree 부재를 확인했다. `ai-development-methods`의 Reference-Guided Engineering, Core Engineering Principles 전체 원문과 Core 단독 AGENTS 예제를 읽고 repository-wide Reference 규칙 위치를 검색했다. 명시 사용자 요청이 기존 Method 선택을 대체하므로 Canonical Conflict는 없다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

진행 전
