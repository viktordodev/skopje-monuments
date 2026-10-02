import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  Vector2,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glow, stylized } from './materials';
import { courses, marble, mottled, rubble, type Surface } from './textures';

/** Shared materials and small geometry helpers for the monuments. */

export interface Kit {
  stone: MeshStandardMaterial;
  paleStone: MeshStandardMaterial;
  ottoman: MeshStandardMaterial;
  brick: MeshStandardMaterial;
  rubble: MeshStandardMaterial;
  marble: MeshStandardMaterial;
  travertine: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  bronze: MeshStandardMaterial;
  lead: MeshStandardMaterial;
  roof: MeshStandardMaterial;
  iron: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  windowGlow: MeshStandardMaterial;
  lampGlow: MeshStandardMaterial;
  crossGlow: MeshStandardMaterial;
  surfaces: Record<string, Surface>;
  /** Materials whose emissive intensity follows nightfall. */
  nightLights: { mat: MeshStandardMaterial; day: number; night: number }[];
}

export function createKit(): Kit {
  const surfaces = {
    ashlar: courses({
      seed: 3,
      rows: [{ h: 1 / 6, color: [196, 172, 140], len: [0.22, 0.42], vary: 0.16 }],
      mortar: [120, 104, 88],
      noise: 0.6,
    }),
    pale: courses({
      seed: 8,
      rows: [{ h: 1 / 8, color: [214, 200, 176], len: [0.2, 0.36], vary: 0.1 }],
      mortar: [150, 138, 120],
      noise: 0.45,
    }),
    ottoman: courses({
      seed: 21,
      rows: [
        { h: 0.16, color: [190, 168, 136], len: [0.18, 0.3], vary: 0.14 },
        { h: 0.035, color: [160, 82, 58], len: [0.06, 0.09], vary: 0.2 },
        { h: 0.035, color: [150, 76, 54], len: [0.06, 0.09], vary: 0.2 },
        { h: 0.035, color: [160, 82, 58], len: [0.06, 0.09], vary: 0.2 },
      ],
      mortar: [196, 180, 156],
      joint: 3,
    }),
    brick: courses({
      seed: 33,
      rows: [{ h: 1 / 20, color: [168, 64, 44], len: [0.09, 0.12], vary: 0.2 }],
      mortar: [150, 110, 96],
      joint: 3,
    }),
    rubble: rubble(41, [168, 150, 128], [120, 108, 96]),
    marble: marble(5),
    travertine: courses({
      seed: 55,
      rows: [{ h: 1 / 7, color: [214, 196, 160], len: [0.28, 0.4], vary: 0.08 }],
      mortar: [170, 154, 126],
      joint: 2,
      noise: 0.7,
    }),
    plaster: mottled(61, [232, 226, 214], 0.18, 3),
    bronze: mottled(71, [92, 70, 48], 0.9, 5),
    lead: mottled(81, [120, 124, 132], 0.5, 4),
    roof: courses({
      seed: 91,
      rows: [{ h: 1 / 14, color: [150, 62, 42], len: [0.05, 0.07], vary: 0.25 }],
      mortar: [90, 40, 30],
      joint: 2,
    }),
  };

  const k: Kit = {
    surfaces,
    stone: stylized({ surface: surfaces.ashlar, roughness: 0.9 }),
    paleStone: stylized({ surface: surfaces.pale, roughness: 0.9 }),
    ottoman: stylized({ surface: surfaces.ottoman, roughness: 0.92 }),
    brick: stylized({ surface: surfaces.brick, roughness: 0.9 }),
    rubble: stylized({ surface: surfaces.rubble, roughness: 0.95, bumpScale: 2.2 }),
    marble: stylized({ surface: surfaces.marble, roughness: 0.55, rim: 1.2 }),
    travertine: stylized({ surface: surfaces.travertine, roughness: 0.9 }),
    plaster: stylized({ surface: surfaces.plaster, roughness: 0.8, rim: 1.1 }),
    bronze: stylized({ surface: surfaces.bronze, roughness: 0.42, metalness: 0.55, rim: 1.8, bumpScale: 0.6 }),
    lead: stylized({ surface: surfaces.lead, roughness: 0.5, metalness: 0.35, rim: 1.4 }),
    roof: stylized({ surface: surfaces.roof, roughness: 0.85 }),
    iron: stylized({ color: new Color('#2a2a30'), roughness: 0.5, metalness: 0.6, rim: 1.2 }),
    glass: stylized({ color: new Color('#5e9c92'), roughness: 0.15, metalness: 0.3, rim: 2, emissive: new Color('#7fd9c3'), emissiveIntensity: 0 }),
    dark: stylized({ color: new Color('#1a1418'), roughness: 1, rim: 0.3 }),
    windowGlow: glow('#ffb35c', 0),
    lampGlow: glow('#ffd28a', 0),
    crossGlow: glow('#fff1d0', 0),
    nightLights: [],
  };
  k.nightLights.push(
    { mat: k.windowGlow, day: 0.15, night: 2.4 },
    { mat: k.lampGlow, day: 0.4, night: 4 },
    { mat: k.crossGlow, day: 0.6, night: 9 },
    { mat: k.glass, day: 0.05, night: 1.4 },
  );
  return k;
}

export function setNight(k: Kit, night: number) {
  for (const l of k.nightLights) l.mat.emissiveIntensity = l.day + (l.night - l.day) * night;
}

/** Box with UVs scaled to world size so masonry courses keep a constant size. */
export function box(w: number, h: number, d: number, tile = 4): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    const sx = nx > 0.5 ? d : w;
    const sy = ny > 0.5 ? d : h;
    uv.setXY(i, (uv.getX(i) * sx) / tile, (uv.getY(i) * sy) / tile);
  }
  return g;
}

export function cyl(rTop: number, rBot: number, h: number, seg = 24, tile = 4, open = false): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBot, h, seg, 1, open);
  const uv = g.attributes.uv;
  const circ = Math.PI * (rTop + rBot);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * circ) / tile, (uv.getY(i) * h) / tile);
  return g;
}

export function lathe(profile: [number, number][], seg = 48, tileU = 1, tileV = 1): BufferGeometry {
  const g = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), seg);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tileU, uv.getY(i) * tileV);
  return g;
}

/**
 * A rectangle with round-headed openings, extruded to depth `d` (UVs in world units / tile).
 * Openings with `y0` = 0 (the default) reach the ground and are cut from the outline; raised ones are windows.
 */
export function arcade(
  w: number,
  h: number,
  d: number,
  arches: { x: number; w: number; spring: number; y0?: number }[],
  tile = 4,
): BufferGeometry {
  const ground = arches.filter((a) => (a.y0 ?? 0) <= 0).sort((a, b) => a.x - b.x);
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  for (const a of ground) {
    const r = a.w / 2;
    s.lineTo(a.x - r, 0);
    s.lineTo(a.x - r, a.spring);
    s.absarc(a.x, a.spring, r, Math.PI, 0, true);
    s.lineTo(a.x + r, 0);
  }
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  for (const a of arches.filter((a) => (a.y0 ?? 0) > 0)) {
    const p = new Path();
    const r = a.w / 2;
    p.moveTo(a.x - r, a.y0!);
    p.lineTo(a.x + r, a.y0!);
    p.lineTo(a.x + r, a.spring);
    p.absarc(a.x, a.spring, r, 0, Math.PI, false);
    p.lineTo(a.x - r, a.y0!);
    s.holes.push(p);
  }
  return extrude(s, d, tile);
}

export function extrude(s: Shape, d: number, tile = 4, bevel = 0): BufferGeometry {
  const g = new ExtrudeGeometry(s, {
    depth: d,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 20,
  });
  g.translate(0, 0, -d / 2);
  // ExtrudeGeometry gives world-unit UVs on caps and sides; scale them to the texture tile.
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}

export function merge(geos: BufferGeometry[]): BufferGeometry {
  const clean = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of clean) {
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  }
  return mergeGeometries(clean, false)!;
}

export function mesh(geo: BufferGeometry, mat: Material, shadows = true): Mesh {
  const m = new Mesh(geo, mat);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  return m;
}

export function at<T extends Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}
