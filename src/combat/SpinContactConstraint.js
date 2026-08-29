function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothStep(value) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export class SpinContactConstraint {
  constructor({ hitPulses, contactSpacings, releaseSpacing = 24, maxPullSpeed = 300 }) {
    if (!Array.isArray(hitPulses) || hitPulses.length === 0) {
      throw new TypeError('Spin contact constraint에는 hit pulse가 필요합니다.');
    }
    if (!Array.isArray(contactSpacings) || contactSpacings.length !== hitPulses.length) {
      throw new TypeError('Spin contact spacing은 hit pulse와 길이가 같아야 합니다.');
    }
    if (
      hitPulses.some(
        (progress, index) =>
          !Number.isFinite(progress) ||
          progress <= 0 ||
          progress >= 1 ||
          (index > 0 && progress <= hitPulses[index - 1]),
      )
    ) {
      throw new RangeError('Spin hit pulse는 0..1 사이에서 오름차순이어야 합니다.');
    }
    if (contactSpacings.some((spacing) => !Number.isFinite(spacing))) {
      throw new TypeError('Spin contact spacing은 유한한 숫자여야 합니다.');
    }
    if (!Number.isFinite(releaseSpacing)) {
      throw new TypeError('Spin release spacing은 유한한 숫자여야 합니다.');
    }
    if (!Number.isFinite(maxPullSpeed) || maxPullSpeed <= 0) {
      throw new RangeError('Spin max pull speed는 양수여야 합니다.');
    }
    this.keySpacings = Object.freeze(
      hitPulses.map((progress, index) =>
        Object.freeze({ progress, spacing: contactSpacings[index] }),
      ),
    );
    this.releaseSpacing = releaseSpacing;
    this.maxPullSpeed = maxPullSpeed;
    this.reset();
  }

  reset() {
    this.sequence = 0;
    this.startGap = 0;
    this.facing = 1;
    this.pendingReleaseVelocityX = 0;
  }

  queueRelease({ velocityX }) {
    if (!Number.isFinite(velocityX)) {
      throw new TypeError('Spin release velocity는 유한한 숫자여야 합니다.');
    }
    this.pendingReleaseVelocityX = velocityX;
  }

  update({ motionState, actorX, targetX, facing, deltaSeconds }) {
    if (!motionState || typeof motionState.id !== 'string') {
      throw new TypeError('Spin motion state에는 id가 필요합니다.');
    }
    if (
      !Number.isFinite(motionState.progress) ||
      motionState.progress < 0 ||
      motionState.progress > 1
    ) {
      throw new RangeError('Spin motion progress는 0..1의 유한한 숫자여야 합니다.');
    }
    if (!Number.isSafeInteger(motionState.sequence) || motionState.sequence < 0) {
      throw new RangeError('Spin motion sequence는 0 이상의 안전한 정수여야 합니다.');
    }
    if (![actorX, targetX, facing, deltaSeconds].every(Number.isFinite)) {
      throw new TypeError('Spin contact update 좌표, facing과 deltaSeconds는 유한해야 합니다.');
    }
    if (![-1, 1].includes(facing) || deltaSeconds < 0) {
      throw new RangeError('Spin facing은 -1 또는 1이고 deltaSeconds는 0 이상이어야 합니다.');
    }
    if (motionState.id !== 'spin') {
      const releaseVelocityX = this.sequence === 0 ? 0 : this.pendingReleaseVelocityX;
      this.reset();
      return Object.freeze({ active: false, targetX, releaseVelocityX });
    }

    if (this.sequence !== motionState.sequence) {
      this.sequence = motionState.sequence;
      this.facing = facing;
      this.startGap = (targetX - actorX) * this.facing;
      this.pendingReleaseVelocityX = 0;
    }

    const keyframes = [
      { progress: 0, spacing: this.startGap },
      ...this.keySpacings,
      { progress: 1, spacing: this.releaseSpacing },
    ];
    const rightIndex = keyframes.findIndex(({ progress }) => progress >= motionState.progress);
    const boundedRightIndex = rightIndex < 0 ? keyframes.length - 1 : rightIndex;
    const leftIndex = Math.max(0, boundedRightIndex - 1);
    const left = keyframes[leftIndex];
    const right = keyframes[boundedRightIndex];
    const localProgress =
      right.progress === left.progress
        ? 1
        : (motionState.progress - left.progress) / (right.progress - left.progress);
    const spacing = lerp(left.spacing, right.spacing, smoothStep(localProgress));
    const desiredX = actorX + this.facing * spacing;
    const maxStep = this.maxPullSpeed * Math.max(0, deltaSeconds);
    const nextX = targetX + clamp(desiredX - targetX, -maxStep, maxStep);
    return Object.freeze({ active: true, targetX: nextX, releaseVelocityX: 0 });
  }
}
