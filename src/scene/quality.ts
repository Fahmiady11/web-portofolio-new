import { createContext, useContext } from 'react';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Phones start one step down; the performance monitor can drop any device to "low". */
export type Quality = 'high' | 'medium' | 'low';

export const QualityContext = createContext<Quality>('high');

/** Shadows are drawn once (not every frame) on high/medium and switched off entirely on low. */
export const useShadows = () => useContext(QualityContext) !== 'low';
