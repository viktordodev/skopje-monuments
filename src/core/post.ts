import {
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type PerspectiveCamera,
  type WebGLRenderer,
} from 'three';

/**
 * The frame is rendered in HDR, then:
 *  1. god rays — the bright sky is smeared radially from the sun, so beams stream out between the
 *     monuments and are cut by their silhouettes;
 *  2. bloom — a four-level blur of everything brighter than paper white;
 *  3. composite — chromatic fringe, ACES tone curve, split-tone grade, vignette, grain, fade.
 */
const QUAD_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export interface PostSettings {
  bloom: number;
  rays: number;
  rayColor: Color;
  exposure: number;
  shadowTint: Color;
  fade: number;
  grain: number;
}

export class Post {
  private readonly scene: WebGLRenderTarget;
  private readonly rayA: WebGLRenderTarget;
  private readonly rayB: WebGLRenderTarget;
  private readonly levels: { a: WebGLRenderTarget; b: WebGLRenderTarget }[] = [];
  private readonly quad: Mesh;
  private readonly qScene = new Scene();
  private readonly cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly bright: ShaderMaterial;
  private readonly blur: ShaderMaterial;
  private readonly radial: ShaderMaterial;
  private readonly mask: ShaderMaterial;
  private readonly comp: ShaderMaterial;
  private readonly copy: ShaderMaterial;
  private readonly sunUv = new Vector2();
  private readonly v = new Vector3();
  private sunVisible = 0;

  constructor(private readonly renderer: WebGLRenderer, samples: number) {
    const O = { minFilter: LinearFilter, magFilter: LinearFilter, type: HalfFloatType, depthBuffer: false };
    this.scene = new WebGLRenderTarget(1, 1, { ...O, depthBuffer: true, samples });
    this.rayA = new WebGLRenderTarget(1, 1, O);
    this.rayB = new WebGLRenderTarget(1, 1, O);
    for (let i = 0; i < 4; i++) this.levels.push({ a: new WebGLRenderTarget(1, 1, O), b: new WebGLRenderTarget(1, 1, O) });
    this.quad = new Mesh(new PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qScene.add(this.quad);

    this.bright = new ShaderMaterial({
      uniforms: { tS: { value: null }, uThr: { value: 1.0 }, uKnee: { value: 0.6 } },
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tS; uniform float uThr, uKnee; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tS, vUv).rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor = vec4(c * smoothstep(uThr, uThr + uKnee, l), 1.0);
        }`,
    });
    this.blur = new ShaderMaterial({
      uniforms: { tS: { value: null }, uDir: { value: new Vector2() } },
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tS; uniform vec2 uDir; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tS, vUv).rgb * 0.2270270270;
          c += texture2D(tS, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
          c += texture2D(tS, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
          c += texture2D(tS, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
          c += texture2D(tS, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    // what may cast rays: bright sky near and above the horizon (monuments are dark, so they occlude)
    this.mask = new ShaderMaterial({
      uniforms: { tS: { value: null }, uSun: { value: this.sunUv }, uAspect: { value: 1 } },
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tS; uniform vec2 uSun; uniform float uAspect; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tS, vUv).rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
          float near = exp(-length(d) * 2.2);
          gl_FragColor = vec4(c * smoothstep(0.9, 3.0, l) * (0.2 + near), 1.0);
        }`,
    });
    this.radial = new ShaderMaterial({
      uniforms: { tS: { value: null }, uSun: { value: this.sunUv }, uLen: { value: 1 }, uDecay: { value: 0.965 } },
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tS; uniform vec2 uSun; uniform float uLen, uDecay; varying vec2 vUv;
        const int N = 48;
        void main() {
          vec2 delta = (vUv - uSun) * uLen / float(N);
          vec2 uv = vUv;
          float w = 1.0;
          vec3 sum = vec3(0.0);
          float norm = 0.0;
          // dither the start to hide banding
          float j = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
          uv -= delta * j;
          for (int i = 0; i < N; i++) {
            sum += texture2D(tS, uv).rgb * w;
            norm += w;
            w *= uDecay;
            uv -= delta;
          }
          gl_FragColor = vec4(sum / norm, 1.0);
        }`,
    });
    this.copy = new ShaderMaterial({
      uniforms: { tS: { value: null } },
      vertexShader: QUAD_VS,
      fragmentShader: 'uniform sampler2D tS; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb, 1.0); }',
    });
    this.comp = new ShaderMaterial({
      uniforms: {
        tS: { value: this.scene.texture },
        tR: { value: this.rayA.texture },
        tB0: { value: this.levels[0].a.texture },
        tB1: { value: this.levels[1].a.texture },
        tB2: { value: this.levels[2].a.texture },
        tB3: { value: this.levels[3].a.texture },
        uRes: { value: new Vector2() },
        uT: { value: 0 },
        uBloom: { value: 0.5 },
        uRays: { value: 1 },
        uRayColor: { value: new Color() },
        uExp: { value: 1 },
        uShadow: { value: new Color() },
        uFade: { value: 1 },
        uGrain: { value: 0.035 },
      },
      vertexShader: QUAD_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tS, tR, tB0, tB1, tB2, tB3;
        uniform vec2 uRes;
        uniform float uT, uBloom, uRays, uExp, uFade, uGrain;
        uniform vec3 uRayColor, uShadow;
        varying vec2 vUv;
        vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
        void main() {
          vec2 d = vUv - 0.5;
          float r2 = dot(d, d);
          float ca = (0.3 + r2 * 2.6) * 0.0016;
          vec3 c;
          c.r = texture2D(tS, vUv + d * ca).r;
          c.g = texture2D(tS, vUv).g;
          c.b = texture2D(tS, vUv - d * ca).b;
          vec3 bloom = texture2D(tB0, vUv).rgb * 0.5 + texture2D(tB1, vUv).rgb * 0.7 + texture2D(tB2, vUv).rgb * 0.9 + texture2D(tB3, vUv).rgb * 1.1;
          c += bloom * uBloom;
          vec3 rays = texture2D(tR, vUv).rgb;
          c += rays * uRayColor * uRays;
          c *= uExp;
          c = aces(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          // split tone: shadows lean toward the palette's dusk colour, highlights stay warm
          c = mix(c, c * uShadow * 1.6, smoothstep(0.45, 0.0, l) * 0.55);
          c = mix(c, c * vec3(1.05, 0.99, 0.94), smoothstep(0.5, 1.0, l) * 0.35);
          c = mix(vec3(l), c, 1.08);
          float v = smoothstep(1.25, 0.25, length(d * vec2(1.0, 0.92)) * 1.45);
          c *= mix(1.0, v, 0.85);
          vec3 p3 = fract(vec3(gl_FragCoord.xyx) * 0.1031 + fract(uT * 7.13));
          p3 += dot(p3, p3.yzx + 33.33);
          float g = fract((p3.x + p3.y) * p3.z);
          c += (g - 0.5) * uGrain;
          c *= uFade;
          vec3 e = pow(max(c, 0.0), vec3(1.0 / 2.2));
          gl_FragColor = vec4(e, 1.0);
        }`,
    });
  }

  setSize(w: number, h: number) {
    this.scene.setSize(w, h);
    const hw = Math.max(2, w >> 1);
    const hh = Math.max(2, h >> 1);
    this.rayA.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.rayB.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    let lw = hw;
    let lh = hh;
    for (const L of this.levels) {
      L.a.setSize(lw, lh);
      L.b.setSize(lw, lh);
      lw = Math.max(2, lw >> 1);
      lh = Math.max(2, lh >> 1);
    }
    this.comp.uniforms.uRes.value.set(w, h);
    this.mask.uniforms.uAspect.value = w / h;
  }

  get target() {
    return this.scene;
  }

  private pass(mat: ShaderMaterial, target: WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.qScene, this.cam);
  }

  /** Projects the sun into screen space; rays fade out when it leaves the frame or goes behind. */
  locateSun(camera: PerspectiveCamera, sunDir: Vector3) {
    this.v.copy(camera.position).addScaledVector(sunDir, 5000).project(camera as Camera);
    this.sunUv.set(this.v.x * 0.5 + 0.5, this.v.y * 0.5 + 0.5);
    const facing = camera.getWorldDirection(new Vector3()).dot(sunDir);
    const off = Math.max(Math.abs(this.v.x), Math.abs(this.v.y));
    this.sunVisible = Math.min(1, Math.max(0, (facing - 0.1) * 3)) * (1 - Math.min(1, Math.max(0, (off - 1.1) / 1.2)));
  }

  render(scene: Scene, camera: Camera, s: PostSettings, time: number) {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);

    // god rays at quarter resolution, two passes for long streaks
    this.mask.uniforms.tS.value = this.scene.texture;
    this.pass(this.mask, this.rayB);
    this.radial.uniforms.tS.value = this.rayB.texture;
    this.radial.uniforms.uLen.value = 0.9;
    this.radial.uniforms.uDecay.value = 0.975;
    this.pass(this.radial, this.rayA);
    this.radial.uniforms.tS.value = this.rayA.texture;
    this.radial.uniforms.uLen.value = 0.35;
    this.radial.uniforms.uDecay.value = 0.99;
    this.pass(this.radial, this.rayB);
    this.copy.uniforms.tS.value = this.rayB.texture;
    this.pass(this.copy, this.rayA);

    // bloom chain
    this.bright.uniforms.tS.value = this.scene.texture;
    this.pass(this.bright, this.levels[0].a);
    for (let i = 0; i < this.levels.length; i++) {
      const L = this.levels[i];
      if (i > 0) {
        this.copy.uniforms.tS.value = this.levels[i - 1].a.texture;
        this.pass(this.copy, L.a);
      }
      const w = L.a.width;
      const h = L.a.height;
      this.blur.uniforms.tS.value = L.a.texture;
      this.blur.uniforms.uDir.value.set(1 / w, 0);
      this.pass(this.blur, L.b);
      this.blur.uniforms.tS.value = L.b.texture;
      this.blur.uniforms.uDir.value.set(0, 1 / h);
      this.pass(this.blur, L.a);
    }

    const u = this.comp.uniforms;
    u.uT.value = time;
    u.uBloom.value = s.bloom;
    u.uRays.value = s.rays * this.sunVisible;
    u.uRayColor.value.copy(s.rayColor);
    u.uExp.value = s.exposure;
    u.uShadow.value.copy(s.shadowTint);
    u.uFade.value = s.fade;
    u.uGrain.value = s.grain;
    this.pass(this.comp, null);
  }
}
