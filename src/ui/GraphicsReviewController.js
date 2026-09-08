import { CanvasPolygonRenderer } from '../rendering/CanvasPolygonRenderer.js';
import { CanvasRetroRenderer } from '../rendering/CanvasRetroRenderer.js';
import { Camera2D } from '../rendering/Camera2D.js';
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
const settings = Object.freeze({
  pixelSize: 3,
  pixelSnap: true,
  alphaThresholdEnabled: true,
  alphaThreshold: 128,
  posterizationLevels: 5,
  outlineWidth: 1,
  showWorldGrid: false,
  showMesh: false,
});
const renderTargets = new WeakMap();

// Both views call the game renderers. Only the inspection camera and viewport differ.
export function renderGraphicsSample(canvas, sample, selection, { thumbnail = false } = {}) {
  const context = canvas.getContext('2d');
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
  if (canvas.width !== Math.ceil(width)) canvas.width = Math.ceil(width);
  if (canvas.height !== Math.ceil(height)) canvas.height = Math.ceil(height);
  if (!thumbnail) {
    canvas.style.width = `${Math.ceil(width) * (isolated && zoom ? zoom : 1)}px`;
    canvas.style.height = `${Math.ceil(height) * (isolated && zoom ? zoom : 1)}px`;
    canvas.style.maxWidth = 'none';
  }
  const logicalWidth = thumbnail || !zoom || !isolated ? 960 : canvas.width;
  const logicalHeight = thumbnail ? 640 : !zoom || !isolated ? 540 : canvas.height;
  const presentationScale = Math.min(canvas.width / logicalWidth, canvas.height / logicalHeight);
  const presentationWidth = Math.round(logicalWidth * presentationScale);
  const presentationHeight = Math.round(logicalHeight * presentationScale);
  const viewport = Object.freeze({
    width: logicalWidth,
    height: logicalHeight,
    cssWidth: canvas.width,
    cssHeight: canvas.height,
    pixelRatio: 1,
    backingWidth: canvas.width,
    backingHeight: canvas.height,
    presentationX: Math.floor((canvas.width - presentationWidth) / 2),
    presentationY: Math.floor((canvas.height - presentationHeight) / 2),
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
  let target = renderTargets.get(canvas);
  if (!target) {
    const host = { context, viewport };
    target = {
      host,
      polygon: new CanvasPolygonRenderer(host, camera),
      retro: new CanvasRetroRenderer(host, camera),
    };
    renderTargets.set(canvas, target);
  }
  target.host.viewport = viewport;
  const renderer = target[selection.renderer];
  renderer.camera = camera;
  return renderer.render(frame, { ...settings, transparent: isolated });
}

export class GraphicsReviewController {
  constructor({ root, catalog, categories, sampler, onClose }) {
    this.root = root;
    this.catalog = catalog;
    this.categories = categories;
    this.sampler = sampler;
    this.onClose = onClose;
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
        <button type="button" data-gr="close">게임으로 돌아가기</button>
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
          <header class="gr-resource-heading"><h2 data-gr="name"></h2><code data-gr="id"></code><p data-gr="source" class="gr-muted"></p></header>
          <div class="gr-options">
            <label>보기<select data-gr="view"><option value="isolated">개별 보기</option><option value="scene">실제 장면 배치</option></select></label>
            <label>Renderer<select data-gr="renderer"><option value="retro">Retro</option><option value="polygon">Polygon</option></select></label>
            <label>크기<select data-gr="scale"><option value="fit">화면에 맞춤</option><option value="1">실제 크기 · 1×</option><option value="2">확대 · 2×</option><option value="4">확대 · 4×</option></select></label>
            <label>방향<select data-gr="facing"><option value="1">오른쪽</option><option value="-1">왼쪽</option></select></label>
            <label>조명<select data-gr="lighting"><option value="scene">실제 장면 광원</option><option value="unlit">기본색</option></select></label>
            <label data-gr="viewport-label">UI 화면<select data-gr="viewport"><option value="desktop">1280×720</option><option value="mobile">844×390</option></select></label>
          </div>
          <div data-gr="stage" class="gr-stage" aria-label="선택 리소스 출력"><canvas data-gr="canvas" aria-label="실제 게임 renderer의 선택 리소스"></canvas><div data-gr="ui-viewport" class="gr-ui-viewport" hidden><iframe data-gr="ui-frame" title="실제 게임 UI 컴포넌트"></iframe></div><img data-gr="image" alt="선택 앱 아이콘 원본" hidden /></div>
          <p data-gr="sample-notes" class="gr-muted"></p>
          <div class="gr-playback">
            <label>동작<select data-gr="action" aria-label="리소스 동작"></select></label>
            <button data-gr="play" type="button">정상 속도 재생</button>
            <button data-gr="previous" type="button" aria-label="이전 프레임">◀</button>
            <button data-gr="next" type="button" aria-label="다음 프레임">▶</button>
            <label class="gr-frame-field">프레임<input data-gr="frame" type="number" min="0" step="1" /></label>
            <span data-gr="frame-count"></span>
          </div>
          <input data-gr="scrubber" class="gr-scrubber" type="range" min="0" step="1" aria-label="프레임 이동" />
          <output data-gr="frame-id" class="gr-frame-id"></output>
          <section data-gr="strips" class="gr-strips" aria-label="동작별 전체 프레임 시트"></section>
          <section class="gr-copy"><div><button data-gr="copy" type="button">선택 · 재현 조건 복사</button><button data-gr="png" type="button">현재 PNG 저장</button></div><p data-gr="status" role="status" aria-live="polite">선택한 출력과 조건을 확인한 뒤 복사해 관리 대화에 붙여넣으세요.</p><label>복사할 내용<textarea data-gr="feedback" readonly rows="8"></textarea></label></section>
        </main>
      </div>`;
    this.nodes = Object.fromEntries(
      [...root.querySelectorAll('[data-gr]')].map((node) => [node.dataset.gr, node]),
    );
    const listen = (node, event, handler) =>
      node.addEventListener(event, handler, { signal: this.abort.signal });
    listen(this.nodes.close, 'click', () => this.close());
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
    for (const key of ['view', 'renderer', 'scale', 'facing', 'lighting', 'viewport'])
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
      'renderer',
      'scale',
      'facing',
      'lighting',
      'viewport',
    ])
      this.nodes[key].value = String(this.selection[key]);
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
    for (const key of ['renderer', 'facing', 'lighting']) {
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
      button.addEventListener('click', () =>
        this.select({ resourceId: resource.id, actionId: '', frameIndex: 0 }, { strips: true }),
      );
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
        renderGraphicsSample(this.nodes.canvas, this.sample, this.selection);
      }
      this.root.dataset.resourceId = resource.id;
      this.root.dataset.frameIndex = String(this.selection.frameIndex);
      this.root.dataset.ready = 'true';
      delete this.root.dataset.error;
      const notes = [resource.notes, this.sample.notes].flat().filter(Boolean).join(' · ');
      const dimensions = this.sample.bounds
        ? `${Math.round(this.sample.bounds.width)} × ${Math.round(this.sample.bounds.height)} world px`
        : '';
      this.nodes['sample-notes'].textContent = [dimensions, notes].filter(Boolean).join(' · ');
      this.nodes['frame-id'].textContent =
        `${this.sample.frameId}${this.sample.sourceFrameId ? ` · pose ${this.sample.sourceFrameId}` : ''}`;
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
            { thumbnail: true },
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
        (firstFrame + Math.floor(((now - started) * 60) / 1000)) % this.action.frameCount;
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
    if (this.nodes) this.nodes.play.textContent = '정상 속도 재생';
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
      this.nodes.feedback.focus();
      this.nodes.feedback.select();
      this.nodes.status.textContent =
        '자동 복사를 사용할 수 없습니다. 선택된 내용을 Ctrl/Cmd+C로 복사하세요.';
    }
  }

  downloadPng() {
    if (this.nodes.canvas.hidden) return;
    this.pause();
    const anchor = el('a');
    anchor.download = `${this.selection.resourceId.replaceAll('/', '_')}-${this.selection.actionId}-${this.selection.frameIndex}.png`;
    anchor.href = this.nodes.canvas.toDataURL('image/png');
    anchor.click();
  }

  close() {
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
    this.destroyed = true;
    this.pause();
    this.abort.abort();
    this.observer.disconnect();
    this.sampler.destroy?.();
  }
}
