# Polygon RPG Quality-Driven Development Loop

이 문서는 standalone direct executor가 기능 완료에서 멈추지 않고 플레이 가능한 결과를 관찰·평가·개선하는 공통 품질 계약이다. 제품 방향은 [`../DESIGN.md`](../DESIGN.md), 현재 상태는 [`../STATUS.md`](../STATUS.md), 원문 queue와 lifecycle은 [`../feedback/INBOX.md`](../feedback/INBOX.md), 실행 절차는 [`process.md`](./process.md)가 소유한다.

## Vertical Slice Director

하나의 nonterminal inbox entry와 하나의 executor branch가 하나의 **Lead Game Developer & QA Director** 경계다. 특정 대화가 owner가 아니다.

- Fresh scheduled run은 같은 branch/worktree를 이어받아 한 iteration을 직접 구현하거나 검증한다.
- 실제 changed tree와 플레이 artifact를 함께 결과로 본다.
- 구현 run은 runnable current best를 checkpoint commit으로 보존하고 executor branch를 push한다.
- 그 다음 fresh run은 마지막 writer와 분리된 Independent Verifier다. 실제 artifact와 affected checks를 통과해야 final commit을 만든다.
- Main integration run은 final diff와 quality evidence를 다시 gate하고 자동 merge/push한다.
- 반복 결함은 규칙 후보로 남기되 새 Product Decision을 자동 승격하지 않는다.

팀장은 Product Director다. 명령·commit·merge 승인이 아니라, 자동 검사와 기존 의도로 결정할 수 없는 양립 불가 방향이나 실제로 질문이 특정된 체감 판단만 맡는다.

## Outer Loop와 Inner Loop

```text
Product Director → DESIGN·방향·우선순위
Team-Lead Main → Git queue 등록·status 후 종료
Fresh Direct Executor → persistent worktree에서 구현·checkpoint·branch push
다음 Fresh Executor → 독립 검사·실제 artifact·final commit
다음 Fresh Executor → main merge·INBOX done·STATUS/DESIGN·push
```

작은 item은 한 구현 run과 한 검증 run으로 끝낼 수 있다. 명확한 병렬 이점이 있을 때만 한 run 내부 subagent를 쓰며, parent run이 결과를 같은 worktree에 통합하고 전체 rubric을 다시 평가한다. Subagent나 별도 task는 peer owner가 아니다.

Run 종료, interruption, unchanged interval과 한 checkpoint는 loop 종료 조건이 아니다. 명시적 pause 또는 durable DESIGN 완료에서만 automation을 멈춘다.

## 내부 품질 기준과 Git 기억

Executor는 반복 승인 없이 다음을 main inbox entry의 `실행 상태`와 `docs/STATUS.md`에 유지한다.

- **플레이 결과:** 시작부터 끝까지 실제로 경험할 시나리오
- **적용 품질 축과 목표 수준**
- **증거 경로:** 결정적 검사, Canvas/mobile artifact와 Reference
- **비범위**
- **기준선 / 현재 최선 / 다음 병목**
- **정지 조건:** 통과, 구체적 Product Decision, 반복 실패 또는 외부 blocker

새 Product Requirement가 아니라면 immutable inbox 원문, DESIGN, 현재 코드, canonical 문서와 verified Reference에서 추론한다. Code checkpoint는 executor branch에, phase/current best/next bottleneck은 main INBOX·STATUS에 commit하므로 다음 fresh run이 대화 memory 없이 이어간다.

## 공통 품질 Rubric

| 점수 | 의미                                                                                 |
| ---- | ------------------------------------------------------------------------------------ |
| 0    | 결과가 없거나 핵심 경로가 깨져 평가할 수 없다.                                       |
| 1    | 동작은 보이지만 의도·일관성·완성도가 부족해 candidate로 제출하지 않는다.             |
| 2    | 반복 가능한 플레이 경로와 프로젝트 기준을 충족해 integration candidate가 될 수 있다. |
| 3    | Reference의 장점을 현재 Domain에 맞게 발전시킨 높은 완성도다. 필수 통과점은 아니다.  |

| 품질 축              | 2점의 최소 증거                                                                        |
| -------------------- | -------------------------------------------------------------------------------------- |
| 기능 완결성          | debug 조작 없이 시나리오를 처음부터 끝까지 반복할 수 있다.                             |
| 조작 명료성          | 입력, 판정과 화면 반응의 성공·실패를 구분할 수 있다.                                   |
| 타격감·Effect        | 적중, guard, 회피, punish 등 핵심 사건을 즉시 인지할 수 있다.                          |
| Graphics·시각 일관성 | silhouette, 대비, motion과 UI가 충돌하지 않고 Polygon/Retro가 같은 상태를 전달한다.    |
| Reference 정합       | 차용한 원칙이 설명이 아니라 실제 플레이에 드러난다.                                    |
| 회귀 안전성          | 결정적 검사, syntax/lint/format, `git diff --check`, console과 resize 경로가 통과한다. |

제출 결과는 적용 축에 0 또는 1이 없어야 하고 기능 완결성과 회귀 안전성이 2 이상이어야 한다. 코드 실행과 화면 합격은 다른 증거이며 마지막 writer 뒤 fresh-run verification을 생략하지 않는다.

## 평가 기반 개선 Loop

```text
baseline 실행·채점
→ 가장 큰 품질 병목 하나 선택
→ 한 가지 safe reversible 개선
→ 결정적 검사
→ 실제 artifact 관찰 가능 상태 확인
→ checkpoint commit·executor branch push
→ 다음 fresh run이 같은 rubric으로 재채점
```

- 한 iteration에서 가장 큰 병목 하나를 다룬다.
- 악화되면 검증된 이전 current best를 기준선으로 사용한다. Shared history를 rewrite하지 않고 correction commit을 쌓는다.
- 같은 gate가 새 evidence·설계 변화 없이 두 번 실패해도 threshold를 낮추지 않는다.
- Passing best가 있으면 다음 병목을 기록하고 이어간다. 없으면 failed evidence와 함께 `blocked`다.
- 같은 원인의 결함·팀장 지적이 두 번 확인되고 기계적으로 측정 가능할 때만 가장 작은 durable check를 추가한다. 다른 임시 검증 코드는 완료 전에 제거한다.

## Checkpoint, Fresh Verification, Final

### Checkpoint

의도한 사용자 경로와 affected deterministic checks가 실행 가능한 시점에 entry-owned current best를 commit하고 executor branch를 push한다. Checkpoint는 중단 복구점이며 final/integration 승인이 아니다. Push 뒤 main INBOX·STATUS에 baseline, current best, next bottleneck, checks와 phase를 기록한다. Executor branch는 두 memory file을 수정하지 않는다.

### Fresh Verification

다음 standalone run이 writer와 분리된 context에서 다음을 확인한다.

1. Clean worktree, executor branch HEAD, registration/latest-main ancestry
2. Merge-base 기준 branch-only diff와 `owned_paths`
3. 마지막 writer 이후 syntax/lint/format, `git diff --check`와 domain checks
4. 실제 Canvas/mobile 사용자 경로, console, resize, 공유 state와 applicable Polygon/Retro 출력
5. 동일 rubric의 모든 적용 축 2 이상

실패하면 가장 큰 원인 하나를 수정한 correction checkpoint를 만들고 다음 fresh verifier에게 넘긴다. 통과하면 result evidence와 `ready-for-integration`을 main INBOX·STATUS에 기록하고 clean final commit을 push한다.

### Integration

Main integration run은 final이 latest main을 포함하고 source worktree가 clean인지 확인한다. Main drift가 있으면 executor branch에 non-rewriting merge하고 다시 fresh verification으로 보낸다. 모든 gate가 통과하면 INBOX terminal 결과, STATUS와 필요한 DESIGN/canonical 문서를 Korean merge commit에 정합한다. 이어 exact `done` block만 제거하고 STATUS에 actual merge hash를 남기는 cleanup commit을 만들어 두 commit을 함께 main에 push한다. 일반 merge/push를 사람 승인 대기로 바꾸지 않는다.

## 팀장 판단

- 명시 의도는 재확인하지 않고 가역 default를 먼저 구현한다.
- 조작감·타격감·Effect·Graphics도 기존 의도와 rubric으로 판단할 수 있으면 final/integration까지 계속한다.
- 구현을 실제로 막는 새 Product Decision, 양립 불가 방향, Canonical Conflict, credential/외부 system만 사람 판단 대상이다.
- 판단이 필요하면 inbox entry에 구현된 경로, 볼 위치·조작 방법, 관찰 질문 1~3개와 답에 따라 바뀌는 것을 기록하고 coordinator run을 `대기`로 끝낸다.
- 포괄적 `승인해 주세요`, `의견을 기다립니다`, plan/command/commit/merge 확인은 blocker가 아니다.

## 기록과 Context

- `docs/DESIGN.md`: 제품 방향, non-scope와 quality contract
- `docs/feedback/INBOX.md`: immutable 원문, durable queue/lifecycle, 실행 상태와 final result
- `docs/STATUS.md`: 현재 active entry, current best, 다음 병목과 blocker projection
- executor branch/worktree: 실제 changed tree와 recoverable commits
- coordinator run title/history: 회차 진단 기록, source of truth 아님

팀장 메인에는 실제 기능, 현재 durable phase/result와 blocker만 쉬운 한국어로 보여 준다. Internal ID, branch와 hash는 보조 evidence다.

## Feedback을 규칙으로 승격

1. 같은 원인의 결함이나 팀장 지적이 두 번 확인되면 inbox entry의 규칙 후보에 기록한다. 고위험 결함은 한 번으로도 후보가 될 수 있다.
2. 실패 원인, 적용 범위, 오탐 비용과 검증 방법을 적는다.
3. 기계적으로 측정 가능하면 가장 작은 canonical check를 추가한다.
4. Integration run은 기존 canonical owner 한 곳에만 승격한다.
5. 오래된 규칙은 Staleness 절차로 수정·폐기한다.

## Reference 채택 판단

[눈치게임즈의 자율 개발 사례](https://www.youtube.com/@nunchigames)와 팀장이 제공한 개선 prompt에서 `매 회차 새 context`, `한 결과에 집중`, `recoverable checkpoint`, `실행 artifact 직접 관찰`, `파일 기반 기억`, `반복 feedback 규칙화`를 수정 채택한다. Codex scheduler·Git queue/branch·run history가 이미 소유하는 기능을 shell daemon이나 범용 DESIGN/STATUS/INBOX로 중복하지 않는다.

[OpenAI Docs의 scored improvement loop](https://learn.chatgpt.com/use-cases/iterate-on-difficult-problems) 원칙에 따라 deterministic check와 정성 rubric을 함께 사용하고 threshold와 artifact inspection을 명시한다.
