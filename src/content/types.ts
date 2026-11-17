/** A content image, generated in several widths and formats by scripts/build-assets.mjs. */
export interface Picture {
  /** Largest WebP, for <img src> and WebGL textures. */
  src: string;
  avif: string;
  webp: string;
  /** Smallest WebP, for small textures. */
  small: string;
}

export interface Social {
  name: string;
  handle: string;
  url: string;
}

export interface Skill {
  name: string;
  /** Self-hosted devicon SVG, when there is one. */
  icon?: string;
}

export interface SkillGroup {
  group: string;
  skills: Skill[];
}

export interface Experience {
  role: string;
  company: string;
  /** YYYY or YYYY-MM */
  start: string;
  /** YYYY or YYYY-MM, or null while ongoing. */
  end: string | null;
  /** Still ongoing (end is null). */
  latest: boolean;
  /** Certificate or project page, when the CV gives one, and its label. */
  link: string | null;
  linkLabel: string | null;
  highlights: string[];
}

export interface Education {
  degree: string;
  school: string;
  period: string;
  detail: string;
}

/** Courses and bootcamps (the CV's "Pendidikan Non Formal"). */
export interface NonFormal {
  title: string;
  org: string;
  period: string;
  link: string | null;
  detail: string;
}

export interface Organization {
  role: string;
  org: string;
  period: string;
  detail: string;
}

export interface Achievement {
  date: string;
  title: string;
}

export interface Project {
  slug: string;
  title: string;
  year: number;
  description: string;
  tags: string[];
  github: string | null;
  website: string | null;
  /** Any other project page (e.g. the CV's short link). */
  link: string | null;
  /** Install command, shown with the GitHub link. */
  install: string | null;
  image: Picture;
  /** Alt text when the image is not a screenshot (a diagram or a drawing). */
  imageAlt: string | null;
}

/** A confirmed project still waiting for its description; only the screenshot is known. */
export interface PendingProject {
  slug: string;
  title: string;
  image: Picture;
}

export interface Certificate {
  title: string;
  issuer: string;
  date: string | null;
  /** Verification page, when the CV links one. */
  url: string | null;
  /** A scan of the certificate, when there is one. */
  image: Picture | null;
}

/** A background sound loop and its credit. */
export interface Track {
  title: string;
  author: string;
  authorUrl: string | null;
  source: string;
  licence: string;
  licenceUrl: string;
  /** Served copies: Ogg Opus first, MP3 for browsers that cannot decode Opus. */
  ogg: string;
  mp3: string;
  /** Mix level, 0–1. */
  gain: number;
}

export interface Site {
  name: string;
  shortName: string;
  headline: string;
  location: string;
  about: string;
  photo: Picture;
  email: string;
  cv: string;
  socials: Social[];
  skills: SkillGroup[];
  experience: Experience[];
  education: Education[];
  nonFormal: NonFormal[];
  organizations: Organization[];
  achievements: Achievement[];
  projects: Project[];
  pending: PendingProject[];
  certificates: Certificate[];
  audio: { music: Track; rain: Track };
}

/** One case on the wall: a project or a pending file, numbered in wall order. */
export type Case =
  | ({ kind: 'closed'; index: number; no: string } & Project)
  | ({ kind: 'pending'; index: number; no: string } & PendingProject);
