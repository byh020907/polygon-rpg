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
| PG-WORLD-JOURNEY         | gap       | Academy의 세라 교관·장비 공방 안내판 대화와 Glasswind Dungeon의 입구→고가 gallery→checkpoint→Boss 경계 이동은 실제 interaction·120Hz trace로 확인했다. 첫 원정의 이야기 사건이 Field·Dungeon·Boss·귀환 변화로 이어지는 연속 named interaction은 남아 있다.                                 |
| PG-WORLD-SPACE           | gap       | 첫 Dungeon과 Glasswind 관측소는 입구, 고저차 탐색/위험 구간, checkpoint alcove와 사람 크기 Boss 경계를 구분한다. Glasswind 7개 surface의 필수 경로·Portal reachability와 양 renderer를 확인했지만 Academy/Field 전체의 생활 공간·환경형 출입구 evidence는 아직 충분하지 않다.              |
| PG-GROWTH-CHOICE         | gap       | 장비·command와 두 원정의 Boss·reward·shortcut·checkpoint는 v2 snapshot과 authored checkpoint ID로 reload 뒤 유지된다. Field/Dungeon/Boss 보상이 다음 전투 선택으로 이어지는 소비·해금 연결은 없다.                                                                                         |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                        |
| PG-PLATFORM-ACCESS       | gap       | Keyboard/mobile 6개 intent와 대화 jump가 같은 command·dialogue·Player physics 결과를 만든다. speaker로 이름 붙은 말풍선과 accessible stamina meter·수치를 desktop/narrow에서 확인했다. Screen focus, Canvas 대체 status와 일부 touch target evidence는 여전히 부족하다.                    |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                    |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                      |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                            |
| Module Boundaries                    | gap       | Injected map의 authored surface 높이는 Map Domain이 해석하고 `GameScene`은 그 query만 사용한다. 그러나 `GameScene`이 combat·animation·progression 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter가 presentation geometry를 import한다.           |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                  |
| State Ownership and Data Flow        | gap       | Map runtime이 enabled solid surface의 world 높이와 Portal/trigger 위치를 함께 해석하고 Player는 같은 ground query에 접지한다. Combat/story owner 분리는 유지되지만 shared combat geometry의 neutral owner는 아직 없다.                                                |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline을 유지한다. Game domain이 같은 jump sequence를 dialogue → Portal → Player jump 순서로 한 번 판정하며 대화가 소비한 fixed-step에는 jump를 시작하지 않는다.  |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                        |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                |
| Testing and Independent Verification | satisfied | `npm run check`가 combat/story와 Glasswind map 120Hz trace를 실행한다. 새 map probe는 7 surface 연속성, 실제 Player 고저차 주행, stable checkpoint ID, 양 Portal과 transition을 고정하며 in-app Browser Polygon/Retro desktop/narrow와 독립 verifier가 최종 PASS했다. |

## Active Execution Goal

### EG-FIRST-JOURNEY-STORY-EVENT-CHAIN

- Desired-State mapping: `PG-WORLD-JOURNEY`; Architecture `Authored Content`, `State Ownership and Data Flow`, `Input and UI Contracts`.
- Gap evidence: 첫 원정 progression과 HUD objective는 Field·Dungeon·Boss·보상·귀환 단계를 계산하지만, Academy 밖 이야기 변화는 인물·대상과의 이름 있는 말풍선 interaction으로 이어지지 않아 고정 상태 설명과 전투/Portal만으로 진행된다.
- Scope: 기존 첫 원정 Room·Portal·progression ID와 결과를 보존하면서 Field 출발 단서, Dungeon 관문/checkpoint, Boss 결과와 마을 귀환 변화를 authored interaction entity와 story owner의 immutable dialogue transition으로 연결한다. 같은 jump sequence의 대화 우선순위와 현재 진행에 맞는 화자·대사를 유지한다.
- Non-scope: 새 map/전투 rule·Boss AI·장비/reward balance, Glasswind 추가 story, shared combat geometry 분해, Academy 공간 확장.
- Verification: 단계별 interaction availability와 named line progression, stale/locked interaction 차단, 같은 sequence 단일 소비와 jump 억제, Portal·progression 회귀를 고정하는 120Hz trace, desktop/narrow in-app Browser, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
