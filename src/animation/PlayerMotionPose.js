import { sampleCombatTargetPose } from './CombatPoseLibrary.js';
import { sampleCharacterBonePose } from './CharacterBonePoseLibrary.js';

// While tucked, the sword lies back along the curled body instead of following the fast
// elbow→hand whip, which would teleport the stub ~180 degrees at tuck entry and mid-roll.
const ROLL_TUCKED_SWORD_ANGLE = 2.45;

function smooth01(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  return bounded * bounded * (3 - 2 * bounded);
}

function shortestAngleDelta(from, to) {
  const tau = Math.PI * 2;
  let delta = (to - from) % tau;
  if (delta > Math.PI) delta -= tau;
  if (delta < -Math.PI) delta += tau;
  return delta;
}

function rollSwordAngle(idleAngle, joints, rollProgress) {
  const armAngle = Math.atan2(
    joints.nearHand.y - joints.nearElbow.y,
    joints.nearHand.x - joints.nearElbow.x,
  );
  if (!Number.isFinite(rollProgress)) return armAngle;
  // 0 at roll entry/exit (exact idle continuity, no pop) and 1 through the tucked middle,
  // so the blade swings back with the tuck and forward with the unfold in one smooth motion.
  const tuckEnvelope = smooth01(rollProgress / 0.3) * (1 - smooth01((rollProgress - 0.55) / 0.4));
  return idleAngle + shortestAngleDelta(idleAngle, ROLL_TUCKED_SWORD_ANGLE) * tuckEnvelope;
}

function authoredAttachmentTarget(targetPose, bonePose, rollProgress) {
  const joints = bonePose.projectedJoints;
  if (!bonePose.frameId || !joints?.nearHand || !joints?.farHand || !joints.nearElbow) {
    return targetPose;
  }
  const bodyX = targetPose.bodyOffset.x + bonePose.rootOffset.x;
  const bodyY = targetPose.bodyOffset.y + bonePose.rootOffset.y;
  return Object.freeze({
    ...targetPose,
    handTarget: Object.freeze({ x: joints.nearHand.x - bodyX, y: joints.nearHand.y - bodyY }),
    shieldTarget: Object.freeze({ x: joints.farHand.x - bodyX, y: joints.farHand.y - bodyY }),
    // A roll is defensive movement, never a weapon contact.  Keep the tool tucked inside the
    // articulated silhouette instead of leaving an idle-length blade pointing through the roll.
    weaponLengthScale: bonePose.rollMarker ? 0.3 : 1,
    swordAngle: bonePose.rollMarker
      ? rollSwordAngle(targetPose.swordAngle, joints, rollProgress)
      : Math.atan2(joints.nearHand.y - joints.nearElbow.y, joints.nearHand.x - joints.nearElbow.x),
  });
}

export function samplePlayerMotionPose({ motionState, boneInput }) {
  const bonePose = sampleCharacterBonePose({ ...boneInput, motionState });
  const targetPose = authoredAttachmentTarget(
    sampleCombatTargetPose(motionState),
    bonePose,
    boneInput?.rollProgress ?? null,
  );
  return Object.freeze({ targetPose, bonePose });
}
