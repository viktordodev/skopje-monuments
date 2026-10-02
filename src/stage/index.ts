import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { Atmosphere } from './atmosphere';
import { Flora } from './flora';
import { createKit, setNight, type Kit } from './kit';
import { Land } from './land';
import { FOCUS, PLACEMENTS, SHOTS } from './layout';
import { RIM } from './materials';
import { buildBridge, BRIDGE_LENGTH } from './monuments/bridge';
import { buildClockTower } from './monuments/clockTower';
import { buildCross } from './monuments/cross';
import { buildKale } from './monuments/kale';
import { buildHan } from './monuments/han';
import { buildPorta } from './monuments/porta';
import { buildStation } from './monuments/station';
import { buildTeresa } from './monuments/teresa';
import type { BuildContext, Monument } from './monuments/types';
import { buildWarrior } from './monuments/warrior';
import { createPalette, samplePalette, type Palette } from './palette';
import { Sky } from './sky';
import { setMaxAnisotropy } from './textures';
import { Water } from './water';
import { Wordmark } from './wordmark';

export interface StageOptions {
  high: boolean;
  reflections: boolean;
  reflectionScale: number;
  shadowMapSize: number;
  anisotropy: number;
  word: string;
}

const BUILDERS: Record<string, (c: BuildContext) => Monument> = {
  warrior: buildWarrior,
  'porta-macedonia': buildPorta,
  'stone-bridge': buildBridge,
  'clock-tower': buildClockTower,
  'kursumli-an': buildHan,
  kale: buildKale,
  'mother-teresa': buildTeresa,
  'old-station': buildStation,
  'millennium-cross': buildCross,
};

const WHITE = new Color(1, 1, 1);
const FOG_NEAR = 260;
const FOG_FAR = 3600;
const PATH: [number, number] = [620, -2700];

export class Stage {
  readonly scene = new Scene();
  readonly palette: Palette = createPalette();
  readonly sky = new Sky();
  readonly land: Land;
  readonly water: Water;
  readonly atmosphere: Atmosphere;
  readonly flora: Flora;
  readonly wordmark: Wordmark;
  readonly kit: Kit;
  readonly monuments: Monument[] = [];
  private readonly sun: DirectionalLight;
  private readonly fill: DirectionalLight;
  private readonly hemi: HemisphereLight;
  private readonly fog: Fog;
  private readonly tmp = new Vector3();
  private readonly tint = new Color();

  private constructor(o: StageOptions, kit: Kit, land: Land, water: Water, atmosphere: Atmosphere, flora: Flora, wordmark: Wordmark) {
    this.kit = kit;
    this.land = land;
    this.water = water;
    this.atmosphere = atmosphere;
    this.flora = flora;
    this.wordmark = wordmark;
    this.fog = new Fog(0x000000, FOG_NEAR, FOG_FAR);
    this.scene.fog = this.fog;

    this.sun = new DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(o.shadowMapSize, o.shadowMapSize);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -150;
    sc.right = sc.top = 150;
    sc.near = 1;
    sc.far = 1400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.fill = new DirectionalLight(0xffffff, 0.5);
    this.hemi = new HemisphereLight(0xffffff, 0x000000, 1);
    this.scene.add(this.sun, this.sun.target, this.fill, this.fill.target, this.hemi);
  }

  static async create(o: StageOptions, progress: (p: number) => void): Promise<Stage> {
    setMaxAnisotropy(o.anisotropy);
    const tick = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    await document.fonts?.load(`400 100px 'Manrope Variable'`).catch(() => undefined);
    const kit = createKit();
    progress(0.08);
    await tick();

    const plinths = PLACEMENTS.filter((p) => p.plinth > 0).map((p) => ({ x: p.pos.x, z: p.pos.z, r: p.plinth * p.scale * 0.8, y: p.pos.y }));
    const land = new Land(plinths);
    const water = new Water(o.reflections, o.reflectionScale);
    progress(0.16);
    await tick();

    const ctx: BuildContext = { kit, pool: water.poolMaterial(), high: o.high };

    const monuments: Monument[] = [];
    for (let i = 0; i < PLACEMENTS.length; i++) {
      const p = PLACEMENTS[i];
      const m = BUILDERS[p.id](ctx);
      m.group.position.copy(p.pos);
      m.group.rotation.y = p.rotY;
      m.group.scale.setScalar(p.scale);
      monuments.push(m);
      progress(0.16 + ((i + 1) / PLACEMENTS.length) * 0.66);
      await tick();
    }

    const bridge = PLACEMENTS.find((p) => p.id === 'stone-bridge')!;
    const kale = PLACEMENTS.find((p) => p.id === 'kale')!;
    const cross = PLACEMENTS.find((p) => p.id === 'millennium-cross')!;
    // keep the view corridors clear: nothing grows between a camera and its monument
    const corridors = SHOTS.slice(0, -1).map((s, i) => ({ a: s.pos, b: FOCUS[i] }));
    const nearCorridor = (x: number, z: number, clear: number) => {
      for (const { a, b } of corridors) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
        if (d < clear * (0.6 + t * 0.4)) return true;
      }
      return false;
    };
    const blocked = (x: number, z: number, clear = 60) => {
      if (nearCorridor(x, z, clear)) return true;
      for (const p of PLACEMENTS) {
        if (p.plinth > 0 && Math.hypot(x - p.pos.x, z - p.pos.z) < p.plinth * p.scale + 8) return true;
      }
      if (Math.abs(z - bridge.pos.z) < 14 && Math.abs(x - bridge.pos.x) < BRIDGE_LENGTH / 2 + 10) return true;
      if (Math.hypot(x - kale.pos.x, z - kale.pos.z) < 118) return true;
      if (Math.hypot((x - cross.pos.x) / 2.2, (z - cross.pos.z) / 1.1) < 330) return true;
      return false;
    };
    const flora = new Flora(o.high, (x, z) => land.height(x, z), blocked, PATH, FOCUS.map((f) => ({ x: f.x, z: f.z })));
    progress(0.9);
    await tick();
    const atmosphere = new Atmosphere(o.high, PATH);
    // the wordmark stands in the valley straight ahead of the hero camera, high against the darker sky
    const wordmark = new Wordmark(o.word, 70);
    const hero = SHOTS[0];
    const ahead = hero.look.clone().sub(hero.pos).setY(0).normalize();
    wordmark.group.position.copy(hero.pos).addScaledVector(ahead, 520);
    wordmark.group.position.y = 70;
    wordmark.group.lookAt(hero.pos.x, 70, hero.pos.z);

    const stage = new Stage(o, kit, land, water, atmosphere, flora, wordmark);
    const s = stage.scene;
    s.add(stage.sky.mesh, land.ground, land.apron, ...land.ridges, water.mesh, flora.group, atmosphere.group, wordmark.group);
    for (const m of monuments) s.add(m.group);
    stage.monuments.push(...monuments);
    progress(1);
    return stage;
  }

  /**
   * @param u continuous station coordinate
   * @param intro 0→1 opening animation
   */
  update(u: number, time: number, camera: PerspectiveCamera, focus: Vector3, intro: number, pixelRatio: number) {
    const p = samplePalette(u, this.palette);
    this.sky.update(p, time, camera.position);
    this.land.update(p);
    this.fog.color.copy(p.fog);

    const sunDir = this.sky.sunDir;
    // the light that shades the monuments is lifted above the visible sun so faces still read
    const az = 0.42;
    const el = 0.3;
    this.tmp.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.sun.position.copy(focus).addScaledVector(this.tmp, 600);
    this.sun.target.position.copy(focus);
    this.sun.color.copy(p.light);
    this.sun.intensity = p.lightIntensity;
    this.fill.position.set(focus.x - 200, focus.y + 260, focus.z + 600);
    this.fill.target.position.copy(focus);
    this.fill.color.copy(p.fill).lerp(WHITE, 0.45);
    this.fill.intensity = p.fillIntensity;
    this.hemi.color.copy(p.hemiSky).lerp(WHITE, 0.3);
    this.hemi.groundColor.copy(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;

    RIM.uRimColor.value.copy(p.rim);
    RIM.uRimStrength.value = p.rimStrength;
    RIM.uSunView.value.copy(this.tmp).transformDirection(camera.matrixWorldInverse);

    setNight(this.kit, p.night);
    this.water.update(p, time, sunDir, FOG_NEAR, FOG_FAR);
    this.flora.update(p, time);
    this.atmosphere.update(p, time, camera.position, sunDir, focus, pixelRatio);
    for (const m of this.monuments) m.update?.(time, p.night);

    const leave = Math.min(1, Math.max(0, u * 1.25));
    this.wordmark.update(intro, leave, time, this.tint.copy(p.sun).lerp(WHITE, 0.55));
  }
}
