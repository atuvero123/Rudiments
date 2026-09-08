import React from 'react';
import { RoadmapDecision, GranularSkill } from '../types';
import {
  Compass,
  Target,
  Drum,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface RoadmapWhyThisNextCardProps {
  decision: RoadmapDecision;
  targetSkill?: GranularSkill;
  onPracticeTarget?: () => void;
  onPracticeSupportingGroove?: () => void;
  compact?: boolean;
}

export const RoadmapWhyThisNextCard: React.FC<RoadmapWhyThisNextCardProps> = ({
  decision,
  targetSkill,
  onPracticeTarget,
  onPracticeSupportingGroove,
  compact = false,
}) => {
  const { whyThisNext, supportingSkill, curriculumStage, recommendedNextStep, roadmapReason } = decision;

  const stageBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    UNDERSTAND: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
    CONTROL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    PLACE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
    TRANSFER: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
    VARY: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  };

  const badgeStyle = stageBadgeColors[curriculumStage] || stageBadgeColors.PLACE;

  if (compact) {
    return (
      <div className="bg-stone-900 text-stone-100 rounded-xl p-3.5 border border-stone-800 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#78855e]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
              Why This Next? · {decision.targetSkillName}
            </span>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
            {curriculumStage} Stage
          </span>
        </div>
        <p className="text-xs text-stone-300 font-medium leading-snug mb-2">
          {whyThisNext.todayGoal}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <span className="text-stone-400">Container:</span>
          <span className="text-[#a4b584] font-semibold">{supportingSkill?.name || 'Basic 4/4'}</span>
          <span className="text-stone-600">•</span>
          <span className="truncate">{whyThisNext.reason}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4a523a]/10 text-[#4a523a] flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a523a]">
                Guided Roadmap Recommendation
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
              >
                {curriculumStage} STAGE
              </span>
            </div>
            <h3 className="text-lg font-black text-stone-900 tracking-tight">
              Why This Next: {decision.targetSkillName}
            </h3>
          </div>
        </div>

        {/* Small next step pill */}
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-stone-600 block uppercase font-bold">Recommended Step</span>
          <span className="text-xs font-bold text-stone-800 font-mono">
            {decision.currentGoal}
          </span>
        </div>
      </div>

      {/* Target vs Supporting Skill Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Target Skill Box */}
        <div className="bg-[#4a523a]/5 border border-[#4a523a]/20 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#4a523a] tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Active Target Skill
            </span>
            <span className="text-[10px] font-bold text-[#4a523a] bg-[#4a523a]/15 px-2 py-0.5 rounded-md">
              Focus Goal
            </span>
          </div>
          <h4 className="text-sm font-bold text-stone-900">{decision.targetSkillName}</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            {decision.estimatedPracticeFocus || roadmapReason}
          </p>
        </div>

        {/* Supporting Skill Box */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-stone-700 tracking-wider flex items-center gap-1.5">
              <Drum className="w-3.5 h-3.5 text-stone-600" />
              Supporting Musical Container
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                supportingSkill?.needsMiniLesson
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {supportingSkill?.needsMiniLesson ? 'Needs Refresh' : 'Stable Bed'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-stone-900">{supportingSkill?.name || 'Basic 4/4 Groove'}</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            {supportingSkill?.roleExplanation ||
              'A simple groove gives you a stable musical frame so you can focus on fill entry and downbeat landing.'}
          </p>
        </div>
      </div>

      {/* Granular "Why" Rationale Points */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 space-y-3">
        {/* What learner already has */}
        {whyThisNext.alreadyHave && whyThisNext.alreadyHave.length > 0 && (
          <div className="flex items-start gap-2.5 text-xs text-stone-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900">What you already possess: </span>
              <span className="text-stone-600">{whyThisNext.alreadyHave.join(' • ')}</span>
            </div>
          </div>
        )}

        {/* Pedagogical Reason */}
        <div className="flex items-start gap-2.5 text-xs text-stone-700">
          <Sparkles className="w-4 h-4 text-[#4a523a] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-900">Why this container: </span>
            <span className="text-stone-600">{whyThisNext.reason}</span>
          </div>
        </div>

        {/* Today's Goal */}
        <div className="flex items-start gap-2.5 text-xs text-stone-700">
          <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-900">Today's clear milestone: </span>
            <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
              {whyThisNext.todayGoal}
            </span>
          </div>
        </div>

        {/* Next After This */}
        <div className="flex items-start gap-2.5 text-xs text-stone-700">
          <ArrowRight className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-900">Where this is leading: </span>
            <span className="text-stone-600">{whyThisNext.nextAfterThis}</span>
          </div>
        </div>
      </div>

      {/* Supporting Groove Alert if Unstable */}
      {supportingSkill?.needsMiniLesson && onPracticeSupportingGroove && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-snug">
              <span className="font-bold block mb-0.5">Supporting Groove Foundation Recommended</span>
              The fill requires a steady timekeeping bed. Take a 3-minute mini-lesson to lock{' '}
              {supportingSkill.name}, then return immediately to {decision.targetSkillName}.
            </div>
          </div>

          <button
            onClick={onPracticeSupportingGroove}
            className="shrink-0 flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Drum className="w-3.5 h-3.5" />
            Learn Supporting Groove First (3m)
          </button>
        </div>
      )}

      {/* Primary Action Row */}
      {onPracticeTarget && (
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={onPracticeTarget}
            className="flex items-center gap-2 bg-[#4a523a] hover:bg-[#3d4430] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Practice This Target Step
          </button>
        </div>
      )}
    </div>
  );
};
