import { useEffect, useRef } from 'react';
import { cases, site } from '../content/site';
import { useRoom } from '../store';
import { CaseCard, Certificates, Mug, Record, Skills, Timeline } from './files';
import { HeadingBase } from './heading';

const ext = { target: '_blank', rel: 'noopener' } as const;

/**
 * Everything on one plain, accessible page, projects first. It is always in the HTML (prerendered for
 * search engines and no-JS visitors) and is what visitors without WebGL get instead of the room.
 */
export function Dossier() {
  const { dossierOpen, closeDossier, webgl } = useRoom();
  const back = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const noRoom = webgl === 'none';

  useEffect(() => {
    if (!dossierOpen) return;
    const el = document.getElementById('quick');
    if (el) el.scrollTop = 0;
    (noRoom ? heading.current : back.current)?.focus({ preventScroll: true });
  }, [dossierOpen, noRoom]);

  const social = (name: string) => site.socials.find((s) => s.name === name);
  const github = social('GitHub');
  const linkedin = social('LinkedIn');

  return (
    <section className={'quick' + (dossierOpen ? ' open' : '')} id="quick" aria-labelledby="quickTitle">
      <div className="wrap">
        <div className="qhead">
          <h2 id="quickTitle" ref={heading} tabIndex={-1}>Full dossier — everything on one page</h2>
          {!noRoom && <button className="pbtn" id="quickClose" type="button" ref={back} onClick={closeDossier}>Back to the office</button>}
        </div>
        <p className="fallback" id="fallback" hidden={!noRoom}>The office lights are off on this device (no WebGL), so here is the full dossier.</p>
        <div id="quickBody">
          <HeadingBase level={4}>
            <Mug alt={`Portrait of ${site.name}`} className="qhero">
              <div>
                <p className="qname">{site.name}</p>
                <p className="qrole">{site.headline} · {site.location}</p>
                <div className="row">
                  <a className="pbtn" href={`mailto:${site.email}`}>✉ {site.email}</a>
                  <a className="pbtn ghost" href={site.cv} {...ext}>CV (PDF)</a>
                  {github && <a className="pbtn ghost" href={github.url} {...ext}>GitHub</a>}
                  {linkedin && <a className="pbtn ghost" href={linkedin.url} {...ext}>LinkedIn</a>}
                </div>
              </div>
            </Mug>
            <h3 className="sec">Case files (projects)</h3>
            <div className="cases">{cases.map((c) => <CaseCard key={c.slug} c={c} idPrefix="dossier-case-" />)}</div>
            <h3 className="sec">About</h3>
            <p className="lead">{site.about}</p>
            <h3 className="sec">Experience</h3>
            <Timeline />
            <div className="cols">
              <div><h3 className="sec">Skills</h3><Skills /></div>
              <div><h3 className="sec">Education</h3><Record /></div>
            </div>
            <h3 className="sec">Certificates</h3>
            <Certificates />
          </HeadingBase>
        </div>
      </div>
    </section>
  );
}
