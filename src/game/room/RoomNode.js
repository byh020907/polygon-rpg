import { Scene } from '../../core/Scene.js';
import { SceneNode } from '../../core/SceneNode.js';
import { Signal } from '../../core/Signal.js';
import { TRAINING_ENCOUNTER_SCENE } from '../training/TrainingEncounterNode.js';

export class RoomNode extends SceneNode {
  constructor({ snapshot, spinContact }) {
    super(`Room:${snapshot?.active?.roomId ?? 'unknown'}`);
    if (!snapshot?.room || !snapshot?.active) {
      throw new TypeError('Room Scene에는 resolved Room snapshot이 필요합니다.');
    }
    this.location = Object.freeze({ ...snapshot.active });
    this.room = snapshot.room;
    this.playerResultResolved = this.ownSignal(new Signal('playerResultResolved'));
    this.combatEventOccurred = this.ownSignal(new Signal('combatEventOccurred'));
    this.cameraFeedbackOccurred = this.ownSignal(new Signal('cameraFeedbackOccurred'));
    this.encounter = null;

    const entity = snapshot.entities.find((candidate) => candidate.kind === 'combat-test-mob');
    if (!entity) return;
    this.encounter = this.addChild(
      TRAINING_ENCOUNTER_SCENE.instantiate({
        entity,
        groundY: snapshot.room.groundY,
        movementBounds: snapshot.room.movementBounds,
        spinContact,
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
  }

  resetEncounter() {
    this.encounter?.reset();
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
