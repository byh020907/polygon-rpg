export class FixedStepRunner {
  constructor({ stepHz = 120, maxCatchUpSteps = 5, update, render }) {
    if (!(stepHz > 0) || !(maxCatchUpSteps > 0)) {
      throw new TypeError('FixedStepRunner의 시간 설정은 0보다 커야 합니다.');
    }
    if (typeof update !== 'function' || typeof render !== 'function') {
      throw new TypeError('FixedStepRunner에는 update와 render 함수가 필요합니다.');
    }

    this.fixedDeltaSeconds = 1 / stepHz;
    this.maxCatchUpSteps = maxCatchUpSteps;
    this.update = update;
    this.render = render;
    this.accumulatorSeconds = 0;
    this.previousTimeSeconds = null;
    this.totalSteps = 0;
    this.droppedSteps = 0;
  }

  reset(timeMilliseconds = 0) {
    this.accumulatorSeconds = 0;
    this.previousTimeSeconds = timeMilliseconds / 1000;
  }

  resetDiagnostics() {
    this.totalSteps = 0;
    this.droppedSteps = 0;
  }

  frame(timeMilliseconds, inputSnapshot) {
    const currentTimeSeconds = timeMilliseconds / 1000;
    if (this.previousTimeSeconds === null) {
      this.previousTimeSeconds = currentTimeSeconds;
    }

    this.accumulatorSeconds += Math.max(0, currentTimeSeconds - this.previousTimeSeconds);
    this.previousTimeSeconds = currentTimeSeconds;

    let executedSteps = 0;
    while (
      this.accumulatorSeconds + Number.EPSILON >= this.fixedDeltaSeconds &&
      executedSteps < this.maxCatchUpSteps
    ) {
      this.update(this.fixedDeltaSeconds, inputSnapshot);
      this.accumulatorSeconds -= this.fixedDeltaSeconds;
      this.totalSteps += 1;
      executedSteps += 1;
    }

    if (this.accumulatorSeconds >= this.fixedDeltaSeconds) {
      const droppedSteps = Math.floor(this.accumulatorSeconds / this.fixedDeltaSeconds);
      this.accumulatorSeconds -= droppedSteps * this.fixedDeltaSeconds;
      this.droppedSteps += droppedSteps;
    }

    const interpolationAlpha = Math.max(
      0,
      Math.min(1, this.accumulatorSeconds / this.fixedDeltaSeconds),
    );
    this.render(interpolationAlpha);

    return Object.freeze({
      executedSteps,
      interpolationAlpha,
      totalSteps: this.totalSteps,
      droppedSteps: this.droppedSteps,
    });
  }
}
