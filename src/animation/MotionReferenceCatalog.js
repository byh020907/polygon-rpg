// Development-time provenance only. Runtime always consumes normalized local clip frames.
// No third-party animation files are checked in or fetched by the game/PWA.
export const MOTION_REFERENCE_CATALOG = Object.freeze({
  humanLocomotion: Object.freeze({
    id: 'human-locomotion-reference-survey-2026-09-02',
    consulted: Object.freeze([
      Object.freeze({
        source: 'CMU Graphics Lab Motion Capture Database',
        url: 'https://mocap.cs.cmu.edu/info.php',
        license: 'free-download; redistribution status not established for this repository',
        use: 'visual timing and weight-transfer reference only',
      }),
      Object.freeze({
        source: 'Adobe Mixamo FAQ',
        url: 'https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html',
        license: 'royalty-free embedded-project use; raw-asset redistribution is unsuitable here',
        use: 'skeleton naming and retarget workflow reference only',
      }),
    ]),
    importPolicy:
      'No raw external clip is redistributed. Reviewed sources stay reference-only until a redistributable license is verified; the local development-time retargeter normalizes an approved source into reviewed joint key frames before it can enter a clip.',
    retarget: Object.freeze({
      sourceJointMap: Object.freeze({
        hips: 'pelvis',
        spine: 'chest',
        head: 'head',
        leftArm: 'farShoulder',
        rightArm: 'nearShoulder',
        leftLeg: 'farHip',
        rightLeg: 'nearHip',
      }),
      normalize: Object.freeze([
        'units',
        'axis',
        'root-motion',
        'frame-rate',
        'side-view key poses',
      ]),
    }),
  }),
});
