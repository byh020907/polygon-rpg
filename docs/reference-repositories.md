# Engineering Reference Evidence

이 문서는 Polygon RPG의 현재 Engineering 계약을 만들 때 사용한 외부·로컬 근거와 채택 범위를 기록한다. 구현 순서나 고정된 1차 저장소를 강제하는 Method 문서가 아니다. 현재 규칙은 [`AGENTS.md`](../AGENTS.md)와 영역별 canonical 문서가 소유하며, 실제 동작은 current code·caller·검증 결과로 확인한다.

Core Engineering Principles에 따라 구체 구현 전에는 같은 책임의 Reference를 검색한다. 검색 대상은 현재 질문에 맞게 선택하며 아래 저장소를 항상 읽거나 구조를 복제하지 않는다. 과거 근거를 다시 사용할 때도 현재 commit의 API, state ownership, lifecycle, 성능 전제와 caller가 같은지 재검증한다.

## 과거 Local Evidence

| 저장소               | 로컬 경로                          | 현재 계약에 영향을 준 영역                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ball Fight Simulator | `C:/projects/ball-fight-simulator` | 공용 game-kit 경계, 충돌·물리 책임 분리, Canvas 효과 유틸, command 수명주기, pointer capture           |
| Baeseongjin          | `C:/projects/baeseongjin`          | fixed-step·입력 snapshot, read-only render snapshot, Canvas host, particle presentation, Git ownership |

이 경로는 historical evidence다. 특정 작업의 책임과 맞지 않거나 접근할 수 없으면 다른 공식 문서·검증된 구현을 검색하며, 경로 부재만으로 현재 Polygon RPG 계약을 변경하지 않는다.

## 현재 채택된 결정과 Canonical Owner

| 영역            | 현재 채택 결정                                                                                            | Canonical owner / 실제 근거                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 물리·충돌       | 검출·접촉·응답·재질을 분리하고 물리 상태의 최종 writer를 한 곳에 둔다. Render Mesh와 Collider를 분리한다. | `AGENTS.md`, 현재 physics/combat caller                                                                                                            |
| fixed-step·입력 | animation frame과 simulation step을 분리하고 adapter가 frozen intent snapshot을 만든다.                   | [`input-system.md`](./input-system.md), `GameApp` caller                                                                                           |
| Canvas·렌더링   | Canvas host가 context·DPR·resize를 소유하고 renderer는 같은 read-only RenderFrame만 소비한다.             | [`rendering-pipeline.md`](./rendering-pipeline.md), 실제 renderer                                                                                  |
| Effect          | Gameplay event를 presentation data로 변환하고 renderer는 판정이나 effect lifetime을 진행하지 않는다.      | [`rendering-pipeline.md`](./rendering-pipeline.md), `GameScene`                                                                                    |
| UI·runtime      | Alpine UI와 Game runtime을 bridge로 분리하고 Scene/Node/Signal lifecycle을 명시한다.                      | [`ui-architecture.md`](./ui-architecture.md), [`runtime-architecture.md`](./runtime-architecture.md)                                               |
| 개발 loop       | INBOX entry·branch·worktree·commit ancestry가 ownership과 복구 evidence를 소유한다.                       | [`development/process.md`](./development/process.md), [`development/loop-engineering-references.md`](./development/loop-engineering-references.md) |

이 표는 규칙을 복제하지 않고 owner를 찾기 위한 index다. 세부 계약을 바꾸면 표의 문장을 확장하는 대신 해당 canonical owner와 실제 caller를 같은 작업에서 갱신한다.

## 과거 채택·비채택 근거

- Ball Fight Simulator의 collision responsibility와 Baeseongjin의 fixed-step/input/render snapshot 분리는 Polygon RPG의 현재 단방향 state 흐름에 맞게 수정 채택했다.
- Baeseongjin의 mobile adapter/layout 분리와 Ball Fight Simulator의 pointer lifecycle은 공통 intent snapshot 계약에 맞게 수정 채택했다.
- 두 프로젝트의 effect 구현에서 gameplay event와 presentation을 분리하는 원칙은 채택했지만, particle object model이나 manager 계층은 복제하지 않았다.
- 전역 UI manager, Promise 기반 다중 mode selector, 대규모 Quadtree, multiplayer authority와 repository-specific Issue/PR 절차는 현재 요구와 소유권에 맞지 않아 채택하지 않았다.
- Autonomous coordinator의 controller·durable recovery 근거는 별도 canonical evidence 문서인 [`development/loop-engineering-references.md`](./development/loop-engineering-references.md)가 소유한다.

## 새 구현에서 Reference를 다루는 방법

1. 구현할 책임과 공개 계약을 한 문장으로 고정한다.
2. Current code, caller, canonical owner와 검증 경로를 확인한다.
3. 같은 책임의 구체적 Reference를 검색하고 전제·trade-off·dependency direction을 비교한다.
4. 적용한 원칙과 적용하지 않은 부분을 작업 evidence에 기록한다.
5. Canonical Rule과 충돌하면 구현을 멈추고 `AGENTS.md`의 Conflict Resolution Control을 적용한다.

Reference에 interface, manager, singleton, component나 mixin이 있다는 이유만으로 같은 구조를 만들지 않는다. 구현 단위는 Core Engineering Principles의 순수 함수 → Is-A → Has-A → Can-Do 순서로 판단하며, 현재 프로젝트에서 예상되는 확장과 명시적 ownership 이점이 있을 때만 구조화한다.
