import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import { fbm, smoothstep } from '../../core/noise';
import { box, cyl, mesh } from '../kit';
import { stylized } from '../materials';
import { mottled } from '../textures';
import type { BuildContext, Monument } from './types';

/**
 * The Millennium Cross on Mount Vodno: a 66 m steel lattice cross on a platform of twelve columns,
 * strung with thousands of lights that wake up at nightfall. The mountain is part of this module.
 */
export const VODNO_TOP = 100;

export function buildCross(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'millennium-cross';

  // Vodno: a long mountain with the cross on its summit
  const R = 520;
  const geo = new PlaneGeometry(R * 2.6, R * 1.6, 180, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const height = (x: number, z: number) => {
    const r = Math.hypot(x / 2.2, z / 1.1);
    const s = 1 - smoothstep(0, R * 0.62, r);
    return VODNO_TOP * Math.pow(s, 1.3) * (1 + fbm(x * 0.006, z * 0.006, 5) * 0.3) - 4;
  };
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 9);
  const hill = mesh(geo, stylized({ surface: mottled(131, [70, 72, 60], 0.7, 8, 256), roughness: 1, bumpScale: 0.8, rim: 0.5 }), false);
  hill.receiveShadow = true;
  g.add(hill);

  const cross = new Group();
  cross.position.y = height(0, 0) - 1.5;
  cross.scale.setScalar(2.1);
  g.add(cross);

  // platform on twelve columns
  const slab = mesh(cyl(11, 11, 1.2, 48, 3), kit.paleStone);
  slab.position.y = 6.6;
  const plinth = mesh(cyl(12.5, 13, 1.5, 48, 3), kit.paleStone);
  plinth.position.y = 0.75;
  cross.add(slab, plinth);
  const cols = new InstancedMesh(cyl(0.5, 0.55, 5.2, 12, 2), kit.paleStone, 12);
  const m = new Matrix4();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    m.makeTranslation(Math.sin(a) * 10, 4.1, Math.cos(a) * 10);
    cols.setMatrixAt(i, m);
  }
  cols.castShadow = true;
  cross.add(cols);

  // the lattice: four chords per member, rings and diagonals on every face
  const segs: [Vector3, Vector3][] = [];
  const lights: number[] = [];
  const HALF = 2.3;
  const member = (a: Vector3, b: Vector3, up: Vector3) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    const side = new Vector3().crossVectors(dir, up).normalize().multiplyScalar(HALF);
    const up2 = new Vector3().crossVectors(side, dir).normalize().multiplyScalar(HALF);
    const corners = [side.clone().add(up2), side.clone().sub(up2), side.clone().negate().sub(up2), side.clone().negate().add(up2)];
    for (const c of corners) {
      segs.push([a.clone().add(c), b.clone().add(c)]);
      for (let t = 0; t <= len; t += 1.1) {
        const p = a.clone().addScaledVector(dir, t).add(c.clone().multiplyScalar(1.08));
        lights.push(p.x, p.y, p.z);
      }
    }
    const step = 3.4;
    for (let t = 0; t < len - 0.01; t += step) {
      const p0 = a.clone().addScaledVector(dir, t);
      const p1 = a.clone().addScaledVector(dir, Math.min(len, t + step));
      for (let k = 0; k < 4; k++) {
        const c0 = corners[k];
        const c1 = corners[(k + 1) % 4];
        segs.push([p0.clone().add(c0), p0.clone().add(c1)]);
        segs.push([p0.clone().add(c0), p1.clone().add(c1)]);
        segs.push([p0.clone().add(c1), p1.clone().add(c0)]);
      }
    }
  };
  const Y0 = 7.2;
  member(new Vector3(0, Y0, 0), new Vector3(0, Y0 + 66, 0), new Vector3(0, 0, 1));
  member(new Vector3(-18, Y0 + 45, 0), new Vector3(-HALF, Y0 + 45, 0), new Vector3(0, 1, 0));
  member(new Vector3(HALF, Y0 + 45, 0), new Vector3(18, Y0 + 45, 0), new Vector3(0, 1, 0));

  const beam = box(0.32, 1, 0.32, 1);
  const steel = stylized({ color: new Color('#d9d4cc'), roughness: 0.5, metalness: 0.5, rim: 1.6, emissive: new Color('#ffe2b0'), emissiveIntensity: 0 });
  const lattice = new InstancedMesh(beam, steel, segs.length);
  const q = new Quaternion();
  const yAxis = new Vector3(0, 1, 0);
  const sc = new Vector3();
  const mid = new Vector3();
  segs.forEach(([a, b], i) => {
    const d = b.clone().sub(a);
    const len = d.length();
    q.setFromUnitVectors(yAxis, d.normalize());
    sc.set(1, len, 1);
    mid.addVectors(a, b).multiplyScalar(0.5);
    lattice.setMatrixAt(i, m.compose(mid, q, sc));
  });
  lattice.castShadow = true;
  cross.add(lattice);

  // the lights: glowing points that brighten at night and shimmer
  const lg = new BufferGeometry();
  lg.setAttribute('position', new BufferAttribute(new Float32Array(lights), 3));
  const rnd = new Float32Array(lights.length / 3).map((_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1);
  lg.setAttribute('aRnd', new BufferAttribute(rnd, 1));
  const lmat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uPulse: { value: 1 }, uColor: { value: new Color('#fff0d0') } },
    vertexShader: /* glsl */ `
      attribute float aRnd;
      uniform float uTime, uNight, uPulse;
      varying float vI;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vI = (0.85 + 0.15 * sin(uTime * 2.0 + aRnd * 40.0)) * mix(0.08, 1.0, uNight) * mix(0.22, 1.0, uPulse);
        gl_PointSize = clamp(2200.0 / -mv.z, 2.0, 12.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vI;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor * a * vI * 5.0, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const pts = new Points(lg, lmat);
  pts.frustumCulled = false;
  cross.add(pts);

  return {
    group: g,
    update(time, night) {
      // the whole cross breathes: a slow swell of light and a long fade, about seven seconds a cycle
      const c = 0.5 - 0.5 * Math.cos((time / 7) * Math.PI * 2);
      const pulse = c * c * (3 - 2 * c);
      lmat.uniforms.uTime.value = time;
      lmat.uniforms.uNight.value = night;
      lmat.uniforms.uPulse.value = pulse;
      steel.emissiveIntensity = 0.55 * night * (0.2 + 0.8 * pulse);
    },
  };
}
