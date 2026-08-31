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
| PG-WORLD-JOURNEY         | gap       | Academy의 세라 교관·장비 공방 안내판은 가까이서 jump로 이름 있는 2-line 말풍선을 시작·진행·종료하고 같은 fixed-step의 Player jump를 억제한다. 첫 원정의 연속 story event와 Glasswind Dungeon 공간 구체화는 남아 있다.                                                                      |
| PG-WORLD-SPACE           | gap       | Academy mentor, environment portals와 첫 Dungeon의 entrance·combat gate·checkpoint alcove·Boss threshold는 구분된다. Academy는 한 광장이고 Glasswind Dungeon은 평면 통로다.                                                                                                                |
| PG-GROWTH-CHOICE         | gap       | 장비·command와 두 원정의 Boss·reward·shortcut·checkpoint는 v2 snapshot과 authored checkpoint ID로 reload 뒤 유지된다. Field/Dungeon/Boss 보상이 다음 전투 선택으로 이어지는 소비·해금 연결은 없다.                                                                                         |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                        |
| PG-PLATFORM-ACCESS       | gap       | Keyboard/mobile 6개 intent와 대화 jump가 같은 command·dialogue·Player physics 결과를 만든다. speaker로 이름 붙은 말풍선과 accessible stamina meter·수치를 desktop/narrow에서 확인했다. Screen focus, Canvas 대체 status와 일부 touch target evidence는 여전히 부족하다.                    |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                    |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                    |
| Module Boundaries                    | gap       | Academy map은 composition root가 `GameScene`에 주입하고 neutral story owner가 authored Room entity를 읽는다. 그러나 `GameScene`이 combat·animation·progression 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter가 presentation geometry를 import한다.      |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                          |
| State Ownership and Data Flow        | gap       | Combat command owner와 story interaction owner가 각각 command/stamina와 speaker·line transition을 단독 기록하고, authored Room entity는 injected map에서 온다. shared combat geometry의 neutral owner는 아직 없다.                                                            |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline을 유지한다. Game domain이 같은 jump sequence를 dialogue → Portal → Player jump 순서로 한 번 판정하며 대화가 소비한 fixed-step에는 jump를 시작하지 않는다.          |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                        |
| Testing and Independent Verification | satisfied | `npm run check`가 durable combat/story 120Hz trace로 interaction range, line 진행·종료, sequence 단일 소비, jump 억제, keyboard/touch parity와 Portal 회귀를 고정한다. in-app Browser desktop/narrow와 구현 맥락이 분리된 verifier가 console error 0 및 최종 PASS를 확인했다. |

## Active Execution Goal

### EG-GLASSWIND-DUNGEON-SPATIAL-ROLES

- Desired-State mapping: `PG-WORLD-JOURNEY`, `PG-WORLD-SPACE`; Architecture `Authored Content`, `World and Map Contracts`, `Rendering and Presentation Contracts`.
- Gap evidence: Glasswind Dungeon은 바닥 한 줄과 배경 장식 안에 checkpoint와 Boss Portal이 놓인 평면 통로여서 entrance, 탐색·전투 구간, checkpoint alcove와 Boss threshold의 공간 역할·위험이 구분되지 않는다.
- Scope: 기존 stable Room·Portal·checkpoint ID와 progression transition을 보존하면서 Glasswind Dungeon을 입구, 높이·경로가 다른 탐색/전투 구간, checkpoint alcove와 사람 크기의 Boss 경계로 authored surface·landmark·environment portal을 구성한다.
- Non-scope: Academy 추가 확장, 새 전투 rule·장비·reward, Boss AI 변경, shared combat geometry 분해, 첫 원정 전체 map 재작성.
- Verification: map definition/patch validation, 필수 이동 경로와 checkpoint·Boss Portal reachability의 결정적 probe, Portal transition과 progression ID 회귀, Polygon/Retro desktop/narrow in-app Browser 판독, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
