# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다.

## Runtime Status

`WAITING_FOR_HUMAN` — 유형별 대표 네 개와 공용 clip/정규좌표 구조를 검증했다. Codex heartbeat와 OpenCode runner는 Human pause를 유지한다. 전체 게임의 IMPLEMENTATION_COMPLETE 판정은 아니다.

## Current Phase

`Human Feedback Priority — 유형별 몹 제작 기준 검증 완료.` 그래픽 검토실에 인간형·짐승형·비행형·기계형 대표 각각 한 개가 있다. 컨셉 아트별 외형·본 profile과 유형 공용 동작을 분리했고, 부모 [-1,1] 좌표·크기 전파·회전 중 길이 유지·동일 clip 재사용을 확인했다. 주인공과 실전 몹은 기존 기준을 유지한다. 다음 미완료 playable frontier는 폐광→항구 연결 전투와 귀환의 연속 검증이지만 자동 실행은 중지 상태다.

## Active Execution Goal

없음. 자동 실행은 Human의 명시적 재개 전까지 중지한다. 다음 디자인 변경은 유형별 견본과 보관된 컨셉 아트를 기준으로 판단한다.

## Desired-State Comparison

| Area                                             | Status                   | Current evidence                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-GRAPHICS-REVIEW / 유형별 대표                 | satisfied · 시안         | 대표 네 개, 세 공용 clip, 서로 다른 본 계층. 624 frame·mirror/scale·다른 디자인 ID retarget fixture, native desktop/mobile 24기록 및 실제 변형 비교 PNG. 최종 실전 디자인 승인이나 전투 튜닝 완료는 아니다.                                                                                  |
| PG-PLATFORM-ACCESS / 시작 구간 디버그 진입       | satisfied                | 제목·MENU·MAP의 1초 hold, 초기 MENU 짧게 누르기, 공통 panel 1개, 실제 touch 해제 뒤 focus와 다음 일반 입력, main에서 QA 적용 뒤 canvas resize·일반 복귀·저장 bytes 보존. 독립 desktop/mobile 34기록 PASS.                                                                                    |
| PG-PWA-OFFLINE / native update                   | satisfied                | 설치fetch정체·동일빌드false restart 수리. 6개이하다운로드/body즉시소비·SHA256검증·networkprobe·scope/release/client별cache. 지속Chrome A→B→C 10조건/715요청 PASS. 실제hidden→visible복귀 후B준비660ms(로컬서버측정).                                                                         |
| PWA failure/persistence                          | satisfied                | asset503·stale200 거부, 저장실패활성화차단, 명시적용1회reload, 다른탭A게임·A코드계속유지와명시재시작, C offline/newquery. 진행1219bytes·복구1553bytes 전체동일.                                                                                                                              |
| PG-PLATFORM-ACCESS / 모바일 메인 메뉴            | satisfied                | 기존844×390에서메뉴768px였던overflow수리. 1280×720/844×390/740×360/390×844/360×640 + 회전·주소창높이·safe-area·keyboard/touch 34기록 PASS. 주요버튼44px이상·버전상태12px이상.                                                                                                                |
| 이전 설치 정체 복구                              | partial · 복구 행동 검증 | 기존 cdd native job은 새로고침·register/unregister·scope page 이탈로 해제되지 않음. 같은 profile/origin의 브라우저 정상 종료(Browser.close)·완전 재시작 뒤2.066초 B설치·offline·모든저장bytes유지 확인. 해당 이전 상태만 한 번 완전종료가 필요하며 새로고침 자동복구 PASS로 표시하지 않는다. |
| 설치형 Android/iOS PWA                           | Human 확인 대기          | headless native Chromium 지속profile을실제사용했으나설치형실기기A→B완료로확대하지않는다. 기기확인대기는다른개발의전역blocker가아니다.                                                                                                                                                        |
| 전체 그래픽 검토 / 현재 campaign 기반            | satisfied                | 이전검증된588개리소스·공용production sampler·435RenderFrame/107fixedstep·schema10단일gold/campaign 기반을유지한다.                                                                                                                                                                           |
| 기존 Human Feedback Priority / playable frontier | partial                  | 폐광briefing→항구건선거진입·Strong HP76→56 및KO fence증거보존. 양연결전투완료·귀환·온실·폐광core/after-state 실제연속검증은남아있다.                                                                                                                                                         |
| Remaining product                                | gap / unverified         | 캠페인전체·후반·최종전·시각적최종만족과현재미사용착지pose 자동재생은이번수리완료로닫지않는다.                                                                                                                                                                                                |

## Verification

- actual danger-full-access / approval never. clean branch에서 free guard를 획득했고 현재 codex/enemy-type-references를 부모가 직접 구현·별도 acceptance pass로 검증했다. 별도 subagent 검증을 수행했다고 표시하지 않는다. Human pause는 유지한다.
- ingress 986d08b, 2730c4d, 7f8c2c8, 9d92bfa의 변경 의도는 최신 PG-GRAPHICS-REVIEW와 Graphics Resource Review Boundary가 소유한다. 최신 '대표 네 개' 요청이 일괄 교체 요청을 대체하며 해당 네 항목만 queue에서 제거했다.
- test:enemy-references 624 frame PASS: 원본 [-1,1], 정규 부모 합성, 모든 frame의 크기 불변, root 2배·양방향, 다른 디자인 ID/본 비율에 같은 clip 적용. source topology는 한 번 compile한다.
- artifacts/enemy-references/evidence.json: actual mouse/touch category 네 개, idle/move/attack 24기록, 정상 재생·정지·Retro/좌측·저장 bytes/console 확인. mobile-evidence.json과 PNG는 canvas까지 스크롤해 읽은 추가 증거다.
- artifacts/enemy-references/retarget-board.png: 4유형 원본/변형의 동일 move clip, 총8출력을 직접 판독했다. 회전 시 부모 비균등 크기가 자식의 길이를 늘리던 결함을 unit axis/extent 분리로 수리했고 공격 준비→접촉 연결을 연속화했다.
- 그래픽 catalog/sampler 검증은 base570개·2287sample·435production RenderFrame·107fixedstep PASS, 전체 UI 포함 catalog는592개다. 기존 게임/주인공/몹 source는 변경하지 않았다. PWA fixture, metadata, lint/format/diff PASS.
- 참고 이미지 원본과 source/size/SHA256은 docs/references/enemy-archetypes에 있다. 최신 주인공 시트는 실제 PNG이며 이전 주인공 파일을 교체했다. 몹 시트는 해당 원본을 유지한다. 원본은 runtime/PWA asset에서 제외한다.
- 구조 선택·SVG 입력 형태·수정 예시는 docs/enemy-reference-authoring.md. 로컬 Node sample 비용은 artifacts/enemy-references/sampling-cost.json; 휴대폰 FPS 증거가 아니다.
- 이전 PWA native A→B→C·저장·offline 증거는 artifacts/pwa-update/browser-evidence.json 및 REPORT.md, legacy 정상 브라우저 종료 복구는 restart-recovery-evidence.json에 보존한다.

## Human 확인 / Pause

- 이전 설치가 멈췄다는 안내가 나오면 이번 한 번 앱과 브라우저를 완전히 종료한 뒤 다시 연다. 저장·복구 데이터와 기존 cache는 유지하며 무조건 unregister하지 않는다.
- 실제모바일설치앱에서현재버전·업데이트확인·저장후적용과메인메뉴비율을확인할수있다. 코드수리/브라우저검증과실기기판정을구분하며INBOX원문을보존한다.
- 자동루프는명시적재개전까지중지한다. 기존모션스타일·원본첨부·이전KO수리·OpenCode미통합candidate는유지한다.

## Preserved Work Reference

일괄 몹 교체 시안은 Human의 동일 체형/비율 지적으로 중단했다. local `codex/enemy-silhouette-redesign` / `f4f350b37d081bfdc5863773f80521b4cccaf38f`는 미완료/test-failing 보존본이며 main 통합 대상이 아니다. 원본 첨부와 실패/중간 PNG는 artifacts/enemy-redesign에 보존한다.

Paused-loop recovery commit `e926ef4` (`KO 복귀 입력 재진입을 막는다`) fences held direction/attack input after KO until release; it is not evidence that the linked encounter is complete. Resume from fresh production input at the mine→shipyard linked path after the Human-directed Astra/xhigh structural/refactor and graphics-review work is integrated or otherwise resolved.

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its report remains in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`.
