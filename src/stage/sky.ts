import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { NOISE } from './glsl';
import type { Palette } from './palette';

/**
 * The sky dome. The sun sits just behind the horizon and throws a fan of enormous beams across the
 * whole sky: broad crepuscular rays with finer shafts inside them, eight of them slightly stronger
 * as a quiet nod to the flag. Rays drift and breathe; clouds are lit from below; stars come out
 * as the palette darkens.
 */
export const SUN_RADIUS = 0.075; // angular radius, radians: a sun far larger than life
const MOON_RADIUS = 0.024;
/** High in the night sky, well to the right of the Millennium Cross as the final shot sees it. */
const MOON_DIR = (() => {
  const el = 0.62;
  const az = 0.66;
  return new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));
})();

export class Sky {
  readonly mesh: Mesh;
  readonly sunDir = new Vector3(0, 0, -1);
  private readonly mat: ShaderMaterial;

  constructor() {
    this.mat = new ShaderMaterial({
      uniforms: {
        uTop: { value: new Color() },
        uMid: { value: new Color() },
        uHorizon: { value: new Color() },
        uSun: { value: new Color() },
        uRays: { value: new Color() },
        uFog: { value: new Color() },
        uSunDir: { value: this.sunDir },
        uTime: { value: 0 },
        uRayStrength: { value: 1 },
        uStars: { value: 0 },
        uSunR: { value: SUN_RADIUS },
        uMoonDir: { value: MOON_DIR },
        uMoonR: { value: MOON_RADIUS },
        uMoon: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uMid, uHorizon, uSun, uRays, uFog, uSunDir, uMoonDir;
        uniform float uTime, uRayStrength, uStars, uSunR, uMoonR, uMoon;
        varying vec3 vDir;
        ${NOISE}

        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          float hp = max(h, 0.0);
          vec3 sd = normalize(uSunDir);
          float cosA = dot(d, sd);
          float ang = acos(clamp(cosA, -1.0, 1.0));

          // base gradient, hotter along the horizon toward the sun
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, hp));
          col = mix(col, uTop, smoothstep(0.1, 0.6, hp));
          vec2 dh = normalize(d.xz + 1e-5);
          vec2 sh = normalize(sd.xz + 1e-5);
          float az = dot(dh, sh);
          col = mix(col, mix(uHorizon, uSun, 0.35), exp(-hp * 14.0) * smoothstep(-0.2, 1.0, az) * 0.75);

          // polar angle around the sun, measured in its tangent plane
          vec3 right = normalize(cross(sd, vec3(0.0, 1.0, 0.0)));
          vec3 up = normalize(cross(right, sd));
          float theta = atan(dot(d, up), dot(d, right));
          float t = uTime;

          float broad = noise1(theta * 9.0 + t * 0.035);
          float mid = noise1(theta * 23.0 - t * 0.05 + 11.0);
          float fine = noise1(theta * 61.0 + t * 0.08 + 37.0);
          float shafts = smoothstep(0.42, 0.92, broad * 0.62 + mid * 0.3 + fine * 0.12);
          float flag = pow(0.5 + 0.5 * cos(theta * 8.0 + sin(t * 0.07) * 0.03), 10.0);
          float breathe = 0.88 + 0.12 * sin(t * 0.35 + theta * 3.0);
          // subtle variation along each beam so they read as light through air, not paint
          float along = 0.72 + 0.28 * noise1(ang * 5.0 - t * 0.12 + floor(theta * 9.0) * 3.1);
          float rays = (shafts * 0.85 + flag * 0.45) * breathe * along;

          float reach = exp(-ang * 0.85) * 0.95 + 0.16;
          float above = smoothstep(-0.004, 0.03, h);
          float front = smoothstep(-0.35, 0.25, cosA);
          float rayMask = above * front * reach;
          // the dark lanes between beams are shadows of distant mountains
          col *= mix(1.0, 0.62 + 0.38 * shafts, above * front * exp(-ang * 0.5));
          col += uRays * rays * rayMask * uRayStrength * 0.62;

          // clouds: long strata lit from below
          vec2 cuv = d.xz / max(h + 0.06, 0.02);
          float cn = fbm2(cuv * vec2(0.35, 1.6) + vec2(t * 0.004, 0.0));
          float cloud = smoothstep(0.55, 0.78, cn) * smoothstep(0.015, 0.07, h) * (1.0 - smoothstep(0.18, 0.42, h));
          vec3 cloudCol = mix(uMid * 0.55, uSun * 1.2, exp(-ang * 2.2) * 0.9 + 0.15);
          col = mix(col, cloudCol, cloud * 0.62);

          // sun: glow and a huge soft disk
          float glow = exp(-ang * 3.2) * 0.42 + exp(-ang * 11.0) * 1.1 + exp(-ang * 40.0) * 2.0;
          col += uSun * glow * uRayStrength * smoothstep(-0.03, 0.02, h);
          float disk = smoothstep(uSunR, uSunR * 0.94, ang);
          col = mix(col, uSun * 7.0, disk * above);

          // stars
          if (uStars > 0.001) {
            vec3 p = d * 260.0;
            vec3 cell = floor(p);
            float rnd = hash21(cell.xy + cell.z * 17.13);
            vec3 fp = fract(p) - 0.5;
            float star = step(0.9965, rnd) * smoothstep(0.22, 0.0, length(fp));
            float tw = 0.6 + 0.4 * sin(t * (1.5 + rnd * 4.0) + rnd * 60.0);
            col += vec3(1.0, 0.95, 0.9) * star * tw * uStars * smoothstep(0.05, 0.35, h) * 2.2;
          }

          // a waxing three-quarter moon: lit from the right, the dark limb left open to the sky, 70% opaque
          if (uMoon > 0.001) {
            vec3 md = normalize(uMoonDir);
            float mang = acos(clamp(dot(d, md), -1.0, 1.0));
            if (mang < uMoonR * 6.0) {
              vec3 mr = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
              vec3 mu = cross(mr, md);
              vec2 q = vec2(dot(d, mr), dot(d, mu)) / uMoonR;
              float rr = length(q);
              vec3 n = vec3(q, sqrt(max(1.0 - rr * rr, 0.0)));
              // phase angle 60 degrees: (1 + cos 60) / 2 = three quarters of the face in sunlight
              float lit = smoothstep(-0.04, 0.1, dot(n, vec3(0.866, 0.0, 0.5)));
              float seas = smoothstep(0.45, 0.75, fbm2(q * 1.3 + vec2(3.7, 1.2)));
              vec3 moon = vec3(1.0, 0.96, 0.88) * (0.75 + 0.25 * n.z) * (1.0 - seas * 0.32);
              float disk = smoothstep(1.0, 0.96, rr);
              float halo = exp(-max(rr - 1.0, 0.0) * 1.6) * (1.0 - disk);
              col += vec3(0.85, 0.82, 0.95) * halo * 0.045 * uMoon;
              col = mix(col, moon * 0.9, disk * lit * uMoon * 0.7);
            }
          }

          // below the horizon the dome fades into the ground haze
          col = mix(col, uFog, smoothstep(0.0, -0.06, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new Mesh(new SphereGeometry(1, 64, 32), this.mat);
    this.mesh.scale.setScalar(9000);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
  }

  update(p: Palette, time: number, cameraPos: Vector3) {
    const u = this.mat.uniforms;
    u.uTop.value.copy(p.skyTop);
    u.uMid.value.copy(p.skyMid);
    u.uHorizon.value.copy(p.horizon);
    u.uSun.value.copy(p.sun);
    u.uRays.value.copy(p.rays);
    u.uFog.value.copy(p.fog);
    u.uTime.value = time;
    u.uRayStrength.value = p.rayStrength;
    u.uStars.value = p.stars;
    u.uMoon.value = Math.min(1, Math.max(0, (p.night - 0.35) / 0.5));
    const el = p.sunElevation;
    this.sunDir.set(0, Math.sin(el), -Math.cos(el)).normalize();
    this.mesh.position.copy(cameraPos);
  }
}
