import assert from 'node:assert/strict';
import { createGameScene } from '../src/app/createGameScene.js';
import { EQUIPMENT_CATALOG } from '../src/game/equipment/EquipmentCatalog.js';
import { resolveEquipmentLoadout } from '../src/game/equipment/EquipmentLoadout.js';
import {
  applyEquipmentPresentation,
  sampleEquipmentParts,
} from '../src/graphics/EquipmentPresentation.js';
import { EQUIPMENT_VISUAL_PARTS } from '../src/graphics/EquipmentVisualProfiles.js';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { createGraphicsResourceSampler } from '../src/graphics/GraphicsResourceSampler.js';
import {
  PLAYER_MOTION_PROFILE,
  advancePlayerAnimationTime,
} from '../src/animation/PlayerMotionProfile.js';
import { samplePlayerMotionPose } from '../src/animation/PlayerMotionPose.js';
import { defineCharacterBodyProfile } from '../src/animation/RigFamily.js';
import {
  samplePlayerCombatGeometry,
  PLAYER_COMBAT_GEOMETRY_SCALE,
} from '../src/combat/SharedCombatGeometry.js';
import { equipmentTestSnapshot } from './fixtures/equipment-loadouts.mjs';
import { applyRewardBundle } from '../src/game/progression/RewardTransactions.js';
import {
  selectEquipment,
  createProgressionSnapshot,
} from '../src/game/progression/ProgressionState.js';
import { ENCHANTMENT_CATALOG } from '../src/game/enchantment/EnchantmentCatalog.js';
import { SCRAP_CAMPAIGN_PROFILE } from '../src/game/campaign/ScrapCampaignProfiles.js';
import { QUEST_WORLD_PROFILES } from '../src/game/quests/QuestWorldProfiles.js';
const cases = [
  ['field-work-helmet', 'helmet', ['head']],
  ['field-work-body', 'bodyArmor', ['chest']],
  ['field-work-boots', 'boots', ['nearFoot', 'farFoot']],
  ['field-work-lamp', 'tool', ['farHip']],
];
const catalog = createGraphicsResourceCatalog(),
  sampler = createGraphicsResourceSampler(catalog);
let poseChecks = 0,
  parityChecks = 0;
const fresh = createProgressionSnapshot(
    EQUIPMENT_CATALOG.defaultItemId,
    ENCHANTMENT_CATALOG,
    SCRAP_CAMPAIGN_PROFILE,
  ),
  cache = QUEST_WORLD_PROFILES.explorations.find((e) => e.id === 'mine-cable-cache');
assert.equal(selectEquipment(fresh, 'field-work-lamp').changed, false);
const reward = applyRewardBundle(fresh, {
  claimId: 'exploration:' + cache.id,
  bundle: cache.rewards,
});
assert.equal(reward.changed, true);
const lampEquip = selectEquipment(reward.snapshot, 'field-work-lamp');
assert.equal(lampEquip.changed, true);
assert.equal(lampEquip.snapshot.loadout.toolItemId, 'field-work-lamp');
try {
  for (const [itemId, slot, jointIds] of cases) {
    const snapshot =
        itemId === 'field-work-lamp' ? lampEquip.snapshot : equipmentTestSnapshot(itemId),
      resolved = resolveEquipmentLoadout(snapshot.loadout),
      parts = EQUIPMENT_VISUAL_PARTS[itemId];
    assert.ok(parts.length);
    for (const part of parts) {
      assert.ok(jointIds.includes(part.joint));
      assert.ok(part.points.flat().every((n) => Number.isFinite(n) && Math.abs(n) <= 1));
      assert.ok(part.offset.every((n) => Math.abs(n) <= 1));
      assert.ok(part.extent.every((n) => n > 0));
    }
    for (const factor of [0.75, 1, 1.25])
      for (const facing of [-1, 1])
        for (const action of ['idle', 'roll', 'slash']) {
          const bodyProfile = defineCharacterBodyProfile({
            id: 'slot-fixture-' + factor,
            joints: {
              chest: { scale: factor },
              head: { scale: factor },
              nearKnee: { scale: factor },
              nearFoot: { scale: factor },
              farKnee: { scale: factor },
              farFoot: { scale: factor },
            },
          });
          const pose = samplePlayerMotionPose({
            motionState: { id: action === 'roll' ? 'idle' : action, progress: 0.5 },
            boneInput: action === 'roll' ? { rollProgress: 0.5 } : {},
            bodyProfile,
          });
          const context = {
            bonePose: pose.bonePose,
            position: { x: 480, y: 280 },
            facing,
            scale: PLAYER_COMBAT_GEOMETRY_SCALE,
            renderOrder: 30.5,
          };
          const untouched = JSON.stringify(pose);
          const geometry = () =>
            samplePlayerCombatGeometry({
              position: context.position,
              facing,
              targetPose: pose.targetPose,
              bonePose: pose.bonePose,
              geometryScale: context.scale,
            });
          const contact = geometry();
          const base = [
            { id: 'head', points: [{ x: 1, y: 2 }] },
            { id: 'torso', points: [{ x: 3, y: 4 }] },
            { id: 'front-boot', points: [{ x: 5, y: 6 }] },
            { id: 'back-boot', points: [{ x: 7, y: 8 }] },
            { id: 'tool-bag', points: [{ x: 9, y: 10 }] },
            { id: 'sword-blade', points: contact.weapon.points },
            { id: 'shield', points: contact.shield.points },
          ];
          const rendered = applyEquipmentPresentation(base, resolved, context);
          assert.equal(rendered.length, base.length + parts.length);
          for (let i = 0; i < base.length; i++)
            assert.strictEqual(
              rendered[i].points,
              base[i].points,
              'slot change never rewrites body/other-slot/contact geometry',
            );
          assert.deepEqual(geometry(), contact);
          assert.equal(JSON.stringify(pose), untouched);
          const additions = rendered.slice(base.length);
          assert.ok(
            additions.every((p) => p.equipmentSlot === slot && p.equipmentItemId === itemId),
          );
          assert.deepEqual(additions, sampleEquipmentParts(resolved, context));
          additions.forEach((addition, index) => {
            const part = parts[index],
              joint = pose.bonePose.projectedJoints[part.joint],
              m = pose.bonePose.worldJoints[part.joint].matrix;
            assert.ok(addition.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
            assert.ok(addition.depths.every(Number.isFinite));
            part.points.forEach(([u, v], i) => {
              const x = (u + part.offset[0]) * part.extent[0],
                y = (v + part.offset[1]) * part.extent[1];
              assert.ok(
                Math.abs(
                  addition.points[i].x -
                    (480 + (joint.x + m[0][0] * x + m[0][1] * y) * 0.77 * facing),
                ) < 1e-8,
              );
              assert.ok(
                Math.abs(
                  addition.points[i].y -
                    (280 + 82 + (joint.y - 82 + m[1][0] * x + m[1][1] * y) * 0.77),
                ) < 1e-8,
              );
            });
          });
          poseChecks++;
        }
    const game = createGameScene({ progressionSnapshot: snapshot });
    try {
      const resource = catalog.get('equipment:' + itemId);
      for (const facing of [-1, 1])
        for (const actionId of ['idle', 'roll', 'slash']) {
          const action = resource.actions.find((a) => a.id === actionId),
            frameIndex = Math.floor(action.frameCount / 2);
          game.reset();
          game.setVisualQaLocation({
            regionId: 'abandoned-mine',
            roomId: 'abandoned-mine-rescue-tunnel',
            x: 480,
          });
          game.facing = facing;
          game.animationTime = game.previousAnimationTime = advancePlayerAnimationTime(
            0,
            frameIndex / 60,
            { movementIntent: 0, rolling: actionId === 'roll' },
          );
          if (actionId === 'roll')
            game.rollState = {
              direction: facing,
              elapsedSeconds: frameIndex / 60,
              durationSeconds: PLAYER_MOTION_PROFILE.rollFrames / PLAYER_MOTION_PROFILE.frameRate,
            };
          else if (actionId !== 'idle') {
            game.combatCommands.start(actionId);
            for (let tick = Math.max(0, frameIndex * 2 - 2); tick <= frameIndex * 2; tick++) {
              game.combatCommands.active.elapsedSeconds = tick / 120;
              game.updatePlayerCombatGeometry(game.combatCommands.snapshot());
            }
          }
          const production = game.createRenderFrame(1),
            review = sampler.sample(resource.id, { actionId, frameIndex, facing }).frame;
          const added = (frame) => frame.items.filter((i) => i.equipmentSlot === slot);
          assert.equal(added(production).length, parts.length);
          assert.deepEqual(
            added(review),
            added(production),
            'review/production slot parts share exact sample',
          );
          assert.deepEqual(
            review.combatGeometry.visibleWeapon,
            production.combatGeometry.visibleWeapon,
          );
          parityChecks++;
        }
    } finally {
      game.dispose();
    }
  }
} finally {
  sampler.destroy();
}
console.log(
  JSON.stringify({
    status: 'PASS',
    poseChecks,
    parityChecks,
    checks: [
      'unchanged-body-and-contact-arrays',
      'slot-only-normalized-attached-parts',
      'two-facings-roll-attack-three-body-profiles',
      'real-production-review-parity',
      'hidden-reward-lamp-ownership-equip',
    ],
  }),
);
