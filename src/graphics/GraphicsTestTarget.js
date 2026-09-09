import { readVisualQaRequest, visualQaDebugScenarioEntries } from '../app/VisualQaConfig.js';
import { SCRAP_AWAKENING_MAP } from '../game/maps/scrapAwakening.js';
const scenarios = visualQaDebugScenarioEntries().map((entry) =>
  readVisualQaRequest(`?visualQa=1&gameStart=${encodeURIComponent(entry.id)}`),
);
export function graphicsTestTarget(resource, action, sample) {
  const unavailable = (reason) => ({ available: false, reason });
  if (resource.producer === 'enemy-reference')
    return unavailable('유형 견본은 검토실에서 동작을 확인합니다.');
  if (['ui', 'image'].includes(resource.kind))
    return unavailable('이 대상은 현재 미리보기에서 확인합니다.');
  if (resource.producer === 'player' || resource.producer === 'equipment')
    return {
      available: true,
      label: resource.label,
      resourceId: resource.id,
      request: readVisualQaRequest('?visualQa=1&gameStart=pose-idle'),
      options: resource.equipmentId ? { equipmentId: resource.equipmentId } : {},
    };
  if (!resource.roomId || !resource.regionId)
    return unavailable('실제 테스트 배치가 없는 대상입니다.');
  const candidates = scenarios.filter(
    (request) =>
      request.scenario.regionId === resource.regionId &&
      request.scenario.roomId === resource.roomId,
  );
  const expected = action?.patchId
    ? candidates.filter((request) =>
        request.scenario.expectation?.expectedPatchIds?.includes(action.patchId),
      )
    : candidates;
  if (!expected.length) return unavailable('이 상태는 장면 보기에서 먼저 확인합니다.');
  const targetX =
    resource.producer === 'enemy'
      ? (sample?.frame?.combatEnemy?.position?.x ?? 480)
      : (sample?.bounds?.x ?? 400) + (sample?.bounds?.width ?? 160) / 2;
  const live = expected.filter((request) =>
    request.scenario.expectation?.expectedItems?.some((id) => id.startsWith('combat-enemy')),
  );
  const pool = resource.producer === 'enemy' ? live : expected;
  if (!pool.length) return unavailable('이 몹의 테스트 장면이 아직 없습니다.');
  const request = [...pool].sort(
    (a, b) => Math.abs((a.scenario.x ?? 480) - targetX) - Math.abs((b.scenario.x ?? 480) - targetX),
  )[0];
  const room = SCRAP_AWAKENING_MAP.regions
    .find((region) => region.id === resource.regionId)
    ?.rooms.find((room) => room.id === resource.roomId);
  if (!room) return unavailable('실제 테스트 위치를 찾지 못했습니다.');
  const x = Math.max(
    room.bounds.x + 40,
    Math.min(
      room.bounds.x + room.bounds.width - 40,
      targetX - (resource.producer === 'enemy' ? 120 : 0),
    ),
  );
  return {
    available: true,
    label: resource.label,
    resourceId: resource.id,
    request,
    options: {
      location: { regionId: resource.regionId, roomId: resource.roomId, x: x - room.bounds.x },
      ...(resource.producer === 'enemy' ? { expectedEntityId: resource.entityId } : {}),
    },
  };
}
