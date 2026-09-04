import React, { useState } from 'react';
import {
  CurriculumDecision,
  GranularSkill,
  DimensionReadinessLevel,
  CurriculumPathway,
  AdaptivePathAnalysis,
  EvaluatedDependency,
} from '../types';
import {
  Compass,
  Target,
  Drum,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Sliders,
  ShieldCheck,
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Repeat,
  Gauge,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface CurriculumDecisionCardProps {
  decision: CurriculumDecision;
  targetSkill?: GranularSkill;
  onPracticeDecision?: () => void;
  onPracticeSupportingGroove?: () => void;
  compact?: boolean;
}

export const CurriculumDecisionCard: React.FC<CurriculumDecisionCardProps> = ({
  decision,
  targetSkill,
  onPracticeDecision,
  onPracticeSupportingGroove,
  compact = false,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const {
    decision: pathway,
    reason,
    currentLimiter,
    nextTarget,
    supportingContext,
    difficultyChange,
    readiness,
    whatChanged,
    recommendedAction,
    adaptiveAnalysis,
    evidenceBreakdown,
    learningStack,
  } = decision;

  // Pathway Badge Styles
  const pathwayStyles: Record<
    CurriculumPathway,
    { label: string; bg: string; text: string; border: string; desc: string }
  > = {
    REMEDIATE: {
      label: 'Pathway: Remediate / Prepare',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      desc: 'Simplify problem & lock foundation / supporting groove first',
    },
    REINFORCE: {
      label: 'Pathway: Reinforce',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      desc: 'Solidify reliability at same musical difficulty',
    },
    PROGRESS: {
      label: 'Pathway: Progress / Independence',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      desc: 'Alter 1 difficulty dimension (e.g. less help / metronome only)',
    },
    VARY: {
      label: 'Pathway: Vary / Extend',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      desc: 'Extend phrase length / change entry point',
    },
    TRANSFER: {
      label: 'Pathway: Transfer',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
      desc: 'Apply in verified new song groove context',
    },
    CHECKPOINT: {
      label: 'Pathway: Checkpoint',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
      desc: 'Milestone evaluation ready',
    },
  };

  const pStyle = pathwayStyles[pathway] || pathwayStyles.REINFORCE;

  // Status helper for readiness pills
  const getReadinessPill = (level: DimensionReadinessLevel | string) => {
    switch (level) {
      case 'ESTABLISHED':
      case 'KNOWN_STABLE':
      case 'AUTOMATIC':
      case 'INDEPENDENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DEVELOPING':
      case 'REDUCED_CUES':
      case 'NEEDS_CALIBRATION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'FRAGILE':
      case 'FULL_GUIDANCE':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getPrereqTypeBadge = (classification?: string) => {
    switch (classification) {
      case 'HARD':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SUPPORTING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ENRICHMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getTempoStatusBadge = (status?: string) => {
    switch (status) {
      case 'ESTABLISHED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'STABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DEVELOPING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CALIBRATING':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LIMITED_EVIDENCE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  // Compact Mode (Widget / Sidebar)
  if (compact) {
    return (
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 border border-stone-800 shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#a4b584]" />
            <span className="text-xs font-black uppercase tracking-wider text-stone-200">
              Adaptive Curriculum · {decision.targetSkillName}
            </span>
          </div>
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
          >
            {pStyle.label}
          </span>
        </div>

        <p className="text-xs text-stone-200 font-medium leading-snug">
          {decision.nextTarget}
        </p>

        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-800">
          <span className="truncate">Limiter: {readiness.currentLimiter}</span>
          {onPracticeDecision && (
            <button
              onClick={onPracticeDecision}
              className="text-[#a4b584] hover:text-white font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Practice Target <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Adaptive Decision View
  const whyData = adaptiveAnalysis?.whyThisNext || {
    targetName: decision.targetSkillName,
    alreadyHave: [decision.currentCapability || 'Sticking mechanics and pulse foundation'],
    stillDeveloping: [readiness.limiterDescription],
    conclusion: reason,
  };

  const forwardRoadmap = adaptiveAnalysis?.whatHappensAfterThis || {
    current: nextTarget,
    nextIfStable: 'Reduced assistance & groove recovery lock',
    later: '2-beat phrase extension & dynamic tom voicing',
    eventually: 'Spontaneous musical fills in live worship & song environments',
  };

  const isPrerequisiteAction =
    adaptiveAnalysis?.adaptiveRecommendation.decision === 'PREPARE_PREREQUISITE' ||
    adaptiveAnalysis?.adaptiveRecommendation.decision === 'ISOLATE';

  return (
    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#4a523a]/10 text-[#4a523a] flex items-center justify-center font-bold shrink-0 mt-0.5">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full border border-[#4a523a]/20">
                BU2F-R2G Adaptive Learning Engine
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
              >
                {adaptiveAnalysis?.adaptiveRecommendation.decisionLabel || pStyle.label}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              Adaptive Next Step: {decision.targetSkillName}
            </h3>
          </div>
        </div>

        {/* Suggested Target BPM & Mode */}
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-stone-500 block uppercase font-bold">Suggested Target</span>
          <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 inline-block mt-0.5">
            {recommendedAction.suggestedBpm} BPM • {recommendedAction.phraseLength || '1 beat'} • {recommendedAction.assistanceMode || 'full'}
          </span>
        </div>
      </div>

      {/* 2. Active Target Skill vs Supporting Container Distinction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Active Target Skill Box */}
        <div className="bg-[#4a523a]/5 border border-[#4a523a]/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#4a523a] tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Active Target Skill
            </span>
            <span className="text-[10px] font-bold text-[#4a523a] bg-[#4a523a]/15 px-2 py-0.5 rounded-md">
              Primary Goal
            </span>
          </div>
          <h4 className="text-sm font-bold text-stone-900">{decision.targetSkillName}</h4>
          <p className="text-xs text-stone-700 leading-relaxed font-medium">
            {adaptiveAnalysis?.currentTarget || nextTarget}
          </p>
        </div>

        {/* Supporting Musical Container Box */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-stone-700 tracking-wider flex items-center gap-1.5">
              <Drum className="w-3.5 h-3.5 text-stone-600" />
              Supporting Musical Container
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                supportingContext.state === 'KNOWN_STABLE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {supportingContext.state === 'KNOWN_STABLE' ? 'Ready Bed' : 'Needs Preparation'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-stone-900">{supportingContext.contextName}</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            {supportingContext.reason}
          </p>
        </div>
      </div>

      {/* 3. WHY THIS NEXT? (High-Contrast, Explicit 3-Part Breakdown) */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4a523a]" />
          <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
            Why This Next Target?
          </h4>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Demonstrated */}
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-stone-900">You already show: </span>
              <span className="text-stone-700 font-medium">{whyData.alreadyHave.join(' • ')}</span>
            </div>
          </div>

          {/* Still Developing */}
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-stone-900">Still developing: </span>
              <span className="text-stone-700 font-medium">
                {whyData.stillDeveloping.length ? whyData.stillDeveloping.join(' • ') : readiness.limiterDescription}
              </span>
            </div>
          </div>

          {/* Conclusion */}
          <div className="flex items-start gap-2.5 pt-1 border-t border-stone-200">
            <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-stone-900">Therefore: </span>
              <span className="text-indigo-950 font-bold bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                {whyData.conclusion}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. WHAT HAPPENS AFTER THIS? (Forward Progression Ladder) */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[#a4b584] flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            What Happens After This? (Forward Roadmap)
          </span>
          <span className="text-[10px] text-stone-400 font-mono">Predictable Progression</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1">
          <div className="bg-stone-800/80 border border-[#a4b584]/40 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#a4b584] block">1. Current Step</span>
            <p className="text-stone-100 font-bold leading-snug">{forwardRoadmap.current}</p>
          </div>

          <div className="bg-stone-800/50 border border-stone-700/60 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-stone-400 block">2. Next If Stable</span>
            <p className="text-stone-300 font-medium leading-snug">{forwardRoadmap.nextIfStable}</p>
          </div>

          <div className="bg-stone-800/50 border border-stone-700/60 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-stone-400 block">3. Later Extension</span>
            <p className="text-stone-300 font-medium leading-snug">{forwardRoadmap.later}</p>
          </div>

          <div className="bg-stone-800/50 border border-stone-700/60 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-stone-400 block">4. Musical Freedom</span>
            <p className="text-stone-300 font-medium leading-snug">{forwardRoadmap.eventually}</p>
          </div>
        </div>
      </div>

      {/* 5. LEARNING STACK BANNER (If Temporary Prerequisite In Progress) */}
      {learningStack && learningStack.temporaryPrerequisite && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              Learning Stack: Temporary Prerequisite Active
            </span>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full">
              Auto-Return to Target
            </span>
          </div>

          <div className="text-xs text-amber-950 space-y-1">
            <p className="font-medium">
              We temporarily paused <span className="font-bold">{learningStack.mainGoal}</span> to build{' '}
              <span className="font-bold">{learningStack.temporaryPrerequisite.name}</span>.
            </p>
            <p className="text-amber-800">
              <span className="font-bold">Completion Condition: </span>
              {learningStack.completionCondition}
            </p>
          </div>
        </div>
      )}

      {/* 6. COLLAPSIBLE ADAPTIVE DECISION DIAGNOSTICS */}
      <div className="border border-stone-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#4a523a]" />
            <span className="text-xs font-black uppercase tracking-wider text-stone-800">
              Adaptive Decision Diagnostics (8 Dimensions & Evidence Breakdown)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
            <span>{showDiagnostics ? 'Hide Details' : 'Inspect Engine'}</span>
            {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDiagnostics && (
          <div className="p-5 space-y-5 bg-white border-t border-stone-200 text-xs">
            {/* 8-Dimensional Readiness Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-stone-700 block">
                1. Multi-Dimensional Readiness Assessment (8 Dimensions)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Technique</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.technicalControl)}`}>
                    {readiness.technicalControl}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Time/Pulse</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.timeAndPulse)}`}>
                    {readiness.timeAndPulse}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Container</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(supportingContext.state)}`}>
                    {supportingContext.state === 'KNOWN_STABLE' ? 'STABLE' : 'CALIBRATE'}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Placement</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.placement)}`}>
                    {readiness.placement}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Landing</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.landing)}`}>
                    {readiness.landing}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Recovery</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.recovery)}`}>
                    {readiness.recovery}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Independence</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(readiness.independence)}`}>
                    {readiness.independence.replace('_', ' ')}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-center">
                  <span className="text-[9px] text-stone-500 uppercase font-bold block mb-1">Tempo</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border inline-block ${getReadinessPill(adaptiveAnalysis?.eightDimensions.tempoReadiness || readiness.tempoReadiness || 'DEVELOPING')}`}>
                    {adaptiveAnalysis?.eightDimensions.tempoReadiness || readiness.tempoReadiness || 'DEVELOPING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Context-Specific Tempo Readiness Breakdown (BU2F-R2G-Fix1) */}
            {(adaptiveAnalysis?.contextTempos || readiness.contextTempos) && (
              <div className="space-y-2.5 bg-stone-50 border border-stone-200 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#4a523a]" />
                    <span className="text-[11px] font-black uppercase text-stone-800 tracking-wider">
                      Context-Specific Tempo Readiness
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Learning Tempo:</span>
                    <span className="text-xs font-black text-white bg-[#4a523a] px-2.5 py-0.5 rounded-full shadow-sm">
                      {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.currentLearningTempo} BPM
                    </span>
                  </div>
                </div>

                {/* 6 Tempo Evidence Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {/* 1. Isolated Execution */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Isolated Hands</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.isolatedTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.isolatedTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.isolatedTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.isolatedTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Clean: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.isolatedTempo.cleanCount || 0} runs
                    </span>
                  </div>

                  {/* 2. Pulse Tempo */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Subdivision Pulse</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.pulseTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.pulseTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.pulseTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.pulseTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Attempts: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.pulseTempo.attemptsCount || 0}
                    </span>
                  </div>

                  {/* 3. Placement Tempo */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Fill Insertion</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.placementTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.placementTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.placementTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.placementTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Clean: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.placementTempo.cleanCount || 0}
                    </span>
                  </div>

                  {/* 4. Landing Tempo */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Beat 1 Landing</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.landingTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.landingTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.landingTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.landingTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Landings: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.landingTempo.landingsCount || 0}
                    </span>
                  </div>

                  {/* 5. Recovery Tempo */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Groove Recovery</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.recoveryTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.recoveryTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.recoveryTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.recoveryTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Returns: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.recoveryTempo.recoveriesCount || 0}
                    </span>
                  </div>

                  {/* 6. Independent Musical Tempo */}
                  <div className="bg-white border border-stone-200/90 p-2.5 rounded-xl space-y-1">
                    <span className="text-[9px] text-stone-500 uppercase font-bold block">Unassisted Fill</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.independentMusicalTempo.bpm ? `${(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.independentMusicalTempo.bpm} BPM` : '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTempoStatusBadge((adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.independentMusicalTempo.status)}`}>
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.independentMusicalTempo.status}
                      </span>
                    </div>
                    <span className="text-[9px] text-stone-400 block truncate">
                      Unassisted: {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.independentMusicalTempo.unassistedCleanCount || 0}
                    </span>
                  </div>
                </div>

                {/* Reassurance and Decision Rationale */}
                {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.tempoDecisionReason && (
                  <div className="bg-white/80 border border-stone-200 p-3 rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-stone-900">
                      {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.tempoDecisionReason}
                    </p>
                    {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.reassuranceMessage && (
                      <p className="text-stone-600">
                        {(adaptiveAnalysis?.contextTempos || readiness.contextTempos)?.reassuranceMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Prerequisite Classification Gating */}
            {adaptiveAnalysis?.prerequisites && (
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-stone-700 block">
                  2. Prerequisite Gate (Hard vs Supporting vs Enrichment)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Hard Prerequisites */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border inline-block bg-rose-50 text-rose-700 border-rose-200">
                      Hard Prerequisites ({adaptiveAnalysis.prerequisites.hard.length})
                    </span>
                    <div className="space-y-1">
                      {adaptiveAnalysis.prerequisites.hard.map((p) => (
                        <div key={p.dependency.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate">{p.dependency.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 rounded ${p.state === 'SATISFIED' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                            {p.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supporting Prerequisites */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border inline-block bg-blue-50 text-blue-700 border-blue-200">
                      Supporting Containers ({adaptiveAnalysis.prerequisites.supporting.length})
                    </span>
                    <div className="space-y-1">
                      {adaptiveAnalysis.prerequisites.supporting.map((p) => (
                        <div key={p.dependency.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate">{p.dependency.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 rounded ${p.state === 'SATISFIED' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                            {p.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Enrichment Prerequisites */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border inline-block bg-purple-50 text-purple-700 border-purple-200">
                      Enrichment ({adaptiveAnalysis.prerequisites.enrichment.length})
                    </span>
                    <div className="space-y-1">
                      {adaptiveAnalysis.prerequisites.enrichment.map((p) => (
                        <div key={p.dependency.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate">{p.dependency.name}</span>
                          <span className="text-[9px] text-stone-500 font-medium">Non-blocking</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System-Observed vs User-Reported Evidence Breakdown */}
            {evidenceBreakdown && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-stone-700 block">
                    3. Evidence Breakdown & Decision Confidence
                  </span>
                  <span className="text-[10px] font-bold bg-[#4a523a]/10 text-[#4a523a] px-2 py-0.5 rounded-full border border-[#4a523a]/20">
                    Confidence: {evidenceBreakdown.decisionConfidence}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl space-y-1 text-stone-700">
                    <span className="text-[10px] font-black uppercase text-stone-500 block">System-Observed</span>
                    <p className="font-medium text-stone-900">{evidenceBreakdown.systemObserved.summary}</p>
                    <div className="text-[10px] text-stone-500 pt-1">
                      Assistance Tested: {evidenceBreakdown.systemObserved.assistanceLevelsTested.join(', ')} • Trend: {evidenceBreakdown.systemObserved.trend}
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl space-y-1 text-stone-700">
                    <span className="text-[10px] font-black uppercase text-stone-500 block">User-Reported</span>
                    <p className="font-medium text-stone-900">{evidenceBreakdown.userReported.summary}</p>
                    <div className="text-[10px] text-stone-500 pt-1">
                      Rationale: {evidenceBreakdown.confidenceReason}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. PRIMARY ACTION ROW */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-stone-500 font-medium">
          Target: <span className="font-bold text-stone-800">{decision.targetSkillName}</span> • Mode: <span className="font-bold text-stone-800">{recommendedAction.assistanceMode || 'Full Guidance'}</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {supportingContext.calibrationRecommended && onPracticeSupportingGroove && (
            <button
              onClick={onPracticeSupportingGroove}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-3 rounded-2xl transition-colors cursor-pointer border border-amber-300"
            >
              <Drum className="w-4 h-4" />
              Calibrate Groove First
            </button>
          )}

          {onPracticeDecision && (
            <button
              onClick={onPracticeDecision}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#4a523a] hover:bg-[#3d4430] text-white px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-transform transform active:scale-95 shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              {recommendedAction.label || `Practice ${decision.targetSkillName} Next Step`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
