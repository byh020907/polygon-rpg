# Polygon RPG Status

이 문서는 현재 어디까지 왔고 다음 한 가지가 무엇인지 보여 주는 main-owned working memory다. 매 coordinator transition이 끝날 때 [`feedback/INBOX.md`](./feedback/INBOX.md)와 Git evidence를 기준으로 갱신한다. 충돌 시 inbox entry와 commit graph가 우선하며 이 문서는 재구성 가능한 projection이다.

## Current State

- 상태: Core Engineering Principles 전환 · 통합 준비
- 현재 active inbox entry: `IN-20260831-005246` · `ready-for-integration`
- 현재 executor branch/worktree: `codex/loop/in-20260831-005246` · final `a2a3e4576f25c0e5bb210cc4e9ad5a13e0804bb8`
- Automation: `Polygon RPG file-memory loop` ACTIVE
- Main: clean `main == origin/main`
- 실제 blocker: 없음

## Completed

- M0: Fresh standalone run, approval-free direct executor, renewable lease, checkpoint/fresh verification/automatic merge·push를 갖춘 Git loop.
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

## Next

다음 fresh run은 `IN-20260831-005246` clean final의 latest-main ancestry·owned diff와 검증 evidence를 재확인하고 main에 non-rewriting 통합한다. 같은 tick에서 queued `IN-20260831-025240`을 accept/provision하지 않는다.

## Update Contract

각 transition 뒤 다음만 짧게 갱신한다.

- 현재 active entry와 phase
- branch/checkpoint/final/integration evidence
- current best와 다음 한 가지 병목
- 실행한 검사와 실제 artifact 결과
- 구체적 human/external blocker
- 다음 fresh run이 수행할 transition 하나
