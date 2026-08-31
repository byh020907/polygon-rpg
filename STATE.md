# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`execute`

## Product Desired State Comparison

| Reference                | Status    | Current Evidence                                                                                                                                                                                                                              |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL        | gap       | 기존 cancel·landing recovery·배후 punish trace는 만족한다. 그러나 stamina는 HUD 초기값뿐이고 Basic/Strong·guard·roll 비용, block 대량 drain, exhausted action 차단과 느린 Strong의 guard-break·startup interrupt 규칙이 command owner에 없다. |
| PG-COMBAT-FEEDBACK       | satisfied | 7 feedback의 start/active/end를 Polygon/Retro와 desktop/narrow에서 112 PNG+JSON으로 재현했다. landing을 ground y=420에 고정하고 event↔contact·boot-bottom anchor assertion을 추가한 20개 focused evidence와 fresh verifier PASS가 있다.       |
| PG-WORLD-JOURNEY         | gap       | Story resolver는 고정 briefing text만 UI에 전달한다. 인물·대상 상호작용, 이름이 붙은 말풍선 sequence와 대화 중 jump 억제가 없고, 상호작용 가능한 마을 시설과 Glasswind Dungeon 구체화도 남아 있다.                                            |
| PG-WORLD-SPACE           | gap       | Academy mentor, environment portals와 첫 Dungeon의 entrance·combat gate·checkpoint alcove·Boss threshold는 구분된다. Academy는 한 광장이고 Glasswind Dungeon은 평면 통로다.                                                                   |
| PG-GROWTH-CHOICE         | gap       | 장비·command와 두 원정의 Boss·reward·shortcut·checkpoint는 v2 snapshot과 authored checkpoint ID로 reload 뒤 유지된다. Field/Dungeon/Boss 보상이 다음 전투 선택으로 이어지는 소비·해금 연결은 없다.                                            |
| PG-CHARACTER-READABILITY | satisfied | idle/move/guard/roll/ground-attack/air-attack/hit 7 pose를 Polygon/Retro desktop/narrow 28 PNG+JSON으로 판독했다. Player 머리·머리카락·손발·교복·장비·검·방패와 대표 적의 색면·방향이 겹침 없이 구분되며 fresh verifier가 PASS했다.           |
| PG-PLATFORM-ACCESS       | gap       | Keyboard/mobile intent와 story objective는 desktop/mobile에 함께 표시된다. Screen focus, Canvas 대체 status와 일부 touch target evidence는 여전히 부족하다.                                                                                   |
| PG-RECOVERY              | satisfied | v1→v2 migration, corrupt/unsupported/read/write failure, autosave 차단, explicit reset, idempotent reward와 authored checkpoint KO fallback을 결정적 probe와 실제 browser menu→reset→reload로 확인했다.                                       |

## Engineering Desired State Comparison

| Architecture Area                    | Status    | Current Evidence                                                                                                                                                                                                   |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Technology and Runtime               | satisfied | Static ESM, Canvas 2D, vendored Alpine, no-build production과 Node local tooling이 `package.json`, `index.html`, `src/main.js`에 존재한다.                                                                         |
| Module Boundaries                    | gap       | `GameScene`이 concrete maps, combat, animation, progression과 visual-QA scenario 조립을 집중 소유하고 UI가 equipment profile을 직접 읽으며 encounter gameplay가 presentation module을 import한다.                  |
| Scene Lifecycle                      | satisfied | `SceneNode`, `Scene`, scoped `Signal`과 `GameApp` root가 deterministic enter/ready/fixed/exit/dispose와 listener cleanup을 구현한다.                                                                               |
| State Ownership and Data Flow        | gap       | Map/encounter/render writer 경계는 대체로 분리됐지만 shared combat geometry의 neutral owner와 authored content injection이 미달한다. 새 stamina command owner와 story interaction owner도 아직 없다.               |
| Rendering and Input                  | gap       | Frozen common input, one immutable RenderFrame, read-only Polygon/Retro renderer와 fixed viewport pipeline은 만족한다. 같은 jump sequence의 dialogue advance 우선순위와 jump 억제 interaction context는 아직 없다. |
| Persistence and Recovery             | satisfied | Typed v2 snapshot이 equipment·unlock과 canonical journey result를 저장한다. Failure는 explicit result이며 손상 기록은 자동 덮어쓰지 않고 checkpoint·reward·shortcut은 idempotent하게 복원된다.                     |
| Development Runtime                  | satisfied | Product Goal Loop Method와 네 root Project Source가 canonical이며 Task Scheduler, Codex skill, lease와 worktree를 correctness owner로 사용하지 않는다.                                                             |
| Testing and Independent Verification | satisfied | Combat feedback·pose candidate는 112개 전체 matrix와 anchor 수리 20개 focused browser evidence, `npm run check`, `git diff --check`, 구현 맥락과 분리된 fresh verifier PASS를 갖는다.                              |

## Active Execution Goal

### EG-COMBAT-STAMINA-GUARD-BREAK

- Desired-State mapping: `PG-COMBAT-CONTROL`; Architecture `State Ownership and Data Flow`, `Combat, Time and Contact Contracts`, `Input and UI Contracts`.
- Gap evidence: UI는 고정 stamina 100을 표시하지만 domain status나 command controller에는 stamina budget·회복·action 비용이 없다. guard contact는 HP를 막을 뿐 큰 stamina drain을 적용하지 않고, Player/적 Strong은 느린 interruptible startup과 guard-break를 하나의 authoritative transition으로 기록하지 않는다.
- Scope: Player의 Basic/Strong·guard·roll 비용, block 추가 drain, deterministic 회복·exhausted 차단과 HUD status를 command owner에 구현한다. 대표 적도 Strong startup을 명확히 telegraph하고 guard를 깨며, startup 중 먼저 피격되면 Player/적 모두 해당 Strong을 취소한다.
- Non-scope: dialogue·story interaction, 새 command·enemy·map·장비·reward, 기존 damage와 combo frame의 무관한 재조정, 전체 combat geometry 분해.
- Verification: action별 소비·회복·exhausted 차단·block drain·Player/적 Strong guard-break와 startup interrupt의 120Hz 결정적 trace, keyboard/touch intent parity, 실제 training browser HUD·telegraph·console error, `npm run check`, `git diff --check`, 구현 맥락과 분리된 verifier 판정.

## Blockers

없음. 현재 Desired State와 evidence 안에서 자율 진행할 수 있다.
