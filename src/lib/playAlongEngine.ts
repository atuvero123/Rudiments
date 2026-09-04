import { PlayAlongCoachMode, PlayAlongSection, PlayAlongTrack } from '../data/playAlongTracks';

export interface PlayAlongTransportSnapshot {
  isRunning: boolean;
  currentBar: number;
  totalBars: number;
  currentBeat: number;
  currentSectionIndex: number;
  currentSection: PlayAlongSection;
  barInSection: number;
  sectionBars: number;
  nextSectionName?: string;
  progress: number;
}

export interface PlayAlongTransportCallbacks {
  onSnapshot?: (snapshot: PlayAlongTransportSnapshot) => void;
  onSectionChange?: (section: PlayAlongSection, sectionIndex: number) => void;
  onComplete?: () => void;
}

interface FlatBar {
  absoluteBar: number;
  sectionIndex: number;
  section: PlayAlongSection;
  barInSection: number;
  chord: string;
}

const CHORDS: Record<string, number[]> = {
  C: [261.63, 329.63, 392.0],
  D: [293.66, 369.99, 440.0],
  E: [329.63, 415.3, 493.88],
  Em: [329.63, 392.0, 493.88],
  F: [349.23, 440.0, 523.25],
  'F#m': [369.99, 440.0, 554.37],
  G: [392.0, 493.88, 587.33],
  A: [440.0, 554.37, 659.25],
  Am: [440.0, 523.25, 659.25],
  Bm: [493.88, 587.33, 739.99],
};

function buildFlatBars(track: PlayAlongTrack): FlatBar[] {
  const bars: FlatBar[] = [];
  let absoluteBar = 1;
  track.sections.forEach((section, sectionIndex) => {
    for (let i = 0; i < section.bars; i += 1) {
      const progression = section.chordProgression.length ? section.chordProgression : ['C'];
      bars.push({
        absoluteBar,
        sectionIndex,
        section,
        barInSection: i + 1,
        chord: progression[i % progression.length],
      });
      absoluteBar += 1;
    }
  });
  return bars;
}

function createTone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  when: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), when + 0.035);
  gain.gain.setValueAtTime(Math.max(0.0002, gainValue * 0.86), Math.max(when + 0.04, when + duration - 0.12));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function createPluck(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  when: number,
  gainValue: number,
  duration = 0.22
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(Math.max(0.0002, gainValue), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function createClick(ctx: AudioContext, destination: AudioNode, when: number, accent: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(accent ? 1250 : 880, when);
  gain.gain.setValueAtTime(accent ? 0.06 : 0.035, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + 0.055);
}

function chordBassFrequency(chord: string): number {
  const root = CHORDS[chord]?.[0] || CHORDS.C[0];
  return root / 4;
}

export class PlayAlongTransport {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private track: PlayAlongTrack;
  private bars: FlatBar[];
  private callbacks: PlayAlongTransportCallbacks;
  private coachMode: PlayAlongCoachMode = 'GUIDED';
  private clickEnabled = true;
  private volume = 0.55;
  private isRunning = false;
  private startTime = 0;
  private pausedOffsetSeconds = 0;
  private animationFrame = 0;
  private scheduledThroughBar = -1;
  private lastSectionIndex = -1;
  private lastAnnouncedBar = 0;
  private speechEnabled = true;

  constructor(track: PlayAlongTrack, callbacks: PlayAlongTransportCallbacks = {}) {
    this.track = track;
    this.bars = buildFlatBars(track);
    this.callbacks = callbacks;
  }

  setTrack(track: PlayAlongTrack) {
    this.stop();
    this.track = track;
    this.bars = buildFlatBars(track);
    this.scheduledThroughBar = -1;
    this.lastSectionIndex = -1;
    this.lastAnnouncedBar = 0;
  }

  setCoachMode(mode: PlayAlongCoachMode) {
    this.coachMode = mode;
  }

  setClickEnabled(enabled: boolean) {
    this.clickEnabled = enabled;
  }

  setSpeechEnabled(enabled: boolean) {
    this.speechEnabled = enabled;
  }

  setVolume(value: number) {
    this.volume = Math.max(0.05, Math.min(1, value));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  private ensureAudio() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private beatDurationSeconds(): number {
    // In 6/8 the displayed BPM represents the dotted-quarter pulse (counts 1 and 4),
    // so each written eighth-note subdivision is one third of that pulse.
    return this.track.meter === '6/8' ? (60 / this.track.bpm) / 3 : 60 / this.track.bpm;
  }

  private beatsPerBar(): number {
    return this.track.meter === '6/8' ? 6 : 4;
  }

  private totalDurationSeconds(): number {
    return this.bars.length * this.beatsPerBar() * this.beatDurationSeconds();
  }

  private scheduleBar(barIndex: number) {
    if (!this.ctx || !this.masterGain) return;
    const bar = this.bars[barIndex];
    if (!bar) return;

    const beatDur = this.beatDurationSeconds();
    const beats = this.beatsPerBar();
    const barStart = this.startTime + barIndex * beats * beatDur;
    const chord = CHORDS[bar.chord] || CHORDS.C;
    const energy = bar.section.energy;
    const padGain = 0.018 + energy * 0.008;
    const barDuration = beats * beatDur;

    // Warm sustained pad: no drums, only harmonic accompaniment.
    chord.forEach((freq, i) => {
      createTone(
        this.ctx!,
        this.masterGain!,
        freq / (i === 0 ? 2 : 1),
        barStart,
        Math.max(0.6, barDuration * 0.96),
        padGain * (i === 0 ? 0.82 : 1),
        i === 1 ? 'sine' : 'triangle'
      );
    });

    // Bass landmarks. 4/4 = beat 1 + 3. 6/8 = beat 1 + 4.
    const bassBeats = this.track.meter === '6/8' ? [0, 3] : [0, 2];
    bassBeats.forEach((beatIndex) => {
      const when = barStart + beatIndex * beatDur;
      createTone(
        this.ctx!,
        this.masterGain!,
        chordBassFrequency(bar.chord),
        when,
        Math.min(beatDur * 1.3, 0.85),
        0.045 + energy * 0.008,
        'sine'
      );
    });

    // Soft harmonic pulse to make the backing track feel playable without inserting drums.
    for (let beat = 0; beat < beats; beat += 1) {
      const when = barStart + beat * beatDur;
      const root = chord[beat % chord.length] || chord[0];
      createPluck(this.ctx!, this.masterGain!, root * 2, when, 0.018 + energy * 0.004, 0.16);
      if (this.clickEnabled) {
        const accent = beat === 0 || (this.track.meter === '6/8' && beat === 3);
        createClick(this.ctx!, this.masterGain!, when, accent);
      }
    }
  }

  private speak(text: string) {
    if (!this.speechEnabled || this.coachMode !== 'GUIDED') return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Visual cues remain the baseline if speech synthesis is unavailable.
    }
  }

  private announceSection(section: PlayAlongSection, sectionIndex: number) {
    if (sectionIndex === this.lastSectionIndex) return;
    this.lastSectionIndex = sectionIndex;
    this.callbacks.onSectionChange?.(section, sectionIndex);
    if (this.coachMode === 'GUIDED') {
      this.speak(`${section.name}. ${section.coachingNote}`);
    }
  }

  async start() {
    const ctx = this.ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.isRunning) return;

    const remaining = Math.max(0, this.pausedOffsetSeconds);
    this.startTime = ctx.currentTime - remaining;
    this.isRunning = true;
    this.scheduledThroughBar = Math.floor(remaining / (this.beatsPerBar() * this.beatDurationSeconds())) - 1;
    this.loop();
  }

  pause() {
    if (!this.isRunning || !this.ctx) return;
    this.pausedOffsetSeconds = Math.max(0, this.ctx.currentTime - this.startTime);
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrame);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Close the current graph so notes scheduled slightly ahead do not keep sounding after Pause.
    const old = this.ctx;
    this.ctx = null;
    this.masterGain = null;
    old.close().catch(() => undefined);
  }

  stop() {
    this.isRunning = false;
    this.pausedOffsetSeconds = 0;
    this.scheduledThroughBar = -1;
    this.lastSectionIndex = -1;
    this.lastAnnouncedBar = 0;
    cancelAnimationFrame(this.animationFrame);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ctx) {
      const old = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      old.close().catch(() => undefined);
    }
  }

  private loop = () => {
    if (!this.isRunning || !this.ctx) return;

    const elapsed = Math.max(0, this.ctx.currentTime - this.startTime);
    const beatDur = this.beatDurationSeconds();
    const beatsPerBar = this.beatsPerBar();
    const barDur = beatsPerBar * beatDur;
    const totalDuration = this.totalDurationSeconds();

    if (elapsed >= totalDuration) {
      this.isRunning = false;
      this.pausedOffsetSeconds = 0;
      this.callbacks.onComplete?.();
      return;
    }

    const currentBarIndex = Math.min(this.bars.length - 1, Math.floor(elapsed / barDur));
    const bar = this.bars[currentBarIndex];
    const withinBar = elapsed - currentBarIndex * barDur;
    const beatIndex = Math.min(beatsPerBar - 1, Math.floor(withinBar / beatDur));

    // Schedule a short horizon. Scheduling whole bars keeps accompaniment stable on mobile.
    const scheduleAheadBars = 2;
    const horizon = Math.min(this.bars.length - 1, currentBarIndex + scheduleAheadBars);
    while (this.scheduledThroughBar < horizon) {
      this.scheduledThroughBar += 1;
      this.scheduleBar(this.scheduledThroughBar);
    }

    this.announceSection(bar.section, bar.sectionIndex);

    if (bar.absoluteBar !== this.lastAnnouncedBar) {
      this.lastAnnouncedBar = bar.absoluteBar;
    }

    this.callbacks.onSnapshot?.({
      isRunning: true,
      currentBar: bar.absoluteBar,
      totalBars: this.bars.length,
      currentBeat: beatIndex + 1,
      currentSectionIndex: bar.sectionIndex,
      currentSection: bar.section,
      barInSection: bar.barInSection,
      sectionBars: bar.section.bars,
      nextSectionName: this.track.sections[bar.sectionIndex + 1]?.name,
      progress: Math.max(0, Math.min(1, elapsed / totalDuration)),
    });

    this.animationFrame = requestAnimationFrame(this.loop);
  };
}

export function getTotalPlayAlongBars(track: PlayAlongTrack): number {
  return track.sections.reduce((sum, section) => sum + section.bars, 0);
}
