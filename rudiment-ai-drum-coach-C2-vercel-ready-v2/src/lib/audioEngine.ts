// Web Audio API Engine for Metronome, Tempo Ladder, and Synthesized Drum Pads

class AudioEngine {
  private ctx: AudioContext | null = null;
  private metronomeTimer: number | null = null;
  private currentBeat = 0;
  private totalBeatsInBar = 4;
  private bpm = 80;
  private subdivision = 1; // 1 = Quarter notes, 2 = 8th notes, 4 = 16th notes, 3 = Triplets
  private isRunning = false;
  private onBeatCallback: ((beat: number, currentBpm: number) => void) | null = null;

  // Cached Audio Buffers for Zero-Allocation Playback
  private snareNoiseBuffer: AudioBuffer | null = null;
  private hihatClosedNoiseBuffer: AudioBuffer | null = null;
  private hihatOpenNoiseBuffer: AudioBuffer | null = null;
  private crashNoiseBuffer: AudioBuffer | null = null;
  private rideNoiseBuffer: AudioBuffer | null = null;
  private padTapNoiseBuffer: AudioBuffer | null = null;
  private clapNoiseBuffer: AudioBuffer | null = null;

  // Tempo ladder mode state
  private isLadderMode = false;
  private ladderStartBpm = 60;
  private ladderStepBpm = 10;
  private ladderMaxBpm = 100;
  private ladderBarsPerStep = 4;
  private barsCompletedInStep = 0;
  private onLadderStepCallback: ((newBpm: number) => void) | null = null;

  public initCtx(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.prewarmBuffers();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn('[AudioEngine] Context resume error:', err));
    }
    return this.ctx;
  }

  public async ensureAudioContextReady(): Promise<AudioContext | null> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.prewarmBuffers();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('[AudioEngine] Context resume error:', err);
      }
    }
    return this.ctx;
  }

  public ensureReady(): void {
    this.initCtx();
  }

  private prewarmBuffers() {
    if (!this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate || 44100;

      // 1. Snare Noise (0.2s)
      const snareLen = Math.floor(sampleRate * 0.2);
      this.snareNoiseBuffer = this.ctx.createBuffer(1, snareLen, sampleRate);
      const snareData = this.snareNoiseBuffer.getChannelData(0);
      for (let i = 0; i < snareLen; i++) snareData[i] = Math.random() * 2 - 1;

      // 2. Closed Hi-Hat Noise (0.05s)
      const hhClosedLen = Math.floor(sampleRate * 0.05);
      this.hihatClosedNoiseBuffer = this.ctx.createBuffer(1, hhClosedLen, sampleRate);
      const hhCData = this.hihatClosedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < hhClosedLen; i++) hhCData[i] = Math.random() * 2 - 1;

      // 3. Open Hi-Hat Noise (0.3s)
      const hhOpenLen = Math.floor(sampleRate * 0.3);
      this.hihatOpenNoiseBuffer = this.ctx.createBuffer(1, hhOpenLen, sampleRate);
      const hhOData = this.hihatOpenNoiseBuffer.getChannelData(0);
      for (let i = 0; i < hhOpenLen; i++) hhOData[i] = Math.random() * 2 - 1;

      // 4. Crash Cymbal Noise (1.2s)
      const crashLen = Math.floor(sampleRate * 1.2);
      this.crashNoiseBuffer = this.ctx.createBuffer(1, crashLen, sampleRate);
      const crashData = this.crashNoiseBuffer.getChannelData(0);
      for (let i = 0; i < crashLen; i++) crashData[i] = Math.random() * 2 - 1;

      // 5. Ride Cymbal Noise (0.6s)
      const rideLen = Math.floor(sampleRate * 0.6);
      this.rideNoiseBuffer = this.ctx.createBuffer(1, rideLen, sampleRate);
      const rideData = this.rideNoiseBuffer.getChannelData(0);
      for (let i = 0; i < rideLen; i++) rideData[i] = Math.random() * 2 - 1;

      // 6. Pad Tap Noise (0.04s)
      const padLen = Math.floor(sampleRate * 0.04);
      this.padTapNoiseBuffer = this.ctx.createBuffer(1, padLen, sampleRate);
      const padData = this.padTapNoiseBuffer.getChannelData(0);
      for (let i = 0; i < padLen; i++) padData[i] = Math.random() * 2 - 1;

      // 7. Clap Noise (0.15s)
      const clapLen = Math.floor(sampleRate * 0.15);
      this.clapNoiseBuffer = this.ctx.createBuffer(1, clapLen, sampleRate);
      const clapData = this.clapNoiseBuffer.getChannelData(0);
      for (let i = 0; i < clapLen; i++) clapData[i] = Math.random() * 2 - 1;
    } catch (e) {
      console.warn('[AudioEngine] Buffer prewarming warning:', e);
    }
  }

  // --- METRONOME ---
  public startMetronome(
    bpm: number,
    beatsInBar: number = 4,
    subdivision: number = 1,
    onBeat?: (beat: number, currentBpm: number) => void,
    ladderConfig?: {
      startBpm: number;
      stepBpm: number;
      maxBpm: number;
      barsPerStep: number;
      onStep?: (newBpm: number) => void;
    }
  ) {
    this.initCtx();
    this.stopMetronome();

    this.bpm = bpm;
    this.totalBeatsInBar = beatsInBar;
    this.subdivision = subdivision;
    this.currentBeat = 0;
    this.isRunning = true;
    this.onBeatCallback = onBeat || null;

    if (ladderConfig) {
      this.isLadderMode = true;
      this.ladderStartBpm = ladderConfig.startBpm;
      this.bpm = ladderConfig.startBpm;
      this.ladderStepBpm = ladderConfig.stepBpm;
      this.ladderMaxBpm = ladderConfig.maxBpm;
      this.ladderBarsPerStep = ladderConfig.barsPerStep;
      this.barsCompletedInStep = 0;
      this.onLadderStepCallback = ladderConfig.onStep || null;
    } else {
      this.isLadderMode = false;
    }

    this.scheduleNextTick();
  }

  public stopMetronome() {
    this.isRunning = false;
    if (this.metronomeTimer) {
      window.clearTimeout(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(300, newBpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduleNextTick = () => {
    if (!this.isRunning || !this.ctx) return;

    const totalSubdivisions = this.totalBeatsInBar * this.subdivision;
    const isDownbeat = this.currentBeat === 0;
    const isQuarterNote = this.currentBeat % this.subdivision === 0;

    // Play metronome click
    this.playClick(isDownbeat ? 1200 : isQuarterNote ? 800 : 500, isDownbeat ? 0.8 : 0.4);

    if (this.onBeatCallback) {
      this.onBeatCallback(this.currentBeat, this.bpm);
    }

    // Advance beat counter
    this.currentBeat = (this.currentBeat + 1) % totalSubdivisions;

    // If completed a full bar
    if (this.currentBeat === 0) {
      if (this.isLadderMode) {
        this.barsCompletedInStep++;
        if (this.barsCompletedInStep >= this.ladderBarsPerStep) {
          this.barsCompletedInStep = 0;
          if (this.bpm < this.ladderMaxBpm) {
            this.bpm = Math.min(this.ladderMaxBpm, this.bpm + this.ladderStepBpm);
            this.playStepUpChime();
            if (this.onLadderStepCallback) {
              this.onLadderStepCallback(this.bpm);
            }
          }
        }
      }
    }

    // Interval in ms for subdivision
    // Quarter note interval in ms = (60 / bpm) * 1000
    // Subdivision interval = (60 / (bpm * subdivision)) * 1000
    const intervalMs = (60 / (this.bpm * this.subdivision)) * 1000;
    this.metronomeTimer = window.setTimeout(this.scheduleNextTick, intervalMs);
  };

  public playClick(freq: number, volume: number, time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.05);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playCountInClick(count: number, totalBeats: number = 4, time?: number) {
    this.initCtx();
    if (!this.ctx) return;
    const isOne = count === 1;
    // Count 1: 1500Hz crisp high click, 2-4: 950Hz solid metronome pulse
    const freq = isOne ? 1500 : 950;
    const vol = isOne ? 0.9 : 0.6;
    this.playClick(freq, vol, time);
  }

  private playStepUpChime() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public getAudioContext(): AudioContext | null {
    return this.initCtx();
  }

  public getAudioContextTime(): number {
    const ctx = this.initCtx();
    return ctx ? ctx.currentTime : 0;
  }

  // --- SYNTHESIZED DRUM SOUNDS ---

  public playKick(time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);

    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playSnare(accent: boolean = false, time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const vol = accent ? 1.0 : 0.5;

    // Body tone with crisp snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.09);
    oscGain.gain.setValueAtTime(vol * 0.75, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);

    // Snare wire noise with crisp highpass
    if (this.snareNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.snareNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.9, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.22);
    }
  }

  public playGhostSnare(time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const vol = 0.22;

    // Soft, delicate body tap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);
    oscGain.gain.setValueAtTime(vol * 0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

    // Subtle snare wire whisper
    if (this.snareNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.snareNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.09);
    }
  }

  public playClap(time?: number, volumeMultiplier: number = 1.0) {
    this.initCtx();
    if (!this.ctx) return;

    // Support caller passing volume as first arg if < 1.0 and current time is larger
    let t = time ?? this.ctx.currentTime;
    let volMul = volumeMultiplier;
    if (time !== undefined && time <= 1.0 && this.ctx.currentTime > 2.0) {
      volMul = time;
      t = this.ctx.currentTime;
    }

    const vol = 0.85 * volMul;

    // Distinct multi-click handclap synthesis (3 micro-transients spaced 10ms apart)
    const offsets = [0, 0.011, 0.022];
    offsets.forEach((offset, idx) => {
      const clickTime = t + offset;
      const isTail = idx === offsets.length - 1;

      if (this.clapNoiseBuffer || this.snareNoiseBuffer) {
        const noise = this.ctx!.createBufferSource();
        noise.buffer = this.clapNoiseBuffer || this.snareNoiseBuffer;

        // Bandpass filter centered at 1100Hz for fleshy acoustic palm clap
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1150, clickTime);
        filter.Q.setValueAtTime(1.8, clickTime);

        const gain = this.ctx!.createGain();
        const clickVol = isTail ? vol : vol * 0.55;
        const decay = isTail ? 0.12 : 0.025;

        gain.gain.setValueAtTime(clickVol, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        noise.start(clickTime);
        noise.stop(clickTime + decay);
      }
    });
  }

  /**
   * Speak count word using Web Speech Synthesis or vocal fallback
   */
  public speakCountWord(word: string, volume: number = 1.0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 1.4;
        utterance.pitch = 1.1;
        utterance.volume = Math.min(1.0, Math.max(0, volume));
        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        // Fallback to click
      }
    }
    this.playMetronomeClick(true);
  }

  public playHiHatClosed(time?: number) {
    this.initCtx();
    if (!this.ctx || !this.hihatClosedNoiseBuffer) return;

    const t = time ?? this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hihatClosedNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.05);
  }

  public playHiHatOpen(time?: number) {
    this.initCtx();
    if (!this.ctx || !this.hihatOpenNoiseBuffer) return;

    const t = time ?? this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hihatOpenNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.3);
  }

  public playTom(pitch: 'high' | 'mid' | 'low' = 'mid', time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const freqMap = { high: 180, mid: 130, low: 90 };
    const startFreq = freqMap[pitch];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.4, t + 0.25);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playCrash(time?: number) {
    this.initCtx();
    if (!this.ctx || !this.crashNoiseBuffer) return;

    const t = time ?? this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.crashNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4500;
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 1.2);
  }

  public playRide(time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;

    // 1. Dual metallic ping harmonics (860Hz & 1820Hz) for authentic bronze bell/bow ping
    const pingFreqs = [860, 1820];
    pingFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gainVal = idx === 0 ? 0.45 : 0.25;
      oscGain.gain.setValueAtTime(gainVal, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });

    // 2. Subtle cymbal metal wash (bandpass filtered noise, not closed hat!)
    if (this.rideNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.rideNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4600, t);
      filter.Q.setValueAtTime(1.6, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.55);
    }
  }

  // --- PRACTICE PAD SIMULATION SOUNDS ---
  public playPadTap(
    accent: boolean = false,
    zone: 'center' | 'left_zone' | 'right_zone' | 'rim_edge' = 'center',
    time?: number
  ) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const vol = accent ? 0.9 : 0.45;

    if (zone === 'rim_edge') {
      // Sharp, high metallic rim click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

      gain.gain.setValueAtTime(vol * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
      return;
    }

    // Woody pad resonance tone
    const baseFreq = zone === 'left_zone' ? 320 : zone === 'right_zone' ? 360 : 280;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = accent ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + (accent ? 0.08 : 0.05));

    oscGain.gain.setValueAtTime(vol * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + (accent ? 0.09 : 0.06));

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    // Subtle surface tap noise from cached buffer
    if (this.padTapNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.padTapNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = zone === 'left_zone' ? 3500 : zone === 'right_zone' ? 3800 : 3000;
      filter.Q.value = 1.2;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.35, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.04);
    }
  }

  public playEventSound(
    role: string,
    surface: string,
    isAccented: boolean,
    isPad: boolean,
    time?: number
  ) {
    const t = time ?? this.getAudioContextTime();

    if (role === 'landing') {
      // Canonical C2 timelines may carry simultaneous surfaces such as
      // ['crash', 'kick']; masterTransport calls this method once per surface.
      // Route explicit landing voices individually so the pair is not doubled.
      const explicit = surface.toLowerCase();
      if (!isPad && explicit === 'crash') {
        this.playCrash(t);
        return;
      }
      if (!isPad && explicit === 'kick') {
        this.playKick(t);
        return;
      }

      // Legacy one-surface landing events keep the original combined anchor.
      if (isPad) {
        this.playPadTap(true, 'rim_edge', t);
        this.playKick(t);
      } else {
        this.playCrash(t);
        this.playKick(t);
      }
      return;
    }

    if (isPad) {
      this.playPadTap(isAccented, (surface as any) || 'center', t);
      return;
    }

    // Kit mode: route distinctly according to instrument type
    const s = surface.toLowerCase();
    if (s === 'crash') {
      this.playCrash(t);
    } else if (s === 'kick') {
      this.playKick(t);
    } else if (s === 'ride') {
      this.playRide(t);
    } else if (s === 'hihat_open' || s === 'open_hat' || s === 'open_hihat') {
      this.playHiHatOpen(t);
    } else if (s === 'hihat' || s === 'hihat_closed' || s === 'closed_hat' || s === 'hat') {
      this.playHiHatClosed(t);
    } else if (s === 'snare_ghost' || s === 'ghost_snare' || s === 'ghost') {
      this.playGhostSnare(t);
    } else if (s === 'clap') {
      this.playClap(t);
    } else if (s === 'tom_high' || s === 'high_tom') {
      this.playTom('high', t);
    } else if (s === 'tom_mid' || s === 'mid_tom') {
      this.playTom('mid', t);
    } else if (s === 'tom_floor' || s === 'floor_tom' || s === 'low_tom') {
      this.playTom('low', t);
    } else if (s === 'metronome') {
      this.playMetronomeClick(isAccented, t);
    } else {
      // Default to snare
      this.playSnare(isAccented, t);
    }
  }

  /**
   * Universal instrument voice trigger used by Sound Check and tests.
   */
  public playInstrumentSound(voice: string, accent: boolean = false, time?: number) {
    const t = time ?? this.getAudioContextTime();
    const v = voice.toLowerCase();

    switch (v) {
      case 'kick':
      case 'bass_drum':
        this.playKick(t);
        break;
      case 'snare':
        this.playSnare(accent, t);
        break;
      case 'ghost_snare':
      case 'snare_ghost':
        this.playGhostSnare(t);
        break;
      case 'hihat_closed':
      case 'closed_hat':
      case 'hihat':
        this.playHiHatClosed(t);
        break;
      case 'hihat_open':
      case 'open_hat':
        this.playHiHatOpen(t);
        break;
      case 'tom_high':
      case 'high_tom':
      case 'tom1':
        this.playTom('high', t);
        break;
      case 'tom_mid':
      case 'mid_tom':
      case 'tom2':
        this.playTom('mid', t);
        break;
      case 'tom_floor':
      case 'floor_tom':
      case 'tom3':
        this.playTom('low', t);
        break;
      case 'crash':
        this.playCrash(t);
        break;
      case 'ride':
        this.playRide(t);
        break;
      case 'clap':
        this.playClap(t);
        break;
      case 'metronome':
        this.playMetronomeClick(accent, t);
        break;
      default:
        this.playPadTap(accent, 'center', t);
        break;
    }
  }

  public playMetronomeClick(accent: boolean = false, time?: number) {
    this.initCtx();
    if (!this.ctx) return;

    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1600 : 1000, t);

    gain.gain.setValueAtTime(accent ? 0.75 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const audioEngine = new AudioEngine();

