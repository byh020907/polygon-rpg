import Alpine from './vendor/alpine.esm.js';
import { GameApplication } from './app/GameApplication.js';
import { readDebugQaRequest } from './ui/DebugConfigurationAdapter.js';
import { registerGameShell } from './ui/gameShell.js';

function requireCanvas(id) {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`#${id} Canvas를 찾을 수 없습니다.`);
  }
  return canvas;
}

const visualQaRequest = readDebugQaRequest();
const gameApplication = new GameApplication({
  gameCanvas: requireCanvas('game-canvas'),
  polygonCanvas: requireCanvas('polygon-canvas'),
  retroCanvas: requireCanvas('retro-canvas'),
  visualQaRequest,
});

registerGameShell(Alpine, gameApplication, { visualQaRequest });
globalThis.Alpine = Alpine;
Alpine.start();
globalThis.addEventListener('pagehide', () => gameApplication.destroy(), { once: true });
