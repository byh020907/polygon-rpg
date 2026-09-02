# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`verified-playable-frontier · prologue yard combat verified; next: deepen the 20–30 minute intro exploration-and-combat density`

## Project Direction Comparison

| Direction | Status | Current Evidence                                                                                                                                                                                           |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona   | gap    | 정식 의뢰→라이벌 동행→ambient 이동 대화→소형 수거 유닛 전투→현장 조사→붕괴→구조·각성·D-30→차고 0% 흐름은 실제 조작과 저장 stage로 이어진다. 여러 탐색 구간·반복 정찰·각 지역 고유 조우와 결말은 아직 없다. |
| Quality   | gap    | `test:intro`, `test:combat`, `test:character`, `test:pwa`, actual Browser desktop/mobile가 이 slice의 전투·silhouette·PWA asset을 통과했다. 약 10시간 캠페인 전체의 밀도와 ending polish는 남았다.         |

## Product Desired State Comparison

| Reference            | Status    | Current Evidence                                                                                                                                                                                         |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL    | gap       | 120Hz keyboard/touch combat fixture와 도입 `yard-scout-collector`의 Basic/Guard 목표·실제 combat owner 연결은 PASS. giant final-battle actual combat은 남았다.                                           |
| PG-SCRAP-AWAKENING   | gap       | 의뢰·동행 뒤 `YARD_CLEARANCE`에서 ambient 이동 대화와 소형 수거 유닛을 통과해야 `YARD_SEARCH`·붕괴로 진행하며 completion stage는 reload 뒤 재조우하지 않는다. 20–30분 분량·여러 탐색/전투 beat는 남았다. |
| PG-OPEN-CAMPAIGN     | gap       | 다섯 region issue graph·part·route transaction은 있으나 실제 10시간 밀도와 linked issue 고유 encounter는 남았다.                                                                                         |
| PG-STORY-DELIVERY    | gap       | role-name bubble, ambient 이동 대화, blocking 독백과 짧은 objective 경계가 있다. 전체 지역 story flow는 남았다.                                                                                          |
| PG-CAST-CONTINUITY   | gap       | 사용자 노출 `주인공`·`라이벌`·`고물상인`은 single immutable `SCRAP_CAST` profile에서 대사·상태·지도·silhouette로 투영되고 stable ID/저장과 분리된다. 반복 지역 cast after-state는 남았다.                |
| PG-CAMPAIGN-TIME     | gap       | D-30·네 segment·preview/idempotence·route detour fixture는 PASS; 전체 pacing 체감은 남았다.                                                                                                              |
| PG-OPERATION-MAP     | gap       | HUD/wall-map shared read model은 PASS; 실제 완료 route geometry patch는 남았다.                                                                                                                          |
| PG-SCRAP-GROWTH      | gap       | equipment/enchant persistence는 있으나 growth NPC와 모든 regional material 표현은 남았다.                                                                                                                |
| PG-SCRAP-READABILITY | gap       | 도입 collector와 nonlethal human profile은 있으나 region별 spectrum은 남았다.                                                                                                                            |
| PG-VISUAL-FIDELITY   | gap       | Desktop 1280×720·mobile 844×390에서 low-saturation yard, rival/collector silhouette, HUD와 no overflow/error를 확인했다. 전체 region 확장은 남았다.                                                      |
| PG-FINAL-BATTLE      | gap       | state/ledger fixture는 있으나 giant actual flow·epilogue map patch는 남았다.                                                                                                                             |
| PG-PLATFORM-ACCESS   | gap       | keyboard/touch, URL QA, installed Android Human scale evidence가 있다. final-battle touch flow와 iOS verification은 남았다.                                                                              |
| PG-RECOVERY          | satisfied | pre-action/morning/core-event slots와 corrupt failure/atomic recovery fixture가 있다.                                                                                                                    |
| PG-PWA-OFFLINE       | gap       | cache inventory에 cast profile을 포함한 PWA fixture는 PASS. iOS install·fresh offline/update failure Browser evidence는 남았다.                                                                          |

## Engineering Desired State Comparison

| Architecture Area         | Status    | Current Evidence                                                                                                                                                                               |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime / Lifecycle       | satisfied | Static ESM, 120Hz fixed runner와 scoped scene lifecycle을 유지한다.                                                                                                                            |
| Module / State Ownership  | gap       | `SCRAP_CAST` is immutable authored display data; Campaign owner alone commits awakening stage, while Room combat emits a typed completion result. Legacy academy/world-time ownership remains. |
| Campaign / World Time     | gap       | stage target guard, persistence and five-region campaign fixtures pass; linked issue encounter depth remains.                                                                                  |
| Combat / Character        | gap       | `yard-scout-collector` reuses shared command/contact authority and presentation profile; full body/movement spectrum and giant profile remain.                                                 |
| World / Story             | gap       | stage patches gate combat before investigation; transcripts/map IDs remain stable across display-name changes. More intro exploration and regional flow remain.                                |
| Rendering / Accessibility | gap       | Browser desktop/mobile confirmed 16:9 canvas, overflow 0 and console warn/error 0 for intro combat; full campaign visual QA remains.                                                           |
| PWA / Persistence         | gap       | display profile is versioned-cache inventory; typed progress schema does not serialize display names. iOS/offline/update evidence remains.                                                     |
| Testing / Verification    | gap       | `npm run test:intro`, `test:combat`, `test:character`, `test:pwa`, Prettier, ESLint and diff whitespace PASS; physical iOS and broader campaign visual evidence remain.                        |

## Active Execution Goal

없음. 도입 수거장 첫 전투와 역할명 feedback은 검증 완료했다. 다음 Goal은 이 전선을 유지하며 20–30분 도입에 필요한 추가 탐색·전투 밀도를 실제 조작/저장/viewport로 확장한다.

## Blockers

없음.
