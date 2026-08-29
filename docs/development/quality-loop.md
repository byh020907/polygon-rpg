# Polygon RPG Quality-Driven Development Loop

이 문서는 Polygon RPG의 개발 에이전트가 기능을 단순 완료하는 데서 멈추지 않고, 플레이 가능한 결과를 관찰·평가·개선하는 공통 품질 계약이다. 제품 방향과 milestone은 [`roadmap.md`](./roadmap.md)가, queue·agent·feedback lifecycle은 [`process.md`](./process.md)가 소유하며, 이 문서는 각 work item 내부의 실행 품질을 소유한다.

## 에이전트 페르소나와 권한

개발 worker는 **Lead Game Developer & QA Director**로 행동한다.

- 티켓의 문구를 소비하는 사람이 아니라 팀장이 정한 제품 방향 안에서 응집력 있는 플레이 결과를 완성하는 책임자다.
- 코드 diff보다 실제 플레이 artifact를 최종 결과로 본다.
- 구현, 실행, 관찰, 평가, 개선과 근거 기록을 하나의 책임으로 소유한다.
- 발견한 결함을 임시 수정으로 끝내지 않고 반복 가능성이 확인되면 규칙 후보로 남긴다.

팀장은 Product Director다. 핵심 재미, 제품 우선순위, 서로 양립하지 않는 방향과 최종 체감 판단은 팀장이 소유한다. AI의 품질 책임은 이 권한을 대체하지 않으며, 새로운 제품 결정을 추측해서 영구 규칙으로 승격하지 않는다.

## 팀 Loop와 품질 Loop의 중첩

팀 orchestration은 work item을 선택·배치·통합하는 바깥 loop고, 품질 loop는 한 work item 안에서 artifact를 완성하는 안쪽 loop다.

팀 역할은 개발 목표를 만드는 조직 시뮬레이션이 아니라 ownership topology다. 무엇을 할지는 roadmap과 품질 evidence가 결정하고, 역할은 누가 파생·구현·검증·통합할지만 제한한다.

```text
Product Director — roadmap·방향·우선순위·최종 체감
→ Main Coordinator — roadmap에서 다음 work item 파생·queue·배치·통합 gate
→ Vertical Slice Director — 구현·통합 artifact·품질 loop
   ↳ Subtask Worker — 고정된 계약 안의 좁은 lane
   ↳ Independent Verifier — frozen candidate 읽기 전용 검증
→ Product Director feedback
→ Main Coordinator 통합·규칙 승격
```

- work item마다 하나의 authoritative 대화와 **Vertical Slice Director**만 둔다. 이 Director가 해당 work item의 Lead Game Developer & QA Director다.
- 작은 serial item은 Director 한 명으로 끝낸다. 명확한 병렬 이점과 disjoint ownership이 있을 때만 하위 worker를 추가한다.
- Director는 공개 계약을 고정한 뒤 read-heavy 조사나 disjoint implementation을 하위 worker에 위임할 수 있다. 하위 worker는 할당 경로와 산출물만 소유하며 제품 범위, rubric, 팀장 feedback과 parent work-item 완료를 소유하지 않는다.
- Director는 모든 하위 결과를 통합한 실제 플레이 경로를 다시 실행하고 전체 rubric을 재평가한다. 부분 lane의 성공 점수를 합쳐 수직 단위의 품질로 간주하지 않는다.
- Independent Verifier는 마지막 writer 변경 뒤 frozen candidate를 검사한다. 실패하면 같은 Director가 품질 loop로 돌아가며, verifier가 제품 방향을 바꾸거나 candidate를 직접 수정하지 않는다.
- Main Coordinator는 artifact를 대리 채점하지 않는다. 단일 Director, threshold, 실제 증거와 독립 검증이 갖춰졌는지를 gate하고 main 통합과 규칙 승격만 소유한다.

## Roadmap-Driven Outer Loop

팀장 메시지는 개발을 한 번씩 시동하는 필수 입력이 아니다. 승인된 roadmap의 현재 milestone과 품질 gate가 메인 coordinator의 지속 objective다.

메인 대화의 bare `$dev-team-loop` 호출이 이 objective를 시작·복구하는 canonical command다. 메인 대화가 별도 manager task 없이 root agent를 감독하고 stop condition까지 다음 gate를 계속 소비한다.

```text
현재 milestone과 통합 artifact 평가
→ 아직 충족되지 않은 가장 큰 플레이·품질 gate 선택
→ roadmap-derived work item 하나 생성
→ Vertical Slice Director의 품질 loop
→ feedback·통합
→ roadmap 상태와 규칙 갱신
→ 다음 미충족 gate로 반복
```

- 현재 milestone의 다음 미충족 gate를 소유한 open item이 없으면 메인 coordinator가 팀장 메시지를 기다리지 않고 다음 work item을 파생한다.
- 파생 work item은 roadmap에 이미 승인된 결과를 구체화할 뿐 새로운 milestone, Product Requirement, IP, 외부 부작용이나 대규모 범위를 발명하지 않는다.
- 한 번에 다음 vertical result 하나만 파생한다. 같은 milestone의 병렬 lane은 Vertical Slice Director가 고정된 계약 아래 하위 task로 관리한다.
- 팀장 지시·feedback·우선순위 변경은 roadmap-derived queue보다 우선하며 같은 목표를 구체화하면 현재 item에 누적한다.
- 팀장 feedback, 남은 제품 인터뷰 gate, Canonical Conflict, 외부 blocker, pause 또는 승인된 다음 milestone 부재에서는 자동 파생을 멈춘다.

## Work Item 품질 계약

구현 전에 worker가 팀장에게 반복 입력을 요구하지 않고 다음 항목을 work item에 작성한다.

- **플레이 결과:** 시작부터 끝까지 플레이어가 실제로 경험할 한 시나리오
- **적용 품질 축:** 아래 rubric 중 이번 변경에 적용되는 항목
- **목표 수준:** feedback candidate 또는 milestone pass에 필요한 점수
- **증거 경로:** 결정적 검사, 실제 Canvas/모바일 경로와 비교할 Reference
- **비범위:** 이번 loop가 고치지 않을 인접 문제
- **정지 조건:** 통과, 제품 결정 필요, 반복 실패 또는 외부 blocker

새 Product Requirement가 아니라면 worker가 roadmap, 현재 코드, 관련 system 문서와 Reference Brief에서 이 계약을 추론한다.

## 공통 품질 Rubric

모든 적용 축은 같은 0~3 척도를 사용한다.

| 점수 | 의미                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------- |
| 0    | 결과가 없거나 핵심 경로가 깨져 평가할 수 없다.                                                    |
| 1    | 동작은 보이지만 의도, 일관성 또는 완성도가 명확히 부족하다. candidate로 제출하지 않는다.          |
| 2    | 반복 가능한 플레이 경로와 프로젝트 품질 기준을 충족한다. feedback candidate가 될 수 있다.         |
| 3    | Reference의 장점을 현재 Domain에 맞게 발전시킨 높은 완성도다. 필수 통과점이 아니라 polish 목표다. |

| 품질 축              | 2점의 최소 증거                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------- |
| 기능 완결성          | debug 조작 없이 시나리오를 처음부터 끝까지 반복할 수 있다.                                  |
| 조작 명료성          | 플레이어 입력, 시스템 판정과 화면 반응의 성공·실패를 구분할 수 있다.                        |
| 타격감·Effect        | 적중, guard, 회피, punish 등 현재 milestone의 핵심 사건을 즉시 인지할 수 있다.              |
| Graphics·시각 일관성 | silhouette, 대비, motion과 UI가 서로 충돌하지 않고 Polygon/Retro가 같은 상태를 전달한다.    |
| Reference 정합       | Reference Brief에서 차용하기로 한 원칙이 설명이 아니라 실제 플레이에 드러난다.              |
| 회귀 안전성          | 관련 결정적 검사, syntax/lint/format, `git diff --check`, console과 resize 경로가 통과한다. |

Feedback candidate는 적용 축에 0 또는 1이 없어야 하며 기능 완결성과 회귀 안전성이 반드시 2 이상이어야 한다. 조작감·타격감·Effect·Graphics 또는 새로운 제품 방향은 점수가 2 이상이어도 팀장 feedback 전에는 최종 통합하지 않는다.

## 평가 기반 개선 Loop

한 work item은 하나의 플레이 가능한 결과를 소유하고, 그 안의 각 iteration은 가장 큰 품질 병목 하나만 다룬다.

```text
현재 baseline 실행·채점
→ 가장 낮거나 영향이 큰 품질 축 선택
→ 원인 가설과 한 가지 개선 수행
→ 범위에 맞는 결정적 검사
→ 실제 artifact·Canvas·모바일 경로 관찰
→ 같은 rubric으로 재채점
→ 개선 여부와 다음 병목 기록
→ 통과할 때까지 반복
```

- 코드가 실행된다는 사실을 시각·플레이 품질의 대체 증거로 사용하지 않는다.
- 여러 품질 축을 동시에 바꾸는 대규모 tuning은 원인과 효과를 분리할 수 없으므로 피한다.
- 현재 점수가 좋아졌더라도 threshold 아래면 다음 병목을 계속 개선한다.
- 새 결과가 악화되면 원인을 기록하고 검증된 이전 candidate를 기준선으로 사용한다.

## Checkpoint와 Final Candidate

기능 경로와 결정적 검사가 처음 통과한 뒤 시각·체감 tuning이 길거나 위험하면 worker branch에 복구용 checkpoint commit을 만들 수 있다. checkpoint는 작업 유실과 무관한 변경의 혼합을 막기 위한 것이며 품질 승인이나 통합 허가가 아니다.

Final candidate commit은 적용 rubric이 threshold를 통과하고 실제 artifact 증거가 확보된 뒤에만 만든다. 이미 통합된 이력을 되돌릴 때는 broad reset 대신 영향 분석을 가진 새 work item과 표적 revert를 사용한다.

## 기록과 Context 인계

별도의 기획서·인수인계서·인간 지시서를 중복 생성하지 않는다. 기존 source of truth를 다음처럼 사용한다.

- roadmap: 느리게 변하는 제품 방향과 milestone gate
- canonical system 문서: 검증된 제품·Engineering 규칙
- work item: 팀장 원문, 현재 품질 계약, 평가 기록, 현재 최고 결과와 다음 병목
- 업무보고: 완료된 결과의 의도, 영향, 검증과 다음 loop
- Codex subagent tree와 filesystem: 실행 중 상태, agent와 path ownership

대화 context를 교체하거나 압축할 때는 최소한 `Quality Baseline`, `Current Best`, `Next Bottleneck`, `Rule Candidates`를 보존한다. 채팅 기억만으로 품질 상태를 이어가지 않는다.

## 질문·중단·차단 조건

- threshold를 통과하면 `feedback` 또는 완료 경로로 이동한다.
- 새로운 제품 방향, 서로 양립하지 않는 체감 선택, Canonical Rule 충돌 또는 의미 있는 범위 확대가 필요하면 팀장에게 질문한다.
- 같은 acceptance gate가 두 번 연속 실패하고 새 증거·환경 변화·설계 변화가 없으면 무의미한 tuning을 멈추고 `feedback`으로 전환한다.
- 같은 blocker가 반복되거나 ownership이 불명확하면 `blocked`로 전환한다.
- 자동 재시작과 무한 loop를 기본값으로 사용하지 않는다. 실행 budget, 종료 권한과 외부 부작용이 명시된 automation에서만 별도 채택한다.

## Feedback을 규칙으로 승격하기

반복 지시를 줄이기 위해 worker는 수정으로 끝내지 않고 원인과 재발 가능성을 분류한다.

1. 같은 원인의 결함이나 팀장 지적이 두 번 확인되면 work item의 `규칙 후보`에 기록한다. 데이터 손실·보안·공개 배포처럼 영향이 큰 결함은 한 번으로도 후보가 될 수 있다.
2. 후보에 실패 원인, 적용 범위, 오탐 비용과 검증 가능한 판정 방법을 적는다.
3. 결정적으로 판정 가능하고 반복 가치가 있을 때만 script/check로 자동화한다. 새 영구 test·fixture·test script는 `VERIFY-USER-OWNED-TESTS`에 따라 팀장의 명시적 요청이 있을 때만 추가한다. 정성 판단은 rubric 또는 system 문서의 이유가 있는 규칙으로 남긴다.
4. 메인 coordinator는 통합 시 기존 Canonical Rule·system 문서의 owner를 확인해 한 곳에만 승격한다. 단순 규칙 수를 품질 지표로 삼지 않는다.
5. 더 이상 현재 코드·제품 방향과 맞지 않는 규칙은 Staleness 절차로 수정하거나 폐기한다.

승격된 규칙은 다음 roadmap-derived work item의 초기 품질 계약에 자동 반영한다. 이 `feedback → rule candidate → canonical rule/check → 다음 baseline` 흐름이 코드 기능과 별개로 계속 축적되는 loop engineering이다.

## Reference 채택 판단

[눈치게임즈의 자율 개발 사례](https://www.youtube.com/@nunchigames)에서 `한 결과에 집중`, `실행 artifact 직접 관찰`, `scoped QA`, `파일 기반 기억`, `반복 feedback의 규칙화`를 Polygon RPG에 맞게 수정해 채택한다. 세 개의 고정 지시 파일, QA 규칙 개수, 로그인 시 무한 재시작과 파괴적 자동 rollback은 현재 저장소의 source hierarchy·비용·ownership 계약과 맞지 않아 그대로 채택하지 않는다.

[OpenAI Docs의 scored improvement loop](https://learn.chatgpt.com/use-cases/iterate-on-difficult-problems) 원칙에 따라 deterministic check와 정성 rubric을 함께 사용하고, threshold·iteration log·artifact inspection을 명시한다.
