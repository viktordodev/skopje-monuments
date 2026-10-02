import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Points,
  RingGeometry,
  ShaderMaterial,
  TorusGeometry,
} from 'three';
import { NOISE } from '../glsl';
import { stylized } from '../materials';
import { box, cyl, lathe, mesh } from '../kit';
import { relief } from '../textures';
import { horseAndRider, lion, soldier } from './figures';
import type { BuildContext, Monument } from './types';

/**
 * Warrior on a Horse, Macedonia Square: a round stepped fountain, a column of bronze relief drums
 * flaring into a wide disc, the rearing rider on top, soldiers in the water and lions at the corners.
 * Dimensions follow the real monument (≈ 10 m column, ≈ 12 m rider) before the scene's surreal scale.
 */
export function buildWarrior(ctx: BuildContext): Monument {
  const { kit } = ctx;
  const g = new Group();
  g.name = 'warrior';

  // --- stepped basin
  const steps = [27.5, 26, 24.5];
  steps.forEach((r, i) => {
    const m = mesh(cyl(r, r + 0.3, 0.45, 96, 3), kit.paleStone);
    m.position.y = 0.225 + i * 0.45;
    g.add(m);
  });
  const rim = mesh(
    lathe([[21, 1.35], [21, 2.35], [21.25, 2.6], [22.3, 2.6], [22.55, 2.35], [22.55, 1.35]], 128, 40, 1),
    kit.paleStone,
  );
  g.add(rim);
  const water = new Mesh(cyl(21.05, 21.05, 0.2, 96), ctx.pool);
  water.position.y = 2.1;
  g.add(water);

  // --- soldiers' ring and column foot
  const ring = mesh(cyl(9.5, 10, 0.7, 64, 3), kit.paleStone);
  ring.position.y = 2.45;
  g.add(ring);
  const foot = mesh(lathe([[0, 2.8], [4.6, 2.8], [4.6, 3.6], [3.8, 4.1], [3.3, 5.0], [2.7, 5.6], [0, 5.6]], 64, 6, 1), kit.marble);
  g.add(foot);

  // --- column of relief drums
  const reliefMap = relief(17, 1024, 256, 10);
  reliefMap.repeat.set(3, 1);
  const drumMat = stylized({ surface: kit.surfaces.bronze, rim: 1.6, roughness: 0.45, metalness: 0.5 });
  drumMat.bumpMap = reliefMap;
  drumMat.bumpScale = 5;
  const band = stylized({ color: new Color('#2a2238'), roughness: 0.4, metalness: 0.4, rim: 1.2 });
  let y = 5.6;
  const drums = [2.15, 2.1, 2.05];
  const DH = 3.1;
  drums.forEach((r, i) => {
    const d = new Mesh(cyl(r, r + 0.05, DH, 72, 1), drumMat);
    // wrap the relief once around each drum
    const uv = d.geometry.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (4 / (Math.PI * 2 * r)), uv.getY(k) * (4 / DH));
    d.position.y = y + DH / 2;
    d.castShadow = d.receiveShadow = true;
    g.add(d);
    const b = mesh(cyl(r + 0.22, r + 0.22, 0.5, 72), band);
    b.position.y = y + DH + 0.25;
    g.add(b);
    y += DH + 0.5;
    if (i === 0) {
      const b0 = mesh(cyl(r + 0.26, r + 0.26, 0.5, 72), band);
      b0.position.y = 5.85;
      g.add(b0);
    }
  });

  // --- the flared disc
  const top = y;
  const disc = mesh(
    lathe(
      [[1.95, top], [2.4, top + 0.5], [3.6, top + 1.2], [5.0, top + 1.7], [5.9, top + 1.95], [6.05, top + 2.3], [6.05, top + 2.8], [5.7, top + 3.0], [0, top + 3.0]],
      96, 8, 1,
    ),
    kit.marble,
  );
  g.add(disc);
  const led = new Mesh(new TorusGeometry(6.08, 0.09, 6, 128), kit.lampGlow);
  led.rotation.x = Math.PI / 2;
  led.position.y = top + 2.55;
  g.add(led);
  const plinth = mesh(cyl(3.5, 3.8, 0.6, 48), kit.paleStone);
  plinth.position.y = top + 3.3;
  g.add(plinth);

  // --- horse and rider, cast in bronze
  const S = 4;
  const statue = new Group();
  const cast = mesh(horseAndRider(ctx.high ? 0.022 : 0.03), kit.bronze);
  statue.add(cast);
  const blade = mesh(box(0.05, 0.95, 0.012, 1), kit.bronze);
  blade.position.set(0.28, 3.98, 0.28);
  blade.rotation.z = -0.22;
  statue.add(blade);
  const guard = mesh(box(0.05, 0.03, 0.22, 1), kit.bronze);
  guard.position.set(0.19, 3.58, 0.28);
  statue.add(guard);
  statue.scale.setScalar(S);
  statue.position.set(1.2, top + 3.6, 0);
  statue.rotation.y = -0.35;
  g.add(statue);

  // --- eight soldiers in the water, facing out
  const soldierGeo = soldier(ctx.high ? 0.02 : 0.028);
  const soldiers = new InstancedMesh(soldierGeo, kit.bronze, 8);
  const o = new Object3D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    o.position.set(Math.cos(a) * 8.2, 2.8, Math.sin(a) * 8.2);
    o.rotation.y = -a;
    o.scale.setScalar(1.55);
    o.updateMatrix();
    soldiers.setMatrixAt(i, o.matrix);
  }
  soldiers.castShadow = soldiers.receiveShadow = true;
  g.add(soldiers);

  // --- lions on stone blocks at the four corners
  const lionGeo = lion(ctx.high ? 0.022 : 0.03);
  const lions = new InstancedMesh(lionGeo, kit.bronze, 4);
  const blocks = new InstancedMesh(box(3.2, 3.2, 3.2, 3), kit.paleStone, 4);
  const mtx = new Matrix4();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const r = 25.5;
    o.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r);
    o.rotation.y = 0;
    o.scale.setScalar(1);
    o.updateMatrix();
    blocks.setMatrixAt(i, o.matrix);
    o.position.y = 3.2;
    o.rotation.y = -a;
    o.scale.setScalar(2.4);
    o.updateMatrix();
    lions.setMatrixAt(i, mtx.copy(o.matrix));
  }
  lions.castShadow = blocks.castShadow = true;
  lions.receiveShadow = blocks.receiveShadow = true;
  g.add(blocks, lions);

  // --- fountain: glassy arcs from the rim toward the column, a crown of tall jets round the soldiers,
  // fine spray and splashes riding on them, and churned water where they land
  const jets = fountainJets(ctx.high ? 90 : 48);
  const spray = fountainSpray(ctx.high ? 90 : 48, ctx.high ? 40 : 22);
  const foam = fountainFoam();
  jets.position.y = spray.position.y = 2.2;
  g.add(jets, spray, foam);
  const fx = [jets.material, spray.material, foam.material] as ShaderMaterial[];

  return {
    group: g,
    update(time, night) {
      for (const m of fx) {
        m.uniforms.uTime.value = time;
        m.uniforms.uNight.value = night;
      }
    },
  };
}

/** The two kinds of jet, as arcs in the basin's local frame (dir = unit vector out from the centre). */
const ARC = /* glsl */ `
  vec3 arcPoint(vec3 dir, float kind, float t) {
    if (kind < 0.5) return vec3(dir.x * mix(20.6, 11.5, t), 0.4 + t * (1.0 - t) * 12.8, dir.z * mix(20.6, 11.5, t));
    return vec3(dir.x * mix(10.4, 12.5, t), 0.8 + t * (1.0 - t) * 20.0, dir.z * mix(10.4, 12.5, t));
  }`;

const FX_UNIFORMS = () => ({
  uTime: { value: 0 },
  uNight: { value: 0 },
  uDay: { value: new Color('#fff1e0') },
  uLit: { value: new Color('#a58bff') },
});

/** Each jet as a thin tube along its arc; the shader runs pulses of water down it and lets it break up at the end. */
function fountainJets(count: number): Mesh {
  const SEG = 28;
  const RAD = 5;
  const all = [...Array.from({ length: count }, (_, j) => [(j / count) * Math.PI * 2, 0]), ...Array.from({ length: 32 }, (_, j) => [((j + 0.5) / 32) * Math.PI * 2, 1])];
  const verts = all.length * (SEG + 1) * (RAD + 1);
  const pos = new Float32Array(verts * 3);
  const jet = new Float32Array(verts * 4); // dir.x, dir.z, kind, seed
  const tr = new Float32Array(verts * 2); // t along, angle round
  const idx: number[] = [];
  let v = 0;
  all.forEach(([a, kind], j) => {
    const seed = (j * 0.618) % 1;
    for (let i = 0; i <= SEG; i++) {
      for (let k = 0; k <= RAD; k++, v++) {
        jet.set([Math.cos(a), Math.sin(a), kind, seed], v * 4);
        tr.set([(i / SEG) * 1.04, (k / RAD) * Math.PI * 2], v * 2);
        if (i < SEG && k < RAD) {
          const b = v;
          const n = RAD + 1;
          idx.push(b, b + n, b + 1, b + 1, b + n, b + n + 1);
        }
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aJet', new BufferAttribute(jet, 4));
  g.setAttribute('aTR', new BufferAttribute(tr, 2));
  g.setIndex(idx);
  const mat = new ShaderMaterial({
    uniforms: FX_UNIFORMS(),
    vertexShader: /* glsl */ `
      attribute vec4 aJet;
      attribute vec2 aTR;
      uniform float uTime;
      varying float vT, vSeed, vEdge;
      ${ARC}
      void main() {
        vec3 dir = vec3(aJet.x, 0.0, aJet.y);
        float t = aTR.x;
        vec3 p = arcPoint(dir, aJet.z, t);
        vec3 tan = normalize(arcPoint(dir, aJet.z, t + 0.01) - p);
        vec3 side = normalize(cross(tan, vec3(0.0, 1.0, 0.0)) + 1e-4);
        vec3 up = cross(side, tan);
        // the stream thickens and wobbles a little as it falls
        float r = (aJet.z < 0.5 ? 0.09 : 0.12) * (1.0 + t * 1.3);
        p += (side * cos(aTR.y) + up * sin(aTR.y)) * r;
        p += side * sin(uTime * 7.0 + aJet.w * 40.0 + t * 9.0) * 0.06 * t;
        vT = t;
        vSeed = aJet.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 n = normalize(normalMatrix * (side * cos(aTR.y) + up * sin(aTR.y)));
        vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uNight;
      uniform vec3 uDay, uLit;
      varying float vT, vSeed, vEdge;
      ${NOISE}
      void main() {
        float flow = noise2(vec2(vT * 22.0 - uTime * 9.0, vSeed * 50.0));
        float pulse = 0.55 + 0.45 * flow;
        // clear in the middle, bright at the silhouette, like a glass rod
        float body = 0.18 + 0.7 * pow(clamp(vEdge, 0.0, 1.0), 1.6);
        float a = body * pulse * smoothstep(0.0, 0.04, vT);
        // the stream breaks into drops before it lands
        a *= 1.0 - smoothstep(0.72, 1.02, vT) * (1.0 - step(0.55, flow));
        a *= 1.0 - smoothstep(0.98, 1.04, vT);
        vec3 col = mix(uDay, uLit * 1.7, uNight) * (0.9 + 0.5 * flow);
        gl_FragColor = vec4(col, a * 0.75);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const m = new Mesh(g, mat);
  m.frustumCulled = false;
  return m;
}

/** Mist around each stream and splashes leaping where it lands, as soft points. */
function fountainSpray(count: number, per: number): Points {
  const jetsN = count + 32;
  const n = jetsN * per * 2;
  const dir = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4); // phase, kind, role (0 spray, 1 splash), random
  let k = 0;
  const rnd = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let j = 0; j < jetsN; j++) {
    const kind = j < count ? 0 : 1;
    const a = kind === 0 ? (j / count) * Math.PI * 2 : ((j - count + 0.5) / 32) * Math.PI * 2;
    for (let role = 0; role < 2; role++) {
      for (let i = 0; i < per; i++, k++) {
        dir.set([Math.cos(a), 0, Math.sin(a)], k * 3);
        seed.set([rnd(k), kind, role, rnd(k + 9999)], k * 4);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(dir, 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 4));
  const mat = new ShaderMaterial({
    uniforms: FX_UNIFORMS(),
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      varying float vA;
      ${ARC}
      void main() {
        vec3 dir = position;
        float r1 = aSeed.w;
        float r2 = fract(r1 * 7.13 + aSeed.x * 3.7);
        float r3 = fract(r1 * 13.7 + 0.31);
        vec3 side = vec3(-dir.z, 0.0, dir.x);
        vec3 p;
        float size;
        if (aSeed.z < 0.5) {
          // spray: drops travelling with the stream, drifting off it the further they fall
          float t = fract(aSeed.x + uTime * 0.55);
          p = arcPoint(dir, aSeed.y, t);
          float drift = t * t * 0.9;
          p += side * (r2 - 0.5) * drift + vec3(0.0, (r3 - 0.5) * drift, 0.0) + dir * (r1 - 0.5) * drift;
          vA = smoothstep(0.25, 0.7, t) * (1.0 - smoothstep(0.9, 1.0, t)) * 0.55;
          size = 0.5 + r2 * 0.6;
        } else {
          // splash: short hops thrown up and out from the landing point
          float t = fract(aSeed.x + uTime * 1.6);
          vec3 land = arcPoint(dir, aSeed.y, 1.0);
          float ang = r1 * 6.2832;
          vec3 fling = (dir * cos(ang) + side * sin(ang)) * (0.4 + r2 * 0.9);
          p = land + fling * t;
          p.y = land.y - 0.35 + t * (1.0 - t) * 4.0 * (0.25 + r3 * (aSeed.y < 0.5 ? 0.7 : 1.1));
          vA = (1.0 - t) * 0.7;
          size = 0.6 + r3 * 0.6;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * 300.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      uniform vec3 uDay, uLit;
      varying float vA;
      void main() {
        float a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
        vec3 col = mix(uDay, uLit * 1.6, uNight);
        gl_FragColor = vec4(col, a * vA);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const p = new Points(g, mat);
  p.frustumCulled = false;
  return p;
}

/** Whitewater and spreading rings on the basin surface where the jets come down, and a lip of foam at the rim. */
function fountainFoam(): Mesh {
  const geo = new RingGeometry(9.9, 21.05, 192, 6);
  geo.rotateX(-Math.PI / 2);
  const mat = new ShaderMaterial({
    uniforms: FX_UNIFORMS(),
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uNight;
      uniform vec3 uDay, uLit;
      varying vec2 vP;
      ${NOISE}
      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        vec2 q = vec2(ang * 30.0, r * 1.6);
        float churn = noise2(q + vec2(uTime * 0.7, -uTime * 1.3)) * 0.6 + noise2(q * 2.3 - uTime * 1.9) * 0.4;
        // the landing band of the rim jets (r ≈ 11.5) and of the crown jets (r ≈ 12.5)
        // (squares written out: pow() with a negative base is undefined in GLSL and can return NaN)
        float b1 = (r - 11.7) / 0.9;
        float b2 = (r - 12.6) / 0.6;
        float band = exp(-b1 * b1) + 0.8 * exp(-b2 * b2);
        float foam = smoothstep(0.45, 0.8, churn) * band;
        // rings spreading outward from the landing band
        float d = r - 12.0;
        float rings = (0.5 + 0.5 * sin(d * 3.2 - uTime * 3.4)) * exp(-abs(d) * 0.28) * smoothstep(0.0, 1.5, abs(d));
        rings *= 0.5 + 0.5 * noise2(vec2(ang * 12.0, r * 0.4 - uTime * 0.6));
        // a thin lip of foam against the rim where the arcs leave
        float lip = smoothstep(19.9, 20.9, r) * smoothstep(0.5, 0.75, noise2(vec2(ang * 60.0, uTime * 1.5)));
        float a = clamp(foam * 0.85 + rings * 0.16 + lip * 0.35, 0.0, 1.0);
        vec3 col = mix(uDay, uLit * 1.5, uNight);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const m = new Mesh(geo, mat);
  m.position.y = 2.22;
  m.renderOrder = 1;
  return m;
}
