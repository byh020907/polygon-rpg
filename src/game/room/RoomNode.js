import { Scene } from '../../core/Scene.js';
import { SceneNode } from '../../core/SceneNode.js';
import { Signal } from '../../core/Signal.js';

export class RoomNode extends SceneNode {
  constructor({ snapshot, spinContact, encounterFactory, enchantmentContext = null }) {
    super(`Room:${snapshot?.active?.roomId ?? 'unknown'}`);
    if (!snapshot?.room || !snapshot?.active) {
      throw new TypeError('Room Scene에는 resolved Room snapshot이 필요합니다.');
    }
    this.location = Object.freeze({ ...snapshot.active });
    this.room = snapshot.room;
    this.playerResultResolved = this.ownSignal(new Signal('playerResultResolved'));
    this.combatEventOccurred = this.ownSignal(new Signal('combatEventOccurred'));
    this.cameraFeedbackOccurred = this.ownSignal(new Signal('cameraFeedbackOccurred'));
    this.encounterCompleted = this.ownSignal(new Signal('encounterCompleted'));
    this.encounter = null;

    const entity = snapshot.entities.find((candidate) =>
      ['combat-test-mob', 'combat-enemy'].includes(candidate.kind),
    );
    if (!entity) return;
    if (typeof encounterFactory !== 'function') {
      throw new TypeError('Combat Room에는 composition-owned encounter factory 주입이 필요합니다.');
    }
    this.encounter = this.addChild(
      encounterFactory({
        entity,
        groundY: snapshot.room.groundY,
        movementBounds: snapshot.room.movementBounds,
        spinContact,
        enchantmentContext,
      }),
    );
  }

  onEnterTree() {
    if (!this.encounter) return;
    this.connectTo(this.encounter.playerResultResolved, (result) =>
      this.playerResultResolved.emit(result),
    );
    this.connectTo(this.encounter.combatEventOccurred, (event) =>
      this.combatEventOccurred.emit(event),
    );
    this.connectTo(this.encounter.cameraFeedbackOccurred, (feedback) =>
      this.cameraFeedbackOccurred.emit(feedback),
    );
    this.connectTo(this.encounter.encounterCompleted, (result) =>
      this.encounterCompleted.emit(result),
    );
  }

  resetEncounter() {
    this.encounter?.reset();
  }

  setEnchantmentContext(context) {
    this.encounter?.setEnchantmentContext(context);
  }

  stepEncounter(deltaSeconds, frame) {
    this.encounter?.step(deltaSeconds, frame);
  }

  getEncounterGameplaySnapshot() {
    return this.encounter?.getGameplaySnapshot() ?? null;
  }

  createEncounterRenderSnapshot(renderOrder) {
    return (
      this.encounter?.createRenderSnapshot(renderOrder) ??
      Object.freeze({ enemy: null, items: Object.freeze([]), contact: null })
    );
  }
}

export const ROOM_SCENE = new Scene((options) => new RoomNode(options));
