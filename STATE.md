# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | satisfied | Command owner가 Basic 12·Strong 24·guard 6·roll 18·block 34 비용, 0.45초 지연 뒤 초당 24 회복과 action별 exhausted 차단을 기록한다. Player/적 Strong은 느린 windup, 양방향 guard-break와 startup 피격 취소 transition을 가지며 120Hz trace, 실제 HUD·telegraph와 독립 verifier가 PASS했다.                                |
| PG-COMBAT-FEEDBACK       | satisfied | 7 feedback의 start/active/end를 Polygon/Retro와 desktop/narrow에서 재현했다. hit·block·punish·launch effect는 immutable event contact를 직접 중심으로 쓰며 effect centroid assertion, landing ground·boot-bottom assertion과 수리 후 fresh verifier PASS가 있다.                                                          |
| PG-WORLD-JOURNEY         | satisfied | Academy의 세라·공방에서 출발해 Field 출정 표식, Dungeon 관문·checkpoint 기록석, Boss 결과·보상 잔향과 귀환한 세라 반응까지 progression별 named dialogue가 이어진다. 120Hz stage matrix가 locked/stale target, jump 단일 소비, Portal·HUD 정합을 고정했고 Polygon/Retro desktop/narrow와 독립 verifier가 PASS했다.         |
| PG-WORLD-SPACE           | gap       | 첫 Dungeon과 Glasswind 관측소는 입구, 고저차 탐색/위험 구간, checkpoint alcove와 사람 크기 Boss 경계를 구분한다. Glasswind 7개 surface의 필수 경로·Portal reachability와 양 renderer를 확인했지만 Academy/Field 전체의 생활 공간·환경형 출입구 evidence는 아직 충분하지 않다.                                             |
| PG-GROWTH-CHOICE         | satisfied | 첫 원정의 120 Gold로 학원촌에서 중량형 장비 또는 Command Lv.1 중 하나를 선택하며 훈련실을 건너뛴 인장 0 경로도 성립한다. 장비는 실제 거리·frame·경직·guard를, command는 연계 branch를 바꾸며 immutable transaction·중복 방지·reload·write failure probe와 verifier가 PASS했다.                                            |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.                                                                                       |
| PG-PLATFORM-ACCESS       | gap       | Keyboard/mobile 6개 intent와 대화 jump가 같은 simulation 결과를 만든다. 성장 region은 native button·accessible name·명시적 focus와 click/touch 동일 public command를 사용하고 844×390의 100×38/116×56 target과 mobile controls 비겹침을 확인했다. Canvas 대체 status와 전체 screen 전환 focus evidence는 여전히 부족하다. |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                                                                                                   |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                                                                                             |
| ------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                                                                                                   |
| Module Boundaries                    | gap       | UI의 concrete equipment/progression import를 제거하고 immutable status DTO·public command 경계로 바꾸었다. Injected Map query도 유지하지만 `GameScene`이 combat·animation·progression 조립을 집중 소유하고 encounter가 presentation geometry를 import하는 Gap은 남아 있다.                   |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                                                                                                         |
| State Ownership and Data Flow        | gap       | Progression owner가 Gold 지갑, 소유·장착·해금·부족 사유를 immutable transaction으로 단독 판정하고 `GameScene`은 commit 후 journey/region owner를 같은 snapshot으로 복원해 stale Gold writer를 막는다. Story/combat owner 분리는 유지되지만 shared combat geometry neutral owner는 아직 없다. |
| Rendering and Input                  | satisfied | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline을 유지한다. Game domain이 같은 jump sequence를 dialogue → Portal → Player jump 순서로 한 번 판정하며 대화가 소비한 fixed-step에는 jump를 시작하지 않는다.                         |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                                                                                               |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                                                                                                       |
| Testing and Independent Verification | satisfied | `npm run check`가 combat·story·map과 growth probe를 모두 실행한다. Growth probe는 인장 0 첫 보상 선택, 거리·frame·guard/branch 변화, 부족·중복·mixed wallet·reload·write/corrupt failure를 고정한다. in-app Browser Polygon/Retro desktop/narrow, console 0건과 fresh verifier가 PASS했다.   |

## Active Execution Goal

### EG-ACADEMY-FIELD-SPATIAL-ROLES

- Desired-State mapping: `PG-WORLD-SPACE`; Architecture `World and Map Contracts`, `Rendering and Presentation Contracts`.
- Gap evidence: Glasswind Dungeon은 실제 고저차·위험·checkpoint·Boss 경계를 current map trace와 capture로 입증했지만, Academy Plaza와 첫 Field의 생활/탐험/전투 역할, 환경형 사람 크기 출입구와 이동 방향을 같은 기준으로 고정한 current evidence가 부족하다.
- Scope: Academy Plaza와 first Field의 gameplay surface·landmark·foreground/background·combat route를 감사하고, 모든 필수 Portal을 문·골목·뿐리 arch 같은 환경 일부와 Player 근처 크기로 읽히게 수리한다. 낮밤·story patch에서도 필수 경로와 camera travel 방향을 유지한다.
- Non-scope: 새 Region·Dungeon·story·combat·growth, Glasswind 재작업, shared combat geometry 분해.
- Verification: Academy/Field 필수 경로·Portal reachability·stable ID·patch collision map validation, 주간/야간·story 상태의 Polygon/Retro desktop/narrow in-app Browser 판독, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
