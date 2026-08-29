---
id: WI-20260830-014120
status: queued
priority: high
lane: dedicated
created_at: 2026-08-30T01:41:20+09:00
depends_on:
  - WI-20260830-003138
reopens: null
review: team-lead
source: team-lead
source_ref: null
---

# Godot Scene·Node·Signal 기반 시스템 구조 개선

## 팀장 원문 또는 파생 근거

> 피드백할건 많은데 일단 넘기고 우선순위 높은 내용 알려줄게
> godot 엔진 구조 레퍼런스 참고해서 우리 시스템부터 유지보수 및 관리 하기 좋게 할거야
>
> 핵심개념은
> 씬, 노드, 그리고 시그널 패턴 이야 이 3가지는 꼭 충실히 반영해줘

## 접수 해석

Godot Engine의 공식 구조와 실제 책임 경계를 Engineering Reference로 조사하고, 현재 Vanilla JavaScript ESM runtime을 Scene·Node·Signal 중심으로 재구성한다. 목표는 Godot 자체를 의존성으로 추가하거나 API 외형을 복제하는 것이 아니라, 현재 집중된 orchestration과 직접 결합을 계층적 composition, 명시적 lifecycle/state ownership, 수명 주기가 관리되는 signal connection으로 바꿔 이후 combat·world·UI 시스템을 유지보수하고 확장하기 쉽게 만드는 것이다.

## 인터뷰와 결정

- 팀장이 Scene, Node, Signal 세 개념을 모두 충실히 반영하는 것을 high-priority 방향으로 확정했다.
- 세 개념의 Polygon RPG 적용 단위, public contract, migration order와 abstraction depth는 Godot 공식 문서·source와 현재 repository caller를 근거로 Director가 결정한다.
- 외부 게임 엔진이나 runtime dependency는 추가하지 않는다.

## 실행 계약

- Godot 공식 문서와 필요한 source/caller에서 Scene composition, Node tree/lifecycle, Signal connection·disconnection·notification ownership이 해결하는 문제와 제약을 확인한다.
- 현재 `GameApp`, `GameScene`, combat, world, RenderFrame, UI bridge의 composition root와 직접 dependency를 좁게 inventory한다.
- Scene은 재사용 가능한 Node subtree/composition 단위와 조립 경계를, Node는 parent/child ownership과 enter/process/exit에 해당하는 명시적 lifecycle을, Signal은 producer가 consumer를 직접 소유하지 않는 event 경계와 connection cleanup을 제공해야 한다.
- 세 개념이 이름만 존재하는 wrapper가 아니라 실제 M1 플레이 경로의 조립·상태 전달·resource lifecycle을 소유하도록 적용한다.
- Renderer read-only, physics/gameplay writer ownership, fixed-step, input adapter와 RenderFrame 계약을 보존한다.
- 중앙 `GameScene`을 한 번에 재작성하지 않고 실행 가능한 수직 migration으로 책임을 이동하며, 변경 후에도 새 게임 → Portal → M1 전투 전체가 유지된다.
- Godot의 editor, resource format, singleton, engine-specific domain object와 현재 요구에 불필요한 abstraction은 복제하지 않는다.
- 사용자 요청 없는 영구 test·fixture·test script는 추가하지 않는다.

## 품질 계약

- 적용 축: 기능 완결성, 구조 명료성, lifecycle 안전성, Signal 결합도, Godot Reference 정합, 회귀 안전성.
- 최소 threshold: `docs/development/quality-loop.md`의 모든 적용 축 2 이상.
- 증거: 현재/변경 후 dependency·state ownership 비교, Scene/Node lifecycle과 Signal cleanup 결정적 진단, `npm run check`, `git diff --check`, 실제 Canvas의 메뉴 → Portal → M1 전투와 Polygon/Retro 동일 상태.
- 정지 조건: Scene·Node·Signal 중 하나라도 이름뿐인 facade로 남거나, listener/resource 누수·중복 processing·renderer write·gameplay 회귀가 확인되면 candidate를 제출하지 않는다.

## 평가 기록

- Baseline: `GameScene`이 combat, world, character geometry와 RenderFrame 조립을 집중 소유하고 여러 subsystem이 직접 caller 관계로 결합돼 있어 새 조우·Room·UI 확장 시 변경 범위와 lifecycle을 추적하기 어렵다.
- Current best: root Director가 current dependency/lifecycle evidence와 첫 vertical migration을 같은 rubric으로 평가한 뒤 기록한다.
- 다음 병목: Godot의 Scene·Node·Signal 책임을 현재 composition root와 M1 경로에 대응시키고, 가장 큰 결합 병목 하나를 수직 migration 범위로 고정하는 일.

## 규칙 후보

- Scene·Node·Signal 적용이 반복되는 subsystem에서 ownership/lifecycle 규칙으로 검증되면 canonical architecture 문서와 registry 승격을 제안한다.

## Reference Brief

- Engineering Reference: Godot Engine 공식 문서와 필요한 engine source/caller의 Scene composition, Node tree/lifecycle, Signal semantics.
- Current Repository: `GameApp` composition, `GameScene`, fixed-step/input, combat/world state, shared RenderFrame, UI bridge의 실제 caller와 검증 경로.
- 차용: 문제를 해결하는 책임 경계와 lifecycle 원칙.
- 비차용: Godot editor·resource serialization·engine runtime·API naming의 기계적 복제와 현재 Domain에 필요 없는 범용 abstraction.
- 결과물: M1 플레이를 보존하면서 Scene·Node·Signal이 실제 orchestration과 subsystem communication을 소유하는 첫 구조 수직 단위.

## 결과

진행 전.

## 취소 기록

해당 없음.

## 연결

- Depends on: `WI-20260830-003138`
- 업무보고: 완료 또는 feedback candidate 준비 시 생성
