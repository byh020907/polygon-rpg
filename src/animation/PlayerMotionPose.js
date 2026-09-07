import { sampleCombatTargetPose } from './CombatPoseLibrary.js';
import { sampleCharacterBonePose } from './CharacterBonePoseLibrary.js';

function authoredAttachmentTarget(targetPose, bonePose) {
  const joints = bonePose.projectedJoints;
  if (!bonePose.frameId || !joints?.nearHand || !joints?.farHand || !joints.nearElbow) {
    return targetPose;
  }
  const bodyX = targetPose.bodyOffset.x + bonePose.rootOffset.x;
  const bodyY = targetPose.bodyOffset.y + bonePose.rootOffset.y;
  const basis = (jointId) => {
    const matrix = bonePose.worldJoints[jointId].matrix;
    return Object.freeze({
      xx: matrix[0][0],
      xy: matrix[0][1],
      yx: matrix[1][0],
      yy: matrix[1][1],
    });
  };
  const weaponBasis = basis('nearHand');
  return Object.freeze({
    ...targetPose,
    handTarget: Object.freeze({ x: joints.nearHand.x - bodyX, y: joints.nearHand.y - bodyY }),
    shieldTarget: Object.freeze({ x: joints.farHand.x - bodyX, y: joints.farHand.y - bodyY }),
    weaponLengthScale: 1,
    swordAngle: Math.atan2(weaponBasis.yx, weaponBasis.xx),
    weaponBasis,
    shieldBasis: basis('farHand'),
  });
}

export function samplePlayerMotionPose({ motionState, boneInput }) {
  const bonePose = sampleCharacterBonePose({ ...boneInput, motionState });
  const targetPose = authoredAttachmentTarget(sampleCombatTargetPose(motionState), bonePose);
  return Object.freeze({ targetPose, bonePose });
}
