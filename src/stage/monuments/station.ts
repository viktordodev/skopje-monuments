import {
  Color,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
} from 'three';
import { mulberry32 } from '../../core/noise';
import { box, cyl, extrude, mesh } from '../kit';
import { stylized } from '../materials';
import { cvs, tex } from '../textures';
import type { BuildContext, Monument } from './types';

/**
 * The Old Railway Station (Museum of the City of Skopje): a tall travertine block with its left
 * corner torn away, the clock of bare bronze bars still showing 5:17, and the long wing with rows of
 * windows. Here the moment is literally frozen: fragments of the broken corner hang in the air.
 */
export function buildStation(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'old-station';
  const W = 17;
  const H = 25;
  const D = 13;

  // the clock block, its top-left corner broken away
  const s = new Shape();
  s.moveTo(-W / 2, 0);
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, H);
  s.lineTo(-W / 2 + 6.5, H);
  const rnd = mulberry32(517);
  let bx = -W / 2 + 6.5;
  let by = H;
  while (bx > -W / 2 + 0.4) {
    bx -= 0.6 + rnd() * 1.1;
    by -= 0.4 + rnd() * 1.4 + (rnd() < 0.3 ? 1.6 : 0);
    s.lineTo(Math.max(bx, -W / 2), by + (rnd() - 0.5) * 0.8);
  }
  s.lineTo(-W / 2, by - 1.5);
  s.lineTo(-W / 2, 0);
  const block = mesh(extrude(s, D, 3.4), kit.travertine);
  g.add(block);
  const cap = mesh(box(W - 6.2, 0.7, D + 0.3, 3), kit.paleStone);
  cap.position.set(3.1, H + 0.2, 0);
  g.add(cap);

  // the clock: twelve bronze bars and two hands, stopped at 5:17
  const patina = stylized({ color: new Color('#5e9a86'), roughness: 0.55, metalness: 0.4, rim: 1.6 });
  const cy = 16.5;
  const fz = D / 2 + 0.2;
  const bars = new InstancedMesh(box(0.42, 1.05, 0.35, 1), patina, 12);
  const o = new Object3D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    o.position.set(Math.sin(a) * 3.3, cy + Math.cos(a) * 3.3, fz);
    o.rotation.set(0, 0, -a);
    o.updateMatrix();
    bars.setMatrixAt(i, o.matrix);
  }
  g.add(bars);
  const hand = (len: number, w: number, angle: number) => {
    const pivot = new Group();
    const m = mesh(box(w, len, 0.3, 1), patina);
    m.position.y = len / 2 - 0.4;
    pivot.add(m);
    pivot.position.set(0, cy, fz + 0.15);
    pivot.rotation.z = -angle;
    g.add(pivot);
  };
  hand(2.1, 0.42, ((5 + 17 / 60) / 12) * Math.PI * 2);
  hand(3.0, 0.3, (17 / 60) * Math.PI * 2);

  const slit = mesh(box(0.7, 3.4, 0.2, 1), kit.dark);
  slit.position.set(0, 9.5, D / 2 + 0.05);
  g.add(slit);

  // entrance: canopy over a glazed wall
  const canopy = mesh(box(13, 0.5, 3.4, 3), kit.paleStone);
  canopy.position.set(0.5, 5.2, D / 2 + 1.6);
  const glazeMat = new MeshStandardMaterial({ color: 0x100c0e, emissive: kit.windowGlow.emissive, roughness: 1 });
  kit.nightLights.push({ mat: glazeMat, day: 0.02, night: 0.32 });
  const glaze = new Mesh(new PlaneGeometry(11, 4.6), glazeMat);
  glaze.position.set(0.5, 2.5, D / 2 + 0.03);
  g.add(canopy, glaze);
  const sign = new Mesh(new PlaneGeometry(6, 0.8), signMaterial());
  sign.position.set(0.5, 5.9, D / 2 + 3.32);
  g.add(sign);

  // the long wing with rows of windows, arched along the top floor
  const wing = mesh(box(40, 15, 12, 3.4), kit.travertine);
  wing.position.set(W / 2 + 20, 7.5, -1.5);
  g.add(wing);
  const wingTop = mesh(box(40.4, 0.6, 12.4, 3), kit.paleStone);
  wingTop.position.set(W / 2 + 20, 15.2, -1.5);
  g.add(wingTop);
  const winMat = new MeshStandardMaterial({ color: 0x120e10, emissive: kit.windowGlow.emissive, roughness: 1 });
  kit.nightLights.push({ mat: winMat, day: 0.05, night: 1.1 });
  const arch = archAlpha();
  const archMat = winMat.clone();
  archMat.alphaMap = arch;
  archMat.emissiveMap = arch;
  archMat.transparent = true;
  kit.nightLights.push({ mat: archMat, day: 0.05, night: 1.1 });
  const rects = new InstancedMesh(new PlaneGeometry(1.5, 2.3), winMat, 26);
  const arches = new InstancedMesh(new PlaneGeometry(1.5, 2.6), archMat, 13);
  let r = 0;
  for (let i = 0; i < 13; i++) {
    const x = W / 2 + 2.5 + i * 2.9;
    for (const y of [3, 7.5]) {
      o.position.set(x, y, 4.53);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      rects.setMatrixAt(r++, o.matrix);
    }
    o.position.set(x, 12, 4.53);
    o.updateMatrix();
    arches.setMatrixAt(i, o.matrix);
  }
  g.add(rects, arches);

  // flag on the roof
  const pole = mesh(cyl(0.08, 0.1, 7, 8), kit.iron);
  pole.position.set(4, H + 3.9, 0);
  const flag = new Mesh(new PlaneGeometry(3.6, 1.8, 12, 4), flagMaterial());
  flag.position.set(5.85, H + 6.4, 0);
  g.add(pole, flag);

  // rubble at the foot of the break, and fragments suspended in the air
  const chunkGeo = new DodecahedronGeometry(1, 0);
  const rubbleMesh = new InstancedMesh(chunkGeo, kit.travertine, 30);
  for (let i = 0; i < 30; i++) {
    o.position.set(-W / 2 - 1 - rnd() * 5, rnd() * 1.2, (rnd() - 0.5) * D);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    o.scale.setScalar(0.4 + rnd() * 1.1);
    o.updateMatrix();
    rubbleMesh.setMatrixAt(i, o.matrix);
  }
  rubbleMesh.castShadow = true;
  g.add(rubbleMesh);

  const F = ctx.high ? 46 : 28;
  const floating = new InstancedMesh(chunkGeo, kit.travertine, F);
  floating.castShadow = true;
  const frags = Array.from({ length: F }, () => ({
    x: -W / 2 + rnd() * 7 - 2,
    y: H - 8 + rnd() * 14,
    z: (rnd() - 0.5) * D * 1.2,
    s: 0.15 + Math.pow(rnd(), 2) * 0.9,
    rx: rnd() * 6,
    ry: rnd() * 6,
    sp: 0.1 + rnd() * 0.25,
    ph: rnd() * 6.28,
  }));
  g.add(floating);

  return {
    group: g,
    update(time) {
      frags.forEach((f, i) => {
        o.position.set(f.x + Math.sin(time * f.sp + f.ph) * 0.4, f.y + Math.sin(time * f.sp * 0.7 + f.ph) * 0.8, f.z + Math.cos(time * f.sp + f.ph) * 0.4);
        o.rotation.set(f.rx + time * f.sp * 0.5, f.ry + time * f.sp * 0.3, 0);
        o.scale.setScalar(f.s);
        o.updateMatrix();
        floating.setMatrixAt(i, o.matrix);
      });
      floating.instanceMatrix.needsUpdate = true;
      const fp = flag.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        const x = fp.getX(i) + 1.8;
        fp.setZ(i, Math.sin(x * 1.6 - time * 3) * 0.12 * x);
      }
      fp.needsUpdate = true;
    },
  };
}

function archAlpha() {
  const c = cvs(64, 128);
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(2, 128);
  x.lineTo(2, 32);
  x.arc(32, 32, 30, Math.PI, 0);
  x.lineTo(62, 128);
  x.fill();
  return tex(c, false, false);
}

function signMaterial() {
  const c = cvs(512, 64);
  const x = c.getContext('2d')!;
  x.fillStyle = '#d8ccb4';
  x.fillRect(0, 0, 512, 64);
  x.fillStyle = '#3a3026';
  x.font = '600 38px Manrope, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('МУЗЕЈ НА ГРАДОТ СКОПЈЕ', 256, 34);
  return new MeshStandardMaterial({ map: tex(c, true, false), roughness: 0.8 });
}

/** The flag of North Macedonia: a golden sun with eight broadening rays on red. */
function flagMaterial() {
  const c = cvs(256, 128);
  const x = c.getContext('2d')!;
  x.fillStyle = '#d20000';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#ffe600';
  x.translate(128, 64);
  const corners: [number, number][] = [[-128, -64], [0, -64], [128, -64], [128, 0], [128, 64], [0, 64], [-128, 64], [-128, 0]];
  for (const [cx, cy] of corners) {
    const a = Math.atan2(cy, cx);
    const w = cx === 0 || cy === 0 ? 0.2 : 0.14;
    x.beginPath();
    x.moveTo(Math.cos(a - 0.5) * 14, Math.sin(a - 0.5) * 14);
    x.lineTo(cx + Math.cos(a + Math.PI / 2) * 256 * w * 0.5, cy + Math.sin(a + Math.PI / 2) * 256 * w * 0.5);
    x.lineTo(cx - Math.cos(a + Math.PI / 2) * 256 * w * 0.5, cy - Math.sin(a + Math.PI / 2) * 256 * w * 0.5);
    x.lineTo(Math.cos(a + 0.5) * 14, Math.sin(a + 0.5) * 14);
    x.fill();
  }
  x.beginPath();
  x.arc(0, 0, 22, 0, Math.PI * 2);
  x.fillStyle = '#d20000';
  x.fill();
  x.beginPath();
  x.arc(0, 0, 18, 0, Math.PI * 2);
  x.fillStyle = '#ffe600';
  x.fill();
  const m = new MeshStandardMaterial({ map: tex(c, true, false), roughness: 0.9, side: 2 });
  return m;
}
