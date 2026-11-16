import { createContext } from 'react';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Phones start one step down; the performance monitor can drop any device to "low". */
export type Quality = 'high' | 'medium' | 'low';

export const QualityContext = createContext<Quality>('high');

// Shadows are drawn once (nothing that casts them moves), so they stay on at every quality: switching
// them off would recompile every shader mid-visit, a visible stall on exactly the devices that step down.

/** ?quality=high|medium|low pins the quality (no automatic step-down): for testing and comparing. */
const asked = new URLSearchParams(location.search).get('quality');
export const pinnedQuality = (['high', 'medium', 'low'] as const).find((q) => q === asked);

/** What is in use right now, for the test hooks. */
export const liveQuality = { value: 'high' as Quality, bloom: false };
