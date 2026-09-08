# 그래픽 리소스 검토

메인 메뉴의 **POLYGON RPG 제목** 또는 게임 화면의 **MENU/MAP**을 1초 누른 뒤 **전체 그래픽 리소스 검토**를 선택한다. 지도 해금 전 시작 구간에서도 사용할 수 있다. 개발 서버의 `/?graphicsReview=1`로 바로 열 수도 있다. 일반 게임 메뉴와 플레이에는 검토용 ID나 프레임 제어를 표시하지 않는다.

종류와 이름/ID 검색으로 리소스를 고른다. **개별 보기**와 **실제 장면 배치**, Retro/Polygon, 실제 크기와 2×/4× 확대, 방향과 조명을 비교한다. 장면 리소스는 원래 배치와 광원을 사용한다. UI는 1280×720 또는 844×390의 실제 게임 컴포넌트를 표시하며 확대는 그 viewport를 유지한다.

움직이는 리소스는 동작마다 전체 프레임 행이 있다. 프레임을 누르거나 이전/다음·숫자·슬라이더로 이동하고 **정상 속도 재생**으로 본다. 행 내부에서는 좌우 방향키로 프레임을 이동한다. 한 동작의 모든 프레임은 같은 카메라와 크기로 표시한다. 동작의 원본이 고정 자세인 경우 그렇게 표시한다.

**선택 · 재현 조건 복사**를 눌러 관리 대화에 붙여넣고 관찰한 문제를 덧붙인다. resource/action/frame ID, 원본 pose ID, renderer, 방향, 조명, 배율, UI viewport와 재현 URL이 함께 복사된다. Clipboard를 사용할 수 없는 환경에서는 선택된 텍스트를 직접 복사한다. 복사 전까지 외부 피드백을 전송하지 않으며 복사 후에도 관리 대화 전송은 사용자가 한다.

## 등록 경로

`src/graphics/GraphicsResourceCatalog.js`가 목록을 소유하고 `GraphicsResourceSampler.js`가 production producer를 호출한다. 게임·fixture·검토 scene은 `src/app/createGameScene.js`의 같은 composition을 쓴다. UI 목록은 `src/ui/GameUiCatalog.js`에서 이 catalog에 등록하며 자체 그림이나 중복 markup을 작성하지 않는다.

| 원본                                   | 등록 방식                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 맵의 배경·전경·지형·건물·설비·소품·NPC | 모든 원본 `renderItems`를 비활성 상태까지 자동 등록. `graphics: {category, groupId, label}`로 사람이 검토할 조립 묶음과 이름을 지정할 수 있다.       |
| 맵 변화                                | 원본 patch와 영향받은 ID를 추적. 실제 `MapRuntime`이 조건을 resolve한 결과를 장면으로 표시한다.                                                      |
| 주인공·장비                            | 동일한 motion clock·pose sampler·공격 사이징·shared geometry·presentation producer. 장비 catalog와 timing profile에서 목록을 만든다.                 |
| 몹                                     | 현재 encounter catalog 전체. 배치된 profile과 미배치 authored profile을 구분한다. 공격 준비·공격·회수와 체형별 reaction을 production에서 sample한다. |
| 효과·적 상태 UI                        | 실제 Player/Enemy presentation producer의 event·상태별 표본. 검 궤적은 주인공·장비 공격 행에서도 확인한다.                                           |
| 최종전                                 | production final-battle stage와 실제 장면, 조립 요소별 보기.                                                                                         |
| DOM UI·앱 아이콘                       | `GameUiCatalog`에 실제 selector와 재현 scenario 또는 원본 PNG를 등록한다. 같은 게임 페이지·CSS·Alpine component를 표시한다.                          |

새 map leaf는 분류 metadata가 없어도 목록에서 빠지지 않는다. 사람이 찾기 좋은 묶음과 이름은 원본의 `graphics` metadata에서 정한다. 새로운 producer나 UI component는 공통 catalog에 등록하고 coverage fixture에도 원본과의 연결을 추가한다. `npm run test:graphics`는 원본 맵 요소·patch·적·장비의 누락, stable ID 중복과 샘플 오류, production 출력과의 불일치 및 URL 왕복을 실패시킨다.

## 현재 범위와 의도적 제외

- 현재 캠페인의 16개 방과 434개 원본 맵 그림을 포함한다. 처음 비활성인 181개도 개별 보기와 상태 변형에서 찾을 수 있다. 최신 count와 각 category 수는 검토 화면의 **등록 범위 · 제외 항목**에서 읽는다.
- 현재 고철 적 profile 21개 중 16개는 맵에 배치되어 있고 5개는 아직 미배치다. 미배치도 검토 목록에는 남는다. 무기·방패 장비 5종과 실제 NPC의 정적/작업 상태 표현을 포함한다.
- NPC와 현재 최종 로봇의 없는 시간축 애니메이션을 검토실에서 만들어내지 않는다. authored 상태 전환과 정적 그림으로 표시한다. 적의 고정 피격·방어·종료 자세도 고정임을 표시한다.
- collision surface·trigger·portal·story entity 자체는 그림이 아니다. 연결된 render item과 patch provenance가 검토 대상이다. 검토 패널·입력 relay·옛 렌더 연구실의 개발 도구 chrome은 게임 리소스 inventory에서 제외한다.
- 로딩 중 전용 DOM과 JavaScript 비활성 안내는 bootstrap 상태이므로 정상 게임 UI 표본에서 제외한다. 최초 offline fallback은 별도 `offline.html` 원본으로 관리하며 PWA 검증 범위에 포함한다. 설치 시스템 창·persistent PWA A→B는 Human 확인 대상이다.
- 사용자 원본 첨부·참고 이미지와 미완료 OpenCode candidate는 원본 보존·비교 대상이다. 현행 게임 리소스로 등록하거나 덮어쓰지 않는다. 폐기한 학원·봉인숲·Glasswind 전용 그림·도메인·debug scene은 목록에 남기지 않는다.

## 검증과 evidence

`npm run check`에 graphics fixture가 포함된다. `npm run graphics:qa`는 desktop 1280×720과 mobile 844×390에서 category, frame controls, 정상 재생/정지, 선택 복사, URL 복원과 일반 게임 복귀를 실제 browser 입력으로 검증한다. `npm run graphics:ui-qa`는 production UI별 실제 표시 여부와 PNG를 검사한다. 결과는 `artifacts/graphics-review/`에 생성된다.

Fixture 통과는 시각적 만족이나 전체 캠페인 완료를 의미하지 않는다. PNG와 연속 프레임은 직접 판독하고 독립 verifier가 요구와 대조한다. 이 검토실은 Human이 정확한 대상과 조건으로 시각 결과를 평가하기 위한 환경이다.
