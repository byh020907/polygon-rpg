// Read-only observer of production frames. It never resolves contact or writes combat state.
export class TestPlayDiagnostics {
  constructor() {
    this.overlay = false;
    this.paused = false;
    this.armed = false;
    this.tick = 0;
    this.contactKey = null;
    this.frame = null;
    this.previousHealth = null;
    this.healthBefore = null;
  }

  observe(frame) {
    const contact = frame.combatContact;
    const key =
      contact?.attacker === 'player'
        ? `${frame.map.activeRoomId}:${frame.combatGeometry.targetId}:${contact.sequence}:${contact.pulseIndex}`
        : null;
    if (this.armed && key && key !== this.contactKey) {
      this.armed = false;
      this.paused = true;
      this.healthBefore = this.previousHealth;
    }
    this.contactKey = key;
    this.previousHealth = frame.combatEnemy?.health ?? null;
    this.frame = frame;
  }

  snapshot() {
    const frame = this.frame;
    const motion = frame?.combatMotion;
    const enemy = frame?.combatEnemy;
    const contact = frame?.combatContact;
    return Object.freeze({
      overlay: this.overlay,
      paused: this.paused,
      armed: this.armed,
      tick: this.tick,
      summary: frame
        ? `${motion.id} · ${motion.phase} · frame ${motion.frame?.index ?? '-'} · instance ${motion.sequence} | ${enemy?.id ?? '대상 없음'} HP ${enemy?.health ?? '-'}${this.healthBefore !== null ? ` (접촉 전 ${this.healthBefore})` : ''} | ${contact ? `${contact.attacker} → ${contact.outcome ?? contact.response ?? 'contact'} · ${contact.hurtPart ?? ''}` : '접촉 없음'} | ${frame.combatEvents.map((event) => event.type).join(', ')}`
        : '실제 입력으로 공격한 뒤 접촉 프레임을 확인하세요.',
    });
  }

  evidence() {
    const frame = this.frame;
    if (!frame) return null;
    return Object.freeze({
      tick: this.tick,
      paused: this.paused,
      healthBeforeContact: this.healthBefore,
      map: frame.map,
      player: frame.player,
      combatMotion: frame.combatMotion,
      combatEnemy: frame.combatEnemy,
      combatContact: frame.combatContact,
      combatGeometry: frame.combatGeometry,
      combatEvents: frame.combatEvents,
    });
  }
}
