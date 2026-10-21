import { gornizaPreset } from './gorniza';
import { metalPreset } from './metal';
import type { DemoPreset } from './types';

const PRESETS: Record<string, DemoPreset> = {
  metal: metalPreset,
  gorniza: gornizaPreset,
};

/** Пресет выбирается при сборке: `vite --mode gorniza` читает `.env.gorniza`. */
export const PRESET: DemoPreset = PRESETS[import.meta.env.VITE_PRESET ?? ''] ?? metalPreset;
