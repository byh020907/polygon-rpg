# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — Human이 요청한 모바일 PWA 갱신과 메인 메뉴 비율 수리의 구현·검증을 마쳤다. Codex heartbeat와 OpenCode runner는 Human pause를 유지한다. 전체 게임의 IMPLEMENTATION_COMPLETE 판정은 아니다.

## Current Phase

`Human Feedback Priority — 모바일 PWA / 메인 메뉴 수리 검증 완료.` 브라우저 native Service Worker의 지속 A→B→C 갱신·저장·offline을 확인했고, 모바일 가로·세로 메뉴는 실제 보이는 높이 안에서 제목·시작·버전·업데이트를 읽을 수 있다. 설치형 Android/iOS 실기기 최종 확인은 Human이 담당한다. 게임·캐릭터·camera 비율은 이번 요청 범위가 아니다.

## Active Execution Goal

없음. 자동 실행은 중지한다. 새 Human feedback 또는 명시적 재개 뒤 현재 미완료 전선과 비교해 다음 Goal을 선택한다.

## Desired-State Comparison

| Area                                             | Status                   | Current evidence                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-PWA-OFFLINE / native update                   | satisfied                | 설치fetch정체·동일빌드false restart 수리. 6개이하다운로드/body즉시소비·SHA256검증·networkprobe·scope/release/client별cache. 지속Chrome A→B→C 10조건/715요청 PASS. 실제hidden→visible복귀 후B준비660ms(로컬서버측정).                                                                         |
| PWA failure/persistence                          | satisfied                | asset503·stale200 거부, 저장실패활성화차단, 명시적용1회reload, 다른탭A게임·A코드계속유지와명시재시작, C offline/newquery. 진행1219bytes·복구1553bytes 전체동일.                                                                                                                              |
| PG-PLATFORM-ACCESS / 모바일 메인 메뉴            | satisfied                | 기존844×390에서메뉴768px였던overflow수리. 1280×720/844×390/740×360/390×844/360×640 + 회전·주소창높이·safe-area·keyboard/touch 34기록 PASS. 주요버튼44px이상·버전상태12px이상.                                                                                                                |
| 이전 설치 정체 복구                              | partial · 복구 행동 검증 | 기존 cdd native job은 새로고침·register/unregister·scope page 이탈로 해제되지 않음. 같은 profile/origin의 브라우저 정상 종료(Browser.close)·완전 재시작 뒤2.066초 B설치·offline·모든저장bytes유지 확인. 해당 이전 상태만 한 번 완전종료가 필요하며 새로고침 자동복구 PASS로 표시하지 않는다. |
| 설치형 Android/iOS PWA                           | Human 확인 대기          | headless native Chromium 지속profile을실제사용했으나설치형실기기A→B완료로확대하지않는다. 기기확인대기는다른개발의전역blocker가아니다.                                                                                                                                                        |
| 전체 그래픽 검토 / 현재 campaign 기반            | satisfied                | 이전검증된588개리소스·공용production sampler·435RenderFrame/107fixedstep·schema10단일gold/campaign 기반을유지한다.                                                                                                                                                                           |
| 기존 Human Feedback Priority / playable frontier | partial                  | 폐광briefing→항구건선거진입·Strong HP76→56 및KO fence증거보존. 양연결전투완료·귀환·온실·폐광core/after-state 실제연속검증은남아있다.                                                                                                                                                         |
| Remaining product                                | gap / unverified         | 캠페인전체·후반·최종전·시각적최종만족과현재미사용착지pose 자동재생은이번수리완료로닫지않는다.                                                                                                                                                                                                |

## Verification

- actual permission danger-full-access / approval never, clean isolated branch codex/pwa-mobile-menu 및free guard확인뒤획득. feedback-only88b6f70은별도임시worktree에서INBOX원문만즉시등록했다. 자동trigger 둘다PAUSED유지.
- 발행cddcc10 native첫설치가150초에도installing인것을재현. 새SW+구adapter에서동일build false restart도별도로실제재현. 근거 artifacts/pwa-update/published-install-stall-evidence.json 및initial-install-false-restart-evidence.json.
- npm run test:pwa: metadata/probe/digest, lifecycle, 실제SWcache fixture PASS. platform/graphics URL계약,lint,format,diffcheck PASS. native브라우저flow는가짜registration.waiting/event로대체하지않았다.
- artifacts/pwa-update/browser-evidence.json 및REPORT.md: 지속native A/B/C, actualforeground/menuapply/offline/savebytes. 다른탭의업데이트후기존game화면과isPlaying이유지됨을actualclick/PNG로확인했다.
- artifacts/mobile-menu/current/evidence.json 및PNG: 34 layout/input기록. update상태주입과safe-area모사는layout증거로구분했으며실제PWA성공증거는위nativeflow가소유한다.
- 독립검증 artifacts/pwa-update/independent/REPORT.md: actual223요청의최초설치·3viewport·실패재시도·offlinequery,focusedfixtures 및최종A/B/C소스hash대조 PASS. 이미지직접판독과own자원반환완료.

- 검토실에서 일반 게임으로 돌아올 때에도 PWA owner를 시작하는 경로를 actual native controller/ready로 확인했다(artifacts/pwa-update/review-return.json).
- 기존 정체 복구 evidence: artifacts/pwa-update/restart-recovery-evidence.json. noRestartMigrationVerified=false / restartRecoveryVerified=true를 구분하며, 실패한 API 복구 진단도 artifacts/pwa-update/recovery-diagnostic-evidence.json에 보존한다.

## Human 확인 / Pause

- 이전 설치가 멈췄다는 안내가 나오면 이번 한 번 앱과 브라우저를 완전히 종료한 뒤 다시 연다. 저장·복구 데이터와 기존 cache는 유지하며 무조건 unregister하지 않는다.
- 실제모바일설치앱에서현재버전·업데이트확인·저장후적용과메인메뉴비율을확인할수있다. 코드수리/브라우저검증과실기기판정을구분하며INBOX원문을보존한다.
- 자동루프는명시적재개전까지중지한다. 기존모션스타일·원본첨부·이전KO수리·OpenCode미통합candidate는유지한다.

## Preserved Work Reference

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
