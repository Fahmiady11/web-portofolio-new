import { site } from './content/site';

export type SectionId = 'cases' | 'board' | 'evidence' | 'about' | 'wall' | 'record' | 'phone' | 'dossier';

export interface Section {
  id: SectionId;
  /** Number on the evidence marker. */
  no: number;
  /** Marker label. */
  label: string;
  /** Phone dock label. */
  short: string;
  icon: string;
  kicker: string;
  title: string;
}

/**
 * Every piece of evidence in the room, in marker order: what a recruiter wants first for an experienced
 * candidate. The same order drives the dock, the arrow keys, the panel's ‹ › and the full dossier.
 * (The case wall keeps its own prominence in the room and the "View cases" header button.)
 */
export const SECTIONS: Section[] = [
  { id: 'board', no: 1, label: 'Timeline · experience', short: 'Experience', icon: '📌', kicker: 'Evidence board · experience', title: 'The career timeline' },
  { id: 'cases', no: 2, label: 'Case files · projects', short: 'Cases', icon: '🗂', kicker: 'The case wall · projects', title: 'Case files' },
  { id: 'evidence', no: 3, label: 'Evidence · skills', short: 'Skills', icon: '🔎', kicker: 'Evidence bags · skills', title: 'Evidence log' },
  { id: 'about', no: 4, label: 'Subject · about', short: 'About', icon: '⌨', kicker: 'Typewriter · statement', title: 'Subject profile' },
  { id: 'dossier', no: 5, label: 'Dossier · CV', short: 'CV', icon: '📁', kicker: 'Top secret · CV', title: 'The dossier' },
  { id: 'record', no: 6, label: 'Record · education', short: 'Education', icon: '🎓', kicker: 'Diploma & medal · education', title: 'Record & awards' },
  { id: 'wall', no: 7, label: 'Commendations · certificates', short: 'Certs', icon: '🏅', kicker: 'Framed on the wall · certificates', title: `Commendations (${site.certificates.length})` },
  { id: 'phone', no: 8, label: 'Telephone · contact', short: 'Contact', icon: '☎', kicker: 'The telephone', title: 'Make the call' },
];

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id);

/** The next (dir 1) or previous (dir -1) section in marker order, wrapping around. */
export const stepSection = (id: SectionId, dir: 1 | -1) =>
  SECTIONS[(SECTIONS.findIndex((s) => s.id === id) + dir + SECTIONS.length) % SECTIONS.length];
