import { WebGlCanvasHost } from '../rendering/WebGlCanvasHost.js';
import { WebGlPolygonRenderer } from '../rendering/WebGlPolygonRenderer.js';
import { Camera2D } from '../rendering/Camera2D.js';
import { ReviewRadialMenu } from './ReviewRadialMenu.js';
import { graphicsNavigation, graphicsActionMenu } from './GraphicsNavigation.js';
import { graphicsBoneItems } from '../graphics/GraphicsDiagnostics.js';
import { graphicsTestTarget } from '../graphics/GraphicsTestTarget.js';
import { buildUiReviewUrl } from './GameUiCatalog.js';
import {
  DEFAULT_GRAPHICS_REVIEW,
  normalizeGraphicsReview,
  buildGraphicsReviewUrl,
  clearGraphicsReviewUrl,
  graphicsReviewFeedback,
} from './GraphicsReviewConfig.js';

const STATIC_ACTION = Object.freeze({ id: 'static', label: '정적', frameCount: 1 });
const actionsOf = (resource) => (resource.actions?.length ? resource.actions : [STATIC_ACTION]);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const settings = Object.freeze({ showWorldGrid: false, showMesh: false });
const renderTargets = new WeakMap();
let sharedThumbnailTarget = null;

function createRenderTarget(canvas, camera) {
  const host = new WebGlCanvasHost(canvas);
  return {
    host,
    polygon: new WebGlPolygonRenderer(host, camera),
    contextStatusListener: null,
    unsubscribeContextStatus: null,
  };
}

function thumbnailRenderTarget(camera) {
  if (!sharedThumbnailTarget) {
    const canvas = document.createElement('canvas');
    sharedThumbnailTarget = { canvas, ...createRenderTarget(canvas, camera) };
  }
  sharedThumbnailTarget.polygon.camera = camera;
  return sharedThumbnailTarget;
}

function disposeRenderTarget(target) {
  target?.unsubscribeContextStatus?.();
  target?.polygon.destroy();
  target?.host.destroy();
}

function setContextStatusListener(target, listener) {
  if (!target || target.contextStatusListener === listener) return;
  target.unsubscribeContextStatus?.();
  target.contextStatusListener = listener;
  target.unsubscribeContextStatus = listener ? target.host.subscribeContext(listener) : null;
}

// All views call the game polygon renderer. Only the inspection camera and viewport differ.
export function renderGraphicsSample(
  canvas,
  sample,
  selection,
  { thumbnail = false, onContextState = null } = {},
) {
  const bounds = sample.bounds;
  const isolated = selection.view !== 'scene';
  const zoom = selection.scale === 'fit' || thumbnail ? null : Number(selection.scale);
  const width = thumbnail
    ? 144
    : zoom && isolated
      ? Math.max(480, bounds.width + 64)
      : Math.min(960, Math.max(300, (canvas.parentElement?.clientWidth ?? 962) - 2));
  const height = thumbnail
    ? 96
    : zoom && isolated
      ? Math.max(300, bounds.height + 64)
      : Math.min(320, Math.max(170, innerHeight * 0.4));
  const cssWidth = Math.ceil(width) * (isolated && zoom ? zoom : 1);
  const cssHeight = Math.ceil(height) * (isolated && zoom ? zoom : 1);
  const pixelRatio = thumbnail
    ? 1
    : Math.min(2, globalThis.devicePixelRatio || 1, Math.sqrt(3_000_000 / (cssWidth * cssHeight)));
  const backingWidth = Math.max(1, Math.floor(cssWidth * pixelRatio));
  const backingHeight = Math.max(1, Math.floor(cssHeight * pixelRatio));
  const renderCanvas = thumbnail ? thumbnailRenderTarget(new Camera2D()).canvas : canvas;
  if (renderCanvas.width !== backingWidth) renderCanvas.width = backingWidth;
  if (renderCanvas.height !== backingHeight) renderCanvas.height = backingHeight;
  if (thumbnail) {
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
  }
  if (!thumbnail) {
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.style.maxWidth = 'none';
  }
  const logicalWidth = thumbnail || !zoom || !isolated ? 960 : Math.ceil(width);
  const logicalHeight = thumbnail ? 640 : !zoom || !isolated ? 540 : Math.ceil(height);
  const presentationScale = Math.min(canvas.width / logicalWidth, canvas.height / logicalHeight);
  const presentationWidth = Math.round(logicalWidth * presentationScale);
  const presentationHeight = Math.round(logicalHeight * presentationScale);
  const viewport = Object.freeze({
    width: logicalWidth,
    height: logicalHeight,
    cssWidth,
    cssHeight,
    pixelRatio,
    backingWidth: renderCanvas.width,
    backingHeight: renderCanvas.height,
    presentationX: Math.floor((renderCanvas.width - presentationWidth) / 2),
    presentationY: Math.floor((renderCanvas.height - presentationHeight) / 2),
    presentationWidth,
    presentationHeight,
  });
  const camera = new Camera2D();
  if (!isolated) camera.zoom = zoom ?? 1;
  let frame = sample.frame;
  if (isolated) {
    camera.position = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    camera.worldSize = { width: logicalWidth, height: logicalHeight };
    camera.zoom =
      (zoom ? 1 : null) ??
      Math.min(
        logicalWidth / Math.max(64, bounds.width * 1.22),
        logicalHeight / Math.max(64, bounds.height * 1.22),
      );
    frame = Object.freeze({
      ...frame,
      cameraOffset: Object.freeze({ x: 0, y: 0 }),
      artDirection: frame.artDirection
        ? Object.freeze({
            ...frame.artDirection,
            cameraZoom: 1,
            mobileCameraScale: 1,
            cameraFocusY: 0.5,
            shadowCasters: Object.freeze([]),
          })
        : null,
    });
  }
  let target = thumbnail ? thumbnailRenderTarget(camera) : renderTargets.get(canvas);
  if (!target) {
    target = createRenderTarget(canvas, camera);
    renderTargets.set(canvas, target);
  }
  setContextStatusListener(target, onContextState);
  target.host.viewport = viewport;
  const renderer = target.polygon;
  renderer.camera = camera;
  if (selection.bones && !thumbnail)
    frame = { ...frame, items: [...frame.items, ...graphicsBoneItems(sample.boneDiagnostics)] };
  const result = renderer.render(frame, {
    ...settings,
    showMesh: !thumbnail && selection.mesh,
    transparent: isolated,
  });
  if (thumbnail) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(renderCanvas, 0, 0);
  }
  return result;
}

export class GraphicsReviewController {
  constructor({ root, catalog, categories, sampler, onClose, onTestPlay }) {
    this.root = root;
    this.catalog = catalog;
    this.categories = categories;
    this.sampler = sampler;
    this.onClose = onClose;
    this.onTestPlay = onTestPlay;
    this.selection = DEFAULT_GRAPHICS_REVIEW;
    this.abort = new AbortController();
    this.playing = false;
    this.animationFrameId = null;
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.tagName === 'IFRAME') {
          if (entry.isIntersecting) entry.target.src = entry.target.dataset.reviewUrl;
          else entry.target.removeAttribute('src');
          continue;
        }
        if (!entry.isIntersecting) continue;
        this.observer.unobserve(entry.target);
        const draw = this.thumbnails.get(entry.target);
        if (draw) {
          this.thumbnails.delete(entry.target);
          try {
            draw();
          } catch (error) {
            entry.target.dataset.error = error.message;
          }
        }
      }
    });
    this.thumbnails = new Map();
    this.actionBounds = new Map();
    this.page = 0;
    this.root.innerHTML = `
      <header class="gr-header">
        <div><small>DEVELOPER · GRAPHICS LIBRARY</small><h1 id="graphics-review-title" tabindex="-1">그래픽 리소스 검토</h1></div>
        <nav class="gr-header-actions"><button type="button" data-gr="import-svg">SVG 불러오기</button><button type="button" data-gr="clear-svg">업로드 비우기</button><input data-gr="svg-file" type="file" accept=".svg,image/svg+xml" hidden/><button type="button" data-gr="find">찾기</button><button type="button" data-gr="catalog-toggle" aria-expanded="false">목록</button><button type="button" data-gr="test">테스트 플레이</button><button type="button" data-gr="diagnostics-toggle">진단</button><button type="button" data-gr="copy">복사</button><button type="button" data-gr="close">게임으로 돌아가기</button></nav>
      </header>
      <div class="gr-layout">
        <aside class="gr-catalog" aria-label="리소스 목록">
          <label>종류<select data-gr="category" aria-label="리소스 종류"></select></label>
          <label>이름 / ID 검색<input data-gr="search" type="search" placeholder="검, mine, player…" /></label>
          <p data-gr="count" class="gr-muted"></p>
          <div data-gr="resources" class="gr-resources"></div>
          <nav class="gr-pager" aria-label="리소스 목록 페이지"><button data-gr="prev-page">이전</button><span data-gr="page"></span><button data-gr="next-page">다음</button></nav>
          <details class="gr-inventory"><summary>등록 범위 · 제외 항목</summary><pre data-gr="inventory"></pre></details>
        </aside>
        <main class="gr-main">
          <header class="gr-resource-heading"><h2 data-gr="name"></h2><small>대상이나 미리보기를 누르면 원형 동작 메뉴가 열립니다.</small></header>

          <p data-gr="status" class="gr-feedback-status" role="status" aria-live="polite"></p><div class="gr-playback">
            <label>동작<select data-gr="action" aria-label="리소스 동작"></select></label>
            <button data-gr="play" type="button">재생</button>
            <button data-gr="previous" type="button" aria-label="이전 프레임">◀</button>
            <button data-gr="next" type="button" aria-label="다음 프레임">▶</button>
            <label class="gr-frame-field">프레임<input data-gr="frame" type="number" min="0" step="1" /></label>
            <span data-gr="frame-count"></span>
          </div>
          <div data-gr="stage" class="gr-stage" aria-label="선택 리소스 출력"><canvas data-gr="canvas" aria-label="선택 리소스 · 누르면 동작 메뉴" tabindex="0"></canvas><div data-gr="ui-viewport" class="gr-ui-viewport" hidden><iframe data-gr="ui-frame" title="실제 게임 UI 컴포넌트"></iframe></div><img data-gr="image" alt="선택 앱 아이콘 원본" hidden /></div>
          <details data-gr="diagnostics" class="gr-diagnostics"><summary>진단 옵션</summary>          <div class="gr-options">
            <label>보기<select data-gr="view"><option value="isolated">개별 보기</option><option value="scene">실제 장면 배치</option></select></label>
            <label>크기<select data-gr="scale"><option value="fit">화면에 맞춤</option><option value="1">실제 크기 · 1×</option><option value="2">확대 · 2×</option><option value="4">확대 · 4×</option></select></label>
            <label>방향<select data-gr="facing"><option value="1">오른쪽</option><option value="-1">왼쪽</option></select></label>
            <label>조명<select data-gr="lighting"><option value="scene">실제 장면 광원</option><option value="unlit">기본색</option><option value="day">낮</option><option value="night">밤</option></select></label>
            <label data-gr="viewport-label">UI 화면<select data-gr="viewport"><option value="desktop">1280×720</option><option value="mobile">844×390</option></select></label>
          </div><div class="gr-diagnostic-controls"><label>재생 속도<select data-gr="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><label><input type="checkbox" data-gr="bones">본 연결</label><label><input type="checkbox" data-gr="mesh">메시</label></div><code data-gr="id"></code><p data-gr="source" class="gr-muted"></p></details>
          <p data-gr="sample-notes" class="gr-muted"></p>

          <input data-gr="scrubber" class="gr-scrubber" type="range" min="0" step="1" aria-label="프레임 이동" />
          <output data-gr="frame-id" class="gr-frame-id"></output>
          <details data-gr="strips-panel" class="gr-strips-panel"><summary>프레임 시트</summary><section data-gr="strips" class="gr-strips" aria-label="동작별 전체 프레임 시트"></section></details>
          <details class="gr-copy"><summary>재현 조건 자세히</summary><div><button data-gr="png" type="button">현재 PNG 저장</button></div><label>복사할 내용<textarea data-gr="feedback" readonly rows="8"></textarea></label></details>
        </main>
      </div>`;
    this.nodes = Object.fromEntries(
      [...root.querySelectorAll('[data-gr]')].map((node) => [node.dataset.gr, node]),
    );
    this.onRenderContextState = (state) => {
      if (this.destroyed || this.closed) return;
      this.nodes.status.textContent =
        state === 'lost'
          ? '그래픽 장치를 복구하는 중입니다. 선택과 프레임은 그대로 유지됩니다.'
          : '그래픽 장치 복구가 완료되어 현재 선택을 다시 그렸습니다.';
    };
    const listen = (node, event, handler) =>
      node.addEventListener(event, handler, { signal: this.abort.signal });
    this.radial = new ReviewRadialMenu(root);
    listen(this.nodes.close, 'click', () => this.close());
    listen(this.nodes['import-svg'], 'click', () => this.nodes['svg-file'].click());
    listen(this.nodes['clear-svg'], 'click', () => {
      this.pause();
      this.catalog.clearSvg?.();
      for (const option of this.nodes.category.options) {
        const count = this.catalog.resources.filter(
          (r) => option.value === 'all' || r.category === option.value,
        ).length;
        option.textContent = option.textContent.replace(/\(\d+\)/, '(' + count + ')');
      }
      const resource = this.catalog.resources[0];
      this.select(
        {
          resourceId: resource.id,
          category: resource.category,
          search: '',
          actionId: '',
          frameIndex: 0,
        },
        { list: true, strips: true },
      );
      this.nodes.status.textContent = '업로드한 SVG를 세션에서 비웠습니다. 원본 파일은 유지됩니다.';
    });
    listen(this.nodes['svg-file'], 'change', async () => {
      const file = this.nodes['svg-file'].files?.[0];
      if (!file) return;
      this.pause();
      this.nodes.status.textContent = 'SVG 원본을 검사하고 있습니다…';
      try {
        if (file.size > 524288) throw Error('SVG는 512 KiB 이하여야 합니다.');
        const text = await file.text();
        if (this.destroyed || this.closed) return;
        const resource = this.catalog.registerSvg(text, file.name);
        for (const option of this.nodes.category.options) {
          const count = this.catalog.resources.filter(
            (r) => option.value === 'all' || r.category === option.value,
          ).length;
          option.textContent = option.textContent.replace(/\(\d+\)/, '(' + count + ')');
        }
        this.select(
          {
            resourceId: resource.id,
            category: resource.category,
            search: '',
            actionId: '',
            frameIndex: 0,
          },
          { list: true, strips: true },
        );
        this.nodes.status.textContent =
          'SVG 검사 완료 · LOD/pose와 본·anchor를 확인하세요. 파일은 세션에만 유지됩니다.';
      } catch (error) {
        this.nodes.status.textContent = 'SVG 불러오기 실패 · ' + error.message;
      } finally {
        this.nodes['svg-file'].value = '';
      }
    });
    listen(this.nodes['catalog-toggle'], 'click', () =>
      this.showCatalog(!this.root.classList.contains('gr-show-catalog')),
    );
    listen(this.nodes.find, 'click', (event) =>
      this.radial.open(
        graphicsNavigation(this.catalog, (id, point) => {
          this.select(
            {
              resourceId: id,
              category: this.catalog.get(id).category,
              search: '',
              actionId: '',
              frameIndex: 0,
            },
            { list: true, strips: true },
          );
          this.openContext(point);
        }),
        { x: event.clientX, y: event.clientY },
        this.nodes.find,
      ),
    );
    listen(this.nodes.test, 'click', () => this.testPlay());
    listen(this.nodes['diagnostics-toggle'], 'click', () => this.showDiagnostics());
    listen(this.nodes.canvas, 'click', (event) => this.openContext(event));
    listen(this.nodes.canvas, 'contextmenu', (event) => {
      event.preventDefault();
      this.openContext(event);
    });
    listen(this.nodes.canvas, 'keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openContext();
      }
    });
    for (const key of ['mesh', 'bones'])
      listen(this.nodes[key], 'change', () =>
        this.select({ [key]: this.nodes[key].checked }, { strips: false }),
      );
    listen(this.nodes.speed, 'change', () => {
      const playing = this.playing;
      this.select({ speed: this.nodes.speed.value }, { strips: false });
      if (playing) this.togglePlayback();
    });
    listen(root, 'keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      if (event.key === 'Tab') {
        const focusable = [
          ...root.querySelectorAll(
            'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea, [tabindex="0"]',
          ),
        ].filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0);
        if (
          event.shiftKey &&
          (event.target === focusable[0] || !focusable.includes(event.target))
        ) {
          event.preventDefault();
          focusable.at(-1)?.focus();
        } else if (!event.shiftKey && event.target === focusable.at(-1)) {
          event.preventDefault();
          focusable[0]?.focus();
        }
      }
      if (['ArrowLeft', 'ArrowRight'].includes(event.key) && event.target.matches('.gr-frame')) {
        event.preventDefault();
        const index =
          Number(event.target.dataset.frameIndex) + (event.key === 'ArrowRight' ? 1 : -1);
        this.select({ actionId: event.target.dataset.actionId, frameIndex: Math.max(0, index) });
        this.nodes.strips.querySelector(`.gr-frame[aria-pressed="true"]`)?.focus();
      }
    });
    listen(this.nodes.category, 'change', () =>
      this.setFilter({ category: this.nodes.category.value }),
    );
    listen(this.nodes.search, 'input', () => this.setFilter({ search: this.nodes.search.value }));
    for (const key of ['view', 'scale', 'facing', 'lighting', 'viewport'])
      listen(this.nodes[key], 'change', () =>
        this.select(
          { [key]: this.nodes[key].value },
          { strips: key !== 'scale' && key !== 'view' },
        ),
      );
    listen(this.nodes.action, 'change', () =>
      this.select({ actionId: this.nodes.action.value, frameIndex: 0 }),
    );
    for (const key of ['frame', 'scrubber'])
      listen(this.nodes[key], 'input', () => this.seek(Number(this.nodes[key].value)));
    listen(this.nodes.previous, 'click', () => this.seek(this.selection.frameIndex - 1));
    listen(this.nodes.next, 'click', () => this.seek(this.selection.frameIndex + 1));
    listen(this.nodes.play, 'click', () => this.togglePlayback());
    listen(this.nodes.copy, 'click', () => this.copy());
    listen(this.nodes.png, 'click', () => this.downloadPng());
    listen(this.nodes['ui-frame'], 'load', () => {
      const frame = this.nodes['ui-frame'];
      if (this.nodes['ui-viewport'].hidden) return;
      const check = (attempt = 0) => {
        if (this.destroyed || this.closed || this.nodes['ui-viewport'].hidden || this.root.hidden)
          return;
        const doc = frame.contentDocument;
        const targets = [...(doc?.querySelectorAll(this.resource.selector) ?? [])];
        const visible =
          doc?.documentElement.dataset.uiReview === this.resource.id &&
          targets.some(
            (target) =>
              target.getClientRects().length > 0 &&
              doc.defaultView.getComputedStyle(target).display !== 'none',
          );
        if (!visible && attempt < 100) {
          setTimeout(() => check(attempt + 1), 100);
          return;
        }
        this.root.dataset.uiVisible = String(visible);
        if (!visible)
          this.nodes.status.textContent =
            '이 조건에서 해당 UI는 표시되지 않습니다. 장면 상태 또는 컴포넌트 등록을 확인해야 합니다.';
      };
      check();
    });
    listen(this.nodes['prev-page'], 'click', () => {
      this.page = Math.max(0, this.page - 1);
      this.renderList();
    });
    listen(this.nodes['next-page'], 'click', () => {
      this.page += 1;
      this.renderList();
    });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    const option = (value, label) => {
      const node = el('option', null, label);
      node.value = value;
      return node;
    };
    this.nodes.category.append(option('all', `전체 (${catalog.resources.length})`));
    for (const category of categories) {
      const count = catalog.resources.filter(
        (resource) => resource.category === category.id,
      ).length;
      this.nodes.category.append(option(category.id, `${category.label} (${count})`));
    }
    this.nodes.inventory.textContent =
      typeof catalog.inventory === 'string'
        ? catalog.inventory
        : JSON.stringify(catalog.inventory, null, 2);
  }

  open(request = DEFAULT_GRAPHICS_REVIEW) {
    this.closed = false;
    this.returnHref = location.href;
    this.root.hidden = false;
    document.getElementById('app').inert = true;
    document.body.classList.add('graphics-review-open');
    this.select(request, { strips: true, list: true });
    this.root.querySelector('h1').focus();
  }

  get resource() {
    return this.catalog.get(this.selection.resourceId);
  }
  get action() {
    return (
      actionsOf(this.resource).find((action) => action.id === this.selection.actionId) ??
      actionsOf(this.resource)[0]
    );
  }

  select(patch, { strips = false, list = false } = {}) {
    this.pause();
    let candidate = normalizeGraphicsReview({ ...this.selection, ...patch });
    let resource;
    try {
      resource = this.catalog.get(candidate.resourceId);
    } catch {
      resource = null;
    }
    if (!resource) {
      if (candidate.resourceId.startsWith('uploaded-svg:'))
        this.nodes.status.textContent = '세션 SVG입니다. 원본 파일을 다시 불러오세요.';
      resource = this.catalog.resources[0];
      if (candidate.resourceId)
        this.nodes.status.textContent = `찾을 수 없는 ID: ${candidate.resourceId}. 첫 리소스를 표시합니다.`;
      candidate = normalizeGraphicsReview({
        ...candidate,
        resourceId: resource.id,
        actionId: '',
        frameIndex: 0,
      });
    }
    const resourceChanged = candidate.resourceId !== this.selection.resourceId;
    if (resource.viewports && !resource.viewports.includes(candidate.viewport))
      candidate = normalizeGraphicsReview({ ...candidate, viewport: resource.viewports[0] });
    if (resourceChanged && resource.kind === 'scene')
      candidate = normalizeGraphicsReview({ ...candidate, view: 'scene' });
    const actions = actionsOf(resource);
    const action = actions.find((entry) => entry.id === candidate.actionId) ?? actions[0];
    if (candidate.actionId && action.id !== candidate.actionId)
      this.nodes.status.textContent = `없는 동작 ID: ${candidate.actionId}. ${action.label} 동작으로 열었습니다.`;
    else if (candidate.frameIndex >= action.frameCount)
      this.nodes.status.textContent = `프레임 ${candidate.frameIndex}은 현재 범위를 벗어납니다. 마지막 프레임 ${action.frameCount - 1}을 표시합니다.`;
    this.selection = normalizeGraphicsReview({
      ...candidate,
      actionId: action.id,
      frameIndex: Math.min(candidate.frameIndex, Math.max(0, action.frameCount - 1)),
    });
    for (const key of [
      'category',
      'search',
      'view',
      'scale',
      'facing',
      'lighting',
      'viewport',
      'speed',
    ])
      this.nodes[key].value = String(this.selection[key]);
    this.nodes.mesh.checked = this.selection.mesh;
    this.nodes.bones.checked = this.selection.bones;
    this.nodes.name.textContent = resource.label;
    this.nodes.id.textContent = resource.id;
    this.nodes.source.textContent = resource.source ?? '';
    this.nodes.action.replaceChildren(
      ...actions.map((action) => {
        const option = el('option', null, `${action.label} · ${action.frameCount}f`);
        option.value = action.id;
        return option;
      }),
    );
    this.nodes.action.value = this.selection.actionId;
    this.nodes['frame-count'].textContent = `/ ${Math.max(0, action.frameCount - 1)} · 60 fps`;
    for (const key of ['frame', 'scrubber'])
      this.nodes[key].max = String(Math.max(0, action.frameCount - 1));
    for (const key of ['play', 'previous', 'next', 'frame', 'scrubber'])
      this.nodes[key].disabled = action.frameCount <= 1;
    const pixelOutput = !['ui', 'image'].includes(resource.kind);
    for (const key of ['facing', 'lighting']) {
      this.nodes[key].disabled = !pixelOutput;
      this.nodes[key].closest('label').hidden = !pixelOutput;
    }
    this.nodes.png.disabled = !pixelOutput;
    this.nodes['viewport-label'].hidden = resource.kind !== 'ui';
    this.nodes.viewport.disabled = resource.viewports?.length === 1;
    this.nodes.view.disabled = resource.kind === 'scene';
    this.renderSample();
    if (list || resourceChanged) this.renderList();
    if (strips || resourceChanged) this.renderStrips();
    this.updateUrl();
  }

  setFilter(patch) {
    this.showCatalog(true);
    this.selection = normalizeGraphicsReview({ ...this.selection, ...patch });
    this.page = 0;
    this.renderList();
    this.updateUrl();
  }

  lazy(canvas, draw) {
    this.thumbnails.set(canvas, draw);
    this.observer.observe(canvas);
  }

  sampleResource(resourceId, selection) {
    const sample = this.sampler.sample(resourceId, selection);
    const resource = this.catalog.get(resourceId);
    const action = actionsOf(resource).find((action) => action.id === selection.actionId);
    if (selection.view === 'scene' || !action || action.frameCount <= 1) return sample;
    const key = `${resourceId}/${action.id}/${selection.facing}/${selection.lighting}`;
    if (!this.actionBounds.has(key)) {
      // Fit the whole motion once, so frame movement never changes its camera or scale.
      const bounds = Array.from(
        { length: action.frameCount },
        (_, frameIndex) => this.sampler.sample(resourceId, { ...selection, frameIndex }).bounds,
      );
      const x = Math.min(...bounds.map((b) => b.x));
      const y = Math.min(...bounds.map((b) => b.y));
      this.actionBounds.set(
        key,
        Object.freeze({
          x,
          y,
          width: Math.max(...bounds.map((b) => b.x + b.width)) - x,
          height: Math.max(...bounds.map((b) => b.y + b.height)) - y,
        }),
      );
    }
    return { ...sample, bounds: this.actionBounds.get(key) };
  }

  renderList() {
    const search = this.selection.search.toLocaleLowerCase();
    const resources = this.catalog.resources.filter(
      (resource) =>
        (this.selection.category === 'all' || resource.category === this.selection.category) &&
        `${resource.id} ${resource.label} ${resource.source}`.toLocaleLowerCase().includes(search),
    );
    const pageCount = Math.max(1, Math.ceil(resources.length / 18));
    this.page = Math.min(this.page, pageCount - 1);
    for (const node of this.nodes.resources.querySelectorAll('canvas, iframe')) {
      this.observer.unobserve(node);
      this.thumbnails.delete(node);
    }
    this.nodes.resources.replaceChildren();
    this.nodes.count.textContent = `${resources.length}개 · 전체 ${this.catalog.resources.length}개`;
    this.nodes.page.textContent = `${this.page + 1} / ${pageCount}`;
    this.nodes['prev-page'].disabled = this.page === 0;
    this.nodes['next-page'].disabled = this.page === pageCount - 1;
    for (const resource of resources.slice(this.page * 18, this.page * 18 + 18)) {
      const button = el('button', 'gr-resource');
      button.type = 'button';
      button.dataset.resourceId = resource.id;
      button.setAttribute('aria-pressed', String(resource.id === this.selection.resourceId));
      button.addEventListener('click', (event) => {
        this.select({ resourceId: resource.id, actionId: '', frameIndex: 0 }, { strips: true });
        this.openContext(event);
      });
      if (resource.kind === 'image') {
        const image = el('img');
        image.src = resource.imageUrl;
        image.alt = '';
        button.append(image);
      } else if (resource.kind === 'ui') {
        const preview = el('div', 'gr-ui-thumbnail');
        const iframe = el('iframe');
        iframe.title = `${resource.label} thumbnail`;
        iframe.tabIndex = -1;
        iframe.loading = 'lazy';
        iframe.dataset.reviewUrl = buildUiReviewUrl(location.href, resource);
        preview.append(iframe);
        button.append(preview);
        this.observer.observe(iframe);
      } else {
        const canvas = el('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        button.append(canvas);
        const selection = {
          ...this.selection,
          resourceId: resource.id,
          actionId: actionsOf(resource)[0].id,
          frameIndex: 0,
          view: resource.kind === 'scene' ? 'scene' : 'isolated',
          scale: 'fit',
        };
        this.lazy(canvas, () =>
          renderGraphicsSample(canvas, this.sampleResource(resource.id, selection), selection, {
            thumbnail: true,
            onContextState: this.onRenderContextState,
          }),
        );
      }
      const text = el('span');
      text.append(el('strong', null, resource.label), el('code', null, resource.id));
      button.append(text);
      this.nodes.resources.append(button);
    }
  }

  renderSample() {
    const resource = this.resource;
    for (const name of ['canvas', 'ui-viewport', 'image']) this.nodes[name].hidden = true;
    try {
      if (resource.kind === 'ui') {
        const iframe = this.nodes['ui-frame'];
        const wrapper = this.nodes['ui-viewport'];
        wrapper.hidden = false;
        const url = buildUiReviewUrl(location.href, resource, this.selection.view);
        if (iframe.src !== url) {
          delete this.root.dataset.uiVisible;
          iframe.src = url;
        }
        const [width, height] = this.selection.viewport === 'mobile' ? [844, 390] : [1280, 720];
        const scale =
          this.selection.scale === 'fit'
            ? Math.min(1, (this.nodes.stage.clientWidth - 2) / width)
            : Number(this.selection.scale);
        iframe.style.width = `${width}px`;
        iframe.style.height = `${height}px`;
        iframe.style.transform = `scale(${scale})`;
        wrapper.style.width = `${width * scale}px`;
        wrapper.style.height = `${height * scale}px`;
        this.sample = {
          frameId: `${resource.id}/static/0`,
          notes: '실제 게임 페이지의 같은 UI 컴포넌트 · 이 화면에서 게임 동작은 실행하지 않습니다.',
        };
      } else if (resource.kind === 'image') {
        const image = this.nodes.image;
        image.hidden = false;
        image.src = resource.imageUrl;
        const scale = this.selection.scale === 'fit' ? null : Number(this.selection.scale);
        image.style.width = scale ? `${Number(resource.id.split('-').at(-1)) * scale}px` : 'auto';
        image.style.maxWidth = scale ? 'none' : '100%';
        this.sample = { frameId: `${resource.id}/static/0`, notes: '배포에 사용하는 원본 PNG' };
      } else {
        this.sample = this.sampleResource(resource.id, this.selection);
        this.nodes.canvas.hidden = false;
        renderGraphicsSample(this.nodes.canvas, this.sample, this.selection, {
          onContextState: this.onRenderContextState,
        });
      }
      this.root.dataset.resourceId = resource.id;
      this.root.dataset.frameIndex = String(this.selection.frameIndex);
      this.root.dataset.ready = 'true';
      delete this.root.dataset.error;
      const notes = [resource.notes, this.sample.notes].flat().filter(Boolean).join(' · ');
      const dimensions = this.sample.bounds
        ? `${Math.round(this.sample.bounds.width)} × ${Math.round(this.sample.bounds.height)} world px`
        : '';
      const svgInfo = this.sample.svgDiagnostics
        ? `SVG ${this.sample.svgDiagnostics.parts}부위 / ${this.sample.svgDiagnostics.anchors.length} anchors / ${this.sample.svgDiagnostics.lod} / ${this.sample.svgDiagnostics.pose}`
        : '';
      this.nodes['sample-notes'].textContent = [dimensions, svgInfo, notes]
        .filter(Boolean)
        .join(' · ');
      this.nodes['frame-id'].textContent =
        `${this.sample.frameId}${this.sample.sourceFrameId ? ` · pose ${this.sample.sourceFrameId}` : ''}`;
      this.testTarget = graphicsTestTarget(resource, this.action, this.sample);
      this.nodes.test.disabled = !this.testTarget.available;
      this.nodes.test.title = this.testTarget.reason ?? '이 위치에서 직접 조작';
      this.nodes.bones.disabled = !this.sample.boneDiagnostics?.length;
      this.updateFrameControls();
    } catch (error) {
      this.pause();
      this.root.dataset.error = error.message;
      this.root.dataset.ready = 'false';
      this.nodes.status.textContent = `출력 실패 · ${error.message}`;
    }
    this.updateFeedback();
  }

  renderStrips() {
    for (const node of this.nodes.strips.querySelectorAll('canvas')) {
      this.observer.unobserve(node);
      this.thumbnails.delete(node);
    }
    this.nodes.strips.replaceChildren();
    const actions = actionsOf(this.resource);
    if (actions.every((action) => action.frameCount <= 1)) {
      this.nodes.strips.append(
        el('p', 'gr-muted', '정적 리소스입니다. 현재 없는 애니메이션은 만들지 않습니다.'),
      );
      return;
    }
    for (const action of actions) {
      const section = el('section', 'gr-strip-row');
      section.dataset.actionId = action.id;
      section.append(
        el('h3', null, `${action.label} · ${action.id} · ${action.frameCount} frames`),
      );
      const strip = el('div', 'gr-strip');
      for (let frameIndex = 0; frameIndex < action.frameCount; frameIndex += 1) {
        const button = el('button', 'gr-frame');
        button.type = 'button';
        button.dataset.actionId = action.id;
        button.dataset.frameIndex = String(frameIndex);
        button.setAttribute('aria-label', `${action.label} 프레임 ${frameIndex}`);
        const canvas = el('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        button.append(canvas, el('span', null, String(frameIndex).padStart(3, '0')));
        button.addEventListener('click', () => this.select({ actionId: action.id, frameIndex }));
        const selection = {
          ...this.selection,
          actionId: action.id,
          frameIndex,
          scale: 'fit',
          view: 'isolated',
        };
        this.lazy(canvas, () =>
          renderGraphicsSample(
            canvas,
            this.sampleResource(this.resource.id, selection),
            selection,
            { thumbnail: true, onContextState: this.onRenderContextState },
          ),
        );
        strip.append(button);
      }
      section.append(strip);
      this.nodes.strips.append(section);
    }
    this.updateFrameControls();
  }

  updateFrameControls() {
    this.nodes.frame.value = String(this.selection.frameIndex);
    this.nodes.scrubber.value = String(this.selection.frameIndex);
    for (const node of this.nodes.strips.querySelectorAll('.gr-frame')) {
      const selected =
        node.dataset.actionId === this.selection.actionId &&
        Number(node.dataset.frameIndex) === this.selection.frameIndex;
      node.setAttribute('aria-pressed', String(selected));
      node.tabIndex =
        selected ||
        (Number(node.dataset.frameIndex) === 0 && node.dataset.actionId !== this.selection.actionId)
          ? 0
          : -1;
    }
  }

  showCatalog(visible) {
    this.root.classList.toggle('gr-show-catalog', visible);
    this.nodes['catalog-toggle'].setAttribute('aria-expanded', String(visible));
    if (innerWidth <= 600) this.root.querySelector('.gr-layout').scrollTop = 0;
  }
  showDiagnostics() {
    this.radial.close();
    this.nodes.diagnostics.open = true;
    this.nodes['diagnostics-toggle'].setAttribute('aria-expanded', 'true');
    this.nodes.diagnostics.scrollIntoView({ block: 'nearest' });
    this.nodes.speed.focus();
  }
  openContext(event) {
    this.showCatalog(false);
    const r = this.nodes.canvas.getBoundingClientRect();
    const point = event
      ? { x: event.clientX ?? event.x, y: event.clientY ?? event.y }
      : { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    const target = this.testTarget ?? { available: false, reason: '실제 배치가 없는 대상입니다.' };
    this.radial.open(
      {
        label: this.resource.label,
        children: [
          {
            label: this.playing ? '정지' : '재생',
            disabled: this.action.frameCount <= 1,
            run: () => this.togglePlayback(),
          },
          graphicsActionMenu(actionsOf(this.resource), (id) => {
            this.select({ actionId: id, frameIndex: 0 }, { strips: true });
            if (this.action.frameCount > 1) this.togglePlayback();
          }),
          {
            label: this.selection.view === 'scene' ? '개별 보기' : '장면 보기',
            run: () =>
              this.select({ view: this.selection.view === 'scene' ? 'isolated' : 'scene' }),
          },
          { label: '진단', run: () => this.showDiagnostics() },
          {
            label: '테스트',
            disabled: !target.available,
            reason: target.reason,
            run: () => this.testPlay(),
          },
          { label: '복사', run: () => this.copy() },
        ],
      },
      point,
      this.nodes.canvas,
    );
  }
  testPlay() {
    if (!this.testTarget?.available || !this.onTestPlay) return;
    this.radial.close(false);
    this.pause();
    try {
      this.onTestPlay(this.testTarget, this.selection);
      this.root.hidden = true;
      this.observer.disconnect();
      this.nodes['ui-frame'].removeAttribute('src');
      document.getElementById('app').inert = false;
      document.body.classList.remove('graphics-review-open');
    } catch (error) {
      this.nodes.status.textContent = '테스트 시작 실패 · ' + error.message;
    }
  }
  seek(frameIndex) {
    if (!Number.isFinite(frameIndex)) return;
    this.select({
      frameIndex: Math.max(0, Math.min(this.action.frameCount - 1, Math.floor(frameIndex))),
    });
  }

  togglePlayback() {
    if (this.playing) {
      this.pause();
      this.updateUrl();
      return;
    }
    if (this.action.frameCount <= 1) return;
    this.playing = true;
    this.root.dataset.playing = 'true';
    this.nodes.play.textContent = '정지';
    const started = performance.now();
    const firstFrame = this.selection.frameIndex;
    const tick = (now) => {
      if (!this.playing) return;
      const frameIndex =
        (firstFrame + Math.floor(((now - started) * 60 * this.selection.speed) / 1000)) %
        this.action.frameCount;
      if (frameIndex !== this.selection.frameIndex) {
        this.selection = normalizeGraphicsReview({ ...this.selection, frameIndex });
        this.renderSample();
      }
      if (this.playing) this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  pause() {
    this.playing = false;
    this.root.dataset.playing = 'false';
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    if (this.nodes) this.nodes.play.textContent = '재생';
  }

  updateFeedback() {
    this.nodes.feedback.value = graphicsReviewFeedback(
      this.resource,
      this.selection,
      this.sample,
      location.href,
    );
  }
  updateUrl() {
    history.replaceState(history.state, '', buildGraphicsReviewUrl(location.href, this.selection));
    this.updateFeedback();
  }

  async copy() {
    this.pause();
    this.updateUrl();
    try {
      await navigator.clipboard.writeText(this.nodes.feedback.value);
      this.nodes.status.textContent =
        '선택과 재현 조건을 복사했습니다. 관리 대화에 붙여넣고 피드백을 덧붙이세요.';
    } catch {
      this.nodes.feedback.closest('details').open = true;
      this.nodes.feedback.focus();
      this.nodes.feedback.select();
      this.nodes.status.textContent =
        '자동 복사를 사용할 수 없습니다. 선택된 내용을 Ctrl/Cmd+C로 복사하세요.';
    }
  }

  downloadPng() {
    if (this.nodes.canvas.hidden) return;
    this.pause();
    this.renderSample();
    const anchor = el('a');
    anchor.download = `${this.selection.resourceId.replaceAll('/', '_')}-${this.selection.actionId}-${this.selection.frameIndex}.png`;
    anchor.href = this.nodes.canvas.toDataURL('image/png');
    anchor.click();
  }

  close() {
    this.radial.close(false);
    this.closed = true;
    this.pause();
    this.root.hidden = true;
    this.nodes['ui-frame'].removeAttribute('src');
    for (const frame of this.nodes.resources.querySelectorAll('iframe'))
      frame.removeAttribute('src');
    this.observer.disconnect();
    this.thumbnails.clear();
    document.getElementById('app').inert = false;
    document.body.classList.remove('graphics-review-open');
    history.replaceState(history.state, '', clearGraphicsReviewUrl(this.returnHref));
    this.onClose?.();
  }

  destroy() {
    this.radial.destroy();
    this.destroyed = true;
    this.pause();
    this.abort.abort();
    this.observer.disconnect();
    this.sampler.destroy?.();
    const mainTarget = renderTargets.get(this.nodes.canvas);
    disposeRenderTarget(mainTarget);
    renderTargets.delete(this.nodes.canvas);
    disposeRenderTarget(sharedThumbnailTarget);
    sharedThumbnailTarget = null;
  }
}
