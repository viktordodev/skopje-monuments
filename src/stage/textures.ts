import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { mulberry32 } from '../core/noise';

/**
 * Procedural surfaces, painted on canvases at load time: no photographs are shipped.
 * Each surface returns a colour map and a matching height map (used as a bump map).
 */

export interface Surface {
  map: Texture;
  bump: Texture;
}

let maxAniso = 8;
export const setMaxAnisotropy = (n: number) => (maxAniso = n);

export function cvs(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function tex(c: HTMLCanvasElement, srgb = true, repeat = true): Texture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = maxAniso;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  return t;
}

const rgb = (r: number, g: number, b: number, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

/** Stacked, up-scaled value noise: cheap fbm that is indistinguishable once multiplied under a base colour. */
export function fbmCanvas(w: number, h: number, seed: number, octaves = 5, baseCells = 4, contrast = 1) {
  const out = cvs(w, h);
  const o = out.getContext('2d')!;
  o.fillStyle = '#808080';
  o.fillRect(0, 0, w, h);
  let cells = baseCells;
  let alpha = 1;
  for (let i = 0; i < octaves; i++) {
    const n = cvs(cells, cells);
    const nx = n.getContext('2d')!;
    const im = nx.createImageData(cells, cells);
    const r = mulberry32(seed + i * 977);
    for (let k = 0; k < cells * cells; k++) {
      const v = Math.max(0, Math.min(255, 128 + (r() - 0.5) * 255 * contrast));
      im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = v;
      im.data[k * 4 + 3] = 255;
    }
    nx.putImageData(im, 0, 0);
    o.globalAlpha = alpha;
    o.globalCompositeOperation = i === 0 ? 'source-over' : 'overlay';
    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = 'high';
    o.drawImage(n, 0, 0, w, h);
    cells *= 2;
    alpha *= 0.62;
  }
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'source-over';
  return out;
}

function overlayNoise(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, alpha: number, cells = 4) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.drawImage(fbmCanvas(w, h, seed, 6, cells, 1), 0, 0);
  ctx.restore();
}

interface CourseOpts {
  size?: number;
  seed: number;
  /** Row heights as fractions of the tile, repeated top to bottom. */
  rows: { h: number; color: [number, number, number]; len: [number, number]; vary?: number; kind?: 'stone' | 'brick' }[];
  mortar: [number, number, number];
  joint?: number;
  noise?: number;
}

/** Coursed masonry: ashlar, brick, or the alternating stone-and-brick bands of Ottoman walls. */
export function courses(o: CourseOpts): Surface {
  const S = o.size ?? 512;
  const c = cvs(S, S);
  const b = cvs(S, S);
  const x = c.getContext('2d')!;
  const y = b.getContext('2d')!;
  const r = mulberry32(o.seed);
  const joint = o.joint ?? 2.5;
  x.fillStyle = rgb(...o.mortar);
  x.fillRect(0, 0, S, S);
  y.fillStyle = '#202020';
  y.fillRect(0, 0, S, S);
  let top = 0;
  let ri = 0;
  while (top < S - 0.5) {
    const row = o.rows[ri % o.rows.length];
    const rh = row.h * S;
    let left = -r() * row.len[1] * S;
    while (left < S) {
      const len = (row.len[0] + r() * (row.len[1] - row.len[0])) * S;
      const v = (r() - 0.5) * (row.vary ?? 0.14);
      const [cr, cg, cb] = row.color;
      const k = 1 + v;
      x.fillStyle = rgb(cr * k, cg * k, cb * (k + v * 0.3));
      const bx = left + joint / 2;
      const by = top + joint / 2;
      const bw = len - joint;
      const bh = rh - joint;
      for (const dx of [0, -S, S]) {
        x.fillRect(bx + dx, by, bw, bh);
        const g = y.createLinearGradient(0, by, 0, by + bh);
        const hi = 150 + r() * 70;
        g.addColorStop(0, rgb(hi * 0.8, hi * 0.8, hi * 0.8));
        g.addColorStop(0.2, rgb(hi, hi, hi));
        g.addColorStop(1, rgb(hi * 0.85, hi * 0.85, hi * 0.85));
        y.fillStyle = g;
        y.fillRect(bx + dx, by, bw, bh);
      }
      left += len;
    }
    top += rh;
    ri++;
  }
  overlayNoise(x, S, S, o.seed + 5, o.noise ?? 0.55, 6);
  overlayNoise(y, S, S, o.seed + 9, 0.5, 16);
  return { map: tex(c), bump: tex(b, false) };
}

/** Random rubble masonry: irregular stones bedded in mortar (fortress walls, the memorial house base). */
export function rubble(seed: number, base: [number, number, number], mortar: [number, number, number], size = 512, stones = 170): Surface {
  const c = cvs(size, size);
  const b = cvs(size, size);
  const x = c.getContext('2d')!;
  const y = b.getContext('2d')!;
  const r = mulberry32(seed);
  x.fillStyle = rgb(...mortar);
  x.fillRect(0, 0, size, size);
  y.fillStyle = '#1c1c1c';
  y.fillRect(0, 0, size, size);
  for (let i = 0; i < stones; i++) {
    const cx = r() * size;
    const cy = r() * size;
    const rad = size * (0.03 + r() * 0.045);
    const pts = 7 + ((r() * 4) | 0);
    const poly: [number, number][] = [];
    for (let k = 0; k < pts; k++) {
      const a = (k / pts) * Math.PI * 2 + r() * 0.3;
      const rr = rad * (0.7 + r() * 0.35);
      poly.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.85]);
    }
    const v = 0.78 + r() * 0.4;
    const hue = (r() - 0.5) * 18;
    for (const dx of [0, -size, size])
      for (const dy of [0, -size, size]) {
        x.beginPath();
        y.beginPath();
        poly.forEach(([px, py], k) => {
          const X = cx + px + dx;
          const Y = cy + py + dy;
          if (k) {
            x.lineTo(X, Y);
            y.lineTo(X, Y);
          } else {
            x.moveTo(X, Y);
            y.moveTo(X, Y);
          }
        });
        x.closePath();
        y.closePath();
        x.fillStyle = rgb(base[0] * v + hue, base[1] * v, base[2] * v - hue * 0.5);
        x.fill();
        const g = y.createRadialGradient(cx + dx, cy + dy - rad * 0.2, 1, cx + dx, cy + dy, rad * 1.2);
        g.addColorStop(0, '#f0f0f0');
        g.addColorStop(1, '#6a6a6a');
        y.fillStyle = g;
        y.fill();
      }
  }
  overlayNoise(x, size, size, seed + 3, 0.6, 8);
  overlayNoise(y, size, size, seed + 4, 0.4, 24);
  return { map: tex(c), bump: tex(b, false) };
}

/** Plain surface with soft mottling: marble, plaster, bronze, lead, concrete. */
export function mottled(seed: number, base: [number, number, number], amount = 0.5, cells = 4, size = 256): Surface {
  const c = cvs(size, size);
  const x = c.getContext('2d')!;
  x.fillStyle = rgb(...base);
  x.fillRect(0, 0, size, size);
  overlayNoise(x, size, size, seed, amount, cells);
  const b = fbmCanvas(size, size, seed + 1, 6, cells * 2, 1);
  return { map: tex(c), bump: tex(b, false) };
}

/** White marble with faint veins and large panel joints. */
export function marble(seed: number): Surface {
  const S = 512;
  const c = cvs(S, S);
  const x = c.getContext('2d')!;
  x.fillStyle = rgb(236, 230, 219);
  x.fillRect(0, 0, S, S);
  overlayNoise(x, S, S, seed, 0.3, 3);
  const r = mulberry32(seed);
  x.strokeStyle = 'rgba(150,140,130,0.22)';
  for (let i = 0; i < 14; i++) {
    x.lineWidth = 0.6 + r() * 1.4;
    x.beginPath();
    let px = r() * S;
    let py = r() * S;
    x.moveTo(px, py);
    for (let k = 0; k < 16; k++) {
      px += (r() - 0.3) * 40;
      py += (r() - 0.5) * 30;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  const b = cvs(S, S);
  const y = b.getContext('2d')!;
  y.fillStyle = '#c8c8c8';
  y.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(120,110,100,0.35)';
  y.fillStyle = '#505050';
  for (let i = 0; i <= 4; i++) {
    x.fillRect(0, (i * S) / 4 - 1, S, 2);
    y.fillRect(0, (i * S) / 4 - 1.5, S, 3);
  }
  for (let j = 0; j <= 2; j++) {
    for (let i = 0; i < 4; i++) {
      const off = i % 2 ? S / 4 : 0;
      x.fillRect(((j * S) / 2 + off) % S - 1, (i * S) / 4, 2, S / 4);
      y.fillRect(((j * S) / 2 + off) % S - 1.5, (i * S) / 4, 3, S / 4);
    }
  }
  return { map: tex(c), bump: tex(b, false) };
}

/**
 * Carved relief panel: a frieze of striding, riding and standing figures read only as light and shadow.
 * It is a height map; the colour stays the stone's own.
 */
export function relief(seed: number, w = 1024, h = 256, figures = 9): Texture {
  const c = cvs(w, h);
  const x = c.getContext('2d')!;
  x.fillStyle = '#6e6e6e';
  x.fillRect(0, 0, w, h);
  const r = mulberry32(seed);
  x.filter = 'blur(2px)';
  for (let i = 0; i < figures; i++) {
    const cx = ((i + 0.5) / figures) * w + (r() - 0.5) * 20;
    const base = h * 0.9;
    const tall = h * (0.62 + r() * 0.18);
    const g = x.createLinearGradient(cx - 30, 0, cx + 30, 0);
    g.addColorStop(0, '#f2f2f2');
    g.addColorStop(1, '#9a9a9a');
    x.fillStyle = g;
    x.strokeStyle = g;
    if (r() < 0.3) {
      // a horse and rider
      x.beginPath();
      x.ellipse(cx, base - tall * 0.45, tall * 0.36, tall * 0.16, -0.15, 0, Math.PI * 2);
      x.fill();
      x.lineWidth = tall * 0.07;
      x.lineCap = 'round';
      for (const [dx, a] of [[-0.25, 0.25], [-0.15, -0.1], [0.2, 0.4], [0.3, -0.35]]) {
        x.beginPath();
        x.moveTo(cx + dx * tall, base - tall * 0.4);
        x.lineTo(cx + dx * tall + Math.sin(a) * tall * 0.35, base);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(cx + tall * 0.3, base - tall * 0.5);
      x.lineTo(cx + tall * 0.48, base - tall * 0.82);
      x.stroke();
      x.beginPath();
      x.ellipse(cx - tall * 0.02, base - tall * 0.78, tall * 0.07, tall * 0.2, 0.1, 0, Math.PI * 2);
      x.fill();
    } else {
      // a standing figure with spear or shield
      x.lineWidth = tall * 0.1;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(cx - tall * 0.08, base);
      x.lineTo(cx, base - tall * 0.45);
      x.lineTo(cx + tall * 0.1, base);
      x.stroke();
      x.beginPath();
      x.ellipse(cx, base - tall * 0.62, tall * 0.1, tall * 0.2, 0, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.arc(cx, base - tall * 0.9, tall * 0.08, 0, Math.PI * 2);
      x.fill();
      x.lineWidth = tall * 0.035;
      x.beginPath();
      x.moveTo(cx + tall * 0.18, base);
      x.lineTo(cx + tall * 0.22, base - tall * 1.05);
      x.stroke();
      if (r() < 0.6) {
        x.beginPath();
        x.arc(cx - tall * 0.14, base - tall * 0.6, tall * 0.14, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  x.filter = 'none';
  x.fillStyle = '#3a3a3a';
  x.fillRect(0, 0, w, h * 0.05);
  x.fillRect(0, h * 0.95, w, h * 0.05);
  return tex(c, false);
}

/** A soft round sprite for glows and particles. */
export function glowSprite(size = 128, soft = 2.2) {
  const c = cvs(size, size);
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, soft)})`);
  }
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return tex(c, true, false);
}
