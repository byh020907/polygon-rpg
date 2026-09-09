import { combatMotionFrameData } from './CombatCommandController.js';
import { COMBAT_MOTION_TIMING_PROFILES } from './CombatMotionTimingProfiles.js';
function attackHitProfile(motionId, profile) {
  const motionFrame = combatMotionFrameData(motionId);
  if (!motionFrame) throw new Error(`${motionId}에는 CombatFrame data가 필요합니다.`);
  const startFrame = motionFrame.startupFrames;
  const endFrame = startFrame + motionFrame.activeFrames;
  const hitPulseFrames = COMBAT_MOTION_TIMING_PROFILES[motionId].hitPulseFrames;
  if (startFrame < 0 || endFrame > motionFrame.durationFrames || endFrame < startFrame) {
    throw new RangeError(`${motionId} hit frame window가 motion duration을 벗어났습니다.`);
  }
  return Object.freeze({
    ...profile,
    frame: Object.freeze({ startFrame, endFrame }),
    start: startFrame / motionFrame.durationFrames,
    end: endFrame / motionFrame.durationFrames,
    ...(hitPulseFrames
      ? {
          hitPulseFrames: Object.freeze(hitPulseFrames),
          hitPulses: Object.freeze(
            hitPulseFrames.map((frame) => frame / motionFrame.durationFrames),
          ),
        }
      : {}),
  });
}

const BASE_ATTACK_HIT_PROFILES = Object.freeze({
  slash: attackHitProfile('slash', {
    damage: 12,
    launchY: -90,
  }),
  heavy: attackHitProfile('heavy', {
    damage: 22,
    launchY: -150,
    guardBreak: true,
  }),
  thrust: attackHitProfile('thrust', {
    damage: 15,
    launchY: -80,
  }),
  rising: attackHitProfile('rising', {
    damage: 18,
    launchY: -470,
    juggleRole: 'launcher',
    relaunchSpeed: 310,
    floatSeconds: 0.16,
    guardBreak: true,
  }),
  spin: attackHitProfile('spin', {
    damage: 8,
    launchY: -70,
    relaunchSpeed: 260,
    floatSeconds: 0.08,
    contactSpacings: Object.freeze([23, 17, 5]),
  }),
  airSlash: attackHitProfile('airSlash', {
    damage: 13,
    launchY: -110,
    juggleRole: 'sustain',
    relaunchSpeed: 190,
    floatSeconds: 0.1,
  }),
  airHeavy: attackHitProfile('airHeavy', {
    damage: 26,
    launchY: 300,
    juggleRole: 'finisher',
    groundBounce: true,
    guardBreak: true,
  }),
  airReturn: attackHitProfile('airReturn', {
    damage: 15,
    launchY: -90,
    juggleRole: 'sustain',
    relaunchSpeed: 170,
    floatSeconds: 0.09,
  }),
  airSpin: attackHitProfile('airSpin', {
    damage: 20,
    launchY: -150,
    juggleRole: 'sustain',
    relaunchSpeed: 250,
    floatSeconds: 0.17,
    guardBreak: true,
  }),
  airCross: attackHitProfile('airCross', {
    damage: 24,
    launchY: 250,
    juggleRole: 'finisher',
  }),
  shieldBash: attackHitProfile('shieldBash', {
    damage: 16,
    launchY: -90,
    contactPart: 'shield',
  }),
});

export function getAttackProfiles(id) {
  if (id !== 'field-cutter-standard') throw new Error('Unknown attack profile ' + id);
  return BASE_ATTACK_HIT_PROFILES;
}
