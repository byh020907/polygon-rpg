# WI-20260830-003138 — 훈련방 첫 전투 조우

## 의도

기존 combat demo의 많은 판정과 animation을 버리지 않고, 팀장이 승인한 입력 grammar와 roadmap의 첫 전투 문법을 하나의 읽을 수 있는 조우로 정렬했다. 첫 Light는 Guard로 이해하고, 다음 Heavy는 Roll로 통과하며, 배후 recovery의 Rising punish에서 공중 추격과 착지까지 이어지는 흐름을 M1의 feedback 단위로 삼았다.

## 플레이 결과

`npm run dev` 후 `http://127.0.0.1:5173/`에서 새 게임을 시작하고 광장 왼쪽 portal에서 `↑`를 누르면 전투 실험 던전에 들어간다.

1. 첫 Light에 `↓`를 유지하면 shield contact, block-stop과 spark가 발생하고 HP가 유지된다.
2. 다음 Heavy의 긴 telegraph에 맞춰 `←/→ + ↓`를 누르면 시작 방향이 고정된 Roll이 몸을 통과한다. 실제 weapon contact가 무적 구간과 겹치면 cyan evade afterimage가 나타난다. Heavy를 Guard하려 하면 damage를 받는다.
3. 적의 고정 attack facing 반대편에서 recovery 중 `A → S` Rising을 맞히면 gold back-punish burst가 나타나고 적이 뜬다.
4. 같은 combo cycle에서 `↑ + 방향 + A`, 이어서 `A` 또는 다른 air branch를 입력하면 공중 추격 후 landing event로 끝난다.

HUD의 입력 guide, sword motion/trail, contact·guard·evade·punish feedback을 함께 보면 입력이 발행되지 않은 경우, motion은 실행됐지만 contact가 실패한 경우와 판정 성공을 구분할 수 있다. Render Lab에서는 같은 RenderFrame의 Polygon과 Retro 결과를 나란히 확인할 수 있다.

## 영향

player motion과 training enemy attack의 startup/active/recovery를 60Hz integer `CombatFrame` data로 읽을 수 있게 하고 120Hz simulation이 두 tick마다 같은 authored frame을 결정적으로 샘플한다. `CombatEventBuffer`가 guard·evade·hit·launch·punish·landing event identity와 짧은 lifetime을 소유하며 `GameScene`만 발행·진행한다. Renderer는 판정과 lifetime을 진행하지 않고 동일 RenderFrame과 geometry를 소비한다.

첫 enemy pattern은 Guard 가능한 Light로 시작하고 Heavy는 Roll-required로 정렬했다. 배후 punish는 추가 판정을 만들지 않고 gold burst와 camera feedback만 강화해 기존 damage/juggle balance를 크게 넓히지 않았다.

## Reference 적용

- 현재 Polygon RPG: fixed-step, input sequence, Target Pose/IK, swept-contact geometry와 shared RenderFrame은 직접 재사용했다.
- Baeseongjin: frozen input과 causal event → local presentation ownership을 현재 규모에 맞게 수정했다. multiplayer·manager·mutable particle storage는 비차용했다.
- Ball Fight Simulator: sequence별 command cycle의 단일 정산, collision detection과 response 분리, Canvas 가시성 문제를 원칙으로만 사용했다. 공용 impulse solver와 게임 전용 effect entity는 가져오지 않았다.

## 검증과 feedback

DOM 없는 120Hz 진단에서 첫 Light guard, Heavy guard-break, Heavy roll-through evade·배후 통과, Rising launch, Air Slash/Return과 landing event, back-punish event·feedback item, 동시 A/S Strong 우선과 `[0, 0, 1, 1, 2]` CombatFrame sample을 확인했다. Portal 위치에서 `↑ + → + ↓ + A + S`를 같은 snapshot에 발행한 우선순위 진단도 transition만 생성하고 Roll·Guard·attack이 목적지에서 지연 실행되지 않음을 확인했다. `npm run check`, `git diff --check`, 실제 Canvas 진입, Render Lab Polygon/Retro 비교, desktop 및 `900×600` resize와 console error 부재도 통과했다.

현재 rubric은 기능 완결성 2, 조작 명료성 2, 타격감·Effect 2, Graphics·시각 일관성 2, Reference 정합 2, 회귀 안전성 2다. 팀장은 Light guard timing, Heavy telegraph와 Roll 통과 거리, cyan evade/gold punish의 즉시성, Rising 이후 air chase와 착지 감각을 실제로 판단해야 한다.

2026-08-30 팀장은 “피드백할 건 많은데 일단 넘기고 우선순위 높은 내용을 알려주겠다”고 feedback했다. 현재 M1 candidate는 추가 체감 수정 없이 승인됐으며 integration을 진행한다. 이후 전달될 높은 우선순위 feedback은 현재 결과를 막지 않고 별도 후속 loop의 입력으로 사용한다.

## 다음 loop

Coordinator가 승인된 candidate와 roadmap의 stale baseline·미확정 M1 입력 gate를 통합 commit에서 정합한다. 팀장이 이후 높은 우선순위 체감 feedback을 전달하면 새 work item 또는 명시적 reopen으로 가장 큰 병목 하나씩 개선한다.
