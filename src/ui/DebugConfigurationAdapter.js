import {
  readVisualQaRequest,
  VISUAL_QA_PHASE_IDS,
  VISUAL_QA_RENDERER_IDS,
  visualQaDebugScenarioEntries,
} from '../app/VisualQaConfig.js';

const DEBUG_QUERY_KEYS = Object.freeze([
  'visualQa',
  'gameStart',
  'gameFrame',
  'visualQaRenderer',
  'visualQaPhase',
  'reducedMotion',
  'debugPanel',
]);

const DEFAULT_DEBUG_CONFIGURATION = Object.freeze({
  start: 'scrap-garage-0',
  frame: 0,
  renderer: 'retro',
  phase: 'active',
  reducedMotion: false,
});

export function readDebugQaRequest(search = globalThis.location?.search ?? '') {
  return readVisualQaRequest(search);
}

function copyConfiguration(configuration) {
  return Object.freeze({
    start: configuration.start,
    frame: configuration.frame,
    renderer: configuration.renderer,
    phase: configuration.phase,
    reducedMotion: configuration.reducedMotion,
  });
}

export function createDebugConfiguration(request = null) {
  if (!request) return DEFAULT_DEBUG_CONFIGURATION;
  return copyConfiguration(request);
}

export function buildDebugQaUrl(currentHref, configuration) {
  const url = new URL(currentHref);
  for (const key of DEBUG_QUERY_KEYS) url.searchParams.delete(key);
  url.searchParams.set('visualQa', '1');
  url.searchParams.set('gameStart', String(configuration.start));
  url.searchParams.set('gameFrame', String(configuration.frame));
  url.searchParams.set('visualQaRenderer', String(configuration.renderer));
  url.searchParams.set('visualQaPhase', String(configuration.phase));
  if (configuration.reducedMotion) url.searchParams.set('reducedMotion', '1');

  const request = readDebugQaRequest(url.search);
  return Object.freeze({ href: url.href, configuration: copyConfiguration(request) });
}

export function buildPlayerGameUrl(currentHref) {
  const url = new URL(currentHref);
  for (const key of DEBUG_QUERY_KEYS) url.searchParams.delete(key);
  return url.href;
}

export function createDebugConfigurationAdapter(
  browserLocation = globalThis.location,
  initialRequest = readDebugQaRequest(browserLocation?.search ?? ''),
  {
    browserHistory = globalThis.history,
    requestReconfiguration = () => {
      throw new Error('Debug reconfiguration request port가 연결되지 않았습니다.');
    },
  } = {},
) {
  if (
    !browserLocation ||
    typeof browserLocation.href !== 'string' ||
    !browserHistory ||
    typeof browserHistory.replaceState !== 'function' ||
    typeof requestReconfiguration !== 'function'
  ) {
    throw new TypeError(
      'Debug Configuration Adapter에는 location, history와 reconfiguration port가 필요합니다.',
    );
  }
  let currentHref = browserLocation.href;

  function replaceHistoryAndRequest(href, request) {
    const previousHref = currentHref;
    const previousState = browserHistory.state ?? null;
    browserHistory.replaceState(previousState, '', href);
    try {
      requestReconfiguration(request);
    } catch (error) {
      browserHistory.replaceState(previousState, '', previousHref);
      throw error;
    }
    currentHref = href;
  }

  return Object.freeze({
    scenarioEntries: visualQaDebugScenarioEntries(),
    rendererIds: VISUAL_QA_RENDERER_IDS,
    phaseIds: VISUAL_QA_PHASE_IDS,
    initialConfiguration: createDebugConfiguration(initialRequest),
    panelRequested:
      Boolean(initialRequest) &&
      new URLSearchParams(browserLocation.search).get('debugPanel') === '1',

    apply(configuration) {
      const result = buildDebugQaUrl(currentHref, configuration);
      const url = new URL(result.href);
      url.searchParams.set('debugPanel', '1');
      const request = readDebugQaRequest(url.search);
      const appliedResult = Object.freeze({ ...result, href: url.href, request });
      replaceHistoryAndRequest(appliedResult.href, request);
      return appliedResult;
    },

    returnToPlayerGame() {
      const href = buildPlayerGameUrl(currentHref);
      replaceHistoryAndRequest(href, null);
      return href;
    },
  });
}
