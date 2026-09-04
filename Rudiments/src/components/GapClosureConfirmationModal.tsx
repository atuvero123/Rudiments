import React from 'react';
import { GapClosurePlan } from '../types';
import {
  Wrench,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Compass,
  X,
} from 'lucide-react';

interface GapClosureConfirmationModalProps {
  plan: GapClosurePlan;
  onStartPractice: (plan: GapClosurePlan) => void;
  onReturnToSkill: () => void;
}

export const GapClosureConfirmationModal: React.FC<GapClosureConfirmationModalProps> = ({
  plan,
  onStartPractice,
  onReturnToSkill,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-6 animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onReturnToSkill}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl transition-colors"
          title="Return to Skill"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <Wrench className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Gap Closure Plan Created</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
              {plan.skillName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-stone-700">
                {plan.checkpointLevel} Checkpoint Remediation
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {plan.failedCriteria.length} {plan.failedCriteria.length === 1 ? 'gap' : 'gaps'} identified
              </span>
            </div>
          </div>
        </div>

        {/* Focus Breakdown List */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
            Targeted Remediation Focus
          </span>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {plan.failedCriteria.map((gap, idx) => (
              <div
                key={gap.criterionId}
                className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                    FOCUS {idx + 1}
                  </span>
                  <span className="text-[11px] font-black text-stone-900 break-words flex-1 text-right sm:text-left sm:flex-initial">
                    {gap.criterionTitle}
                  </span>
                </div>
                <p className="text-xs text-stone-700 font-medium pl-1 leading-relaxed">
                  → {gap.focusSummary}
                </p>
                {gap.description && (
                  <p className="text-[11px] text-stone-500 italic pl-1 leading-normal">
                    {gap.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Next Coaching Step Box */}
        <div className="bg-[#f7f7f4] border-2 border-[#4a523a]/25 rounded-2xl p-4 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#4a523a]">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>Next Coaching Step:</span>
          </div>
          <p className="text-stone-800 font-semibold text-xs leading-relaxed">
            Your upcoming practice sessions will prioritise these weaknesses before {plan.checkpointLevel} reassessment.
          </p>
          <p className="text-[11px] text-stone-600 pt-0.5">
            {plan.exercises.length} customized remediation drills have been added to your coaching queue.
          </p>
        </div>

        {/* Actions Button Grid */}
        <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => onStartPractice(plan)}
            className="w-full sm:flex-1 py-3.5 bg-[#3f4532] hover:bg-[#323827] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[46px]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START GAP CLOSURE PRACTICE</span>
          </button>

          <button
            onClick={onReturnToSkill}
            className="w-full sm:w-auto px-5 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center justify-center min-h-[46px]"
          >
            <span>RETURN TO SKILL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
