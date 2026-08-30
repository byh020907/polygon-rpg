# Polygon RPG Quality-Driven Development Loop

이 문서는 Polygon RPG의 work-item task가 기능 완료에서 멈추지 않고 플레이 가능한 결과를 관찰·평가·개선하는 공통 품질 계약이다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, queue·task·integration lifecycle은 [`process.md`](./process.md)가 소유한다.

## Vertical Slice Director

각 사용자 소유 work-item task는 하나의 **Lead Game Developer & QA Director**다.

- 실제 changed tree와 플레이 artifact를 함께 최종 결과로 본다.
- 구현, 실행, 관찰, 평가, 개선, 직접 팀장 feedback과 근거 기록을 같은 task/worktree에서 소유한다.
- 반복 결함은 규칙 후보로 남기되 새로운 제품 결정을 자동 승격하지 않는다.
- final scoped worktree commit을 만들고 main coordinator에게 hash를 반환한다.

팀장은 Product Director다. 핵심 재미, 제품 우선순위, 양립하지 않는 방향과 최종 체감 판단을 구현된 candidate를 보고 해당 work-item task에서 직접 내린다.

## Outer Loop와 Inner Loop

```text
Product Director — roadmap·방향·우선순위·work-item task direct feedback
→ Main Coordinator — queue·task 생성·compact 상태·commit integration·다음 gate
→ Work-Item Task / Vertical Slice Director — 구현·artifact·품질 loop·final commit
   ↳ Subagent Worker — 고정된 bounded lane
   ↳ Independent Verifier — frozen candidate 읽기 전용 검증
→ Main Coordinator — final commit 검증·통합·새 task
```

- work item마다 authoritative Codex task와 Director는 하나다.
- 작은 item은 Director 혼자 끝내고, 명확한 병렬 이점과 disjoint ownership이 있을 때만 task 내부 subagent를 사용한다.
- Director는 모든 subagent 결과를 수집·통합한 실제 플레이 경로를 다시 실행하고 전체 rubric을 재평가한다.
- Independent Verifier는 마지막 writer 변경 뒤 frozen candidate를 검사하고 수정은 Director가 수행한다.
- Main Coordinator는 artifact를 대리 채점하거나 feedback을 중계하지 않는다. Task commit의 threshold, evidence와 integration 가능성만 gate한다.

## Roadmap-Driven Outer Loop

Bare `$dev-team-loop`는 메인 coordinator가 현재 item을 reconcile하고, final commit을 통합한 뒤 다음 미충족 gate를 **새 Codex task**로 시작하게 한다.

```text
현재 milestone·queue 평가
→ work item 등록과 managed-worktree task 생성
→ task 내부 quality loop·direct feedback·final commit
→ main 검증·통합·roadmap 갱신
→ 다음 gate를 새 task로 반복
```

- 승인된 roadmap의 현재 gate가 기본 work source다.
- 한 번에 현재 vertical result 하나를 파생하고 main integration을 직렬화한다.
- 구현된 candidate의 direct feedback, 비가역 blocking 제품 결정, Canonical Conflict, 외부 blocker, pause 또는 승인된 다음 milestone 부재에서 멈춘다.

## 내부 품질 기준

Director는 반복 승인 없이 다음을 task 내부 실행 기준으로 정한다.

- **플레이 결과:** 시작부터 끝까지 실제로 경험할 시나리오
- **적용 품질 축과 목표 수준**
- **증거 경로:** 결정적 검사, Canvas/모바일 artifact와 Reference
- **비범위**
- **정지 조건:** 통과, 제품 결정, 반복 실패 또는 외부 blocker

새 Product Requirement가 아니라면 팀장의 명시적 의도, roadmap, 현재 코드, system 문서와 Reference에서 추론한다. 구현 후 actual result, threshold와 verification만 work item/report에 남긴다.

## 공통 품질 Rubric

| 점수 | 의미                                                                                |
| ---- | ----------------------------------------------------------------------------------- |
| 0    | 결과가 없거나 핵심 경로가 깨져 평가할 수 없다.                                      |
| 1    | 동작은 보이지만 의도·일관성·완성도가 부족해 candidate로 제출하지 않는다.            |
| 2    | 반복 가능한 플레이 경로와 프로젝트 기준을 충족해 feedback candidate가 될 수 있다.   |
| 3    | Reference의 장점을 현재 Domain에 맞게 발전시킨 높은 완성도다. 필수 통과점은 아니다. |

| 품질 축              | 2점의 최소 증거                                                                        |
| -------------------- | -------------------------------------------------------------------------------------- |
| 기능 완결성          | debug 조작 없이 시나리오를 처음부터 끝까지 반복할 수 있다.                             |
| 조작 명료성          | 입력, 판정과 화면 반응의 성공·실패를 구분할 수 있다.                                   |
| 타격감·Effect        | 적중, guard, 회피, punish 등 핵심 사건을 즉시 인지할 수 있다.                          |
| Graphics·시각 일관성 | silhouette, 대비, motion과 UI가 충돌하지 않고 Polygon/Retro가 같은 상태를 전달한다.    |
| Reference 정합       | 차용한 원칙이 설명이 아니라 실제 플레이에 드러난다.                                    |
| 회귀 안전성          | 결정적 검사, syntax/lint/format, `git diff --check`, console과 resize 경로가 통과한다. |

Feedback candidate는 적용 축에 0 또는 1이 없어야 하며 기능 완결성과 회귀 안전성이 2 이상이어야 한다. 조작감·타격감·Effect·Graphics 또는 새로운 제품 방향은 2 이상이어도 task에서 팀장 feedback을 직접 받기 전 final commit을 만들지 않는다.

## 평가 기반 개선 Loop

```text
baseline 실행·채점
→ 가장 큰 품질 병목 하나 선택
→ 한 가지 개선
→ 결정적 검사
→ 실제 artifact 관찰
→ 같은 rubric 재채점
→ 개선 여부와 다음 병목 기록
```

- 코드 실행 여부를 시각·플레이 품질의 대체 증거로 사용하지 않는다.
- 한 iteration에서 가장 큰 병목 하나를 다룬다.
- 악화되면 검증된 이전 current best를 기준선으로 사용한다.
- 같은 gate가 새 증거·설계 변화 없이 두 번 실패하면 threshold를 낮추지 않는다. Passing best가 있으면 direct feedback, 없으면 failed evidence와 함께 `blocked`다.

## Current Best와 Final Commit

기능 경로와 결정적 검사가 통과한 뒤 tuning이 길거나 위험하면 Director는 current best의 변경 경계와 evidence를 task에 남긴다. Final worktree commit은 적용 rubric, 실제 artifact, affected checks와 독립 verification이 통과한 뒤 item-owned paths만 포함해 만든다.

Task는 final hash를 응답으로 반환하고 push/merge하지 않는다. Main coordinator가 diff와 checks를 다시 확인해 main에 통합한다.

## 기록과 Context

- roadmap: 제품 방향과 milestone gate
- canonical system 문서: 검증된 제품·Engineering 규칙
- work item: 원문/파생 근거, durable status, actual result·feedback·integration hash
- 업무보고: changed tree, 의도, 플레이 결과, 영향, 검증과 다음 loop
- work-item task/worktree: 실행 중 계획, baseline, current best, artifact와 direct feedback
- task-internal subagent: bounded intermediate evidence

Main context에는 ID/title/task link/status/stop condition/integration result만 둔다. Quality detail은 work-item task와 Git result/report에 둔다.

## 질문·중단·차단

- 명시 의도는 재확인하지 않고 가역 default를 먼저 구현한다.
- 구현을 실제로 막는 새 제품 방향·양립 불가 선택·Canonical Conflict에서만 work-item task가 짧은 Yes/No 또는 2–3 choice 질문 하나를 한다.
- 팀장은 그 task에서 직접 답하고 메인은 `work-item-input` stop condition만 표시한다.
- 반복 blocker나 불명확한 ownership은 `blocked`로 전환한다.
- 자동 무한 loop는 사용하지 않는다.

## Feedback을 규칙으로 승격

1. 같은 원인의 결함이나 팀장 지적이 두 번 확인되면 work item의 규칙 후보에 기록한다. 고위험 결함은 한 번으로도 후보가 될 수 있다.
2. 실패 원인, 적용 범위, 오탐 비용과 검증 방법을 적는다.
3. 영구 test·fixture·script는 `VERIFY-USER-OWNED-TESTS`에 따라 팀장 명시 요청이 있을 때만 추가한다.
4. Main coordinator는 통합 시 기존 canonical owner 한 곳에만 승격한다.
5. 오래된 규칙은 Staleness 절차로 수정·폐기한다.

## Reference 채택 판단

[눈치게임즈의 자율 개발 사례](https://www.youtube.com/@nunchigames)에서 `한 결과에 집중`, `실행 artifact 직접 관찰`, `scoped QA`, `파일 기반 기억`, `반복 feedback의 규칙화`를 Polygon RPG에 맞게 수정해 채택한다. 고정 지시 파일 수, 무한 재시작과 파괴적 rollback은 채택하지 않는다.

[OpenAI Docs의 scored improvement loop](https://learn.chatgpt.com/use-cases/iterate-on-difficult-problems) 원칙에 따라 deterministic check와 정성 rubric을 함께 사용하고 threshold와 artifact inspection을 명시한다.
