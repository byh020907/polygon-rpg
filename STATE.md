# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status     | Current Evidence                                                                                                                                                                                       |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PG-COMBAT-CONTROL        | gap        | 120Hz/60Hz command·juggle 기반은 있으나 모든 active attack의 unrestricted jump cancel, landing lock 부재와 실제 배후를 요구하지 않는 punish가 commitment를 약화한다.                                   |
| PG-COMBAT-FEEDBACK       | unverified | contact event, guard/evade/punish와 Polygon/Retro shared frame 구현은 있으나 새 Desired State 기준의 전체 pose·state matrix를 다시 관찰하지 않았다.                                                    |
| PG-WORLD-JOURNEY         | gap        | Story resolver·세라 briefing과 첫 Dungeon의 guardian→checkpoint→Boss threshold가 원정 사건을 설명한다. 상호작용 가능한 마을 시설과 Glasswind Dungeon 구체화는 아직 없다.                               |
| PG-WORLD-SPACE           | gap        | Academy mentor, environment portals와 첫 Dungeon의 entrance·combat gate·checkpoint alcove·Boss threshold는 구분된다. Academy는 한 광장이고 Glasswind Dungeon은 평면 통로다.                            |
| PG-GROWTH-CHOICE         | gap        | 장비 2종과 command level 저장은 있으나 탐험 보상은 영구 성장과 연결되지 않고 Boss·shortcut world progress가 reload 뒤 초기화된다.                                                                      |
| PG-CHARACTER-READABILITY | unverified | Player hair·uniform·pauldron·glove·boot와 training enemy cloth·mask·plate 색면이 기본 Retro desktop/mobile에서 구분되고 contact geometry는 보존됐다. 실제입력 전체 pose와 Polygon matrix는 미확인이다. |
| PG-PLATFORM-ACCESS       | gap        | Keyboard/mobile intent와 story objective는 desktop/mobile에 함께 표시된다. Screen focus, Canvas 대체 status와 일부 touch target evidence는 여전히 부족하다.                                            |
| PG-RECOVERY              | gap        | Progression storage validation은 있으나 world/story progress persistence, corrupt-save user feedback와 end-to-end failure recovery evidence가 부족하다.                                                |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                            |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                  |
| Module Boundaries                    | gap       | `GameScene`이 concrete maps, combat, animation, progression과 presentation 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter gameplay가 presentation module을 import한다. |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                        |
| State Ownership and Data Flow        | gap       | Map/encounter/render writer 경계는 대체로 분리됐지만 shared combat geometry의 neutral owner와 authored content injection이 Desired State에 미달한다.                                        |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline이 코드 경계로 확인된다.                                                          |
| Persistence and Recovery             | gap       | Equipment/skill storage만 durable하며 world/story/reward state와 explicit failure presentation이 현재 architecture contract에 미달한다.                                                     |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                      |
| Testing and Independent Verification | satisfied | Story, Dungeon과 Character candidate가 deterministic/source probes, visible Chrome capture와 separate fresh verifier를 PASS했다.                                                            |

## Active Execution Goal

### EG-WORLD-PROGRESSION-PERSISTENCE

- Desired-State mapping: `PG-GROWTH-CHOICE`, `PG-RECOVERY`, `PG-WORLD-JOURNEY`; Architecture `Progression Domain / Storage Port`, `Persistence, Failure and Recovery`.
- Gap evidence: equipment와 command level만 localStorage에 남고 first journey·Glasswind Boss, reward, shortcut과 story/world progress는 새 game/reload에서 초기화된다.
- Scope: versioned progression snapshot에 두 journey의 durable world result를 포함하고 load/save/reset이 Boss·reward·shortcut state를 idempotent하게 복구하도록 연결한다.
- Non-scope: 새 reward 종류·소비처, combat balance, map geometry, cloud sync와 cross-device account.
- Verification: old/current/corrupt schema load, round-trip, reward/shortcut idempotency, new game/reload world-context reconstruction, explicit failure result, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
