import { sampleCombatTargetPose } from '../animation/CombatPoseLibrary.js';
import { TwoBoneIKSolver } from '../animation/TwoBoneIKSolver.js';
import { CombatCommandController } from '../combat/CombatCommandController.js';
import { MapRuntime } from './map/MapRuntime.js';
import { ACADEMY_VILLAGE_MAP } from './maps/academyVillage.js';

const CHARACTER_SPEED = 230;
const JUMP_SPEED = 470;
const GRAVITY = 1180;
const CHARACTER_RENDER_SCALE = 0.265;
const CHARACTER_CELL_SIZE = 48;
const CHARACTER_BOUNDARY_HALF_WIDTH = CHARACTER_CELL_SIZE / 2;
const CHARACTER_FOOT_OFFSET = 82;
const WORLD_HOURS_PER_SECOND = 0.04;
const ARM_IK_SOLVER = new TwoBoneIKSolver();

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function transformPoints(points, { x, y, rotation = 0, scaleX = 1, scaleY = 1 }) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return points.map((point) => {
    const scaledX = point.x * scaleX;
    const scaledY = point.y * scaleY;
    return Object.freeze({
      x: x + scaledX * cosine - scaledY * sine,
      y: y + scaledX * sine + scaledY * cosine,
    });
  });
}

function polygon(id, points, transform, fill, options = {}) {
  return Object.freeze({
    id,
    points: Object.freeze(transformPoints(points, transform)),
    fill,
    stroke: options.stroke ?? null,
    lineWidth: options.lineWidth ?? 1,
    opacity: options.opacity ?? 1,
  });
}

function limbSegment(id, start, end, width, fill, options = {}) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const halfWidth = width / 2;
  return polygon(
    id,
    [
      { x: 0, y: -halfWidth },
      { x: length, y: -halfWidth },
      { x: length, y: halfWidth },
      { x: 0, y: halfWidth },
    ],
    { x: start.x, y: start.y, rotation: Math.atan2(end.y - start.y, end.x - start.x) },
    fill,
    options,
  );
}

function arcRibbonPoints(origin, startAngle, endAngle, innerRadius, outerRadius, segments = 7) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
    points.push({
      x: origin.x + Math.cos(angle) * outerRadius,
      y: origin.y + Math.sin(angle) * outerRadius,
    });
  }
  for (let index = segments; index >= 0; index -= 1) {
    const progress = index / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
    points.push({
      x: origin.x + Math.cos(angle) * innerRadius,
      y: origin.y + Math.sin(angle) * innerRadius,
    });
  }
  return points;
}

function regularPolygon(radiusX, radiusY, sides, angleOffset = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = angleOffset + (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY };
  });
}

function createCharacterItems(
  position,
  animationTime,
  facing,
  targetPose,
  renderScale,
  renderOrder,
) {
  const idle = Math.sin(animationTime * 2.4);
  const bob = idle * 3.2;
  const bodyX = position.x + targetPose.bodyOffset.x;
  const bodyY = position.y + bob + targetPose.bodyOffset.y;
  const swordRotation = targetPose.swordAngle;
  const rightShoulder = { x: bodyX + 24, y: bodyY - 27 };
  const rightArm = ARM_IK_SOLVER.solve({
    root: rightShoulder,
    target: { x: bodyX + targetPose.handTarget.x, y: bodyY + targetPose.handTarget.y },
    upperLength: 36,
    lowerLength: 32,
    bendDirection: 1,
  });
  const leftShoulder = { x: bodyX - 24, y: bodyY - 25 };
  const leftArm = ARM_IK_SOLVER.solve({
    root: leftShoulder,
    target: { x: bodyX + targetPose.shieldTarget.x, y: bodyY + targetPose.shieldTarget.y },
    upperLength: 31,
    lowerLength: 28,
    bendDirection: -1,
  });
  const swordOrigin = rightArm.hand;
  const bladeOrigin = {
    x: swordOrigin.x + Math.cos(swordRotation) * 8,
    y: swordOrigin.y + Math.sin(swordRotation) * 8,
  };
  const trailItems =
    targetPose.trailOpacity > 0.02 && targetPose.trailArc > 0.02
      ? [
          polygon(
            'sword-trail',
            arcRibbonPoints(
              swordOrigin,
              swordRotation - targetPose.trailArc,
              swordRotation,
              42,
              111,
            ),
            { x: 0, y: 0 },
            '#bff8ef',
            { opacity: targetPose.trailOpacity * 0.5 },
          ),
        ]
      : [];

  const items = [
    polygon('shadow', regularPolygon(46, 12, 12), { x: bodyX, y: position.y + 68 }, '#05080d', {
      opacity: 0.62,
    }),
    polygon(
      'cape',
      [
        { x: -25, y: -42 },
        { x: 14, y: -37 },
        { x: 25, y: 48 },
        { x: 2, y: 58 },
        { x: -35, y: 45 },
      ],
      { x: bodyX - 5, y: bodyY },
      '#6d3043',
      { stroke: '#311b2b', lineWidth: 2 },
    ),
    polygon(
      'back-leg',
      [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
        { x: 12, y: 47 },
        { x: -8, y: 47 },
      ],
      { x: bodyX + 12, y: bodyY + 31, rotation: -0.08 - idle * 0.015 },
      '#27364d',
      { stroke: '#121a29', lineWidth: 2 },
    ),
    polygon(
      'front-leg',
      [
        { x: -11, y: 0 },
        { x: 10, y: 0 },
        { x: 8, y: 48 },
        { x: -13, y: 48 },
      ],
      { x: bodyX - 14, y: bodyY + 31, rotation: 0.07 + idle * 0.015 },
      '#405779',
      { stroke: '#121a29', lineWidth: 2 },
    ),
    polygon(
      'torso',
      [
        { x: -35, y: -39 },
        { x: 27, y: -42 },
        { x: 39, y: 15 },
        { x: 23, y: 39 },
        { x: -29, y: 37 },
        { x: -42, y: 10 },
      ],
      { x: bodyX, y: bodyY },
      '#47698f',
      { stroke: '#182538', lineWidth: 2 },
    ),
    polygon(
      'chest-plate',
      [
        { x: -22, y: -29 },
        { x: 19, y: -32 },
        { x: 27, y: 3 },
        { x: 9, y: 23 },
        { x: -19, y: 17 },
      ],
      { x: bodyX, y: bodyY },
      '#7198b8',
      { stroke: '#29445f', lineWidth: 1.5 },
    ),
    polygon(
      'belt',
      [
        { x: -31, y: -5 },
        { x: 31, y: -7 },
        { x: 32, y: 6 },
        { x: -31, y: 8 },
      ],
      { x: bodyX, y: bodyY + 28 },
      '#2a2130',
      { stroke: '#171525', lineWidth: 1.5 },
    ),
    limbSegment('shield-upper-arm', leftArm.root, leftArm.elbow, 17, '#b77b67', {
      stroke: '#442a30',
      lineWidth: 2,
    }),
    limbSegment('shield-forearm', leftArm.elbow, leftArm.hand, 15, '#cf8f78', {
      stroke: '#442a30',
      lineWidth: 2,
    }),
    polygon(
      'shield',
      [
        { x: -26, y: -34 },
        { x: 17, y: -39 },
        { x: 31, y: -3 },
        { x: 17, y: 35 },
        { x: -17, y: 28 },
        { x: -31, y: 0 },
      ],
      { x: leftArm.hand.x, y: leftArm.hand.y, rotation: -0.1 },
      '#9d5261',
      { stroke: '#342033', lineWidth: 3 },
    ),
    polygon(
      'shield-mark',
      [
        { x: 0, y: -20 },
        { x: 8, y: -6 },
        { x: 20, y: 0 },
        { x: 8, y: 7 },
        { x: 0, y: 22 },
        { x: -8, y: 7 },
        { x: -19, y: 0 },
        { x: -8, y: -6 },
      ],
      { x: leftArm.hand.x, y: leftArm.hand.y, rotation: -0.1 },
      '#d69a75',
      { stroke: '#5b3343', lineWidth: 1.5 },
    ),
    polygon(
      'head',
      regularPolygon(27, 31, 8, Math.PI / 8),
      { x: bodyX - 2, y: bodyY - 64 },
      '#cf8f78',
      { stroke: '#3d2832', lineWidth: 2 },
    ),
    polygon(
      'helmet',
      [
        { x: -29, y: 7 },
        { x: -24, y: -21 },
        { x: -3, y: -34 },
        { x: 22, y: -24 },
        { x: 30, y: -4 },
        { x: 18, y: 5 },
        { x: -4, y: -2 },
      ],
      { x: bodyX - 2, y: bodyY - 68 },
      '#374c68',
      { stroke: '#182538', lineWidth: 2 },
    ),
    polygon(
      'helmet-highlight',
      [
        { x: -2, y: -29 },
        { x: 13, y: -23 },
        { x: 21, y: -9 },
        { x: 7, y: -12 },
      ],
      { x: bodyX - 2, y: bodyY - 68 },
      '#7ea2bd',
      { opacity: 0.9 },
    ),
    ...trailItems,
    limbSegment('sword-upper-arm', rightArm.root, rightArm.elbow, 17, '#ba7665', {
      stroke: '#422832',
      lineWidth: 2,
    }),
    limbSegment('sword-forearm', rightArm.elbow, rightArm.hand, 15, '#cf8f78', {
      stroke: '#422832',
      lineWidth: 2,
    }),
    polygon(
      'sword-hilt',
      [
        { x: -7, y: -14 },
        { x: 8, y: -14 },
        { x: 8, y: 15 },
        { x: -7, y: 15 },
      ],
      { x: swordOrigin.x, y: swordOrigin.y, rotation: swordRotation },
      '#d7a95d',
      { stroke: '#4b3526', lineWidth: 2 },
    ),
    polygon(
      'sword-blade',
      [
        { x: 0, y: -5 },
        { x: 82, y: -5 },
        { x: 108, y: 0 },
        { x: 82, y: 6 },
        { x: 0, y: 6 },
      ],
      { x: bladeOrigin.x, y: bladeOrigin.y, rotation: swordRotation },
      '#dce8e8',
      { stroke: '#456171', lineWidth: 2 },
    ),
    polygon(
      'sword-shine',
      [
        { x: 9, y: -3 },
        { x: 82, y: -3 },
        { x: 98, y: -1 },
        { x: 18, y: 0 },
      ],
      { x: bladeOrigin.x, y: bladeOrigin.y, rotation: swordRotation },
      '#ffffff',
      { opacity: 0.8 },
    ),
  ];

  return items.map((item) =>
    Object.freeze({
      ...item,
      renderOrder,
      lineWidth: item.lineWidth * renderScale,
      points: Object.freeze(
        item.points.map((point) => {
          const footY = position.y + CHARACTER_FOOT_OFFSET;
          const relativeX = point.x - position.x;
          const relativeY = (point.y - footY) * (item.id === 'shadow' ? 1 : targetPose.bodyScaleY);
          const lean = item.id === 'shadow' ? 0 : targetPose.bodyLean;
          const posedX = position.x + relativeX * Math.cos(lean) - relativeY * Math.sin(lean);
          const posedY = footY + relativeX * Math.sin(lean) + relativeY * Math.cos(lean);
          const scaledX = position.x + (posedX - position.x) * renderScale;
          const scaledY = footY + (posedY - footY) * renderScale;
          return Object.freeze({
            x: facing >= 0 ? scaledX : position.x * 2 - scaledX,
            y: scaledY,
          });
        }),
      ),
    }),
  );
}

function timePhaseForHour(hour) {
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function invertedDirection(direction) {
  return direction === 'back' ? 'front' : 'back';
}

export class GameScene {
  constructor({ mapDefinition = ACADEMY_VILLAGE_MAP } = {}) {
    this.combatCommands = new CombatCommandController();
    this.mapRuntime = new MapRuntime(mapDefinition, {
      worldContext: { timePhase: 'day', weather: 'clear', storyFlags: {} },
    });
    this.reset();
  }

  reset() {
    this.worldTimeHours = 10;
    this.timePhase = timePhaseForHour(this.worldTimeHours);
    this.mapRuntime.setWorldContext({
      timePhase: this.timePhase,
      weather: 'clear',
      storyFlags: {},
    });
    const mapSnapshot = this.mapRuntime.reset();
    const spawn = mapSnapshot.spawn?.position ?? { x: 270, y: 350 };
    this.position = { ...spawn };
    this.previousPosition = { ...this.position };
    this.animationTime = 0;
    this.previousAnimationTime = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.jumpWasPressed = false;
    this.guardWasPressed = false;
    this.crouchWasPressed = false;
    this.lastJumpSequence = 0;
    this.facing = mapSnapshot.spawn?.facing ?? 1;
    this.combatCommands.reset();
  }

  toggleTimePhase() {
    this.worldTimeHours = this.timePhase === 'night' ? 10 : 21;
    this.updateTimePhase();
    return this.getWorldStatus();
  }

  updateTimePhase() {
    const nextPhase = timePhaseForHour(this.worldTimeHours);
    if (nextPhase === this.timePhase) return;
    this.timePhase = nextPhase;
    this.mapRuntime.setWorldContext({
      ...this.mapRuntime.getWorldContext(),
      timePhase: nextPhase,
    });
  }

  advanceWorldTime(deltaSeconds) {
    this.worldTimeHours = (this.worldTimeHours + deltaSeconds * WORLD_HOURS_PER_SECOND + 24) % 24;
    this.updateTimePhase();
  }

  tryLaneTransition(direction) {
    const combatState = this.combatCommands.snapshot();
    if (!this.isGrounded || combatState.id !== 'idle') return false;

    const lane = this.mapRuntime.getActiveLane();
    const connection = this.mapRuntime.findConnectionAt(
      { x: this.position.x, y: lane.groundY },
      { interactionId: 'lane-transition' },
    );
    if (!connection) return false;

    const location = this.mapRuntime.getActiveLocation();
    const fromActive =
      connection.from.chunkId === location.chunkId && connection.from.laneId === location.laneId;
    const effectiveDirection = fromActive
      ? connection.direction
      : invertedDirection(connection.direction);
    if (effectiveDirection !== direction) return false;

    this.mapRuntime.beginTransition(connection.id);
    const result = this.mapRuntime.completeTransition(connection.id);
    const destinationLane = this.mapRuntime.getActiveLane();
    this.position.x = result.position.x;
    this.position.y = destinationLane.groundY - CHARACTER_FOOT_OFFSET;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    return true;
  }

  update(deltaSeconds, inputSnapshot) {
    this.previousPosition = { ...this.position };
    this.previousAnimationTime = this.animationTime;
    this.advanceWorldTime(deltaSeconds);

    const guardPressed = Boolean(inputSnapshot.guard);
    const crouchPressed = Boolean(inputSnapshot.crouch);
    const transitionDirection =
      guardPressed && !this.guardWasPressed
        ? 'back'
        : crouchPressed && !this.crouchWasPressed
          ? 'front'
          : null;
    const transitioned = transitionDirection ? this.tryLaneTransition(transitionDirection) : false;
    const combatInput = transitioned
      ? { ...inputSnapshot, guard: false, crouch: false }
      : inputSnapshot;
    const combatState = this.combatCommands.update(
      deltaSeconds * inputSnapshot.animationSpeed,
      combatInput,
    );

    const horizontal = Number(inputSnapshot.right) - Number(inputSnapshot.left);
    if (horizontal !== 0) this.facing = Math.sign(horizontal);
    this.position.x += horizontal * CHARACTER_SPEED * combatState.movementScale * deltaSeconds;

    const jumpPressed = Boolean(inputSnapshot.jump);
    const jumpSequence = inputSnapshot.jumpSequence;
    const jumpIssued = Number.isSafeInteger(jumpSequence)
      ? jumpSequence > this.lastJumpSequence
      : jumpPressed && !this.jumpWasPressed;
    if (jumpIssued && this.isGrounded && combatState.canJump) {
      this.verticalVelocity = -JUMP_SPEED;
      this.isGrounded = false;
    }
    this.jumpWasPressed = jumpPressed;
    this.guardWasPressed = guardPressed;
    this.crouchWasPressed = crouchPressed;
    if (Number.isSafeInteger(jumpSequence)) this.lastJumpSequence = jumpSequence;

    const activeLane = this.mapRuntime.getActiveLane();
    const playerGroundY = activeLane.groundY - CHARACTER_FOOT_OFFSET;
    this.verticalVelocity += GRAVITY * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    if (this.position.y >= playerGroundY) {
      this.position.y = playerGroundY;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    const movementBounds = activeLane.movementBounds ?? {
      minX: CHARACTER_BOUNDARY_HALF_WIDTH,
      maxX: ACADEMY_VILLAGE_MAP.worldSize.width - CHARACTER_BOUNDARY_HALF_WIDTH,
    };
    this.position.x = Math.max(movementBounds.minX, Math.min(movementBounds.maxX, this.position.x));
    this.animationTime +=
      deltaSeconds * inputSnapshot.animationSpeed * (1 + Math.abs(horizontal) * 0.65);
  }

  getWorldStatus() {
    const map = this.mapRuntime.getResolvedMap();
    const lane = this.mapRuntime.getActiveLane();
    return Object.freeze({
      areaName: `${map.name} · ${lane.label}`,
      objective: '계단 근처에서 ↑/↓로 앞뒤 레인을 이동하세요.',
      timePhase: this.timePhase,
      timeLabel: this.timePhase === 'night' ? '밤' : '낮',
    });
  }

  createRenderFrame(interpolationAlpha) {
    const renderPosition = Object.freeze({
      x: lerp(this.previousPosition.x, this.position.x, interpolationAlpha),
      y: lerp(this.previousPosition.y, this.position.y, interpolationAlpha),
    });
    const renderAnimationTime = lerp(
      this.previousAnimationTime,
      this.animationTime,
      interpolationAlpha,
    );
    const combatState = this.combatCommands.snapshot();
    const targetPose = sampleCombatTargetPose(combatState);
    const map = this.mapRuntime.getResolvedMap();
    const mapSnapshot = this.mapRuntime.getResolvedSnapshot();
    const activeLane = mapSnapshot.lane;
    const characterRenderScale = CHARACTER_RENDER_SCALE * activeLane.visualScale;
    const characterRenderOrder = activeLane.renderOrder + 0.5;
    const characterItems = createCharacterItems(
      renderPosition,
      renderAnimationTime,
      this.facing,
      targetPose,
      characterRenderScale,
      characterRenderOrder,
    );
    const items = Object.freeze(
      [...mapSnapshot.renderItems, ...characterItems]
        .filter((item) => item.enabled !== false)
        .sort(
          (left, right) =>
            (left.renderOrder ?? 0) - (right.renderOrder ?? 0) ||
            (left.order ?? 0) - (right.order ?? 0) ||
            left.id.localeCompare(right.id),
        ),
    );
    const bounds = mapSnapshot.worldBounds ?? {
      x: 0,
      y: 0,
      width: map.worldSize.width,
      height: map.worldSize.height,
    };

    return Object.freeze({
      worldSize: map.worldSize,
      groundY: map.groundY,
      gridSize: map.gridSize,
      palette: map.palette,
      animationTime: renderAnimationTime,
      characterRenderScale,
      worldBounds: Object.freeze({
        minX: bounds.x,
        maxX: bounds.x + bounds.width,
        minY: bounds.y,
        maxY: bounds.y + bounds.height,
      }),
      playerMovementBounds: activeLane.movementBounds,
      map: Object.freeze({
        id: map.id,
        name: map.name,
        activeChunkId: mapSnapshot.active.chunkId,
        activeLaneId: mapSnapshot.active.laneId,
        timePhase: this.timePhase,
        appliedPatchIds: mapSnapshot.appliedPatchIds,
      }),
      combatMotion: Object.freeze({
        id: combatState.id,
        label: combatState.label,
        progress: combatState.progress,
        phase: combatState.phase,
        sequence: combatState.sequence,
        queuedMotion: combatState.queuedMotion,
      }),
      player: Object.freeze({
        position: renderPosition,
        isGrounded: this.isGrounded,
        laneId: mapSnapshot.active.laneId,
      }),
      items,
    });
  }
}
