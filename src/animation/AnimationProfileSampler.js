import { samplePlayerMotionPose } from './PlayerMotionPose.js';
export function sampleAnimationProfile(profileId, input) {
  if (profileId !== 'field-cutter-standard')
    throw new Error('Unknown animation profile ' + profileId);
  return samplePlayerMotionPose(input);
}
