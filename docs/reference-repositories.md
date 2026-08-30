# 로컬 레퍼런스 저장소

Polygon RPG의 기반 시스템을 구현할 때 아래 두 로컬 저장소를 1차 레퍼런스로 사용한다. 레퍼런스란 코드를 그대로 복사한다는 뜻이 아니라, 이미 검증된 구조와 실제 구현을 먼저 확인한 뒤 이 프로젝트에 맞는 최소 계약을 선택한다는 뜻이다.

## 우선 확인 저장소

| 저장소               | 로컬 경로                          | 우선 참고 영역                                                                                       |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Ball Fight Simulator | `C:/projects/ball-fight-simulator` | 공용 `game-kit` 경계, 충돌 검출·응답, 물리 재질, Canvas 효과 유틸, 시뮬레이션 검증 규칙              |
| Baeseongjin          | `C:/projects/baeseongjin`          | fixed-step 실행, 입력 snapshot, 렌더 snapshot, Canvas host, 파티클 preset, 성능 예산과 hot-path 규칙 |

## 영역별 레퍼런스

### 물리와 충돌

먼저 다음을 확인한다.

- `C:/projects/ball-fight-simulator/src/game-kit/physics/`
- `C:/projects/ball-fight-simulator/docs/reusable-game-resources.md`
- `C:/projects/baeseongjin/src/game/physics/`
- `C:/projects/baeseongjin/docs/performance-architecture.md`

가져올 핵심 원칙:

- 충돌 검출, 접촉 정보, 충돌 응답과 물리 재질을 분리한다.
- 위치와 속도의 최종 쓰기 권한은 물리 시스템 한 곳에 둔다.
- 게임 행동은 물리 상태를 직접 덮어쓰지 않고 force, impulse 또는 movement intent를 전달한다.
- 렌더 Mesh와 gameplay Collider는 별도 계약으로 유지한다.

주의할 점:

- 두 저장소의 기존 `PhysicsBody` API를 그대로 복사하지 않는다. force, acceleration, impulse와 delta velocity의 단위 의미를 Polygon RPG에서 먼저 명확히 정의한다.
- Ball Fight Simulator의 현재 가변 delta 게임 루프는 새 물리 기반의 기준으로 사용하지 않는다.
- Baeseongjin의 멀티플레이 권한, manager 계층과 대규모 Quadtree 구조는 실제 필요와 측정 근거가 생기기 전에는 가져오지 않는다.

### 게임 루프와 입력

먼저 다음을 확인한다.

- `C:/projects/baeseongjin/src/core/sim/FixedStepRunner.js`
- `C:/projects/baeseongjin/src/core/input/InputSampler.js`
- `C:/projects/baeseongjin/src/game/GameApp.js`

가져올 핵심 원칙:

- `requestAnimationFrame`과 고정 간격 simulation update를 분리한다.
- 입력은 frame마다 동결된 snapshot으로 만들고 simulation이 DOM event를 직접 읽지 않게 한다.
- 직전/현재 simulation snapshot을 이용해 렌더 보간한다.
- catch-up 상한과 dropped-step 진단을 둔다.

전투 command를 추가할 때는 Baeseongjin `InputSampler`의 held key와 sequence 분리, Ball Fight Simulator의 command cycle·sequence·종료 정산 구조를 참고한다. 입력 수집기는 command 결과를 계산하지 않고, command controller가 edge·buffer·motion lifecycle을 소유한다.

모바일 입력은 Baeseongjin `MobileGameplayInputAdapter`·`MobileControlLayout`의 adapter/layout 분리와 `pointerId → control` Map, Ball Fight Simulator의 pointer capture·cancel 수명주기를 참고한다. 모바일 버튼이 keyboard event를 합성하지 않고 공통 action intent를 직접 생성하게 한다.

### Canvas 렌더링

먼저 다음을 확인한다.

- `C:/projects/baeseongjin/src/render/CanvasRenderer.js`
- `C:/projects/baeseongjin/src/render/SceneRenderer.js`
- `C:/projects/ball-fight-simulator/src/game-kit/canvas/`

가져올 핵심 원칙:

- Canvas host가 context, DPR, resize와 좌표 변환을 한 번만 소유한다.
- Scene Renderer는 simulation을 갱신하지 않고 동일한 읽기 전용 render snapshot을 소비한다.
- Polygon Renderer와 Retro Renderer가 서로 animation이나 effect를 따로 계산하지 않는다.

### Canvas 파티클과 절차적 효과

먼저 다음을 확인한다.

- `C:/projects/baeseongjin/docs/particle-system.md`
- `C:/projects/baeseongjin/src/game/combat/ParticlePresentation.js`
- `C:/projects/baeseongjin/src/game/combat/CombatEffectBuffer.js`
- `C:/projects/ball-fight-simulator/src/effects/`

가져올 핵심 원칙:

- gameplay event를 로컬 presentation 요청으로 변환한다.
- preset을 `emission + motion + shape + material` 데이터 조합으로 정의한다.
- renderer는 effect ID나 게임 규칙을 해석하지 않고 particle DTO만 그린다.
- active cap, emitter budget, priority headroom과 viewport culling을 둔다.
- 검 궤적처럼 연속 기하가 필요한 효과는 일반 파티클이 아니라 별도의 procedural mesh/ribbon으로 유지한다.

주의할 점:

- 두 저장소의 현재 파티클 구현은 완전한 object pool이 아니다. Polygon RPG에서는 고정 용량 재사용 객체 배열과 free-list 기반 `ParticlePool`을 별도로 설계한다.
- 파티클을 gameplay entity, 충돌 대상 또는 네트워크 상태로 만들지 않는다.
- `draw()`에서 난수를 생성하거나 particle 상태를 갱신하지 않는다.

### 메인 진입 UI와 화면 수명주기

먼저 다음을 확인한다.

- `C:/projects/ball-fight-simulator/index.html`의 Alpine.js bootstrap과 `x-data` 구조
- `C:/projects/ball-fight-simulator/docs/development-rules.md`의 UI 아키텍처
- `C:/projects/baeseongjin/src/game/ui/GameModeMenu.js`
- `C:/projects/baeseongjin/src/main.js`의 `launch()`와 `returnToMenu()`
- `C:/projects/baeseongjin/src/game/GameApp.js`의 `start()`와 `stop()`

가져올 핵심 원칙:

- DOM 화면 상태와 사용자 이벤트는 Alpine.js의 선언형 binding이 소유한다.
- UI는 게임 객체 내부 상태를 직접 수정하지 않고 공개 intent를 UI bridge로 전달한다.
- 메뉴 선택, 게임 시작, 메뉴 복귀와 Canvas resize를 명시적인 App lifecycle 경계로 구분한다.
- Canvas 렌더링은 Alpine.js와 별도로 진행하고 UI는 읽기 전용 runtime stats만 받는다.

현재 규모에서는 Ball Fight Simulator의 전역 `uiManager`와 태그 컴포넌트 loader, Baeseongjin의 Promise 기반 다중 모드 선택기는 가져오지 않는다. 단일 Alpine `gameShell`이 메뉴·게임·Render Lab 세 화면만 소유한다.

### AI 개발 프로세스와 병렬 worktree

Autonomous coordinator의 desired-state reconcile, durable recovery, retry escalation과 completion proof는 [`development/loop-engineering-references.md`](./development/loop-engineering-references.md)가 소유한다.

먼저 다음을 확인한다.

- `C:/projects/baeseongjin/docs/development-rules.md`의 효율 우선 실행, 병렬 ownership과 Git 운영
- `C:/projects/baeseongjin/.codex/skills/github-task-flow/SKILL.md`의 최신 main 검증, worker branch와 통합 경계
- [OpenAI Codex Worktrees](https://learn.chatgpt.com/codex/environments/git-worktrees)
- [OpenAI Codex Subagents](https://learn.chatgpt.com/codex/agent-configuration/subagents)
- [OpenAI Codex Skills](https://learn.chatgpt.com/codex/build-skills)
- [OpenAI Codex AGENTS.md](https://learn.chatgpt.com/codex/agent-configuration/agents-md)
- [Anthropic Building effective agents](https://www.anthropic.com/research/building-effective-agents)

가져올 핵심 원칙:

- Main은 등록 요청 원문을 INBOX에 그대로 append하고, 탐색·구현은 entry 전용 persistent executor worktree로 격리한다.
- 각 INBOX entry는 deterministic branch/worktree를 재사용하며 별도 managed chat을 writer로 만들지 않는다.
- Read-heavy 조사·검증은 병렬화하고 write-heavy 작업은 disjoint hunk·public contract ownership이 증명될 때만 병렬화한다.
- Skill은 `.agents/skills/`에 두고 하나의 좁은 workflow를 progressive disclosure로 routing한다.
- `AGENTS.md`는 기본 32 KiB instruction budget을 고려해 문서 인덱스와 핵심 규칙만 유지한다.
- Coordinator는 대화 기억이 아니라 DESIGN·STATUS·INBOX, executor branch와 실제 worktree 상태로 복구 가능해야 한다.
- Agent loop는 환경 증거, human feedback checkpoint와 명시적인 정지 조건을 가진다.

적용하지 않음:

- Baeseongjin의 Issue·PR·단일 Lore commit 전체 절차를 현재 Polygon RPG의 자동 기본값으로 복제하지 않는다.
- 새 scheduler, queue database 또는 polling daemon을 만들지 않는다. Git과 Orca state로 실패가 확인될 때만 추가 자동화를 검토한다.
- Register·manage·cancel을 별도 skill로 노출하지 않는다. 사용자는 `dev-team-loop` 하나만 사용하고 내부 mode가 현재 맥락을 해석한다.

## 적용 절차

공용 기반을 구현할 때 다음 순서를 따른다.

1. 구현할 책임과 공개 계약을 한 문장으로 정한다.
2. 두 레퍼런스에서 같은 책임을 가진 문서, 구현, caller와 검증 코드를 찾는다.
3. `직접 재사용`, `Polygon RPG에 맞게 수정`, `원칙만 차용`, `적용하지 않음` 중 하나로 판단한다.
4. 게임 전용 역참조와 불필요한 의존성이 없는지 확인한다.
5. DOM 없는 수치 검증과 실제 Canvas 실행 검증을 분리한다.
6. 작업 결과에 어떤 레퍼런스를 어떻게 반영했는지 간단히 기록한다.

## 이 프로젝트에서 우선하는 계약

- Vanilla JavaScript ES Module
- 외부 게임·렌더 엔진 없음
- DOM UI는 사용자가 승인한 Alpine.js `3.14.9` ES Module을 저장소에 vendoring해 사용
- 빌드 없는 정적 `index.html` 배포
- GitHub Pages `main /`
- float simulation과 최종 렌더 단계의 pixel 처리 분리
- Physics, Animation, Effects와 Rendering의 단방향 의존

레퍼런스 저장소의 구현이 이 계약과 충돌하면 현재 프로젝트 계약을 우선한다.
