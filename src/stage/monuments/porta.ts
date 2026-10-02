import { Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, TorusGeometry } from 'three';
import { box, cyl, arcade, mesh } from '../kit';
import { stylized } from '../materials';
import { cvs, relief, tex } from '../textures';
import { soldier } from './figures';
import type { BuildContext, Monument } from './types';

/**
 * Porta Macedonia: a single round-headed arch in white marble, paired engaged columns on each pier,
 * relief panels and roundels, a deep entablature and a tall attic carrying the inscription.
 * About 21 m tall in reality.
 */
export function buildPorta(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'porta';
  const W = 17;
  const D = 9;

  const base = mesh(box(W + 2, 1.6, D + 2, 3), kit.paleStone);
  base.position.y = 0.8;
  g.add(base);

  const body = mesh(arcade(W, 13.5, D, [{ x: 0, w: 6.4, spring: 9.6 }], 3), kit.marble);
  body.position.y = 1.6;
  g.add(body);

  // Carved panels: marble with a relief height map.
  const panelMat = (seed: number, rx = 1) => {
    const m = stylized({ surface: kit.surfaces.marble, roughness: 0.6, rim: 1.2 });
    m.bumpMap = relief(seed, 1024, 256, 7);
    m.bumpMap.repeat.set(rx, 1);
    m.bumpScale = 4;
    return m;
  };
  const column = cyl(0.52, 0.56, 9.8, 20, 2);
  const cap = box(1.5, 0.8, 1.5, 2);
  const ped = box(1.5, 1.8, 1.5, 2);
  for (const side of [1, -1]) {
    const z = side * (D / 2 + 0.35);
    for (const x of [-7.4, -4.6, 4.6, 7.4]) {
      const c = mesh(column, kit.marble);
      c.position.set(x, 2.5 + 0.9 + 4.9, z);
      const p = mesh(ped, kit.marble);
      p.position.set(x, 2.5, z);
      const k = mesh(cap, kit.marble);
      k.position.set(x, 13.6, z);
      g.add(c, p, k);
    }
    for (const x of [-6, 6]) {
      const panel = mesh(box(2.1, 3.6, 0.3, 2), panelMat(x > 0 ? 3 : 4, 0.35));
      panel.position.set(x, 6.2, z);
      g.add(panel);
      const roundel = mesh(cyl(1.05, 1.05, 0.35, 32), panelMat(9, 0.25));
      roundel.rotation.x = Math.PI / 2;
      roundel.position.set(x, 10.8, z);
      g.add(roundel);
    }
    // archivolt and keystone
    const arch = mesh(new TorusGeometry(3.45, 0.28, 8, 40, Math.PI), kit.marble);
    arch.position.set(0, 1.6 + 9.6, z * 0.99);
    g.add(arch);
    const key = mesh(box(1.1, 1.5, 0.6, 2), kit.marble);
    key.position.set(0, 1.6 + 9.6 + 3.5, z);
    g.add(key);
    // relief frieze over the columns
    const frieze = mesh(box(W + 0.6, 1.3, 0.3, 4), panelMat(side > 0 ? 12 : 13, 3));
    frieze.position.set(0, 15.75, z * 1.02);
    g.add(frieze);
  }

  const ent = mesh(box(W + 1.2, 1.3, D + 1.2, 3), kit.marble);
  ent.position.y = 15.75;
  const cornice = mesh(box(W + 2, 0.55, D + 2, 3), kit.paleStone);
  cornice.position.y = 16.7;
  const attic = mesh(box(W - 0.8, 3.7, D - 0.2, 3), kit.marble);
  attic.position.y = 18.8;
  const crown = mesh(box(W - 0.2, 0.5, D + 0.4, 3), kit.paleStone);
  crown.position.y = 20.85;
  g.add(ent, cornice, attic, crown);

  // attic reliefs either side of the inscription
  for (const side of [1, -1]) {
    const z = side * ((D - 0.2) / 2 + 0.16);
    for (const x of [-5.4, 5.4]) {
      const p = mesh(box(4.4, 2.5, 0.3, 2), panelMat(20 + x + side, 0.8));
      p.position.set(x, 18.8, z);
      g.add(p);
    }
    const ins = new Mesh(new PlaneGeometry(5.6, 1.1), inscription(kit.marble.color));
    ins.position.set(0, 18.8, z + side * 0.02);
    if (side < 0) ins.rotation.y = Math.PI;
    g.add(ins);
  }

  // two standing figures on the front corners of the cornice
  const figs = new InstancedMesh(soldier(ctx.high ? 0.02 : 0.03), kit.marble, 4);
  const o = new Object3D();
  let i = 0;
  for (const x of [-8.3, 8.3])
    for (const z of [D / 2 + 0.3, -D / 2 - 0.3]) {
      o.position.set(x, 16.98, z);
      o.rotation.y = z > 0 ? -Math.PI / 2 : Math.PI / 2;
      o.scale.setScalar(1.45);
      o.updateMatrix();
      figs.setMatrixAt(i++, o.matrix);
    }
  figs.castShadow = true;
  g.add(figs);

  // warm lamps inside the passage
  const lamp = new Mesh(new PlaneGeometry(4.6, 0.25), kit.lampGlow);
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 1.6 + 9.6 + 3.1, 0);
  g.add(lamp);

  return { group: g };
}

function inscription(tint: Color) {
  const c = cvs(1024, 200);
  const x = c.getContext('2d')!;
  x.fillStyle = '#e9e2d6';
  x.fillRect(0, 0, 1024, 200);
  x.strokeStyle = 'rgba(90,80,70,0.5)';
  x.lineWidth = 6;
  x.strokeRect(10, 10, 1004, 180);
  x.fillStyle = '#5b4f44';
  x.font = '600 118px "Times New Roman", serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('МАКЕДОНИЈА', 512, 108);
  const m = new MeshStandardMaterial({ map: tex(c, true, false), roughness: 0.7 });
  m.color.copy(tint);
  return m;
}
