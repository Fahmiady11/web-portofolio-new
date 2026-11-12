// The single source of truth is content/content.json. This module maps it into the typed shape the
// site renders; named imports keep the audit-only keys (_meta, navigation, otherAssets…) out of the bundle.
import {
  achievements,
  certificates,
  contact,
  education,
  experience,
  organizations,
  pendingProjects,
  profile,
  projects,
  skills,
} from '../../content/content.json';
import sizes from './image-sizes.json';
import type { Case, Picture, Site } from './types';

/** content/<dir>/<name>.<ext> → /img/<subdir>/<name>-<w>.<fmt>, as written by scripts/build-assets.mjs. */
export function picture(path: string): Picture {
  const dir = path.slice(0, path.lastIndexOf('/'));
  const widths = (sizes as unknown as Record<string, number[]>)[dir];
  if (!widths) throw new Error(`No image sizes for ${dir} (src/content/image-sizes.json)`);
  const base = '/img/' + path.replace(/^assets\//, '').replace(/\.[a-z]+$/i, '');
  const set = (fmt: string) => widths.map((w) => `${base}-${w}.${fmt} ${w}w`).join(', ');
  return {
    src: `${base}-${widths[widths.length - 1]}.webp`,
    small: `${base}-${widths[0]}.webp`,
    avif: set('avif'),
    webp: set('webp'),
  };
}

/** content/assets/<file> → the copy served from /files/ */
const file = (path: string) => '/files/' + path.replace(/^assets\//, '');

// devicon SVGs are vendored in public/icons/skills (MIT, pinned to devicon v2.16.0)
const icons = new Map(skills.icons.map((s) => [s.name, '/icons/skills/' + s.icon.split('/').pop()]));
const group = (name: string, list: string[]) => ({ group: name, skills: list.map((s) => ({ name: s, icon: icons.get(s) })) });

const current = experience[0];

export const site: Site = {
  name: profile.name,
  shortName: profile.shortName,
  headline: profile.headline,
  location: profile.location,
  about: profile.about,
  employer: { name: current.company, since: current.start },
  photo: picture(profile.photo.thumb),
  email: contact.email,
  phone: contact.phone,
  phoneE164: contact.phoneE164,
  cv: file(contact.cv.copy),
  // the CV-only UI/UX Instagram stays off the site, as on the live one
  socials: contact.socials.filter((s) => !('note' in s)).map(({ name, handle, url }) => ({ name, handle, url })),
  skills: [
    group('Languages', skills.languages),
    group('Frontend', skills.frontend),
    group('Backend', skills.backend),
    group('Database', skills.database),
    group('Design', skills.design),
    // React Native only appears in the hidden Bangbeli internship, so it is left out
    group('Also used', skills.fromAboutOrProjects.filter((s) => s !== 'React Native')),
  ],
  experience: experience.map((e) => ({
    role: e.role,
    company: e.company,
    start: e.start,
    end: e.end,
    latest: 'latest' in e && e.latest === true,
    highlights: e.highlights,
  })),
  education: education.items,
  organizations: organizations.items,
  achievements: achievements.items,
  projects: projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: p.tags,
    github: p.github,
    website: p.website,
    image: picture(p.thumb),
  })),
  // descriptions come from the user later: only the working title and screenshot are shown
  pending: pendingProjects.items.map((p) => ({ slug: p.slug, title: p.workingTitle, image: picture(p.thumb) })),
  certificates: certificates.map((c) => ({ title: c.title, issuer: c.issuer, date: c.date, image: picture(c.thumb) })),
};

export const caseNo = (i: number) => '#' + String(i + 1).padStart(3, '0');

/** Every case in wall order: closed projects first, then the pending files. */
export const cases: Case[] = [
  ...site.projects.map((p, i) => ({ ...p, kind: 'closed' as const, index: i, no: caseNo(i) })),
  ...site.pending.map((p, i) => {
    const index = site.projects.length + i;
    return { ...p, kind: 'pending' as const, index, no: caseNo(index) };
  }),
];

/** "2023-07" → "Jul 2023"; null → "Present" */
export function monthYear(ym: string | null) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleString('en', { month: 'short' }) + ' ' + y;
}
