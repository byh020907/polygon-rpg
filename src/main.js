import Alpine from './vendor/alpine.esm.js';
import { GameApp } from './app/GameApp.js';
import { readVisualQaRequest } from './app/VisualQaConfig.js';
import { registerGameShell } from './ui/gameShell.js';

function requireCanvas(id) {
  const canvas = document.getElementById(id);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`#${id} Canvas를 찾을 수 없습니다.`);
  }
  return canvas;
}

const gameApp = new GameApp({
  gameCanvas: requireCanvas('game-canvas'),
  polygonCanvas: requireCanvas('polygon-canvas'),
  retroCanvas: requireCanvas('retro-canvas'),
});

registerGameShell(Alpine, gameApp, { visualQaRequest: readVisualQaRequest() });
globalThis.Alpine = Alpine;
Alpine.start();
globalThis.addEventListener('pagehide', () => gameApp.destroy(), { once: true });
