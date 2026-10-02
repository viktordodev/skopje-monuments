import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { NOISE } from './glsl';
import { RIVER_HALF, WATER_Y, riverX } from './land';
import type { Palette } from './palette';

/**
 * The Vardar as a long mirror running toward the sun: it reflects the rays, the sky and the monuments,
 * rippled and streaked with a glitter path under the sun.
 */
const SHARED_UNIFORMS = () => ({
  uTime: { value: 0 },
  uTint: { value: new Color() },
  uSun: { value: new Color() },
  uSunDir: { value: new Vector3(0, 0, -1) },
  uFog: { value: new Color() },
  uFogNear: { value: 100 },
  uFogFar: { value: 2000 },
  uHorizon: { value: new Color() },
  uTop: { value: new Color() },
});

const VERT = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = textureMatrix * vec4(position, 1.0);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = (reflect: boolean, pool = false) => /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 color;
  uniform float uTime, uFogNear, uFogFar;
  uniform vec3 uTint, uSun, uSunDir, uFog, uHorizon, uTop;
  varying vec4 vUv;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;
    // two layers of drifting ripples; the river flows toward the viewer
    float n1 = noise2(p * vec2(0.09, 0.03) + vec2(0.0, t * 0.25));
    float n2 = noise2(p * vec2(0.21, 0.08) + vec2(t * 0.05, t * 0.5));
    float n3 = noise2(p * vec2(0.6, 0.25) + vec2(0.0, t * 0.9));
    vec2 nrm = vec2(n1 - 0.5, n2 - 0.5) * 0.8 + (n3 - 0.5) * 0.35;
    ${
      pool
        ? `// basins are small: add short, quick chop so the surface reads as water at close range
           float c1 = noise2(p * 1.3 + vec2(t * 0.9, -t * 0.7));
           float c2 = noise2(p * 2.9 - vec2(t * 1.4, t * 1.1));
           nrm = nrm * 0.4 + vec2(c1 - 0.5, c2 - 0.5) * 0.7;`
        : ''
    }
    vec3 N = normalize(vec3(nrm.x * 0.35, 1.0, nrm.y * 0.35));
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.25 + 0.75 * pow(1.0 - max(dot(N, V), 0.0), 4.0);

    ${
      reflect
        ? `vec4 uv = vUv; uv.xy += nrm * 0.045 * uv.w; vec3 refl = texture2DProj(tDiffuse, uv).rgb;`
        : `vec3 R = reflect(-V, N); float rh = max(R.y, 0.0);
           vec3 refl = mix(uHorizon, uTop, smoothstep(0.0, 0.5, rh));
           refl += uSun * exp(-acos(clamp(dot(R, uSunDir), -1.0, 1.0)) * 5.0) * 1.2;`
    }
    vec3 col = mix(uTint * 0.12, refl * color, fres);

    // glitter path: sparkles where ripples mirror the sun
    vec3 R2 = reflect(-V, N);
    float s = max(dot(R2, normalize(uSunDir + vec3(0.0, 0.04, 0.0))), 0.0);
    float sparkle = pow(s, 90.0) * step(0.72, noise2(p * 0.9 + t * vec2(0.3, 1.4)));
    col += uSun * sparkle * ${pool ? '1.5' : '7.0'};

    // foam lines along the quay walls
    float edge = abs(vWorld.x - (sin(vWorld.z / 420.0) * 14.0 + sin(vWorld.z / 170.0 + 1.3) * 4.0));
    col += uTint * smoothstep(${(RIVER_HALF - 3).toFixed(1)}, ${(RIVER_HALF + 1).toFixed(1)}, edge) * 0.2 * n3;

    float d = length(cameraPosition - vWorld);
    col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
    gl_FragColor = vec4(col, 1.0);
  }`;

export class Water {
  readonly mesh: Mesh;
  private readonly uniforms: ReturnType<typeof SHARED_UNIFORMS>;
  private readonly reflector: Reflector | null;

  constructor(reflect: boolean, textureScale: number) {
    const L = 4000;
    const geo = new PlaneGeometry(RIVER_HALF * 2 + 16, L, 24, 400);
    // bend the strip along the river
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 1300; // plane-space y becomes world -z once the strip is laid flat
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + riverX(-y));
    }
    this.uniforms = SHARED_UNIFORMS();
    if (reflect) {
      const r = new Reflector(geo, {
        textureWidth: Math.round(innerWidth * textureScale),
        textureHeight: Math.round(innerHeight * textureScale),
        clipBias: 0.003,
        multisample: 0,
        shader: {
          name: 'VardarWater',
          uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
          vertexShader: VERT,
          fragmentShader: FRAG(true),
        },
      });
      Object.assign((r.material as ShaderMaterial).uniforms, this.uniforms);
      (r.material as ShaderMaterial).uniforms.color.value = new Color(0.95, 0.9, 0.92);
      this.reflector = r;
      this.mesh = r;
    } else {
      this.reflector = null;
      this.mesh = new Mesh(geo, this.poolMaterial(false));
    }
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = WATER_Y;
    this.mesh.frustumCulled = false;
  }

  /** A small, non-reflective pool (fountain basins) sharing the river's animated uniforms. */
  poolMaterial(chop = true): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: { ...this.uniforms, color: { value: new Color(1, 1, 1) }, tDiffuse: { value: null }, textureMatrix: { value: null } },
      vertexShader: VERT.replace('vUv = textureMatrix * vec4(position, 1.0);', 'vUv = vec4(0.0);'),
      fragmentShader: FRAG(false, chop),
    });
  }

  setSize(w: number, h: number, scale: number) {
    this.reflector?.getRenderTarget().setSize(Math.round(w * scale), Math.round(h * scale));
  }

  update(p: Palette, time: number, sunDir: Vector3, fogNear: number, fogFar: number) {
    const u = this.uniforms;
    u.uTime.value = time;
    u.uTint.value.copy(p.water);
    u.uSun.value.copy(p.sun);
    u.uSunDir.value.copy(sunDir);
    u.uFog.value.copy(p.fog);
    u.uHorizon.value.copy(p.horizon);
    u.uTop.value.copy(p.skyTop);
    u.uFogNear.value = fogNear;
    u.uFogFar.value = fogFar;
  }
}
