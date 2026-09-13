# HTML 문서 기본 포맷

모든 HTML 문서는 `PRODUCT_GOAL.html`과 같은 나무위키형 문서 구조를 기본으로 사용한다. 기존 문서의 내용·역할·stable ID·참조 링크는 보존한다.

## 적용 범위

- 공식 제품 명세와 위키: `PRODUCT_GOAL.html`
- 제작 안내, 계약, 인물·지역·리소스 목록: `docs/art-handoff/**/*.html`
- 자동 생성 검증 보고서와 캡처 재생 문서: `artifacts/*/index.html`, `artifacts/*/timeline.html`
- 이후 추가하는 읽기용 HTML 문서와 보고서

게임 화면인 루트 `index.html`, PWA의 `offline.html`, 테스트용 HTML fixture는 앱 또는 테스트의 기능을 위한 화면으로 이 문서 틀을 적용하지 않는다. Markdown 문서는 확장자를 바꾸지 않는다.

## 공통 원본

- `docs/wiki.css`: Product Goal과 나머지 문서가 공유하는 색·글꼴·레이아웃·모바일·인쇄 규칙
- `scripts/wiki-document.mjs`: 생성 문서의 공통 HTML 틀과 목차·절 번호 생성
- `scripts/generate-art-handoff.mjs`: 공통 틀에 실제 제작 문서 내용을 전달
- 검증 보고서 생성기는 `wrapWikiReport` 또는 `renderWikiDocument`를 사용한다. 다운로드한 보고서도 단독으로 열리도록 공통 CSS를 HTML에 포함한다.

`PRODUCT_GOAL.html` 자체는 Product Desired State의 유일한 원본 HTML로 유지한다. 별도 Markdown 원본이나 사후 생성본을 만들지 않는다. 내용이 바뀌지 않는 스타일 수정은 공통 CSS에서 한다.

## 필수 구조

청록색 전역 바, 회색 바탕과 흰 문서 면, 좌측 관련 문서 탐색, 제목·문서 도구·분류, 기본으로 펼쳐진 접이식 목차, 번호가 붙은 절 제목, 경계가 선명한 표를 사용한다. 넓은 화면에는 우측 문서 내 탐색을 표시한다.

문서마다 `h1`은 하나다. 본문은 semantic `h2`/`h3`, `section`, `table`, `figure`/`figcaption`과 목록으로 작성한다. 제목과 목차 번호는 HTML 텍스트로 존재하며 CSS나 JavaScript에만 숨기지 않는다. 기존 ID는 바꾸지 않고 새 목차 ID는 기존 ID와 충돌하지 않게 생성한다.

읽기용 문서의 내용과 이동에는 JavaScript를 요구하지 않는다. 재생·탐색 기능이 필요한 검증 보고서의 스크립트는 보존한다. 문서 스타일 때문에 실제 캡처 이미지, 시간 정보 또는 재생 속도를 변경하지 않는다.

## 좁은 화면과 인쇄

모바일에서는 사이드바를 숨기고 본문과 목차를 먼저 읽을 수 있게 한다. 긴 표는 표 영역 안에서 가로 스크롤하며 페이지 전체가 옆으로 밀리지 않게 한다. 긴 ID·경로는 줄바꿈하고 이미지 비율을 유지한다.

인쇄에서는 전역 바·사이드바·문서 도구를 숨기고 본문·표·그림을 읽을 수 있게 한다. 확대용 이미지·영상이 있는 보고서도 문서 제목과 캡션이 함께 남아야 한다.

## 갱신과 확인

제작 문서는 생성 결과를 손으로 고치지 않고 생성 원본을 바꾼 뒤 `npm run docs:art`로 다시 만든다. `npm run docs:art:check`에서 최신성·링크·ID를 확인한다. Product Goal 및 대표 제작 문서는 desktop/mobile/print 화면을 검사한다.

기존 캡처 보고서의 표시만 갱신할 때는 원래의 캡처 PNG·데이터 JSON을 보존하고 공통 틀로 HTML을 다시 만든다. 스타일 변경 때문에 실제 플레이나 캡처를 새로 실행할 필요는 없다.

`node scripts/format-html-reports.mjs`는 저장된 보고서의 변경 대상을 미리 보여 준다. `--write`는 표시만 갱신하고 `--check`는 공통 스타일과 일치하는지 검사한다. 이미 위키 형식인 보고서도 공통 CSS 변경을 반영한다.
