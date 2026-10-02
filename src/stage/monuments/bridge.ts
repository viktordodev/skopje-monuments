import { Group, InstancedMesh, Object3D, Shape, SphereGeometry } from 'three';
import { arcade, box, cyl, extrude, mesh } from '../kit';
import type { BuildContext, Monument } from './types';

/**
 * The Stone Bridge: a long, low run of twelve round arches on heavy piers with pointed cutwaters,
 * a plain parapet and lamps along the deck. Local x runs across the river; y = 0 is the river bed.
 */
export const BRIDGE_SPANS = [10, 11, 12, 13, 14, 15, 15, 14, 13, 12, 11, 10];
const PIER = 3.6;
const END = 7;
const DECK = 16;
const WIDTH = 9;

export function buildBridge(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'stone-bridge';
  const L = BRIDGE_SPANS.reduce((a, b) => a + b, 0) + PIER * (BRIDGE_SPANS.length - 1) + END * 2;

  let x = -L / 2 + END;
  const arches: { x: number; w: number; spring: number }[] = [];
  const piers: number[] = [];
  BRIDGE_SPANS.forEach((w, i) => {
    arches.push({ x: x + w / 2, w, spring: 4.6 });
    x += w;
    if (i < BRIDGE_SPANS.length - 1) {
      piers.push(x + PIER / 2);
      x += PIER;
    }
  });
  const body = mesh(arcade(L, DECK, WIDTH, arches, 3), kit.stone);
  g.add(body);

  // pointed cutwaters on both faces of every pier
  const tri = new Shape();
  tri.moveTo(-PIER / 2, 0);
  tri.lineTo(PIER / 2, 0);
  tri.lineTo(0, 3.4);
  tri.lineTo(-PIER / 2, 0);
  const cw = extrude(tri, 8.2, 3);
  cw.rotateX(-Math.PI / 2);
  cw.translate(0, 4.1, 0);
  const cutwaters = new InstancedMesh(cw, kit.stone, piers.length * 2);
  const o = new Object3D();
  let n = 0;
  for (const px of piers)
    for (const side of [1, -1]) {
      o.position.set(px, 0, side * (WIDTH / 2 - 0.01));
      // the prism points to -z; turn it round for the downstream face
      o.rotation.set(0, side > 0 ? Math.PI : 0, 0);
      o.updateMatrix();
      cutwaters.setMatrixAt(n++, o.matrix);
    }
  cutwaters.castShadow = cutwaters.receiveShadow = true;
  g.add(cutwaters);

  // string course, parapets and deck
  for (const side of [1, -1]) {
    const course = mesh(box(L, 0.45, 0.5, 3), kit.paleStone);
    course.position.set(0, DECK - 0.3, side * (WIDTH / 2 + 0.1));
    const parapet = mesh(box(L, 1.2, 0.55, 3), kit.stone);
    parapet.position.set(0, DECK + 0.6, side * (WIDTH / 2 - 0.27));
    const coping = mesh(box(L, 0.18, 0.75, 3), kit.paleStone);
    coping.position.set(0, DECK + 1.28, side * (WIDTH / 2 - 0.27));
    g.add(course, parapet, coping);
  }

  // lamps along the deck
  const count = 7;
  const posts = new InstancedMesh(cyl(0.09, 0.12, 4.2, 8), kit.iron, count * 2);
  const heads = new InstancedMesh(new SphereGeometry(0.34, 12, 8), kit.lampGlow, count * 2);
  n = 0;
  for (let i = 0; i < count; i++) {
    const lx = -L / 2 + END + ((i + 0.5) / count) * (L - END * 2);
    for (const side of [1, -1]) {
      o.rotation.set(0, 0, 0);
      o.position.set(lx, DECK + 2.1, side * (WIDTH / 2 - 0.3));
      o.updateMatrix();
      posts.setMatrixAt(n, o.matrix);
      o.position.y = DECK + 4.4;
      o.updateMatrix();
      heads.setMatrixAt(n++, o.matrix);
    }
  }
  g.add(posts, heads);
  return { group: g };
}

export const BRIDGE_LENGTH = BRIDGE_SPANS.reduce((a, b) => a + b, 0) + PIER * (BRIDGE_SPANS.length - 1) + END * 2;
