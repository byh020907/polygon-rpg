const DEFAULT_MAX_HORIZONTAL_OFFSET = 5;
const DEFAULT_MAX_DURATION_SECONDS = 0.14;

export class CombatCameraFeedback {
  constructor({
    maxHorizontalOffset = DEFAULT_MAX_HORIZONTAL_OFFSET,
    maxDurationSeconds = DEFAULT_MAX_DURATION_SECONDS,
  } = {}) {
    if (!Number.isFinite(maxHorizontalOffset) || maxHorizontalOffset <= 0) {
      throw new RangeError('Combat camera maxHorizontalOffset은 양수여야 합니다.');
    }
    if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) {
      throw new RangeError('Combat camera maxDurationSeconds는 양수여야 합니다.');
    }
    this.maxHorizontalOffset = maxHorizontalOffset;
    this.maxDurationSeconds = maxDurationSeconds;
    this.enabled = true;
    this.reset();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.reset();
  }

  reset() {
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.amplitude = 0;
    this.direction = 1;
    this.offset = Object.freeze({ x: 0, y: 0 });
  }

  trigger({ direction, strength, durationSeconds = 0.1 }) {
    if (!this.enabled) return;
    if (![-1, 1].includes(direction)) {
      throw new RangeError('Combat camera direction은 -1 또는 1이어야 합니다.');
    }
    if (!Number.isFinite(strength) || strength < 0) {
      throw new RangeError('Combat camera strength는 0 이상의 유한한 숫자여야 합니다.');
    }
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      durationSeconds > this.maxDurationSeconds
    ) {
      throw new RangeError('Combat camera duration은 허용된 양수 범위여야 합니다.');
    }
    const amplitude = Math.min(this.maxHorizontalOffset, strength);
    if (amplitude < this.amplitude && this.elapsedSeconds < this.durationSeconds) return;
    this.elapsedSeconds = 0;
    this.durationSeconds = durationSeconds;
    this.amplitude = amplitude;
    this.direction = direction;
    this.offset = Object.freeze({ x: direction * amplitude, y: -amplitude * 0.24 });
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Combat camera deltaSeconds는 0 이상의 유한한 숫자여야 합니다.');
    }
    if (this.durationSeconds === 0) return this.offset;
    this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + deltaSeconds);
    const progress = this.elapsedSeconds / this.durationSeconds;
    const envelope = (1 - progress) * (1 - progress);
    const oscillation = Math.cos(progress * Math.PI * 3);
    this.offset = Object.freeze({
      x: this.direction * this.amplitude * envelope * oscillation,
      y: -this.amplitude * 0.24 * envelope,
    });
    if (progress >= 1) this.reset();
    return this.offset;
  }

  snapshot() {
    return this.offset;
  }
}
