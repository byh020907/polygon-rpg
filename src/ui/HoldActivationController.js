export class HoldActivationController {
  constructor({
    durationMilliseconds = 1_000,
    now = () => performance.now(),
    requestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame = (frameId) => cancelAnimationFrame(frameId),
    onProgress = () => {},
    onComplete = () => {},
  } = {}) {
    if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0) {
      throw new RangeError('Hold duration은 양수여야 합니다.');
    }
    this.durationMilliseconds = durationMilliseconds;
    this.now = now;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.startedAt = null;
    this.frameId = null;
    this.completed = false;
    this.interrupted = false;
    this.suppressNextActivation = false;
  }

  begin() {
    if (this.startedAt !== null || this.completed) return false;
    this.interrupted = false;
    this.suppressNextActivation = false;
    this.startedAt = this.now();
    this.onProgress(0);
    this.scheduleFrame();
    return true;
  }

  scheduleFrame() {
    this.frameId = this.requestFrame((timestamp) => this.update(timestamp));
  }

  update(timestamp = this.now()) {
    if (this.startedAt === null) return;
    const progress = Math.max(
      0,
      Math.min(1, (timestamp - this.startedAt) / this.durationMilliseconds),
    );
    this.onProgress(progress);
    if (progress < 1) {
      this.scheduleFrame();
      return;
    }

    this.startedAt = null;
    this.frameId = null;
    this.completed = true;
    this.suppressNextActivation = true;
    this.onComplete();
  }

  release() {
    const releasedAt = this.now();
    if (this.startedAt !== null && releasedAt - this.startedAt >= this.durationMilliseconds) {
      this.cancelPendingFrame();
      this.update(releasedAt);
    }
    const wasCompleted = this.completed;
    const wasInterrupted = this.interrupted;
    this.cancelPendingFrame();
    this.startedAt = null;
    this.completed = false;
    this.interrupted = false;
    if (!wasCompleted) this.onProgress(0);
    return Object.freeze({ completed: wasCompleted, interrupted: wasInterrupted });
  }

  cancel() {
    this.cancelPendingFrame();
    this.startedAt = null;
    this.completed = false;
    this.interrupted = false;
    this.suppressNextActivation = false;
    this.onProgress(0);
  }

  interrupt() {
    if (this.startedAt === null) return false;
    this.cancelPendingFrame();
    this.startedAt = null;
    this.completed = false;
    this.interrupted = true;
    this.suppressNextActivation = true;
    this.onProgress(0);
    return true;
  }

  consumePrimaryActivation() {
    if (!this.suppressNextActivation) return true;
    this.suppressNextActivation = false;
    this.onProgress(0);
    return false;
  }

  cancelPendingFrame() {
    if (this.frameId === null) return;
    this.cancelFrame(this.frameId);
    this.frameId = null;
  }
}
