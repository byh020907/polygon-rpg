# OpenCode Product Goal Loop Adapter

이 adapter는 Product Goal Loop의 Runtime Contract를 Windows, Git과 OpenCode에서 실행하는 선택적 구현입니다. Product Goal Loop의 canonical definition은 [`METHOD.md`](../../METHOD.md)이며, 이 디렉터리의 구현과 문서는 특정 환경을 위한 비규범적 adapter입니다.

## Operating Model

사람은 최초 설치와 장애 복구를 제외하면 script를 직접 다루지 않습니다. 설치 시 만들어지는 지속적인 `개발 loop 관리 대화`가 기본 인터페이스이며, 다음 요청을 자연어로 처리합니다.

- Product, UX, Quality와 Project Direction에 관한 Human Feedback 등록
- 현재 Execution Goal, blocker와 verification 상태 확인
- scheduler pause/resume과 즉시 실행
- active worker 열기, 중단과 보존된 candidate 복구

manager는 feedback을 임의의 구현 Task로 번역하지 않고 Human 원문 그대로 feedback-only 경로에 전달합니다. 상태 조회와 Runtime control 요청은 `INBOX.md`에 넣지 않습니다.

manager와 자동 worker는 localhost에만 열린 같은 OpenCode backend를 사용합니다. 각 실행은 이름 있는 Live TUI session이므로 사용자는 진행 중 worker를 열어 대화, tool call과 결과를 실시간으로 볼 수 있습니다. worker에 Human이 직접 참여한 session은 자동 정리 대상에서 제외됩니다.

## Execution and Integration

기본 scheduler는 한 tick에 Execution Goal 하나를 최신 `origin/main` 기반의 전용 Git worktree에서 수행합니다. atomic lease가 같은 제품의 development writer를 하나로 제한하고, crash 시 candidate와 evidence를 보존합니다.

완료 candidate는 최신 `origin/main`을 history rewrite 없이 다시 통합하고, 실행 중 추가된 feedback을 보존한 상태에서 fresh verification을 통과해야 합니다. clean worktree, 완료된 Active Execution Goal과 verification evidence가 확인된 뒤에만 일반 fast-forward push로 `origin/main`에 반영합니다. push race는 재통합과 재검증으로 처리하며 rebase와 force-push는 사용하지 않습니다.

자동화 경계는 검증된 `main` 반영까지입니다. tag 생성, release와 production 배포는 Human이 수행합니다.

## Full Access

manager, worker, verifier와 reconciliation을 포함한 모든 OpenCode agent는 effective wildcard permission이 `allow`이고 그 뒤에 `ask`나 `deny`가 없는 Full access 상태에서만 시작합니다. adapter는 agent configuration만 믿지 않고 각 session도 wildcard `allow`로 명시해 먼저 생성한 뒤 해당 session에 attach합니다. `--auto`만으로 Full access를 추측하지 않습니다. `ask`, `deny` 또는 확인 불가 상태에서는 제품 파일을 건드리지 않고 permission blocker를 보고합니다.

Full access는 implementation, verification, integration과 cleanup을 승인 대기 없이 끝낼 수 있는 기술 capability입니다. production 배포, 결제, 외부 전송, destructive action 또는 Method가 허용하지 않은 작업을 승인하는 뜻이 아닙니다.

## Self-Describing CLI

CLI의 command registry가 parsing, text help와 machine-readable help의 단일 source of truth입니다. 별도 CLI 규칙 문서나 agent skill을 먼저 읽지 않아도 executable help만으로 명령을 선택하고 안전하게 복구할 수 있어야 합니다.

```powershell
pgl-opencode --help
pgl-opencode <command> --help
pgl-opencode help --json
pgl-opencode <command> --help --json
```

root help는 quick start, 전체 command tree, Runtime 위치, 상태와 exit code를 설명합니다. 각 command help는 prerequisites, 읽거나 변경하는 대상, side effect, concurrency와 idempotency, dry-run, 출력 형태, 실패 뒤 실행할 recovery command를 함께 설명합니다. JSON 출력은 자동화가 안정적으로 소비할 수 있는 versioned envelope를 사용하고 stdout에는 결과만 기록합니다.

README의 command 예시는 발견을 위한 최소 진입점일 뿐입니다. 설치 옵션, command argument, flag, exit code와 복구 절차의 canonical source는 현재 설치된 executable의 `--help`와 JSON help입니다.

## Getting Started

source repository의 installer로 adapter를 제품 저장소의 `.ai/runtime/opencode-loop/`에 vendoring하고 setup을 한 번 수행합니다.

```powershell
pwsh -File .\methods\product-goal-loop\adapters\opencode\install.ps1 -ProjectPath C:\projects\my-product
```

이후 다음 순서로 executable help를 따라 운영합니다. 설치된 wrapper는 `.ai\runtime\opencode-loop\pgl-opencode.cmd`이며, PATH에 등록한 경우 같은 명령을 `pgl-opencode`로 줄여 사용할 수 있습니다.

1. `.\.ai\runtime\opencode-loop\pgl-opencode.cmd --help`에서 환경 요구사항과 quick start를 확인합니다.
2. `pgl-opencode doctor --help`로 Node, Git, OpenCode, `origin/main`과 Full access preflight를 확인합니다.
3. `pgl-opencode setup --help`에 표시된 dry-run과 setup 절차로 localhost backend, scheduler와 manager session을 구성합니다.
4. `pgl-opencode manager --help`에 따라 `개발 loop 관리 대화`를 엽니다.

정확한 flag나 복구 command를 이 문서에서 추측하지 마십시오. 실행 환경에 설치된 CLI의 해당 subcommand help를 조회하면 현재 동작과 side effect를 함께 확인할 수 있습니다.
