import { PlayAlongVariation } from '../data/playAlongTracks';
import { audioEngine } from './audioEngine';

function playBaseGroove(ctx: AudioContext, bpm: number, kickExtra = false) {
  const eighth = 60 / bpm / 2;
  const start = ctx.currentTime + 0.06;
  for (let i = 0; i < 8; i += 1) {
    const t = start + i * eighth;
    audioEngine.playHiHatClosed(t);
    const beat = Math.floor(i / 2) + 1;
    const onBeat = i % 2 === 0;
    if (onBeat && (beat === 2 || beat === 4)) audioEngine.playSnare(true, t);
    if (onBeat && (beat === 1 || beat === 3)) audioEngine.playKick(t);
    if (kickExtra && i === 5) audioEngine.playKick(t); // 3&
  }
}

function playFill(ctx: AudioContext, bpm: number, density: 1 | 2 | 4, rudiment?: 'single' | 'double' | 'paradiddle') {
  const step = 60 / bpm / density;
  const notes = density * 4;
  const start = ctx.currentTime + 0.06;
  for (let i = 0; i < notes; i += 1) {
    const t = start + i * step;
    const progress = i / Math.max(1, notes - 1);
    if (rudiment === 'double') {
      const pairIndex = Math.floor(i / 2) % 3;
      if (pairIndex === 0) audioEngine.playSnare(i % 4 === 0, t);
      else if (pairIndex === 1) audioEngine.playTom('high', t);
      else audioEngine.playTom('mid', t);
    } else if (rudiment === 'paradiddle') {
      const accented = i % 4 === 0;
      if (accented) audioEngine.playTom(i % 8 === 0 ? 'high' : 'low', t);
      else audioEngine.playSnare(false, t);
    } else if (progress < 0.35) audioEngine.playSnare(i === 0, t);
    else if (progress < 0.65) audioEngine.playTom('high', t);
    else if (progress < 0.85) audioEngine.playTom('mid', t);
    else audioEngine.playTom('low', t);
  }
  audioEngine.playCrash(start + notes * step);
  audioEngine.playKick(start + notes * step);
}

export async function previewPlayAlongVariation(variation: PlayAlongVariation, bpm: number): Promise<void> {
  const ctx = await audioEngine.ensureAudioContextReady();
  if (!ctx) return;

  switch (variation.id) {
    case 'base-groove':
      playBaseGroove(ctx, bpm, false);
      return;
    case 'kick-var':
      playBaseGroove(ctx, bpm, true);
      return;
    case 'quarter-fill':
      playFill(ctx, bpm, 1);
      return;
    case '8th-fill':
      playFill(ctx, bpm, 2);
      return;
    case '16th-fill':
      playFill(ctx, bpm, 4);
      return;
    case 'single-stroke-fill':
      playFill(ctx, bpm, 4, 'single');
      return;
    case 'double-stroke-fill':
      playFill(ctx, bpm, 4, 'double');
      return;
    case 'paradiddle-fill':
      playFill(ctx, bpm, 4, 'paradiddle');
      return;
    case 'dynamic-lift': {
      playBaseGroove(ctx, bpm, false);
      const beat = 60 / bpm;
      audioEngine.playHiHatOpen(ctx.currentTime + 0.06 + 3.5 * beat);
      return;
    }
    case 'no-fill':
    case 'pulse-only': {
      const beat = 60 / bpm;
      const start = ctx.currentTime + 0.06;
      for (let i = 0; i < 4; i += 1) audioEngine.playHiHatClosed(start + i * beat);
      return;
    }
    case '8th-count': {
      const eighth = 60 / bpm / 2;
      const start = ctx.currentTime + 0.06;
      for (let i = 0; i < 8; i += 1) audioEngine.playHiHatClosed(start + i * eighth);
      return;
    }
    default:
      if (variation.kind === 'groove') playBaseGroove(ctx, bpm, false);
      else if (variation.kind === 'fill' || variation.kind === 'rudiment') playFill(ctx, bpm, 2);
      else {
        const beat = 60 / bpm;
        const start = ctx.currentTime + 0.06;
        for (let i = 0; i < 4; i += 1) audioEngine.playClap(start + i * beat, i === 0 ? 1.2 : 0.8);
      }
  }
}
