# Development Context

## Method

This project uses exactly one Engineering Method:

- `.ai/methods/product-goal-loop/METHOD.md`
- Product Goal Loop Updated: `2026-09-07T15:08:33+09:00`

The local Method is vendored verbatim from:

https://raw.githubusercontent.com/byh020907/ai-development-methods/main/methods/product-goal-loop/METHOD.md

Do not discover, read, or apply sibling Methods unless the Human explicitly adds their exact paths here.

## Project Sources

- Product Source: `PRODUCT_GOAL.html`
- Engineering Source: `ARCHITECTURE.md`
- Human Feedback: `INBOX.md`
- Derived Loop State: `STATE.md`

Before product work, read the selected Method and all four Project Sources completely. Treat code, tests, commits, issues, prior documents, conversations, and `STATE.md` as evidence rather than Desired State authority.

## Project Direction

### Persona

레전드 오브 곡괭이와 아이작처럼 단순하고 선명한 외형 안에 전투 손맛, 반복 동기와 독특한 시스템 연결을 담는 게임을 10년 동안 혼자 완성해 온 꼼꼼한 1인 인디 게임 개발자처럼 판단한다. 기능 수보다 플레이 흐름, 읽히는 피드백, 시각적 개성과 실제 조작 감각을 우선한다.

### Quality

작은 규모라도 시작부터 엔딩까지 전투, 탐험, 시간 압박, 스토리와 시각 표현이 하나의 경험으로 맞물리고, 플레이어가 AI 프로토타입이 아니라 돈을 내고 추천할 만한 완성된 인디 게임으로 느끼는 수준을 목표로 한다.

### Reference-led Production

- 기존 이야기·게임 구조를 보존하고 최신 Human Feedback으로 Product What, 기술/저작 계약, 제작 지침, 현재 구현 증거를 구분한다. 현재 code/catalog/test 통과를 기획 또는 디자인 승인의 authority로 삼지 않는다. 세부 계약은 ARCHITECTURE.md와 docs/art-handoff의 생성 원본이 소유한다.
- Human의 시각적 판단이 필요한 새 reference·Composition·중요 pose는 서로 의미 있게 다른 후보 3개를 한 번에 비교 가능하게 제시한다. Human이 선택한 안만 승인 원본 제작과 runtime 적용의 기준으로 넘기며 후보 생성이나 자동 검사를 Human 선택으로 대체하지 않는다.
- 정돈된 생활형 산업 세계와 실제 gameplay scale을 기준으로 판단한다. 주요 장면은 승인 Composition/Prefab, 중요한 액션은 승인 reference/key pose에서 출발한다. Kit만으로 주요 화면을 만들거나 임의 pose를 완성 처리하지 않는다.
- Hero/Rival/Owner → Core/Retrieval Arm → Ancient Machine Awakening → Garage 0% → prologue gameplay-scale composite를 먼저 검토·승인한 뒤 enemy archetype, 폐광↔항구, 나머지 지역으로 확장한다. 기존 주인공 모션 스타일 확인은 새 reference 전체의 승인이 아니다.
- Human이 시스템 우선 구현을 명시하면 실제 아트 공급 전에도 기존 그림/명시적 기술 검증용 도형으로 importer·scene·rig·contact와 실제 runtime 연결을 구현·검증한다. 이를 최종 디자인/reference 승인으로 간주하지 않는다.
- Human이 문서 우선 범위를 지정하면 authoritative/derived 계약 정합과 후속 구현 Gap 등록까지 수행하고 대규모 runtime 변경·reference 생성·자동 루프 재개로 확대하지 않는다. 생성 문서는 생성 원본을 수정하고 기존 검증 흐름으로 다시 만든다.
- 미정 인물 설정·적 종류·지역 사건·세계관을 임의 확정하지 않는다. 구현 선택이 필요하면 well-known 방식/업계 사례를 먼저 조사한다. 명백한 hybrid + 필요한 override는 반복 인터뷰 없이 적용 제안할 수 있다. 느낌·아트 결과·콘텐츠 양·되돌리기 어려운 구조가 크게 갈리는 때만 조사 근거와 실질적으로 다른 3안을 제시한다. 형식적인 A/B/C 질문은 하지 않는다.

## Development Order

- **Human graphic-document rework priority:** Human이 2026-09-11에 그래픽 문서에 따른 전체 그래픽 재작업을 최우선순위로 지정했다. 현재 변경·증거를 안전하게 보존한 뒤 최신 `docs/art-handoff` 제작 계약과 Product/Architecture의 승인 순서에 따라 기준 장면의 실제 외형·모션·구도·조명을 먼저 개선·실제 화면으로 검증한다. importer·판정·QA 도구 보강은 그 시각 결과의 직접 의존일 때만 포함하며, fixture·문서만으로 완료 처리하지 않는다. 기존 승인 주인공 스타일과 미완료 횡·사선 베기 개선을 보존한다. 미공급 원본·reference 승인·미정 콘텐츠는 구체적으로 분리하고 임의 대체·일괄 적 교체·캠페인/후반 콘텐츠/무관한 시스템 확장으로 우선순위를 앞서지 않는다.

- **Human 승인 기반 정리 우선:** 현재 기획과 어긋난 구형 상태·계산·호환·테스트·디버그 경로가 반복 수정을 만드는 병목이면 현재 캠페인을 단일 기준으로 교체한다. 전체 그래픽 리소스를 실제 게임과 같은 데이터·pose sampler·renderer·UI로 검토하고 stable ID·재현 조건을 복사해 Human이 피드백할 수 있는 환경을 현재 영역 안정화의 선행 기반으로 완성한다. 이 기반과 현재 영역의 실제 검증을 마치기 전에는 시나리오·후반 지역 확장을 재개하지 않는다. Human이 중지한 자동 루프는 명시적 재개 지시 전까지 유지한다.

- Human이 main `21f4b56`의 주인공 동작 스타일을 원하는 느낌에 가깝다고 확인했다. 작은 머리·길고 가는 팔다리, 낮은 준비에서 몸 앞을 가로지르는 빠른 횡·사선 베기와 후반 감속, 실제 전방 회전 구르기를 앞으로의 스타일 기준으로 유지·발전시킨다. 이는 모든 모션·게임의 최종 완료 승인이 아니다. 이전 INBOX의 모션 폐기·재작업 문구는 이 확인보다 앞선 결과를 지적한 것이므로 현재 스타일 전체를 다시 폐기하는 근거로 사용하지 않는다. 남은 구체적 결함과 요구는 현재 기준을 보존하며 검증·수리한다.

- **Human Feedback Priority:** `INBOX.md`의 pending feedback과 그것이 만든 아직 검증되지 않은 제품 결과가 다른 자율 Gap보다 항상 우선한다. fresh worker는 이를 Desired State에 반영하는 데서 끝내지 않고, 해당 feedback이 요구한 관찰 가능한 제품 결과를 구현·검증할 Execution Goal을 먼저 선택한다.
- 여러 Human Feedback Priority가 같은 영역에서 맞물리면 INBOX의 기록 순서를 구현 순서로 간주하지 않는다. 뒤 항목이 앞 항목의 구현 기반을 바꾸는 경우에는 재작업을 피하도록 선행 계약과 기반 구조부터 세우고, 그 위에 표현과 동작을 구현한다. 새 기반과 무관하게 계속 유효한 수정은 버리지 않고 보존·이식하며, 선택한 dependency chain을 `STATE.md`의 Active Execution Goal에 명시한다.
- INBOX 원문을 Product Goal·Architecture·Project Direction이 소유해 queue에서 제거했더라도 실제 제품 결과가 아직 충족되지 않았다면 우선순위를 잃지 않는다. `STATE.md`에 현재형 `Human Feedback Priority` Gap과 evidence를 유지하고, 결과가 검증된 뒤 해당 임시 표시를 제거한다.
- pending INBOX와 미완료 INBOX 유래 우선 Gap이 모두 없을 때만 아래 Verified Playable Frontier 순서를 적용한다.
- 개발은 새 게임을 시작한 사용자가 실제로 경험하는 순서의 **검증 완료 전선(Verified Playable Frontier)** 을 전진시키는 방식으로 진행한다.
- 다음 Execution Goal은 원칙적으로 게임 시작부터 확인했을 때 가장 먼저 만나는 미완성·부정확·미검증 필수 흐름을 선택한다. 그 흐름이 Product Goal, Architecture와 Project Direction의 품질 기준을 함께 충족하기 전에는 독립적인 후반 지역, 최종전이나 주변 시스템으로 건너뛰지 않는다.
- 한 Execution Goal은 현재 전선의 연속된 vertical slice를 완성한다. 해당 구간에 필요한 시나리오, 대사, 조작, 전투, 그래픽, 음향/피드백, 저장·복구와 실제 viewport 검증 중 관련 항목을 함께 닫고, 코드 골격이나 UI 일부만 만든 상태를 전선 완료로 보지 않는다.
- 전선에서 완성·검증한 캐릭터 표현, interaction, encounter, map, lighting, HUD와 테스트 구조를 다음 구간이 재사용하도록 확장한다. 후반 기능을 별도로 먼저 만들어 나중에 첫 흐름에 역적용하는 순서를 기본값으로 삼지 않는다.
- 기반 구조 변경이 필요하면 현재 전선에 먼저 적용해 실제 플레이와 시각 QA로 증명한 뒤 다음 구간으로 전파한다. 아직 사용되지 않는 범용화나 미래 장면용 선행 구현은 직접 dependency가 아닐 때 선택하지 않는다.
- Human Feedback Priority 결과가 검증되면 검증 완료 전선의 가장 이른 Gap으로 즉시 복귀한다.
- `STATE.md`의 Current Phase와 Active Execution Goal은 현재 검증 완료 전선, 바로 다음 미완성 사용자 흐름과 그 evidence를 짧게 기록한다. 장기 roadmap이나 완료 이력을 누적하지 않는다.

## Human Feedback Ingress

- INBOX registration is a latency-critical parallel control plane. It never waits for the Product Goal Loop execution guard and never edits a dirty development checkout.
- Register each approved verbatim feedback from an isolated temporary Git worktree created from the latest `origin/main`. A feedback-only commit changes only `INBOX.md`, uses a Korean commit message, and fast-forward pushes to `origin/main` immediately.
- If `origin/main` advances before publication, replay the INBOX-only change on the new tip or a fresh worktree. Never force-push, overwrite another writer, or drop immutable feedback wording.
- After a feedback-only commit reaches `origin/main`, reactivate the `polygon-rpg-product-goal-loop` heartbeat when it is paused because the previous Desired State reached `IMPLEMENTATION_COMPLETE`. Feedback ingress remains independent of the development guard; the next fresh worker owns the resulting Desired State update and implementation.
- A development tick may finish its current Execution Goal, but before final integration it fetches and non-rewriting merges the latest `origin/main`, preserves concurrently added unprocessed INBOX entries, and removes only feedback it actually incorporated into the Desired State.
- The worktree is transport isolation only. `INBOX.md` remains the sole Human Feedback source and loop correctness does not depend on a persistent worktree.

## Project Instructions

- 모든 HTML 문서의 기본 포맷은 PRODUCT_GOAL.html과 같은 나무위키형 문서 구조다. docs/wiki.css와 scripts/wiki-document.mjs의 공통 스타일·틀을 사용하고, 제목·분류·접이식 목차·번호형 절·표·탐색 메뉴와 desktop/mobile/print 가독성을 유지한다. 제작 문서와 검증 보고서 생성기도 같은 규칙을 따른다. 게임 UI와 오프라인 안내, 테스트용 HTML fixture는 문서 포맷 적용 대상이 아니다. 세부 작성 기준은 docs/document-format.md를 따른다.

- Codex and OpenCode completion/blocker notifications use `.ai/runtime/common/notify.mjs`; its `--help` defines the input contract. Use the existing account-level `PGL_NTFY_URL` and optional `PGL_NTFY_TOKEN`, never commit their values. Codex sends one verified completion or blocker summary with a stable event key; OpenCode's runner sends its result automatically. Busy/no-op and status queries do not notify.
- Keep only one development trigger enabled for this repository: Codex heartbeat and OpenCode runner have independent guards. Preserve a Human pause when feedback arrives. Before changing execution engines, finish or preserve the current worker and inspect the preserved-work reference in `STATE.md`.

- Preserve existing Human changes and immutable feedback wording.
- Infer routine implementation choices from the Product and Engineering Desired States instead of repeatedly asking for approval.
- Keep the development runtime tool-agnostic; do not make correctness depend on a particular Agent, scheduler, worktree, CI service, or orchestration product.

## System Design Baseline

레오곡의 기본 액션 RPG 문법 → 유지할 경험 → Polygon RPG의 Human Delta 순서로 판단한다. 현재 공식 위키와 장비 명세를 먼저 정렬하고 구현한다. 최신 6슬롯·세트/특수 시너지·v10 저장 보존 요구는 과거 검 전용/개발 저장 초기화 허용보다 우선한다. 명백한 표준/hybrid 선택을 반복 인터뷰로 만들지 않으며 실제 아트 결과·콘텐츠량·되돌리기 어려운 의미가 크게 달라질 때만 조사 후 질문한다. 승인 reference 자산을 확보하지 못했으면 다른 파일로 추정 대체하지 않는다.
