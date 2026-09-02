const EMPTY_COMMANDS = Object.freeze([]);

const EMPTY_DIALOGUE = Object.freeze({
  active: false,
  available: false,
  mode: 'current',
  presentationMode: 'dialogue',
  interactionId: null,
  conversationId: null,
  title: '',
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
  commands: EMPTY_COMMANDS,
});

const REVEAL_CHARACTERS_PER_SECOND = 28;
const COMMA_PAUSE_SECONDS = 0.12;
const TERMINAL_PAUSE_SECONDS = 0.22;

function dialogueWorldAnchor(interaction, playerPosition = null) {
  const anchor =
    interaction.dialogueAnchor === 'player' && playerPosition
      ? playerPosition
      : interaction.position;
  return Object.freeze({
    x: anchor.x,
    y: anchor.y,
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
  const commands = entity?.commands ?? EMPTY_COMMANDS;
  const conversationIsValid =
    entity?.conversationId === undefined
      ? entity?.conversationTitle === undefined
      : typeof entity.conversationId === 'string' &&
        entity.conversationId.length > 0 &&
        typeof entity.conversationTitle === 'string' &&
        entity.conversationTitle.length > 0;
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
    entity.interactionRange > 0 &&
    conversationIsValid &&
    Array.isArray(commands) &&
    commands.every(
      (command) =>
        command &&
        typeof command.id === 'string' &&
        command.id.length > 0 &&
        typeof command.type === 'string' &&
        command.type.length > 0,
    )
  );
}

function interactionCommands(interaction) {
  return interaction?.commands ?? EMPTY_COMMANDS;
}

function isTranscript(transcript) {
  return (
    transcript &&
    typeof transcript.id === 'string' &&
    transcript.id.length > 0 &&
    typeof transcript.title === 'string' &&
    transcript.title.length > 0 &&
    typeof transcript.interactionId === 'string' &&
    transcript.interactionId.length > 0 &&
    typeof transcript.speaker === 'string' &&
    transcript.speaker.length > 0 &&
    Array.isArray(transcript.lines) &&
    transcript.lines.length > 0 &&
    transcript.lines.every((line) => typeof line === 'string' && line.trim().length > 0)
  );
}

function findTranscript(transcripts, transcriptId) {
  return (
    transcripts?.find((transcript) => isTranscript(transcript) && transcript.id === transcriptId) ??
    null
  );
}

function replayCommands(interaction, transcripts) {
  if (!interaction?.conversationId || !Array.isArray(transcripts)) return EMPTY_COMMANDS;
  return Object.freeze(
    transcripts
      .filter(
        (transcript) =>
          isTranscript(transcript) &&
          transcript.id !== interaction.conversationId &&
          (interaction.transcriptArchive === true || transcript.interactionId === interaction.id),
      )
      .map((transcript) =>
        Object.freeze({
          id: `replay-transcript:${transcript.id}`,
          type: 'replay-transcript',
          transcriptId: transcript.id,
          label: `지난 대화 · ${transcript.title}`,
          actionLabel: '다시 듣기',
          description: '완료한 핵심 대화 기록',
        }),
      ),
  );
}

function availableCommands(interaction, transcripts) {
  const commands = [
    ...interactionCommands(interaction),
    ...replayCommands(interaction, transcripts),
  ];
  return commands.length === 0 ? EMPTY_COMMANDS : Object.freeze(commands);
}

function dialogueSource(interaction, transcriptId, transcripts) {
  if (!interaction) return null;
  if (transcriptId) {
    const transcript = findTranscript(transcripts, transcriptId);
    if (!transcript) return null;
    return Object.freeze({
      mode: 'transcript',
      presentationMode: 'transcript',
      conversationId: transcript.id,
      title: transcript.title,
      speaker: transcript.speaker,
      lines: transcript.lines,
    });
  }
  return Object.freeze({
    mode: 'current',
    presentationMode: interaction.presentationMode ?? 'dialogue',
    conversationId: interaction.conversationId ?? null,
    title: interaction.conversationTitle ?? '',
    speaker: interaction.speaker,
    lines: interaction.lines,
  });
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
    this.activeTranscriptId = null;
    this.lineIndex = -1;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  reset() {
    this.activeInteractionId = null;
    this.activeTranscriptId = null;
    this.lineIndex = -1;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  blocksGameplayInput({ entities = [] } = {}) {
    if (!this.activeInteractionId) return false;
    return findInteraction(entities, this.activeInteractionId)?.locksPlayerInput === true;
  }

  advance(deltaSeconds, { entities = [], transcripts = [] } = {}) {
    if (!this.activeInteractionId || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const interaction = findInteraction(entities, this.activeInteractionId);
    const source = dialogueSource(interaction, this.activeTranscriptId, transcripts);
    if (!source) return;
    const characters = Array.from(source.lines[this.lineIndex] ?? '');
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

  completeCurrentLine({ entities = [], transcripts = [] } = {}) {
    const interaction = findInteraction(entities, this.activeInteractionId);
    const source = dialogueSource(interaction, this.activeTranscriptId, transcripts);
    if (!source) return;
    this.revealedCharacters = Array.from(source.lines[this.lineIndex]).length;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
  }

  handleJump({ entities = [], playerPosition = null, transcripts = [] } = {}) {
    if (this.activeInteractionId) {
      const interaction = findInteraction(entities, this.activeInteractionId);
      const source = dialogueSource(interaction, this.activeTranscriptId, transcripts);
      if (!source) {
        this.reset();
        return Object.freeze({ consumed: true, transition: 'missing-target' });
      }
      const lineLength = Array.from(source.lines[this.lineIndex]).length;
      if (this.revealedCharacters < lineLength) {
        this.completeCurrentLine({ entities, transcripts });
        return Object.freeze({ consumed: true, transition: 'completed-line' });
      }
      if (this.lineIndex < source.lines.length - 1) {
        this.lineIndex += 1;
        this.revealedCharacters = 0;
        this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
        return Object.freeze({ consumed: true, transition: 'advanced' });
      }
      const conversationId = source.mode === 'current' ? source.conversationId : null;
      const replayedConversationId = source.mode === 'transcript' ? source.conversationId : null;
      this.reset();
      return Object.freeze({
        consumed: true,
        transition: 'closed',
        conversationId,
        replayedConversationId,
      });
    }

    const interaction = nearestInteraction(entities, playerPosition);
    if (!interaction) return Object.freeze({ consumed: false, transition: 'none' });
    this.activeInteractionId = interaction.id;
    this.lineIndex = 0;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
    return Object.freeze({ consumed: true, transition: 'started' });
  }

  authorizeCommand({ entities = [], transcripts = [] } = {}, interactionId, commandId) {
    if (this.activeInteractionId !== interactionId) return null;
    const interaction = findInteraction(entities, interactionId);
    if (!interaction) return null;
    return (
      availableCommands(interaction, transcripts).find((command) => command.id === commandId) ??
      null
    );
  }

  startTranscript({ entities = [], transcripts = [] } = {}, interactionId, transcriptId) {
    if (this.activeInteractionId !== interactionId) return null;
    const interaction = findInteraction(entities, interactionId);
    const transcript = findTranscript(transcripts, transcriptId);
    if (!interaction || !transcript || transcript.id === interaction.conversationId) return null;
    this.activeTranscriptId = transcript.id;
    this.lineIndex = 0;
    this.revealedCharacters = 0;
    this.revealDelaySeconds = 1 / REVEAL_CHARACTERS_PER_SECOND;
    return transcript;
  }

  snapshot({ entities = [], playerPosition = null, transcripts = [] } = {}) {
    const activeInteraction = this.activeInteractionId
      ? findInteraction(entities, this.activeInteractionId)
      : null;
    if (activeInteraction) {
      const source = dialogueSource(activeInteraction, this.activeTranscriptId, transcripts);
      if (!source) {
        this.reset();
        return EMPTY_DIALOGUE;
      }
      const lineCount = source.lines.length;
      const canAdvance = this.lineIndex < lineCount - 1;
      const line = source.lines[this.lineIndex];
      const lineLength = Array.from(line).length;
      const revealComplete = this.revealedCharacters >= lineLength;
      return Object.freeze({
        active: true,
        available: true,
        mode: source.mode,
        presentationMode: source.presentationMode,
        interactionId: activeInteraction.id,
        conversationId: source.conversationId,
        title: source.title,
        speaker: source.speaker,
        line,
        visibleLine: revealPrefix(line, this.revealedCharacters),
        lineIndex: this.lineIndex,
        lineCount,
        canAdvance: revealComplete && canAdvance,
        canClose: revealComplete && !canAdvance,
        revealComplete,
        prompt: revealComplete ? (canAdvance ? '↑ 다음 대사' : '↑ 대화 마치기') : '↑ 대사 완성',
        worldAnchor: dialogueWorldAnchor(activeInteraction, playerPosition),
        commands:
          source.mode === 'current'
            ? availableCommands(activeInteraction, transcripts)
            : EMPTY_COMMANDS,
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
      worldAnchor: dialogueWorldAnchor(availableInteraction, playerPosition),
    });
  }
}
