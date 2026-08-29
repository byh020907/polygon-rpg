# Polygon RPG

Canvas 2D와 브라우저 기본 JavaScript 모듈로 만드는 웹 2D 액션 RPG입니다.

공용 기반과 엔진 구조를 구현할 때는 로컬 `ball-fight-simulator`와 `baeseongjin` 저장소를 1차 레퍼런스로 사용합니다. 적용 기준은 [`docs/reference-repositories.md`](./docs/reference-repositories.md)에 정리되어 있습니다.

## 시작하기

```bash
npm install
npm run dev
```

Node.js 내장 모듈로만 구성된 개발 서버가 `http://127.0.0.1:5173/`을 엽니다. Vite 같은 빌드 도구나 번들 단계는 사용하지 않습니다. 주소를 브라우저에서 연 뒤 메인 메뉴에서 `새 게임 시작`을 선택하면 첫 생활 영역인 왕립 마법학교 학원촌에 캐릭터가 생성됩니다. `←/→`로 이동하고 `↑/↓`로 점프와 방어를 실행하며, 이동 중 `↓`를 누르면 해당 방향으로 구릅니다. `A/S`는 기본·강한 공격이며 `AA/AS/SA` 조합으로 찌르기·올려베기·회전 공격을 실행합니다. 지정된 계단 근처에서는 `↑/↓`가 앞·뒤 깊이 레인 전환으로 우선 동작합니다. `렌더 연구실`에서는 같은 GameScene의 Polygon/Retro 출력과 낮/밤 상태를 비교할 수 있습니다.

## 모바일 검증

Windows에 `cloudflared`를 한 번 설치합니다.

```powershell
winget install --id Cloudflare.cloudflared --exact
```

이후 원본 명령이나 PowerShell 단축 명령으로 로컬 서버와 임시 Cloudflare Quick Tunnel을 함께 실행합니다.

```bash
npm run dev:mobile
# PowerShell profile shortcut
dev
```

터미널에 출력되는 `모바일 검증 열기` 하이퍼링크나 바로 아래의 `https://...trycloudflare.com` 주소를 사용합니다. 같은 Wi-Fi에 연결할 필요는 없습니다. `Ctrl+C`를 누르면 로컬 서버만 종료되고 터널과 URL은 유지됩니다. 다시 `dev`를 실행하면 기다리지 않고 같은 터널에 서버만 연결됩니다. 검증을 마친 뒤 `dev stop-tunnel`로 터널을 명시적으로 종료합니다. 현재 주소만 다시 확인하려면 `dev url`을 사용합니다.

Quick Tunnel은 인증이 없는 공개 개발 주소입니다. 실행 중인 주소를 신뢰할 수 없는 사람에게 공유하지 말고 저장 데이터나 비밀값을 검증 환경에 두지 않습니다. 이 경로는 모바일 개발 검증 전용이며 공개 배포에는 GitHub Pages를 사용합니다. `%USERPROFILE%\.cloudflared\config.yml` 또는 `config.yaml`이 있으면 Quick Tunnel이 동작하지 않을 수 있습니다. 자세한 제약은 [Cloudflare Quick Tunnels 문서](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)를 확인합니다.

전체 월드는 학원촌을 중심으로 숲·밀림, 해변·바닷속, 협곡·화산, 산·설원 권역을 청크 단위로 확장합니다. 생활 영역, 필드, 던전, 깊이 레인과 조건 패치 계약은 [`docs/world-map-system.md`](./docs/world-map-system.md)를 따릅니다.

전투 animation은 관절별 회전을 직접 keyframe으로 저장하지 않습니다. 손과 방패의 Effector Target, 검 방향과 몸통 의도만 frame 데이터로 정의하고 Two-Bone IK가 팔꿈치와 손목 결과를 자동 계산합니다. 자세한 계약은 [`docs/animation-system.md`](./docs/animation-system.md)를 따릅니다.

터치 기기와 폭 900px 이하 화면에서는 이동·점프·방어 방향 pad와 기본공격 X·강한공격 Y 버튼을 Canvas 위에 표시합니다. 키보드 A/S와 모바일 X/Y는 같은 조합형 input snapshot을 사용하며, 자세한 계약은 [`docs/input-system.md`](./docs/input-system.md)를 따릅니다.

첫 맵의 앞쪽 레인 캐릭터는 무기와 그림자를 제외한 idle silhouette가 약 `32×45` World unit이며, `48×48` logical cell 안에서 작은 머리·좁은 몸통·긴 사지의 전신 bone pose를 사용합니다. 뒤쪽 레인에서는 같은 presentation geometry에 lane visual scale만 적용합니다. 게임 HUD는 Canvas 좌상단의 HP/STAMINA/MENTAL/MONEY 최소 계기판 형태를 사용합니다.

중앙광장 왼쪽 포탈에서 `↑`를 누르면 전투 실험 던전으로 이동합니다. `AS` 올려베기로 전투 몹을 띄우고 공격 도중 `↑`로 즉시 jump cancel한 뒤 이동과 함께 공중 `AA/AS/SA` 조합을 이어갈 수 있습니다. 전투 몹은 경공격·강공격·대공격과 방어·회피·피격 반응을 사용하며 HP가 0이 되면 자동 복구됩니다.

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

- `npm run dev`: 로컬 개발 서버 실행
- `npm run dev:mobile`: 영속 개발 터널을 재사용하며 로컬 서버 실행
- `dev`: PowerShell에서 터널을 재사용하며 로컬 서버 실행
- `dev url`: 실행 중인 모바일 검증 URL 출력
- `dev stop-tunnel`: 영속 개발 터널 종료
- `npm run lint`: ESLint 검사
- `npm run check`: 린트와 포맷 검사
- `npm run format`: Prettier로 포맷
- `npm run format:check`: 포맷 검사

## GitHub Pages 배포

GitHub Pages가 `main` 브랜치의 루트(`/`)를 그대로 제공합니다. 별도 빌드나 배포용 GitHub Actions는 사용하지 않습니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 대상: `index.html`, `.nojekyll`, `src/**/*.js`, `src/style.css`
- 배포 방법: `main` 브랜치에 푸시
