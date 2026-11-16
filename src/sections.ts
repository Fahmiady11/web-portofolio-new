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

/** Every piece of evidence in the room, in marker order. Projects come first. */
export const SECTIONS: Section[] = [
  { id: 'cases', no: 1, label: 'Case files · projects', short: 'Cases', icon: '🗂', kicker: 'The case wall · projects', title: 'Case files' },
  { id: 'board', no: 2, label: 'Timeline', short: 'Timeline', icon: '📌', kicker: 'Evidence board · experience', title: 'The career timeline' },
  { id: 'evidence', no: 3, label: 'Evidence', short: 'Evidence', icon: '🔎', kicker: 'Evidence bags · skills', title: 'Evidence log' },
  { id: 'about', no: 4, label: 'Subject', short: 'Subject', icon: '⌨', kicker: 'Typewriter · statement', title: 'Subject profile' },
  { id: 'wall', no: 5, label: 'Commendations', short: 'Certs', icon: '🏅', kicker: 'Framed on the wall · certificates', title: `Commendations (${site.certificates.length})` },
  { id: 'record', no: 6, label: 'Record', short: 'Record', icon: '🎓', kicker: 'Diploma & medal · education', title: 'Record & awards' },
  { id: 'phone', no: 7, label: 'Contact', short: 'Contact', icon: '☎', kicker: 'The telephone', title: 'Make the call' },
  { id: 'dossier', no: 8, label: 'Dossier', short: 'Dossier', icon: '📁', kicker: 'Top secret · CV', title: 'The dossier' },
];

export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id);

/** The next (dir 1) or previous (dir -1) section in marker order, wrapping around. */
export const stepSection = (id: SectionId, dir: 1 | -1) =>
  SECTIONS[(SECTIONS.findIndex((s) => s.id === id) + dir + SECTIONS.length) % SECTIONS.length];
