# Product Goal Loop State

이 파일은 Desired State가 아니라 `PRODUCT_GOAL.html`, `ARCHITECTURE.md`, current code와 실행 evidence를 비교한 derived snapshot이다. 완료 이력이나 backlog를 누적하지 않는다.

## Runtime Status

`RUNNING`

## Current Phase

`verified-playable-frontier · 도입 구조 체인(YARD_SEARCH→구조 요청→독백→고물상 분석) 현장 대사를 authored transcript와 Desired State에 정렬하고 fixture로 고정했다; next: 20–30분 도입의 남은 실제 탐색·전투 밀도를 같은 흐름으로 확장한다`

## Project Direction Comparison

| Direction | Status | Current Evidence                                                                                                                                                                                                                            |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona   | gap    | 정식 의뢰→라이벌 동행→ambient 이동 대화→첫 소형 수거 유닛→안전 지지대 점검→두 번째 수거 유닛→winch 점검→현장 조사→붕괴→구조·각성·D-30→차고 0% 흐름은 실제 조작과 저장 stage로 이어진다. 여러 탐색 구간·반복 정찰·각 지역 고유 조우와 결말은 아직 없다. |
| Quality   | gap    | `test:intro`·`test:campaign`·`test:platform`과 actual Browser desktop/mobile이 이 slice의 세 단계 yard 흐름·silhouette·HUD를 통과했다. 약 10시간 캠페인 전체의 밀도와 ending polish는 남았다. |

## Product Desired State Comparison

| Reference            | Status    | Current Evidence                                                                                                                                                                                                     |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-COMBAT-CONTROL    | gap       | 120Hz keyboard/touch combat fixture와 도입 `yard-scout-collector`·`yard-brace-collector`의 Basic/Guard·Guard/Strong 목표·실제 combat owner 연결은 PASS. giant final-battle actual combat은 남았다.                   |
| PG-SCRAP-AWAKENING   | gap       | 의뢰·동행 뒤 첫 유닛→`YARD_BRACE` 지지대 점검→`YARD_PERIMETER` 두 번째 유닛→`YARD_SURVEY` winch 점검을 통과해야 `YARD_SEARCH`·붕괴로 진행하며 각 completion stage는 reload 뒤 재조우하지 않는다. 현장 조사→구조 요청→독백→고물상 분석 대사는 회수팔 직접 연결·제어핵 제거 단일 해법·수동 제어핵·중앙 지휘소 좌표를 말하며 map entity와 authored transcript 일치가 fixture로 고정된다. 기록 재생은 도입 일곱 대화+고물상 분석 8개다. 20–30분 분량의 추가 탐색/전투 beat는 남았다. |
| PG-OPEN-CAMPAIGN     | gap       | 다섯 region issue graph·part·route transaction은 있으나 실제 10시간 밀도와 linked issue 고유 encounter는 남았다.                                                                                                     |
| PG-STORY-DELIVERY    | gap       | role-name bubble, ambient 이동 대화, 지지대 점검 대화, `YARD_SURVEY` winch 점검 대화, blocking 독백과 짧은 objective 경계가 있다. 구조 체인 4개 현장 interaction의 대사는 authored transcript와 동일하며 하단 설명 없이 말풍선·행동으로 구조 이유를 전달한다. 전체 지역 story flow는 남았다.                                                      |
| PG-CAST-CONTINUITY   | gap       | 사용자 노출 `주인공`·`라이벌`·`고물상인`은 single immutable `SCRAP_CAST` profile에서 대사·상태·지도·silhouette로 투영되고 stable ID/저장과 분리된다. 반복 지역 cast after-state는 남았다.                            |
| PG-CAMPAIGN-TIME     | gap       | D-30·네 segment·preview/idempotence·route detour fixture는 PASS; 전체 pacing 체감은 남았다.                                                                                                                          |
| PG-OPERATION-MAP     | gap       | HUD/wall-map shared read model은 PASS; 실제 완료 route geometry patch는 남았다.                                                                                                                                      |
| PG-SCRAP-GROWTH      | gap       | equipment/enchant persistence는 있으나 growth NPC와 모든 regional material 표현은 남았다.                                                                                                                            |
| PG-SCRAP-READABILITY | gap       | 도입 collector, winch 받침/흉곽 표식 marker와 nonlethal human profile은 있으나 region별 spectrum은 남았다.                                                                                                            |
| PG-VISUAL-FIDELITY   | gap       | Desktop 1280×720·mobile 844×390에서 low-saturation yard, rival/collector silhouette, `YARD_SURVEY` marker·HUD와 no overflow/error를 `scrap-intro-survey` actual PNG로 확인했다. 전체 region 확장은 남았다.          |
| PG-FINAL-BATTLE      | gap       | state/ledger fixture는 있으나 giant actual flow·epilogue map patch는 남았다.                                                                                                                                         |
| PG-PLATFORM-ACCESS   | gap       | keyboard/touch, URL QA(`scrap-intro-survey` debug scenario 포함), installed Android Human scale evidence가 있다. final-battle touch flow와 iOS verification은 남았다.                                                 |
| PG-RECOVERY          | satisfied | pre-action/morning/core-event slots와 corrupt failure/atomic recovery fixture가 있다.                                                                                                                                |
| PG-PWA-OFFLINE       | gap       | cache inventory에 cast profile을 포함한 PWA fixture는 PASS. iOS install·fresh offline/update failure Browser evidence는 남았다.                                                                                      |

## Engineering Desired State Comparison

| Architecture Area         | Status    | Current Evidence                                                                                                                                                                                                                                                                     |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime / Lifecycle       | satisfied | Static ESM, 120Hz fixed runner와 scoped scene lifecycle을 유지한다.                                                                                                                                                                                                                  |
| Module / State Ownership  | gap       | `SCRAP_CAST` is immutable authored display data; Campaign owner alone commits the three gated yard stages (`YARD_BRACE`→`YARD_PERIMETER`→`YARD_SURVEY`→`YARD_SEARCH`), while Room combat emits a typed completion result. Legacy academy/world-time ownership remains.              |
| Campaign / World Time     | gap       | `YARD_SURVEY` stage order/persistence fixtures pass with zero time cost; linked issue encounter depth remains.                                                                                                                                                                       |
| Combat / Character        | gap       | `yard-scout-collector`와 `yard-brace-collector`가 shared command/contact authority와 collector presentation profile을 재사용한다; full body/movement spectrum and giant profile remain.                                                                                              |
| World / Story             | gap       | stage patches gate first combat→brace inspection→second combat→winch survey→investigation; survey markers stay visible into `YARD_SEARCH`; transcripts/map IDs remain stable across display-name changes. 구조 체인 map entity lines는 authored transcript와 동일하며 고물상 분석 4줄에 맞춘 fixture sequence를 통과했다. More intro exploration and regional flow remain.                            |
| Rendering / Accessibility | gap       | Browser desktop 1280×720/mobile 844×390 confirmed `scrap-intro-survey` patch/markers/dialogue affordance with console error 0 and QA assertion passed; full campaign visual QA remains.                                                                                              |
| PWA / Persistence         | gap       | display profile is versioned-cache inventory; typed progress schema does not serialize display names. iOS/offline/update evidence remains.                                                                                                                                           |
| Testing / Verification    | gap       | 이번 slice에서 `test:intro`(구조 체인 transcript 일치·Desired-State 키워드 assertion 포함)·`test:campaign`·`test:story`·`test:recovery`·`test:platform`·`test:character`·`test:world`·`test:visual`(cell lighting·art direction)·Prettier를 통과했다. 새 대사 text의 actual Browser PNG 판독은 외부 창을 열지 않아 `unverified`로 남겼다(geometry·marker 변경 없음, 기존 `scrap-intro-survey` PNG 유효). `test:map`·`test:pwa`·`test:enchantment`는 이번 변경과 무관해 재실행하지 않고 직전 evidence를 유지한다. `test:journey`(dungeon guardian tick 한계)·`test:growth`(encounter boundary)·ESLint(미설치 `@eslint/js`)는 이번 변경과 무관한 기존 실패로 남았다. |

## Active Execution Goal

없음. 도입 구조 체인 현장 대사와 authored transcript 일치, stage gating·저장 경계는 검증 완료했다. 다음 Goal은 이 전선을 유지하며 20–30분 도입에 필요한 남은 탐색·전투 밀도를 실제 조작/저장/viewport로 확장한다.

## Blockers

없음.
