import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { sectionById, type SectionId } from '../sections';
import { useRoom } from '../store';
import { About, Cases, Certificates, Contact, DossierSummary, Record, Skills, Timeline } from './files';
import { HeadingBase } from './heading';

/** What each piece of evidence opens. */
const FILES: Record<SectionId, ReactNode> = {
  cases: <Cases idPrefix="case-" eager />,
  board: <Timeline />,
  evidence: <Skills />,
  about: <About />,
  wall: <Certificates />,
  record: <Record />,
  phone: <Contact />,
  dossier: <DossierSummary />,
};

/** The case-file panel: slides in from the right, or up as a bottom sheet on phones. */
export function Panel() {
  const { current, shown, focusCase, openCount, instant, close } = useRoom();
  const body = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const section = shown ? sectionById(shown) : undefined;

  // scroll to the top, or to the clicked case, on every open
  useLayoutEffect(() => {
    const b = body.current;
    if (!b || !current) return;
    b.scrollTop = 0;
    b.querySelectorAll('.case.focus').forEach((el) => el.classList.remove('focus'));
    if (focusCase >= 0) {
      const el = document.getElementById('case-' + focusCase);
      if (el) { b.scrollTop = el.offsetTop - 70; el.classList.add('focus'); }
    }
  }, [current, focusCase, openCount]);

  // move focus into the file, and give it back to whatever opened it on close
  useEffect(() => {
    if (current) {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#panel')) opener.current = active;
      title.current?.focus({ preventScroll: true });
    } else if (opener.current) {
      opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [current, openCount]);

  const cls = ['panel', current && 'open', shown === 'cases' && 'wide', instant && 'instant'].filter(Boolean).join(' ');
  return (
    <aside className={cls} id="panel" aria-hidden={!current} inert={!current} aria-labelledby="pTitle">
      <header>
        <small id="pKicker">{section?.kicker}</small>
        <h2 id="pTitle" ref={title} tabIndex={-1}>{section?.title}</h2>
        <button className="x" id="pClose" type="button" aria-label="Close file" onClick={close}>×</button>
      </header>
      <div className="body" id="pBody" ref={body}>
        <HeadingBase level={3}>{shown && FILES[shown]}</HeadingBase>
      </div>
    </aside>
  );
}
