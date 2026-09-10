import { getMaterialLedger, MATERIAL_PROFILES } from '../progression/MaterialLedger.js';
import { resolveEquipmentLoadout } from '../equipment/EquipmentLoadout.js';
const freeze = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
export function acquisitionChanges(before, after, catalog, campaignProfile, id) {
  if (before === after) return [];
  const events = [],
    lines = [];
  if (after.gold > before.gold) lines.push({ label: 'Gold', quantity: after.gold - before.gold });
  if (after.trainingMarks > before.trainingMarks)
    lines.push({ label: '수련 인장', quantity: after.trainingMarks - before.trainingMarks });
  const a = getMaterialLedger(before),
    b = getMaterialLedger(after);
  for (const p of MATERIAL_PROFILES)
    if (b[p.id] > a[p.id]) lines.push({ label: p.label, quantity: b[p.id] - a[p.id] });
  const rare = MATERIAL_PROFILES.find((p) => p.rarity === 'rare' && b[p.id] > a[p.id]);
  if (lines.length)
    events.push({
      id: id + ':bundle',
      kind: 'bundle',
      title: rare
        ? '희귀 회수품 · ' + rare.label
        : after.quests.records.some(
              (q) =>
                q.status === 'completed' &&
                !before.quests.records.some(
                  (old) => old.instanceId === q.instanceId && old.status === 'completed',
                ),
            )
          ? '의뢰 완료 보상'
          : '회수 보상',
      importance: rare ? 'important' : 'normal',
      lines,
    });
  for (const itemId of after.ownedEquipmentItemIds.filter(
    (v) => !before.ownedEquipmentItemIds.includes(v),
  )) {
    const item = catalog.getItem(itemId),
      family = catalog.getFamily(item.familyId);
    events.push({
      id: id + ':item:' + itemId,
      kind: 'equipment',
      title: '새 장비 획득 · ' + item.label,
      importance: 'important',
      lines: [{ label: family.label + ' · ' + item.description, quantity: 1 }],
    });
  }
  for (const synergyId of after.discoveredSpecialSynergyIds.filter(
    (v) => !before.discoveredSpecialSynergyIds.includes(v),
  )) {
    const synergy = catalog.specialSynergies.find((s) => s.id === synergyId);
    events.push({
      id: id + ':synergy:' + synergyId,
      kind: 'synergy',
      title: '특수 시너지 발견 · ' + synergy.label,
      importance: 'important',
      lines: [{ label: '도감에 조건과 효과가 등록되었습니다.', quantity: null }],
    });
  }
  const oldSets = resolveEquipmentLoadout(
    before.loadout,
    catalog,
    before.equipmentUpgrades,
  ).activeSetBonuses.map((b) => b.id);
  for (const bonus of resolveEquipmentLoadout(
    after.loadout,
    catalog,
    after.equipmentUpgrades,
  ).activeSetBonuses.filter((b) => !oldSets.includes(b.id)))
    events.push({
      id: id + ':set:' + bonus.id,
      kind: 'set',
      title: bonus.setLabel + ' 활성',
      importance: 'normal',
      lines: [{ label: bonus.description, quantity: null }],
    });
  for (const partId of after.scrapCampaign.collectedPartIds.filter(
    (v) => !before.scrapCampaign.collectedPartIds.includes(v),
  )) {
    const part = campaignProfile.regions.find((r) => r.part.id === partId)?.part;
    events.push({
      id: id + ':part:' + partId,
      kind: 'campaign',
      title: '대항 병기 부품 회수',
      importance: 'major',
      lines: [{ label: part?.label ?? partId, quantity: 1 }],
    });
  }
  for (const [itemId, level] of Object.entries(after.equipmentUpgrades))
    if (level > (before.equipmentUpgrades[itemId] ?? 0))
      events.push({
        id: id + ':upgrade:' + itemId,
        kind: 'upgrade',
        title: catalog.getItem(itemId).label + ' 강화 +' + level,
        importance: 'important',
        lines: [{ label: '기존 장비의 조합과 동작을 유지합니다.', quantity: null }],
      });
  const equipment = events.find((e) => e.kind === 'equipment'),
    bundle = events.find((e) => e.kind === 'bundle');
  if (equipment && bundle) {
    equipment.lines.push(...bundle.lines);
    events.splice(events.indexOf(bundle), 1);
  }
  return freeze(events);
}
export class AcquisitionFeedback {
  constructor() {
    this.entries = [];
    this.sequence = 0;
    this.seen = new Set();
  }
  reset() {
    this.entries = [];
    this.seen.clear();
  }
  push(events, position) {
    const sourceEvents = events ?? [],
      negative = sourceEvents.filter((e) => ['quest-expired', 'quest-failed'].includes(e.kind)),
      offered = sourceEvents.filter((e) => e.kind === 'quest-offered');
    const grouped = sourceEvents.filter(
      (e) => !['quest-expired', 'quest-failed', 'quest-offered'].includes(e.kind),
    );
    if (negative.length)
      grouped.push({
        id: negative.map((e) => e.id).join('|'),
        kind: 'quest-deadline',
        title: '의뢰 기한 종료',
        importance: 'important',
        lines: negative.map((e) => ({
          label: e.title + ' · ' + (e.kind === 'quest-failed' ? '기한 초과' : '기간 종료'),
          quantity: null,
        })),
      });
    if (offered.length)
      grouped.push({
        id: offered.map((e) => e.id).join('|'),
        kind: 'quest-offered',
        title: '오늘의 일반 의뢰',
        importance: 'normal',
        lines: [
          { label: '게시판에 새 의뢰 ' + offered.length + '건이 추가되었습니다.', quantity: null },
        ],
      });
    for (const source of grouped) {
      if (!source?.id || this.seen.has(source.id)) continue;
      this.seen.add(source.id);
      if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value);
      const event = source.message
        ? {
            id: source.id,
            kind: source.kind ?? 'quest',
            title: source.title,
            importance: 'normal',
            lines: [{ label: source.message, quantity: null }],
          }
        : source;
      this.entries.push({
        event: freeze(structuredClone(event)),
        position: { ...position },
        age: 0,
        duration: event.importance === 'major' ? 6 : event.importance === 'important' ? 5 : 3.5,
      });
    }
    if (this.entries.length > 12) this.entries.splice(0, this.entries.length - 12);
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Feedback delta required');
    this.entries = this.entries.filter((e) => (e.age += dt) < e.duration);
  }
  snapshot() {
    return Object.freeze(
      [...this.entries]
        .reverse()
        .sort(
          (a, b) =>
            ({ major: 2, important: 1, normal: 0 })[b.event.importance] -
            { major: 2, important: 1, normal: 0 }[a.event.importance],
        )
        .slice(0, 3)
        .map((e) => e.event),
    );
  }
  renderItems(player) {
    return this.entries
      .filter(
        (e) => e.age < 0.8 && ['bundle', 'equipment', 'quest', 'campaign'].includes(e.event.kind),
      )
      .flatMap((e, index) =>
        Array.from({ length: e.event.importance === 'normal' ? 4 : 7 }, (_, n) => {
          const t = e.age / 0.8,
            angle = n * 2.4,
            x = e.position.x + (player.x - e.position.x) * t + Math.cos(angle) * 22 * (1 - t),
            y =
              e.position.y +
              20 +
              (player.y - e.position.y - 30) * t -
              Math.sin(Math.PI * t) * 25 +
              n * 2;
          return {
            id: 'acquisition-' + index + '-' + n,
            points: [
              { x: x - 2, y },
              { x, y: y - 3 },
              { x: x + 2, y },
              { x, y: y + 3 },
            ],
            fill: e.event.kind === 'equipment' ? '#9ce3d4' : '#eed17b',
            emissive: true,
            opacity: 1 - t,
            renderOrder: 31.5,
            order: n,
          };
        }),
      );
  }
}
