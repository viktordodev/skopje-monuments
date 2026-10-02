import { ConeGeometry, Group, InstancedMesh, Matrix4, Object3D, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { fbm, mulberry32, smoothstep } from '../../core/noise';
import { arcade, box, cyl, mesh } from '../kit';
import { stylized } from '../materials';
import { mottled } from '../textures';
import type { BuildContext, Monument } from './types';

/**
 * Kale Fortress: a crenellated ring of yellow-stone walls and square towers crowning a steep hill,
 * with the tall round lookout tower and its small red roof, and the gatehouse facing the river.
 */
export const KALE_HILL = 30;

export function buildKale(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'kale';
  const R = 108;
  const top = 56;

  const hillH = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const n = fbm(x * 0.03, z * 0.03, 4);
    const rim = top + n * 10;
    const slope = 1 - smoothstep(rim, R, r);
    const rock = Math.abs(fbm(x * 0.05 + 5, z * 0.05, 3)) * 3 * smoothstep(0.3, 0.9, slope) * (1 - smoothstep(0.95, 1, slope));
    return KALE_HILL * Math.pow(slope, 0.8) + rock + n * 2.5 * slope - 3 * (1 - slope);
  };
  const geo = new PlaneGeometry(R * 2.1, R * 2.1, 140, 140);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hillH(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 8);
  const hillMat = stylized({ surface: mottled(101, [118, 100, 78], 0.8, 6, 256), roughness: 1, bumpScale: 1.4, rim: 0.6 });
  const hill = mesh(geo, hillMat);
  g.add(hill);

  // the curtain wall: an irregular ring on the plateau
  const rnd = mulberry32(12);
  const N = 12;
  const ring: Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.18;
    const r = 50 + (rnd() - 0.5) * 12;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    ring.push(new Vector3(x, hillH(x, z), z));
  }
  const wallH = 16;
  const merlonGeo = box(1.5, 1.8, 3.6, 2);
  const merlons: Matrix4[] = [];
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % N];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const baseY = Math.min(a.y, b.y) - 4;
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const w = mesh(box(3.4, wallH + 4, len, 3), kit.rubble);
    w.position.set((a.x + b.x) / 2, baseY + (wallH + 4) / 2, (a.z + b.z) / 2);
    w.rotation.y = ang;
    g.add(w);
    const steps = Math.floor(len / 3);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      q.setFromAxisAngle(up, ang);
      merlons.push(new Matrix4().compose(new Vector3(a.x + (b.x - a.x) * t, baseY + wallH + 4 + 0.9, a.z + (b.z - a.z) * t), q, new Vector3(1, 1, 0.42)));
    }
  }

  // towers at the corners; the one facing the river is the gatehouse, one is the round lookout
  const o = new Object3D();
  ring.forEach((p, i) => {
    const baseY = p.y - 4;
    if (i === 0) {
      // gatehouse: an arched passage under a gabled roof
      const gate = mesh(arcade(13, 25, 11, [{ x: 0, w: 5, spring: 7 }], 3), kit.stone);
      gate.position.set(p.x, baseY, p.z);
      gate.rotation.y = Math.atan2(p.x, p.z);
      const roof = mesh(new ConeGeometry(8.6, 5, 4), kit.roof);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 0.8);
      const roofHolder = new Group();
      roofHolder.add(roof);
      roofHolder.position.set(p.x, baseY + 27.4, p.z);
      roofHolder.rotation.y = Math.atan2(p.x, p.z);
      g.add(gate, roofHolder);
      return;
    }
    if (i === 3) {
      const t = mesh(cyl(6.4, 7, 34, 32, 3), kit.stone);
      t.position.set(p.x, baseY + 17, p.z);
      const roof = mesh(new ConeGeometry(7.2, 7, 32), kit.roof);
      roof.position.set(p.x, baseY + 37.5, p.z);
      g.add(t, roof);
      return;
    }
    const h = 26 + (i % 3) * 3;
    const t = mesh(box(9, h, 9, 3), i % 2 ? kit.stone : kit.rubble);
    t.position.set(p.x, baseY + h / 2, p.z);
    t.rotation.y = Math.atan2(p.x, p.z);
    g.add(t);
    // merlons around the tower top
    for (let s = 0; s < 4; s++)
      for (let k = -1; k <= 1; k++) {
        o.position.set(k * 3, h + 0.9, 4.1);
        o.position.applyAxisAngle(up, (s * Math.PI) / 2 + t.rotation.y);
        o.position.add(new Vector3(p.x, baseY, p.z));
        o.rotation.set(0, (s * Math.PI) / 2 + t.rotation.y, 0);
        o.scale.set(1, 1, 0.42);
        o.updateMatrix();
        merlons.push(o.matrix.clone());
      }
  });
  const m = new InstancedMesh(merlonGeo, kit.rubble, merlons.length);
  merlons.forEach((mt, i) => m.setMatrixAt(i, mt));
  m.castShadow = m.receiveShadow = true;
  g.add(m);

  return { group: g };
}
