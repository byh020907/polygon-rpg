# 한 달의 현장 루프 구현 계획

기존 캠페인과 v0.6.0 기반을 보존하고 폐광/항구의 작은 의뢰 묶음을 실제 연결한다.

## 결과 파일 구조

신규/수정은 이번 책임을 뜻한다.

```text
polygon-rpg/
├─ PRODUCT_GOAL.html / ARCHITECTURE.md       # 수정: 경험/기술
├─ docs/game-systems/field-quests.md         # 신규: 제작 계약
├─ docs/game-systems/equipment.md            # 수정: 외형·강화
├─ scripts/art-production-contract.mjs      # 수정: 제작 원본
├─ src/game/quests/                         # 신규
│  ├─ QuestProfiles.js / QuestState.js
│  ├─ QuestReadModel.js / QuestWorldProfiles.js
│  └─ FieldQuestRuntime.js                  # 실제 현장 adapter
├─ src/game/progression/                    # 신규/수정
│  ├─ MaterialLedger.js / RewardTransactions.js
│  ├─ EquipmentUpgrade.js / FieldProgressionMigration.js
│  └─ ProgressionState.js / ProgressionStorage.js
├─ src/game/presentation/                   # 신규
│  ├─ CampaignTimePresentation.js
│  └─ AcquisitionFeedback.js
├─ src/graphics/EquipmentPresentation.js    # 수정: 슬롯 실제 외형
├─ src/game/GameScene.js                    # 수정: 단일 commit
├─ src/ui/gameShell.js / index.html         # 수정: 4개 관리 화면
└─ scripts/field-quest-check.mjs / month-loop-check.mjs
   scripts/month-loop-browser-qa.mjs        # 신규: domain/실제 입력
```

1. 공식 문서/생성 원본을 먼저 정렬한다. 문서 owner는 부모 하나다.
2. Quest 순수 domain과 Progression/ledger/migration을 책임 분리한다.
3. claim/quest/clock을 원자 commit하고 실제 조작·맵·후일담·획득 UI를 연결한다.
4. 슬롯 담당 영역과 네 시간대·작은 밤 조우를 현재 장면에 적용한다.
5. 독립 감사, 기존 검사, npm run verify, PC/mobile gameplay·위키/print를 통과한다. 최신 main 비재작성 merge 후 처리한 INBOX만 제거해 통합한다. 자동 loop는 재개하지 않는다.

[W3C SCXML의 결정적 event/state 전이](https://www.w3.org/TR/scxml/)와 [Godot의 데이터 Resource 분리](https://github.com/godotengine/godot-docs/blob/master/tutorials/scripting/resources.rst)를 참고한다. 새 엔진/SCXML runtime 대신 기존 순수 함수·불변 데이터·신호를 확장한다.
