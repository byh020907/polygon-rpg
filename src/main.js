const canvas = document.querySelector('#game');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Game canvas를 찾을 수 없습니다.');
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('Canvas 2D context를 생성할 수 없습니다.');
}

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;
const player = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2, radius: 18, speed: 260 };
const pressedKeys = new Set();

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.round(LOGICAL_WIDTH * pixelRatio);
  canvas.height = Math.round(LOGICAL_HEIGHT * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function update(deltaSeconds) {
  const horizontal =
    Number(pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) -
    Number(pressedKeys.has('ArrowLeft') || pressedKeys.has('KeyA'));
  const vertical =
    Number(pressedKeys.has('ArrowDown') || pressedKeys.has('KeyS')) -
    Number(pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW'));
  const length = Math.hypot(horizontal, vertical) || 1;

  player.x += (horizontal / length) * player.speed * deltaSeconds;
  player.y += (vertical / length) * player.speed * deltaSeconds;
  player.x = Math.max(player.radius, Math.min(LOGICAL_WIDTH - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(LOGICAL_HEIGHT - player.radius, player.y));
}

function render() {
  context.fillStyle = '#10151f';
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  context.strokeStyle = '#1d2939';
  context.lineWidth = 1;
  for (let x = 0; x <= LOGICAL_WIDTH; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, LOGICAL_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= LOGICAL_HEIGHT; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(LOGICAL_WIDTH, y);
    context.stroke();
  }

  context.fillStyle = '#66e3c4';
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.fill();
}

let previousTime = performance.now();

function gameLoop(currentTime) {
  const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.1);
  previousTime = currentTime;
  update(deltaSeconds);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => pressedKeys.clear());
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);
