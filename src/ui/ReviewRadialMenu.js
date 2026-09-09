import { radialTypeColor } from './RadialTypeColors.js';
// One pointer, keyboard and focus owner for the whole navigation tree.
export class ReviewRadialMenu {
  constructor(root) {
    this.root = root;
    this.history = [];
    this.inert = [];
    this.resize = () => {
      if (!this.layer) return;
      const focusedSearch = document.activeElement === this.layer.querySelector('input');
      const { node, point, query, page } = this.current;
      this.show(node, point, query, page, focusedSearch);
    };
    globalThis.addEventListener('resize', this.resize);
  }
  open(node, point, opener = document.activeElement) {
    this.close(false);
    this.opener = opener;
    this.history = [];
    this.searchable = node.searchable === true;
    this.inert = [...this.root.children].map((element) => [element, element.inert]);
    this.inert.forEach(([element]) => {
      element.inert = true;
    });
    this.layer = document.createElement('div');
    this.layer.className = 'gr-radial-backdrop';
    this.layer.addEventListener('click', (event) => {
      if (event.target === this.layer) {
        event.stopPropagation();
        this.close();
      }
    });
    this.layer.addEventListener('contextmenu', (event) => event.preventDefault());
    this.layer.addEventListener('keydown', (event) => this.key(event));
    this.root.append(this.layer);
    this.show(node, point);
    return this;
  }
  leaves(node) {
    return node.children ? node.children.flatMap((child) => this.leaves(child)) : [node];
  }
  show(node, point, query = '', page = 0, focusSearch = false) {
    this.layer.replaceChildren();
    const compact = innerHeight < 470 || innerWidth < 340;
    const radius = 84;
    const x = Math.max(172, Math.min(innerWidth - 172, point?.x ?? innerWidth / 2));
    const y = Math.max(240, Math.min(innerHeight - 232, point?.y ?? innerHeight / 2));
    this.current = { node, point: { x, y }, query, page };
    const menu = document.createElement('section');
    menu.className = 'gr-radial gr-radial--tree';
    menu.classList.toggle('gr-radial--compact', compact);
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', node.label);
    menu.style.setProperty('--radial-radius', `${radius}px`);
    const currentColor = radialTypeColor(node.colorKey);
    menu.style.setProperty('--radial-accent', currentColor.accent);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    const makeButton = (label, action, className) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = className;
      b.textContent = label;
      b.title = label;
      b.addEventListener('click', (event) => {
        event.stopPropagation();
        action(event);
      });
      return b;
    };
    const header = document.createElement('header');
    header.className = 'gr-radial-header';
    const trail = document.createElement('nav');
    trail.className = 'gr-radial-trail';
    trail.setAttribute('aria-label', '현재 탐색 경로');
    this.history.forEach((entry, index) =>
      trail.append(
        makeButton(
          entry.node.label,
          () => {
            this.history = this.history.slice(0, index);
            this.show(entry.node, entry.point, entry.query, entry.page);
          },
          'gr-radial-ancestor',
        ),
      ),
    );
    const title = document.createElement('strong');
    title.textContent = node.label;
    title.title = node.label;
    trail.append(title);
    header.append(trail);
    let search;
    if (this.searchable) {
      search = document.createElement('input');
      search.type = 'search';
      search.className = 'gr-radial-search';
      search.placeholder = '이 분류에서 이름·ID 검색';
      search.setAttribute('aria-label', '트리 내 하위 항목 검색');
      search.value = query;
      search.addEventListener('input', () => {
        if (!search.composing) this.show(node, this.current.point, search.value, 0, true);
      });
      search.addEventListener('compositionstart', () => {
        search.composing = true;
      });
      search.addEventListener('compositionend', () => {
        search.composing = false;
        this.show(node, this.current.point, search.value, 0, true);
      });
      header.append(search);
    }
    menu.append(header);
    const needle = query.trim().toLocaleLowerCase();
    const choices = needle
      ? this.leaves(node).filter((entry) =>
          `${entry.label} ${entry.resourceId ?? ''}`.toLocaleLowerCase().includes(needle),
        )
      : (node.children ?? []);
    const pages = Math.max(1, Math.ceil(choices.length / 6));
    page = Math.max(0, Math.min(pages - 1, page));
    this.current.page = page;
    const footer = document.createElement('footer');
    footer.className = 'gr-radial-footer';
    const detail = document.createElement('p');
    detail.className = 'gr-radial-detail';
    detail.textContent = choices.length
      ? `${choices.length}개 항목 · 대상을 선택하세요`
      : '검색 결과가 없습니다';
    footer.append(detail);
    choices.slice(page * 6, page * 6 + 6).forEach((entry, index) => {
      const button = makeButton(
        entry.label + (entry.children ? ' ›' : ''),
        (event) => {
          if (entry.children) {
            this.history.push(this.current);
            this.show(entry, this.current.point);
          } else {
            const anchor = this.current.point;
            this.close();
            entry.run?.({ x: event.clientX || anchor.x, y: event.clientY || anchor.y });
          }
        },
        'gr-radial-item',
      );
      const color = radialTypeColor(entry.colorKey ?? node.colorKey);
      button.style.setProperty('--radial-accent', color.accent);
      button.style.setProperty('--radial-fill', color.background);
      if (entry.colorKey) button.dataset.type = entry.colorKey;
      button.disabled = Boolean(entry.disabled);
      button.title = entry.reason ?? entry.label;
      if (entry.resourceId) button.dataset.resourceId = entry.resourceId;
      const angle = -Math.PI / 2 + (index * Math.PI) / 3;
      button.style.setProperty('--radial-x', `${Math.cos(angle) * radius}px`);
      button.style.setProperty('--radial-y', `${Math.sin(angle) * radius}px`);
      const describe = () => {
        detail.textContent = entry.reason ?? entry.label;
      };
      button.addEventListener('pointerenter', describe);
      button.addEventListener('focus', describe);
      menu.append(button);
    });
    menu.append(
      makeButton(
        query ? '검색 해제' : this.history.length ? '뒤로' : '닫기',
        () => this.back(),
        'gr-radial-center',
      ),
    );
    const pager = document.createElement('nav');
    pager.className = 'gr-radial-pages';
    pager.setAttribute('aria-label', '항목 페이지');
    const previous = makeButton(
      '이전',
      () => this.show(node, this.current.point, query, page - 1),
      'gr-radial-previous',
    );
    previous.disabled = page === 0;
    const count = document.createElement('span');
    count.textContent = `${page + 1} / ${pages} · ${choices.length}개`;
    count.setAttribute('role', 'status');
    const next = makeButton(
      '다음',
      () => this.show(node, this.current.point, query, page + 1),
      'gr-radial-next',
    );
    next.disabled = page === pages - 1;
    pager.append(previous, count, next);
    footer.append(pager);
    menu.append(footer);
    this.layer.append(menu);
    if (focusSearch) search?.focus({ preventScroll: true });
    else
      (
        menu.querySelector('.gr-radial-item:not([disabled])') ??
        menu.querySelector('.gr-radial-center')
      ).focus({ preventScroll: true });
    trail.scrollLeft = trail.scrollWidth;
  }
  back() {
    if (this.current.query) {
      this.show(this.current.node, this.current.point);
      return;
    }
    const previous = this.history.pop();
    if (previous) this.show(previous.node, previous.point, previous.query, previous.page);
    else this.close();
  }
  key(event) {
    if (event.isComposing) return;
    if (event.key === 'Escape' || (event.key === 'Backspace' && event.target.tagName !== 'INPUT')) {
      event.preventDefault();
      event.stopPropagation();
      this.back();
      return;
    }
    if (event.target.tagName === 'INPUT' && event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.layer.querySelector('.gr-radial-item:not([disabled])')?.focus();
      return;
    }
    if (event.target.tagName === 'INPUT' && event.key !== 'Tab') {
      event.stopPropagation();
      return;
    }
    if (
      ![
        'Tab',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      this.layer
        .querySelector(event.key === 'PageUp' ? '.gr-radial-previous' : '.gr-radial-next')
        ?.click();
      return;
    }
    const controls = [...this.layer.querySelectorAll('button:not([disabled]),input')];
    let index = controls.indexOf(document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = controls.length - 1;
    else
      index =
        (index +
          (['ArrowLeft', 'ArrowUp'].includes(event.key) || (event.key === 'Tab' && event.shiftKey)
            ? -1
            : 1) +
          controls.length) %
        controls.length;
    controls[index]?.focus({ preventScroll: true });
  }
  close(restoreFocus = true) {
    this.layer?.remove();
    this.layer = null;
    this.inert.forEach(([element, inert]) => {
      element.inert = inert;
    });
    this.inert = [];
    if (restoreFocus) {
      const target = this.opener?.isConnected
        ? this.opener
        : this.root.querySelector('[data-gr=canvas]');
      target?.focus({ preventScroll: true });
    }
  }
  destroy() {
    globalThis.removeEventListener('resize', this.resize);
    this.close(false);
  }
}
