import type { BufferGeometry } from 'three';
import { Sculpt } from '../sculpt';

/**
 * Sculpted figures, at natural size in metres, facing +x with their feet at y = 0.
 * They are cast (meshed) once at load and reused.
 */

/** The rearing horse and its rider with a raised right arm (the sword is added separately). */
export function horseAndRider(cell: number): BufferGeometry {
  const s = new Sculpt(0.06);
  // --- horse, reared at about 40°
  s.ellipsoid([-0.74, 1.24, 0], [0.4, 0.37, 0.33]); // rump
  s.ellipsoid([-0.26, 1.62, 0], [0.82, 0.38, 0.34], 0.7); // barrel
  s.ellipsoid([-0.3, 1.45, 0], [0.55, 0.28, 0.3], 0.7); // belly
  s.ellipsoid([0.2, 2.05, 0], [0.36, 0.4, 0.3], 0.7); // chest
  s.capsule([0.05, 2.28, 0], [-0.3, 2.02, 0], 0.17, 0.2); // withers and back
  s.chain([[0.26, 2.2, 0], [0.46, 2.62, 0], [0.56, 2.98, 0]], 0.29, 0.16); // neck
  s.capsule([0.28, 2.4, 0], [0.46, 3.06, 0], 0.09, 0.07); // mane crest
  s.capsule([0.6, 3.07, 0], [0.92, 2.8, 0], 0.15, 0.085); // head
  s.ellipsoid([0.66, 2.92, 0], [0.16, 0.13, 0.12], -0.6); // jaw
  s.capsule([0.54, 3.16, 0.07], [0.5, 3.32, 0.08], 0.04, 0.02); // ears
  s.capsule([0.54, 3.16, -0.07], [0.5, 3.32, -0.08], 0.04, 0.02);
  // raised forelegs, one higher than the other
  s.chain([[0.28, 1.86, 0.16], [0.72, 1.98, 0.17], [0.63, 1.56, 0.17]], 0.12, 0.065);
  s.ellipsoid([0.66, 1.49, 0.17], [0.08, 0.08, 0.07], 0.5);
  s.chain([[0.22, 1.8, -0.16], [0.6, 1.7, -0.17], [0.55, 1.28, -0.17]], 0.12, 0.065);
  s.ellipsoid([0.58, 1.21, -0.17], [0.08, 0.08, 0.07], 0.5);
  // hind legs carrying the weight
  for (const z of [0.2, -0.2]) {
    s.ellipsoid([-0.6, 1.0, z], [0.3, 0.44, 0.15], 0.3);
    s.chain([[-0.44, 0.92, z], [-0.8, 0.45, z], [-0.55, 0.12, z]], 0.13, 0.065);
    s.ellipsoid([-0.47, 0.06, z], [0.12, 0.07, 0.09]);
  }
  // the tail sweeps to the ground: the statue's third point of support
  s.chain([[-1.05, 1.42, 0], [-1.25, 1.1, 0], [-1.3, 0.6, 0.02], [-1.15, 0.12, 0.04]], 0.13, 0.11);
  s.ellipsoid([-1.12, 0.1, 0.04], [0.2, 0.1, 0.16]);

  // --- rider, leaning into the rear
  s.capsule([-0.18, 2.28, 0], [0.0, 2.8, 0], 0.17, 0.19); // torso
  s.ellipsoid([0.02, 2.74, 0], [0.16, 0.2, 0.21]); // chest / cuirass
  s.ellipsoid([0.04, 3.17, 0], [0.12, 0.13, 0.11]); // head
  s.ellipsoid([0.03, 3.2, 0], [0.14, 0.13, 0.13]); // helmet
  s.capsule([-0.1, 3.3, 0], [0.12, 3.38, 0], 0.035, 0.03); // crest
  s.capsule([0.0, 2.95, 0], [0.03, 3.05, 0], 0.08); // neck
  for (const z of [0.14, -0.14]) {
    const sz = Math.sign(z);
    s.chain([[-0.15, 2.25, z], [0.12, 2.12, 0.31 * sz], [0.03, 1.78, 0.3 * sz]], 0.1, 0.05);
    s.ellipsoid([0.08, 1.75, 0.3 * sz], [0.1, 0.04, 0.05]);
  }
  s.chain([[0.02, 2.95, 0.21], [0.1, 3.25, 0.33], [0.2, 3.55, 0.28]], 0.075, 0.05); // sword arm, raised
  s.chain([[0.02, 2.95, -0.21], [0.05, 2.66, -0.32], [0.3, 2.62, -0.16]], 0.075, 0.05); // rein arm
  s.ellipsoid([-0.22, 2.72, 0], [0.11, 0.36, 0.27], -0.45); // cloak
  s.capsule([-0.32, 2.5, 0.05], [-0.55, 2.18, 0.1], 0.1, 0.05); // cloak tail, billowing
  return s.mesh(cell);
}

/** A standing warrior with round shield (left) and a hand ready for a spear (right). */
export function soldier(cell: number): BufferGeometry {
  const s = new Sculpt(0.045);
  for (const z of [0.1, -0.1]) {
    s.chain([[0, 0.95, z], [0.04, 0.5, z * 1.1], [0, 0.08, z * 1.1]], 0.08, 0.055);
    s.ellipsoid([0.05, 0.05, z * 1.1], [0.12, 0.05, 0.06]);
  }
  s.ellipsoid([0, 0.95, 0], [0.18, 0.2, 0.21]); // tunic skirt
  s.capsule([0, 1.0, 0], [0, 1.4, 0], 0.16, 0.19);
  s.ellipsoid([0.02, 1.36, 0], [0.14, 0.18, 0.21]);
  s.capsule([0, 1.5, 0], [0.01, 1.58, 0], 0.07);
  s.ellipsoid([0.02, 1.68, 0], [0.11, 0.12, 0.1]);
  s.ellipsoid([0.0, 1.72, 0], [0.13, 0.12, 0.12]);
  s.capsule([-0.12, 1.84, 0], [0.1, 1.85, 0], 0.03);
  s.chain([[0, 1.46, 0.22], [0.08, 1.2, 0.27], [0.22, 1.3, 0.24]], 0.06, 0.045);
  s.chain([[0, 1.46, -0.22], [0.12, 1.2, -0.27], [0.2, 1.24, -0.2]], 0.06, 0.045);
  s.ellipsoid([0.27, 1.15, -0.22], [0.04, 0.34, 0.34]); // shield
  s.ellipsoid([-0.13, 1.18, 0], [0.06, 0.4, 0.22]); // cape
  return s.mesh(cell);
}

/** A seated lion, as on the corners of the fountain. */
export function lion(cell: number): BufferGeometry {
  const s = new Sculpt(0.06);
  for (const z of [0.18, -0.18]) {
    s.ellipsoid([-0.3, 0.36, z], [0.34, 0.3, 0.17]);
    s.ellipsoid([-0.06, 0.06, z * 1.4], [0.18, 0.06, 0.08]);
    s.capsule([0.25, 0.75, z * 0.8], [0.36, 0.1, z * 0.8], 0.085, 0.07);
    s.ellipsoid([0.42, 0.05, z * 0.8], [0.13, 0.06, 0.08]);
  }
  s.capsule([-0.3, 0.45, 0], [0.15, 0.9, 0], 0.27, 0.3);
  s.ellipsoid([0.18, 0.85, 0], [0.26, 0.33, 0.26]);
  s.ellipsoid([0.24, 1.15, 0], [0.31, 0.34, 0.34], -0.3); // mane
  s.ellipsoid([0.4, 1.18, 0], [0.2, 0.18, 0.17]); // head
  s.ellipsoid([0.58, 1.1, 0], [0.11, 0.09, 0.1]); // muzzle
  s.capsule([0.34, 1.34, 0.12], [0.32, 1.4, 0.13], 0.04);
  s.capsule([0.34, 1.34, -0.12], [0.32, 1.4, -0.13], 0.04);
  s.chain([[-0.6, 0.1, 0.12], [-0.35, 0.04, 0.38], [0.0, 0.04, 0.42]], 0.045, 0.035);
  return s.mesh(cell);
}

/** A robed, veiled figure with hands joined in prayer (Mother Teresa). */
export function robedFigure(cell: number): BufferGeometry {
  const s = new Sculpt(0.05);
  s.capsule([0, 0.12, 0], [0, 1.1, 0], 0.27, 0.19); // habit, widening to the hem
  s.ellipsoid([0, 0.1, 0], [0.3, 0.12, 0.3]);
  s.ellipsoid([0.02, 1.2, 0], [0.16, 0.2, 0.22]);
  s.ellipsoid([0.02, 1.52, 0], [0.1, 0.12, 0.09]); // face
  s.ellipsoid([-0.03, 1.5, 0], [0.14, 0.2, 0.15]); // veil
  s.capsule([-0.06, 1.45, 0], [-0.12, 1.05, 0], 0.13, 0.12); // veil falling on the back
  s.chain([[0.0, 1.3, 0.17], [0.12, 1.12, 0.14], [0.2, 1.22, 0.02]], 0.055, 0.04);
  s.chain([[0.0, 1.3, -0.17], [0.12, 1.12, -0.14], [0.2, 1.22, -0.02]], 0.055, 0.04);
  return s.mesh(cell);
}
