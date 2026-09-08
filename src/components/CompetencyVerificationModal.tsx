import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CurriculumCompetency, GranularSkill, SelfCheckFeeling } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { CompetencyAdvancementReadiness } from '../lib/competencyAdvancementEngine';
import { findTeachingDefinition } from '../lib/teachingDefinitions';
import { buildNotationVerificationDefinition } from '../lib/notationProgression';
import {
  deriveCanonicalVerificationTransport,
  deriveVerificationTransportPosition,
  formatVerificationSeconds,
} from '../lib/verificationTransportEngine';
import { DrumNotationStaff } from './DrumNotationStaff';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Play,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';

interface CompetencyVerificationModalProps {
  isOpen: boolean;
  competency: CurriculumCompetency;
  skill: GranularSkill;
  readiness: CompetencyAdvancementReadiness;
  onClose: () => void;
  onComplete: (result: {
    startedAt: string;
    durationSeconds: number;
    completedRequiredRun: boolean;
    selfAssessment: SelfCheckFeeling;
    frictions: string[];
  }) => void;
}

type TestState = 'READY' | 'COUNT_IN' | 'PLAYING' | 'SELF_CHECK';

export const CompetencyVerificationModal: React.FC<CompetencyVerificationModalProps> = ({
  isOpen,
  competency,
  skill,
  readiness,
  onClose,
  onComplete,
}) => {
  const teaching = findTeachingDefinition(competency.id);
  const diagnosticIssues = teaching?.diagnosticIssues || ['Lost pulse', 'Rushed', 'Dragged', 'Tension', 'Uneven notes'];
  const isNotationVerification = competency.id === 'comp-reading-notation' && Boolean(teaching);
  const verificationTransport = useMemo(
    () => deriveCanonicalVerificationTransport(competency, teaching),
    [competency, teaching]
  );
  const transportPulsesPerBar = verificationTransport.pulsesPerBar;
  const requiredBars = verificationTransport.requiredBars;
  const requiredPulseCount = verificationTransport.totalPulses;
  const isBarGoverned = verificationTransport.completionMode === 'BARS' && Boolean(requiredBars && requiredPulseCount);
  const notationVerificationDefinition = useMemo(
    () => (isNotationVerification && teaching ? buildNotationVerificationDefinition(teaching) : null),
    [isNotationVerification, teaching]
  );
  const notationRequiredBars = notationVerificationDefinition?.bars || requiredBars || 8;

  const [state, setState] = useState<TestState>('READY');
  const [countInBeat, setCountInBeat] = useState(1);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(verificationTransport.durationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string>('');
  const [selectedFeeling, setSelectedFeeling] = useState<SelfCheckFeeling | null>(null);
  const [frictions, setFrictions] = useState<string[]>([]);
  const [completedRequiredRun, setCompletedRequiredRun] = useState(false);
  const [verificationBeatTicks, setVerificationBeatTicks] = useState(0);
  const finishedRef = useRef(false);
  const verificationBeatTicksRef = useRef(0);
  const finishScheduledRef = useRef(false);

  useEffect(() => {
    return () => audioEngine.stopMetronome();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    audioEngine.stopMetronome();
    finishedRef.current = false;
    finishScheduledRef.current = false;
    verificationBeatTicksRef.current = 0;
    setState('READY');
    setCountInBeat(1);
    setCurrentBeat(0);
    setSecondsRemaining(verificationTransport.durationSeconds);
    setElapsedSeconds(0);
    setStartedAt('');
    setSelectedFeeling(null);
    setFrictions([]);
    setCompletedRequiredRun(false);
    setVerificationBeatTicks(0);
  }, [isOpen, competency.id, verificationTransport.durationSeconds]);

  const finishRun = (completed = true) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    audioEngine.stopMetronome();
    setCompletedRequiredRun(completed);
    if (completed) {
      // Persist the canonical transport length, not browser timer drift.
      setElapsedSeconds(verificationTransport.durationSeconds);
      setSecondsRemaining(0);
    }
    setState('SELF_CHECK');
  };

  useEffect(() => {
    if (state !== 'COUNT_IN') return;
    audioEngine.initCtx();
    let beat = 1;
    setCountInBeat(beat);
    audioEngine.playCountInClick(beat, transportPulsesPerBar);
    const intervalMs = (60 / verificationTransport.bpm) * 1000;
    const timer = window.setInterval(() => {
      beat += 1;
      if (beat <= transportPulsesPerBar) {
        setCountInBeat(beat);
        audioEngine.playCountInClick(beat, transportPulsesPerBar);
      } else {
        window.clearInterval(timer);
        finishedRef.current = false;
        finishScheduledRef.current = false;
        verificationBeatTicksRef.current = 0;
        setVerificationBeatTicks(0);
        setStartedAt(new Date().toISOString());
        setState('PLAYING');
        setSecondsRemaining(verificationTransport.durationSeconds);
        setElapsedSeconds(0);

        // C7.10: startMetronome expects (bpm, beatsInBar, subdivision).
        // Earlier C4 builds accidentally passed (bpm, 1, beatsPerBar), which
        // produced a subdivision-rate click rather than the displayed tempo.
        audioEngine.startMetronome(verificationTransport.bpm, transportPulsesPerBar, 1, (beatInBar) => {
          setCurrentBeat(beatInBar);

          if (isBarGoverned) {
            const nextTickCount = verificationBeatTicksRef.current + 1;
            verificationBeatTicksRef.current = nextTickCount;
            setVerificationBeatTicks(nextTickCount);

            if (requiredPulseCount && nextTickCount >= requiredPulseCount && !finishScheduledRef.current) {
              finishScheduledRef.current = true;
              // Give the final required pulse its full duration, then stop before
              // another unrequired downbeat is introduced.
              const pulseMs = (60 / verificationTransport.bpm) * 1000;
              window.setTimeout(() => finishRun(true), pulseMs);
            }
          }
        });
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [state, verificationTransport.bpm, verificationTransport.durationSeconds, transportPulsesPerBar, isBarGoverned, requiredPulseCount]);

  useEffect(() => {
    if (state !== 'PLAYING' || isBarGoverned) return;
    const ticker = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= verificationTransport.durationSeconds) {
          window.clearInterval(ticker);
          window.setTimeout(() => finishRun(true), 0);
          return verificationTransport.durationSeconds;
        }
        return next;
      });
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [state, verificationTransport.durationSeconds, isBarGoverned]);

  if (!isOpen) return null;

  const close = () => {
    audioEngine.stopMetronome();
    onClose();
  };

  const abortRun = () => {
    audioEngine.stopMetronome();
    setState('READY');
    setSecondsRemaining(verificationTransport.durationSeconds);
    setElapsedSeconds(0);
    setCompletedRequiredRun(false);
    setVerificationBeatTicks(0);
    verificationBeatTicksRef.current = 0;
    finishScheduledRef.current = false;
    finishedRef.current = false;
  };

  const toggleFriction = (item: string) => {
    setFrictions((prev) => (prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]));
  };

  const saveResult = () => {
    if (!selectedFeeling) return;
    onComplete({
      startedAt: startedAt || new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      completedRequiredRun,
      selfAssessment: selectedFeeling,
      frictions,
    });
  };

  const willPass =
    selectedFeeling === 'CLEAN_AND_RELAXED' &&
    frictions.length === 0 &&
    completedRequiredRun;

  const transportPosition = deriveVerificationTransportPosition(
    verificationTransport,
    verificationBeatTicks
  );
  const currentVerificationBar = transportPosition?.currentBar || 1;
  const currentVerificationPulse = transportPosition?.currentPulse || 1;
  const currentNotationBar = Math.min(notationRequiredBars, currentVerificationBar);
  const barProgress = transportPosition?.progressPercent || 0;
  const pulseLabels = teaching?.meter === '6/8' && transportPulsesPerBar === 2
    ? ['1', '4']
    : Array.from({ length: transportPulsesPerBar }, (_, idx) => `${idx + 1}`);
  const notationPageIndex = Math.floor((currentNotationBar - 1) / 4);
  const notationPageStart = notationPageIndex * 4 + 1;
  const notationPageEnd = Math.min(notationRequiredBars, notationPageStart + 3);
  const notationPageDefinition = notationVerificationDefinition
    ? {
        ...notationVerificationDefinition,
        bars: notationPageEnd - notationPageStart + 1,
        events: notationVerificationDefinition.events
          .filter((event) => {
            const bar = event.bar || 1;
            return bar >= notationPageStart && bar <= notationPageEnd;
          })
          .map((event) => ({
            ...event,
            bar: (event.bar || 1) - notationPageStart + 1,
          })),
      }
    : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-stone-950/75 p-3 backdrop-blur-sm">
      <div className={`my-8 w-full ${isNotationVerification && state === 'PLAYING' ? 'max-w-3xl' : 'max-w-xl'} space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-7`}>
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">C4 Practical Verification</span>
              <h2 className="text-lg font-black text-stone-950 sm:text-xl">{competency.title}</h2>
              <p className="mt-1 text-xs font-medium text-stone-500">This is a certification attempt, not ordinary practice.</p>
            </div>
          </div>
          <button onClick={close} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Tempo</span><strong className="text-sm text-stone-900">{verificationTransport.bpm} BPM</strong></div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <span className="block text-[9px] font-black uppercase text-stone-400">{isNotationVerification ? 'Chart' : isBarGoverned ? 'Bars' : 'Duration'}</span>
            <strong className="text-sm text-stone-900">{isBarGoverned && requiredBars ? `${requiredBars} bars` : `${formatVerificationSeconds(verificationTransport.durationSeconds)}s`}</strong>
            {isBarGoverned && <span className="mt-0.5 block text-[9px] font-bold text-stone-400">{formatVerificationSeconds(verificationTransport.durationSeconds)}s derived</span>}
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Meter</span><strong className="text-sm text-stone-900">{teaching?.meter || '4/4'}</strong></div>
        </div>

        <div className="rounded-2xl border border-[#4a523a]/25 bg-[#4a523a]/5 p-4 text-xs text-stone-700">
          <strong className="block text-stone-900">Verification standard</strong>
          <span>{verificationTransport.standardText}</span>
          <div className="mt-2 font-mono text-[11px] text-stone-600">
            {isNotationVerification
              ? 'Staff only • no count labels • no playhead • metronome only'
              : `${competency.countingPattern} • ${competency.stickingPattern}`}
          </div>
        </div>

        {state === 'READY' && (
          <div className="space-y-4">
            {readiness.state !== 'READY_TO_VERIFY' && (
              <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>You can preview this test, but the coach currently rates you <strong>{readiness.label}</strong>. A failed attempt will create a repair plan rather than advance the curriculum.</p>
              </div>
            )}
            <div className="rounded-2xl border border-stone-200 p-4 text-xs text-stone-600">
              <strong className="mb-2 block text-stone-900">Pass rule</strong>
              {isNotationVerification
                ? `Read all ${notationRequiredBars} written bars after the count-in, then honestly select `
                : isBarGoverned && requiredBars
                ? `Complete all ${requiredBars} bars at the governed tempo, then honestly select `
                : 'Complete the full timed run, then honestly select '}
              <strong>Clean & Relaxed</strong> with no reported friction. The test cannot be passed early.
            </div>
            <button onClick={() => setState('COUNT_IN')} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#4a523a] px-4 text-sm font-black text-white shadow-lg active:scale-[0.99]">
              <Play className="h-4 w-4 fill-current" /> Start Verification
            </button>
          </div>
        )}

        {state === 'COUNT_IN' && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 py-9 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Count in</span>
            <div className="mt-2 text-6xl font-black text-amber-700">{pulseLabels[countInBeat - 1] || countInBeat}</div>
            <p className="mt-2 text-xs text-stone-500">{isNotationVerification ? `The chart appears after the count-in at BAR 1 / ${notationRequiredBars}.` : isBarGoverned && requiredBars ? `The canonical phrase begins at BAR 1 / ${requiredBars}.` : 'The verification clock starts after the count-in.'}</p>
          </div>
        )}

        {state === 'PLAYING' && (
          <div className="space-y-4 rounded-3xl bg-stone-950 p-5 text-white">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-black text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE VERIFICATION</span>
              {isNotationVerification && isBarGoverned ? (
                <span className="font-mono text-stone-300">BAR {currentNotationBar} / {notationRequiredBars} · SIGHT-READ</span>
              ) : isBarGoverned && requiredBars ? (
                <span className="font-mono text-stone-300">BAR {currentVerificationBar} / {requiredBars}</span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-stone-300"><Clock3 className="h-3.5 w-3.5" /> {Math.ceil(secondsRemaining)}s</span>
              )}
            </div>

            {isBarGoverned && requiredBars && requiredPulseCount && transportPosition && (
              <div className="rounded-2xl border border-emerald-900/60 bg-stone-900/90 p-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">Canonical phrase transport</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <strong className="text-2xl font-black text-white">BAR {currentVerificationBar}</strong>
                      <span className="text-xs font-bold text-stone-400">/ {requiredBars}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-stone-500">Current pulse</span>
                    <strong className="font-mono text-sm text-amber-300">{currentVerificationPulse} / {transportPulsesPerBar}</strong>
                  </div>
                </div>

                {requiredBars <= 24 && (
                  <div className="mt-3 grid grid-cols-8 gap-1">
                    {Array.from({ length: requiredBars }, (_, idx) => {
                      const barNumber = idx + 1;
                      const isCurrentBar = barNumber === currentVerificationBar;
                      const isPastBar = barNumber < currentVerificationBar || transportPosition.isComplete;
                      return (
                        <div
                          key={`verification-bar-${barNumber}`}
                          className={`rounded-md py-1 text-center font-mono text-[9px] font-black ${
                            isCurrentBar
                              ? 'bg-amber-400 text-stone-950 ring-1 ring-amber-200'
                              : isPastBar
                              ? 'bg-emerald-900/70 text-emerald-200'
                              : 'bg-stone-800 text-stone-500'
                          }`}
                        >
                          {barNumber}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${barProgress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[9px] text-stone-500">
                  <span>{transportPosition.completedPulses} / {requiredPulseCount} canonical pulses</span>
                  <span>{formatVerificationSeconds(verificationTransport.durationSeconds)}s derived only</span>
                </div>
              </div>
            )}

            {isNotationVerification && notationPageDefinition ? (
              <div className="space-y-3">
                <DrumNotationStaff
                  teachingDef={notationPageDefinition}
                  isPlaying={false}
                  compact
                  showLegend={false}
                  showCounts={false}
                  showPlayhead={false}
                  showVoiceLabels={false}
                  showBarLabels={false}
                  showInstruction={false}
                  title={`Formal Sight-Reading Chart — Bars ${notationPageStart}–${notationPageEnd} of ${notationRequiredBars}`}
                />
                <p className="text-center text-[11px] font-medium text-stone-400">Read continuously from left to right. The chart is the only performance instruction; the click supplies time.</p>
              </div>
            ) : (
              <div className={`grid gap-2 ${transportPulsesPerBar === 6 ? 'grid-cols-6' : transportPulsesPerBar === 5 ? 'grid-cols-5' : transportPulsesPerBar === 3 ? 'grid-cols-3' : transportPulsesPerBar === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {pulseLabels.map((label, idx) => (
                  <div key={`${label}-${idx}`} className={`rounded-xl py-3 text-center font-black ${currentBeat === idx ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-500'}`}>{label}</div>
                ))}
              </div>
            )}

            {!isNotationVerification && !isBarGoverned && (
              <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, (elapsedSeconds / verificationTransport.durationSeconds) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-center text-xs text-stone-400">{isNotationVerification ? 'Keep your eyes on the notation and preserve every written rest and simultaneous voice.' : isBarGoverned ? 'Stay relaxed. Complete every governed bar—the bar count, not the wall clock, controls completion.' : 'Stay relaxed. Do not chase the timer—protect the musical requirement.'}</p>
            <button onClick={abortRun} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-200"><Square className="h-3.5 w-3.5 fill-current" /> Abort Attempt</button>
          </div>
        )}

        {state === 'SELF_CHECK' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> {isNotationVerification ? `Required ${notationRequiredBars}-bar chart completed.` : isBarGoverned && requiredBars ? `Required ${requiredBars}-bar run completed.` : 'Required timed run completed.'} Grade the execution, not the effort.</div>
            <div>
              <span className="mb-2 block text-xs font-black text-stone-800">How did the full run feel?</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['CLEAN_AND_RELAXED', 'Clean & Relaxed'],
                  ['MOSTLY_CLEAN', 'Mostly Clean'],
                  ['INCONSISTENT', 'Inconsistent'],
                  ['TOO_DIFFICULT', 'Too Difficult'],
                ] as Array<[SelfCheckFeeling, string]>).map(([value, label]) => (
                  <button key={value} onClick={() => setSelectedFeeling(value)} className={`min-h-[46px] rounded-xl border px-3 text-xs font-bold ${selectedFeeling === value ? 'border-[#4a523a] bg-[#4a523a] text-white' : 'border-stone-200 bg-white text-stone-700'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-xs font-black text-stone-800">Any friction during the run?</span>
              <div className="flex flex-wrap gap-2">
                {diagnosticIssues.map((item) => (
                  <button key={item} onClick={() => toggleFriction(item)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${frictions.includes(item) ? 'border-rose-300 bg-rose-100 text-rose-800' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>{item}</button>
                ))}
              </div>
            </div>
            <div className={`rounded-2xl border p-3 text-xs ${willPass ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>
              {willPass ? 'This result qualifies as a verification pass.' : 'Only a full Clean & Relaxed run with no reported friction certifies this competency.'}
            </div>
            <button disabled={!selectedFeeling} onClick={saveResult} className="min-h-[50px] w-full rounded-2xl bg-[#4a523a] px-4 text-sm font-black text-white disabled:bg-stone-200 disabled:text-stone-500">Save Verification Result</button>
          </div>
        )}
      </div>
    </div>
  );
};
