# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다. Human이 main `21f4b56`의 주인공 동작 스타일이 원하는 느낌에 가깝다고 확인하고 문서 반영 후 Codex 루프 재개를 요청했다.

## Runtime Status

`RUNNING` — 현재 동작 스타일을 유지하며 남은 Human Feedback과 전체 제품 Gap을 처리한다.

## Current Phase

`Human Feedback Priority — PWA의 실제 지속 profile Release A → B 전환은 Human 확인 대기이며 PASS로 추정하지 않는다. 이 대기는 전역 blocker가 아니다. 폐광 산촌은 stable Browser 장면과 실제 작업반장 입력까지 확인했지만, 새 저장에서 before → in-progress → resolved를 연속 입력으로 끝낸 evidence가 없어 같은 검증 전선을 유지한다.`

## Active Execution Goal

`PG-CAST-CONTINUITY` / Architecture Story Interaction·Authored Campaign Content·Rendering, Input and Accessibility — 새 저장에서 도입을 거쳐 폐광 산촌의 작업반장·대기 광부·라이벌이 사건 전/진행/해결 후의 위치·작업·대사 변화와 구조·굴착기 흐름을 실제 Browser 입력·desktop/mobile viewport에서 끊김 없이 보여 준다. 현재 실제 desktop 입력은 작업반장 3줄 말풍선을 열었고 stable before/in-progress/resolved 화면도 판독했다. 이들을 잇는 새 저장 연속 경로와 mobile 실제 입력은 아직 PASS가 아니다. PWA persistent A→B waiting/apply/save/offline은 Human 검증 대기로만 보존한다.`

## Desired-State Comparison

| Area                          | Status                       | Current evidence                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pixel depth / clean rendering | satisfied                    | 결정적인 불투명 surface 소유와 깊이 동률, 곡면 윤곽의 자기 가림/뒤쪽 선 침범 방지. Hue 보존 명도 처리와 불투명 외곽선. 실제 게임 연속 frame에서 기존 면 구멍·원색 반점이 사라지고 피부·천·금속이 읽힌다.                                                                                               |
| Protagonist reference design  | satisfied                    | Photo1의 작은 단순 타원형 머리, 약6.85등신의 긴 팔다리, 짧은 옷자락과 크로스스트랩, 넓은 낮은 검. 작성 시 IK→Quaternion key만 저장하며 runtime은 SLERP/FK. 큰 머리·머리카락·고글·앞치마 장식 경로는 제거했다.                                                                                          |
| Sword motion and roll         | satisfied                    | 검을 머리 위로 들지 않고 진행 방향 반대쪽 몸 뒤로 낮게 준비→몸 앞을 가로질러 진행 방향으로 빠른 횡·사선 베기→후반 감속→복귀. 독립 실제 touch trace에서 초기 각변위가 후반보다 확연히 크고 포즈도 같은 결과로 읽힌다. 이전 full forward roll·방향 유지 달리기·stamina18·회피/이동/충돌 계약은 유지된다. |
| Shared geometry / contact     | satisfied                    | 11종×5장비 canonical reach/타이밍·좌우·중복 피해·guard 검증 PASS. 새 긴 다리도 실제 outline의 hurt를 공유한다. 최신 횡·사선 모션의 fresh collector heavy58→38 및 mobile airSlash58→46 공중 접촉→착지를 실제 입력으로 확인했다.                                                                         |
| PWA release update            | unverified · Human 확인 대기 | `v0.1.1`과 deterministic buildId가 메뉴와 Service Worker에서 같은 release metadata를 읽고 focused metadata/lifecycle fixture는 PASS. 실제 persistent profile의 A → B waiting discovery → 사용자 apply → 저장 유지 → offline B 재실행은 Human이 확인하며, 이 대기만으로 다른 개발을 막지 않는다.        |
| Story terminology             | satisfied                    | 도입부와 다섯 지역의 핵심·생활 NPC 전/진행/후 20개 대사는 현장과 transcript가 하나의 immutable authored catalog를 공유한다. 처음 나오는 작업 용어는 눈앞의 물건·행동·결과로 풀며, `test:intro`와 폐광 실제 Browser input 말풍선으로 확인했다.                                                          |
| Mine cast frontier            | partial · input continuation unverified | `scrap-awakening-check`의 폐광 계약은 before 대기 광부·라이벌 → in-progress 대기 광부 작업 전환 → resolved 구조등·after 광부와 굴착기 분리/부품 회수/reload를 고정한다. Codex 인앱 Browser는 `inputQaStart=scrap-mine-roadhead`에서 실제 ↑로 작업반장 3줄 말풍선을 열고, stable before/in-progress/resolved canvas/HUD를 판독했다. 그러나 이 surface의 연속 ↑ 완료와 mobile 실제 입력은 확인하지 못했으므로 새 저장 전체를 PASS로 추정하지 않는다. |
| Remaining product             | gap                          | 미검증 전체 캠페인은 이 범위에서 완료로 추정하지 않는다. INBOX 원문과 이전 OpenCode candidate는 보존한다.                                                                                                                                                                                              |

## Verification

- Full permission preflight 적용, guard free 확인 후 인수. 사용자 첨부만 untracked였고 수정·삭제·stage하지 않았다.
- 독립 실제 mobile touch: `artifacts/independent-backload-mobile`의 실제 touch 연속 frame. 새 비율·깨끗한 pixel·좌우 roll·머리 위 들기 없는 뒤→앞 횡사선 베기와 감속 판독 PASS.
- 실제 게임/동일 renderer 투명 frame sheet: `artifacts/crossbody-final-desktop`, `artifacts/crossbody-final-mobile`, `artifacts/crossbody-final-air-mobile`. 캡처의 원래 timestamp로 timeline 재생한다.
- Reference는 사용자 Photo1 및 MotionReferenceCatalog에 기록한 GDQuest/itch.io 원문 tutorial을 study-only로 사용했다. 외부 동작 asset은 import하지 않았다.
- 독립 motion/body/depth 검증 및 `test:combat`, `test:character`, `test:visual` PASS. 전체 `npm run check` PASS. 최신 횡·사선 pose에서 contact·continuity·공간/복구 journey 및 PWA inventory를 재검증했다.
- `3e47cc1`·`fb75a91` feedback-only commit을 최신 main에서 비재작성 통합했고 모든 INBOX 문구를 보존했다.
- `npm run release:metadata`, `npm run test:pwa`, `npm run lint`, `npm run format:check`, `git diff --check` PASS. 인앱 Browser의 fresh local origin에서 `PRE-ALPHA · v0.1.1`과 `BUILD · c35413ae33e3` 메뉴 표시를 판독했다. 독립 verifier는 fixture와 구현 경로는 PASS, 실제 Release A → B/offline browser flow는 미검증이라고 판정했다.
- 2026-09-07 Codex in-app Browser의 새 localhost origin에서 A(`v0.1.0`/`d68e332bb9da`)를 처음 연 뒤 같은 A를 다시 열어 활성화를 기다리고, site data를 지우지 않은 채 같은 origin server를 B(`v0.1.1`/`13324b6b163c`)로 교체했다. B 재열기에서 update waiting·apply UI 없이 B metadata가 직접 표시됐다. 이 surface가 persistent worker/controller를 증명하지 못했으므로 PWA gap을 유지한다.
- Fresh-context independent verifier: `npm run test:pwa`와 `git diff --check` PASS. release metadata·cache·save-before-apply 구현 계약은 code inspection상 정합하지만 fixture는 waiting worker를 주입하는 fake adapter라 persistent A→B discovery·controller change·save 유지·offline B를 증명하지 못한다고 판정했다. 따라서 PWA Goal은 partial pass이며 gap을 유지한다.
- `npm run test:intro` PASS: 도입 stage·저장·대화·지역 흐름 32개 check를 통과했고, 구조 줄을 포함한 현장 대사와 replay transcript의 동일성 및 용어의 기능 설명을 고정했다. Codex in-app Browser의 interactive `inputQaStart=scrap-intro-before`와 `scrap-intro-after`에서 실제 ↑ 입력으로 제어핵 선택·고물상 분석 말풍선을 확인했다.
- 2026-09-07 지역 대사 catalog slice: `npm run test:intro` PASS (32 checks), `npm run test:story` PASS, targeted Prettier/ESLint와 `git diff --check` PASS. 다섯 지역의 작업반장/생활 인물 20개 전·진행·후 대사를 한 frozen authored catalog로 만들고 map/transcript 일치를 fixture로 고정했다. Codex in-app Browser `?inputQa=1&inputQaStart=scrap-mine-roadhead`에서 실제 ↑ 입력으로 폐광 작업반장의 "사람을 꺼낼 레일" 말풍선과 현장 목표를 확인했다. fresh-context independent verifier PASS.
- 2026-09-07 폐광 전선 재검증: `npm run test:campaign`, `npm run test:intro`, `npm run test:story`, `git diff --check`를 대상으로 실행했고 campaign fixture는 PASS했다. Codex 인앱 Browser의 `inputQaStart=scrap-mine-roadhead&inputQaX=667`에서 실제 ↑로 폐광 작업반장 3줄 말풍선을 열었다. 별도 stable before/in-progress/resolved canvas는 작업반장·광부·라이벌, 굴착기 Boss 및 부품 회수 HUD를 각각 보였다. CUA input surface에서는 완성된 마지막 대화의 후속 ↑가 재현되지 않았고 mobile continuous input도 판독하지 못했으므로 이 결함을 제품 PASS나 자동 test PASS로 바꾸지 않았다. 독립 verifier도 code/fixture 3상태는 PASS, actual continuous desktop/mobile은 unverified로 판정했다.

## Blockers

없음. `.codex-remote-attachments/`는 사용자 원본 자료이며 배포·commit 대상이 아니다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`. Its contact ideas were compared; this task independently replaced the blocking assumptions and did not merge or delete the candidate.
