import { Color, MathUtils } from 'three';

/**
 * One endless sunset, retinted per chapter: rose-gold dawn over the square, burning gold on the
 * bazaar, flag-red over the fortress, violet dusk at the station, and night with the cross alight.
 */
export interface Palette {
  skyTop: Color;
  skyMid: Color;
  horizon: Color;
  sun: Color;
  rays: Color;
  fog: Color;
  ridge: Color;
  ground: Color;
  water: Color;
  light: Color;
  fill: Color;
  hemiSky: Color;
  hemiGround: Color;
  rim: Color;
  lightIntensity: number;
  fillIntensity: number;
  hemiIntensity: number;
  rimStrength: number;
  rayStrength: number;
  stars: number;
  night: number;
  exposure: number;
  /** Sun centre elevation in radians (negative = below the horizon). */
  sunElevation: number;
}

type Key = { [K in keyof Palette]: Palette[K] extends Color ? string : number };

const KEYS: Key[] = [
  // 0 · hero: rose-gold dawn
  {
    skyTop: '#1d1640', skyMid: '#7a3d6e', horizon: '#ff8f4a', sun: '#fff0c4', rays: '#ffc27a', fog: '#b9637a',
    ridge: '#4a2446', ground: '#3a2130', water: '#ffb48a', light: '#ffb27a', fill: '#8f7cff', hemiSky: '#a58ad8',
    hemiGround: '#5a2d2a', rim: '#ffb46a', lightIntensity: 3.2, fillIntensity: 0.55, hemiIntensity: 1.1,
    rimStrength: 1.3, rayStrength: 1.0, stars: 0.25, night: 0, exposure: 1.0, sunElevation: -0.012,
  },
  // 1 · warrior: gold
  {
    skyTop: '#241a4a', skyMid: '#8d4672', horizon: '#ff9a4c', sun: '#fff3cc', rays: '#ffcb82', fog: '#c46e70',
    ridge: '#522848', ground: '#40242c', water: '#ffbe8e', light: '#ffbd80', fill: '#8a7cf0', hemiSky: '#b394d6',
    hemiGround: '#63322a', rim: '#ffc070', lightIntensity: 3.4, fillIntensity: 0.55, hemiIntensity: 1.15,
    rimStrength: 1.35, rayStrength: 1.05, stars: 0.12, night: 0, exposure: 1.0, sunElevation: -0.008,
  },
  // 2 · porta: pale gold
  {
    skyTop: '#2a2356', skyMid: '#a0527a', horizon: '#ffab5c', sun: '#fff6d6', rays: '#ffd592', fog: '#cf7f76',
    ridge: '#5a2e4a', ground: '#45282c', water: '#ffc898', light: '#ffc98e', fill: '#8f86ea', hemiSky: '#bca0d8',
    hemiGround: '#6a3a2c', rim: '#ffcc80', lightIntensity: 3.5, fillIntensity: 0.55, hemiIntensity: 1.2,
    rimStrength: 1.3, rayStrength: 1.1, stars: 0.05, night: 0, exposure: 1.0, sunElevation: -0.004,
  },
  // 3 · stone bridge: amber
  {
    skyTop: '#2b1f50', skyMid: '#a44e6c', horizon: '#ff9848', sun: '#fff0c0', rays: '#ffc070', fog: '#c96a66',
    ridge: '#56283e', ground: '#43252a', water: '#ffb070', light: '#ffb070', fill: '#8a7ae0', hemiSky: '#b491cc',
    hemiGround: '#683528', rim: '#ffb860', lightIntensity: 3.5, fillIntensity: 0.5, hemiIntensity: 1.15,
    rimStrength: 1.4, rayStrength: 1.15, stars: 0.05, night: 0, exposure: 1.0, sunElevation: -0.006,
  },
  // 4 · clock tower: burning gold
  {
    skyTop: '#2a1a48', skyMid: '#b04a5e', horizon: '#ff8a3a', sun: '#ffe8a8', rays: '#ffb460', fog: '#c65d58',
    ridge: '#562436', ground: '#432226', water: '#ffa060', light: '#ffa860', fill: '#8472d8', hemiSky: '#ae86c2',
    hemiGround: '#6a3024', rim: '#ffaa50', lightIntensity: 3.4, fillIntensity: 0.5, hemiIntensity: 1.1,
    rimStrength: 1.45, rayStrength: 1.2, stars: 0.05, night: 0, exposure: 1.0, sunElevation: -0.01,
  },
  // 5 · kuršumli an: orange
  {
    skyTop: '#28183f', skyMid: '#b2444f', horizon: '#ff7a30', sun: '#ffe09a', rays: '#ffa050', fog: '#c0524e',
    ridge: '#52202e', ground: '#402022', water: '#ff9050', light: '#ff9850', fill: '#7e68cc', hemiSky: '#a67cb6',
    hemiGround: '#662a20', rim: '#ff9a44', lightIntensity: 3.2, fillIntensity: 0.5, hemiIntensity: 1.05,
    rimStrength: 1.5, rayStrength: 1.25, stars: 0.06, night: 0.05, exposure: 1.0, sunElevation: -0.014,
  },
  // 6 · kale: flag red
  {
    skyTop: '#240f33', skyMid: '#a82c3e', horizon: '#ff5a26', sun: '#ffd27a', rays: '#ff8a3c', fog: '#b23e42',
    ridge: '#4a1628', ground: '#3a1a1e', water: '#ff7040', light: '#ff8040', fill: '#7460c0', hemiSky: '#9c6aa8',
    hemiGround: '#5e221c', rim: '#ff8a3a', lightIntensity: 3.0, fillIntensity: 0.5, hemiIntensity: 1.0,
    rimStrength: 1.6, rayStrength: 1.3, stars: 0.1, night: 0.1, exposure: 1.02, sunElevation: -0.02,
  },
  // 7 · mother teresa: rose dusk
  {
    skyTop: '#1c1036', skyMid: '#8e2f5a', horizon: '#f2524a', sun: '#ffc27a', rays: '#ff7a5a', fog: '#8e3a52',
    ridge: '#3c1430', ground: '#30161e', water: '#f06a5a', light: '#ff7050', fill: '#6c5ac0', hemiSky: '#8a62a8',
    hemiGround: '#4a1c20', rim: '#ff7a50', lightIntensity: 2.4, fillIntensity: 0.55, hemiIntensity: 0.95,
    rimStrength: 1.55, rayStrength: 1.2, stars: 0.25, night: 0.3, exposure: 1.05, sunElevation: -0.03,
  },
  // 8 · old station: violet dusk
  {
    skyTop: '#120c30', skyMid: '#5a2a66', horizon: '#c8465a', sun: '#ffab80', rays: '#d8607a', fog: '#5e2e54',
    ridge: '#2a1030', ground: '#22121e', water: '#c05a70', light: '#e0606a', fill: '#5a50b8', hemiSky: '#6c56a0',
    hemiGround: '#381824', rim: '#e06a70', lightIntensity: 1.6, fillIntensity: 0.6, hemiIntensity: 0.85,
    rimStrength: 1.4, rayStrength: 1.05, stars: 0.55, night: 0.6, exposure: 1.1, sunElevation: -0.045,
  },
  // 9 · millennium cross: night
  {
    skyTop: '#060a22', skyMid: '#1e1a4a', horizon: '#5a2a62', sun: '#e08ab0', rays: '#8a6ad0', fog: '#2a1c46',
    ridge: '#120c26', ground: '#110c1c', water: '#6a4a9a', light: '#8a7ad8', fill: '#4a4aa8', hemiSky: '#4a4a90',
    hemiGround: '#1c1228', rim: '#a08ae8', lightIntensity: 0.7, fillIntensity: 0.55, hemiIntensity: 0.7,
    rimStrength: 1.1, rayStrength: 0.6, stars: 1, night: 1, exposure: 1.15, sunElevation: -0.07,
  },
  // 10 · outro: deep night
  {
    skyTop: '#040716', skyMid: '#141438', horizon: '#3c2250', sun: '#c07aa8', rays: '#6a58b8', fog: '#1e1636',
    ridge: '#0c0a1c', ground: '#0c0a16', water: '#4a3a80', light: '#7a70c8', fill: '#3c3c96', hemiSky: '#3a3a80',
    hemiGround: '#140e20', rim: '#8a7ad8', lightIntensity: 0.5, fillIntensity: 0.5, hemiIntensity: 0.6,
    rimStrength: 1.0, rayStrength: 0.45, stars: 1, night: 1, exposure: 1.15, sunElevation: -0.08,
  },
];

function toPalette(k: Key): Palette {
  const p = {} as Record<string, Color | number>;
  for (const [name, v] of Object.entries(k)) p[name] = typeof v === 'string' ? new Color(v) : v;
  return p as unknown as Palette;
}

const PALETTES = KEYS.map(toPalette);

export function createPalette(): Palette {
  return toPalette(KEYS[0]);
}

/** Blends the keyframes for a continuous station coordinate into `out`. */
export function samplePalette(u: number, out: Palette): Palette {
  const i = MathUtils.clamp(Math.floor(u), 0, PALETTES.length - 2);
  const f = MathUtils.smootherstep(MathUtils.clamp(u - i, 0, 1), 0, 1);
  const a = PALETTES[i] as unknown as Record<string, Color | number>;
  const b = PALETTES[i + 1] as unknown as Record<string, Color | number>;
  const o = out as unknown as Record<string, Color | number>;
  for (const key of Object.keys(a)) {
    const va = a[key];
    const vb = b[key];
    if (va instanceof Color) (o[key] as Color).copy(va).lerp(vb as Color, f);
    else o[key] = MathUtils.lerp(va, vb as number, f);
  }
  return out;
}
