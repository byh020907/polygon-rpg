import { sampleCombatTargetPose } from './CombatPoseLibrary.js';
import { sampleCharacterBonePose } from './CharacterBonePoseLibrary.js';

export function samplePlayerMotionPose({ motionState, boneInput }) {
  const targetPose = sampleCombatTargetPose(motionState);
  const bonePose = sampleCharacterBonePose({ ...boneInput, motionState });
  return Object.freeze({ targetPose, bonePose });
}
