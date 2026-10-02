import type { Group, Material } from 'three';
import type { Kit } from '../kit';

export interface BuildContext {
  kit: Kit;
  /** Non-reflective water for fountains and pools; shares the river's animated uniforms. */
  pool: Material;
  high: boolean;
}

export interface Monument {
  group: Group;
  /** Per-frame animation (fountain jets, floating debris, lights). */
  update?(time: number, night: number): void;
}
