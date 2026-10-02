import { Vector3 } from 'three';
import { WATER_Y, riverX } from './land';

/**
 * Where everything stands. This is a stage, not a map: the monuments line the Vardar in story order,
 * alternating banks, each one enlarged so it towers over the camera, all receding toward the sun.
 */
export interface Placement {
  id: string;
  pos: Vector3;
  rotY: number;
  scale: number;
  /** Radius of the flattened ground around it (0 = none). */
  plinth: number;
}

const bank = (z: number, off: number) => riverX(z) + off;

export const PLACEMENTS: Placement[] = [
  { id: 'warrior', pos: new Vector3(bank(0, -95), 1.5, 0), rotY: 0.2, scale: 2.3, plinth: 34 },
  { id: 'porta-macedonia', pos: new Vector3(bank(-260, 100), 1.5, -260), rotY: -0.35, scale: 2.4, plinth: 22 },
  { id: 'stone-bridge', pos: new Vector3(riverX(-470), WATER_Y - 3, -470), rotY: 0.04, scale: 1.25, plinth: 0 },
  { id: 'clock-tower', pos: new Vector3(bank(-680, -100), 1.5, -680), rotY: 0.3, scale: 2.1, plinth: 22 },
  { id: 'kursumli-an', pos: new Vector3(bank(-900, 125), 1.5, -900), rotY: 0.05, scale: 1.8, plinth: 58 },
  { id: 'kale', pos: new Vector3(bank(-1150, -230), 0, -1150), rotY: 0.5, scale: 1.45, plinth: 0 },
  { id: 'mother-teresa', pos: new Vector3(bank(-1380, 105), 1.5, -1380), rotY: -0.4, scale: 2.3, plinth: 24 },
  { id: 'old-station', pos: new Vector3(bank(-1580, -120), 1.5, -1580), rotY: 1.15, scale: 2.0, plinth: 34 },
  { id: 'millennium-cross', pos: new Vector3(360, 0, -2250), rotY: 0, scale: 1.3, plinth: 0 },
];

export interface Shot {
  pos: Vector3;
  look: Vector3;
  fov: number;
  /** Horizontal frame shift (fraction of width): + puts the subject right of centre, leaving room for text. */
  shift: number;
  /** Extra camera height (world units) at the middle of the leg to the next shot, to clear obstacles. */
  hop?: number;
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const P = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p.pos]));
const S = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p.scale]));
/** A point relative to a monument, in the monument's own (scaled) units, so shots survive rescaling. */
const rel = (id: string, x: number, y: number, z: number) => P[id].clone().add(v(x, y, z).multiplyScalar(S[id]));

/** Camera for each station: hero, nine chapters, epilogue. */
export const SHOTS: Shot[] = [
  { pos: rel('warrior', 25, 1, 60), look: rel('warrior', 10, 17, 0), fov: 44, shift: 0.12 },
  { pos: rel('warrior', 24, 1.5, 36), look: rel('warrior', 0, 20, -2), fov: 46, shift: 0.17 },
  { pos: rel('porta-macedonia', -18, 1.5, 36), look: rel('porta-macedonia', 1, 11, 0), fov: 46, shift: -0.17 },
  { pos: rel('stone-bridge', 14, 5, 95), look: rel('stone-bridge', -5, 9, 0), fov: 50, shift: 0.1, hop: 30 },
  { pos: rel('clock-tower', 24, 2.2, 42), look: rel('clock-tower', 0, 21, 0), fov: 46, shift: -0.17 },
  { pos: rel('kursumli-an', -15, 2.5, 54), look: rel('kursumli-an', 5, 10, 0), fov: 50, shift: 0.17 },
  { pos: rel('kale', 120, 14, 170), look: rel('kale', 5, 40, 0), fov: 44, shift: -0.16 },
  { pos: rel('mother-teresa', -26, 1.5, 40), look: rel('mother-teresa', 2, 11, 0), fov: 46, shift: 0.17 },
  { pos: rel('old-station', 38, 1.5, 34), look: rel('old-station', 2, 14, -4), fov: 46, shift: -0.17 },
  { pos: rel('millennium-cross', -95, 40, 250), look: rel('millennium-cross', 0, 165, 0), fov: 48, shift: 0.15 },
  { pos: rel('millennium-cross', -40, 50, 780), look: rel('millennium-cross', -10, 425, 0), fov: 52, shift: 0 },
];

/** The point each station's shadows and flocks are centred on. */
export const FOCUS: Vector3[] = [P['warrior'], ...PLACEMENTS.map((p) => p.pos), P['millennium-cross']];
