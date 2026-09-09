// A single input/focus owner for every level of the review navigation tree.
export class ReviewRadialMenu {
  constructor(root) {
    this.root = root;
    this.history = [];
    this.inert = [];
  }
  open(node, point, opener = document.activeElement) {
    this.close(false);
    this.opener = opener;
    this.history = [];
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
  show(node, point) {
    this.current = { node, point };
    this.layer.replaceChildren();
    const menu = document.createElement('section');
    menu.className = 'gr-radial';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', node.label);
    const radius = Math.min(116, (innerWidth - 112) / 2, (innerHeight - 112) / 2);
    const compact = radius < 84;
    menu.classList.toggle('gr-radial--compact', compact);
    const x = Math.max(radius + 48, Math.min(innerWidth - radius - 48, point?.x ?? innerWidth / 2));
    const y = Math.max(
      radius + 72,
      Math.min(innerHeight - radius - 48, point?.y ?? innerHeight / 2),
    );
    menu.style.setProperty('--radial-radius', `${radius}px`);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    const heading = document.createElement('p');
    heading.className = 'gr-radial-path';
    heading.textContent = [...this.history.map((entry) => entry.node.label), node.label].join(
      ' › ',
    );
    menu.append(heading);
    const choices = node.children ?? [];
    const page = node.page ?? 0,
      pageSize = 6;
    const entries = choices.slice(page * pageSize, (page + 1) * pageSize);
    if (choices.length > pageSize)
      entries.push({
        label: '다음',
        run: () =>
          this.show({ ...node, page: (page + 1) % Math.ceil(choices.length / pageSize) }, point),
        keepOpen: true,
      });
    entries.forEach((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / entries.length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gr-radial-item';
      button.textContent = entry.label + (entry.children ? ' ›' : '');
      button.disabled = Boolean(entry.disabled);
      if (entry.reason) button.title = entry.reason;
      button.style.setProperty('--radial-x', `${Math.cos(angle) * radius}px`);
      button.style.setProperty('--radial-y', `${Math.sin(angle) * radius}px`);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (entry.children) {
          this.history.push(this.current);
          const r = button.getBoundingClientRect();
          this.show(entry, { x: r.x + r.width / 2, y: r.y + r.height / 2 });
        } else {
          if (!entry.keepOpen) this.close();
          entry.run?.({ x: event.clientX, y: event.clientY });
        }
      });
      menu.append(button);
    });
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'gr-radial-center';
    back.textContent = this.history.length ? '뒤로' : '닫기';
    back.addEventListener('click', (event) => {
      event.stopPropagation();
      this.back();
    });
    menu.append(back);
    const note = choices
      .filter((entry) => entry.disabled && entry.reason)
      .map((entry) => entry.reason)
      .join(' · ');
    if (note) {
      const text = document.createElement('p');
      text.className = 'gr-radial-note';
      text.textContent = note;
      menu.append(text);
    }
    this.layer.append(menu);
    (menu.querySelector('button:not([disabled])') ?? back).focus();
  }
  back() {
    const previous = this.history.pop();
    if (previous) this.show(previous.node, previous.point);
    else this.close();
  }
  key(event) {
    if (['Escape', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      this.back();
      return;
    }
    if (
      !['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const buttons = [...this.layer.querySelectorAll('button:not([disabled])')];
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else
      index =
        (index +
          (event.key === 'ArrowLeft' ||
          event.key === 'ArrowUp' ||
          (event.key === 'Tab' && event.shiftKey)
            ? -1
            : 1) +
          buttons.length) %
        buttons.length;
    buttons[index]?.focus();
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
    this.close(false);
  }
}
