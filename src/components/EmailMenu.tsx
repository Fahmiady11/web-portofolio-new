import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { site } from '../content/site';

const GMAIL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(site.email)}`;

/** Clipboard API where allowed (https, localhost), else the old select-and-copy. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.append(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

interface Props {
  className: string;
  id?: string;
  /** Which edge of the button the menu lines up with. */
  align?: 'left' | 'right';
  children: ReactNode;
}

/**
 * An email button that works without a mail app. A plain mailto: link does nothing when the browser has no
 * handler (common with webmail), so a click opens a small menu: copy the address, write in Gmail, or open
 * the mail app. Without JavaScript (and in the prerendered HTML) it stays a plain mailto: link.
 */
export function EmailMenu({ className, id, align = 'left', children }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = (refocus: boolean) => {
    setOpen(false);
    setCopied(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close(false); };
    // capture phase: Escape closes the menu before the page's own Escape (which closes files) sees it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close(true);
    };
    addEventListener('pointerdown', onDown, true);
    addEventListener('keydown', onKey, true);
    return () => { removeEventListener('pointerdown', onDown, true); removeEventListener('keydown', onKey, true); };
  }, [open]);

  return (
    <span className={'mailpop ' + align} ref={wrap}>
      <a
        className={className}
        id={id}
        ref={trigger}
        href={`mailto:${site.email}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => { e.preventDefault(); if (open) close(false); else setOpen(true); }}
      >
        {children}
      </a>
      {open && (
        <span className="mailmenu" id={menuId} role="group" aria-label={`Email ${site.email}`}>
          <span className="mailaddr">{site.email}</span>
          <button type="button" ref={first} data-mail="copy" onClick={async () => setCopied(await copy(site.email))}>
            {copied ? 'Copied ✓' : 'Copy email'}
          </button>
          <a href={GMAIL} target="_blank" rel="noopener" data-mail="gmail" onClick={() => close(false)}>Open in Gmail ↗</a>
          <a href={`mailto:${site.email}`} data-mail="app" onClick={() => close(false)}>Open mail app</a>
          <span className="sr-only" role="status">{copied ? 'Email address copied' : ''}</span>
        </span>
      )}
    </span>
  );
}
