import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../core/noise';
import { RIVER_HALF, riverX } from './land';
import { RIM, stylized } from './materials';
import type { Palette } from './palette';
import { cvs, tex } from './textures';

/** Stylised poplars and plane trees along the banks, and wind-blown grass in the foreground. */
export class Flora {
  readonly group = new Group();
  private readonly grassUniforms = { uTime: { value: 0 } };
  private readonly leafMat: MeshStandardMaterial;
  private readonly grassMat: MeshStandardMaterial;

  constructor(
    high: boolean,
    height: (x: number, z: number) => number,
    blocked: (x: number, z: number, clear?: number) => boolean,
    pathZ: [number, number],
    focusPoints: { x: number; z: number }[],
  ) {
    const r = mulberry32(99);
    this.leafMat = stylized({ color: new Color('#3b4a30'), roughness: 0.95, flatShading: true, rim: 1.4 });
    const trunkMat = stylized({ color: new Color('#3a2a22'), roughness: 1 });

    const poplar = new IcosahedronGeometry(1, 1);
    poplar.scale(2.2, 10, 2.2);
    const round = mergeGeometries([
      new IcosahedronGeometry(1, 1).scale(4.4, 3.4, 4.4),
      new IcosahedronGeometry(1, 1).scale(3.2, 2.7, 3.2).translate(2, 1.8, 0.8),
      new IcosahedronGeometry(1, 1).scale(2.9, 2.4, 2.9).translate(-1.9, 1.2, -1),
    ].map((g) => g.toNonIndexed()))!;
    const trunk = new CylinderGeometry(0.35, 0.55, 1, 6);

    const P = high ? 700 : 380;
    const T = high ? 420 : 220;
    const pop = new InstancedMesh(poplar, this.leafMat, P);
    const tree = new InstancedMesh(round, this.leafMat, T);
    const trunks = new InstancedMesh(trunk, trunkMat, P + T);
    const o = new Object3D();
    let np = 0;
    let nt = 0;
    let tk = 0;
    let guard = 0;
    // trees grow in groves and along lines, not evenly like pins
    const groves = Array.from({ length: 70 }, () => {
      const z = pathZ[0] - r() * (pathZ[0] - pathZ[1]);
      const side = r() < 0.5 ? -1 : 1;
      return { x: riverX(z) + side * (RIVER_HALF + 20 + Math.pow(r(), 1.4) * 460), z, r: 12 + r() * 30, a: r() * Math.PI };
    });
    while ((np < P || nt < T) && guard++ < 40000) {
      let x: number;
      let z: number;
      if (r() < 0.8) {
        const g = groves[(r() * groves.length) | 0];
        // an elongated grove: a row of poplars or a loose clump
        const t = (r() - 0.5) * 2;
        const w = (r() - 0.5) * g.r * 0.35;
        x = g.x + Math.cos(g.a) * t * g.r - Math.sin(g.a) * w;
        z = g.z + Math.sin(g.a) * t * g.r + Math.cos(g.a) * w;
      } else {
        z = pathZ[0] - r() * (pathZ[0] - pathZ[1]);
        x = riverX(z) + (r() < 0.5 ? -1 : 1) * (RIVER_HALF + 14 + Math.pow(r(), 1.6) * 420);
      }
      if (Math.abs(x - riverX(z)) < RIVER_HALF + 10) continue;
      if (blocked(x, z)) continue;
      const y = height(x, z);
      const isPoplar = r() < 0.6;
      if (isPoplar && np >= P) continue;
      if (!isPoplar && nt >= T) continue;
      const s = 0.8 + r() * 0.7;
      o.position.set(x, y + (isPoplar ? 10 * s + 2 : 3.4 * s + 4), z);
      o.rotation.set(0, r() * 6.28, 0);
      o.scale.setScalar(s);
      o.updateMatrix();
      if (isPoplar) pop.setMatrixAt(np++, o.matrix);
      else tree.setMatrixAt(nt++, o.matrix);
      o.position.y = y + (isPoplar ? 1.5 : 2.5) * s;
      o.scale.set(s, (isPoplar ? 3 : 5) * s, s);
      o.updateMatrix();
      trunks.setMatrixAt(tk++, o.matrix);
    }
    pop.count = np;
    tree.count = nt;
    trunks.count = tk;
    for (const m of [pop, tree, trunks]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    this.group.add(pop, tree, trunks);

    // --- grass: crossed cards around every viewpoint and along the quays
    const card = new PlaneGeometry(1, 1, 1, 3);
    card.translate(0, 0.5, 0);
    const card2 = card.clone().rotateY(Math.PI / 2);
    const tuft: BufferGeometry = mergeGeometries([card, card2])!;
    this.grassMat = new MeshStandardMaterial({
      map: grassTexture(),
      alphaTest: 0.45,
      side: DoubleSide,
      roughness: 1,
      color: new Color('#7a8a5a'),
    });
    this.grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.grassUniforms.uTime;
      shader.uniforms.uRimColor = RIM.uRimColor;
      shader.uniforms.uRimStrength = RIM.uRimStrength;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float sway = sin(uTime * 1.6 + wp.x * 0.15 + wp.z * 0.1) * 0.35 + sin(uTime * 3.1 + wp.z * 0.3) * 0.12;
            transformed.x += sway * position.y * position.y;
            transformed.z += sway * 0.4 * position.y * position.y;
          }`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor; uniform float uRimStrength;')
        .replace(
          '#include <opaque_fragment>',
          // grass blades glow at their tips when backlit
          `outgoingLight += uRimColor * uRimStrength * 0.55 * smoothstep(0.35, 1.0, vMapUv.y);
          #include <opaque_fragment>`,
        );
    };
    const G = high ? 9000 : 4000;
    const grass = new InstancedMesh(tuft, this.grassMat, G);
    let n = 0;
    guard = 0;
    while (n < G && guard++ < 80000) {
      let x: number;
      let z: number;
      if (r() < 0.55) {
        const f = focusPoints[(r() * focusPoints.length) | 0];
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 60;
        x = f.x + Math.cos(a) * d;
        z = f.z + Math.sin(a) * d;
      } else {
        z = pathZ[0] - r() * (pathZ[0] - pathZ[1]);
        x = riverX(z) + (r() < 0.5 ? -1 : 1) * (RIVER_HALF + 3 + r() * 50);
      }
      if (Math.abs(x - riverX(z)) < RIVER_HALF + 2 || blocked(x, z, 14)) continue;
      const s = 0.7 + r() * 1.0;
      o.position.set(x, height(x, z) - 0.2, z);
      o.rotation.set(0, r() * 6.28, 0);
      o.scale.set(s * 1.3, s, s * 1.3);
      o.updateMatrix();
      grass.setMatrixAt(n++, o.matrix);
    }
    grass.count = n;
    grass.frustumCulled = false;
    this.group.add(grass);
  }

  update(p: Palette, time: number) {
    this.grassUniforms.uTime.value = time;
    this.leafMat.color.copy(p.ground).lerp(new Color('#3c5030'), 0.55).multiplyScalar(1.2);
    this.grassMat.color.copy(p.ground).lerp(new Color('#8a9a60'), 0.5).multiplyScalar(1.5);
  }
}

function grassTexture() {
  const W = 256;
  const H = 256;
  const c = cvs(W, H);
  const x = c.getContext('2d')!;
  const r = mulberry32(5);
  for (let i = 0; i < 70; i++) {
    const bx = 20 + r() * (W - 40);
    const lean = (r() - 0.5) * 70;
    const h = H * (0.45 + r() * 0.55);
    const w = 3 + r() * 5;
    const g = x.createLinearGradient(0, H, 0, H - h);
    const v = 90 + r() * 70;
    g.addColorStop(0, `rgb(${v * 0.5},${v * 0.55},${v * 0.35})`);
    g.addColorStop(1, `rgb(${v * 1.1},${v * 1.05},${v * 0.6})`);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(bx - w, H);
    x.quadraticCurveTo(bx + lean * 0.3, H - h * 0.6, bx + lean, H - h);
    x.quadraticCurveTo(bx + lean * 0.3 + w * 0.3, H - h * 0.6, bx + w, H);
    x.fill();
  }
  const t = tex(c, true, false);
  return t;
}
