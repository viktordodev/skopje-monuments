import { BufferAttribute, BufferGeometry } from 'three';

/**
 * A tiny sculpting kit: figures are described as smoothly blended capsules and ellipsoids
 * (signed distance functions) and meshed with surface nets at load time.
 */

type V3 = [number, number, number];

interface Prim {
  min: V3;
  max: V3;
  d: (x: number, y: number, z: number) => number;
}

export class Sculpt {
  private readonly prims: Prim[] = [];
  private readonly cuts: Prim[] = [];

  constructor(private readonly k = 0.08) {}

  /** A rounded cone from a (radius ra) to b (radius rb). */
  capsule(a: V3, b: V3, ra: number, rb = ra) {
    const [ax, ay, az] = a;
    const bax = b[0] - ax;
    const bay = b[1] - ay;
    const baz = b[2] - az;
    const l2 = bax * bax + bay * bay + baz * baz || 1e-9;
    const r = Math.max(ra, rb);
    this.prims.push({
      min: [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      max: [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
      d: (x, y, z) => {
        const px = x - ax;
        const py = y - ay;
        const pz = z - az;
        const h = Math.min(1, Math.max(0, (px * bax + py * bay + pz * baz) / l2));
        const dx = px - bax * h;
        const dy = py - bay * h;
        const dz = pz - baz * h;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
      },
    });
    return this;
  }

  /** A chain of capsules through the given points with linearly varying radius. */
  chain(pts: V3[], r0: number, r1: number) {
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1);
      const t1 = (i + 1) / (pts.length - 1);
      this.capsule(pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1);
    }
    return this;
  }

  /** An axis-aligned ellipsoid (approximate distance), optionally rotated about z by `rz`. */
  ellipsoid(c: V3, r: V3, rz = 0) {
    const [cx, cy, cz] = c;
    const [rx, ry, rzz] = r;
    const m = Math.max(rx, ry, rzz);
    const cs = Math.cos(rz);
    const sn = Math.sin(rz);
    this.prims.push({
      min: [cx - m, cy - m, cz - m],
      max: [cx + m, cy + m, cz + m],
      d: (x, y, z) => {
        const lx = x - cx;
        const ly = y - cy;
        const px = lx * cs + ly * sn;
        const py = -lx * sn + ly * cs;
        const pz = z - cz;
        const k0 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rzz) ** 2);
        const k1 = Math.sqrt((px / (rx * rx)) ** 2 + (py / (ry * ry)) ** 2 + (pz / (rzz * rzz)) ** 2);
        return (k0 * (k0 - 1)) / (k1 || 1e-9);
      },
    });
    return this;
  }

  /** A rounded box centred at c with half-size h. */
  box(c: V3, h: V3, round = 0.02) {
    const [cx, cy, cz] = c;
    this.prims.push({
      min: [cx - h[0], cy - h[1], cz - h[2]],
      max: [cx + h[0], cy + h[1], cz + h[2]],
      d: (x, y, z) => {
        const qx = Math.abs(x - cx) - h[0] + round;
        const qy = Math.abs(y - cy) - h[1] + round;
        const qz = Math.abs(z - cz) - h[2] + round;
        const o = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
        return o + Math.min(Math.max(qx, qy, qz), 0) - round;
      },
    });
    return this;
  }

  /** Carves a box away (sharp subtraction). */
  cutBox(c: V3, h: V3) {
    const [cx, cy, cz] = c;
    this.cuts.push({
      min: [cx - h[0], cy - h[1], cz - h[2]],
      max: [cx + h[0], cy + h[1], cz + h[2]],
      d: (x, y, z) => Math.max(Math.abs(x - cx) - h[0], Math.abs(y - cy) - h[1], Math.abs(z - cz) - h[2]),
    });
    return this;
  }

  /** Mirrors every primitive added so far across z = 0 (left/right symmetry). */
  mirrorZ(from = 0) {
    const n = this.prims.length;
    for (let i = from; i < n; i++) {
      const p = this.prims[i];
      const d = p.d;
      this.prims.push({ min: [p.min[0], p.min[1], -p.max[2]], max: [p.max[0], p.max[1], -p.min[2]], d: (x, y, z) => d(x, y, -z) });
    }
    return this;
  }

  get count() {
    return this.prims.length;
  }

  private field(x: number, y: number, z: number, pad: number): number {
    const k = this.k;
    let d = 1e9;
    for (const p of this.prims) {
      if (x < p.min[0] - pad || y < p.min[1] - pad || z < p.min[2] - pad) continue;
      if (x > p.max[0] + pad || y > p.max[1] + pad || z > p.max[2] + pad) continue;
      const b = p.d(x, y, z);
      const h = Math.max(k - Math.abs(d - b), 0) / k;
      d = Math.min(d, b) - h * h * k * 0.25;
    }
    for (const c of this.cuts) {
      if (x < c.min[0] - pad || y < c.min[1] - pad || z < c.min[2] - pad) continue;
      if (x > c.max[0] + pad || y > c.max[1] + pad || z > c.max[2] + pad) continue;
      d = Math.max(d, -c.d(x, y, z));
    }
    return d === 1e9 ? pad : d;
  }

  /** Meshes the sculpture with surface nets at the given cell size. */
  mesh(cell: number): BufferGeometry {
    const lo: V3 = [1e9, 1e9, 1e9];
    const hi: V3 = [-1e9, -1e9, -1e9];
    for (const p of this.prims)
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a], p.min[a]);
        hi[a] = Math.max(hi[a], p.max[a]);
      }
    const pad = this.k + cell * 2;
    for (let a = 0; a < 3; a++) {
      lo[a] -= pad;
      hi[a] += pad;
    }
    const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1;
    const ny = Math.ceil((hi[1] - lo[1]) / cell) + 1;
    const nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
    const f = new Float32Array(nx * ny * nz);
    const at = (i: number, j: number, k: number) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) f[at(i, j, k)] = this.field(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell, pad);

    const vid = new Int32Array(nx * ny * nz).fill(-1);
    const verts: number[] = [];
    const corner = [
      [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
    ];
    const edges = [
      [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const cv = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            const v = f[at(i + corner[c][0], j + corner[c][1], k + corner[c][2])];
            cv[c] = v;
            if (v < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let n = 0;
          for (const [a, b] of edges) {
            const va = cv[a];
            const vb = cv[b];
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
            sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
            sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
            n++;
          }
          vid[at(i, j, k)] = verts.length / 3;
          verts.push(lo[0] + (i + sx / n) * cell, lo[1] + (j + sy / n) * cell, lo[2] + (k + sz / n) * cell);
        }

    const idx: number[] = [];
    const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) idx.push(a, d, c, a, c, b);
      else idx.push(a, b, c, a, c, d);
    };
    for (let k = 1; k < nz - 1; k++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const v0 = f[at(i, j, k)] < 0;
          if (v0 !== f[at(i + 1, j, k)] < 0)
            quad(vid[at(i, j - 1, k - 1)], vid[at(i, j, k - 1)], vid[at(i, j, k)], vid[at(i, j - 1, k)], !v0);
          if (v0 !== f[at(i, j + 1, k)] < 0)
            quad(vid[at(i - 1, j, k - 1)], vid[at(i - 1, j, k)], vid[at(i, j, k)], vid[at(i, j, k - 1)], !v0);
          if (v0 !== f[at(i, j, k + 1)] < 0)
            quad(vid[at(i - 1, j - 1, k)], vid[at(i, j - 1, k)], vid[at(i, j, k)], vid[at(i - 1, j, k)], !v0);
        }

    // Normals from the field gradient: smoother than face normals on a coarse net.
    const nrm = new Float32Array(verts.length);
    const e = cell * 0.5;
    for (let v = 0; v < verts.length; v += 3) {
      const [x, y, z] = [verts[v], verts[v + 1], verts[v + 2]];
      const gx = this.field(x + e, y, z, pad) - this.field(x - e, y, z, pad);
      const gy = this.field(x, y + e, z, pad) - this.field(x, y - e, z, pad);
      const gz = this.field(x, y, z + e, pad) - this.field(x, y, z - e, pad);
      const l = Math.hypot(gx, gy, gz) || 1;
      nrm[v] = gx / l;
      nrm[v + 1] = gy / l;
      nrm[v + 2] = gz / l;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute('normal', new BufferAttribute(nrm, 3));
    // planar UVs so bump-mapped patina still has something to hold on to
    const uv = new Float32Array((verts.length / 3) * 2);
    for (let v = 0, w = 0; v < verts.length; v += 3, w += 2) {
      uv[w] = verts[v] * 0.9 + verts[v + 2] * 0.6;
      uv[w + 1] = verts[v + 1] * 0.9;
    }
    g.setAttribute('uv', new BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
}
