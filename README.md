# Polygon RPG

Canvas 2D와 브라우저 기본 JavaScript 모듈로 만드는 웹 2D 액션 RPG입니다.

공용 기반과 엔진 구조를 구현할 때는 로컬 `ball-fight-simulator`와 `baeseongjin` 저장소를 1차 레퍼런스로 사용합니다. 적용 기준은 [`docs/reference-repositories.md`](./docs/reference-repositories.md)에 정리되어 있습니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버가 안내하는 로컬 주소를 브라우저에서 연 뒤 메인 메뉴에서 `새 게임 시작`을 선택하면 첫 생활 영역인 왕립 마법학교 학원촌에 캐릭터가 생성됩니다. `←/→`로 이동하고 `Space`로 점프합니다. `A/S/Q/W/E`는 서로 다른 검 공격, `↑/↓`는 방어와 앉기를 실행하며 지정된 계단 근처에서는 앞·뒤 깊이 레인 전환으로 우선 동작합니다. `렌더 연구실`에서는 같은 GameScene의 Polygon/Retro 출력과 낮/밤 상태를 비교할 수 있습니다.

전체 월드는 학원촌을 중심으로 숲·밀림, 해변·바닷속, 협곡·화산, 산·설원 권역을 청크 단위로 확장합니다. 생활 영역, 필드, 던전, 깊이 레인과 조건 패치 계약은 [`docs/world-map-system.md`](./docs/world-map-system.md)를 따릅니다.

전투 animation은 관절별 회전을 직접 keyframe으로 저장하지 않습니다. 손과 방패의 Effector Target, 검 방향과 몸통 의도만 frame 데이터로 정의하고 Two-Bone IK가 팔꿈치와 손목 결과를 자동 계산합니다. 자세한 계약은 [`docs/animation-system.md`](./docs/animation-system.md)를 따릅니다.

터치 기기와 폭 900px 이하 화면에서는 이동·점프·방어·앉기와 A/S/Q/W/E 공격 버튼을 Canvas 위에 표시합니다. 키보드와 모바일은 별도 adapter를 거쳐 같은 input snapshot을 사용하며, 자세한 계약은 [`docs/input-system.md`](./docs/input-system.md)를 따릅니다.

첫 맵의 앞쪽 레인 캐릭터 본체는 무기와 그림자를 제외하고 약 `35×48` World unit으로, `48×48` logical cell 안에 들어가는 크기를 사용합니다. 뒤쪽 레인에서는 같은 presentation geometry에 lane visual scale만 적용합니다. 게임 HUD는 Canvas 좌상단의 HP/STAMINA/MENTAL/MONEY 최소 계기판 형태를 사용합니다.

DOM UI는 저장소에 vendoring한 Alpine.js `3.14.9` ES Module을 사용합니다. 외부 CDN 연결 없이 모바일과 정적 Pages에서 실행되며, UI와 게임 경계는 [`docs/ui-architecture.md`](./docs/ui-architecture.md)를 따릅니다.

## 렌더 연구실

좌측 `POLYGON`과 우측 `RETRO PIXEL`은 같은 float 기반 RenderFrame을 사용합니다. 오른쪽 출력만 다음 후처리 파이프라인을 통과합니다.

```text
Screen Space
→ Pixel Snap
→ Logical Resolution Rasterization
→ Alpha Threshold
→ RGB Posterization
→ Outline
→ Nearest-neighbor Upscale
```

Pixel Size, Posterization, Outline, Alpha Threshold, Pixel Snap, Animation Speed와 Mesh/Pixel Grid 표시를 실행 중 변경할 수 있습니다. 내부 책임과 좌표계는 [`docs/rendering-pipeline.md`](./docs/rendering-pipeline.md)를 따릅니다.

## 명령어

- `npm run dev`: 개발 서버 실행
- `npm run lint`: ESLint 검사
- `npm run check`: 린트와 포맷 검사
- `npm run format`: Prettier로 포맷
- `npm run format:check`: 포맷 검사

## GitHub Pages 배포

GitHub Pages가 `main` 브랜치의 루트(`/`)를 그대로 제공합니다. 별도 빌드나 배포용 GitHub Actions는 사용하지 않습니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 대상: `index.html`, `.nojekyll`, `src/**/*.js`, `src/style.css`
- 배포 방법: `main` 브랜치에 푸시
