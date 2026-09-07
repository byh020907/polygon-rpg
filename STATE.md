# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다. Human이 main `21f4b56`의 주인공 동작 스타일이 원하는 느낌에 가깝다고 확인하고 문서 반영 후 Codex 루프 재개를 요청했다.

## Runtime Status

`RUNNING` — 현재 동작 스타일을 유지하며 남은 Human Feedback과 전체 제품 Gap을 처리한다.

## Current Phase

`Human Feedback Priority — PWA 릴리스 메타데이터·대기 업데이트 표시·저장 뒤 적용을 구현했고, 실제 지속 browser profile의 Release A → B 전환은 여전히 미검증이다.`

## Active Execution Goal

`PG-PWA-OFFLINE` / Architecture PWA Lifecycle·Persistence — `package.json` version을 source로 한 generated release metadata(`appVersion`, content fingerprint `buildId`)가 runtime과 Service Worker cache identity를 공유한다. stale metadata를 실패시키는 fixture, waiting worker metadata query, 저장 성공 뒤 SKIP_WAITING·controllerchange 단일 reload, 다른 창의 명시적 재시작 안내를 구현했다. Codex in-app Browser에서 동일 origin의 Release A(`v0.1.0`, `ef4b09aef49f`) 설치 뒤 B(`v0.1.1`, `8fea4b34056c`)를 제공했지만 A의 `새 버전을 확인하는 중` 상태가 완료되지 않았고, reload 뒤 waiting/apply UI 없이 B가 직접 실행됐다. 이 surface는 요구된 지속 site-data/worker 상태를 판독·제어하는 증거가 되지 않으므로 결과를 PASS로 추정하지 않는다. 다음 dependency는 실제 persistent browser profile에서 Release A 설치 → Release B waiting 발견 → 사용자 적용 → 저장 유지 → offline B 재실행을 관찰하는 것이다. 기존 주인공 동작 확인은 유지하며 이를 다시 폐기하지 않는다.

## Desired-State Comparison

| Area                          | Status    | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pixel depth / clean rendering | satisfied | 결정적인 불투명 surface 소유와 깊이 동률, 곡면 윤곽의 자기 가림/뒤쪽 선 침범 방지. Hue 보존 명도 처리와 불투명 외곽선. 실제 게임 연속 frame에서 기존 면 구멍·원색 반점이 사라지고 피부·천·금속이 읽힌다.                                                                                                                                                                                                                                 |
| Protagonist reference design  | satisfied | Photo1의 작은 단순 타원형 머리, 약6.85등신의 긴 팔다리, 짧은 옷자락과 크로스스트랩, 넓은 낮은 검. 작성 시 IK→Quaternion key만 저장하며 runtime은 SLERP/FK. 큰 머리·머리카락·고글·앞치마 장식 경로는 제거했다.                                                                                                                                                                                                                            |
| Sword motion and roll         | satisfied | 검을 머리 위로 들지 않고 진행 방향 반대쪽 몸 뒤로 낮게 준비→몸 앞을 가로질러 진행 방향으로 빠른 횡·사선 베기→후반 감속→복귀. 독립 실제 touch trace에서 초기 각변위가 후반보다 확연히 크고 포즈도 같은 결과로 읽힌다. 이전 full forward roll·방향 유지 달리기·stamina18·회피/이동/충돌 계약은 유지된다.                                                                                                                                   |
| Shared geometry / contact     | satisfied | 11종×5장비 canonical reach/타이밍·좌우·중복 피해·guard 검증 PASS. 새 긴 다리도 실제 outline의 hurt를 공유한다. 최신 횡·사선 모션의 fresh collector heavy58→38 및 mobile airSlash58→46 공중 접촉→착지를 실제 입력으로 확인했다.                                                                                                                                                                                                           |
| PWA release update            | gap       | `v0.1.1`과 deterministic buildId가 메뉴와 Service Worker에서 같은 release metadata를 읽고 focused metadata/lifecycle fixture는 PASS. Codex in-app Browser A→B 시도는 A의 update-check pending과 apply UI 없는 B 직접 실행만 관찰했으며, 지속 site-data 상태를 증명하지 못했다. 실제 persistent browser profile에서 site data를 유지한 Release A → B waiting discovery·apply·offline B를 아직 관찰하지 못했으므로 완료로 추정하지 않는다. |
| Remaining product             | gap       | 대사 용어·미검증 전체 캠페인은 이 범위에서 완료로 추정하지 않는다. INBOX 원문과 이전 OpenCode candidate는 보존한다.                                                                                                                                                                                                                                                                                                                      |

## Verification

- Full permission preflight 적용, guard free 확인 후 인수. 사용자 첨부만 untracked였고 수정·삭제·stage하지 않았다.
- 독립 실제 mobile touch: `artifacts/independent-backload-mobile`의 실제 touch 연속 frame. 새 비율·깨끗한 pixel·좌우 roll·머리 위 들기 없는 뒤→앞 횡사선 베기와 감속 판독 PASS.
- 실제 게임/동일 renderer 투명 frame sheet: `artifacts/crossbody-final-desktop`, `artifacts/crossbody-final-mobile`, `artifacts/crossbody-final-air-mobile`. 캡처의 원래 timestamp로 timeline 재생한다.
- Reference는 사용자 Photo1 및 MotionReferenceCatalog에 기록한 GDQuest/itch.io 원문 tutorial을 study-only로 사용했다. 외부 동작 asset은 import하지 않았다.
- 독립 motion/body/depth 검증 및 `test:combat`, `test:character`, `test:visual` PASS. 전체 `npm run check` PASS. 최신 횡·사선 pose에서 contact·continuity·공간/복구 journey 및 PWA inventory를 재검증했다.
- `3e47cc1`·`fb75a91` feedback-only commit을 최신 main에서 비재작성 통합했고 모든 INBOX 문구를 보존했다.
- `npm run release:metadata`, `npm run test:pwa`, `npm run lint`, `npm run format:check`, `git diff --check` PASS. 인앱 Browser의 fresh local origin에서 `PRE-ALPHA · v0.1.1`과 `BUILD · c35413ae33e3` 메뉴 표시를 판독했다. 독립 verifier는 fixture와 구현 경로는 PASS, 실제 Release A → B/offline browser flow는 미검증이라고 판정했다.
- 2026-09-07 Codex in-app Browser의 isolated local origin에서 release metadata가 다른 A(`v0.1.0`/`ef4b09aef49f`)를 연 뒤 같은 origin 서버를 B(`v0.1.1`/`8fea4b34056c`)로 바꿨다. A 화면은 `새 버전을 확인하는 중`에서 완료 상태로 바뀌지 않았고, reload 뒤 update waiting·apply UI 없이 B metadata가 직접 표시됐다. 110개 offline asset HEAD는 모두 200이고 `npm run test:pwa`는 PASS였으나, 이 browser surface가 요구한 persistent worker/site-data lifecycle을 증명하지 못했으므로 PWA gap을 유지한다.
- Fresh-context independent verifier: `npm run test:pwa`와 `git diff --check` PASS. release metadata·cache·save-before-apply 구현 계약은 code inspection상 정합하지만 fixture는 waiting worker를 주입하는 fake adapter라 persistent A→B discovery·controller change·save 유지·offline B를 증명하지 못한다고 판정했다. 따라서 PWA Goal은 partial pass이며 gap을 유지한다.

## Blockers

없음. `.codex-remote-attachments/`는 사용자 원본 자료이며 배포·commit 대상이 아니다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`. Its contact ideas were compared; this task independently replaced the blocking assumptions and did not merge or delete the candidate.
