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
  worldAnchor: null,
  visibleLine: '',
  revealComplete: false,
});

const REVEAL_CHARACTERS_PER_SECOND = 28;
const COMMA_PAUSE_SECONDS = 0.12;
const TERMINAL_PAUSE_SECONDS = 0.22;

function dialogueWorldAnchor(interaction) {
  return Object.freeze({
    x: interaction.position.x,
    y: interaction.position.y,
  });
}

function punctuationPause(character) {
  if (',，、;；:：'.includes(character)) return COMMA_PAUSE_SECONDS;
  if ('.!?…。！？'.includes(character)) return TERMINAL_PAUSE_SECONDS;
  return 0;
}

function revealPrefix(line, characterCount) {
  return Array.from(line).slice(0, characterCount).join('');
}

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
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  reset() {
    this.activeInteractionId = null;
    this.lineIndex = -1;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  advance(deltaSeconds, { entities = [] } = {}) {
    if (!this.activeInteractionId || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const interaction = findInteraction(entities, this.activeInteractionId);
    if (!interaction) return;
    const characters = Array.from(interaction.lines[this.lineIndex] ?? '');
    let remainingSeconds = deltaSeconds;
    while (
      remainingSeconds >= this.revealDelaySeconds &&
      this.revealedCharacters < characters.length
    ) {
      remainingSeconds -= this.revealDelaySeconds;
      const character = characters[this.revealedCharacters];
      this.revealedCharacters += 1;
      this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND + punctuationPause(character);
    }
    if (this.revealedCharacters < characters.length) this.revealDelaySeconds -= remainingSeconds;
  }

  completeCurrentLine(entities) {
    const interaction = findInteraction(entities, this.activeInteractionId);
    if (!interaction) return;
    this.revealedCharacters = Array.from(interaction.lines[this.lineIndex]).length;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  handleJump({ entities = [], playerPosition = null } = {}) {
    if (this.activeInteractionId) {
      const interaction = findInteraction(entities, this.activeInteractionId);
      if (!interaction) {
        this.reset();
        return Object.freeze({ consumed: true, transition: 'missing-target' });
      }
      const lineLength = Array.from(interaction.lines[this.lineIndex]).length;
      if (this.revealedCharacters < lineLength) {
        this.completeCurrentLine(entities);
        return Object.freeze({ consumed: true, transition: 'completed-line' });
      }
      if (this.lineIndex < interaction.lines.length - 1) {
        this.lineIndex += 1;
        this.revealedCharacters = 0;
        this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
        return Object.freeze({ consumed: true, transition: 'advanced' });
      }
      this.reset();
      return Object.freeze({ consumed: true, transition: 'closed' });
    }

    const interaction = nearestInteraction(entities, playerPosition);
    if (!interaction) return Object.freeze({ consumed: false, transition: 'none' });
    this.activeInteractionId = interaction.id;
    this.lineIndex = 0;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
    return Object.freeze({ consumed: true, transition: 'started' });
  }

  snapshot({ entities = [], playerPosition = null } = {}) {
    const activeInteraction = this.activeInteractionId
      ? findInteraction(entities, this.activeInteractionId)
      : null;
    if (activeInteraction) {
      const lineCount = activeInteraction.lines.length;
      const canAdvance = this.lineIndex < lineCount - 1;
      const line = activeInteraction.lines[this.lineIndex];
      const lineLength = Array.from(line).length;
      const revealComplete = this.revealedCharacters >= lineLength;
      return Object.freeze({
        active: true,
        available: true,
        interactionId: activeInteraction.id,
        speaker: activeInteraction.speaker,
        line,
        visibleLine: revealPrefix(line, this.revealedCharacters),
        lineIndex: this.lineIndex,
        lineCount,
        canAdvance: revealComplete && canAdvance,
        canClose: revealComplete && !canAdvance,
        revealComplete,
        prompt: revealComplete ? (canAdvance ? '↑ 다음 대사' : '↑ 대화 마치기') : '↑ 대사 완성',
        worldAnchor: dialogueWorldAnchor(activeInteraction),
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
      worldAnchor: dialogueWorldAnchor(availableInteraction),
    });
  }
}
