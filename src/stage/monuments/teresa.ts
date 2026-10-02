import { CircleGeometry, ConeGeometry, Group, Mesh, TorusGeometry } from 'three';
import { arcade, box, mesh } from '../kit';
import { stylized } from '../materials';
import { cvs, tex } from '../textures';
import { robedFigure } from './figures';
import type { BuildContext, Monument } from './types';

/**
 * Mother Teresa Memorial House (2009): a base of rough stone with big round arches, white rendered
 * volumes cantilevered above it (one patterned with scales, a small tower with a glass pyramid),
 * and on top a cube-shaped chapel of green glass marked with a cross.
 */
export function buildTeresa(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'mother-teresa';

  // stone base: left arch, right arch, stepped ends
  const base = mesh(
    arcade(28, 8, 11, [
      { x: -7.5, w: 5.4, spring: 4.4 },
      { x: 6.5, w: 5.2, spring: 4.8 },
    ], 3),
    kit.rubble,
  );
  g.add(base);
  const step = mesh(box(8, 5, 9, 3), kit.rubble);
  step.position.set(-17.5, 2.5, 0.5);
  g.add(step);
  const inner = mesh(box(27, 7.5, 0.4, 3), kit.dark);
  inner.position.set(0, 3.7, -3);
  g.add(inner);
  const lintel = mesh(box(28.4, 0.5, 11.4, 3), kit.plaster);
  lintel.position.y = 8.2;
  g.add(lintel);

  // white volumes
  const scales = stylized({ map: scaleTexture(), roughness: 0.8, rim: 1.1 });
  const left = mesh(box(10, 6.5, 9, 3), scales);
  left.position.set(-8.5, 8.4 + 3.25, 1);
  const oculus = new Mesh(new CircleGeometry(1.1, 32), kit.windowGlow);
  oculus.position.set(-7.2, 11.8, 5.52);
  const oculusRim = mesh(new TorusGeometry(1.15, 0.18, 8, 32), kit.paleStone);
  oculusRim.position.copy(oculus.position);
  const tower = mesh(box(3.4, 3.2, 3.4, 3), scales);
  tower.position.set(-9.5, 14.9 + 1.6, 1);
  const pyramid = mesh(new ConeGeometry(2.3, 3.2, 4), kit.glass);
  pyramid.rotation.y = Math.PI / 4;
  pyramid.position.set(-9.5, 18.1 + 1.6, 1);
  g.add(left, oculus, oculusRim, tower, pyramid);

  const mid = mesh(box(9, 3.4, 9.5, 3), kit.plaster);
  mid.position.set(1, 8.4 + 1.7, 0.5);
  g.add(mid);
  const bay = mesh(box(5.2, 7.5, 5, 3), kit.plaster);
  bay.position.set(12.4, 4.6 + 3.75, 5.2);
  g.add(bay);
  for (let i = 0; i < 4; i++) {
    const w = new Mesh(box(0.7, 2.6, 0.1, 1), kit.windowGlow);
    w.position.set(10.6 + i * 1.2, 8.6, 7.72);
    g.add(w);
  }

  // glass chapel with white frame and cross
  const cx = 6.5;
  const cy = 11.8;
  const chapel = mesh(box(10, 10, 10, 10), kit.glass);
  chapel.position.set(cx, cy + 5, -0.5);
  g.add(chapel);
  for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
    const pier = mesh(box(0.7, 10, 0.7, 2), kit.plaster);
    pier.position.set(cx + x, cy + 5, -0.5 + z);
    g.add(pier);
  }
  const crown = mesh(box(11.4, 1.3, 11.4, 3), kit.plaster);
  crown.position.set(cx, cy + 10.6, -0.5);
  const sill = mesh(box(10.8, 0.5, 10.8, 3), kit.plaster);
  sill.position.set(cx, cy + 0.2, -0.5);
  g.add(crown, sill);
  for (const face of [1, -1]) {
    const v = mesh(box(0.55, 7.2, 0.3, 1), kit.dark);
    v.position.set(cx, cy + 5.2, -0.5 + face * 5.08);
    const h = mesh(box(4.2, 0.55, 0.3, 1), kit.dark);
    h.position.set(cx, cy + 6.6, -0.5 + face * 5.08);
    g.add(v, h);
  }
  // a side cross too, as on the east facade
  const sv = mesh(box(0.3, 5.5, 0.5, 1), kit.dark);
  sv.position.set(cx + 5.08, cy + 5.2, -0.5);
  const sh = mesh(box(0.3, 0.5, 3.2, 1), kit.dark);
  sh.position.set(cx + 5.08, cy + 6.3, -0.5);
  g.add(sv, sh);

  // her statue under the right-hand arch
  const fig = mesh(robedFigure(ctx.high ? 0.018 : 0.026), kit.plaster);
  fig.scale.setScalar(1.7);
  fig.rotation.y = -Math.PI / 2;
  fig.position.set(6.5, 0.6, 3.5);
  const ped = mesh(box(1.4, 0.6, 1.4, 1), kit.paleStone);
  ped.position.set(6.5, 0.3, 3.5);
  g.add(fig, ped);

  return { group: g };
}

function scaleTexture() {
  const S = 256;
  const c = cvs(S, S);
  const x = c.getContext('2d')!;
  x.fillStyle = '#ece6da';
  x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(120,110,100,0.45)';
  x.lineWidth = 2;
  const r = 16;
  for (let row = 0; row < S / r + 2; row++)
    for (let col = -1; col < S / (r * 2) + 2; col++) {
      const cx = col * r * 2 + (row % 2) * r;
      const cy = row * r;
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI);
      x.stroke();
    }
  return tex(c);
}
