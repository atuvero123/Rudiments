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
  /** C11 tutor/student ownership for the current bar. */
  activeTurn?: 'TUTOR' | 'LEARNER' | 'NONE';
  /** C12 transport state: position is preserved while the audio clock is suspended. */
  isPaused?: boolean;
}

export interface PlayAlongTransportCallbacks {
  onSnapshot?: (snapshot: PlayAlongTransportSnapshot) => void;
  onSectionChange?: (section: PlayAlongSection, sectionIndex: number) => void;
  onComplete?: () => void;
  onTurnChange?: (turn: 'TUTOR' | 'LEARNER' | 'NONE') => void;
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

function createNoiseBurst(
  ctx: AudioContext,
  destination: AudioNode,
  when: number,
  duration: number,
  gainValue: number,
  highpassHz = 900
) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(highpassHz, when);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.0002, gainValue), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter).connect(gain).connect(destination);
  source.start(when);
  source.stop(when + duration + 0.01);
}

function createTutorKick(ctx: AudioContext, destination: AudioNode, when: number, gainValue = 0.13) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(115, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.12);
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + 0.26);
}

function createTutorSnare(ctx: AudioContext, destination: AudioNode, when: number, accent = false) {
  createNoiseBurst(ctx, destination, when, 0.13, accent ? 0.11 : 0.085, 1100);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(190, when);
  gain.gain.setValueAtTime(accent ? 0.055 : 0.038, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + 0.13);
}

function createTutorHat(ctx: AudioContext, destination: AudioNode, when: number, open = false) {
  createNoiseBurst(ctx, destination, when, open ? 0.18 : 0.055, open ? 0.033 : 0.024, 5200);
}

function createTutorTom(ctx: AudioContext, destination: AudioNode, when: number, frequency: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.72), when + 0.13);
  gain.gain.setValueAtTime(0.075, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + 0.22);
}

function createTutorCrash(ctx: AudioContext, destination: AudioNode, when: number) {
  createNoiseBurst(ctx, destination, when, 0.55, 0.055, 2600);
}

function chordBassFrequency(chord: string): number {
  const root = CHORDS[chord]?.[0] || CHORDS.C[0];
  return root / 4;
}

function authoredFillStartBeat(fill: string): number {
  // BEAT_4_EIGHTHS is retained for data compatibility, but the teaching
  // transport now expands it into a clearer two-beat transition phrase.
  if (fill === 'BEAT_4_EIGHTHS') return 3;
  if (fill === 'TWO_BEAT_BUILD') return 3;
  if (fill === 'BEAT_4_SIXTEENTHS') return 4;
  return 5;
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
  private isPaused = false;
  private hasStarted = false;
  private startTime = 0;
  private pausedOffsetSeconds = 0;
  private pausePromise: Promise<void> | null = null;
  private animationFrame = 0;
  private lastSnapshot: PlayAlongTransportSnapshot | null = null;
  private scheduledThroughBar = -1;
  private lastSectionIndex = -1;
  private lastAnnouncedBar = 0;
  private speechEnabled = true;
  // C11 tutor/student handoff controls. Backing accompaniment always continues.
  private tutorDrumsEnabled = false;
  private tutorBars = 0;
  private learnerBars = 0;
  private lastTurn: 'TUTOR' | 'LEARNER' | 'NONE' = 'NONE';
  private lastTransitionAnnouncementKey = '';

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
    this.lastTurn = 'NONE';
    this.lastTransitionAnnouncementKey = '';
    this.lastSnapshot = null;
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

  setTutorHandoff(config: { enabled: boolean; tutorBars?: number; learnerBars?: number }) {
    this.tutorDrumsEnabled = config.enabled;
    this.tutorBars = Math.max(0, Math.floor(config.tutorBars || 0));
    this.learnerBars = Math.max(0, Math.floor(config.learnerBars || 0));
    this.lastTurn = 'NONE';
  }

  private turnForBar(barIndex: number): 'TUTOR' | 'LEARNER' | 'NONE' {
    if (!this.tutorDrumsEnabled) return this.learnerBars > 0 ? 'LEARNER' : 'NONE';
    if (this.tutorBars <= 0) return 'LEARNER';
    if (this.learnerBars <= 0) return 'TUTOR';
    const cycle = this.tutorBars + this.learnerBars;
    const position = barIndex % cycle;
    return position < this.tutorBars ? 'TUTOR' : 'LEARNER';
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

  private scheduleTutorDrums(barIndex: number, bar: FlatBar, barStart: number, beatDur: number, beats: number) {
    if (!this.ctx || !this.masterGain) return;
    if (this.turnForBar(barIndex) !== 'TUTOR') return;

    const energy = bar.section.energy;
    const guide = bar.section.drumGuide;
    const isFourFour = this.track.meter === '4/4';
    const isFirstBarOfSection = bar.barInSection === 1;
    const isLastBarOfSection = bar.barInSection === bar.section.bars;

    if (isFourFour && guide) {
      const fill = isLastBarOfSection ? (guide.exitFill || 'NONE') : 'NONE';
      const fillStartBeat = authoredFillStartBeat(fill);
      const fillStartOffset = (fillStartBeat - 1) * beatDur;

      if (isFirstBarOfSection && guide.entryCrash) {
        createTutorCrash(this.ctx, this.masterGain, barStart);
      }

      // Once the transition fill begins, the normal groove yields completely.
      // This prevents the fill from being masked by hats/kicks/snares at the
      // same timestamps and makes the transition readable by ear.
      if (guide.timekeeper === 'RIDE_QUARTERS') {
        for (let beat = 0; beat < 4; beat += 1) {
          if (barStart + beat * beatDur < barStart + fillStartOffset) {
            createTutorHat(this.ctx, this.masterGain, barStart + beat * beatDur, true);
          }
        }
      } else {
        const open = guide.timekeeper === 'OPEN_HAT_8THS' || guide.timekeeper === 'RIDE_8THS';
        for (let eighth = 0; eighth < 8; eighth += 1) {
          const when = barStart + eighth * (beatDur / 2);
          if (when < barStart + fillStartOffset) {
            createTutorHat(this.ctx, this.masterGain, when, open && eighth % 2 === 1);
          }
        }
      }

      guide.kickPositions.forEach((position) => {
        const when = barStart + (position - 1) * beatDur;
        if (when < barStart + fillStartOffset) {
          createTutorKick(this.ctx!, this.masterGain!, when, 0.11 + energy * 0.007);
        }
      });
      guide.snarePositions.forEach((position) => {
        const when = barStart + (position - 1) * beatDur;
        if (when < barStart + fillStartOffset) {
          createTutorSnare(this.ctx!, this.masterGain!, when, energy >= 3);
        }
      });

      if (isLastBarOfSection) {
        if (fill === 'BEAT_4_EIGHTHS') {
          // Preserve the authored identifier but give it a real musical window:
          // four clear eighth-note events across beats 3–4.
          createTutorSnare(this.ctx, this.masterGain, barStart + 2 * beatDur, true);
          createTutorTom(this.ctx, this.masterGain, barStart + 2.5 * beatDur, 150);
          createTutorSnare(this.ctx, this.masterGain, barStart + 3 * beatDur, true);
          createTutorTom(this.ctx, this.masterGain, barStart + 3.5 * beatDur, 105);
        } else if (fill === 'BEAT_4_SIXTEENTHS') {
          const fillStart = barStart + 3 * beatDur;
          [190, 165, 135, 105].forEach((freq, i) =>
            createTutorTom(this.ctx!, this.masterGain!, fillStart + i * beatDur * 0.25, freq)
          );
        } else if (fill === 'TWO_BEAT_BUILD') {
          const fillStart = barStart + 2 * beatDur;
          [200, 185, 170, 150, 135, 120, 105, 90].forEach((freq, i) =>
            createTutorTom(this.ctx!, this.masterGain!, fillStart + i * beatDur * 0.25, freq)
          );
        }
      }
      return;
    }

    if (isFirstBarOfSection && energy >= 3) {
      createTutorCrash(this.ctx, this.masterGain, barStart);
      createTutorKick(this.ctx, this.masterGain, barStart, 0.15);
    }

    if (isFourFour) {
      // Fallback for legacy play-along tracks that do not yet carry an authored guide.
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const when = barStart + eighth * (beatDur / 2);
        const open = energy >= 4 && eighth === 7;
        createTutorHat(this.ctx, this.masterGain, when, open);
      }
      [0, 2].forEach((beat) => createTutorKick(this.ctx!, this.masterGain!, barStart + beat * beatDur, 0.11 + energy * 0.007));
      if (energy >= 3) createTutorKick(this.ctx, this.masterGain, barStart + 2.5 * beatDur, 0.095);
      [1, 3].forEach((beat) => createTutorSnare(this.ctx!, this.masterGain!, barStart + beat * beatDur, energy >= 3));

      const transitionNeedsFill = isLastBarOfSection && ['SHORT_FILL', 'BUILD', 'FREE'].includes(bar.section.transitionCue);
      if (transitionNeedsFill) {
        const fillStart = barStart + 3 * beatDur;
        createTutorSnare(this.ctx, this.masterGain, fillStart, true);
        createTutorTom(this.ctx, this.masterGain, fillStart + beatDur * 0.25, 190);
        createTutorTom(this.ctx, this.masterGain, fillStart + beatDur * 0.5, 145);
        createTutorTom(this.ctx, this.masterGain, fillStart + beatDur * 0.75, 105);
      }
      return;
    }

    // 6/8 tutor fallback: two-pulse feel with flowing subdivision.
    for (let beat = 0; beat < beats; beat += 1) {
      const when = barStart + beat * beatDur;
      createTutorHat(this.ctx, this.masterGain, when, false);
    }
    createTutorKick(this.ctx, this.masterGain, barStart, 0.12);
    createTutorSnare(this.ctx, this.masterGain, barStart + 3 * beatDur, energy >= 3);
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


    this.scheduleTutorDrums(barIndex, bar, barStart, beatDur, beats);
  }

  private cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speak(text: string) {
    if (!this.speechEnabled || this.coachMode !== 'GUIDED') return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      this.cancelSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.08;
      utterance.pitch = 1;
      // Keep coaching clearly underneath the drum event it is describing.
      utterance.volume = 0.52;
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
      // The detailed coaching note remains visible in the UI; keep speech short
      // so it cannot run over an important transition.
      this.speak(section.name);
    }
  }

  async start() {
    // C12: Pause no longer destroys the AudioContext. Suspending the Web Audio
    // clock freezes already-scheduled backing/tutor notes in place, so Resume
    // can continue from the exact bar/beat instead of rebuilding a graph with
    // timestamps that are already in the past (the C11 mobile-Chrome failure).
    const ctx = this.ensureAudio();

    if (this.pausePromise) {
      try {
        await this.pausePromise;
      } catch {
        // Resume below still attempts to recover the context.
      } finally {
        this.pausePromise = null;
      }
    }

    if (ctx.state === 'suspended') await ctx.resume();
    if (this.isRunning) return;

    if (!this.hasStarted) {
      this.startTime = ctx.currentTime;
      this.hasStarted = true;
      this.pausedOffsetSeconds = 0;
      this.scheduledThroughBar = -1;
      this.lastSectionIndex = -1;
      this.lastAnnouncedBar = 0;
      this.lastTransitionAnnouncementKey = '';
      this.lastTurn = 'NONE';
    }

    this.isPaused = false;
    this.isRunning = true;
    this.loop();
  }

  pause() {
    if (!this.isRunning || !this.ctx) return;

    this.isRunning = false;
    this.isPaused = true;
    cancelAnimationFrame(this.animationFrame);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const ctx = this.ctx;
    // Suspending freezes ctx.currentTime and every scheduled source. This is the
    // core resume invariant: no new graph, no guessed offset, no dead scheduler.
    this.pausePromise = ctx.suspend().then(() => {
      this.pausedOffsetSeconds = Math.max(0, ctx.currentTime - this.startTime);
    }).catch(() => {
      // Some browsers may already have suspended the context. Preserve the
      // elapsed position and let the next user gesture call ctx.resume().
      this.pausedOffsetSeconds = Math.max(0, ctx.currentTime - this.startTime);
    }).then(() => undefined);

    if (this.lastSnapshot) {
      const pausedSnapshot: PlayAlongTransportSnapshot = {
        ...this.lastSnapshot,
        isRunning: false,
        isPaused: true,
      };
      this.lastSnapshot = pausedSnapshot;
      this.callbacks.onSnapshot?.(pausedSnapshot);
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.hasStarted = false;
    this.startTime = 0;
    this.pausedOffsetSeconds = 0;
    this.pausePromise = null;
    this.scheduledThroughBar = -1;
    this.lastSectionIndex = -1;
    this.lastAnnouncedBar = 0;
    this.lastTurn = 'NONE';
    this.lastTransitionAnnouncementKey = '';
    this.lastSnapshot = null;
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
      this.isPaused = false;
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

    const activeTurn = this.turnForBar(currentBarIndex);
    if (activeTurn !== this.lastTurn) {
      this.lastTurn = activeTurn;
      this.callbacks.onTurnChange?.(activeTurn);
    }

    // C12 explicit transition coaching. The authored guide already determines
    // the actual tutor fill; this cue makes the musical event impossible to
    // miss while guided support is enabled.
    const exitFill = bar.section.drumGuide?.exitFill || 'NONE';
    const isLastSectionBar = bar.barInSection === bar.section.bars;
    const fillStartsBeat = authoredFillStartBeat(exitFill);
    const fillIsStarting = isLastSectionBar && exitFill !== 'NONE' && beatIndex + 1 === fillStartsBeat;
    const fillIsActive = isLastSectionBar && exitFill !== 'NONE' && beatIndex + 1 >= fillStartsBeat;

    if (isLastSectionBar && exitFill !== 'NONE' && beatIndex + 1 === Math.max(1, fillStartsBeat - 1)) {
      const key = `${bar.section.id}:${bar.absoluteBar}:${exitFill}:lead`;
      if (key !== this.lastTransitionAnnouncementKey) {
        this.lastTransitionAnnouncementKey = key;
        const words = exitFill === 'TWO_BEAT_BUILD'
          ? 'Fill starts on three. Build through four. Land on one.'
          : exitFill === 'BEAT_4_SIXTEENTHS'
          ? 'Fill on four. Four even notes. Land on one.'
          : 'Fill starts on four. Four clear hits. Land on one.';
        this.speak(words);
      }
    }

    // Speech must never sit on top of the fill. Cancel it at the first fill beat
    // so the tutor drum event remains the dominant cue.
    if (fillIsStarting && fillIsActive) {
      this.cancelSpeech();
    }

    const nextSnapshot: PlayAlongTransportSnapshot = {
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
      activeTurn,
      isPaused: false,
    };
    this.lastSnapshot = nextSnapshot;
    this.callbacks.onSnapshot?.(nextSnapshot);

    this.animationFrame = requestAnimationFrame(this.loop);
  };
}

export function getTotalPlayAlongBars(track: PlayAlongTrack): number {
  return track.sections.reduce((sum, section) => sum + section.bars, 0);
}
