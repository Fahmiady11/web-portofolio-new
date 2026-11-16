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

// pendingProjects.items may be empty, which JSON typing reads as never[]: give it its shape
type PendingItem = { slug: string; workingTitle: string; thumb: string };

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


// icons are vendored in public/icons/skills (devicon v2.16.0, MIT; simple-icons 13, CC0); content.json keeps their sources
const icons = new Map(skills.icons.map((s) => [s.name, '/icons/skills/' + s.icon.split('/').pop()]));

export const site: Site = {
  name: profile.name,
  shortName: profile.shortName,
  headline: profile.headline,
  location: profile.location,
  about: profile.about,
  photo: picture(profile.photo.thumb),
  email: contact.email,
  // published under a readable name by scripts/build-assets.mjs; the phone number stays in the PDF only
  cv: '/files/' + contact.cv.publicName,
  // the CV-only UI/UX Instagram stays off the site, as on the live one
  socials: contact.socials.filter((s) => !('note' in s)).map(({ name, handle, url }) => ({ name, handle, url })),
  skills: skills.groups.map((g) => ({ group: g.name, skills: g.items.map((s) => ({ name: s, icon: icons.get(s) })) })),
  experience: experience.map((e) => ({
    role: e.role,
    company: e.company,
    start: e.start,
    end: e.end,
    latest: e.end === null,
    link: ('link' in e ? e.link : null) ?? null,
    linkLabel: ('linkLabel' in e ? e.linkLabel : null) ?? null,
    highlights: e.highlights,
  })),
  education: education.items,
  nonFormal: education.nonFormal,
  organizations: organizations.items,
  achievements: achievements.items,
  projects: projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    year: p.year,
    description: p.description,
    tags: p.tags,
    github: p.github,
    website: p.website,
    link: p.link,
    install: ('install' in p ? p.install : null) ?? null,
    image: picture(p.thumb),
    imageAlt: ('imageAlt' in p ? p.imageAlt : null) ?? null,
  })),
  // descriptions come from the user later: only the working title and screenshot are shown
  pending: (pendingProjects.items as PendingItem[]).map((p) => ({ slug: p.slug, title: p.workingTitle, image: picture(p.thumb) })),
  certificates: certificates.map((c) => ({
    title: c.title,
    issuer: c.issuer,
    date: c.date,
    url: ('url' in c ? c.url : null) ?? null,
    image: c.thumb ? picture(c.thumb) : null,
  })),
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

/** "2023-07" → "Jul 2023", "2023" → "2023"; null → "Present" */
export function monthYear(ym: string | null) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return m ? new Date(y, m - 1).toLocaleString('en', { month: 'short' }) + ' ' + y : String(y);
}

/** "2023 – 2026", or one date when start and end are the same */
export const period = (start: string, end: string | null) =>
  start === end ? monthYear(start) : `${monthYear(start)} – ${monthYear(end)}`;

/** The job at the top of the CV, and whether it is still ongoing. */
export const latestJob = site.experience[0];
