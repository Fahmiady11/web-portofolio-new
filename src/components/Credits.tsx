import { site } from '../content/site';

const ext = { target: '_blank', rel: 'noopener' } as const;

/** Attribution for the background sound (the music is CC BY 4.0, so the credit must be on the page). */
export function Credits({ className = '' }: { className?: string }) {
  const { music, rain } = site.audio;
  return (
    <p className={'credits ' + className}>
      Music: <a href={music.source} {...ext}>“{music.title}”</a> by {music.author}
      {music.authorUrl && <> (<a href={music.authorUrl} {...ext}>{music.authorUrl.replace(/^https?:\/\//, '')}</a>)</>}, licensed
      under <a href={music.licenceUrl} {...ext}>{music.licence}</a>. Rain: <a href={rain.source} {...ext}>“{rain.title}”</a> by{' '}
      {rain.author} ({rain.licence}).
    </p>
  );
}
