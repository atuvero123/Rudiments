import React, { useEffect, useRef, useState } from 'react';
import { CurriculumCompetency, GranularSkill, SelfCheckFeeling } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { CompetencyAdvancementReadiness } from '../lib/competencyAdvancementEngine';
import { findTeachingDefinition } from '../lib/teachingDefinitions';
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
  const beatsPerBar = teaching?.beatsPerBar || (teaching?.meter === '6/8' ? 6 : 4);
  const diagnosticIssues = teaching?.diagnosticIssues || ['Lost pulse', 'Rushed', 'Dragged', 'Tension', 'Uneven notes'];

  const [state, setState] = useState<TestState>('READY');
  const [countInBeat, setCountInBeat] = useState(1);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(readiness.targetDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string>('');
  const [selectedFeeling, setSelectedFeeling] = useState<SelfCheckFeeling | null>(null);
  const [frictions, setFrictions] = useState<string[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    return () => audioEngine.stopMetronome();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    audioEngine.stopMetronome();
    finishedRef.current = false;
    setState('READY');
    setCountInBeat(1);
    setCurrentBeat(0);
    setSecondsRemaining(readiness.targetDurationSeconds);
    setElapsedSeconds(0);
    setStartedAt('');
    setSelectedFeeling(null);
    setFrictions([]);
  }, [isOpen, competency.id, readiness.targetDurationSeconds]);

  const finishRun = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    audioEngine.stopMetronome();
    setElapsedSeconds(readiness.targetDurationSeconds);
    setSecondsRemaining(0);
    setState('SELF_CHECK');
  };

  useEffect(() => {
    if (state !== 'COUNT_IN') return;
    audioEngine.initCtx();
    let beat = 1;
    setCountInBeat(beat);
    audioEngine.playCountInClick(beat, beatsPerBar);
    const intervalMs = (60 / readiness.targetBpm) * 1000;
    const timer = window.setInterval(() => {
      beat += 1;
      if (beat <= beatsPerBar) {
        setCountInBeat(beat);
        audioEngine.playCountInClick(beat, beatsPerBar);
      } else {
        window.clearInterval(timer);
        finishedRef.current = false;
        setStartedAt(new Date().toISOString());
        setState('PLAYING');
        setSecondsRemaining(readiness.targetDurationSeconds);
        setElapsedSeconds(0);
        audioEngine.startMetronome(readiness.targetBpm, 1, beatsPerBar, (beatInBar) => {
          setCurrentBeat(beatInBar);
        });
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [state, readiness.targetBpm, readiness.targetDurationSeconds, beatsPerBar]);

  useEffect(() => {
    if (state !== 'PLAYING') return;
    const ticker = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= readiness.targetDurationSeconds) {
          window.clearInterval(ticker);
          window.setTimeout(finishRun, 0);
          return readiness.targetDurationSeconds;
        }
        return next;
      });
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [state, readiness.targetDurationSeconds]);

  if (!isOpen) return null;

  const close = () => {
    audioEngine.stopMetronome();
    onClose();
  };

  const abortRun = () => {
    audioEngine.stopMetronome();
    setState('READY');
    setSecondsRemaining(readiness.targetDurationSeconds);
    setElapsedSeconds(0);
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
      completedRequiredRun: elapsedSeconds >= readiness.targetDurationSeconds,
      selfAssessment: selectedFeeling,
      frictions,
    });
  };

  const willPass =
    selectedFeeling === 'CLEAN_AND_RELAXED' &&
    frictions.length === 0 &&
    elapsedSeconds >= readiness.targetDurationSeconds;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-stone-950/75 p-3 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-7">
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
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Tempo</span><strong className="text-sm text-stone-900">{readiness.targetBpm} BPM</strong></div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Duration</span><strong className="text-sm text-stone-900">{readiness.targetDurationSeconds}s</strong></div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[9px] font-black uppercase text-stone-400">Meter</span><strong className="text-sm text-stone-900">{teaching?.meter || '4/4'}</strong></div>
        </div>

        <div className="rounded-2xl border border-[#4a523a]/25 bg-[#4a523a]/5 p-4 text-xs text-stone-700">
          <strong className="block text-stone-900">Verification standard</strong>
          <span>{readiness.targetStandardText}</span>
          <div className="mt-2 font-mono text-[11px] text-stone-600">{competency.countingPattern} • {competency.stickingPattern}</div>
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
              Complete the full timed run, then honestly select <strong>Clean & Relaxed</strong> with no reported friction. The test cannot be passed early.
            </div>
            <button onClick={() => setState('COUNT_IN')} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#4a523a] px-4 text-sm font-black text-white shadow-lg active:scale-[0.99]">
              <Play className="h-4 w-4 fill-current" /> Start Verification
            </button>
          </div>
        )}

        {state === 'COUNT_IN' && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 py-9 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Count in</span>
            <div className="mt-2 text-6xl font-black text-amber-700">{countInBeat}</div>
            <p className="mt-2 text-xs text-stone-500">The verification clock starts after the count-in.</p>
          </div>
        )}

        {state === 'PLAYING' && (
          <div className="space-y-4 rounded-3xl bg-stone-950 p-5 text-white">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-black text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE VERIFICATION</span>
              <span className="flex items-center gap-1 font-mono text-stone-300"><Clock3 className="h-3.5 w-3.5" /> {secondsRemaining}s</span>
            </div>
            <div className={`grid gap-2 ${beatsPerBar === 6 ? 'grid-cols-6' : 'grid-cols-4'}`}>
              {Array.from({ length: beatsPerBar }, (_, idx) => (
                <div key={idx} className={`rounded-xl py-3 text-center font-black ${currentBeat === idx ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-500'}`}>{idx + 1}</div>
              ))}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-800"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, (elapsedSeconds / readiness.targetDurationSeconds) * 100)}%` }} /></div>
            <p className="text-center text-xs text-stone-400">Stay relaxed. Do not chase the timer—protect the musical requirement.</p>
            <button onClick={abortRun} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-200"><Square className="h-3.5 w-3.5 fill-current" /> Abort Attempt</button>
          </div>
        )}

        {state === 'SELF_CHECK' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> Required timed run completed. Grade the execution, not the effort.</div>
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
