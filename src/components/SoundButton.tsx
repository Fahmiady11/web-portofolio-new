import { useSound } from '../audio/sound';

/** The header switch for the background music (also on the gramophone in the room). */
export function SoundButton() {
  const { on, playing, loading, toggle } = useSound();
  const label = !on ? 'Music off' : loading ? 'Music loading' : playing ? 'Music on' : 'Music on (starts when you click)';
  return (
    <button
      type="button"
      className={'btn sound' + (on ? ' on' : '')}
      id="soundBtn"
      data-sound
      aria-pressed={on}
      aria-label="Background music"
      title={label}
      onClick={toggle}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔇'}</span>
      <span className="sound-label">{on ? 'On' : 'Off'}</span>
    </button>
  );
}
