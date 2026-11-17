// The sound itself, loaded on the first "on": two loops (music, and rain under it) decoded once and played
// with Web Audio, so they loop without the gap MP3 padding would leave. Everything fades in and out.
import { site } from '../content/site';
import type { Track } from '../content/types';

const FADE = 1;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const gains: GainNode[] = [];
let started = false;
let format: 'ogg' | 'mp3' = 'ogg';

/** Ogg Opus where the browser can decode it (smaller), MP3 otherwise or if decoding fails. */
async function decode(t: Track) {
  const get = async (url: string) => ctx!.decodeAudioData(await (await fetch(url)).arrayBuffer());
  if (format === 'ogg') {
    try { return await get(t.ogg); } catch { format = 'mp3'; }
  }
  return get(t.mp3);
}

function fadeTo(v: number, seconds = FADE) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(v, now + seconds);
}

/** Starts (or resumes) the loops and fades them in. `stillWanted` is asked again after the download. */
export async function play(stillWanted: () => boolean) {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    if (!new Audio().canPlayType('audio/ogg; codecs=opus')) format = 'mp3';
  }
  if (ctx.state === 'suspended') await ctx.resume();
  if (!started) {
    started = true;
    const tracks = [site.audio.music, site.audio.rain];
    const buffers = await Promise.all(tracks.map(decode));
    buffers.forEach((buffer, i) => {
      const src = ctx!.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx!.createGain();
      g.gain.value = tracks[i].gain;
      src.connect(g).connect(master!);
      gains.push(g);
      src.start();
    });
  }
  if (stillWanted()) fadeTo(1);
  else await pause();
}

/** Fades out, then suspends the context (no CPU, no sound) until the next play(). */
export async function pause(seconds = FADE) {
  if (!ctx || ctx.state !== 'running') return;
  fadeTo(0, seconds);
  await new Promise((ok) => setTimeout(ok, seconds * 1000));
  if (master && master.gain.value < 0.01) await ctx.suspend();
}

/** For tests/interactions.mjs: headless Chrome can't listen, but it can see the graph. */
export const debug = () => ({
  context: ctx?.state ?? 'none',
  master: master ? +master.gain.value.toFixed(2) : 0,
  loops: gains.map((g) => +g.gain.value.toFixed(2)),
  format,
});
