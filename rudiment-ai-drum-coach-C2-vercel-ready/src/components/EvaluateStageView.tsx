import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  RotateCcw,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Target,
  Clock,
  Activity,
} from 'lucide-react';
import {
  PracticeExercise,
  SelfCheckFeeling,
  ExerciseResult,
  InstructionMode,
  CompetencyTeachingDefinition,
} from '../types';

interface EvaluateStageViewProps {
  exercise: PracticeExercise;
  teachingDef: CompetencyTeachingDefinition;
  currentTempo: number;
  onSaveEvaluation: (result: Partial<ExerciseResult>) => void;
  onRepeatStage: (stage: 'COUNT' | 'WATCH' | 'FOLLOW' | 'PLAY') => void;
}

const COMMON_DRUMMING_ISSUES = [
  'Timing rushed',
  'Timing dragged',
  'Uneven double strokes',
  'Tension in wrists/shoulders',
  'Lost the pulse',
  'Missed Beat 1 landing',
  'Weak dynamics / flat accents',
  'Hesitated on recovery',
];

export const EvaluateStageView: React.FC<EvaluateStageViewProps> = ({
  exercise,
  teachingDef,
  currentTempo,
  onSaveEvaluation,
  onRepeatStage,
}) => {
  const [feeling, setFeeling] = useState<SelfCheckFeeling | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [downbeatLandedCleanly, setDownbeatLandedCleanly] = useState<boolean | null>(true);

  const diagnosticOptions = teachingDef.diagnosticIssues?.length
    ? teachingDef.diagnosticIssues
    : COMMON_DRUMMING_ISSUES;
  const requiresDownbeatCheck =
    teachingDef.diagnosticIssues?.some((issue) => issue.toLowerCase().includes('beat 1')) ||
    /fill|recovery|landing|transition/i.test(teachingDef.title);

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleComplete = () => {
    if (!feeling) return;

    const issueTags = [...selectedIssues];
    if (requiresDownbeatCheck && downbeatLandedCleanly === false && !issueTags.some((issue) => issue.toLowerCase().includes('beat 1'))) {
      issueTags.push('Missed beat 1');
    }

    const partialResult: Partial<ExerciseResult> = {
      selfCheck: feeling,
      issueTags,
      tempoUsed: currentTempo,
      visualTutorUsed: true,
      completedAt: new Date().toISOString(),
    };

    onSaveEvaluation(partialResult);
  };

  return (
    <div className="bg-stone-950 text-white rounded-3xl p-5 sm:p-7 border-2 border-stone-800 shadow-2xl space-y-6 animate-in fade-in duration-200">
      {/* Stage Header */}
      <div className="border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border border-emerald-500/30">
            STAGE 6: EVALUATE
          </span>
          <span className="text-xs font-mono text-stone-400">
            {teachingDef.meter} • {currentTempo} BPM
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
          Performance & Feel Evaluation
        </h2>
        <p className="text-xs text-stone-300 font-medium mt-0.5">
          Evaluate honestly. Authentic evidence is the foundation of genuine drumming mastery.
        </p>
      </div>

      {/* 1. Overall Timing & Execution Rating */}
      <div className="space-y-3">
        <label className="text-xs font-black uppercase tracking-wider text-stone-300 block">
          1. How did the phrase feel at {currentTempo} BPM?
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Clean & Relaxed */}
          <button
            type="button"
            onClick={() => setFeeling('CLEAN_AND_RELAXED')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              feeling === 'CLEAN_AND_RELAXED'
                ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/40'
                : 'bg-stone-900 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
                <span>🌟 Clean & Relaxed</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-400">Locked in</span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Relaxed, controlled, and securely aligned with the intended pulse and pattern.
            </p>
          </button>

          {/* Mostly Clean */}
          <button
            type="button"
            onClick={() => setFeeling('MOSTLY_CLEAN')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              feeling === 'MOSTLY_CLEAN'
                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                : 'bg-stone-900 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                <span>👍 Mostly Controlled</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-400">Minor Drift</span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              The phrase stayed together with only small timing, sound, or coordination imperfections.
            </p>
          </button>

          {/* Inconsistent */}
          <button
            type="button"
            onClick={() => setFeeling('INCONSISTENT')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              feeling === 'INCONSISTENT'
                ? 'bg-orange-500/20 border-orange-400 ring-2 ring-orange-400/40'
                : 'bg-stone-900 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-orange-400 text-sm flex items-center gap-1.5">
                <span>⚠️ Inconsistent</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-400">Needs Work</span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Timing, sticking, coordination, or sound became unreliable during the run.
            </p>
          </button>

          {/* Too Difficult */}
          <button
            type="button"
            onClick={() => setFeeling('TOO_DIFFICULT')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              feeling === 'TOO_DIFFICULT'
                ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/40'
                : 'bg-stone-900 border-stone-800 hover:border-stone-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-rose-400 text-sm flex items-center gap-1.5">
                <span>🛑 Too Fast / Tangled</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-400">Step Down</span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Could not maintain the required phrase or count comfortably at this working tempo.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Downbeat Landing Check (only when musically relevant) */}
      {requiresDownbeatCheck && (
        <div className="bg-stone-900/80 p-4 rounded-2xl border border-stone-800 space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-300 block">
            2. Beat 1 Landing Resolution:
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <button
              type="button"
              onClick={() => setDownbeatLandedCleanly(true)}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                downbeatLandedCleanly === true
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              ✓ Landed solid on Beat 1
            </button>
            <button
              type="button"
              onClick={() => setDownbeatLandedCleanly(false)}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                downbeatLandedCleanly === false
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-black'
                  : 'bg-stone-950 border-stone-800 text-stone-400'
              }`}
            >
              ✗ Missed or rushed Beat 1
            </button>
          </div>
        </div>
      )}

      {/* 3. Diagnostic Friction Tags */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-stone-300 block">
          3. Select any friction points experienced:
        </label>
        <div className="flex flex-wrap gap-2">
          {diagnosticOptions.map((issue) => {
            const isSel = selectedIssues.includes(issue);
            return (
              <button
                key={issue}
                type="button"
                onClick={() => toggleIssue(issue)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                }`}
              >
                {issue}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Adaptive Next Step Guidance */}
      {feeling && (
        <div
          className={`p-4 rounded-2xl border-2 space-y-2 ${
            feeling === 'CLEAN_AND_RELAXED'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : feeling === 'MOSTLY_CLEAN'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">
              Coach Recommendation:
            </span>
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            {feeling === 'CLEAN_AND_RELAXED' &&
              `Strong run at ${currentTempo} BPM. Save this as practice evidence; progression still follows the curriculum's evidence and verification rules.`}
            {feeling === 'MOSTLY_CLEAN' &&
              `Solid attempt! A brief repetition in FOLLOW mode or consolidating at this tempo will lock in effortless muscle memory.`}
            {feeling === 'INCONSISTENT' &&
              `Good effort! Review the COUNT stage to lock the syllables into your voice, then repeat with Full Follow Cues.`}
            {feeling === 'TOO_DIFFICULT' &&
              `Smart self-awareness! Drop tempo by 5-10 BPM and count aloud with Stage 2 before playing again.`}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onRepeatStage('COUNT')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-bold border border-stone-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Review Count</span>
          </button>
          <button
            type="button"
            onClick={() => onRepeatStage('FOLLOW')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-bold border border-stone-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Follow</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!feeling}
          onClick={handleComplete}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer ${
            feeling
              ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-amber-500/20'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Attempt & Complete</span>
        </button>
      </div>
    </div>
  );
};
