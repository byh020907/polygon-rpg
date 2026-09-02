function cast({ id, name, monologueName = null }) {
  return Object.freeze({ id, name, ...(monologueName ? { monologueName } : {}) });
}

/**
 * User-facing names are authored separately from stable IDs so a rename never
 * changes saved campaign relationships, map patches, or transcript IDs.
 */
export const SCRAP_CAST = Object.freeze({
  PROTAGONIST: cast({
    id: 'scrapyard-apprentice',
    name: '주인공',
    monologueName: '주인공 (독백)',
  }),
  RIVAL: cast({ id: 'rival-scout', name: '라이벌' }),
  SCRAPYARD_OWNER: cast({ id: 'scrapyard-owner', name: '고물상인' }),
});
