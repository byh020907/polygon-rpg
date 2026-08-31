# Polygon RPG Feedback Inbox

이 파일은 팀장이 메인 대화에서 **등록을 요청한 원문 그대로**를 보존하는 새 개발 업무의 단일 Git queue이자 lifecycle source of truth다.

## Ownership

- Team-lead main은 별도 키워드 없이 받은 일반적인 새 개발 명령 한 건을 `new` entry 하나로 append하고 commit/push한다.
- 질문·상태 조회·기존 entry lifecycle·예시/가정·사전 인터뷰·현재 task 직접 처리 요청은 append하지 않는다.
- `원문`은 공백·표현·언어·오탈자·Markdown을 포함해 바꾸거나 요약하지 않는다.
- Complete-work session은 원문 밖의 metadata, 실행 계약, 실행 상태, 결과와 연결만 갱신한다.
- Executor branch는 이 파일과 `docs/STATUS.md`를 수정하지 않는다. 같은 session이 branch evidence를 만든 뒤 main에서 두 파일을 갱신하고 entry 완료까지 계속한다.
- Entry ID와 terminal status가 duplicate consumption을 막는다. 한 entry는 executor branch 하나에서 한 번만 실행한다.

## Entry Contract

- ID: `IN-YYYYMMDD-HHmmss`; 같은 초 충돌은 `-02`, `-03`.
- Status: `new`, `implementing`, `verifying`, `ready-for-integration`, `integrating`, `done`, `blocked`, `paused`, `cancelled`, `superseded`.
- Priority: `urgent`, `high`, `normal`, `low`.
- 새 entry의 derived title, executor branch, accepted time와 owned paths는 executor session이 원문 밖에 채운다.
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

## IN-20260831-030839

- status: new
- received_at: 2026-08-31T03:08:39+09:00
- priority: normal
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: 8aa23206fb705807c52f841cc0dcd059ce546436
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
로드맵 1차 구현 완료 햇다햇는데 더 구체화하자
현재 가장 안된 부분이 스토리 진행과
실제 마을, 던전, 필드 등 맵 구현이야
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

## IN-20260831-032804

- status: new
- received_at: 2026-08-31T03:28:04+09:00
- priority: normal
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: 8a34dbb7bae0ee530944f8d736ccc89043b69753
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
현재 Polygon/Retro 캐릭터의 디테일과 완성도가 낮으므로, 실제 플레이 기본 배율에서 읽히는 실루엣과 장비 구조를 개선해줘.

플레이어는 검술 학원 전투생의 정체성이 드러나야 한다. 교복형 천 레이어 위에 머리카락과 머리 방향, 어깨 장비, 흉갑, 장갑, 부츠, 손과 검·방패의 결합을 큰 polygon 면으로 분리해서 작은 Retro 출력에서도 구분되게 만들어줘.

기본적인 인간형 체형은 레전드 오브 곡괭이처럼 몸통과 팔다리가 가늘고 길쭉한 스틱맨형 비율을 사용해줘. 가는 골격 위에 큰 장비 면과 관절 구분을 얹어 동작이 명확하게 읽혀야 한다.

대표 적은 훈련장 인간형 적 1종을 함께 개선해줘. 플레이어와 체형, 색 분할, 장비와 자세가 명확히 달라야 하며 이후 다른 캐릭터에 확장할 수 있는 공통 시각 문법을 정립해야 해.

레전드 오브 곡괭이 등 기존 제품 Reference에서 작은 화면의 강한 silhouette, 가늘고 과장된 인간형 비율, 장비와 동작의 명확한 색면 분리를 참고하되 캐릭터·의상·asset은 복제하지 마.

실제 플레이 기본 배율에서 확대하지 않아도 머리 방향, 머리카락, 상체 장비, 손발, 검과 방패가 구분되어야 한다. Idle, 이동, guard, roll, 기본 공격, 강공격과 피격 pose에서도 polygon이 겹치거나 형태가 무너지지 않아야 하며 Polygon과 Retro 화면이 같은 캐릭터 상태를 전달해야 한다.

캐릭터의 현재 gameplay 크기, collider, 공격 판정, 이동·전투 balance, camera와 world scale은 변경하지 마. 실제 훈련장 플레이와 Polygon/Retro 출력, resize 및 console 상태를 직접 확인해 완료해줘.
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
