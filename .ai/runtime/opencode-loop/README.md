# Small OpenCode Product Goal Loop

사람은 일반 OpenCode의 `product-goal-loop-manager` 관리 대화에서 요청합니다. 작은 실행기는 중복 실행 방지, Full access worker 한 번 실행, 결과 기록과 알림을 담당합니다. AI가 선택한 Method를 읽고 Goal 선택·worktree·구현·독립 검증·최신 main 병합·commit·push를 수행합니다.

Live TUI 연결, 상시 backend, 별도 reconciliation agent, custom tool, Git 통합 상태 머신과 자동 세션 삭제는 없습니다. 실행 중에만 private localhost OpenCode server를 사용해 session의 Full access를 명시하고 확인합니다. 실행 후 server를 종료하며 대화는 OpenCode의 저장된 session과 로컬 결과에서 확인합니다. 실행기는 worker의 검증 보고를 기록하며 그 자체로 제품 완료를 독립 증명하지 않습니다.

## 시작

이 프로젝트의 기존 OpenCode 모델 지정은 `.opencode/agents/product-goal-loop-worker.md`와 `product-goal-loop-verifier.md`에 보존한다. 설치 시 다른 role 파일이 감지되면 덮어쓰지 말고 프로젝트 설정을 다시 확인한다. `PGL_MODEL`은 worker 실행의 명시적 override다. Codex 트리거가 활성인 동안 OpenCode 예약과 실행기는 paused로 유지한다. 구형 candidate 복구 참조는 프로젝트 `STATE.md`에 있다.

Node 20+, PowerShell 7+, OpenCode, Git과 프로젝트에서 선택한 Product Goal Loop sources가 필요합니다.

```powershell
pwsh -File .\methods\product-goal-loop\adapters\opencode\install.ps1 -ProjectPath C:\projects\my-product -DryRun
pwsh -File .\methods\product-goal-loop\adapters\opencode\install.ps1 -ProjectPath C:\projects\my-product -Schedule
```

`-Schedule`을 생략하면 파일만 설치합니다. 최초 설치 후 일반 OpenCode에서 manager agent를 선택한 관리 대화를 유지합니다. 세부 동작·명령·복구 방법은 실행 도구의 help가 정본입니다.

```powershell
node .ai/runtime/opencode-loop/loop.mjs --help
node .ai/runtime/common/notify.mjs --help
```

## 공통 ntfy 알림

Codex와 OpenCode 모두 [공통 notify.mjs](../common/notify.mjs)를 사용합니다. `PGL_NTFY_URL`에 프로젝트가 구독하는 topic 전체 URL을 설정하면 활성화됩니다. 필요하면 `PGL_NTFY_TOKEN`을 환경 변수로 제공합니다. 스케줄러 계정에도 같은 환경 설정이 필요합니다. 기존 프로젝트 topic이나 token은 카탈로그에 포함하지 않습니다.

- 한 Goal 완료: 변경 요약, 검증 요약, published commit.
- 전체 루프 완료: 최종 제품 상태 요약.
- Blocker/실패: 원인과 필요한 다음 행동.
- Busy/no-op은 알리지 않고 같은 event/key의 반복을 억제합니다.
- 알림 전달 실패는 경고로 남기며 이미 완료한 개발을 다시 실행시키지 않습니다.

OpenCode는 worker 결과를 자동 전송합니다. Codex에서는 완료/차단을 판단한 AI가 같은 notifier를 호출하면 됩니다. 원문 transcript·코드·비밀정보는 보내지 않고 사용자가 허용한 요약만 전송합니다. ntfy를 쓰지 않아도 결과와 blocker는 로컬에 남습니다. 자세한 입력 형식과 재시도는 notifier help에서 확인합니다.

## 기존 0.1 설치에서 이동

현재 실행의 종료를 확인하고 기존 loop를 pause합니다. 기존 Backend/Tick Scheduled Tasks와 외부 watchdog을 비활성화한 뒤, 기존 `.ai/runtime/opencode-loop`를 백업합니다. 이전 `.opencode/agents/product-goal-loop-*`와 `.opencode/tools/product_goal_loop.js`도 백업해 중복 role/tool 로딩을 막습니다. 기존 candidate worktree, `.git/product-goal-loop` evidence와 OpenCode 대화는 보존하고, 미완료 작업의 경로와 다음 행동을 STATE.md에 연결합니다.

그 후 새 installer를 실행합니다. 기존 watchdog의 topic은 같은 계정의 환경 변수로 옮기고, 중복 ntfy 알림을 보내는 watchdog은 재시작하지 않습니다. 이 카탈로그 변경은 이미 설치된 프로젝트나 예약 작업을 자동 변경하지 않습니다. 새 guard는 이전 adapter/Codex guard와 상호 운용하지 않으므로 동일 제품에 두 개발 trigger를 동시에 켜지 않습니다.

Method의 정본은 [METHOD.md](../../METHOD.md)입니다. 최고 권한은 기술 capability이며, tag·release·production 배포는 Human이 관리합니다.
