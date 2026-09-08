import React, { useState, useEffect, useRef } from 'react';
import {
  PlacementTest,
  PlacementTestResult,
  SelfCheckFeeling,
  CurriculumBand,
} from '../types';
import { audioEngine } from '../lib/audioEngine';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Flame,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PlacementTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: PlacementTest[];
  estimatedBand: CurriculumBand;
  onComplete: (results: PlacementTestResult[]) => void;
  onResultSaved?: (result: PlacementTestResult) => void;
  batteryLabel?: string;
}

export const PlacementTestModal: React.FC<PlacementTestModalProps> = ({
  isOpen,
  onClose,
  tests,
  estimatedBand,
  onComplete,
  onResultSaved,
  batteryLabel = 'Placement Battery',
}) => {
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testState, setTestState] = useState<'READY' | 'COUNT_IN' | 'PLAYING' | 'SELF_CHECK'>('READY');
  const [countInBeat, setCountInBeat] = useState(1);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [accumulatedResults, setAccumulatedResults] = useState<PlacementTestResult[]>([]);

  const currentTest = tests[currentTestIndex];

  // Duration in seconds calculated deterministically from bars & tempo
  const calculateDurationSeconds = (t: PlacementTest): number => {
    if (t.durationSeconds && t.durationSeconds > 0) return t.durationSeconds;
    const pulsesPerBar = t.metronomePulsesPerBar || 4;
    const totalPulses = (t.durationBars || 8) * pulsesPerBar;
    return Math.max(5, Math.round((totalPulses * 60) / t.tempo));
  };

  // Clean up metronome on unmount or close
  useEffect(() => {
    return () => {
      audioEngine.stopMetronome();
    };
  }, []);

  // When modal closes, stop sound and reset
  const handleClose = () => {
    audioEngine.stopMetronome();
    setTestState('READY');
    setCurrentTestIndex(0);
    setAccumulatedResults([]);
    onClose();
  };

  // Reset counters when test index changes
  useEffect(() => {
    if (currentTest) {
      setSecondsRemaining(calculateDurationSeconds(currentTest));
      setCurrentBar(1);
      setCurrentBeat(0);
      setTestState('READY');
    }
  }, [currentTestIndex, isOpen]);

  // Handle Count-in timer
  useEffect(() => {
    if (testState !== 'COUNT_IN' || !currentTest) return;

    audioEngine.initCtx();
    const pulsesPerBar = currentTest.metronomePulsesPerBar || 4;
    let beat = 1;
    setCountInBeat(beat);
    audioEngine.playCountInClick(beat, pulsesPerBar);

    const intervalMs = (60 / currentTest.tempo) * 1000;
    const timer = setInterval(() => {
      beat++;
      if (beat <= pulsesPerBar) {
        setCountInBeat(beat);
        audioEngine.playCountInClick(beat, pulsesPerBar);
      } else {
        clearInterval(timer);
        startLiveExecution();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [testState, currentTestIndex]);

  // Handle 1-second countdown ticker for secondsRemaining
  useEffect(() => {
    if (testState !== 'PLAYING') return;

    const ticker = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(ticker);
          handleFinishTestRun();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [testState]);

  // Start Count-in
  const handleStartTest = () => {
    setTestState('COUNT_IN');
  };

  // Start live playing metronome
  const startLiveExecution = () => {
    if (!currentTest) return;
    setTestState('PLAYING');
    setCurrentBar(1);
    setCurrentBeat(0);

    let pulsesAccumulator = 0;
    const pulsesPerBar = currentTest.metronomePulsesPerBar || 4;
    const totalPulses = (currentTest.durationBars || 8) * pulsesPerBar;

    audioEngine.startMetronome(currentTest.tempo, pulsesPerBar, 1, (beatInBar) => {
      setCurrentBeat(beatInBar);
      pulsesAccumulator++;

      const calculatedBar = Math.floor((pulsesAccumulator - 1) / pulsesPerBar) + 1;
      setCurrentBar(Math.min(currentTest.durationBars, calculatedBar));

      if (pulsesAccumulator >= totalPulses) {
        handleFinishTestRun();
      }
    });
  };

  // Stop metronome and transition to self-check rubric
  const handleFinishTestRun = () => {
    audioEngine.stopMetronome();
    setTestState('SELF_CHECK');
  };

  // Record self-check rubric choice
  const handleSelectRubric = (
    passed: boolean,
    feeling: SelfCheckFeeling,
    rubricLabel: string
  ) => {
    if (!currentTest) return;

    const result: PlacementTestResult = {
      testId: currentTest.id,
      passed,
      selfAssessment: feeling,
      timestamp: new Date().toISOString(),
      failedCriteria: passed ? [] : [rubricLabel],
    };

    const nextAccumulated = [...accumulatedResults, result];
    setAccumulatedResults(nextAccumulated);
    onResultSaved?.(result);

    if (currentTestIndex < tests.length - 1) {
      setCurrentTestIndex((prev) => prev + 1);
    } else {
      // Completed all tests!
      audioEngine.stopMetronome();
      onComplete(nextAccumulated);
      handleClose();
    }
  };

  if (!isOpen || !currentTest) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with test counter & progress */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4a523a]" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                {batteryLabel}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                Test {currentTestIndex + 1} of {tests.length} • Profile estimate: {estimatedBand}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Test Spec Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full border border-[#4a523a]/20">
              {currentTest.strandId.replace('_', ' ')} • {currentTest.band}
            </span>
            <span className="text-[11px] font-mono font-bold text-stone-500">
              Target: {currentTest.tempo} BPM
            </span>
          </div>
          <h4 className="text-lg font-black text-stone-900 tracking-tight">
            {currentTest.title}
          </h4>
          <p className="text-xs text-stone-600 font-medium leading-relaxed">
            {currentTest.taskDescription}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Tempo</span>
            <span className="font-black text-stone-900 text-sm">{currentTest.tempo} BPM</span>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Subdivision</span>
            <span className="font-black text-stone-900 text-xs truncate block">{currentTest.subdivision}</span>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Meter / Bars</span>
            <span className="font-black text-stone-900 text-sm">{currentTest.meter || '4/4'} · {currentTest.durationBars}</span>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-400 uppercase block">Equipment</span>
            <span className="font-black text-stone-900 text-[11px]">{currentTest.requiredEquipment || 'Both'}</span>
          </div>
        </div>

        {/* Sticking / Visual Pattern Display */}
        {currentTest.sticking && (
          <div className="bg-stone-900 text-amber-300 p-3.5 rounded-2xl border border-stone-800 text-center font-mono space-y-1">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
              Pattern / Sticking Guide
            </span>
            <span className="text-base sm:text-lg font-black tracking-widest text-white">
              {currentTest.sticking}
            </span>
          </div>
        )}

        {/* INTERACTIVE PLAY-ALONG STAGE */}
        {testState === 'READY' && (
          <div className="space-y-4 pt-1">
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1.5 text-xs text-stone-600">
              <span className="font-bold text-stone-800 uppercase tracking-wide block">
                Verification Instructions:
              </span>
              <ul className="space-y-1">
                {currentTest.passCriteria.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4a523a] shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleStartTest}
              className="w-full py-4 bg-[#4a523a] hover:bg-[#3d4430] text-white font-black text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START PLAY-ALONG TEST ({currentTest.tempo} BPM)</span>
            </button>
          </div>
        )}

        {/* COUNT-IN STAGE */}
        {testState === 'COUNT_IN' && (
          <div className="py-8 bg-[#4a523a]/10 border border-[#4a523a]/30 rounded-2xl text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#4a523a]">
              Lock In With Pulse... Count-In
            </span>
            <div className="text-6xl font-black text-[#4a523a] animate-pulse">
              {countInBeat}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Prepare sticks. Live test begins on Beat 1.
            </p>
          </div>
        )}

        {/* LIVE PLAYING STAGE */}
        {testState === 'PLAYING' && (
          <div className="bg-stone-900 text-white rounded-2xl p-5 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>METRONOME ACTIVE: {currentTest.tempo} BPM</span>
              </div>
              <span className="font-mono text-stone-400 font-bold">
                {secondsRemaining}s remaining
              </span>
            </div>

            {/* Visual metronome pulse indicator */}
            <div className={`grid gap-2 ${(currentTest.metronomePulsesPerBar || 4) === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
              {Array.from({ length: currentTest.metronomePulsesPerBar || 4 }, (_, b) => b).map((b) => {
                const isActive = currentBeat === b;
                const isDownbeat = b === 0;
                return (
                  <div
                    key={b}
                    className={`py-3 rounded-xl text-center font-black transition-all ${
                      isActive
                        ? isDownbeat
                          ? 'bg-amber-400 text-stone-950 scale-105 shadow-md'
                          : 'bg-emerald-400 text-stone-950 scale-105 shadow-md'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    <span className="text-lg block">{b + 1}</span>
                    <span className="text-[9px] uppercase tracking-wider block opacity-75">
                      {(currentTest.metronomePulsesPerBar || 4) === 2 ? `PULSE ${b + 1}` : isDownbeat ? 'DOWNBEAT' : 'BEAT'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
              <span className="text-stone-300 font-bold">
                Progress: Bar <strong className="text-white">{currentBar}</strong> of {currentTest.durationBars}
              </span>
              <span className="text-[10px] text-stone-400 font-semibold">
                Complete the full timed run to unlock grading.
              </span>
            </div>
          </div>
        )}

        {/* SELF-CHECK RUBRIC (Unlocked after playing) */}
        {testState === 'SELF_CHECK' && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-[#4a523a] tracking-wider">
                Execution Completed
              </span>
              <h5 className="text-sm font-black text-stone-900">
                Self-Check Rubric: How did your playing hold up?
              </h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Clean & Relaxed (Pass) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectRubric(true, 'CLEAN_AND_RELAXED', 'clean_execution')
                }
                className="p-3.5 rounded-2xl bg-[#4a523a] hover:bg-[#3d4430] text-white text-left transition-transform active:scale-95 shadow-sm space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Clean Execution at Tempo</span>
                </div>
                <p className="text-[11px] text-stone-200 leading-snug">
                  Locked tightly with the metronome, relaxed wrists, consistent sound.
                </p>
              </button>

              {/* Option 2: Tempo Drift / Rushing (Fail) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectRubric(false, 'INCONSISTENT', 'tempo_drift')
                }
                className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-300 text-left transition-transform active:scale-95 space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Tempo Drift / Rushed Beats</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Pushed ahead or dragged behind the click, uneven downbeats.
                </p>
              </button>

              {/* Option 3: Tension or Fatigue (Fail) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectRubric(false, 'INCONSISTENT', 'tension_fatigue')
                }
                className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-300 text-left transition-transform active:scale-95 space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>Tension or Muscle Fatigue</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Stiff wrists, death grip on sticks, tension prevented relaxation.
                </p>
              </button>

              {/* Option 4: Breakdown / Incomplete (Fail) */}
              <button
                type="button"
                onClick={() =>
                  handleSelectRubric(false, 'TOO_DIFFICULT', 'pattern_breakdown')
                }
                className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-300 text-left transition-transform active:scale-95 space-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Breakdown / Incomplete</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Stops mid-exercise, lost sticking, or unable to sustain the bars.
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
