import { site } from '../content/site';
import { SECTIONS } from '../sections';
import { useRoom } from '../store';
import { EmailMenu } from './EmailMenu';
import { SoundButton } from './SoundButton';

export function Header() {
  const { open, openDossier, closeDossier } = useRoom();
  return (
    <header className="top">
      <div className="brand">
        <small>CASE FILE · {site.location.toUpperCase()}</small>
        <h1 id="name">{site.name}</h1>
        <p>{site.headline}</p>
      </div>
      <nav className="actions" aria-label="Quick links">
        <button className="btn cases" id="casesBtn" type="button" onClick={() => { closeDossier(); open('cases'); }}>
          <span aria-hidden="true">🗂</span> View cases
        </button>
        <button className="btn" id="quickBtn" type="button" onClick={openDossier}>Full dossier</button>
        <a className="btn" id="cvBtn" href={site.cv} target="_blank" rel="noopener">CV <span aria-hidden="true">↓</span></a>
        <EmailMenu className="btn" id="mailBtn" align="right">Email</EmailMenu>
        <SoundButton />
      </nav>
    </header>
  );
}

/** Section shortcuts for phones, where the markers are small; the first (highlighted) slot is marker #1. */
export function Dock() {
  const { current, open } = useRoom();
  return (
    <nav className="dock" id="dock" aria-label="Sections">
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          data-sec={s.id}
          className={[i === 0 && 'star', current === s.id && 'on'].filter(Boolean).join(' ') || undefined}
          aria-pressed={current === s.id}
          onClick={() => open(s.id)}
        >
          <span aria-hidden="true">{s.icon}</span>{s.short}
        </button>
      ))}
    </nav>
  );
}
