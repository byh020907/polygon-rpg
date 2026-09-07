import { defineSkeletonFrame } from './SkeletonPoseProjection.js';

const REQUIRED_TARGET_JOINTS = Object.freeze([
  'root',
  'pelvis',
  'chest',
  'head',
  'nearShoulder',
  'farShoulder',
  'nearHip',
  'farHip',
]);

function assertTransform(transform, sourceJoint) {
  if (
    !transform ||
    !Number.isFinite(transform.x) ||
    !Number.isFinite(transform.y) ||
    !Number.isFinite(transform.z) ||
    (!transform.quaternion && !Number.isFinite(transform.rotation))
  ) {
    throw new TypeError(`${sourceJoint} motion transform에는 x/y/z/rotation이 필요합니다.`);
  }
}

// Development-time only: never fetches data or makes runtime/PWA depend on an external source.
export function retargetMotionKeyframes({ source, frames, jointMap, scale = 1 }) {
  if (!source?.url?.startsWith('https://') || typeof source.license !== 'string') {
    throw new TypeError('retarget source에는 URL과 license provenance가 필요합니다.');
  }
  if (!Number.isFinite(scale) || scale <= 0)
    throw new RangeError('retarget scale은 양수여야 합니다.');
  if (!Array.isArray(frames) || frames.length === 0)
    throw new TypeError('source motion frame이 필요합니다.');
  for (const targetJoint of REQUIRED_TARGET_JOINTS) {
    if (typeof jointMap?.[targetJoint] !== 'string') {
      throw new TypeError(`${targetJoint} target joint mapping이 필요합니다.`);
    }
  }
  const boneLengths = Object.fromEntries(
    Object.entries(jointMap)
      .filter(([id]) => id !== 'root')
      .map(([target, sourceJoint]) => {
        const transform = frames[0].joints?.[sourceJoint];
        assertTransform(transform, sourceJoint);
        return [target, Math.hypot(transform.x, transform.y, transform.z) * scale];
      }),
  );
  return Object.freeze(
    frames.map((frame) => {
      if (!Number.isFinite(frame.at))
        throw new TypeError('motion key frame에는 normalized at이 필요합니다.');
      const joints = Object.freeze(
        Object.fromEntries(
          Object.entries(jointMap).map(([targetJoint, sourceJoint]) => {
            const transform = frame.joints?.[sourceJoint];
            assertTransform(transform, sourceJoint);
            return [
              targetJoint,
              Object.freeze({
                x: transform.x * scale,
                y: transform.y * scale,
                z: transform.z * scale,
                ...(transform.quaternion
                  ? { quaternion: transform.quaternion }
                  : {
                      rotation: transform.rotation,
                      pitch: transform.pitch ?? 0,
                      yaw: transform.yaw ?? 0,
                    }),
              }),
            ];
          }),
        ),
      );
      return defineSkeletonFrame(
        {
          id: frame.id,
          at: frame.at,
          transition: frame.transition ?? 'linear',
          joints,
        },
        { boneLengths },
      );
    }),
  );
}
