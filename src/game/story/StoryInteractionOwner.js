const EMPTY_DIALOGUE = Object.freeze({
  active: false,
  available: false,
  interactionId: null,
  speaker: '',
  line: '',
  lineIndex: -1,
  lineCount: 0,
  canAdvance: false,
  canClose: false,
  prompt: '',
});

function isStoryInteraction(entity) {
  return (
    entity?.kind === 'story-interaction' &&
    typeof entity.id === 'string' &&
    typeof entity.speaker === 'string' &&
    Array.isArray(entity.lines) &&
    entity.lines.length > 0 &&
    entity.lines.every((line) => typeof line === 'string' && line.trim().length > 0) &&
    Number.isFinite(entity.position?.x) &&
    Number.isFinite(entity.position?.y) &&
    Number.isFinite(entity.interactionRange) &&
    entity.interactionRange > 0
  );
}

function distanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function nearestInteraction(entities, playerPosition) {
  if (!Array.isArray(entities) || !playerPosition) return null;
  return (
    entities
      .filter(isStoryInteraction)
      .map((interaction) => ({
        interaction,
        distance: distanceBetween(interaction.position, playerPosition),
      }))
      .filter(({ interaction, distance }) => distance <= interaction.interactionRange)
      .sort(
        (left, right) =>
          left.distance - right.distance || left.interaction.id.localeCompare(right.interaction.id),
      )[0]?.interaction ?? null
  );
}

function findInteraction(entities, interactionId) {
  return (
    entities?.find((entity) => isStoryInteraction(entity) && entity.id === interactionId) ?? null
  );
}

export class StoryInteractionOwner {
  constructor() {
    this.activeInteractionId = null;
    this.lineIndex = -1;
  }

  reset() {
    this.activeInteractionId = null;
    this.lineIndex = -1;
  }

  handleJump({ entities = [], playerPosition = null } = {}) {
    if (this.activeInteractionId) {
      const interaction = findInteraction(entities, this.activeInteractionId);
      if (!interaction) {
        this.reset();
        return Object.freeze({ consumed: false, transition: 'missing-target' });
      }
      if (this.lineIndex < interaction.lines.length - 1) {
        this.lineIndex += 1;
        return Object.freeze({ consumed: true, transition: 'advanced' });
      }
      this.reset();
      return Object.freeze({ consumed: true, transition: 'closed' });
    }

    const interaction = nearestInteraction(entities, playerPosition);
    if (!interaction) return Object.freeze({ consumed: false, transition: 'none' });
    this.activeInteractionId = interaction.id;
    this.lineIndex = 0;
    return Object.freeze({ consumed: true, transition: 'started' });
  }

  snapshot({ entities = [], playerPosition = null } = {}) {
    const activeInteraction = this.activeInteractionId
      ? findInteraction(entities, this.activeInteractionId)
      : null;
    if (activeInteraction) {
      const lineCount = activeInteraction.lines.length;
      const canAdvance = this.lineIndex < lineCount - 1;
      return Object.freeze({
        active: true,
        available: true,
        interactionId: activeInteraction.id,
        speaker: activeInteraction.speaker,
        line: activeInteraction.lines[this.lineIndex],
        lineIndex: this.lineIndex,
        lineCount,
        canAdvance,
        canClose: !canAdvance,
        prompt: canAdvance ? '↑ 다음 대사' : '↑ 대화 마치기',
      });
    }

    const availableInteraction = nearestInteraction(entities, playerPosition);
    if (!availableInteraction) return EMPTY_DIALOGUE;
    return Object.freeze({
      ...EMPTY_DIALOGUE,
      available: true,
      interactionId: availableInteraction.id,
      speaker: availableInteraction.speaker,
      prompt: `↑ ${availableInteraction.speaker} 상호작용`,
    });
  }
}
