import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  NormalBlending,
  Object3D,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { mulberry32 } from '../core/noise';
import { NOISE } from './glsl';
import type { Palette } from './palette';

/**
 * Everything that moves in the air: golden motes drifting through the light, banks of mist lying on
 * the valley floor, and flocks of swifts wheeling against the rays.
 */
export class Atmosphere {
  readonly group = new Group();
  private readonly motes: Points;
  private readonly moteMat: ShaderMaterial;
  private readonly mistMat: ShaderMaterial;
  private readonly birdMat: ShaderMaterial;

  constructor(high: boolean, pathZ: [number, number]) {
    // --- motes: a box of particles that wraps around the camera
    const N = high ? 2600 : 1200;
    const r = mulberry32(3);
    const pos = new Float32Array(N * 3);
    const rnd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos.set([r(), r(), r()], i * 3);
      rnd[i] = r();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new BufferAttribute(rnd, 1));
    this.moteMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new Vector3() },
        uBox: { value: new Vector3(260, 90, 260) },
        uColor: { value: new Color() },
        uSunDir: { value: new Vector3(0, 0, -1) },
        uPx: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aRnd;
        uniform float uTime, uPx;
        uniform vec3 uCam, uBox, uSunDir;
        varying float vA;
        void main() {
          vec3 drift = vec3(sin(uTime * 0.05 + aRnd * 30.0) * 6.0, uTime * (0.6 + aRnd * 1.4), -uTime * (1.0 + aRnd * 2.0));
          vec3 p = position * uBox + drift;
          // wrap around the camera so the cloud of motes never runs out
          p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
          p.y = mod(p.y - 1.0, uBox.y) + 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vec3 toCam = normalize(uCam - p);
          // motes glint when they sit between the camera and the sun
          float back = pow(max(dot(-toCam, uSunDir), 0.0), 3.0);
          float tw = 0.55 + 0.45 * sin(uTime * (1.0 + aRnd * 3.0) + aRnd * 50.0);
          vA = tw * smoothstep(2.0, 14.0, dist) * (1.0 - smoothstep(90.0, 150.0, dist)) * (0.35 + back * 1.4);
          gl_PointSize = uPx * (0.6 + aRnd * 1.6) * 160.0 / dist;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(uColor * a * vA, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.motes = new Points(g, this.moteMat);
    this.motes.frustumCulled = false;
    this.group.add(this.motes);

    // --- mist banks along the river
    this.mistMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new Color() }, uGlow: { value: new Color() }, uOpacity: { value: 0.5 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vW;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity;
        uniform vec3 uColor, uGlow;
        varying vec2 vUv;
        varying vec3 vW;
        ${NOISE}
        void main() {
          vec2 p = vW.xz * 0.012 + vec2(uTime * 0.012, uTime * 0.004);
          float n = fbm2(p) * 0.7 + fbm2(p * 2.7 - uTime * 0.01) * 0.3;
          float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float a = smoothstep(0.35, 0.85, n) * edge * uOpacity;
          float d = length(cameraPosition - vW);
          a *= smoothstep(8.0, 60.0, d);
          gl_FragColor = vec4(mix(uColor, uGlow, n * 0.6), a);
        }`,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: NormalBlending,
    });
    const mistGeo = new PlaneGeometry(1, 1);
    mistGeo.rotateX(-Math.PI / 2);
    for (let z = pathZ[0]; z > pathZ[1]; z -= 90) {
      for (let k = 0; k < 2; k++) {
        const m = new Mesh(mistGeo, this.mistMat);
        m.scale.set(360 + r() * 200, 1, 160 + r() * 60);
        m.position.set((r() - 0.5) * 140, 1.5 + k * 5 + r() * 3, z + r() * 40);
        m.renderOrder = 5;
        this.group.add(m);
      }
    }

    // --- swifts: V-shaped wings flapping in the vertex shader, wheeling in loose circles
    const B = high ? 90 : 50;
    const wing = new BufferGeometry();
    wing.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0.35, -1, 0, -0.2, 0, 0, -0.5, 0, 0, 0.35, 1, 0, -0.2, 0, 0, -0.5]), 3));
    const ph = new Float32Array(B);
    for (let i = 0; i < B; i++) ph[i] = r() * 100;
    this.birdMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new Color() } },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        uniform float uTime;
        void main() {
          vec3 p = position;
          float flap = sin(uTime * (7.0 + fract(aPhase) * 4.0) + aPhase) * 0.9;
          p.y += abs(p.x) * flap;
          vec4 w = instanceMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        void main() { gl_FragColor = vec4(uColor, 1.0); }`,
      side: DoubleSide,
    });
    const birds = new InstancedMesh(wing, this.birdMat, B);
    birds.geometry.setAttribute('aPhase', new InstancedBufferAttribute(ph, 1));
    birds.frustumCulled = false;
    this.birds = birds;
    this.flock = Array.from({ length: B }, (_, i) => ({
      c: i % 3,
      r: 18 + r() * 60,
      h: 60 + r() * 70,
      sp: (0.12 + r() * 0.12) * (r() < 0.5 ? 1 : -1),
      a: r() * Math.PI * 2,
      wob: r() * 10,
      s: 1.1 + r() * 0.7,
    }));
    this.group.add(birds);
  }

  private readonly birds: InstancedMesh;
  private readonly flock: { c: number; r: number; h: number; sp: number; a: number; wob: number; s: number }[];
  private readonly o = new Object3D();

  update(p: Palette, time: number, cam: Vector3, sunDir: Vector3, focus: Vector3, pixelRatio: number) {
    const mu = this.moteMat.uniforms;
    mu.uTime.value = time;
    mu.uCam.value.copy(cam);
    mu.uColor.value.copy(p.rays).lerp(p.sun, 0.4).multiplyScalar(1.3);
    mu.uSunDir.value.copy(sunDir);
    mu.uPx.value = pixelRatio;

    const mi = this.mistMat.uniforms;
    mi.uTime.value = time;
    mi.uColor.value.copy(p.fog).lerp(p.horizon, 0.3);
    mi.uGlow.value.copy(p.horizon).lerp(p.sun, 0.3);
    mi.uOpacity.value = 0.42 + p.night * 0.1;

    this.birdMat.uniforms.uTime.value = time;
    this.birdMat.uniforms.uColor.value.copy(p.ridge).multiplyScalar(0.35);
    // three flocks orbit points ahead of the current view
    const o = this.o;
    this.flock.forEach((b, i) => {
      const centre = [-60, 20, 70][b.c];
      const a = b.a + time * b.sp;
      const x = focus.x + centre + Math.cos(a) * b.r;
      const z = focus.z - 140 - b.c * 60 + Math.sin(a) * b.r * 0.6;
      const y = b.h + Math.sin(time * 0.4 + b.wob) * 6;
      o.position.set(x, y, z);
      o.rotation.set(0, -a + (b.sp > 0 ? Math.PI : 0), Math.sin(time + b.wob) * 0.3);
      o.scale.setScalar(b.s);
      o.updateMatrix();
      this.birds.setMatrixAt(i, o.matrix);
    });
    this.birds.instanceMatrix.needsUpdate = true;
  }
}
