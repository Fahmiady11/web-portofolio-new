// The contents of each case file. Shared by the side panel and the full dossier.
import type { ReactNode } from 'react';
import { cases, monthYear, site } from '../content/site';
import type { Case } from '../content/types';
import { useRoom } from '../store';
import { Heading } from './heading';
import { Img } from './Img';

const SHOT_SIZES = '(max-width: 760px) 92vw, 560px';
const ext = { target: '_blank', rel: 'noopener' } as const;

function CaseLinks({ c }: { c: Extract<Case, { kind: 'closed' }> }) {
  if (!c.website && !c.github) return <span className="private">Private project — no public link</span>;
  return (
    <>
      {c.website && <a className="pbtn" href={c.website} {...ext}>Live site ↗<span className="sr-only"> ({c.title})</span></a>}
      {c.github && <a className="pbtn ghost" href={c.github} {...ext}>GitHub ↗<span className="sr-only"> ({c.title})</span></a>}
    </>
  );
}

export function CaseCard({ c, idPrefix, eager }: { c: Case; idPrefix: string; eager?: boolean }) {
  if (c.kind === 'pending') {
    return (
      <article className="case pending" id={idPrefix + c.index} data-no={`CASE ${c.no}`}>
        <span className="stamp grey">FILE PENDING</span>
        <Img className="shot" picture={c.image} alt={`Screenshot of ${c.title}`} sizes={SHOT_SIZES} eager={eager} />
        <Heading>{c.title}</Heading>
        <p className="muted">Case notes not filed yet.</p>
      </article>
    );
  }
  return (
    <article className="case" id={idPrefix + c.index} data-no={`CASE ${c.no}`}>
      <span className="stamp">CLOSED</span>
      <Img className="shot" picture={c.image} alt={`Screenshot of ${c.title}`} sizes={SHOT_SIZES} eager={eager} />
      <Heading>{c.title}</Heading>
      <ul className="tags" aria-label="Built with">{c.tags.map((t) => <li className="tag" key={t}>{t}</li>)}</ul>
      <p>{c.description}</p>
      <div className="row"><CaseLinks c={c} /></div>
    </article>
  );
}

// the panel opens on demand, so it loads every screenshot at once; the dossier loads them as they scroll in
export function Cases({ idPrefix, eager }: { idPrefix: string; eager?: boolean }) {
  return (
    <>
      <p className="lead intro">{site.projects.length} closed cases with screenshots and links, {site.pending.length} files still pending.</p>
      {cases.map((c) => <CaseCard key={c.slug} c={c} idPrefix={idPrefix} eager={eager} />)}
    </>
  );
}

export function Timeline() {
  return (
    <ol className="tl">
      {site.experience.map((e) => (
        <li className="ev" key={e.role + e.start}>
          <Heading>{e.role}{e.latest && <span className="stamp small">ACTIVE</span>}</Heading>
          <p className="meta">{e.company} · {monthYear(e.start)} – {monthYear(e.end)}</p>
          <ul>{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
        </li>
      ))}
    </ol>
  );
}

export function Skills() {
  return site.skills.map((g, i) => (
    <section className="exhibit" key={g.group} aria-label={g.group}>
      <Heading>EXHIBIT {String.fromCharCode(65 + i)} — {g.group.toUpperCase()}</Heading>
      <ul>
        {g.skills.map((s) => (
          <li key={s.name}>{s.icon && <img src={s.icon} alt="" width={16} height={16} loading="lazy" />}{s.name}</li>
        ))}
      </ul>
    </section>
  ));
}

export function Certificates() {
  return (
    <ul className="frames">
      {site.certificates.map((c) => (
        <li key={c.title}>
          <figure>
            <Img picture={c.image} alt={`Certificate: ${c.title}`} sizes="(max-width: 760px) 45vw, 220px" />
            <figcaption><b>{c.title}</b>{c.issuer}{c.date ? ' · ' + c.date : ''}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

export function Record() {
  return (
    <>
      {site.education.map((e) => (
        <div className="record" key={e.degree}><Heading>{e.degree}</Heading><p className="meta">{e.school} · {e.period}</p><p>{e.detail}</p></div>
      ))}
      <Heading className="sec">Awards</Heading>
      {site.achievements.map((a) => (
        <div className="record" key={a.title}><Heading offset={1}>{a.title}</Heading><p className="meta">{a.date}</p></div>
      ))}
      <Heading className="sec">Known associations</Heading>
      {site.organizations.map((o) => (
        <div className="record" key={o.role}><Heading offset={1}>{o.role}</Heading><p className="meta">{o.org} · {o.period}</p><p>{o.detail}</p></div>
      ))}
    </>
  );
}

export function Mug({ alt, children, className = '' }: { alt: string; children: ReactNode; className?: string }) {
  return (
    <div className={'mug ' + className}>
      <Img picture={site.photo} alt={alt} sizes="120px" />
      {children}
    </div>
  );
}

export function About() {
  return (
    <>
      <Mug alt={`Portrait of ${site.name}`}>
        <dl className="facts">
          <dt>Name</dt><dd>{site.name}</dd>
          <dt>Occupation</dt><dd>{site.headline}</dd>
          <dt>Employer</dt><dd>{site.employer.name} (since {monthYear(site.employer.since)})</dd>
          <dt>Based in</dt><dd>{site.location}</dd>
        </dl>
      </Mug>
      <Heading className="sec">Statement</Heading>
      <p className="lead">{site.about}</p>
      {/* figures quoted from the current job's highlights in content.json */}
      <ul className="nums">
        <li><b>400+</b><span>universities served</span></li>
        <li><b>2</b><span>ministries' systems</span></li>
        <li><b>~80%</b><span>on-time delivery</span></li>
      </ul>
    </>
  );
}

export function Contact() {
  return (
    <>
      <p className="lead">Got a case? The line is open.</p>
      <div className="row">
        <a className="pbtn" href={`mailto:${site.email}`}>✉ {site.email}</a>
        <a className="pbtn ghost" href={`tel:${site.phoneE164}`}>☎ {site.phone}</a>
      </div>
      <dl className="facts spaced">
        {site.socials.map((s) => (
          <div key={s.url} className="contents"><dt>{s.name}</dt><dd><a href={s.url} {...ext}>{s.handle}</a></dd></div>
        ))}
      </dl>
    </>
  );
}

export function DossierSummary() {
  const openDossier = useRoom((s) => s.openDossier);
  const job = site.experience[0];
  return (
    <>
      <Mug alt="">
        <div>
          <Heading className="mug-name">{site.name}</Heading>
          <p>{site.headline} · {site.location}</p>
          <span className="stamp">CONFIDENTIAL</span>
        </div>
      </Mug>
      <div className="row spaced">
        <a className="pbtn" href={site.cv} {...ext}>Download CV (PDF)</a>
        <button className="pbtn ghost" type="button" onClick={openDossier}>Read the full dossier</button>
      </div>
      <Heading className="sec">Summary</Heading>
      <ul className="summary">
        <li>{job.role} at {job.company} since {monthYear(job.start)}.</li>
        <li>{job.highlights[0]}</li>
        <li>{job.highlights[1]}</li>
        <li>Stack: PHP, Laravel, JavaScript, React, PostgreSQL, Tailwind CSS.</li>
      </ul>
    </>
  );
}

