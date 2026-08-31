# Polygon RPG Quality-Driven Development Loop

이 문서는 complete-work Codex session이 기능 실행에서 멈추지 않고 플레이 가능한 결과를 직접 관찰·평가·수리하는 품질 계약이다. 제품 방향은 [`../DESIGN.md`](../DESIGN.md), queue는 [`../feedback/INBOX.md`](../feedback/INBOX.md), lifecycle 경계는 [`process.md`](./process.md), 실제 실행 절차는 [`../../loop/PROMPT.md`](../../loop/PROMPT.md)가 소유한다. Engineering Method와 구현 단위 규칙은 [`../../AGENTS.md`](../../AGENTS.md)가 소유하며 이 문서에서 다시 정의하지 않는다.

## 개발 Persona와 독립 Verifier 경계

Executor는 **10년차 1인 인디 게임 개발자**다. 레전드 오브 곡괭이와 아이작 계열 액션 게임처럼 반복 플레이의 손맛, 즉시 읽히는 상태, 위험과 보상, replay 품질을 꼼꼼히 판단한다. 기능이 돌아가는 것과 플레이 화면이 합격인 것을 구분하며 작은 결함도 실제 경로에서 재현하고 수리한다.

하나의 nonterminal INBOX entry와 executor branch가 완전한 품질 단위다. 한 fresh parent session 안에서 역할을 다음처럼 분리한다.

- **Developer parent:** 현재 evidence 복구, entry 전체 구현, affected checks, runnable checkpoint와 candidate final을 소유한다.
- **Verifier subagent:** turn history를 상속하지 않는 fresh read-only context에서 exact candidate diff·checks·PNG·완료 조건을 독립 판정한다.
- **Developer parent:** `FAIL`을 수리해 새 candidate를 다시 검증받고, exact hash `PASS` 뒤에만 main integration·live INBOX cleanup·STATUS evidence를 소유한다.

Checkpoint와 lifecycle marker는 interruption recovery를 위한 Git memory다. 역할은 developer parent와 mandatory verifier subagent로 분리하지만 scheduled tick이나 별도 승인 대화로 넘기지 않는다. 둘은 같은 complete-work outer run 안에서 candidate → verdict → repair를 반복하므로 entry 하나가 완결되기 전 정상 종료하지 않는다.

## 품질 기억

Executor는 entry의 원문, 실행 계약과 STATUS에 다음을 유지한다.

- 처음부터 끝까지 플레이할 사용자 시나리오
- 적용 품질 축과 합격 수준
- 결정적 검사와 visible PNG artifact 경로
- 비범위
- 기준선, current best와 다음 병목
- 정확한 blocker 또는 completion evidence

새 Product Requirement가 아니라면 DESIGN, immutable raw request, current code, canonical 문서, Core Engineering Principles와 검색한 구체 Reference에서 판단한다. 대화 memory는 근거가 아니다.

## 공통 Rubric

| 점수 | 의미                                                                              |
| ---- | --------------------------------------------------------------------------------- |
| 0    | 결과가 없거나 핵심 경로가 깨져 평가할 수 없다.                                    |
| 1    | 동작은 보이지만 의도·가독성·완성도가 부족해 merge하지 않는다.                     |
| 2    | 반복 가능한 플레이 경로와 프로젝트 기준을 충족한다.                               |
| 3    | Reference 원칙을 현재 Domain에 맞게 발전시킨 높은 완성도다. 필수 통과점은 아니다. |

| 품질 축              | 2점의 최소 evidence                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------ |
| 기능 완결성          | Debug 조작 없이 시나리오를 처음부터 끝까지 반복할 수 있다.                                 |
| 조작 명료성          | 입력, 판정, 성공·실패와 risk/reward를 즉시 구분할 수 있다.                                 |
| 타격감·Effect        | 적중, guard, evade, punish 등 핵심 사건이 위치와 동작으로 명확하다.                        |
| Graphics·시각 일관성 | Silhouette, 대비, motion과 UI가 충돌하지 않고 Polygon/Retro가 같은 상태를 전한다.          |
| 설계·Method 정합     | 제품 의도와 적용한 Engineering 원칙이 설명뿐 아니라 실제 구조·플레이에 드러난다.           |
| 회귀 안전성          | Affected check, lint/format, `git diff --check`, console, fixed frame과 resize가 통과한다. |

적용 축에 0 또는 1이 없어야 하며 기능 완결성과 회귀 안전성은 2 이상이어야 한다.

## 한 session의 품질 loop

```text
baseline 실행·채점
→ entry 완료 조건 전체를 만족하는 구현
→ affected deterministic checks
→ runnable checkpoint commit·push
→ developer visible browser fixed-frame PNG 생성·자체 점검
→ candidate final commit·push
→ fresh read-only verifier subagent가 diff·검사·PNG·rubric 독립 판정
→ FAIL이면 developer가 가장 큰 결함을 수리하고 새 candidate로 재검증
→ exact candidate PASS
→ main integration·evidence 정리
```

한 번에 한 병목을 고친다는 것은 session을 끝내라는 뜻이 아니다. 같은 entry의 모든 합격 조건을 충족할 때까지 이 inner loop를 반복한다.

## Visible visual QA

화면이 적용되는 모든 entry는 [`loop/visual-qa.ps1`](../../loop/visual-qa.ps1)을 사용한다.

1. Entry에 맞는 stable `GAME_START`를 고른다. 예: `academy`, `training`, `field`, `dungeon`, `boss`, `glasswind-field`, `glasswind-dungeon`, `glasswind-boss`.
2. 비교 가능한 `GAME_FRAME`을 고정한다.
3. Script가 실제 visible Chrome 창을 띄우고 해당 frame까지 120Hz fixed-step을 진행해 viewport PNG와 JSON metadata를 저장한 뒤 창을 닫는지 확인한다.
4. PNG를 직접 읽어 framing, silhouette, state feedback, clipping, z-order, HUD, portal/environment 관계와 Polygon/Retro 상태 정합을 평가한다.
5. Metadata의 start, room, frame, viewport와 console error 0개를 확인한다.
6. 기준 미달이면 같은 artifact naming/rubric으로 수정 전후를 비교한다.

정적 화면만으로 조작감이나 시간축을 증명할 수 없으면 deterministic simulation과 실제 플레이 경로도 함께 실행한다. Console error 부재만으로 시각 합격을 주장하지 않는다.

## Checkpoint와 final

Checkpoint는 affected deterministic checks를 통과한 runnable current best다. Visual inspection 전에 branch에 push해 interruption 때 작업이 사라지지 않게 한다. QA 실패 후 correction도 새 checkpoint로 보존할 수 있다.

Final은 다음을 모두 만족할 때만 만든다.

- Entry 완료 조건 전체 구현
- 적용 rubric 2 이상
- PNG를 실제로 열어 직접 판독
- Affected deterministic check, `npm run check`, `git diff --check` 통과
- Latest main과 clean ancestry
- Placeholder, 설명 없는 TODO와 임시 검증 asset 없음

Candidate final은 fresh verifier가 exact hash에 `PASS`를 반환해야 통합 가능한 final이 된다. Candidate가 한 byte라도 바뀌거나 필수 검사·화면이 미확인이면 기존 verdict는 무효다. PASS 후 developer parent가 같은 outer run에서 main integration과 INBOX cleanup까지 계속한다.

## Feedback와 규칙 승격

- 같은 원인의 결함이나 지적이 두 번 확인되면 원인을 분류한다.
- 기계적으로 측정 가능할 때만 가장 작은 durable check로 승격한다.
- Product preference는 자동으로 architecture rule이 되지 않는다.
- 사람 판단이 필요한 경우 실행 위치, 볼 장면·조작, 질문 1~3개와 답에 따라 달라지는 결과를 정확히 기록한다.
- “어떤가요?”처럼 판단 항목 없는 대기는 blocker가 아니다.

## Reference 사용

Reference는 mechanics, silhouette, feedback timing, 공간 구조처럼 현재 entry의 질문에 필요한 부분만 조사한다. Asset·character·수치를 복제하지 않고 `직접 재사용`, `현재 Domain에 맞게 수정`, `원칙만 차용`, `적용하지 않음`을 기록한다. Product reference와 engineering method의 소유 경계를 섞지 않는다.

## 완료 evidence

STATUS와 integration history에는 baseline/current best, 구현 결과, 적용 rubric, deterministic checks, visible PNG와 metadata 경로, 직접 판독 결과, checkpoint/final/integration hash, 미확인 범위와 다음 queue 상태를 남긴다. 실행하지 않은 검사를 통과했다고 쓰지 않는다.
