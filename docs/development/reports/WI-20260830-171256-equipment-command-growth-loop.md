# WI-20260830-171256 장비·command 성장 loop 업무보고

## 의도

M1~M3의 전투와 원정 loop 위에 별도 기술 버튼을 늘리지 않고, 같은 A/S·X/Y command가 훈련과 장비 선택에 따라 다른 route를 갖도록 성장 loop를 연결했다. 학원촌 왼쪽 훈련장에서 재생성되는 골렘을 격파해 단일 재화인 `훈련 인장`을 얻고, 귀환 후 장비 구매·교체와 3단계 command 수련에 사용한다. 원정 HP·Gold·checkpoint·Boss 상태는 저장하지 않고 성장 snapshot만 local save에 둔다.

## Changed code tree

```text
src/game/progression/
├─ ProgressionProfiles.js   훈련 보상, Lv.0~3 route·피해·타수·공중 횟수와 승급 비용
├─ ProgressionState.js      인장·장비 소유/장착·command level의 immutable transaction
└─ ProgressionStorage.js    schema v1 정규화, catalog 검증과 최소 local save adapter

src/game/equipment/EquipmentProfiles.js
└─ 속공형/중량형의 공격·방어·frame·거리·경직·launch·guard·검 길이 profile

src/combat/CombatCommandController.js
└─ level별 지상/공중 branch, 공중 action cap, Lv.3 finisher→starter loop cancel

src/game/GameScene.js / src/app/GameApp.js
└─ 훈련 완료 보상, 구매·수련 command, attack profile 합성, 성장 Signal과 browser save

index.html / src/style.css / src/ui/gameShell.js
└─ 학원촌 성장 panel, 동적 command guide, 인장·해금·구매·장착·자동 저장 상태
```

## 플레이 결과

1. 새 성장 상태는 속공형 장비와 command Lv.0으로 시작한다. Lv.0에서는 A/S starter와 공중 starter 1회만 실행되고, 잠긴 연계 입력은 다음 starter로 잘못 fallback하지 않는다.
2. 학원촌 왼쪽 청록 Portal로 훈련장에 들어가 기존 A/S 또는 X/Y로 훈련 골렘을 쓰러뜨리면 인장 3개를 받는다. 골렘은 다시 생성되므로 debug 조작 없이 반복 수련할 수 있다.
3. 학원촌 성장 panel에서 인장 3개로 중량형을 구매하면 즉시 장착된다. 같은 skill level의 Slash는 속공형 27 frame·사거리 25.76·경직 배율 0.85, 중량형 36 frame·사거리 34.16·경직 배율 1.30이라 속도와 거리·stun의 교환이 contact와 recovery에 함께 적용된다.
4. Command Lv.1은 지상 AA/AS/SA route와 Spin 1타, Lv.2는 공중 AA/AS/SA·공중 2회·Spin 2타, Lv.3은 공중 3회·Spin 3타·finisher에서 starter로 되잇는 loop cancel을 연다. 피해 배율도 1.08/1.16/1.24로 오른다.
5. 장비 공격 profile은 피해·사거리·경직·launch를, 방어/guard profile은 피격 피해·block impact·blockstun을 바꾼다. 속공형/중량형의 weapon length도 같은 contact geometry에 반영된다.
6. 세 번의 훈련 clear로 총 9개 인장을 얻으면 중량형 구매 3개와 command Lv.1~3 수련 1+2+3개를 모두 완료할 수 있다.
7. 메뉴 재진입은 M3 원정 상태를 초기화하지만 성장 상태를 유지하고, 페이지 새로고침 뒤에도 인장·장비 소유/장착·command level만 복원한다.

## Baseline → current best

- **Baseline:** 두 장비는 처음부터 자유 선택할 수 있고 모든 ground/air command가 열린 상태였다. 훈련 처치 보상, 구매·해금·level과 save contract가 없었다.
- **첫 candidate:** 훈련 인장, 중량형 구매, Lv.0~3 transaction, route profile과 schema v1 local save를 연결했다.
- **가장 큰 품질 병목:** 최초 인장 +2 candidate는 중량형과 Lv.3까지 5회 clear가 필요해 160 HP 훈련 골렘 반복이 성장 차이를 확인하는 시간을 과도하게 늘렸다.
- **Current best:** clear당 인장 3으로 조정해 세 번의 clear에서 장비 구매와 세 단계 수련을 모두 선택할 수 있다. 장비 구매와 command 수련은 같은 재화를 경쟁하므로 어떤 route를 먼저 열지 선택이 남는다.

## Reference 채택

- **직접 재사용:** 현재 Polygon RPG의 immutable `EquipmentProfiles`, `CombatCommandController` frame/queue/cancel, `TrainingEncounterNode`의 generic damage·hitPulses·range·hitstun·launch DTO와 `encounterCompleted` Signal.
- **Polygon에 맞게 수정:** Ball Fight Simulator의 stable equipment ID inventory와 storage normalization, Baeseongjin의 immutable progression transaction·changed/reason 경계를 최소 schema와 Alpine UI bridge에 맞게 적용했다.
- **원칙만 차용:** 입력 수집기는 sequence만 만들고 해금 판정은 command controller가 맡으며, 완료된 성장 mutation만 Signal로 browser resource owner인 GameApp에 전달하는 방향.
- **비채택:** Reference의 장비명·slot 수·balance·asset, global UI manager, debug-only unlock, multiplayer authority와 대형 manager 계층.

## 검증

- `npm run check`: ESLint / Prettier 통과
- `git diff --check`: 통과
- 일회성 DOM 없는 progression 진단: 인장 획득, 재화 부족, 중복 구매, 미소유 장착, Lv.1~3 비용, 최대 level, catalog 밖 저장 ID 제거, 손상 JSON/storage 예외 fallback과 exact save key 통과
- 일회성 command 진단: Lv.0 잠긴 branch 소비, Lv.1 `slash→thrust`, Lv.2 공중 2회 cap, Lv.3 `thrust→slash` loop cancel 통과
- 장비/전투 진단: 같은 skill level에서 속공형 Slash 27 frame/10.8 damage/25.76 range/0.85 stun과 중량형 36 frame/14.4 damage/34.16 range/1.30 stun, launch·방어 피해·Spin 3타와 reset 뒤 장착/level 유지 통과
- 실제 Canvas/mobile pointer 경로: 메뉴 → 학원촌 성장 panel → 왼쪽 Portal → 훈련장 → Lv.0 Strong 반복 처치 → 인장 +3 → 귀환 → 중량형 구매·장착 → reload 뒤 중량형 복원 확인
- 실제 UI에서 인장 0일 때 구매/수련 비활성, clear 뒤 인장 3에서 두 선택 활성, 구매 뒤 비용 차감·장착·`성장 자동 저장됨` 표시를 확인
- `900×600` mobile landscape에서 Canvas와 조작기, 고정 `360×203 logical` 유지 및 browser warning/error 없음
- 독립 verifier가 owned path, 최소 save key, Lv.0~3 route, 장비 gameplay profile, 보상 1회·reset 분리, UI/renderer dependency와 전체 check를 다시 확인했고 actionable finding이 없었다.
- 사용자 요청 없는 영구 test/script/fixture는 추가하지 않았다.

## 품질 판정

| 축                   | 수준 | 근거                                                                                       |
| -------------------- | ---- | ------------------------------------------------------------------------------------------ |
| 기능 완결성          | 2    | 훈련 처치→인장→귀환→장비/command 성장→재전투→reload 복원이 한 경로로 연결                  |
| 조작 명료성          | 2    | panel과 desktop/mobile guide가 현재 해금 route·비용·잠김·장착·저장 상태를 같은 값으로 표시 |
| 타격감·Effect        | 2    | 기존 contact/event/camera feedback 위에서 frame·검 길이·stun·launch·multi-hit가 실제 변화  |
| Graphics·시각 일관성 | 2    | 기존 HUD 대비와 Canvas를 가리지 않는 compact 성장 panel, Polygon/Retro 동일 combat state   |
| Reference 정합       | 2    | current combat convention을 우선하고 ID snapshot·transaction·storage 경계만 수정 채택      |
| 회귀 안전성          | 2    | syntax/check/diff, 결정적 route·storage·trade-off, 실제 Portal/Canvas/reload/resize 검증   |

적용 품질 축에 0 또는 1이 없으며 별도 사람 판단 질문 없이 메인 반영 준비가 가능하다.

## 문서 상태와 남은 위험

- 현재 저장 schema는 의도대로 M3 Gold·HP·checkpoint·Boss/shortcut을 포함하지 않는다. 브라우저 storage가 막힌 환경에서는 UI가 `이 세션만 유지 · 저장 사용 불가`를 표시한다.
- Reference 조사 중 Ball Fight Simulator의 `docs/player-data-storage-security.md`가 현재 profile schema와 달라 `STALE`임을 확인했으며 이번 판단 근거로 사용하지 않았다. 현재 Polygon RPG 문서의 `STALE`, `CONFLICT`, `ORPHANED`는 발견하지 않았다.
- 실제 Canvas에서는 Lv.0 처치·중량형 구매·reload 복원까지 확인했다. Lv.1~3의 모든 공중 route를 사람이 연속 조작한 녹화는 남기지 않았고, production command/profile module을 사용한 120Hz 결정적 진단으로 타수·공중 cap·loop cancel을 확인했다.
