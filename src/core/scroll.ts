import Lenis from 'lenis';
import { MathUtils } from 'three';

/**
 * Maps page scroll to a continuous "station" coordinate `u`:
 * 0 = hero, 1..N = monuments, N+1 = outro. Section centres are the station stops,
 * so the camera always lines up with the text card wherever the layout lands.
 */
export class ScrollDirector {
  private readonly lenis: Lenis | null;
  private targets: number[] = [];
  private sections: HTMLElement[] = [];
  private raf = 0;
  private lastInput = 0;
  private snapping = false;
  /** The station the page last came to rest on; gestures are judged relative to it. */
  private settled = 0;
  private copies: HTMLElement[] = [];

  constructor(reducedMotion: boolean) {
    this.sections = [...document.querySelectorAll<HTMLElement>('[data-station]')].sort(
      (a, b) => Number(a.dataset.station) - Number(b.dataset.station),
    );
    this.lenis = reducedMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    this.copies = [...document.querySelectorAll<HTMLElement>('.chapter__copy')];
    this.measure();
    this.settled = Math.round(this.station());
    new ResizeObserver(() => this.measure()).observe(document.body);
    addEventListener('load', () => this.measure());
    document.fonts?.ready.then(() => this.measure());

    if (this.lenis) {
      const input = () => {
        this.lastInput = performance.now();
        this.snapping = false;
      };
      for (const ev of ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'] as const)
        addEventListener(ev, input, { passive: true });
      // A chapter's text box that is taller than the screen scrolls on its own while it still can;
      // at its ends the wheel goes back to moving the page. Decided before Lenis sees the event.
      addEventListener(
        'wheel',
        (e) => {
          const box = (e.target as Element).closest?.<HTMLElement>('.chapter__copy.overflows');
          if (!box) return;
          const room = e.deltaY > 0 ? box.scrollHeight - box.clientHeight - box.scrollTop > 1 : box.scrollTop > 1;
          box.toggleAttribute('data-lenis-prevent', room);
        },
        { capture: true, passive: true },
      );
      const loop = (t: number) => {
        this.lenis!.raf(t);
        this.snap();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    // Internal links scroll to the station stop, not just the top of the section.
    document.addEventListener('click', (e) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href')!.slice(1);
      const idx = this.sections.findIndex((s) => s.id === id);
      if (idx < 0) return;
      e.preventDefault();
      this.settled = idx;
      this.scrollTo(this.targets[idx], false);
      history.replaceState(null, '', `#${id}`);
    });
    // A hash typed or changed on an open page: go to that chapter's resting point, not the section's top edge.
    addEventListener('hashchange', () => this.scrollToHash(location.hash));
  }

  /**
   * Step snapping: the page only ever rests on a monument. When a gesture ends, the page glides to the
   * next stop in the direction it was moving (or back, if it barely moved), using where the smooth
   * scroll was heading rather than where it currently is, so the glide starts immediately.
   * Any new input interrupts the glide; touch momentum is allowed to finish first.
   */
  private snap() {
    const lenis = this.lenis!;
    if (this.snapping || lenis.isTouching || lenis.isScrolling === 'native') return;
    if (performance.now() - this.lastInput < 140) return;
    if (document.documentElement.classList.contains('menu-open')) return;
    const u = this.stationAt(lenis.targetScroll);
    const last = this.targets.length - 1;
    const off = u - this.settled;
    const n =
      Math.abs(off) < 0.04
        ? this.settled
        : off > 0
          ? Math.min(last, Math.ceil(u - 0.04))
          : Math.max(0, Math.floor(u + 0.04));
    const from = this.stationAt(lenis.scroll);
    const d = Math.abs(from - n);
    if (d < 0.002 && Math.abs(lenis.targetScroll - this.targets[n]) < 1) {
      this.settled = n;
      return;
    }
    this.snapping = true;
    lenis.scrollTo(this.targets[n], {
      duration: Math.min(1.7, 0.85 + d * 0.7),
      easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      onComplete: () => {
        this.snapping = false;
        this.settled = n;
      },
    });
  }

  get count() {
    return this.sections.length;
  }

  private measure() {
    const vh = innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    for (const c of this.copies) {
      const over = c.scrollHeight > c.clientHeight + 2;
      c.classList.toggle('overflows', over);
      // a box that scrolls must be reachable by keyboard so its text can be scrolled with the arrow keys
      if (over) c.tabIndex = 0;
      else c.removeAttribute('tabindex');
    }
    const scrollY = window.scrollY;
    this.targets = this.sections.map((el, i) => {
      if (i === 0) return 0;
      if (i === this.sections.length - 1) return max;
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY;
      return MathUtils.clamp(top + r.height / 2 - vh / 2, 0, max);
    });
  }

  scrollTo(y: number, immediate: boolean) {
    if (!this.lenis) return window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    // a link glide passes through other stops; snapping must not catch it halfway and pull it back
    this.snapping = !immediate;
    this.lenis.scrollTo(y, { immediate, duration: 2.2, onComplete: () => (this.snapping = false) });
  }

  /**
   * Jump to a deep-linked chapter. The layout can still shift while fonts and images settle,
   * so the jump is repeated once they have, unless the reader has started scrolling.
   */
  scrollToHash(hash: string) {
    const idx = this.sections.findIndex((s) => `#${s.id}` === hash);
    if (idx < 0) return;
    const jump = () => {
      this.measure();
      this.settled = idx;
      this.scrollTo(this.targets[idx], true);
    };
    jump();
    let userMoved = false;
    const stop = () => (userMoved = true);
    addEventListener('wheel', stop, { once: true, passive: true });
    addEventListener('touchstart', stop, { once: true, passive: true });
    addEventListener('keydown', stop, { once: true });
    const again = () => !userMoved && jump();
    document.fonts?.ready.then(again);
    setTimeout(again, 600);
  }

  get sectionsList() {
    return this.sections;
  }

  /** Continuous station coordinate for the current scroll position. */
  station(): number {
    return this.stationAt(this.lenis ? this.lenis.scroll : window.scrollY);
  }

  private stationAt(y: number): number {
    const t = this.targets;
    if (y <= t[0]) return 0;
    for (let i = 0; i < t.length - 1; i++) {
      if (y <= t[i + 1]) return i + (y - t[i]) / Math.max(1, t[i + 1] - t[i]);
    }
    return t.length - 1;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.lenis?.destroy();
  }
}
