import type { MonumentMeta } from './types';

/** Nine landmarks of central Skopje, in scroll order. */
export const MONUMENTS: readonly MonumentMeta[] = [
  { id: 'warrior', text: 'left' },
  { id: 'porta-macedonia', text: 'right' },
  { id: 'stone-bridge', text: 'left' },
  { id: 'clock-tower', text: 'right' },
  { id: 'kursumli-an', text: 'left' },
  { id: 'kale', text: 'right' },
  { id: 'mother-teresa', text: 'left' },
  { id: 'old-station', text: 'right' },
  { id: 'millennium-cross', text: 'left' },
] as const;
