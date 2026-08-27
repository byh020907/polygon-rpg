# Polygon RPG

Canvas 2D와 브라우저 기본 JavaScript 모듈로 만드는 웹 2D 액션 RPG입니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버가 안내하는 로컬 주소를 브라우저에서 열고 `WASD` 또는 방향키로 캐릭터를 움직일 수 있습니다.

## 명령어

- `npm run dev`: 개발 서버 실행
- `npm run lint`: ESLint 검사
- `npm run check`: 린트와 포맷 검사
- `npm run format`: Prettier로 포맷
- `npm run format:check`: 포맷 검사

## GitHub Pages 배포

GitHub Pages가 `main` 브랜치의 루트(`/`)를 그대로 제공합니다. 별도 빌드나 배포용 GitHub Actions는 사용하지 않습니다.

- 공개 주소: `https://byh020907.github.io/polygon-rpg/`
- 배포 대상: `index.html`, `src/main.js`, `src/style.css`
- 배포 방법: `main` 브랜치에 푸시
