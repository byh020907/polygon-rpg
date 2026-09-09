import { createSvgAssetSession, BUILTIN_SVG_RESOURCES } from './graphics/SvgAssetSession.js';
import { readTestPlayRequest } from './ui/TestPlayConfig.js';
import Alpine from './vendor/alpine.esm.js';
import { GameApplication } from './app/GameApplication.js';
import { readDebugQaRequest } from './ui/DebugConfigurationAdapter.js';
import { registerGameShell } from './ui/gameShell.js';
import { readGraphicsReviewRequest, DEFAULT_GRAPHICS_REVIEW } from './ui/GraphicsReviewConfig.js';
import { GAME_UI_RESOURCES, APP_IMAGE_RESOURCES } from './ui/GameUiCatalog.js';

function requireCanvas(id) {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`#${id} Canvas를 찾을 수 없습니다.`);
  }
  return canvas;
}

const svgAssetSession = createSvgAssetSession();
let graphicsReviewRequest;
let graphicsReviewError = '';
try {
  graphicsReviewRequest = readGraphicsReviewRequest();
} catch (error) {
  graphicsReviewRequest = DEFAULT_GRAPHICS_REVIEW;
  graphicsReviewError = error.message;
}
let testPlayRequest = null;
try {
  testPlayRequest = readTestPlayRequest(location.href, {
    resolveSvgAsset: (id) =>
      (svgAssetSession.get(id) ?? BUILTIN_SVG_RESOURCES.find((r) => r.id === id))?.svgAsset,
  });
} catch (error) {
  graphicsReviewRequest = DEFAULT_GRAPHICS_REVIEW;
  graphicsReviewError = error.message;
}
const visualQaRequest =
  (graphicsReviewError ? null : readDebugQaRequest()) ??
  (graphicsReviewRequest ? readDebugQaRequest('?visualQa=1&gameStart=scrap-intro-walk') : null);
const qaInputEnabled = new URLSearchParams(globalThis.location.search).get('inputQa') === '1';
const gameApplication = new GameApplication({
  gameCanvas: requireCanvas('game-canvas'),
  visualQaRequest,
  qaInputEnabled,
});

let graphicsReviewController = null;
async function openGraphicsReview({
  onClose,
  onTestPlay,
  error: requestError = '',
  request = DEFAULT_GRAPHICS_REVIEW,
} = {}) {
  const [
    { GraphicsReviewController },
    { createGraphicsResourceCatalog, GRAPHICS_CATEGORIES },
    { createGraphicsResourceSampler },
  ] = await Promise.all([
    import('./ui/GraphicsReviewController.js'),
    import('./graphics/GraphicsResourceCatalog.js'),
    import('./graphics/GraphicsResourceSampler.js'),
  ]);
  graphicsReviewController?.destroy();
  const catalog = svgAssetSession.wrap(
    createGraphicsResourceCatalog({
      additionalResources: [...GAME_UI_RESOURCES, ...APP_IMAGE_RESOURCES],
    }),
  );
  graphicsReviewController = new GraphicsReviewController({
    root: document.getElementById('graphics-review'),
    catalog,
    categories: GRAPHICS_CATEGORIES,
    sampler: createGraphicsResourceSampler(catalog),
    onClose,
    onTestPlay,
  });
  graphicsReviewController.open(request);
  if (graphicsReviewError || requestError)
    graphicsReviewController.nodes.status.textContent = `재현 조건 오류 · ${requestError || graphicsReviewError}`;
}

registerGameShell(Alpine, gameApplication, {
  visualQaRequest,
  qaInputEnabled,
  testPlayRequest,
  graphicsReviewRequest,
  graphicsReviewFactory: openGraphicsReview,
});
globalThis.Alpine = Alpine;
Alpine.start();
globalThis.addEventListener(
  'pagehide',
  () => {
    graphicsReviewController?.destroy();
    gameApplication.destroy();
  },
  { once: true },
);
