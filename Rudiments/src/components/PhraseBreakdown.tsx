import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Compass,
  Layers,
  Target,
  ArrowRight,
  CheckCircle2,
  Music,
} from 'lucide-react';
import {
  PracticeExercise,
  RhythmTimeline,
  RhythmEvent,
  InstrumentSurface,
} from '../types';
import { audioEngine } from '../lib/audioEngine';

interface PhraseBreakdownProps {
  exercise: PracticeExercise;
  timeline: RhythmTimeline;
  isPad: boolean;
  currentTempo: number;
  onProceedToMusicalPractice: () => void;
}

export const PhraseBreakdown: React.FC<PhraseBreakdownProps> = ({
  exercise,
  timeline,
  isPad,
  currentTempo,
  onProceedToMusicalPractice,
}) => {
  const isSixStrokeRoll =
    exercise.skillIds?.some((id) => id.includes('six-stroke')) ||
    exercise.title.includes('Six Stroke Roll');
  const isCalibration =
    exercise.title.includes('Calibration') || exercise.phase === 'FOUNDATION';

  // 1. Extract core vocabulary / phrase strokes for step-through
  const coreStrokes: RhythmEvent[] = useMemo(() => {
    // Look for fill strokes or tutor demonstration strokes in Bar 1
    const fillOrCalibEvents = timeline.events.filter(
      (e) => (e.role === 'fill' || e.barNumber === 1) && !e.isLearnerSpace
    );

    if (fillOrCalibEvents.length > 0) {
      // If calibration with 4 beats of rudiments, take one complete 1-beat or 1-cycle phrase
      if (isSixStrokeRoll) {
        // Take the 6 strokes of the Six Stroke Roll (+ optional landing stroke)
        const ssrEvents = fillOrCalibEvents.slice(0, 6);
        const landingEvent = timeline.events.find((e) => e.role === 'landing');
        return landingEvent ? [...ssrEvents, landingEvent] : ssrEvents;
      }
      // For general 1-beat or 2-beat fill
      const fillEvents = timeline.events.filter((e) => e.role === 'fill');
      const landingEvent = timeline.events.find((e) => e.role === 'landing');
      if (fillEvents.length > 0) {
        return landingEvent ? [...fillEvents, landingEvent] : fillEvents;
      }
      return fillOrCalibEvents.slice(0, 8);
    }

    return timeline.events.slice(0, 8);
  }, [timeline, isSixStrokeRoll]);

  // Step-through state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const activeStroke = coreStrokes[currentStepIndex] || coreStrokes[0];

  // Slow demonstration playback state
  const [isSlowPlaying, setIsSlowPlaying] = useState<boolean>(false);
  const [slowBeat, setSlowBeat] = useState<number>(1);
  const slowTimerRef = useRef<number | null>(null);

  // Stop slow audio on unmount or stroke change
  const stopSlowDemo = () => {
    if (slowTimerRef.current) {
      window.clearInterval(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setIsSlowPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopSlowDemo();
    };
  }, []);

  // Step navigation
  const handlePrevStroke = () => {
    stopSlowDemo();
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : coreStrokes.length - 1));
  };

  const handleNextStroke = () => {
    stopSlowDemo();
    setCurrentStepIndex((prev) => (prev < coreStrokes.length - 1 ? prev + 1 : 0));
  };

  // Play individual stroke sound on demand
  const handleHearStroke = (stroke?: RhythmEvent) => {
    const s = stroke || activeStroke;
    if (!s) return;
    audioEngine.ensureReady();
    audioEngine.playEventSound(
      s.role,
      s.surface,
      s.isAccented,
      isPad
    );
  };

  // Play Slow Demonstration of the phrase (e.g. 50 BPM)
  const handleToggleSlowDemo = async () => {
    if (isSlowPlaying) {
      stopSlowDemo();
      return;
    }

    await audioEngine.ensureAudioContextReady();
    setIsSlowPlaying(true);
    setSlowBeat(1);

    const slowBpm = 50; // Comfortable slow instructional tempo
    const intervalMs = (60 / slowBpm) * 1000;
    let strokeIdx = 0;
    let localBeat = 1;

    // Play first stroke immediately
    if (coreStrokes.length > 0) {
      handleHearStroke(coreStrokes[0]);
    }

    slowTimerRef.current = window.setInterval(() => {
      strokeIdx = (strokeIdx + 1) % coreStrokes.length;
      setCurrentStepIndex(strokeIdx);
      const st = coreStrokes[strokeIdx];
      if (st) {
        handleHearStroke(st);
        if (st.subdivisionIndex === 0 || strokeIdx === 0) {
          localBeat = (localBeat % 4) + 1;
          setSlowBeat(localBeat);
        }
      }
    }, (60 / slowBpm / (isSixStrokeRoll ? 6 : 4)) * 1000 * 2.5); // Calm relaxed instructional spacing
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. LAYER BANNER: UNDERSTANDING BEFORE PLAYING */}
      <div className="bg-[#f6f6f4] border-2 border-stone-300 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#4a523a] text-white rounded-xl">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4a523a] block">
                Instructional Layer A: Break It Down
              </span>
              <h3 className="text-base font-black text-stone-900 leading-tight">
                Understand the Phrase Before Playing at Speed
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 font-mono">
            Step-by-Step
          </span>
        </div>

        {/* 4 Core Questions Answered Before Playing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-2xl border border-stone-200 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-stone-500 block">1. What Am I Playing?</span>
            <p className="font-black text-stone-900 text-xs">
              {isSixStrokeRoll ? 'Six Stroke Roll' : exercise.title.split('—')[0]}
            </p>
            <p className="text-[10px] font-mono text-stone-600 font-bold">
              {exercise.sticking || '>R L L R R >L'}
            </p>
          </div>

          <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-amber-800 block">2. Where Does It Begin?</span>
            <p className="font-black text-stone-900 text-xs">
              {isCalibration ? 'Beat 1 Downbeat' : 'Beat 4 (Last Beat)'}
            </p>
            <p className="text-[10px] text-amber-900">
              {isCalibration ? 'Full 1-Bar Phrase' : '1-Beat Fill Entry'}
            </p>
          </div>

          <div className="bg-sky-500/10 p-2.5 rounded-2xl border border-sky-500/30 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-sky-800 block">3. Dynamics & Accents</span>
            <p className="font-black text-stone-900 text-xs">
              {isSixStrokeRoll ? 'Accents on >R and >L' : 'Accented Entry'}
            </p>
            <p className="text-[10px] text-sky-900">Soft inner double taps</p>
          </div>

          <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/30 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-emerald-800 block">4. Where Do I Land?</span>
            <p className="font-black text-stone-900 text-xs">Bar 2 Beat 1</p>
            <p className="text-[10px] text-emerald-900 font-bold">
              {isPad ? 'Pad Rim Edge' : '💥 Crash + Kick'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. MANUAL STEP-THROUGH CONTROLS & STROKE INSPECTOR */}
      <div className="bg-stone-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-500 text-stone-950 rounded-lg text-xs font-black">
              STEPPER
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-stone-200">
              Stroke-by-Stroke Phrase Inspection
            </span>
          </div>
          <span className="text-xs font-mono font-black text-amber-400">
            STROKE {currentStepIndex + 1} OF {coreStrokes.length}
          </span>
        </div>

        {/* STATIC STICKING CHIP SELECTOR (Click any stroke to inspect) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Sticking Sequence Map:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {coreStrokes.map((st, idx) => {
              const isSelected = idx === currentStepIndex;
              const isLanding = st.role === 'landing';
              return (
                <button
                  key={st.id || idx}
                  onClick={() => {
                    stopSlowDemo();
                    setCurrentStepIndex(idx);
                    handleHearStroke(st);
                  }}
                  className={`flex-1 min-w-[2.75rem] sm:min-w-[3.25rem] py-2.5 px-2 rounded-2xl border transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? isLanding
                        ? 'bg-emerald-500 text-stone-950 border-emerald-300 font-black scale-105 ring-2 ring-emerald-400 shadow-lg'
                        : st.isAccented
                        ? 'bg-amber-400 text-stone-950 border-amber-200 font-black scale-105 ring-2 ring-amber-300 shadow-lg'
                        : 'bg-white text-stone-950 border-white font-black scale-105 ring-2 ring-stone-300 shadow-lg'
                      : isLanding
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                      : st.isAccented
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  <span className="text-[8px] font-mono font-extrabold uppercase opacity-75">
                    {idx + 1}
                  </span>
                  <span className="text-base sm:text-lg font-black font-mono mt-0.5">
                    {st.noteLabel || st.hand || (isLanding ? 'CRASH' : 'R')}
                  </span>
                  <span className="text-[8px] font-mono mt-0.5 opacity-80">
                    {st.countLabel || ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE STROKE DETAILS CARD */}
        {activeStroke && (
          <div className="bg-stone-900/90 rounded-2xl p-4 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm font-mono ${
                    activeStroke.role === 'landing'
                      ? 'bg-emerald-400 text-stone-950'
                      : activeStroke.hand === 'R'
                      ? 'bg-sky-400 text-stone-950'
                      : 'bg-emerald-400 text-stone-950'
                  }`}
                >
                  {activeStroke.role === 'landing' ? '1' : activeStroke.hand || 'R'}
                </span>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {activeStroke.role === 'landing'
                      ? 'Beat 1 Downbeat Landing'
                      : `${activeStroke.hand === 'R' ? 'Right Hand' : 'Left Hand'} Stroke`}
                  </h4>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {activeStroke.description || `Subdivision: ${activeStroke.countLabel}`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    activeStroke.role === 'landing'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : activeStroke.isAccented
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  {activeStroke.role === 'landing'
                    ? '🎯 LANDING'
                    : activeStroke.isAccented
                    ? '⚡ ACCENT'
                    : 'INNER TAP'}
                </span>
              </div>
            </div>

            {/* Stroke Specification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-[9px] font-bold text-stone-500 uppercase block">Rhythmic Count:</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {activeStroke.countLabel || `Beat ${activeStroke.beatNumber}`}
                </span>
              </div>

              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-[9px] font-bold text-stone-500 uppercase block">Target Surface:</span>
                <span className="font-mono font-bold text-stone-200 text-xs truncate block">
                  {activeStroke.surfaceLabel || (isPad ? 'Pad Center' : 'Snare')}
                </span>
              </div>

              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-[9px] font-bold text-stone-500 uppercase block">Dynamic Volume:</span>
                <span className="font-mono font-bold text-sky-300 text-xs">
                  {activeStroke.isAccented ? 'High (Accent 95%)' : 'Low (Tap 45%)'}
                </span>
              </div>

              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-[9px] font-bold text-stone-500 uppercase block">Role in Phrase:</span>
                <span className="font-bold text-emerald-300 text-xs">
                  {activeStroke.role === 'landing'
                    ? 'Downbeat Anchor'
                    : activeStroke.isAccented
                    ? 'Accent Anchor'
                    : 'Inner Double'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEPPER ACTION BUTTONS */}
        <div className="grid grid-cols-12 gap-2 pt-1">
          <button
            onClick={handlePrevStroke}
            className="col-span-3 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-2xl font-black text-xs transition-colors flex items-center justify-center gap-1 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREV</span>
          </button>

          <button
            onClick={() => handleHearStroke()}
            className="col-span-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Volume2 className="w-4 h-4" />
            <span>HEAR THIS STROKE</span>
          </button>

          <button
            onClick={handleNextStroke}
            className="col-span-3 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-2xl font-black text-xs transition-colors flex items-center justify-center gap-1 min-h-[44px]"
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. SLOW DEMONSTRATION CONTROLS */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Audio Demonstration:
            </span>
            <button
              onClick={handleToggleSlowDemo}
              className={`py-2 px-3.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                isSlowPlaying
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isSlowPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE SLOW DEMO</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>HEAR PHRASE SLOWLY (50 BPM)</span>
                </>
              )}
            </button>
          </div>

          {isSlowPlaying && (
            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Playing slowly for ear training...</span>
            </span>
          )}
        </div>

        {/* 4. PRACTICE PAD / KIT TARGET SURFACE DIAGRAM */}
        <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-black">
              <Layers className="w-3.5 h-3.5" />
              <span>{isPad ? 'Target Pad Zone for This Stroke' : 'Kit Voice Orchestration'}</span>
            </span>
            <span className="font-mono text-stone-400">
              {isPad ? 'PAD VISUALIZER' : 'DRUM KIT'}
            </span>
          </div>

          {isPad ? (
            <div className="relative flex flex-col items-center justify-center p-3 bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
              <svg viewBox="0 0 320 180" className="w-full max-w-xs h-auto select-none">
                {/* Rim Edge (Beat 1 Landing) */}
                <ellipse
                  cx="160"
                  cy="90"
                  rx="150"
                  ry="80"
                  className={`transition-all duration-150 ${
                    activeStroke?.surface === 'rim_edge' || activeStroke?.role === 'landing'
                      ? 'fill-emerald-500/40 stroke-emerald-300 stroke-[4px] filter drop-shadow-[0_0_14px_rgba(52,211,153,0.9)]'
                      : 'fill-stone-900 stroke-stone-700 stroke-2'
                  }`}
                />

                {/* Left Accent Zone */}
                <path
                  d="M 30 90 A 130 65 0 0 1 120 35 L 120 145 A 130 65 0 0 1 30 90 Z"
                  className={`transition-all duration-150 ${
                    activeStroke?.surface === 'left_zone'
                      ? 'fill-amber-400 stroke-amber-200 stroke-2 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                      : 'fill-stone-800/80 stroke-stone-700'
                  }`}
                />

                {/* Right Accent Zone */}
                <path
                  d="M 290 90 A 130 65 0 0 0 200 35 L 200 145 A 130 65 0 0 0 290 90 Z"
                  className={`transition-all duration-150 ${
                    activeStroke?.surface === 'right_zone'
                      ? 'fill-amber-400 stroke-amber-200 stroke-2 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                      : 'fill-stone-800/80 stroke-stone-700'
                  }`}
                />

                {/* Center Doubles Zone */}
                <ellipse
                  cx="160"
                  cy="90"
                  rx="50"
                  ry="45"
                  className={`transition-all duration-150 ${
                    activeStroke?.surface === 'center' || (!activeStroke?.surface && !activeStroke?.isAccented)
                      ? 'fill-sky-500 stroke-sky-200 stroke-2 filter drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]'
                      : 'fill-stone-700 stroke-stone-600'
                  }`}
                />

                {/* SVG Zone Labels */}
                <text x="70" y="93" textAnchor="middle" className="text-[10px] font-black fill-stone-300 uppercase pointer-events-none">
                  Left Acc
                </text>
                <text x="160" y="93" textAnchor="middle" className="text-[10px] font-black fill-white uppercase pointer-events-none">
                  Center Tap
                </text>
                <text x="250" y="93" textAnchor="middle" className="text-[10px] font-black fill-stone-300 uppercase pointer-events-none">
                  Right Acc
                </text>
                <text x="160" y="160" textAnchor="middle" className="text-[9px] font-extrabold fill-emerald-400 uppercase pointer-events-none">
                  Rim (🎯 Crash Landing)
                </text>
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800">
              {[
                { id: 'hihat', label: 'Hi-Hat / Ride', role: 'Groove Pulse' },
                { id: 'snare', label: 'Snare Drum', role: 'Doubles / Taps' },
                { id: 'tom_high', label: 'Rack Tom', role: 'Accent Voices' },
                { id: 'crash', label: '💥 Crash + Kick', role: 'Beat 1 Landing' },
              ].map((voice) => {
                const isNow =
                  activeStroke?.surface === voice.id ||
                  (voice.id === 'crash' && activeStroke?.role === 'landing');
                return (
                  <div
                    key={voice.id}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isNow
                        ? 'bg-amber-400 text-stone-950 border-amber-200 font-black scale-105 shadow-lg'
                        : 'bg-stone-900 text-stone-300 border-stone-800'
                    }`}
                  >
                    <span className="text-[9px] font-extrabold uppercase opacity-80 block">
                      {voice.role}
                    </span>
                    <span className="text-xs font-black block mt-0.5">{voice.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. PRIMARY CTA: PROCEED TO MUSICAL PRACTICE */}
      <button
        onClick={() => {
          stopSlowDemo();
          onProceedToMusicalPractice();
        }}
        className="w-full py-4 bg-[#4a523a] hover:bg-[#3d4430] text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
      >
        <Music className="w-5 h-5" />
        <span>READY? PROCEED TO PLAY IT MUSICALLY ▶</span>
      </button>
    </div>
  );
};
