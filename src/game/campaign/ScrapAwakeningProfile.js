import { scrapAwakeningStageDurationSeconds } from './ScrapAwakeningState.js';
import {
  SCRAP_AWAKENING_DEVICE_ENTITY_ID,
  SCRAP_AWAKENING_FOCUS_X,
  SCRAP_AWAKENING_MAP_ID,
  SCRAP_AWAKENING_REGION_ID,
  SCRAP_AWAKENING_ROOM_ID,
} from '../maps/scrapAwakening.js';

export const SCRAP_AWAKENING_PROFILE = Object.freeze({
  id: 'first-scrap-commission-awakening',
  mapId: SCRAP_AWAKENING_MAP_ID,
  regionId: SCRAP_AWAKENING_REGION_ID,
  roomId: SCRAP_AWAKENING_ROOM_ID,
  deviceEntityId: SCRAP_AWAKENING_DEVICE_ENTITY_ID,
  focusX: SCRAP_AWAKENING_FOCUS_X,
  getStageDurationSeconds: scrapAwakeningStageDurationSeconds,
});
