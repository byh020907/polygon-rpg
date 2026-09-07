# Product Goal Loop State

현재 Desired State 대비 제품 상태의 파생 snapshot이다. 자동 루프는 Human pause를 유지한다.

## Runtime Status

`RUNNING` — 이번 수동 작업은 깊이 픽셀 정리·첨부 기반 주인공 재설계·머리 위 들기 없는 횡·사선 베기에 한정한다.

## Current Phase

`Human Feedback Priority — 사용자 확인 뒤 새로 요청한 depth overlap 정리와 Photo1 기반 디자인·횡·사선 베기의 구현·독립 검증 완료.`

## Active Execution Goal

불투명 pixel 소유/외곽선과 Retro 색 처리 → 작은 머리·긴 팔다리·짧은 작업상의·스트랩·넓은 검의 공용 rig/geometry → 준비보다 빠른 베기와 감속 → 정상 입력·투명 출력·desktop/mobile 연속 frame 및 독립 검증 순서다. 최신 요청대로 검을 몸 옆·뒤로 당겨 앞을 가로지르는 횡·사선 베기로 구성했다. 디자인·픽셀·구르기·베기 속도감과 실제 공중 접촉은 독립 판독을 통과했다. 자동 실행은 Human pause를 유지하며 전체 캠페인의 완료를 뜻하지 않는다.

## Desired-State Comparison

| Area                          | Status    | Current evidence                                                                                                                                                                                                                                                                                       |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pixel depth / clean rendering | satisfied | 결정적인 불투명 surface 소유와 깊이 동률, 곡면 윤곽의 자기 가림/뒤쪽 선 침범 방지. Hue 보존 명도 처리와 불투명 외곽선. 실제 게임 연속 frame에서 기존 면 구멍·원색 반점이 사라지고 피부·천·금속이 읽힌다.                                                                                               |
| Protagonist reference design  | satisfied | Photo1의 작은 단순 타원형 머리, 약6.85등신의 긴 팔다리, 짧은 옷자락과 크로스스트랩, 넓은 낮은 검. 작성 시 IK→Quaternion key만 저장하며 runtime은 SLERP/FK. 큰 머리·머리카락·고글·앞치마 장식 경로는 제거했다.                                                                                          |
| Sword motion and roll         | satisfied | 검을 머리 위로 들지 않고 진행 방향 반대쪽 몸 뒤로 낮게 준비→몸 앞을 가로질러 진행 방향으로 빠른 횡·사선 베기→후반 감속→복귀. 독립 실제 touch trace에서 초기 각변위가 후반보다 확연히 크고 포즈도 같은 결과로 읽힌다. 이전 full forward roll·방향 유지 달리기·stamina18·회피/이동/충돌 계약은 유지된다. |
| Shared geometry / contact     | satisfied | 11종×5장비 canonical reach/타이밍·좌우·중복 피해·guard 검증 PASS. 새 긴 다리도 실제 outline의 hurt를 공유한다. 최신 횡·사선 모션의 fresh collector heavy58→38 및 mobile airSlash58→46 공중 접촉→착지를 실제 입력으로 확인했다.                                                                         |
| Remaining product             | gap       | PWA update metadata·대사 용어·미검증 전체 캠페인은 이 범위에서 완료로 추정하지 않는다. INBOX 원문과 이전 OpenCode candidate는 보존한다.                                                                                                                                                                |

## Verification

- Full permission preflight 적용, guard free 확인 후 인수. 사용자 첨부만 untracked였고 수정·삭제·stage하지 않았다.
- 독립 실제 mobile touch: `artifacts/independent-backload-mobile`의 실제 touch 연속 frame. 새 비율·깨끗한 pixel·좌우 roll·머리 위 들기 없는 뒤→앞 횡사선 베기와 감속 판독 PASS.
- 실제 게임/동일 renderer 투명 frame sheet: `artifacts/crossbody-final-desktop`, `artifacts/crossbody-final-mobile`, `artifacts/crossbody-final-air-mobile`. 캡처의 원래 timestamp로 timeline 재생한다.
- Reference는 사용자 Photo1 및 MotionReferenceCatalog에 기록한 GDQuest/itch.io 원문 tutorial을 study-only로 사용했다. 외부 동작 asset은 import하지 않았다.
- 독립 motion/body/depth 검증 및 `test:combat`, `test:character`, `test:visual` PASS. 전체 `npm run check` PASS. 최신 횡·사선 pose에서 contact·continuity·공간/복구 journey 및 PWA inventory를 재검증했다.
- `3e47cc1`·`fb75a91` feedback-only commit을 최신 main에서 비재작성 통합했고 모든 INBOX 문구를 보존했다.

## Blockers

없음. Codex heartbeat/OpenCode runner 정지 유지. `.codex-remote-attachments/`는 사용자 원본 자료이며 배포·commit 대상이 아니다.

## Preserved Work Reference

OpenCode candidate `opencode/product-goal-loop/20260905142359-2188ab1adfbe` at `0d5a9dc` remains unmerged in `C:/Users/byh02/AppData/Local/ProductGoalLoop/OpenCode/d76ddb28cc8ea5fa/worktrees/20260905142359-2188ab1adfbe`. Its reports remain in `.git/product-goal-loop/opencode/executions/20260905142359-2188ab1adfbe.json`. Its contact ideas were compared; this task independently replaced the blocking assumptions and did not merge or delete the candidate.
