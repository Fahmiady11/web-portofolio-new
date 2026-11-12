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
  /** YYYY-MM */
  start: string;
  /** YYYY-MM, or null while ongoing. */
  end: string | null;
  latest: boolean;
  highlights: string[];
}

export interface Education {
  degree: string;
  school: string;
  period: string;
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
  description: string;
  tags: string[];
  github: string | null;
  website: string | null;
  image: Picture;
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
  image: Picture;
}

export interface Site {
  name: string;
  shortName: string;
  headline: string;
  location: string;
  about: string;
  employer: { name: string; since: string };
  photo: Picture;
  email: string;
  phone: string;
  phoneE164: string;
  cv: string;
  socials: Social[];
  skills: SkillGroup[];
  experience: Experience[];
  education: Education[];
  organizations: Organization[];
  achievements: Achievement[];
  projects: Project[];
  pending: PendingProject[];
  certificates: Certificate[];
}

/** One case on the wall: a project or a pending file, numbered in wall order. */
export type Case =
  | ({ kind: 'closed'; index: number; no: string } & Project)
  | ({ kind: 'pending'; index: number; no: string } & PendingProject);
