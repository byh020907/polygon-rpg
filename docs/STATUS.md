# Polygon RPG Status

이 문서는 현재 어디까지 왔고 다음 한 가지가 무엇인지 보여 주는 main-owned working memory다. 매 complete-work session이 끝날 때 [`feedback/INBOX.md`](./feedback/INBOX.md), Git과 run artifact를 기준으로 갱신한다. 충돌 시 inbox entry와 commit graph가 우선하며 이 문서는 재구성 가능한 projection이다.

## Current State

- 상태: Windows complete-work loop · 수동 2회 검증 완료 · 자동 시작 대기
- 현재 active inbox entry: `IN-20260831-030641` · `new`
- 현재 executor branch/worktree: 없음 · 다음 entry 미수락
- Windows Task Scheduler: `PolygonRpgFileMemoryLoop` 등록됨 · `Disabled` · 사용자가 시작하기 전
- 기존 Codex app automation: `Polygon RPG file-memory loop` · 삭제 완료
- Main: clean `main == origin/main`
- 실제 blocker: 없음

## Completed

- M0: Windows outer loop가 entry마다 fresh `codex exec --ephemeral`을 열고 같은 session에서 checkpoint·visible PNG QA·repair·final·automatic merge/push·cleanup을 완결하는 Git/file-memory loop.
- M1: Guard → roll 배후 → launcher → 공중 combo → landing 훈련 전투.
- M2: 학원촌 장비 선택 → 훈련장 Room Portal 왕복 → camera travel → 전투 반복.
- M3: 학원촌 준비 → Field/Dungeon/Boss → 보상 → shortcut 귀환.
- M4: 장비 trade-off, command 해금, skill level과 local save 성장 loop.
- M5: 유리바람 협곡 Field·새 생물·Dungeon·Boss·영구 shortcut 수직 원정.

완료 기능과 과거 운영 기록의 상세 diff는 main Git history에 남아 있다. 현재 tree에는 다음 실행에 필요한 설계·상태·입력과 canonical system 문서만 유지한다.

## Last Verified Evidence

- M5 gameplay integration: `931ffa883dd03762a3b000a0b331802fba262927`
- Approval-free direct loop transition: `96b42fb4a72d271d46f9b36dae8a453760deebde`
- Roadmap completion proof: `bf1d0db5f56202c16f661997dc77437cf8f7e312`
- File-memory loop replacement: 이 STATUS·DESIGN·INBOX·PROMPT와 legacy 제거를 도입한 main commit
- 마지막 completion snapshot에서 M0~M5 완료, nonterminal input 없음, no executor ref, clean main/origin, no lease/conflict와 quality evidence를 확인했다.
- Player hit effect writer checkpoint: `d35827623ef8c3b7a60dd7d57a86a3e3d274f6e5` · contact 좌표 결정적 검증, `npm run check`, `git diff --check`, 실제 훈련장 Retro Canvas와 console 확인 통과.
- Player hit effect fresh final: `70d320127d5d5b48a80bb499fedf55d52829d21a` · latest main merge, owned diff, deterministic anchor/guard/evade/enemy-hit 격리, 훈련장 HP `43→36`, 유리바람 Field HP `100→85`, enemy HP `75→49`, Polygon/Retro shared state, `900×600` resize와 console 검증 통과.
- Player hit effect integration: `9c31550eed5881781eb45fe8e329d916fa161b5d` · final의 clean source와 owned-path diff, `npm run check`, `git diff --check`, 기록된 실제 Canvas 품질 evidence를 재확인하고 main에 non-rewriting merge했다. 남아 있던 terminal `done` block은 exact cleanup으로 복구했다.
- 완료 entry 자동 정리 accept/provision: current process·quality·manage·schema와 lock/worktree helper를 대조하고, `done` block만 정리하되 nonterminal 원문과 Git 복구 evidence를 보존하는 실행 계약을 수락했다.
- 완료 entry 자동 정리 writer checkpoint: `83bd913672a4b7efe2a78cd9456d7bcd57212869` · fence-aware exact block parser, `done` guard, main expected-HEAD guard와 atomic replacement를 구현했다. Actual INBOX copy와 4-backtick/tilde fixture에서 다른 nonterminal 원문 byte 보존, 비-done 거부, `npm run check`, `git diff --check`를 확인했다.
- 완료 entry 자동 정리 fresh final: `c5daca93afba8b1efd9d7c6385da0b1a4c690486` · latest main ancestry와 owned diff, actual INBOX byte/copy, 4-backtick·tilde fence, duplicate/non-done 거부, live main expected-HEAD guard, atomic replacement와 임시 파일 정리, `npm run check`, `git diff --check`를 독립 확인했다. 적용 품질 축은 모두 2 이상이다.
- 완료 entry 자동 정리 integration: `0f08c86b4ce195cc414887ffb8ca9f88d54d5d3c` · final을 main에 non-rewriting merge해 terminal 원문·결과를 보존한 뒤, 같은 transition의 cleanup에서 live INBOX의 exact `IN-20260831-003439` block만 제거했다.
- Core Engineering Principles 전환 accept/provision: 현재 Reference-Guided 선택·mandatory local-first 규칙과 upstream 두 Method 원문을 대조하고, established Polygon RPG 계약과 historical evidence는 보존하면서 Core Engineering Principles를 유일한 Method로 정합하는 실행 계약을 수락했다.
- Core Engineering Principles 전환 writer checkpoint: `f51dad89c0fc5f666649d4964b747cf61dece328` · Core 일곱 원칙의 canonical owner·runtime 적용 경계와 목적 단위 Git 규칙을 정합하고 fixed local-first를 historical evidence로 전환했다. `npm run check`, `git diff --check`, old 용어·Method source·local link·32 KiB budget 검사를 통과했다.
- Core Engineering Principles 전환 fresh final: `a2a3e4576f25c0e5bb210cc4e9ad5a13e0804bb8` · latest main merge와 owned 문서 6개, upstream Method HTTP 200·일곱 heading one-to-one 대응, local link, old mandatory 용어 부재, `AGENTS.md` 32,710-byte budget, main memory 일치, `npm run check`, `git diff --check`를 독립 확인했다. 문서-only 변경이며 적용 품질 축은 모두 2 이상이다.
- Core Engineering Principles latest-main reconciliation: `90a24f1d41c566a899887d034c062b9d23600f4e` · current main `69d027a7f86d4fed58390202423b0cc15f282d1b`을 executor branch에 non-rewriting merge했다. 새 인터뷰 skill과 세 queued 원문을 보존했고 branch-only 변경은 기존 owned 문서 6개이며 `npm run check`, `git diff --check`를 통과했다.
- Core Engineering Principles latest-main clean final: `99ff67168bb9f955342d98778b2c04e492c9b215` · current main `a31eae200ae892e14d7fef31d93554e484207e23`과 새 queued 원문을 포함했다. Upstream 일곱 원칙 one-to-one 대응, owned 문서 6개, old mandatory Reference 용어 부재, local link 30개, `AGENTS.md` 32,708-byte budget, main memory 동일성, `npm run check`, `git diff --check`를 독립 확인했고 적용 축은 모두 2 이상이다.
- Core Engineering Principles complete-work final: `2083fb803df4bc478262c84e746efd7650a6918e` · latest main `f51b92c7095c111716378a4d86e97283e777cf46`의 한-session 완결 계약과 Core Principles 전환을 정합했다. Upstream Method HTTP 200·일곱 heading, owned 문서 6개, old mandatory Method 용어 부재, local link 32개, `AGENTS.md` 32,711-byte budget, main memory 동일성, `npm run check`, `git diff --check`를 확인했다. 문서-only라 visible PNG QA는 적용하지 않았고 적용 축은 모두 2 이상이다.
- Core Engineering Principles integration: `aafa4383d7edeaddd258f78ad73671f2f07ce1ed` · final을 main에 non-rewriting merge해 terminal 원문·결과를 보존한 뒤, 같은 transition의 cleanup에서 live INBOX의 exact `IN-20260831-005246` block만 제거했다.
- Complete-work loop preflight: `codex-cli 0.150.1`, absolute Codex/Node/Git/PowerShell/Chrome path, PowerShell parser, Task Scheduler disabled registration과 `MultipleInstances=IgnoreNew`, abnormal restart `999 × 1m`, unlimited execution time를 확인했다.
- Visible QA preflight: 실제 visible Chrome에서 `GAME_START=dungeon`, `GAME_FRAME=180`, `1440×810` sealed-forest-dungeon PNG와 metadata를 생성하고 이미지를 직접 판독했다. Console error는 0개이며 browser/server가 종료됐다. Artifact는 `artifacts/visual-qa/manual-dungeon-180/`에 있다.
- 한 loop 완전 작업 단위 accept: current complete-work 문서·prompt·runner를 대조해, selected entry 부재만 확인하는 성공 판정이 main push·executor 통합·lease 해제 누락을 잡지 못하는 마지막 실행상 병목임을 확인했다. 이 entry는 gameplay 변경 없이 durable completion postcondition을 강제한다.
- 한 loop 완전 작업 단위 writer checkpoint: `679e1b0aeb58b4667db534f61a884c42a80a04c9` · `loop/completion.mjs`의 pure decision과 실제 Git/INBOX/lease inspector를 추가하고 outer loop의 exit-0 조건에 연결했다. 12개 pass/fail fixture, 실제 incomplete snapshot, PowerShell parser, `npm run check`, `git diff --check`를 통과했다. 화면 없는 운영 변경이라 visible PNG QA는 적용하지 않는다.
- 한 loop 완전 작업 단위 clean final: `4b038df4b379c2ecdf3dce84b4d70d8492947638` · latest main checkpoint를 non-rewriting merge한 뒤 12개 completion state fixture, actual lifecycle failure boundary, PowerShell parser, branch-only owned path 5개, `npm run check`, `git diff --check`, clean local/remote branch를 재확인했다. 적용 품질 축은 모두 2 이상이며 화면 비적용이다.
- 한 loop 완전 작업 단위 integration: `5d051662a3b4d017a1ac5810dfa23797eefae6f7` · final을 main에 non-rewriting merge해 terminal 원문·결과를 보존한 뒤 live INBOX의 exact `IN-20260831-025240` done block만 제거했다. Outer supervisor는 이후 session마다 origin fetch, clean pushed main, pushed integrated executor final과 released lease를 모두 확인해야 성공한다.
- Windows loop manual run 1: `logs/2026-08-31/20260831-041017-IN-20260831-005246/summary.json` · exit 0, `completed: true`, `f51b92c → 2ed33c9`, Core Principles final/merge/cleanup과 lease 해제를 한 fresh session에서 완료했다.
- Windows loop manual run 2: `logs/2026-08-31/20260831-042700-IN-20260831-025240/summary.json` · exit 0, `completed: true`, `2ed33c9 → ee8897a`, durable completion postcondition의 final/merge/cleanup을 한 fresh session에서 완료했다. 최신 inspector는 partial merge 없는 clean pushed main, clean worktree, pushed/integrated executor ref, entry 부재와 lease 해제로 `complete: true`, failures 0개다.

## Next

`loop/control.ps1 start` 또는 `run-once`를 실행하면 다음 fresh session이 `IN-20260831-030641`의 환경형 맵 포탈 시각 개선을 exact 원문과 world/rendering 계약에서 파생해, 구현·visible PNG QA·repair·통합·cleanup까지 한 loop에서 완결한다. 검증 로그를 먼저 보여 주라는 요청에 따라 Task Scheduler는 아직 disabled다.

## Update Contract

각 complete-work session 뒤 다음만 짧게 갱신한다.

- 현재 active entry와 phase
- branch/checkpoint/final/integration evidence
- current best와 다음 한 가지 병목
- 실행한 검사와 실제 artifact 결과
- 구체적 human/external blocker
- 다음 fresh session이 완결할 entry 또는 ROADMAP vertical job 하나
