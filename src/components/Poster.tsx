/**
 * A still of the room, shown at once while the 3D chunk loads and faded out when the scene is live.
 * The images are captured from the real scene by scripts/capture-posters.mjs.
 */
export function Poster({ hidden }: { hidden: boolean }) {
  return (
    <picture className={'poster' + (hidden ? ' gone' : '')}>
      <source media="(max-aspect-ratio: 4/5)" srcSet="/poster-tall.webp" />
      <img src="/poster-wide.webp" alt="" fetchPriority="high" decoding="async" />
    </picture>
  );
}
