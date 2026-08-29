export const COMBAT_FRAME_RATE = 60;

function assertFrameCount(value, label, { allowZero = true } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new RangeError(
      `${label}은 ${allowZero ? '0 이상' : '1 이상'}의 정수 frame이어야 합니다.`,
    );
  }
  return value;
}

export function combatFramesToSeconds(frameCount) {
  return assertFrameCount(frameCount, 'Combat frame') / COMBAT_FRAME_RATE;
}

export function defineCombatFrame({
  durationFrames,
  startupFrames,
  activeFrames,
  chainStartFrame = durationFrames,
}) {
  assertFrameCount(durationFrames, 'durationFrames', { allowZero: false });
  assertFrameCount(startupFrames, 'startupFrames');
  assertFrameCount(activeFrames, 'activeFrames', { allowZero: false });
  assertFrameCount(chainStartFrame, 'chainStartFrame');
  if (startupFrames + activeFrames > durationFrames) {
    throw new RangeError('startupFrames + activeFrames는 durationFrames를 넘을 수 없습니다.');
  }
  if (chainStartFrame > durationFrames) {
    throw new RangeError('chainStartFrame은 durationFrames를 넘을 수 없습니다.');
  }
  return Object.freeze({
    rate: COMBAT_FRAME_RATE,
    durationFrames,
    startupFrames,
    activeFrames,
    recoveryFrames: durationFrames - startupFrames - activeFrames,
    chainStartFrame,
  });
}

export function sampleCombatFrame(frameData, elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Combat elapsedSeconds는 0 이상의 유한한 숫자여야 합니다.');
  }
  const elapsedFrames = elapsedSeconds * COMBAT_FRAME_RATE;
  const frameIndex = Math.min(
    frameData.durationFrames - 1,
    Math.max(0, Math.floor(elapsedFrames + 1e-7)),
  );
  const activeEndFrame = frameData.startupFrames + frameData.activeFrames;
  const phase =
    frameIndex < frameData.startupFrames
      ? 'windup'
      : frameIndex < activeEndFrame
        ? 'strike'
        : 'recovery';
  return Object.freeze({
    rate: frameData.rate,
    index: frameIndex,
    duration: frameData.durationFrames,
    startupEnd: frameData.startupFrames,
    activeEnd: activeEndFrame,
    chainStart: frameData.chainStartFrame,
    phase,
    progress: Math.max(0, Math.min(1, elapsedFrames / frameData.durationFrames)),
    complete: elapsedFrames >= frameData.durationFrames,
  });
}
