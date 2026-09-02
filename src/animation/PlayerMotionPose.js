import { sampleCombatTargetPose } from './CombatPoseLibrary.js';
import { sampleCharacterBonePose } from './CharacterBonePoseLibrary.js';

function authoredAttachmentTarget(targetPose, bonePose) {
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
    swordAngle: Math.atan2(
      joints.nearHand.y - joints.nearElbow.y,
      joints.nearHand.x - joints.nearElbow.x,
    ),
  });
}

export function samplePlayerMotionPose({ motionState, boneInput }) {
  const bonePose = sampleCharacterBonePose({ ...boneInput, motionState });
  const targetPose = authoredAttachmentTarget(sampleCombatTargetPose(motionState), bonePose);
  return Object.freeze({ targetPose, bonePose });
}
