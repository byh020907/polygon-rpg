# Polygon RPG Fresh-Session Loop Prompt

## ① 합격 기준

현재 Git·INBOX·STATUS와 approved DESIGN의 차이를 줄이는 lifecycle transition 하나를 검증 가능한 commit으로 남기고, 실행 결과를 직접 확인한 뒤 다음 fresh session이 이어갈 STATUS를 갱신한다.

## ② 먼저 읽을 문서

1. `docs/DESIGN.md` — 전체. 제품 방향, non-scope와 quality contract를 읽는다.
2. `docs/STATUS.md` — 전체. 현재 phase, last evidence, blocker와 다음 한 가지를 읽는다.
3. `docs/feedback/INBOX.md` — 전체 metadata와 모든 nonterminal entry. 선택한 entry의 `원문 — 불변`은 fence 안의 끝까지 그대로 읽는다.

그 뒤 `AGENTS.md`, `.agents/skills/dev-team-loop/SKILL.md`의 Coordinator mode와 현재 변경에 필요한 canonical system 문서·코드·caller만 읽는다. 이전 run 대화나 summary를 상태로 사용하지 않는다.

## ③ 규칙과 근거

- 한 run은 transition 하나만 수행한다. 중간 실패가 어느 lifecycle 단계인지 Git evidence로 복구할 수 있어야 한다.
- 원문 block을 재작성하지 않는다. 팀장 intent와 agent가 파생한 실행 판단을 섞지 않기 위해서다.
- INBOX와 STATUS는 main에서만 수정한다. 메인 대화 append와 executor branch가 같은 Markdown을 동시에 고쳐 merge conflict를 만드는 일을 막기 위해서다.
- 실제 code/artifact는 deterministic executor branch/worktree가 소유한다. Fresh session이 사라져도 local/remote Git에서 재개하기 위해서다.
- 정상 edit·검사·commit·branch push·non-rewriting main merge/push에 승인을 묻지 않는다. Scheduled run의 unattended 권한을 유지하기 위해서다.
- Force push, shared-history rewrite, broad reset, guessed cleanup과 품질 threshold 하향을 하지 않는다. 복구 evidence와 사용자 변경을 보존하기 위해서다.

## ④ 한 바퀴 도는 순서

```text
읽기
→ INBOX decision order에서 transition 하나 선택
→ 하나만 만들거나 복구
→ 결정적 검사
→ runnable checkpoint commit·branch push
→ 화면이 있으면 실제 실행·직접 관찰
→ final 또는 correction evidence
→ main INBOX·STATUS 갱신 commit·push
→ lease 해제·회차 종료
```

Accept/provision, implementation checkpoint, fresh verification/finalize, integration을 같은 run에 연쇄하지 않는다.

## ⑤ 커밋 순서 규칙

- Intended path와 affected deterministic checks가 통과하면 화면을 보기 **전에** runnable checkpoint를 executor branch에 commit/push한다.
- 화면 관찰이나 run이 도중에 끊겨도 checkpoint가 current best를 보존해야 한다.
- Visual/independent verification 뒤에만 clean final을 만든다.
- Final integration은 main에서 `--no-ff --no-commit`으로 가져오고 INBOX `done`, STATUS와 필요한 canonical 문서를 같은 한국어 merge commit에 정합해 push한다.
- Executor branch는 INBOX와 STATUS를 수정하지 않는다.

## ⑥ 검사와 QA

- 화면이 있는 결과는 실제로 실행하고 screenshot 또는 browser-visible artifact를 직접 읽는다. 코드가 도는 것과 화면이 괜찮은 것은 다른 문제다.
- 수학·frame·판정의 결정적 검사와 Canvas/mobile 관찰을 분리한다.
- `npm run check`, affected checks, `git diff --check`, console, resize와 applicable Polygon/Retro state를 확인한다.
- 적용 quality axis에 0 또는 1이 남으면 final/integration하지 않는다.
- 같은 원인의 지적·고장이 두 번 확인되면 규칙 후보로 올리고, 기계가 잴 수 있으면 가장 작은 durable check로 만든다.
- 실행하지 않은 검사를 통과했다고 기록하지 않는다.
