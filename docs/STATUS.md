# Polygon RPG Status

이 문서는 현재 어디까지 왔고 다음 한 가지가 무엇인지 보여 주는 main-owned working memory다. 매 coordinator transition이 끝날 때 [`feedback/INBOX.md`](./feedback/INBOX.md)와 Git evidence를 기준으로 갱신한다. 충돌 시 inbox entry와 commit graph가 우선하며 이 문서는 재구성 가능한 projection이다.

## Current State

- 상태: 유저 피격 effect 위치 수정 진행 중
- 현재 active inbox entry: `IN-20260831-002426` (`implementing`)
- 현재 executor branch/worktree: `codex/loop/in-20260831-002426` provision 대상
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

## Next

다음 fresh run은 `IN-20260831-002426` executor worktree에서 실제 플레이어 피격 effect 위치를 재현하고, real contact world 좌표와 effect anchor의 어긋남 하나를 수정해 runnable checkpoint를 branch에 commit/push한다.

## Update Contract

각 transition 뒤 다음만 짧게 갱신한다.

- 현재 active entry와 phase
- branch/checkpoint/final/integration evidence
- current best와 다음 한 가지 병목
- 실행한 검사와 실제 artifact 결과
- 구체적 human/external blocker
- 다음 fresh run이 수행할 transition 하나
