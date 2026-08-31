# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status     | Current Evidence                                                                                                                                                     |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | gap        | 120Hz/60Hz command·juggle 기반은 있으나 모든 active attack의 unrestricted jump cancel, landing lock 부재와 실제 배후를 요구하지 않는 punish가 commitment를 약화한다. |
| PG-COMBAT-FEEDBACK       | unverified | contact event, guard/evade/punish와 Polygon/Retro shared frame 구현은 있으나 새 Desired State 기준의 전체 pose·state matrix를 다시 관찰하지 않았다.                  |
| PG-WORLD-JOURNEY         | gap        | 두 expedition의 phase와 objective 문자열은 존재하지만 NPC, 상호작용 가능한 마을 시설, 이야기 사건·quest step과 구체적인 Dungeon 공략이 없다.                         |
| PG-WORLD-SPACE           | gap        | 2 Region, 9 Room, 11 Portal과 environment-shaped portal은 있으나 academy는 한 광장이고 두 Dungeon은 평면 surface·자동 checkpoint 중심의 단일 통로다.                 |
| PG-GROWTH-CHOICE         | gap        | 장비 2종과 command level 저장은 있으나 탐험 보상은 영구 성장과 연결되지 않고 Boss·shortcut world progress가 reload 뒤 초기화된다.                                    |
| PG-CHARACTER-READABILITY | gap        | Shared IK와 RenderFrame 기반은 있으나 player hair·uniform layer·shoulder gear·glove·boot와 대표 적 대비가 기본 Retro 배율에서 충분하지 않다.                         |
| PG-PLATFORM-ACCESS       | gap        | Keyboard/mobile intent는 통합됐지만 mobile에서 current objective가 숨고 screen focus, Canvas 대체 status와 일부 touch target evidence가 부족하다.                    |
| PG-RECOVERY              | gap        | Progression storage validation은 있으나 world/story progress persistence, corrupt-save user feedback와 end-to-end failure recovery evidence가 부족하다.              |

## Engineering Desired State Comparison

| Architecture Area                    | Status     | Current Evidence                                                                                                                                                                            |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied  | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                  |
| Module Boundaries                    | gap        | `GameScene`이 concrete maps, combat, animation, progression과 presentation 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter gameplay가 presentation module을 import한다. |
| Scene Lifecycle                      | satisfied  | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                        |
| State Ownership and Data Flow        | gap        | Map/encounter/render writer 경계는 대체로 분리됐지만 shared combat geometry의 neutral owner와 authored content injection이 Desired State에 미달한다.                                        |
| Rendering and Input                  | satisfied  | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline이 코드 경계로 확인된다.                                                          |
| Persistence and Recovery             | gap        | Equipment/skill storage만 durable하며 world/story/reward state와 explicit failure presentation이 현재 architecture contract에 미달한다.                                                     |
| Development Runtime                  | satisfied  | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                      |
| Testing and Independent Verification | unverified | `npm run check`와 tool-agnostic browser capture는 준비됐지만 현재 active Execution Goal의 deterministic/runtime/verifier evidence가 아직 없다.                                              |

## Active Execution Goal

### EG-WORLD-STORY-FOUNDATION

- Desired-State mapping: `PG-WORLD-JOURNEY`, `PG-WORLD-SPACE`; Architecture `Module Boundaries`, `State Ownership and Data Flow`.
- Gap evidence: academy plaza의 entity/trigger가 비어 있고 story는 phase flag와 한 줄 objective에 머문다. Dungeon은 다음 Execution Goal이 필요할 정도로 별도 공간 역할이 부족하다.
- Scope: story definition/state boundary, academy의 named mentor landmark, 장비 선택과 기존 journey event에 연결되는 visible briefing·objective 갱신을 구현한다.
- Non-scope: 전체 Dungeon 재구성, character visual overhaul, combat balance와 새 Region 추가.
- Verification: DOM 없는 story transition 검사, academy actual browser flow와 desktop/mobile objective, map path invariant, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
