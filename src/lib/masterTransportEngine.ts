import {
  RhythmTimeline,
  RhythmEvent,
  InstructionMode,
  AssistanceLevel,
  TransportDiagnosticState,
  TransportDiagnosticLog,
  StartTraceDiagnostic,
  TeachingStage,
  CompetencyTeachingDefinition,
} from '../types';
import { audioEngine } from './audioEngine';

export type PhraseStage =
  | 'COUNT_IN'
  | 'GROOVE'
  | 'PREPARE'
  | 'FILL'
  | 'LAND'
  | 'RECOVER'
  | 'LEARNER_SPACE'
  | 'IDLE';

export type TransportStatus = 'idle' | 'arming' | 'count_in' | 'running' | 'paused' | 'stopped';

export interface TransportState {
  status: TransportStatus;
  bpm: number;
  currentBar: number;
  currentBeat: number;
  currentSubdivision: number;
  progressInPhrase: number; // 0.0 to 1.0
  phraseElapsedSeconds: number;
  totalPhraseDurationSeconds: number;
  activeEventIndex: number;
  activeEvent: RhythmEvent | null;
  phraseStage: PhraseStage;
  completedLoops: number;
  isCountIn: boolean;
  countInBeat: number; // 0 when not sounding, 1, 2, 3, 4 when sounding
  isIntentionalLearnerSpace: boolean;
  activeOwner: 'TUTOR' | 'LEARNER' | 'ENSEMBLE';
  ownershipTitle: string;
  ownershipSubtitle: string;
  lastLandingTimestamp: number | null;
  activeCountToken: string | null;
  activeSubdivisionHighlight: number;
  isCoachTurn: boolean;
  isLearnerTurn: boolean;
  voiceCountEnabled: boolean;
  clapEnabled: boolean;
  teachingStage: TeachingStage;
}

export interface MasterTransportConfig {
  timeline: RhythmTimeline;
  bpm: number;
  instructionMode: InstructionMode;
  assistanceLevel: AssistanceLevel;
  hasCountIn?: boolean;
  countInBars?: number; // 1 or 2 bars
  voiceCountEnabled?: boolean;
  clapEnabled?: boolean;
  isCoachThenYou?: boolean;
  teachingStage?: TeachingStage;
  teachingDefinition?: CompetencyTeachingDefinition | null;
  isPad?: boolean;
  loopLimit?: number; // Infinity or fixed count
  onLoopComplete?: (loopCount: number) => void;
  onStageChange?: (stage: PhraseStage) => void;
  onLandingReached?: (audioTime: number) => void;
  onLearnerSpaceStart?: (info: any) => void;
  onSubdivisionTick?: (countToken: string, subdivisionIndex: number, beat: number) => void;
}

export class MasterMusicalTransport {
  private static instance: MasterMusicalTransport | null = null;

  // Master Clock & Web Audio references
  private audioCtx: AudioContext | null = null;
  private intervalTimerId: any = null;
  private isRunning = false;
  private isPaused = false;
  private currentStatus: TransportStatus = 'idle';

  // Transport configuration
  private timeline: RhythmTimeline | null = null;
  private bpm: number = 80;
  private instructionMode: InstructionMode = 'WATCH';
  private assistanceLevel: AssistanceLevel = 'FULL';
  private hasCountIn: boolean = true;
  private countInBars: number = 1;
  private voiceCountEnabled: boolean = false;
  private clapEnabled: boolean = false;
  private isCoachThenYou: boolean = false;
  private teachingStage: TeachingStage = 'WATCH';
  private teachingDefinition: CompetencyTeachingDefinition | null = null;
  private isPad: boolean = false;
  private loopLimit: number = Infinity;

  // Real-time Visual Subdivision Tracking
  private activeCountToken: string | null = null;
  private activeSubdivisionHighlight: number = 0;

  // Authoritative Timing State (Single Shared Start Epoch)
  private transportStartTime: number = 0;
  private phraseStartTime: number = 0;
  private beatDuration: number = 60 / 80;
  private totalBeats: number = 8;
  private phraseDuration: number = 8 * (60 / 80);
  private countInDuration: number = 4 * (60 / 80);

  // Look-ahead Scheduler Horizon
  private lastScheduledAudioTime: number = 0;
  private readonly lookaheadIntervalMs: number = 25; // 25ms scheduler tick
  private readonly scheduleHorizonSeconds: number = 0.15; // 150ms look-ahead window

  // Event Map Scheduling State
  private currentLoopIndex: number = 0;
  private nextEventIndexToSchedule: number = 0;
  private scheduledCountInBeats: number = 0;

  // Callbacks
  private onLoopCompleteCb?: (loopCount: number) => void;
  private onStageChangeCb?: (stage: PhraseStage) => void;
  private onLandingReachedCb?: (audioTime: number) => void;
  private onLearnerSpaceStartCb?: (info: any) => void;
  private onSubdivisionTickCb?: (countToken: string, subdivisionIndex: number, beat: number) => void;

  // Diagnostics, Telemetry & Audit Trace
  private startTrace: StartTraceDiagnostic | null = null;
  private diagnosticLogs: TransportDiagnosticLog[] = [];
  private scheduledEventsCount: number = 0;
  private learnerSpaceRegionsCount: number = 0;
  private underrunsCount: number = 0;
  private lastEventDesc: string = '';
  private lastDetectedStage: PhraseStage = 'IDLE';
  private speechTimers: Set<number> = new Set();

  public static getInstance(): MasterMusicalTransport {
    if (!MasterMusicalTransport.instance) {
      MasterMusicalTransport.instance = new MasterMusicalTransport();
    }
    return MasterMusicalTransport.instance;
  }

  private constructor() {
    // Singleton
  }

  /**
   * Starts playback with an authoritative, shared audio-visual start epoch.
   * Resumes AudioContext asynchronously first, prewarms synthesis buffers,
   * establishes transportStartTime with a safe lookahead lead-in, and arms the scheduler.
   */
  public async start(config: MasterTransportConfig): Promise<void> {
    const buttonPressedAtMs = performance.now();

    // 1. Stop any currently active scheduler interval
    this.stop();

    // 2. Set status to ARMING immediately (visuals stay at rest in PREPARE state)
    this.currentStatus = 'arming';

    // 3. Ensure Audio Context is active and awaited (critical for mobile Chrome)
    const ctxBefore = audioEngine.initCtx();
    const audioContextStateBefore = ctxBefore?.state || 'none';

    const ctx = await audioEngine.ensureAudioContextReady();
    const audioContextResumedAtMs = performance.now();

    if (!ctx) {
      console.warn('[MasterMusicalTransport] Web Audio API is not available in this environment.');
      this.currentStatus = 'idle';
      return;
    }

    this.audioCtx = ctx;

    // 4. Apply Configuration
    this.timeline = config.timeline;
    this.bpm = Math.max(30, Math.min(240, config.bpm));
    this.instructionMode = config.instructionMode;
    this.assistanceLevel = config.assistanceLevel;
    this.hasCountIn = config.hasCountIn ?? true;
    this.countInBars = config.countInBars ?? 1;
    this.voiceCountEnabled = config.voiceCountEnabled ?? false;
    this.clapEnabled = config.clapEnabled ?? false;
    this.isCoachThenYou = config.isCoachThenYou ?? false;
    this.teachingStage = config.teachingStage ?? 'WATCH';
    this.teachingDefinition = config.teachingDefinition ?? null;
    this.isPad = config.isPad ?? false;
    this.loopLimit = config.loopLimit ?? Infinity;
    this.onLoopCompleteCb = config.onLoopComplete;
    this.onStageChangeCb = config.onStageChange;
    this.onLandingReachedCb = config.onLandingReached;
    this.onLearnerSpaceStartCb = config.onLearnerSpaceStart;
    this.onSubdivisionTickCb = config.onSubdivisionTick;

    // 5. Calculate Authoritative Musical Durations
    const beatsPerBar = this.timeline.beatsPerBar || 4;
    const totalBars = this.timeline.totalBars || 2;
    this.totalBeats = totalBars * beatsPerBar;
    this.beatDuration = 60 / this.bpm;
    this.phraseDuration = this.totalBeats * this.beatDuration;
    const totalCountInBeats = this.hasCountIn ? beatsPerBar * this.countInBars : 0;
    this.countInDuration = totalCountInBeats * this.beatDuration;

    // 6. Establish Single Authoritative Transport Start Epoch
    // 80ms safe lookahead buffer ensures initial Web Audio nodes are queued before physical deadline
    const safeLeadInSeconds = 0.080;
    const now = ctx.currentTime;
    this.transportStartTime = now + safeLeadInSeconds;
    this.phraseStartTime = this.transportStartTime + this.countInDuration;
    this.lastScheduledAudioTime = now;

    // 7. Initialize Start Trace Telemetry
    this.startTrace = {
      buttonPressedAtMs,
      audioContextStateBefore,
      audioContextResumedAtMs,
      transportStartAudioTime: this.transportStartTime,
      firstScheduledEventTime: 0,
      firstVisualRunningTime: 0,
      firstMetronomeExpectedTime: this.transportStartTime,
      visualStartDeltaMs: 0,
    };

    // 8. Reset Internal Trackers
    this.currentLoopIndex = 0;
    this.nextEventIndexToSchedule = 0;
    this.scheduledCountInBeats = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.lastDetectedStage = this.hasCountIn ? 'COUNT_IN' : 'GROOVE';

    this.logDiagnostic(
      'START',
      1,
      1,
      'transport',
      `Transport armed at ${this.bpm} BPM (Start Epoch: ${this.transportStartTime.toFixed(3)}s, Phrase Start: ${this.phraseStartTime.toFixed(3)}s)`,
      now
    );

    // 9. Launch Master Interval Clock (25ms lookahead)
    this.intervalTimerId = setInterval(() => {
      this.schedulerTick();
    }, this.lookaheadIntervalMs);

    // Initial immediate tick to pre-schedule upcoming notes
    this.schedulerTick();
  }

  /**
   * Pauses the transport.
   */
  public pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.currentStatus = 'paused';
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId);
      this.intervalTimerId = null;
    }
  }

  /**
   * Resumes playback from pause.
   */
  public async resume(): Promise<void> {
    if (!this.isRunning || !this.isPaused || !this.timeline) return;
    const ctx = await audioEngine.ensureAudioContextReady();
    if (!ctx) return;
    this.audioCtx = ctx;

    this.isPaused = false;
    this.currentStatus = 'running';
    const now = ctx.currentTime;
    this.phraseStartTime = now;
    this.lastScheduledAudioTime = now;
    this.nextEventIndexToSchedule = 0;

    this.intervalTimerId = setInterval(() => {
      this.schedulerTick();
    }, this.lookaheadIntervalMs);

    this.schedulerTick();
  }

  /**
   * Stops playback completely and resets all state.
   */
  public stop(): void {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId);
      this.intervalTimerId = null;
    }
    this.speechTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.speechTimers.clear();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Speech synthesis is optional; transport cleanup must remain safe.
      }
    }
    this.isRunning = false;
    this.isPaused = false;
    this.currentStatus = 'idle';
    this.lastDetectedStage = 'IDLE';
  }

  /**
   * Returns whether the transport is actively running.
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Seamlessly changes BPM without clock stutter or phase jumps.
   */
  public setBpm(newBpm: number): void {
    const clamped = Math.max(30, Math.min(240, newBpm));
    if (clamped === this.bpm) return;

    const ctx = this.audioCtx || audioEngine.initCtx();
    if (!ctx || !this.timeline) {
      this.bpm = clamped;
      return;
    }

    const now = ctx.currentTime;
    const oldPhraseDuration = this.phraseDuration;
    const currentElapsed = (now - this.phraseStartTime) % oldPhraseDuration;
    const normalizedPhase = currentElapsed / oldPhraseDuration;

    this.bpm = clamped;
    this.beatDuration = 60 / this.bpm;
    this.phraseDuration = this.totalBeats * this.beatDuration;

    // Reposition phraseStartTime to maintain current phase smoothly
    this.phraseStartTime = now - normalizedPhase * this.phraseDuration;
    this.lastScheduledAudioTime = now;

    this.logDiagnostic(
      'TEMPO_CHANGE',
      1,
      1,
      'tempo',
      `Tempo updated to ${this.bpm} BPM`,
      now
    );
  }

  /**
   * Updates Instruction Mode (WATCH, FOLLOW, PLAY) or Assistance Level dynamically.
   */
  public updateModeAndAssistance(mode: InstructionMode, assistance: AssistanceLevel): void {
    this.instructionMode = mode;
    this.assistanceLevel = assistance;
  }

  private speakToken(token: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      let text = token;
      if (text === '&') text = 'and';
      else if (text === 'e') text = 'ee';
      else if (text === 'a') text = 'uh';
      else if (text.toLowerCase() === 'trip') text = 'trip';
      else if (text.toLowerCase() === 'let') text = 'let';
      else if (text.startsWith('>')) text = text.substring(1);

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.45;
      utter.pitch = 1.05;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {
      // Spoken counting is an optional layer. The Web Audio clock remains authoritative.
    }
  }

  private scheduleSpeechToken(token: string, eventAudioTime: number): void {
    if (!this.voiceCountEnabled || !this.audioCtx) return;
    const delayMs = Math.max(0, (eventAudioTime - this.audioCtx.currentTime) * 1000);
    const timerId = window.setTimeout(() => {
      this.speechTimers.delete(timerId);
      this.speakToken(token);
    }, delayMs);
    this.speechTimers.add(timerId);
  }

  /**
   * Master Look-Ahead Scheduler Tick.
   * Runs every 25ms to look ahead 150ms into the Web Audio timeline.
   */
  private schedulerTick(): void {
    if (!this.isRunning || this.isPaused || !this.timeline || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const scheduleHorizon = now + this.scheduleHorizonSeconds;

    // Safety check for underruns
    if (this.lastScheduledAudioTime < now - 0.1) {
      this.underrunsCount++;
      this.logDiagnostic(
        'UNDERRUN_WARNING',
        1,
        1,
        'timing',
        `Lookahead underrun detected (${((now - this.lastScheduledAudioTime) * 1000).toFixed(0)}ms behind). Catching up.`,
        now
      );
      this.lastScheduledAudioTime = now;
    }

    // 1. Schedule Count-In Metronome Clicks if in count-in window
    if (this.hasCountIn && now < this.phraseStartTime) {
      const beatsPerBar = this.timeline.beatsPerBar || 4;
      const totalCountInBeats = beatsPerBar * this.countInBars;
      for (let beat = this.scheduledCountInBeats; beat < totalCountInBeats; beat++) {
        const beatTime = this.transportStartTime + beat * this.beatDuration;
        if (beatTime >= this.lastScheduledAudioTime && beatTime < scheduleHorizon) {
          const isAccent = (beat % beatsPerBar) === 0;
          audioEngine.playMetronomeClick(isAccent, beatTime);

          if (this.clapEnabled) {
            audioEngine.playClap(beatTime);
          }

          if (this.voiceCountEnabled && this.teachingStage !== 'PLAY' && this.instructionMode !== 'PLAY') {
            const countNum = (beat % beatsPerBar) + 1;
            this.scheduleSpeechToken(String(countNum), beatTime);
          }

          if (this.startTrace && !this.startTrace.firstScheduledEventTime) {
            this.startTrace.firstScheduledEventTime = beatTime;
          }

          this.scheduledCountInBeats = beat + 1;
        }
      }
    }

    // 2. Schedule Timeline Events
    const events = this.timeline.events;
    if (!events || events.length === 0) return;

    while (true) {
      // Calculate loop start time
      const loopStartTime = this.phraseStartTime + this.currentLoopIndex * this.phraseDuration;

      // Check loop limits
      if (this.currentLoopIndex >= this.loopLimit) {
        this.stop();
        if (this.onLoopCompleteCb) this.onLoopCompleteCb(this.currentLoopIndex);
        return;
      }

      if (this.nextEventIndexToSchedule < events.length) {
        const ev = events[this.nextEventIndexToSchedule];
        const eventAudioTime = loopStartTime + ev.timeOffsetInPhrase * this.phraseDuration;

        if (eventAudioTime < this.lastScheduledAudioTime) {
          // Event is in the past, advance index
          this.nextEventIndexToSchedule++;
          continue;
        }

        if (eventAudioTime <= scheduleHorizon) {
          // Event is within the lookahead window -> schedule it!
          this.scheduleSingleEvent(ev, eventAudioTime);

          if (this.startTrace && !this.startTrace.firstScheduledEventTime) {
            this.startTrace.firstScheduledEventTime = eventAudioTime;
          }

          this.nextEventIndexToSchedule++;
        } else {
          // Future events are outside horizon, break and wait for next tick
          break;
        }
      } else {
        // Phrase events completed for current loop, prepare next loop
        this.currentLoopIndex++;
        this.nextEventIndexToSchedule = 0;

        this.logDiagnostic(
          'LOOP_WRAP',
          1,
          1,
          'loop',
          `Wrapped to loop repetition ${this.currentLoopIndex + 1}`,
          now
        );

        if (this.onLoopCompleteCb) {
          this.onLoopCompleteCb(this.currentLoopIndex);
        }

        const nextLoopStartTime = this.phraseStartTime + this.currentLoopIndex * this.phraseDuration;
        if (nextLoopStartTime > scheduleHorizon) {
          break;
        }
      }
    }

    this.lastScheduledAudioTime = scheduleHorizon;
  }

  /**
   * Schedules a single musical or learner-space event on the Web Audio timeline.
   */
  private scheduleSingleEvent(ev: RhythmEvent, eventTime: number): void {
    const isLearnerSpace = ev.isLearnerSpace === true || ev.role === 'learner_space';
    const barsPerLoop = Math.max(1, this.timeline?.totalBars || 1);
    const absoluteBarIndex = this.currentLoopIndex * barsPerLoop + Math.max(0, ev.barNumber - 1);
    const isReducedLearnerBar =
      this.instructionMode === 'FOLLOW' &&
      this.assistanceLevel === 'REDUCED' &&
      absoluteBarIndex % 2 === 1;
    const isFullFollow =
      this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'FULL';

    // COUNT is a dedicated rhythmic-language stage: voice + clap + neutral pulse,
    // never the target drum demonstration. This keeps Count distinct from Watch.
    if (this.teachingStage === 'COUNT') {
      if (ev.subdivisionIndex === 0) {
        audioEngine.playMetronomeClick(ev.beatNumber === 1, eventTime);
      }
      if (this.clapEnabled) {
        audioEngine.playClap(eventTime, ev.isAccented ? 1.0 : 0.72);
      }
      if (this.voiceCountEnabled && ev.countLabel) {
        this.scheduleSpeechToken(ev.countLabel, eventTime);
      }
      if (this.onSubdivisionTickCb && ev.countLabel) {
        this.onSubdivisionTickCb(ev.countLabel, ev.subdivisionIndex, ev.beatNumber);
      }
      this.scheduledEventsCount++;
      return;
    }

    // 1. Intentional learner space. FULL Follow deliberately overrides legacy
    // learner-space silence so the drummer can play continuously WITH the tutor.
    // Reduced Follow owns the alternating-bar silence contract below instead.
    if (isLearnerSpace && !isFullFollow) {
      this.learnerSpaceRegionsCount++;
      this.logDiagnostic(
        'LEARNER_SPACE',
        ev.barNumber,
        ev.beatNumber,
        ev.role,
        `[LEARNER_SPACE] Intentional student space at Bar ${ev.barNumber} Beat ${ev.beatNumber}: ${ev.learnerSpaceInfo?.purpose || 'Silent practice'}`,
        eventTime
      );

      if (ev.subdivisionIndex === 0) {
        const isDownbeat = ev.beatNumber === 1;
        audioEngine.playMetronomeClick(isDownbeat, eventTime);
      }

      if (this.onLearnerSpaceStartCb && ev.subdivisionIndex === 0) {
        this.onLearnerSpaceStartCb(ev.learnerSpaceInfo);
      }
      return;
    }

    // REDUCED Follow is strict call-and-response: Tutor owns one complete bar,
    // learner owns the next complete bar. For one-bar exercises this alternates
    // on successive loops; for multi-bar phrases it alternates inside the phrase.
    if (isReducedLearnerBar) {
      if (ev.subdivisionIndex === 0) {
        audioEngine.playMetronomeClick(ev.beatNumber === 1, eventTime);
      }
      if (this.onLearnerSpaceStartCb && ev.subdivisionIndex === 0) {
        this.onLearnerSpaceStartCb({
          purpose: 'Reduced Follow response bar',
          expectedLearnerAction: 'Play the complete bar back from memory while the tutor stays silent.',
          durationBeats: this.timeline?.beatsPerBar || 4,
          isIntentionalSilence: true,
        });
      }
      return;
    }

    // 2. Check Coach-Then-You Turn Alternation
    // In Coach-Then-You:
    // Even loops (0, 2, 4...) = COACH TURN (Audible)
    // Odd loops (1, 3, 5...) = LEARNER TURN (Silent tutor phrase, metronome keeps time)
    const isLearnerTurnInCoachMode = this.isCoachThenYou && (this.currentLoopIndex % 2 === 1);

    if (isLearnerTurnInCoachMode) {
      if (ev.subdivisionIndex === 0) {
        audioEngine.playMetronomeClick(ev.beatNumber === 1, eventTime);
      }
      return;
    }

    // 3. Determine audibility based on InstructionMode and AssistanceLevel
    let isAudible = true;

    if (this.instructionMode === 'PLAY' || this.teachingStage === 'PLAY') {
      // In Independent Play mode, tutor is silent; metronome provides pulse on main beats
      isAudible = false;
      if (ev.subdivisionIndex === 0) {
        audioEngine.playMetronomeClick(ev.beatNumber === 1, eventTime);
      }
    } else if (this.instructionMode === 'FOLLOW') {
      if (this.assistanceLevel === 'MINIMAL') {
        // MINIMAL: Metronome/quarter-note pulse only; no tutor phrase demonstration.
        isAudible = false;
        if (ev.subdivisionIndex === 0) {
          audioEngine.playMetronomeClick(ev.beatNumber === 1, eventTime);
        }
      } else if (this.assistanceLevel === 'REDUCED') {
        // We arrive here only on Tutor bars. Play the COMPLETE target bar so the
        // learner hears a faithful model, then the next bar is entirely theirs.
        isAudible = true;
      } else {
        // FULL: continuous tutor pattern. The learner plays along in ensemble.
        isAudible = true;
      }
    } else {
      // WATCH / COUNT / UNDERSTAND mode: tutor audible demo
      isAudible = true;
    }

    // 4. Spoken Count Tutor Accompaniment
    if (this.voiceCountEnabled && this.teachingStage !== 'PLAY' && this.instructionMode !== 'PLAY') {
      if (ev.countLabel) {
        this.scheduleSpeechToken(ev.countLabel, eventTime);
      }
    }

    // 5. Clap Sound on Accents/Downbeats when enabled
    if (this.clapEnabled && (ev.isAccented || ev.subdivisionIndex === 0)) {
      audioEngine.playClap(eventTime);
    }

    // 6. Play Synth Audio Node
    if (isAudible) {
      const surfaces = ev.surfaces?.length ? ev.surfaces : [ev.surface];
      surfaces.forEach((surface) => {
        audioEngine.playEventSound(
          ev.role,
          surface,
          ev.isAccented,
          this.isPad,
          eventTime
        );
      });
    }

    // 7. Special Landing Event Trigger
    if (ev.role === 'landing') {
      this.logDiagnostic(
        'LANDING_REACHED',
        ev.barNumber,
        ev.beatNumber,
        ev.role,
        `[LANDING_REACHED] Downbeat Beat 1 arrival at Bar ${ev.barNumber} Beat ${ev.beatNumber}`,
        eventTime
      );
      if (this.onLandingReachedCb) {
        this.onLandingReachedCb(eventTime);
      }
    }

    if (this.onSubdivisionTickCb && ev.countLabel) {
      this.onSubdivisionTickCb(ev.countLabel, ev.subdivisionIndex, ev.beatNumber);
    }

    this.scheduledEventsCount++;
    this.lastEventDesc = `Bar ${ev.barNumber} Beat ${ev.beatNumber}.${ev.subdivisionIndex} (${ev.noteLabel})`;
  }

  /**
   * Returns current transport state for the visual rendering loop.
   * Visual progress is strictly bound to the physical acoustic sounding audio time.
   * If soundingAudioTime has not yet reached the transport start epoch,
   * the visual state remains strictly at rest in 'arming' / 'PREPARE'.
   */
  public getState(): TransportState {
    if (!this.isRunning || !this.audioCtx || !this.timeline) {
      return {
        status: this.isPaused ? 'paused' : 'idle',
        bpm: this.bpm,
        currentBar: 1,
        currentBeat: 0,
        currentSubdivision: 0,
        progressInPhrase: 0,
        phraseElapsedSeconds: 0,
        totalPhraseDurationSeconds: this.phraseDuration,
        activeEventIndex: -1,
        activeEvent: null,
        phraseStage: 'IDLE',
        completedLoops: 0,
        isCountIn: false,
        countInBeat: 0,
        isIntentionalLearnerSpace: false,
        activeOwner: 'TUTOR',
        ownershipTitle: 'TUTOR READY',
        ownershipSubtitle: 'Press Start to begin',
        lastLandingTimestamp: null,
        activeCountToken: null,
        activeSubdivisionHighlight: 0,
        isCoachTurn: true,
        isLearnerTurn: false,
        voiceCountEnabled: this.voiceCountEnabled,
        clapEnabled: this.clapEnabled,
        teachingStage: this.teachingStage,
      };
    }

    const now = this.audioCtx.currentTime;
    // Calculate physical acoustic sound time: AudioContext buffer output latency compensation
    const outputLatency = (this.audioCtx.outputLatency || 0) + (this.audioCtx.baseLatency || 0);
    const visualPhaseOffsetSeconds = outputLatency > 0 ? outputLatency : 0.035;
    const soundingAudioTime = Math.max(0, now - visualPhaseOffsetSeconds);

    // =========================================================================
    // 1. ARMING / PRE-START STAGE (Before first audible metronome or event)
    // =========================================================================
    if (soundingAudioTime < this.transportStartTime) {
      return {
        status: 'arming',
        bpm: this.bpm,
        currentBar: 1,
        currentBeat: 0,
        currentSubdivision: 0,
        progressInPhrase: 0,
        phraseElapsedSeconds: 0,
        totalPhraseDurationSeconds: this.phraseDuration,
        activeEventIndex: -1,
        activeEvent: null,
        phraseStage: 'PREPARE',
        completedLoops: 0,
        isCountIn: this.hasCountIn,
        countInBeat: 0,
        isIntentionalLearnerSpace: false,
        activeOwner: 'TUTOR',
        ownershipTitle: 'GET READY',
        ownershipSubtitle: 'Arming audio transport…',
        lastLandingTimestamp: null,
        activeCountToken: null,
        activeSubdivisionHighlight: 0,
        isCoachTurn: true,
        isLearnerTurn: false,
        voiceCountEnabled: this.voiceCountEnabled,
        clapEnabled: this.clapEnabled,
        teachingStage: this.teachingStage,
      };
    }

    // =========================================================================
    // 2. COUNT-IN STAGE (Metronome clicks 1, 2, 3, 4 are physically audible)
    // =========================================================================
    if (this.hasCountIn && soundingAudioTime < this.phraseStartTime) {
      // Record first visual running timestamp at the start epoch
      if (this.startTrace && !this.startTrace.firstVisualRunningTime) {
        this.startTrace.firstVisualRunningTime = soundingAudioTime;
        this.startTrace.visualStartDeltaMs = (soundingAudioTime - this.transportStartTime) * 1000;
      }

      const beatsPerBar = this.timeline.beatsPerBar || 4;
      const timeInCountIn = soundingAudioTime - this.transportStartTime;
      const countInBeat = Math.min(
        beatsPerBar * this.countInBars,
        Math.floor(timeInCountIn / this.beatDuration) + 1
      );
      const displayedBeat = ((countInBeat - 1) % beatsPerBar) + 1;

      return {
        status: 'count_in',
        bpm: this.bpm,
        currentBar: 1,
        currentBeat: 0,
        currentSubdivision: 0,
        progressInPhrase: 0,
        phraseElapsedSeconds: 0,
        totalPhraseDurationSeconds: this.phraseDuration,
        activeEventIndex: -1,
        activeEvent: null,
        phraseStage: 'COUNT_IN',
        completedLoops: 0,
        isCountIn: true,
        countInBeat: displayedBeat,
        isIntentionalLearnerSpace: false,
        activeOwner: 'TUTOR',
        ownershipTitle: 'COUNT-IN (GET READY)',
        ownershipSubtitle: `Count ${displayedBeat} of ${beatsPerBar} — Lock in ${this.bpm} BPM tempo`,
        lastLandingTimestamp: null,
        activeCountToken: String(displayedBeat),
        activeSubdivisionHighlight: 0,
        isCoachTurn: true,
        isLearnerTurn: false,
        voiceCountEnabled: this.voiceCountEnabled,
        clapEnabled: this.clapEnabled,
        teachingStage: this.teachingStage,
      };
    }

    // =========================================================================
    // 3. RUNNING MUSICAL PHRASE STAGE
    // =========================================================================
    if (this.startTrace && !this.startTrace.firstVisualRunningTime) {
      this.startTrace.firstVisualRunningTime = soundingAudioTime;
      this.startTrace.visualStartDeltaMs = (soundingAudioTime - this.phraseStartTime) * 1000;
    }

    const timeSincePhraseStart = Math.max(0, soundingAudioTime - this.phraseStartTime);
    const loopIndex = Math.floor(timeSincePhraseStart / this.phraseDuration);
    const phraseElapsed = timeSincePhraseStart % this.phraseDuration;
    const progressInPhrase = phraseElapsed / this.phraseDuration;

    // Calculate current musical bar and beat
    const beatsPerBar = this.timeline.beatsPerBar || 4;
    const currentGlobalBeat = progressInPhrase * this.totalBeats;
    const currentBar = Math.floor(currentGlobalBeat / beatsPerBar) + 1;
    const currentBeat = (Math.floor(currentGlobalBeat) % beatsPerBar) + 1;
    const barsPerLoop = Math.max(1, this.timeline.totalBars || 1);
    const absoluteBarIndex = loopIndex * barsPerLoop + Math.max(0, currentBar - 1);
    const isReducedLearnerBar =
      this.instructionMode === 'FOLLOW' &&
      this.assistanceLevel === 'REDUCED' &&
      absoluteBarIndex % 2 === 1;
    const isReducedTutorBar =
      this.instructionMode === 'FOLLOW' &&
      this.assistanceLevel === 'REDUCED' &&
      !isReducedLearnerBar;
    const activeSubdivisionCount = this.timeline.events?.[0]?.totalSubdivisionsInBeat || this.teachingDefinition?.subdivisionCount || 1;
    const currentSubdivision = Math.floor((currentGlobalBeat % 1) * activeSubdivisionCount);

    // Find active event aligned with physical audio output
    const events = this.timeline.events || [];
    let activeEventIndex = 0;
    let activeEvent: RhythmEvent | null = null;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evStart = ev.timeOffsetInPhrase * this.phraseDuration;
      const evEnd = evStart + (ev.durationFraction * this.phraseDuration);
      if (phraseElapsed >= evStart && phraseElapsed < evEnd) {
        activeEventIndex = i;
        activeEvent = ev;
        break;
      } else if (phraseElapsed >= evStart) {
        activeEventIndex = i;
        activeEvent = ev;
      }
    }

    // Determine current musical phrase stage
    let phraseStage: PhraseStage = 'GROOVE';
    const legacyLearnerSpace = activeEvent?.isLearnerSpace === true || activeEvent?.role === 'learner_space' || (this.timeline.hasLearnerSpace && currentBar === 2);
    const isLearnerSpace =
      isReducedLearnerBar ||
      (legacyLearnerSpace && !(this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'FULL'));

    if (isLearnerSpace) {
      phraseStage = 'LEARNER_SPACE';
    } else if (activeEvent?.role === 'landing' || (currentBar === 2 && currentBeat === 1)) {
      phraseStage = 'LAND';
    } else if (activeEvent?.role === 'fill' || (currentBar === 1 && currentBeat === (this.timeline.grooveSummary.includes('Beats 1–2') ? 3 : 4))) {
      phraseStage = 'FILL';
    } else if (currentBar === 1 && currentBeat === 3 && currentSubdivision >= 2 && !this.timeline.grooveSummary.includes('Beats 1–2')) {
      phraseStage = 'PREPARE';
    } else if (currentBar === 2) {
      phraseStage = 'RECOVER';
    } else {
      phraseStage = 'GROOVE';
    }

    if (phraseStage !== this.lastDetectedStage) {
      this.lastDetectedStage = phraseStage;
      if (this.onStageChangeCb) this.onStageChangeCb(phraseStage);
    }

    // Determine active owner & clear pedagogical ownership labels
    let activeOwner: 'TUTOR' | 'LEARNER' | 'ENSEMBLE' = 'TUTOR';
    let ownershipTitle = 'TUTOR DEMONSTRATION';
    let ownershipSubtitle = 'Observe placement timing and stick mechanics';

    // Check Coach-Then-You alternating loop state
    const isCoachThenYouLearnerTurn = this.isCoachThenYou && (loopIndex % 2 === 1);
    const isLearnerTurn =
      isCoachThenYouLearnerTurn ||
      isLearnerSpace ||
      isReducedLearnerBar ||
      this.instructionMode === 'PLAY' ||
      this.teachingStage === 'PLAY' ||
      (this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'FULL');
    const isCoachTurn =
      !isLearnerTurn ||
      isReducedTutorBar ||
      (this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'FULL');

    if (isCoachThenYouLearnerTurn) {
      activeOwner = 'LEARNER';
      ownershipTitle = 'YOUR TURN — PLAY IT!';
      ownershipSubtitle = 'Imitate the coach demonstration with steady rhythm';
    } else if (this.instructionMode === 'PLAY' || this.teachingStage === 'PLAY') {
      activeOwner = 'LEARNER';
      ownershipTitle = 'INDEPENDENT EXECUTION';
      ownershipSubtitle = 'Test your mastery with steady pulse. You provide the drumming.';
    } else if (this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'FULL') {
      activeOwner = 'ENSEMBLE';
      ownershipTitle = 'PLAY ALONG WITH TUTOR';
      ownershipSubtitle = 'The tutor plays every note. Match the sound, placement and dynamics in real time.';
    } else if (this.instructionMode === 'FOLLOW' && this.assistanceLevel === 'REDUCED') {
      activeOwner = isReducedLearnerBar ? 'LEARNER' : 'TUTOR';
      ownershipTitle = isReducedLearnerBar
        ? 'YOUR BAR — TUTOR SILENT'
        : 'TUTOR BAR — LISTEN & COPY';
      ownershipSubtitle = isReducedLearnerBar
        ? 'Play the complete bar from memory while only the metronome keeps time.'
        : 'Hear the complete target bar. Your matching response comes next.';
    } else if (isLearnerSpace) {
      activeOwner = 'LEARNER';
      ownershipTitle = 'YOUR TURN — PLAY THE PHRASE';
      ownershipSubtitle = activeEvent?.learnerSpaceInfo?.expectedLearnerAction || 'Execute matching phrase with steady metronome pulse';
    } else if (this.instructionMode === 'FOLLOW') {
      // MINIMAL
      activeOwner = 'LEARNER';
      ownershipTitle = phraseStage === 'FILL'
        ? 'OWN PHRASE — FILL OPPORTUNITY'
        : phraseStage === 'LAND'
        ? 'LAND ON 1: DOWNBEAT ANCHOR'
        : phraseStage === 'RECOVER'
        ? 'RECOVER — STEADY TIME'
        : 'KEEP THE PULSE (STEADY TIME)';
      ownershipSubtitle = 'Keep the pulse. Play the phrase from memory and land on 1.';
    } else {
      activeOwner = 'TUTOR';
      if (this.timeline.hasLearnerSpace) {
        ownershipTitle = `BAR 1: TUTOR DEMO (LISTEN)`;
        ownershipSubtitle = 'Observe dynamic accents (>R / >L) and relaxed double stroke spacing';
      } else {
        ownershipTitle = currentBar === 1
          ? phraseStage === 'FILL' ? 'TUTOR DEMO: FILL ENTRY (BEAT 4)' : 'TUTOR DEMO: GROOVE PULSE'
          : phraseStage === 'LAND' ? 'TUTOR DEMO: BEAT 1 CRASH LANDING' : 'TUTOR DEMO: GROOVE RECOVERY';
        ownershipSubtitle = 'Observe transition into fill, solid downbeat arrival, and return';
      }
    }


    return {
      status: this.isPaused ? 'paused' : 'running',
      bpm: this.bpm,
      currentBar,
      currentBeat,
      currentSubdivision,
      progressInPhrase,
      phraseElapsedSeconds: phraseElapsed,
      totalPhraseDurationSeconds: this.phraseDuration,
      activeEventIndex,
      activeEvent,
      phraseStage,
      completedLoops: loopIndex,
      isCountIn: false,
      countInBeat: 0,
      isIntentionalLearnerSpace: isLearnerSpace,
      activeOwner,
      ownershipTitle,
      ownershipSubtitle,
      lastLandingTimestamp: null,
      activeCountToken: activeEvent?.countLabel || null,
      activeSubdivisionHighlight: activeEvent?.subdivisionIndex ?? 0,
      isCoachTurn,
      isLearnerTurn,
      voiceCountEnabled: this.voiceCountEnabled,
      clapEnabled: this.clapEnabled,
      teachingStage: this.teachingStage,
    };
  }

  public setVoiceCountEnabled(enabled: boolean): void {
    this.voiceCountEnabled = enabled;
  }

  public setClapEnabled(enabled: boolean): void {
    this.clapEnabled = enabled;
  }

  public setCoachThenYou(enabled: boolean): void {
    this.isCoachThenYou = enabled;
  }

  public setTeachingStage(stage: TeachingStage): void {
    this.teachingStage = stage;
    if (stage === 'PLAY') {
      this.voiceCountEnabled = false;
    }
  }

  public setCountInBars(bars: number): void {
    this.countInBars = Math.max(1, Math.min(4, bars));
  }

  public getTeachingStage(): TeachingStage {
    return this.teachingStage;
  }

  /**
   * Logs a diagnostic event for auditing and developer telemetry.
   */
  private logDiagnostic(
    type: TransportDiagnosticLog['type'],
    bar: number,
    beat: number,
    role: string,
    message: string,
    audioTime: number
  ): void {
    const entry: TransportDiagnosticLog = {
      id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestampMs: Date.now(),
      type,
      bar,
      beat,
      role,
      message,
      audioTime,
    };

    this.diagnosticLogs.push(entry);
    if (this.diagnosticLogs.length > 50) {
      this.diagnosticLogs.shift();
    }
  }

  /**
   * Retrieves full diagnostic telemetry including start epoch trace.
   */
  public getDiagnostics(): TransportDiagnosticState {
    const state = this.getState();
    const rawNow = this.audioCtx ? this.audioCtx.currentTime : 0;
    const outputLatency = this.audioCtx ? ((this.audioCtx.outputLatency || 0) + (this.audioCtx.baseLatency || 0)) : 0;
    const visualPhaseOffsetMs = (outputLatency > 0 ? outputLatency : 0.035) * 1000;
    const soundingAudioTime = Math.max(0, rawNow - (visualPhaseOffsetMs / 1000));

    return {
      status: state.status,
      bpm: this.bpm,
      effectiveBpm: this.bpm,
      currentBar: state.currentBar,
      currentBeat: state.currentBeat,
      currentSubdivision: state.currentSubdivision,
      phraseStage: state.phraseStage,
      audioContextTime: rawNow,
      soundingAudioTime,
      visualPhaseOffsetMs,
      transportStartTime: this.transportStartTime,
      phraseElapsed: state.phraseElapsedSeconds,
      completedLoops: state.completedLoops,
      scheduledEventsCount: this.scheduledEventsCount,
      learnerSpaceRegionsCount: this.learnerSpaceRegionsCount,
      underrunsCount: this.underrunsCount,
      lastEventDescription: this.lastEventDesc,
      startTrace: this.startTrace ? { ...this.startTrace } : null,
      logs: [...this.diagnosticLogs],
    };
  }
}

export const masterTransport = MasterMusicalTransport.getInstance();
