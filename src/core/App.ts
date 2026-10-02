import { Color, MathUtils, NoToneMapping, PCFSoftShadowMap, PerspectiveCamera, WebGLRenderer } from 'three';
import { listenTilt } from './tilt';
import { UI } from '../ui/ui';
import { Stage } from '../stage';
import { SHOTS } from '../stage/layout';
import { WATER_Y } from '../stage/land';
import { Post } from './post';
import { Rig } from './rig';
import { ScrollDirector } from './scroll';

interface Quality {
  high: boolean;
  pixelRatio: number;
  samples: number;
  reflections: boolean;
  reflectionScale: number;
  shadowMapSize: number;
  anisotropy: number;
  parallax: boolean;
}

function pickQuality(reduced: boolean): Quality {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const forced = new URLSearchParams(location.search).get('quality');
  const weak = forced ? forced === 'low' : coarse || innerWidth < 820 || (navigator.hardwareConcurrency ?? 8) <= 4;
  return {
    high: !weak,
    pixelRatio: Math.min(devicePixelRatio || 1, weak ? 1.5 : 1.75),
    samples: weak ? 0 : 4,
    reflections: true,
    reflectionScale: weak ? 0.3 : 0.5,
    shadowMapSize: weak ? 1024 : 2048,
    anisotropy: weak ? 4 : 8,
    parallax: !reduced,
  };
}

export async function start() {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = pickQuality(reduced);

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let pixelRatio = q.pixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const anisotropy = Math.min(q.anisotropy, renderer.capabilities.getMaxAnisotropy());

  const ui = new UI();
  const t0 = performance.now();
  const word = root.lang === 'mk' ? 'СКОПЈЕ' : 'SKOPJE';
  const stage = await Stage.create(
    { high: q.high, reflections: q.reflections, reflectionScale: q.reflectionScale, shadowMapSize: q.shadowMapSize, anisotropy, word },
    (p) => ui.progress(p),
  );
  if (import.meta.env.DEV) console.info(`[skopje] stage built in ${(performance.now() - t0).toFixed(0)}ms`);

  const camera = new PerspectiveCamera(45, 1, 1, 12000);
  const rig = new Rig(SHOTS, q.parallax, (x, z) => Math.max(stage.land.surfaceHeight(x, z), WATER_Y));
  const scroll = new ScrollDirector(reduced);
  ui.attach(scroll);
  const post = new Post(renderer, q.samples);
  // compile everything before the first visible frame to avoid hitches mid-scroll
  renderer.compile(stage.scene, camera);

  let portrait = 0;
  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    const bw = Math.floor(w * pixelRatio);
    const bh = Math.floor(h * pixelRatio);
    post.setSize(bw, bh);
    stage.water.setSize(w * pixelRatio, h * pixelRatio, q.reflectionScale);
    camera.aspect = w / h;
    portrait = MathUtils.clamp((1.35 - w / h) / 0.8, 0, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  // Resizing a canvas clears it, so size changes are applied at the start of a frame, right before it is
  // drawn; doing it after drawing leaves a blank canvas on screen for a frame (a black blink).
  let needsResize = false;
  addEventListener('resize', () => (needsResize = true));

  // the hand-held drift: the mouse on desktop, the phone's tilt on touch screens
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / innerHeight) * 2 - 1);
  });
  if (!reduced && matchMedia('(pointer: coarse)').matches) listenTilt(pointer);

  let uSmooth = scroll.station();
  let last = performance.now();
  let running = true;
  let firstFrame = true;
  let introStart = 0;
  let frames = 0;
  let avg = 16.7;
  let goodWindows = 0;
  // Highest pixel ratio not yet shown to be too slow; once a level drops frames it is never tried again,
  // so the resolution can't oscillate up and down.
  let ceiling = q.pixelRatio;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    last = performance.now();
  });

  const post_ = { bloom: 0.55, rays: 1, rayColor: new Color(), exposure: 1, shadowTint: new Color(), fade: 0, grain: 0.035 };

  // Dev-only inspection hooks: `__skopje.go(u)` pins the camera to a station coordinate;
  // `__skopje.capture(u, w, h)` renders one frame at that size and shows it as an overlay (click to close).
  let pinnedU: number | null = null;
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __skopje: {
        stage,
        camera,
        renderer,
        go(u?: number) {
          pinnedU = u ?? null;
        },
        capture(u: number, w = 1600, h = 900, view?: { pos: [number, number, number]; look: [number, number, number]; fov?: number }) {
          renderer.setPixelRatio(1);
          renderer.setSize(w, h, false);
          post.setSize(w, h);
          camera.aspect = w / h;
          const now = performance.now();
          rig.update(camera, u, { x: 0, y: 0 }, 1, 1, 0);
          camera.setViewOffset(w, h, view ? 0 : -rig.shift * w, 0, w, h);
          if (view) {
            camera.position.set(...view.pos);
            camera.lookAt(...view.look);
            camera.fov = view.fov ?? camera.fov;
            camera.updateProjectionMatrix();
          }
          camera.updateMatrixWorld();
          stage.update(u, now / 1000, camera, rig.focus, 1, 1);
          post.locateSun(camera, stage.sky.sunDir);
          post.render(stage.scene, camera, { ...post_, fade: 1 }, now / 1000);
          const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
          needsResize = true;
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:999';
          img.onclick = () => img.remove();
          document.body.appendChild(img);
          return url.length;
        },
      },
    });
  }

  const tick = (now: number) => {
    requestAnimationFrame(tick);
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    if (needsResize) {
      needsResize = false;
      resize();
    }

    const target = pinnedU ?? scroll.station();
    uSmooth += (target - uSmooth) * (reduced || pinnedU !== null ? 1 : 1 - Math.exp(-dt * 4));
    const intro = reduced ? 1 : MathUtils.clamp((now - introStart) / 3600, 0, 1);
    const introE = 1 - Math.pow(1 - intro, 3);

    rig.update(camera, uSmooth, pointer, dt, firstFrame ? 0 : introE, portrait);
    const w = innerWidth;
    const h = innerHeight;
    camera.setViewOffset(w, h, -rig.shift * w, portrait * h * 0.12, w, h);
    camera.updateMatrixWorld();

    stage.update(uSmooth, time, camera, rig.focus, firstFrame ? 0 : introE, pixelRatio);
    post.locateSun(camera, stage.sky.sunDir);
    const p = stage.palette;
    post_.bloom = MathUtils.lerp(0.32, 0.7, p.night);
    post_.rays = p.rayStrength * 0.55;
    post_.rayColor.copy(p.rays).lerp(p.sun, 0.35);
    post_.exposure = p.exposure;
    post_.shadowTint.copy(p.fill).lerp(p.hemiSky, 0.5);
    post_.fade = firstFrame ? 0 : MathUtils.clamp(intro * 2.2, 0, 1);
    post.render(stage.scene, camera, post_, time);

    ui.update(uSmooth);

    if (firstFrame) {
      firstFrame = false;
      introStart = performance.now();
      root.classList.add('ready');
      if (location.hash) scroll.scrollToHash(location.hash);
    }

    // Dynamic resolution: trade sharpness for a steady frame rate. Ignore the first seconds (shader
    // warm-up and the loader fade), step down when frames are slow, and only step back up after a long
    // run of smooth frames, never above a level that was already too slow.
    if (now - introStart < 3000) return;
    avg += (dt * 1000 - avg) * 0.05;
    if (++frames % 90 === 0) {
      if (avg > 23 && pixelRatio > 0.85) {
        ceiling = pixelRatio - 0.01;
        pixelRatio = Math.max(0.85, pixelRatio - 0.15);
        goodWindows = 0;
        avg = 16.7;
        needsResize = true;
      } else if (avg < 17.6) {
        // frame time is capped by vsync (16.7 ms at 60 Hz), so sitting at the cap means there is headroom
        if (++goodWindows >= 4 && pixelRatio + 0.15 <= ceiling) {
          pixelRatio += 0.15;
          goodWindows = 0;
          needsResize = true;
        }
      } else {
        goodWindows = 0;
      }
    }
  };
  requestAnimationFrame(tick);
}
