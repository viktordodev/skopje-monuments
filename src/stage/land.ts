import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  type Material,
} from 'three';
import { fbm, mulberry32, smoothstep } from '../core/noise';
import { stylized } from './materials';
import type { Palette } from './palette';
import { mottled } from './textures';

/**
 * The dream-landscape: a broad valley floor with the Vardar running straight toward the sun,
 * low dunes, raised plinths where monuments stand, and three bands of mountains on the horizon.
 * Nothing here is to scale or on a map.
 */

export const RIVER_HALF = 34;
export const WATER_Y = -1.6;
const Z_NEAR = 700;
const Z_FAR = -3300;

/** The river bends gently; every bank-side placement goes through this. */
export const riverX = (z: number) => Math.sin(z / 420) * 14 + Math.sin(z / 170 + 1.3) * 4;

export interface Plinth {
  x: number;
  z: number;
  r: number;
  y: number;
}

export class Land {
  readonly ground: Mesh;
  /** A plain far-reaching floor under the detailed valley, so the land runs all the way to the mountains. */
  readonly apron: Mesh;
  readonly ridges: Mesh[] = [];
  private readonly ridgeMats: MeshBasicMaterial[] = [];
  private readonly groundMat: Material & { color: Color };
  private readonly plinths: Plinth[];

  constructor(plinths: Plinth[]) {
    this.plinths = plinths;
    const W = 2400;
    const L = Z_NEAR - Z_FAR;
    const geo = new PlaneGeometry(W, L, 240, 400);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, (Z_NEAR + Z_FAR) / 2);
    const pos = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.height(x, z));
    }
    geo.computeVertexNormals();
    const surf = mottled(11, [120, 96, 88], 0.7, 6, 512);
    this.groundMat = stylized({ surface: surf, repeat: [60, 100], bumpScale: 2, roughness: 0.95, rim: 0.35 });
    this.ground = new Mesh(geo, this.groundMat);
    this.ground.receiveShadow = true;
    // a frame around the detailed valley (a plane with a hole), laid flat
    const outer = new Shape([new Vector2(-7000, -7000), new Vector2(7000, -7000), new Vector2(7000, 5500), new Vector2(-7000, 5500)]);
    outer.holes.push(new Path([new Vector2(-W / 2 + 2, -Z_NEAR + 2), new Vector2(-W / 2 + 2, -Z_FAR - 2), new Vector2(W / 2 - 2, -Z_FAR - 2), new Vector2(W / 2 - 2, -Z_NEAR + 2)]));
    const apronGeo = new ShapeGeometry(outer);
    apronGeo.rotateX(-Math.PI / 2);
    apronGeo.translate(0, 2.5, 0);
    this.apron = new Mesh(apronGeo, this.groundMat);

    // Three bands of mountains, each lower in the middle so the sun sits in a notch.
    const rnd = mulberry32(7);
    const layers = [
      { r: 2700, h: 150, notch: 0.55, seed: rnd() * 100 },
      { r: 3400, h: 240, notch: 0.45, seed: rnd() * 100 },
      { r: 4300, h: 380, notch: 0.35, seed: rnd() * 100 },
    ];
    layers.forEach((l, li) => {
      const mat = new MeshBasicMaterial({ color: 0x000000, fog: false, side: DoubleSide, depthWrite: true });
      const mesh = new Mesh(ridgeGeometry(l.r, l.h, l.notch, l.seed), mat);
      mesh.position.z = -700;
      mesh.renderOrder = -5 + li;
      this.ridges.push(mesh);
      this.ridgeMats.push(mat);
    });
  }

  /** Ground height: dunes away from the river, a channel for the river, flat plinths for monuments. */
  height(x: number, z: number): number {
    const dx = x - riverX(z);
    const ad = Math.abs(dx);
    let h = fbm(x * 0.004 + 3, z * 0.004, 4) * 7 + fbm(x * 0.02, z * 0.02, 3) * 1.2;
    h += smoothstep(RIVER_HALF + 30, RIVER_HALF + 260, ad) * 6;
    // quay walls: the river is cut sharply into the valley floor
    const bank = smoothstep(RIVER_HALF - 4, RIVER_HALF + 3, ad);
    h = h * bank + (WATER_Y - 3) * (1 - bank);
    h = Math.max(h, WATER_Y - 3);
    for (const p of this.plinths) {
      const d = Math.hypot(x - p.x, z - p.z);
      const k = 1 - smoothstep(p.r, p.r * 1.6 + 10, d);
      h = h * (1 - k) + p.y * k;
    }
    return h;
  }

  update(p: Palette) {
    this.groundMat.color.copy(p.ground).multiplyScalar(2.2);
    const hazes = [0.35, 0.58, 0.78];
    this.ridgeMats.forEach((m, i) => {
      m.color.copy(p.ridge).lerp(p.horizon, hazes[i]);
      m.color.lerp(p.fog, 0.25);
    });
  }
}

function ridgeGeometry(radius: number, height: number, notch: number, seed: number): BufferGeometry {
  const seg = 420;
  const a0 = -1.35;
  const a1 = 1.35;
  const pos = new Float32Array((seg + 1) * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = a0 + (a1 - a0) * t;
    const x = Math.sin(a) * radius;
    const z = -Math.cos(a) * radius;
    const n = fbm(t * 9 + seed, seed, 5) * 0.5 + 0.5;
    const peaks = Math.pow(Math.abs(fbm(t * 22 + seed * 2, 1.7, 3)), 0.8);
    const valley = 1 - notch * Math.exp(-Math.pow(a / 0.22, 2));
    const h = height * (0.35 + n * 0.75 + peaks * 0.35) * valley;
    pos.set([x, -60, z], i * 6);
    pos.set([x, h, z], i * 6 + 3);
    if (i < seg) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
