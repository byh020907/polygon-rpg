# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — 검토 도구 통합과 원형 UX 및 업데이트 진행 안내 및 시작 디버그 진입 v0.4.3의 구현 및 로컬 검증을 마쳤다. Codex heartbeat와 OpenCode runner의 Human pause는 유지한다. 전체 게임의 IMPLEMENTATION_COMPLETE 판정은 아니다.

## Current Phase

Human Feedback Priority — 그래픽 검토/저장 없는 테스트 플레이 역할 통합. 독립 렌더 연구실을 제거하고 본·메시·조명·재생 속도를 검토실 진단으로 모았다. 원형 유형 탐색과 문맥 동작, 세로 화면의 미리보기 우선 배치, 같은 선택으로 복귀하는 테스트 세션을 구현했다. 다음 playable frontier인 폐광→항구 연결 전투와 귀환의 연속 검증은 이번 UX 범위에 포함하지 않았으며 자동 실행은 중지 상태다.

## Active Execution Goal

활성 자동 실행 없음. 완료한 UX의 dependency chain: 저장 없는 interactive context → 검토실 진단·선택 복귀 → 원형 tree/문맥 UX → desktop/mobile·keyboard·저장 보존 검증. 추가 자율 시나리오 확장은 시작하지 않는다.

## Desired-State Comparison

| Area                                        | Status                         | Current evidence                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 역할 통합·원형 UX                           | locally verified               | 독립 lab 화면/canvas 제거. 찾기 → 유형 → 대상, 대상 주변 동작, 접힌 진단/프레임, 세로 화면 목록 버튼.                                                                                                |
| 저장 없는 테스트 플레이                     | locally verified               | production GameApplication/GameApp·입력·renderer 사용, 저장 port 접근 0회, restart/RAF/input cleanup/실패 rollback. 선택·동작·프레임·진단 URL 복귀. 미배치 대상은 안내하며 몹 배치 ID 불일치는 거부. |
| 폴리곤 단일 표현                            | retained                       | 실제 backing depth와 가림, 본·부모 로컬 정규좌표·유형 clip 재사용. 주인공 디자인·전투 규칙은 유지.                                                                                                   |
| 이전 PWA/모바일 수정                        | retained; device check pending | metadata/manifest/lifecycle/cache fixture PASS. 기존 설치 앱은 legacy SW 조건에 따라 완전종료가 한 번 필요할 수 있다. 실제 설치형 Android/iOS 확인을 headless QA로 대신 판정하지 않는다.             |
| Human Feedback Priority / playable frontier | partial                        | INBOX에 남은 Human 원문과 이전 KO fence·폐광/항구 관찰 증거 보존. 전투 접촉, 외형 최종 만족과 연결 전투·귀환·후반/최종전은 이번 UX 완료로 닫지 않는다.                                               |

## Verification

- v0.4.3: 시작 화면에 디버그 모드 버튼을 노출하여 기존 panel을 한 번에 연다. 기존 hold 진입 유지, 실제 opener focus 복귀. desktop 1280×720·landscape 740×360·portrait 360×640의 클릭/터치/키보드 진입과 버튼 경계 확인. mobile-menu 34개 viewport, platform 및 PWA fixture PASS. artifacts/start-debug와 artifacts/update-loading/start-debug-menu.log.

- v0.4.2: 최초 등록/확인·다운로드에 spinner와 불확정 progress를 표시하며 적용은 saving→activating→reloading lifecycle 단계로 안내한다. 적용 중 메뉴 inert와 상태 focus, 실패 시 해제. pwa-lifecycle-check의 실제 단계/중복/실패와 native 지속 profile A→B→C·저장 보존·두 탭·offline 회귀 PASS. pwa-loading-qa는 지연된 실제 버전 확인과 desktop/landscape/portrait 단계 시각 fixture·경계·실패 종료·reduced motion을 확인했다. artifacts/update-loading 및 artifacts/pwa-update/loading-native.log. mobile-menu 34개 viewport 회귀 PASS.

- v0.4.1: 찾기 tree의 592개 최종 리소스가 정확히 한 번씩 도달/선택 가능함을 검사했다. category→region→room→resource와 페이지 이동은 목록 전환 없이 이어진다. 반경 116→84px, 하위 중심 고정. graphics-navigation-qa의 desktop/mobile/portrait에서 최종 leaf 선택·페이지·중심·경계를 확인했다. artifacts/radial-leaves의 PNG와 기존 workflow 회귀 검증을 남겼다.

- npm run check 전체 PASS: lint/format, combat/enchantment/story/campaign/recovery/intro/character/map/growth/visual/platform/graphics. artifacts/review-ux/full-check.log. 570 base 리소스, 2287 samples, 435 production RenderFrame 비교, 107 fixed-step 관찰.
- scripts/review-workflow-qa.mjs: desktop 1280×720, mobile 844×390, portrait 390×844. 원형 유형/문맥·화면 경계·Escape·진단, 실제 키보드 이동·restart, 같은 URL 선택 복귀·test URL reload, localStorage 바이트 보존. artifacts/review-ux/evidence.json 및 PNG.
- scripts/graphics-review-qa.mjs: 기존 desktop/mobile 그래픽 검토 68개 항목 PASS. 프레임 이동·재생·복사·URL 복원과 UI 검토를 유지한다.
- test-play-session-check: production QA 초기화, 저장 getter 접근 0회, 실제 이동, restart/단일 RAF/입력 cleanup, 장비/위치/실패 candidate rollback, 일반 게임 속도 격리 PASS. test-play-config-check: 복귀 조건·장비·위치 URL과 잘못된 복귀/위치 거부 PASS.
- 실제 선택 몹(scrap-yard-brace-collector) 배치 ID 확인, 일치하지 않는 테스트 대상과 잘못된 URL의 검토실 복구, console 오류 0건 확인. 디버그 진입 mouse/touch/keyboard 34개 기록 PASS.
- PWA release fingerprint/asset integrity, manifest, lifecycle, cache fixture PASS. 새 기능 검증이 실제 설치형 기기 검증을 뜻하지 않는다.
- Kando Submenu와 Autodesk Maya Marking Menu 공식 이미지 예시를 사용자에게 제시했다. 큰 한글 원형 버튼으로 분류/문맥을 다루고 많은 leaf는 목록·검색으로 찾는다.
- 이번 피드백만 Desired State가 소유하므로 INBOX에서 제거했다. 나머지 원문은 보존한다. 자동 loop pause와 이전 미통합 작업은 유지한다.

## Human 확인 / Pause

자동 루프는 명시적 재개 전까지 중지한다. 유형 견본은 검토실 전용이며 전투 몹 교체 완료가 아니다. 실제 모바일 설치 앱의 업데이트 동작과 최종 시각 만족은 Human 확인이 남아 있다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
