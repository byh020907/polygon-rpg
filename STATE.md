# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — 그래픽 담당자용 역할/시나리오/원본 목록 문서의 구현과 로컬 검증을 마쳤다. Codex heartbeat와 OpenCode runner의 Human pause는 유지한다. 전체 게임의 IMPLEMENTATION_COMPLETE 판정은 아니다.

## Current Phase

Human Feedback Priority — 그래픽 제작 요청 자료. Product Goal의 단일 제품 기준을 유지하고 링크로 요청 자료를 분리했다. 인물 단위 역할/상태/포즈, 실전 적과 유형 견본, 전체 이야기와 지역별 필요 그래픽, 원본 ID/검토 링크, 미정·충돌, 요청서 양식을 연결한다. 문서의 시나리오 서술은 새로운 gameplay 구현 완료를 의미하지 않는다.

## Active Execution Goal

활성 자동 실행 없음. 완료한 문서 작업의 dependency chain: 기획/작성된 자료 대조 → 인물 묶음/리소스 ID 매핑 → 작은 링크 문서 생성 → 누락/링크/독립 내용 검토 → PC/mobile/print 및 설치 앱 문서 열기 검증. 자동 게임 개발은 재개하지 않는다.

## Desired-State Comparison

| Area                                             | Status           | Evidence                                                                                                                                                                                  |
| ------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 그래픽 제작 요청 자료                            | locally verified | 주인공 1 + NPC 역할 묶음 13, 현재 적 21 + 유형 견본 4, 전체 시나리오 10쪽, 592개 원본 행. 목록 한 쪽 최대 30행. 기획/현재 등록/요청 제안/미정 구분.                                       |
| 문서 접근·최신성                                 | locally verified | 정적 HTML, 2,832개 로컬 링크와 673개 검토 URL 검사. docs:art / docs:art:check. docs namespace의 CSS·reference를 게임 캐시 밖에서 읽으며 게임 import의 cache-only 계약 유지.               |
| 기존 그래픽 검토/폴리곤/원형 탐색                | retained         | 단일 polygon, 부모 로컬 정규좌표/유형 clip 재사용, 저장 없는 테스트 세션과 원형 검색/색상, 시작 디버그·업데이트 진행 안내 유지. 그래픽 원본/게임 장면은 이번 문서 작업에서 변경하지 않음. |
| 기존 Human Feedback Priority / playable frontier | partial          | 폐광→항구 연결 전투/귀환과 전투 접촉·최종 시각 만족 등 INBOX 미완료 사항은 유지. 후반/최종전은 문서만으로 완료 판정하지 않음.                                                             |
| 설치형 실기기                                    | Human 확인 대기  | native Chromium 지속 profile 증거와 Android/iOS 설치형 실기기 판정을 구분.                                                                                                                |

## Verification

- npm run docs:art:check: 592개 resource ID가 누락/중복 없이 한 번씩 등장, 전체 NPC actor mapping, 10개 시나리오 페이지, source/anchor와 검토 URL 검증 PASS.
- 독립 source audit 한 명을 재사용했다. 폐광 구조 대상 링크 누락과 고대 병기의 사무적/비공포 연출 톤 누락을 수정하고 재확인 PASS. 모듈 소유권·자유 순서·우회 원인·온실 지형·선박 구분·후반 분량 미정을 확인 자료에 유지한다.
- art-handoff-qa: desktop 1280×900, mobile 390×844의 주요 문서/표, 실제 reference 이미지, body overflow, 인쇄 view, Product Goal→자료와 원본→실제 검토실 링크 확인. 현재 Service Worker가 제어하는 문서의 CSS/이미지도 네트워크로 로드. artifacts/art-handoff/evidence.json 및 PNG.
- PWA fixture는 문서 CSS의 network-only 응답과 game cache 미포함, 기존 game missing-import 차단/버전 고정/저장/오프라인 계약을 확인한다. 기존 native A→B→C 회귀 근거는 artifacts/art-handoff/pwa-browser.log.
- 코드·문서 lint/format과 release metadata 최신성 확인. 문서/참고 원본을 runtime precache에 추가하지 않는다.

## Human 확인 / Pause

문서 요청은 디자인 최종 승인이 아니다. 담당자는 docs/art-handoff/index.html과 작업할 인물/지역 링크를 받고 request.html 양식으로 요청을 구체화한다. decisions.html의 미정은 자료 완성으로 소거하지 않는다. 자동 루프는 명시적 재개 전까지 중지한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
