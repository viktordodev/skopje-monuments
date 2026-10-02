import type { ScrollDirector } from '../core/scroll';

/**
 * DOM side of the experience: loader, word-by-word heading reveals, the custom cursor, the
 * hide-on-scroll nav, the chapter menu and the progress rail.
 */
export class UI {
  private readonly root = document.documentElement;
  private readonly pct = document.querySelector<HTMLElement>('.loader__pct span');
  private readonly links = [...document.querySelectorAll<HTMLAnchorElement>('.rail a, .menu a')];
  private readonly bar = document.querySelector<HTMLElement>('.rail__bar i');
  private readonly nav = document.querySelector<HTMLElement>('.nav')!;
  private total = 1;
  private sides: string[] = [];
  private lastActive = -1;
  private lastY = 0;

  constructor() {
    // index every word so CSS can stagger them
    document.querySelectorAll<HTMLElement>('.split').forEach((h) => {
      h.querySelectorAll<HTMLElement>('.w').forEach((w, i) => w.style.setProperty('--wi', String(i)));
    });
    this.menu();
    this.cursor();
  }

  progress(p: number) {
    if (this.pct) this.pct.textContent = String(Math.round(p * 100));
  }

  attach(scroll: ScrollDirector) {
    const sections = scroll.sectionsList;
    this.total = sections.length - 1;
    this.sides = sections.map((s) =>
      s.classList.contains('chapter--right') ? 'right' : s.classList.contains('chapter--left') ? 'left' : 'hero',
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add('in');
      },
      { rootMargin: '-20% 0px -20% 0px', threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    // the hero is on screen from the start
    sections[0]?.classList.add('in');
  }

  update(u: number) {
    const active = Math.round(u);
    if (active !== this.lastActive) {
      this.lastActive = active;
      for (const a of this.links) a.classList.toggle('is-active', Number(a.dataset.index) === active);
      this.root.classList.toggle('past-hero', active > 0);
      this.root.dataset.side = this.sides[active] ?? 'hero';
    }
    if (this.bar) this.bar.style.transform = `scaleY(${Math.min(1, Math.max(0, u / this.total)).toFixed(4)})`;

    const y = window.scrollY;
    if (Math.abs(y - this.lastY) > 6) {
      this.nav.classList.toggle('hide', y > this.lastY && y > innerHeight * 0.6 && !this.root.classList.contains('menu-open'));
      this.lastY = y;
    }
  }

  private menu() {
    const btn = document.querySelector<HTMLButtonElement>('.burger');
    const menu = document.getElementById('menu');
    if (!btn || !menu) return;
    const set = (open: boolean) => {
      this.root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? btn.dataset.close! : btn.dataset.open!);
      for (const el of document.querySelectorAll<HTMLElement>('#story, .rail, .skip')) el.inert = open;
      if (open) menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    };
    btn.addEventListener('click', () => set(!this.root.classList.contains('menu-open')));
    menu.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a')) set(false);
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.root.classList.contains('menu-open')) {
        set(false);
        btn.focus();
      }
    });
  }

  private cursor() {
    const el = document.querySelector<HTMLElement>('.cursor');
    if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    this.root.classList.add('has-cursor');
    const ring = el.querySelector<HTMLElement>('.cursor__ring')!;
    const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let rx = x;
    let ry = y;
    addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      el.classList.add('on');
      const hot = (e.target as Element).closest?.('a, button');
      el.classList.toggle('hot', !!hot);
    });
    document.addEventListener('pointerleave', () => el.classList.remove('on'));
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
