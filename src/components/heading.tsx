import { createContext, createElement, useContext, type ReactNode } from 'react';

type Level = 2 | 3 | 4 | 5 | 6;

// The same file contents appear in the side panel (under its h2) and in the full dossier (under an h3),
// so headings are given relative to their container instead of hard-coded as h3/h4.
const HeadingLevel = createContext<Level>(3);

export function HeadingBase({ level, children }: { level: Level; children: ReactNode }) {
  return <HeadingLevel.Provider value={level}>{children}</HeadingLevel.Provider>;
}

/** A heading at the container's base level, or `offset` levels below it. */
export function Heading({ offset = 0, className, children }: { offset?: number; className?: string; children: ReactNode }) {
  const level = Math.min(6, useContext(HeadingLevel) + offset);
  return createElement(`h${level}`, { className }, children);
}
