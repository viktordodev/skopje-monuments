import { BufferGeometry, ConeGeometry, Group, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Shape } from 'three';
import { arcade, box, cyl, extrude, lathe, merge, mesh } from '../kit';
import type { BuildContext, Monument } from './types';

/**
 * Kuršumli An (c. 1550): a square two-storey caravanserai around an open courtyard. Blank outer walls
 * of stone laced with brick, small high windows, a chimney for every upper room standing along the
 * wall tops, rows of small domes (once lead, hence the name), a projecting south gate under its own
 * dome, and inside a two-tier arcade round a fountain and a tall fir.
 */
export function buildHan(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'kursumli-an';
  const W = 44; // outer side
  const D = 10; // wing depth
  const H = 11; // wall height
  const y0 = 1.2;
  const C = W / 2 - D; // courtyard half-side
  const GAL = 3; // gallery depth

  const plinth = mesh(box(W + 6, y0, W + 12, 3), kit.paleStone);
  plinth.position.set(0, y0 / 2, 3);
  g.add(plinth);

  // the four wings: room blocks on the outside, galleries facing the courtyard
  const rooms: BufferGeometry[] = [];
  const RD = D - GAL;
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const len = f % 2 ? W - 2 * RD : W; // front/back wings run the full width
    const b = box(len, H, RD, 5);
    b.rotateY(a);
    const r = W / 2 - RD / 2;
    b.translate(Math.sin(a) * r, y0 + H / 2, Math.cos(a) * r);
    rooms.push(b);
  }
  g.add(mesh(merge(rooms), kit.ottoman));
  const cornice: BufferGeometry[] = [];
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const b = box(W + 0.6, 0.5, 0.8, 3);
    b.rotateY(a);
    b.translate(Math.sin(a) * (W / 2), y0 + H + 0.25, Math.cos(a) * (W / 2));
    cornice.push(b);
  }
  g.add(mesh(merge(cornice), kit.paleStone));

  // courtyard: two tiers of round arches on square piers, a floor between, a flat roof over the galleries
  const lower: BufferGeometry[] = [];
  const upper: BufferGeometry[] = [];
  const slabs: BufferGeometry[] = [];
  const L1 = 5.4;
  const L2 = H - L1;
  const xs = [-10, -6, -2, 2, 6, 10];
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const place = (geo: BufferGeometry, y: number, r: number) => {
      geo.rotateY(a);
      geo.translate(Math.sin(a) * r, y, Math.cos(a) * r);
      return geo;
    };
    lower.push(place(arcade(2 * C + 0.8, L1, 0.8, xs.map((x) => ({ x, w: 2.9, spring: 3.3 })), 3), y0, C + 0.4));
    upper.push(place(arcade(2 * C + 0.8, L2, 0.8, xs.map((x) => ({ x, w: 2.7, spring: 3.0 })), 3), y0 + L1, C + 0.4));
    slabs.push(place(box(2 * C + 2 * GAL, 0.4, GAL, 3), y0 + L1, C + GAL / 2));
    slabs.push(place(box(2 * C + 2 * GAL, 0.5, GAL + 0.8, 3), y0 + H + 0.25, C + GAL / 2));
  }
  g.add(mesh(merge(lower), kit.ottoman), mesh(merge(upper), kit.ottoman), mesh(merge(slabs), kit.paleStone));

  // the roofscape: a dome over every bay, a chimney between each pair, all round the ring
  const ring = W / 2 - D / 2;
  const domeProfile: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ang = t * (Math.PI / 2);
    domeProfile.push([Math.cos(ang) * 1.9, Math.sin(ang) * 1.7 + t * t * 0.35]);
  }
  domeProfile.push([0, 2.1]);
  const drums: BufferGeometry[] = [];
  const domes: BufferGeometry[] = [];
  const stacks: BufferGeometry[] = [];
  const caps: BufferGeometry[] = [];
  const top = y0 + H;
  const step = (2 * ring) / 8;
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // walk one side of the ring; side f ends where side f+1 begins
    const pt = (u: number, out: number) => [sa * (ring + out) + ca * u, ca * (ring + out) - sa * u] as const;
    for (let i = 0; i < 8; i++) {
      const u = -ring + i * step;
      const [x, z] = pt(u, 0);
      const front = f === 0 && Math.abs(u) < 4;
      if (!front) {
        const dr = box(3.6, 1.8, 3.6, 3);
        dr.translate(x, top + 0.9, z);
        drums.push(dr);
        const d = lathe(domeProfile, 20, 3, 2);
        d.translate(x, top + 1.8, z);
        domes.push(d);
      }
      // chimneys stand on the outer wall line, between the domes
      const [cx, cz] = pt(u + step / 2, D / 2 - 0.9);
      const hgt = 2.4 + ((i * 7 + f * 3) % 3) * 0.25;
      const s = box(1.1, hgt, 1.1, 2);
      s.translate(cx, top + hgt / 2, cz);
      stacks.push(s);
      const c = new ConeGeometry(0.95, 0.7, 4, 1);
      c.rotateY(Math.PI / 4);
      c.translate(cx, top + hgt + 0.35, cz);
      caps.push(c);
    }
  }
  g.add(mesh(merge(drums), kit.ottoman), mesh(merge(domes), kit.roof), mesh(merge(stacks), kit.brick), mesh(merge(caps), kit.roof));

  // the south gate: a taller block standing proud of the wall, a brick-ringed arch, its own dome
  const gz = W / 2 + 1.6;
  const GW = 11;
  const GH = H + 2.4;
  const gate = mesh(box(GW, GH, 3.2, 5), kit.ottoman);
  gate.position.set(0, y0 + GH / 2, gz - 0.4);
  g.add(gate);
  const face = mesh(arcade(GW, GH, 0.6, [{ x: 0, w: 6, spring: 4.6 }], 5), kit.ottoman);
  face.position.set(0, y0, gz + 1.5);
  g.add(face);
  const ringShape = new Shape();
  ringShape.moveTo(-3, 0);
  ringShape.lineTo(-3, 4.6);
  ringShape.absarc(0, 4.6, 3, Math.PI, 0, true);
  ringShape.lineTo(3, 0);
  ringShape.lineTo(2.2, 0);
  ringShape.lineTo(2.2, 4.6);
  ringShape.absarc(0, 4.6, 2.2, 0, Math.PI, false);
  ringShape.lineTo(-2.2, 0);
  ringShape.lineTo(-3, 0);
  const arch = mesh(extrude(ringShape, 0.7, 1.2), kit.brick);
  arch.position.set(0, y0, gz + 1.55);
  g.add(arch);
  const doorway = mesh(box(4.4, 6.8, 0.3), kit.dark);
  doorway.position.set(0, y0 + 3.4, gz + 1.15);
  g.add(doorway);
  const gcap = mesh(box(GW + 0.6, 0.5, 4.2, 3), kit.paleStone);
  gcap.position.set(0, y0 + GH + 0.25, gz - 0.1);
  g.add(gcap);
  const gdrum = mesh(cyl(3.2, 3.4, 1.2, 8, 3), kit.ottoman);
  gdrum.geometry = gdrum.geometry.toNonIndexed();
  gdrum.geometry.computeVertexNormals();
  gdrum.position.set(0, y0 + GH + 1.1, gz - 1.2);
  g.add(gdrum);
  const gdome = mesh(lathe(domeProfile.map(([r, y]) => [r * 1.6, y * 1.6] as [number, number]), 32, 5, 3), kit.roof);
  gdome.position.set(0, y0 + GH + 1.7, gz - 1.2);
  g.add(gdome);

  // small square windows high on the outer walls, one per upper room
  const winMat = new MeshStandardMaterial({ color: 0x0e0a0c, emissive: kit.windowGlow.emissive, roughness: 1 });
  kit.nightLights.push({ mat: winMat, day: 0.05, night: 1.5 });
  const wins = new InstancedMesh(new PlaneGeometry(1, 1), winMat, 40);
  const o = new Object3D();
  let n = 0;
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    for (let i = 0; i < 8; i++) {
      const u = -W / 2 + 2.75 + i * 5.5;
      if (f === 0 && Math.abs(u) < GW / 2 + 0.5) continue;
      o.position.set(Math.sin(a) * (W / 2 + 0.03) + Math.cos(a) * u, y0 + 8, Math.cos(a) * (W / 2 + 0.03) - Math.sin(a) * u);
      o.rotation.set(0, a, 0);
      o.scale.set(1.1, 1.3, 1);
      o.updateMatrix();
      wins.setMatrixAt(n++, o.matrix);
    }
  }
  wins.count = n;
  g.add(wins);

  // the courtyard fountain (šadrvan) and the old fir beside it
  const basin = mesh(cyl(2.6, 2.8, 0.9, 8, 2), kit.paleStone);
  basin.position.set(0, y0 + 0.45, 0);
  const water = mesh(cyl(2.3, 2.3, 0.1, 8, 2), ctx.pool, false);
  water.position.set(0, y0 + 0.82, 0);
  const spout = mesh(cyl(0.35, 0.5, 1.8, 8, 2), kit.paleStone);
  spout.position.set(0, y0 + 1.3, 0);
  g.add(basin, water, spout);
  const firMat = new MeshStandardMaterial({ color: 0x1f3324, roughness: 1 });
  const fir = new Group();
  const trunk = mesh(cyl(0.35, 0.5, 4, 8, 2), kit.dark);
  trunk.position.y = 2;
  fir.add(trunk);
  for (let i = 0; i < 6; i++) {
    const r = 4.2 - i * 0.62;
    const tier = mesh(new ConeGeometry(r, 5.2 - i * 0.35, 9), firMat);
    tier.position.y = 4.6 + i * 2.5;
    tier.rotation.y = i * 0.7;
    fir.add(tier);
  }
  fir.position.set(-5.5, y0, -4.5);
  g.add(fir);

  return { group: g };
}
