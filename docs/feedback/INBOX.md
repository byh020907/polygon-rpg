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

## IN-20260831-025240

- status: done
- received_at: 2026-08-31T02:52:40+09:00
- priority: normal
- source: team-lead-main
- title: 한 loop 완전 작업 단위 강제
- supersedes: null
- executor_branch: codex/loop/in-20260831-025240
- registration_base: e3706a331f9f802a7a3072b0f79f0f5c66a08b87
- accepted_at: 2026-08-31T04:33:00+09:00
- checkpoint_commit: 679e1b0aeb58b4667db534f61a884c42a80a04c9
- final_commit: 4b038df4b379c2ecdf3dce84b4d70d8492947638
- integration: the merge commit that marks this entry done
- owned_paths: [loop/completion.mjs, loop/loop.ps1, loop/PROMPT.md, docs/development/process.md, docs/development/loop-engineering-references.md]

### 원문 — 불변

```text
내 루프를 잘못 이해한거같아, 한 루프가 항상 완전한 작업을 하는개념이야
수정해줘
```

### 실행 계약 — coordinator 소유

- 목표: fresh `codex exec` 한 번이 entry 전체 구현·검사·checkpoint·해당 시 visible PNG QA·final·main 통합·INBOX 정리·push·lease 해제까지 완결한 경우에만 loop 한 회차가 성공하도록 실행 종료 조건을 강제한다.
- 완료 조건: 선택 entry가 live INBOX에서 사라졌을 뿐 아니라 main clean·`origin/main` 동기화, executor local/remote ref 일치와 main 포함, lease 해제까지 확인해야 성공하고 어느 하나라도 빠지면 nonzero recovery 대상으로 남는다. Prompt와 canonical process/reference가 같은 계약을 설명하며 affected deterministic check, `npm run check`, `git diff --check`가 통과한다.
- 비범위: gameplay·화면·balance 변경, Task Scheduler 활성화, 다른 INBOX entry 구현, 기존 executor worktree 추측 정리.
- 적용 품질 축: 기능 완결성, 설계·Method 정합, 회귀 안전성. 화면 출력이 없는 loop 운영 변경이므로 Graphics·타격감·조작 명료성과 visible PNG QA는 적용하지 않는다.

### 실행 상태 — coordinator 소유

- 기준선: current main은 phase별 정상 종료를 없애고 한 session complete-work prompt를 사용하지만 `loop/loop.ps1`의 성공 판정은 selected entry 부재만 확인해 clean/push/integration/lease durable proof를 강제하지 않는다.
- 현재 최선: latest main `b8985a7bc8da8d9b690bda49cbfe4dff343bbaa1`을 포함한 clean final `4b038df4b379c2ecdf3dce84b4d70d8492947638`이 outer loop의 성공 조건을 live entry 부재, clean pushed main, pushed integrated executor final, released lease의 단일 executable postcondition으로 강제한다.
- 다음 병목: 없음. 같은 integration transition에서 이 exact `done` block만 정리하고 STATUS에 실제 merge hash를 기록한다.
- 검증: completion pure decision의 정상·live entry·wrong branch·dirty/unpushed main·live lease·missing/unpushed/unmerged executor·blocked·ROADMAP 12개 fixture, actual lifecycle snapshot의 단계별 실패 사유, PowerShell parser, branch-only owned path 5개, `npm run check`, `git diff --check`, clean local/remote executor final과 latest-main ancestry를 확인했다. 운영 문서·supervisor 변경이라 applicable game screen이 없어 visible PNG QA는 적용하지 않았다. 기능 완결성·설계/Method 정합·회귀 안전성은 모두 2 이상이다.
- 실제 blocker: 없음

### 결과 — coordinator 소유

한 fresh `codex exec`이 entry를 live INBOX에서 지운 것만으로 성공하지 않도록 outer supervisor를 수정했다. 이제 main branch/clean/origin push, deterministic executor local/remote final 일치와 main 포함, lease 해제를 모두 만족해야 exit 0이 되며 빠진 증거는 run summary의 구체적 failure로 남아 다음 fresh session이 복구한다. Final은 `4b038df4b379c2ecdf3dce84b4d70d8492947638`이다.

## IN-20260831-030641

- status: new
- received_at: 2026-08-31T03:06:41+09:00
- priority: normal
- source: team-lead-main
- title: null
- supersedes: null
- executor_branch: null
- registration_base: 868353b20e0bfb97d77c07133f0cb3ed0d030726
- accepted_at: null
- checkpoint_commit: null
- final_commit: null
- integration: null
- owned_paths: []

### 원문 — 불변

```text
현재 기본적인 맵시스템은 완성되었는데, 맵 포탈을 더 자연스럽게 문이나 주변 환경에 맞는 형태로 모양을 개선할거야, 인터넷에 적절한 레퍼런스 참고해서 진행해, 그리고 크기도 유저 정도로 줄여야해
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
