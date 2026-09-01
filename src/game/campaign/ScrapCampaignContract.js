export const CAMPAIGN_SEGMENTS_PER_DAY = 4;
export const SCRAP_CAMPAIGN_INITIAL_DEADLINE_SEGMENTS = 30 * CAMPAIGN_SEGMENTS_PER_DAY;
export const SCRAP_CAMPAIGN_START_LOCATION_ID = 'neighborhood-scrapyard';
export const SCRAP_CAMPAIGN_CAPITAL_ID = 'royal-capital';

export const CAMPAIGN_TIME_PHASES = Object.freeze([
  Object.freeze({ id: 'morning', label: '아침' }),
  Object.freeze({ id: 'day', label: '낮' }),
  Object.freeze({ id: 'evening', label: '저녁' }),
  Object.freeze({ id: 'night', label: '밤' }),
]);

export const SCRAP_CAMPAIGN_REGION_IDS = Object.freeze([
  'abandoned-mine',
  'harbor-shipyard',
  'greenhouse-plains',
  'snow-trade-road',
  'red-quarry',
]);

export const SCRAP_CAMPAIGN_PART_IDS = Object.freeze([
  'walker-drive',
  'crane-hydraulics',
  'arcane-reactor',
  'snowplow-armor',
  'quarry-cutter',
]);

export const SCRAP_CAMPAIGN_REGION_STATUS = Object.freeze({
  AVAILABLE: 'available',
  CONVOY: 'convoy',
  RESOLVED: 'resolved',
  RECOVERED: 'recovered',
});
