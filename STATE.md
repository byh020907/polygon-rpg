# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                           |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 Basic 12·Strong 24·guard 6·roll 18·block 34 비용, 0.45초 지연 뒤 초당 24 회복과 action별 exhausted 차단을 기록한다. Player/적 Strong은 느린 windup, 양방향 guard-break와 startup 피격 취소 transition을 가지며 120Hz trace, 실제 HUD·telegraph와 독립 verifier가 PASS했다. |
| PG-COMBAT-FEEDBACK       | satisfied | 7 feedback의 start/active/end를 Polygon/Retro와 desktop/narrow에서 재현했다. hit·block·punish·launch effect는 immutable event contact를 직접 중심으로 쓰며 effect centroid assertion, landing ground·boot-bottom assertion과 수리 후 fresh verifier PASS가 있다.                           |
| PG-WORLD-JOURNEY         | gap       | Story resolver는 고정 briefing text만 UI에 전달한다. 인물·대상 상호작용, 이름이 붙은 말풍선 sequence와 대화 중 jump 억제가 없고, 상호작용 가능한 마을 시설과 Glasswind Dungeon 구체화도 남아 있다.                                                                                         |
| PG-WORLD-SPACE           | gap       | Academy mentor, environment portals와 첫 Dungeon의 entrance·combat gate·checkpoint alcove·Boss threshold는 구분된다. Academy는 한 광장이고 Glasswind Dungeon은 평면 통로다.                                                                                                                |
| PG-GROWTH-CHOICE         | gap       | 장비·command와 두 원정의 Boss·reward·shortcut·checkpoint는 v2 snapshot과 authored checkpoint ID로 reload 뒤 유지된다. Field/Dungeon/Boss 보상이 다음 전투 선택으로 이어지는 소비·해금 연결은 없다.                                                                                         |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                        |
| PG-PLATFORM-ACCESS       | gap       | Keyboard/mobile 6개 intent가 같은 command snapshot과 stamina 결과를 만들고 accessible stamina meter·수치가 desktop/narrow에 표시된다. Screen focus, Canvas 대체 status와 일부 touch target evidence는 여전히 부족하다.                                                                     |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                    |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                                       |
| Module Boundaries                    | gap       | Enemy attack timing·guard-break rule은 neutral domain profile로 분리돼 Encounter와 Presentation이 각각 읽는다. 그러나 `GameScene`이 concrete maps, combat, animation, progression과 visual-QA scenario 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter가 presentation geometry를 import한다. |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                                             |
| State Ownership and Data Flow        | gap       | Combat command owner가 stamina·비용·회복·거부와 Strong interrupt transition을 단독 기록하고 guard contact result가 root를 통해 한 번 drain된다. shared combat geometry의 neutral owner, authored content injection과 story interaction owner는 아직 없다.                                                        |
| Rendering and Input                  | gap       | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline은 만족한다. 같은 jump sequence의 dialogue advance 우선순위와 jump 억제 interaction context는 아직 없다.                                                                                               |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                                                   |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                                           |
| Testing and Independent Verification | satisfied | `npm run check`가 durable 120Hz combat trace를 포함하고 비용·회복·거부·단일 contact drain·입력 parity·양방향 guard-break/interrupt를 고정한다. Polygon/Retro desktop/narrow in-app Browser와 구현 맥락이 분리된 verifier가 두 차례 결함 수리 뒤 최종 PASS했다.                                                   |

## Active Execution Goal

### EG-STORY-INTERACTION-DIALOGUE

- Desired-State mapping: `PG-WORLD-JOURNEY`, `PG-PLATFORM-ACCESS`; Architecture `State Ownership and Data Flow`, `Input and UI Contracts`, `Module Boundaries`.
- Gap evidence: Story resolver는 고정 briefing text만 UI에 전달하고 Academy의 인물·대상은 상호작용할 수 없다. speaker 이름과 line sequence를 소유하는 domain owner가 없으며 jump sequence가 대화 시작·진행보다 Player jump를 먼저 일으킨다.
- Scope: authored Academy 인물·대상 interaction을 story owner에 주입하고 speaker·line·advance 가능 여부를 immutable dialogue DTO로 제공한다. 가까운 대상에서 jump로 이름 있는 말풍선을 시작·진행하며 그 fixed-step의 Player jump를 억제하고, keyboard/touch가 같은 sequence 결과를 만든다.
- Non-scope: Dungeon 공간 확장, 새 전투·장비·reward, 전체 story campaign, 기존 briefing·progression의 무관한 재작성, shared combat geometry 분해.
- Verification: interaction range·line progression·종료·같은 jump sequence 소비와 Player y/velocity 불변의 결정적 trace, keyboard/touch parity, 실제 Academy desktop/narrow dialogue bubble·objective·console error, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
