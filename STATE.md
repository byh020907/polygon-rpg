# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — 승인된 현재 캠페인 기반 교체와 전체 그래픽 검토 환경의 구현·검증을 마쳤다. Codex heartbeat와 OpenCode runner는 Human pause를 유지하며 명시적 재개 전까지 실행하지 않는다. 전체 게임의 IMPLEMENTATION_COMPLETE 판정은 아니다.

## Current Phase

`Human Feedback Priority — 공통 기반·전체 그래픽 검토 환경 검증 완료 / Human 시각 피드백 대기.` 원본 리소스와 같은 출력, 전체 종류·동작·상태·실제 장면·UI를 stable ID와 URL로 검토할 수 있다. 다음 기존 전선은 폐광→항구 연결 이슈 실제 완료·귀환이며, Human pause 중에는 자동으로 진행하지 않는다.

## Active Execution Goal

없음. 이번 범위의 구조·검토 환경은 검증을 마쳤다. 자동 개발은 중지 상태이며 다음 Goal은 새 Human feedback과 현재 미완료 전선을 다시 비교해 선택한다.

## Desired-State Comparison

| Area                                             | Status           | Current evidence                                                                                                                                                                                              |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 현재 campaign 상태·저장                          | satisfied        | schema10 gold·campaign 단일 소유. 옛 journey/expansion/worldTime와 migration 제거. 실제 contact victory의 진행·보상 원자성·재지급 방지, 고물상 command 및 incompatible/corrupt/recovery 경계 fixture PASS.    |
| 전체 graphic inventory                           | satisfied        | 588개(원본 producer566 + DOM UI19 + icons3), 13종류. 16rooms·434원본 map items·181 initially disabled·101patches, NPC26조립, current enemy21(16배치/5미배치), 장비5와 효과·최종전·UI를 공통 catalog에서 추적. |
| 검토 동일 출력·정상속도                          | satisfied        | production composition/pose/공격 사이징/geometry/renderer/UI component 공용. 435 RenderFrame 비교(검 궤적·장비별 방어 반동 포함)·107 실제 fixed-step 관측과 effects 9그룹 coverage PASS.                      |
| 검토 desktop/mobile UX                           | satisfied        | 1280×720·844×390 actual 검토 66기록 PASS. 독립36기록 및 큰정적4× 전체범위·UI 2×/원본viewport·모바일10번째고물상행wheel접근·PNG/roll연속프레임 직접판독 PASS.                                                  |
| 승인된 주인공 스타일                             | preserved        | main21f4b56/cfbb23b의 작은머리·긴사지·낮은횡사선베기·전방roll 기준 유지. 기존모션폐기 INBOX로 현재 스타일을 재폐기하지 않음.                                                                                  |
| 기존 Human Feedback Priority / playable frontier | partial          | 이전 actual 폐광 briefing·항구 건선거 진입·Strong HP76→56·KO증거와 held-input fence는 보존. 양 연결 전투 완료·귀환·온실·폐광core/after-state 연속 실제검증은 남아 있다.                                       |
| Remaining product                                | gap / unverified | 약10시간 캠페인·후반영역·최종전·모션의 모든 체형별 자연스러움·시각취향을 검토환경 완료만으로 충족 처리하지 않는다.                                                                                            |
| PWA 설치 A→B                                     | Human 확인 대기  | canonical release asset inventory·cache/save-before-apply fixture. persistent installed PWA의 발견/적용/저장유지/offline재실행은 Human이 확인한다.                                                            |

## Verification

- 실제 permission danger-full-access / approval never, 이전 worker 종료와 guard free 확인 뒤 별도 codex/graphics-review-foundation에서 단일 guard 획득. 자동 trigger 둘 다 PAUSED.
- 전체 npm run check(lint/format/combat/enchantment/story/campaign/recovery/intro/character/map/growth/visual/platform/graphics), test:pwa, test:final, diff check PASS. QA 초기화가 입력 뒤 대화를 덮어쓰던 결함을 공통 준비순서로 수리했고 새 UI4종+기존 motion/combat/stage actual26case가 desktop/mobile에서 통과했다.
- Product Goal desktop/390px mobile/print PNG와 CSS 없는 semantic text 확인, overflow0.
- 최신 origin/main 재조회·비재작성 통합 확인. INBOX 원문 변경 없음. 이전 user 변경과 candidate를 덮어쓰지 않음.
- Actual source UI 검증: artifacts/graphics-review/ui-evidence.json과 component-*.png. 통합 검토 evidence: artifacts/graphics-review/evidence.json, desktop/mobile category·motion·복원 PNG. 독립 보고서: artifacts/independent-verifier/REPORT.md 및 final-evidence.json/extras-evidence.json/workshop-scroll.json.
- 검토 회수 슬롯은 hardcoded QA rows가 아니라 실제 CampaignRecoveryPolicy read model과 같은 snapshot을 표시·복원한다. UI 검토용 seeded scenario와 실제 victory/playable completion 증거는 구분한다.

## Blockers / Human 확인

- 자동 루프는 Human의 명시적 재개 전까지 중지한다.
- 착지 pose는 현재 authored 리소스로 등록되어 있지만 기존 gameplay가 landing recovery를 시작하지 않아 자동 재생되지 않는다. 검토실에서 이를 미사용으로 명시했으며 이번 모션 스타일 변경으로 확대하지 않는다.
- 검토실에서 시각적 만족과 구체적인 남은 결함을 stable ID·frame·재현 URL로 전달할 수 있다. 기존 INBOX 원문은 보존하며 일부 fixture PASS로 대기 피드백 전체를 제거하지 않는다.
- PWA 설치형 A→B는 Human 확인 대기다.

## Preserved Work Reference

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
