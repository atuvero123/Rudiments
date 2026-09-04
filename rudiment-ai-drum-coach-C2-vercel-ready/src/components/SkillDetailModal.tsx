import React, { useState, useRef, useEffect } from 'react';
import {
  GranularSkill,
  SkillStatus,
  SKILL_STATUS_CONFIG,
  READINESS_STATE_CONFIG,
  GapClosurePlan,
} from '../types';
import { useLearner } from '../context/LearnerContext';
import { getSkillEvidenceMemory, getAttemptsForSkill } from '../lib/evidenceEngine';
import { deriveSkillProgressionInfo } from '../lib/progressionEngine';
import { derivePlacementEvidenceMemory } from '../lib/placementEngine';
import { deriveSkillReadiness } from '../lib/readinessEngine';
import { evaluateSkillRoadmap } from '../lib/roadmapEngine';
import { evaluateCurriculumDecision } from '../lib/curriculumDecisionEngine';
import { RoadmapWhyThisNextCard } from './RoadmapWhyThisNextCard';
import { CurriculumDecisionCard } from './CurriculumDecisionCard';
import {
  getActiveGapClosurePlan,
  isPlanReadyForReassessment,
  generateGapClosurePlan,
  saveGapClosurePlan,
  getLatestCheckpointAttemptForSkill,
  getPlanRemediationBreakdown,
} from '../lib/gapClosureEngine';
import { CheckpointModal } from './CheckpointModal';
import { GapClosureConfirmationModal } from './GapClosureConfirmationModal';
import {
  X,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Plus,
  Play,
  Flame,
  Tag,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Music,
  ShieldCheck,
  Check,
  Award,
  Wrench,
  RotateCcw,
  Compass,
  Drum,
  ArrowRight,
} from 'lucide-react';

interface SkillDetailModalProps {
  skill: GranularSkill | null;
  onClose: () => void;
  onPracticeSkill?: (skill: GranularSkill) => void;
  onRequestCoachGapPlan?: (skillName: string, failedCriteria: string[], plan?: GapClosurePlan) => void;
  onStartGapClosurePractice?: (plan: GapClosurePlan) => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  onClose,
  onPracticeSkill,
  onRequestCoachGapPlan,
  onStartGapClosurePractice,
}) => {
  const {
    profile,
    skills,
    updateSkill,
    launchGapClosurePractice,
    launchPlacementPractice,
    launchSupportingGrooveMiniLesson,
    launchCurriculumDecisionPractice,
    addSkillToActiveRoadmap,
    activeThreads,
  } = useLearner();

  if (!skill) return null;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Authoritative skill from central LearnerContext
  const authoritativeSkill = skills.find((s) => s.id === skill.id) || skill;

  // Local editable draft state
  const [status, setStatus] = useState<SkillStatus>(authoritativeSkill.status);
  const [confidence, setConfidence] = useState<number>(authoritativeSkill.confidence);
  const [currentComfortTempo, setCurrentComfortTempo] = useState<number | undefined>(
    authoritativeSkill.currentComfortTempo
  );
  const [targetTempo, setTargetTempo] = useState<number | undefined>(authoritativeSkill.targetTempo);
  const [notes, setNotes] = useState<string>(authoritativeSkill.notes || '');
  const [knownGaps, setKnownGaps] = useState<string[]>(authoritativeSkill.knownGaps || []);
  const [newGapInput, setNewGapInput] = useState<string>('');
  const [practiceCount, setPracticeCount] = useState<number>(authoritativeSkill.practiceCount || 0);

  // Synchronize local draft state whenever the underlying skill or its status is updated
  useEffect(() => {
    setStatus(authoritativeSkill.status);
    setConfidence(authoritativeSkill.confidence);
    setCurrentComfortTempo(authoritativeSkill.currentComfortTempo);
    setTargetTempo(authoritativeSkill.targetTempo);
    setNotes(authoritativeSkill.notes || '');
    setKnownGaps(authoritativeSkill.knownGaps || []);
    setPracticeCount(authoritativeSkill.practiceCount || 0);
  }, [authoritativeSkill.id, authoritativeSkill.status]);

  // Scroll to top upon opening or changing skill
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [authoritativeSkill.id]);

  // Active combined skill representation
  const activeSkillState: GranularSkill = {
    ...authoritativeSkill,
    status,
    confidence,
    currentComfortTempo,
    targetTempo,
    notes,
    knownGaps,
    practiceCount,
  };

  const attempts = getAttemptsForSkill(activeSkillState.id);
  const evidenceMemory = getSkillEvidenceMemory(activeSkillState.id);
  const progressionInfo = deriveSkillProgressionInfo(
    activeSkillState.id,
    activeSkillState.name,
    evidenceMemory,
    attempts
  );
  const readiness = deriveSkillReadiness(activeSkillState);
  const activeGapPlan = getActiveGapClosurePlan(activeSkillState.id);
  const activeGapBreakdown = activeGapPlan ? getPlanRemediationBreakdown(activeGapPlan) : null;

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [activeConfirmationPlan, setActiveConfirmationPlan] = useState<GapClosurePlan | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const handleAddGap = () => {
    if (!newGapInput.trim()) return;
    setKnownGaps([...knownGaps, newGapInput.trim()]);
    setNewGapInput('');
  };

  const handleRemoveGap = (index: number) => {
    setKnownGaps(knownGaps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateSkill(activeSkillState.id, {
      status,
      confidence,
      currentComfortTempo,
      targetTempo,
      notes,
      knownGaps,
      practiceCount,
      dateLastPracticed: new Date().toISOString().split('T')[0],
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCheckpointConfirmed = (skillId: string, newStatus: SkillStatus) => {
    setStatus(newStatus);
    updateSkill(skillId, {
      status: newStatus,
      source: 'assessment',
      dateLastPracticed: new Date().toISOString().split('T')[0],
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleContinueGapPractice = () => {
    if (!activeGapPlan) return;
    const result = launchGapClosurePractice(activeGapPlan.id);
    if (!result.success) {
      setLaunchError(result.error || 'Gap Closure exercises could not be loaded.');
    } else {
      setLaunchError(null);
      if (onStartGapClosurePractice) {
        onStartGapClosurePractice(activeGapPlan);
      }
      onClose();
    }
  };

  const handleRebuildPlan = () => {
    if (!activeGapPlan) return;
    const latestAttempt = getLatestCheckpointAttemptForSkill(activeSkillState.id);
    if (latestAttempt && latestAttempt.criteriaResults) {
      const failed = latestAttempt.criteriaResults.filter((c) => !c.passed);
      const rebuiltPlan = generateGapClosurePlan({
        skill: activeSkillState,
        checkpointAttempt: latestAttempt,
        failedCriteria: failed,
        workingBpm: evidenceMemory.currentWorkingBpm || activeSkillState.currentComfortTempo || 70,
      });
      saveGapClosurePlan(rebuiltPlan);
      setLaunchError(null);
      handleContinueGapPractice();
    } else {
      setLaunchError('Could not auto-rebuild plan. Please launch a new Checkpoint Assessment.');
    }
  };

  const currentStatusConfig = SKILL_STATUS_CONFIG[status];
  const readinessCfg = READINESS_STATE_CONFIG[readiness.readinessState];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white border border-stone-200 rounded-2xl sm:rounded-3xl w-[calc(100vw-1rem)] sm:w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 overflow-hidden">
        
        {/* STICKY ACCESSIBLE HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex items-start justify-between gap-3 shrink-0 sticky top-0 z-10">
          <div className="space-y-1 pr-2 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full border border-[#4a523a]/20">
                {skill.parentTrack} • {skill.category}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentStatusConfig.bg} ${currentStatusConfig.text} ${currentStatusConfig.border}`}>
                {currentStatusConfig.label}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                {skill.source === 'user'
                  ? 'USER PROVIDED'
                  : skill.source === 'assessment'
                  ? 'ASSESSED'
                  : skill.source === 'practice_log'
                  ? 'PRACTICE LOG'
                  : skill.source === 'coach_inference'
                  ? 'COACH INFERENCE'
                  : 'DEFAULT UNASSESSED'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1 truncate">
              {skill.name}
            </h2>
            <p className="text-xs text-stone-600 line-clamp-2 sm:line-clamp-none leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Close button with accessible touch target */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close skill details"
            className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-2 rounded-xl transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* UNIFIED VERTICAL SCROLL CONTAINER */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5"
        >
          {/* Status Selection Buttons */}
          <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Update Execution Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SKILL_STATUS_CONFIG) as SkillStatus[]).map((stKey) => {
                const cfg = SKILL_STATUS_CONFIG[stKey];
                const isSelected = status === stKey;
                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setStatus(stKey)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between min-h-[44px] ${
                      isSelected
                        ? 'bg-[#3f4532] text-white border-[#3f4532] shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Status Explanation Banner */}
            <p className="text-[11px] text-stone-600 italic pt-1 flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
              <span>
                <strong>{currentStatusConfig.label}:</strong> {currentStatusConfig.description}
              </span>
            </p>
          </div>

          {/* Confidence & Tempos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Confidence Stars */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold text-stone-800 block">Self-Confidence Rating:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setConfidence(star)}
                    className={`p-1.5 transition-transform min-w-[36px] min-h-[36px] flex items-center justify-center ${
                      star <= confidence ? 'text-amber-500 scale-110' : 'text-stone-300'
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current stroke-1" />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold text-stone-600 ml-2">
                  {confidence} / 5
                </span>
              </div>
            </div>

            {/* Tempos */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold text-stone-800 block">Tempo Progress (BPM):</span>
              <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                <div>
                  <label className="text-[10px] text-stone-500 block">Comfortable</label>
                  <input
                    type="number"
                    value={currentComfortTempo || ''}
                    onChange={(e) =>
                      setCurrentComfortTempo(
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    placeholder="e.g. 80"
                    className="w-20 bg-white border border-stone-300 p-2 rounded-lg text-stone-900 font-bold text-center focus:outline-none focus:border-[#4a523a] min-h-[40px]"
                  />
                </div>
                <span className="text-stone-400 font-bold mt-3">→</span>
                <div>
                  <label className="text-[10px] text-stone-500 block">Target</label>
                  <input
                    type="number"
                    value={targetTempo || ''}
                    onChange={(e) =>
                      setTargetTempo(
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    placeholder="e.g. 120"
                    className="w-20 bg-white border border-stone-300 p-2 rounded-lg text-stone-900 font-bold text-center focus:outline-none focus:border-[#4a523a] min-h-[40px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE CHECKPOINT GAP CLOSURE CARD */}
          {activeGapPlan && (() => {
            const breakdown = getPlanRemediationBreakdown(activeGapPlan);
            return (
              <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                          ACTIVE GAP CLOSURE
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {activeGapPlan.checkpointLevel} Checkpoint
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-stone-900 mt-0.5">
                        {breakdown.remediatedCriteriaCount} of {breakdown.totalCriteriaCount} Gaps Remediated
                      </h4>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {breakdown.isAllCriteriaRemediated ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowCheckpointModal(true)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ring-2 ring-emerald-500/40 animate-pulse min-h-[44px]"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Reassess {activeGapPlan.checkpointLevel} Checkpoint</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleContinueGapPractice}
                          className="w-full sm:w-auto px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Practice Again</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleContinueGapPractice}
                        className="w-full sm:w-auto px-4 py-2.5 bg-[#3f4532] hover:bg-[#323827] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Continue Gap Practice</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Launcher Error Banner with Rebuild Action (Requirement 5) */}
                {launchError && (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 space-y-3 text-xs text-rose-950 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-900 block">
                          GAP CLOSURE PRACTICE COULD NOT START
                        </span>
                        <p className="text-xs text-rose-800 font-medium leading-relaxed">
                          <strong>Reason:</strong> {launchError}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleRebuildPlan}
                        className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 min-h-[40px] shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>REBUILD GAP PLAN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLaunchError(null)}
                        className="px-3.5 py-2 bg-white hover:bg-rose-100 text-rose-900 font-bold rounded-xl text-xs border border-rose-300 min-h-[40px]"
                      >
                        <span>RETURN TO SKILL</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Criteria Breakdown */}
                <div className="space-y-2 pt-1 border-t border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider block">
                      Criterion Remediation Progress:
                    </span>
                    <span className="text-[10px] font-mono text-stone-600 font-bold">
                      {breakdown.completedRemediationDrills} / {breakdown.totalRemediationDrills} targeted evidence units completed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {breakdown.criteriaStatuses.map((c, idx) => (
                      <div
                        key={c.criterionId}
                        className={`border rounded-xl p-2.5 space-y-1.5 text-xs transition-all ${
                          c.isRemediated
                            ? 'bg-emerald-50/90 border-emerald-300'
                            : c.status === 'in_progress'
                            ? 'bg-sky-50/90 border-sky-300'
                            : 'bg-white/90 border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-stone-900 text-xs block leading-tight">
                            {idx + 1}. {c.criterionTitle}
                          </span>
                          {c.isRemediated ? (
                            <span className="shrink-0 bg-emerald-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Remediated</span>
                            </span>
                          ) : c.status === 'in_progress' ? (
                            <span className="shrink-0 bg-sky-100 text-sky-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-sky-300 uppercase tracking-wider">
                              In Progress
                            </span>
                          ) : (
                            <span className="shrink-0 bg-amber-100 text-amber-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug">
                          → {c.focusSummary}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5 font-mono">
                          <span>Drills: {c.completedDrills}/{Math.max(1, c.totalDrills)}</span>
                          {c.lastAssessment && (
                            <span className="capitalize text-stone-600">
                              Feeling: {c.lastAssessment.replace('_', ' ').toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress / Reassessment Readiness notice */}
                <div className={`rounded-xl p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
                  breakdown.isAllCriteriaRemediated
                    ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950 font-medium'
                    : 'bg-amber-100/70 border-amber-300/80 text-amber-950'
                }`}>
                  <span>
                    {breakdown.isAllCriteriaRemediated ? (
                      <strong>✓ All {breakdown.totalCriteriaCount} failed criteria remediated in practice. Launch Checkpoint to verify and pass.</strong>
                    ) : (
                      <>
                        <strong>Remediation Status:</strong> {breakdown.remediatedCriteriaCount} of {breakdown.totalCriteriaCount} gaps addressed ({breakdown.completedRemediationDrills} of {breakdown.totalRemediationDrills} targeted evidence units completed)
                      </>
                    )}
                  </span>
                  {breakdown.isAllCriteriaRemediated && (
                    <span className="font-black text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded border border-emerald-400 text-[10px] uppercase self-start sm:self-auto shrink-0">
                      Ready for Reassessment
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* BU2F — SKILL READINESS & CHECKPOINT STATUS SECTION */}
          <div className={`p-4 sm:p-5 rounded-2xl border-2 space-y-4 ${
            readiness.readinessState === 'READY_FOR_CHECKPOINT'
              ? 'bg-emerald-50/70 border-emerald-500/40'
              : readiness.readinessState === 'NEARLY_READY'
              ? 'bg-amber-50/70 border-amber-500/40'
              : readiness.readinessState === 'NOT_READY'
              ? 'bg-rose-50/60 border-rose-400/40'
              : 'bg-stone-50 border-stone-300'
          }`}>
            {/* Header Row with Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${readinessCfg.bg} ${readinessCfg.text} border ${readinessCfg.border} shrink-0`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                    CHECKPOINT READINESS & ELIGIBILITY
                  </span>
                  <h4 className="text-sm font-black text-stone-900">
                    {readiness.readinessState === 'READY_FOR_CHECKPOINT'
                      ? 'Ready for Checkpoint'
                      : readiness.readinessState === 'NEARLY_READY'
                      ? 'Nearly Ready'
                      : readiness.readinessState === 'DEVELOPING'
                      ? 'Developing'
                      : readiness.readinessState === 'INSUFFICIENT_EVIDENCE'
                      ? 'Insufficient Evidence'
                      : 'Not Yet Ready'}
                  </h4>
                </div>
              </div>

              {/* Checkpoint / Practice Action Button */}
              {readiness.targetStatus && (
                activeGapPlan && activeGapBreakdown && !activeGapBreakdown.isAllCriteriaRemediated && readiness.targetStatus === activeGapPlan.checkpointLevel ? (
                  <div className="flex flex-col items-stretch sm:items-end gap-1">
                    <button
                      type="button"
                      onClick={handleContinueGapPractice}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                      title="Active gap closure in progress — complete remaining remediation before reassessment."
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Continue Gap Remediation</span>
                    </button>
                    <span className="text-[10px] text-amber-800 font-medium italic text-center sm:text-right">
                      Active gap closure in progress — complete remaining remediation before reassessment.
                    </span>
                  </div>
                ) : readiness.targetStatus === 'APPLICABLE' && readiness.readinessState !== 'READY_FOR_CHECKPOINT' ? (
                  <div className="flex flex-col items-stretch sm:items-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        launchPlacementPractice(skill.id);
                      }}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] bg-[#3f4532] hover:bg-[#323827] text-white cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Placement Practice</span>
                    </button>
                    <span className="text-[10px] text-stone-500 font-medium italic text-center sm:text-right">
                      Gated until placement & downbeat evidence is established.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCheckpointModal(true)}
                    className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      readiness.readinessState === 'READY_FOR_CHECKPOINT'
                        ? 'bg-[#3f4532] hover:bg-[#323827] text-white ring-2 ring-emerald-500/50 animate-pulse'
                        : readiness.readinessState === 'NEARLY_READY'
                        ? 'bg-amber-700 hover:bg-amber-800 text-white'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {readiness.readinessState === 'READY_FOR_CHECKPOINT'
                        ? `Launch ${readiness.targetStatus} Checkpoint`
                        : `Challenge ${readiness.targetStatus} Checkpoint`}
                    </span>
                  </button>
                )
              )}
            </div>

            {/* 4-Dimension Competency Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/80 border border-stone-200 p-2.5 rounded-xl space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                  Current Execution
                </span>
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${SKILL_STATUS_CONFIG[status].bg} ${SKILL_STATUS_CONFIG[status].text} ${SKILL_STATUS_CONFIG[status].border}`}>
                  {SKILL_STATUS_CONFIG[status].label}
                </span>
              </div>

              <div className="bg-white/80 border border-stone-200 p-2.5 rounded-xl space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                  Development Stage
                </span>
                <span className="text-[11px] font-bold text-stone-800 block truncate">
                  {progressionInfo.currentStage}
                </span>
              </div>

              <div className="bg-white/80 border border-stone-200 p-2.5 rounded-xl space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                  Next Formal Checkpoint
                </span>
                <span className="text-[11px] font-black text-emerald-800 block truncate">
                  {readiness.targetStatus ? `${readiness.targetStatus} Checkpoint` : 'Fully Mastered'}
                </span>
              </div>

              <div className="bg-white/80 border border-stone-200 p-2.5 rounded-xl space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                  Checkpoint Eligibility
                </span>
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${readinessCfg.bg} ${readinessCfg.text} ${readinessCfg.border} truncate`}>
                  {readiness.readinessState === 'READY_FOR_CHECKPOINT' ? 'Ready for Checkpoint' : readinessCfg.label}
                </span>
              </div>
            </div>

            {/* Readiness Summary */}
            <p className="text-xs text-stone-700 leading-relaxed font-medium">
              {readiness.readinessSummary}
            </p>

            {/* Requirements Checklist Breakdown */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                <span>Milestone Requirements Breakdown</span>
                <span>{readiness.metRequirementsCount} of {readiness.totalRequirementsCount} Met</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readiness.requirements.map((req) => (
                  <div
                    key={req.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      req.met
                        ? 'bg-white border-emerald-300 text-emerald-950'
                        : 'bg-white/70 border-stone-200 text-stone-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        req.met
                          ? 'bg-emerald-600 text-white'
                          : 'border border-stone-300 bg-stone-100 text-stone-400'
                      }`}
                    >
                      {req.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="text-[9px]">○</span>}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold block leading-tight truncate ${req.met ? 'text-emerald-900' : 'text-stone-800'}`}>
                          {req.label}
                        </span>
                        {req.statusLabel && (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                            req.met
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : 'bg-stone-100 border-stone-200 text-stone-600'
                          }`}>
                            {req.statusLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 block leading-tight">
                        {req.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Blockers Callout */}
            {(readiness.blockers.length > 0 || readiness.strengths.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {readiness.strengths.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-900 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Strengths Demonstrated
                    </span>
                    {readiness.strengths.map((s, i) => (
                      <p key={i} className="text-[11px]">• {s}</p>
                    ))}
                  </div>
                )}

                {readiness.blockers.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-rose-900 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" /> Active Friction / Blockers
                    </span>
                    {readiness.blockers.map((b, i) => (
                      <p key={i} className="text-[11px]">• {b}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendation */}
            <div className="bg-white/80 p-2.5 rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900">Coach Guidance: </span>
                <span>{readiness.nextActionRecommendation}</span>
              </div>
            </div>
          </div>

          {/* Practice Evidence Section (BU2B Session Memory & Evidence Engine) */}
          <div className="bg-[#f8f8f6] border-2 border-[#4a523a]/25 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#4a523a]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#4a523a]">
                  PRACTICE EVIDENCE
                </span>
              </div>
              {evidenceMemory.totalAttempts > 0 && (
                <span className="text-[10px] font-mono font-bold text-stone-500">
                  Last: {evidenceMemory.lastPracticedAt || 'Today'}
                </span>
              )}
            </div>

            {evidenceMemory.totalAttempts === 0 ? (
              <div className="bg-white/80 p-3 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                <p className="font-semibold text-stone-800">
                  Not enough practice evidence yet.
                </p>
                <p className="text-[11px] text-stone-500">
                  Complete guided practice sessions to establish a reliable baseline.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Sessions
                    </span>
                    <span className="font-black text-stone-900 text-sm">{evidenceMemory.totalSessions}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Attempts
                    </span>
                    <span className="font-black text-stone-900 text-sm">{evidenceMemory.totalAttempts}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Working BPM
                    </span>
                    <span className="font-black text-[#4a523a] text-sm">
                      {evidenceMemory.currentWorkingBpm ? `${evidenceMemory.currentWorkingBpm} BPM` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Clean Best
                    </span>
                    <span className="font-black text-emerald-700 text-sm">
                      {evidenceMemory.highestCleanBpm ? `${evidenceMemory.highestCleanBpm} BPM` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Trend & Friction Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Trend */}
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Recent Trend
                    </span>
                    <div className="font-bold flex items-center gap-1">
                      {evidenceMemory.recentTrend === 'improving' && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> ↑ Improving
                        </span>
                      )}
                      {evidenceMemory.recentTrend === 'stable' && (
                        <span className="text-sky-700 flex items-center gap-1">
                          <Minus className="w-3.5 h-3.5" /> → Stable
                        </span>
                      )}
                      {evidenceMemory.recentTrend === 'struggling' && (
                        <span className="text-rose-700 flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" /> ↓ Struggling
                        </span>
                      )}
                      {evidenceMemory.recentTrend === 'insufficient_evidence' && (
                        <span className="text-stone-500 text-[11px] italic">
                          Insufficient Evidence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recurring Friction */}
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-0.5 col-span-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                      Recurring Friction
                    </span>
                    {evidenceMemory.primaryRecurringFriction ? (
                      <p className="font-bold text-amber-800 text-[11px] truncate">
                        ⚠️ {evidenceMemory.primaryRecurringFriction.tag}{' '}
                        <span className="text-stone-500 font-normal">
                          ({evidenceMemory.primaryRecurringFriction.count} of last {evidenceMemory.primaryRecurringFriction.totalRecentEncounters} sessions)
                        </span>
                      </p>
                    ) : (
                      <p className="text-stone-600 text-[11px] italic">
                        None detected across recent sessions
                      </p>
                    )}
                  </div>
                </div>

                {/* Recovery Mode Stats */}
                {evidenceMemory.recoveryModeCount > 0 && (
                  <div className="text-[11px] font-medium text-stone-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
                    <span>🛑 Recovery Mode Triggered:</span>
                    <span className="font-bold text-rose-800">{evidenceMemory.recoveryModeCount} times</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SKILL DEVELOPMENT COMPACT SECTION (BU2D) */}
          <div className="bg-[#4a523a]/10 border border-[#4a523a]/30 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#4a523a]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#4a523a]">
                  SKILL DEVELOPMENT
                </span>
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#4a523a] text-white uppercase">
                Current Stage: {progressionInfo.currentStage}
              </span>
            </div>

            {/* Compact Stages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
              {(['FOUNDATION', 'CONTROL', 'ENDURANCE', 'APPLICATION', 'TRANSFER'] as const).map((stg) => {
                const stStatus = progressionInfo.stageStatuses[stg];
                return (
                  <div
                    key={stg}
                    className={`p-2 rounded-xl border text-center space-y-0.5 ${
                      stg === progressionInfo.currentStage
                        ? 'bg-white border-[#4a523a] shadow-xs'
                        : stStatus === 'Established'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-stone-100/60 border-stone-200 text-stone-500'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 block truncate">
                      {stg}
                    </span>
                    <span
                      className={`font-black block text-[10px] truncate ${
                        stStatus === 'Established'
                          ? 'text-emerald-700'
                          : stStatus === 'Developing'
                          ? 'text-[#4a523a]'
                          : 'text-stone-400'
                      }`}
                    >
                      {stStatus}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Next Target */}
            <div className="bg-white p-2.5 rounded-xl border border-[#4a523a]/20 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] block">
                Next Target:
              </span>
              <p className="font-bold text-stone-900 mt-0.5 leading-snug">
                {progressionInfo.nextDevelopmentTarget}
              </p>
            </div>
          </div>

          {/* MUSICAL PLACEMENT & APPLICATION SECTION (BU2E) */}
          {(() => {
            const placementMem = derivePlacementEvidenceMemory(skill.id);
            return (
              <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl space-y-3 border border-stone-800 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      MUSICAL PLACEMENT & DOWNBEAT LANDING
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                    BU2E Placement Engine
                  </span>
                </div>

                {/* Placement Phrase Statuses */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-stone-800/90 p-2.5 rounded-xl border border-stone-700">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block truncate">
                      1-Beat Fills
                    </span>
                    <span className={`font-black text-xs block truncate ${
                      placementMem.oneBeatStatus === 'Established' ? 'text-emerald-400' : placementMem.oneBeatStatus === 'Developing' ? 'text-amber-300' : 'text-stone-500'
                    }`}>
                      {placementMem.oneBeatStatus}
                    </span>
                  </div>

                  <div className="bg-stone-800/90 p-2.5 rounded-xl border border-stone-700">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block truncate">
                      2-Beat Fills
                    </span>
                    <span className={`font-black text-xs block truncate ${
                      placementMem.twoBeatStatus === 'Established' ? 'text-emerald-400' : placementMem.twoBeatStatus === 'Developing' ? 'text-amber-300' : 'text-stone-500'
                    }`}>
                      {placementMem.twoBeatStatus}
                    </span>
                  </div>

                  <div className="bg-stone-800/90 p-2.5 rounded-xl border border-stone-700">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block truncate">
                      1-Bar Fills
                    </span>
                    <span className={`font-black text-xs block truncate ${
                      placementMem.fullBarStatus === 'Established' ? 'text-emerald-400' : placementMem.fullBarStatus === 'Developing' ? 'text-amber-300' : 'text-stone-500'
                    }`}>
                      {placementMem.fullBarStatus}
                    </span>
                  </div>

                  <div className="bg-stone-800/90 p-2.5 rounded-xl border border-stone-700">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block truncate">
                      Groove Return
                    </span>
                    <span className={`font-black text-xs block truncate ${
                      placementMem.grooveReturnReliability === 'High' ? 'text-emerald-400' : placementMem.grooveReturnReliability === 'Moderate' ? 'text-amber-300' : placementMem.grooveReturnReliability === 'Low' ? 'text-rose-400' : 'text-stone-500'
                    }`}>
                      {placementMem.grooveReturnReliability}
                    </span>
                  </div>
                </div>

                {/* Recurring Placement Friction */}
                {placementMem.recurringPlacementFriction && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-200">
                    <span className="font-bold">⚠️ Placement Friction Detected: </span>
                    <span>{placementMem.recurringPlacementFriction}</span>
                  </div>
                )}

                {/* Next Placement Target */}
                <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 block">
                    Placement Target:
                  </span>
                  <p className="font-bold text-stone-100 mt-0.5 leading-snug">
                    {placementMem.nextPlacementTarget}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* CURRICULUM ROADMAP & DEPENDENCIES SECTION (BU2F-R2E) */}
          {(() => {
            const roadmapDecision = evaluateSkillRoadmap(activeSkillState, skills, profile);
            const isThreadActive = activeThreads.some((t) => t.skillId === activeSkillState.id);

            return (
              <div className="bg-white border-2 border-[#4a523a]/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#4a523a]/10 text-[#4a523a] flex items-center justify-center font-bold">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4a523a] block">
                        Curriculum Roadmap & Skill Dependencies
                      </span>
                      <h4 className="text-sm font-black text-stone-900">
                        {activeSkillState.name} Progression Path
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isThreadActive ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active in Focus Roadmap
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addSkillToActiveRoadmap(activeSkillState)}
                        className="text-[11px] font-bold bg-[#4a523a] hover:bg-[#3d4430] text-white px-3 py-1.5 rounded-xl transition-transform transform active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Focus Roadmap
                      </button>
                    )}
                  </div>
                </div>

                {/* 6-Stage Curriculum Progression Path */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                    Curriculum Learning Progression:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                    {(['UNDERSTAND', 'CONTROL', 'PLACE', 'TRANSFER', 'VARY', 'CREATE'] as const).map(
                      (stg, idx) => {
                        const isCurrent = roadmapDecision.curriculumStage === stg;
                        const stages = ['UNDERSTAND', 'CONTROL', 'PLACE', 'TRANSFER', 'VARY', 'CREATE'];
                        const currentIdx = stages.indexOf(roadmapDecision.curriculumStage);
                        const isPast = idx < currentIdx;

                        return (
                          <div
                            key={stg}
                            className={`p-2 rounded-xl border text-xs space-y-0.5 transition-all ${
                              isCurrent
                                ? 'bg-[#4a523a] text-white border-[#4a523a] shadow-xs'
                                : isPast
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-stone-50 border-stone-200 text-stone-400'
                            }`}
                          >
                            <span className="text-[8px] font-extrabold uppercase tracking-wider block opacity-75">
                              0{idx + 1}
                            </span>
                            <span className="font-black text-[10px] block truncate">{stg}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Prerequisite Dependencies Analysis */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                    Prerequisites & Structural Evidence:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roadmapDecision.dependencies.map((dep) => (
                      <div
                        key={dep.dependency.id}
                        className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              dep.prerequisiteClassification === 'HARD'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : dep.prerequisiteClassification === 'SUPPORTING'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {dep.prerequisiteClassification || 'HARD'}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                              {dep.dependency.dependencyType}
                            </span>
                            <span className="font-bold text-stone-900 truncate">
                              {dep.dependency.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-tight">
                            {dep.dependency.reason}
                          </p>
                          {dep.evidenceExplanation && (
                            <p className="text-[10px] text-stone-500 italic">
                              {dep.evidenceExplanation}
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border shrink-0 ${
                            dep.state === 'SATISFIED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : dep.state === 'WEAK'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-stone-100 text-stone-600 border-stone-300'
                          }`}
                        >
                          {dep.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BU2F-R2F Adaptive Curriculum Progression Decision */}
                {(() => {
                  const currDecision = evaluateCurriculumDecision(activeSkillState, skills, profile);
                  return (
                    <CurriculumDecisionCard
                      decision={currDecision}
                      targetSkill={activeSkillState}
                      onPracticeDecision={() => {
                        onClose();
                        launchCurriculumDecisionPractice(currDecision);
                      }}
                      onPracticeSupportingGroove={() => {
                        onClose();
                        launchSupportingGrooveMiniLesson(
                          activeSkillState,
                          currDecision.supportingContext?.anchorGroove
                        );
                      }}
                    />
                  );
                })()}

                {/* Why This Next Breakdown Card */}
                <RoadmapWhyThisNextCard
                  decision={roadmapDecision}
                  targetSkill={activeSkillState}
                  onPracticeSupportingGroove={() => {
                    onClose();
                    launchSupportingGrooveMiniLesson(
                      activeSkillState,
                      roadmapDecision.supportingSkill?.anchorGroove
                    );
                  }}
                  onPracticeTarget={() => {
                    onClose();
                    launchPlacementPractice(activeSkillState.id, '1 beat');
                  }}
                />
              </div>
            );
          })()}

          {/* Known Gaps */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Known Gaps & Specific Struggles
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newGapInput}
                onChange={(e) => setNewGapInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGap())}
                placeholder="e.g. Left wrist tenses up past 90 BPM..."
                className="flex-1 bg-stone-50 border border-stone-200 text-xs text-stone-900 p-2.5 rounded-xl focus:outline-none focus:border-[#4a523a] min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleAddGap}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#4a523a] text-white font-bold text-xs rounded-xl hover:bg-[#3b422e] transition-colors min-h-[44px]"
              >
                Add Gap
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {knownGaps.length === 0 ? (
                <span className="text-xs text-stone-400 italic">No specific gaps logged for this skill.</span>
              ) : (
                knownGaps.map((gap, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg break-all"
                  >
                    <span>{gap}</span>
                    <button
                      onClick={() => handleRemoveGap(idx)}
                      className="text-amber-600 hover:text-amber-900 min-w-[20px] min-h-[20px] flex items-center justify-center font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Practice Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 block">
              Personal Drumming Notes & Sticking Logic:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Log stick height notes, rebound observations, or song placements..."
              className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-900 p-2.5 rounded-xl focus:outline-none focus:border-[#4a523a]"
            />
          </div>
        </div>

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50/95 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3 text-xs text-stone-600 self-start sm:self-auto">
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" />
              <strong>{practiceCount}</strong> Practices
            </span>
            <span>•</span>
            <span>Last: {skill.dateLastPracticed || 'Never'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#3f4532] hover:bg-[#323827] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedSuccess ? 'Saved!' : 'Save Skill'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkpoint Assessment Modal */}
      {showCheckpointModal && (
        <CheckpointModal
          skill={activeSkillState}
          onClose={() => setShowCheckpointModal(false)}
          onConfirmSkillMilestone={handleCheckpointConfirmed}
          onRequestCoachGapPlan={(title, failedCriteria, plan) => {
            setShowCheckpointModal(false);
            if (plan) {
              setActiveConfirmationPlan(plan);
            }
            if (onRequestCoachGapPlan) {
              onRequestCoachGapPlan(title, failedCriteria, plan);
            }
          }}
        />
      )}

      {/* Gap Closure Confirmation Modal */}
      {activeConfirmationPlan && (
        <GapClosureConfirmationModal
          plan={activeConfirmationPlan}
          onStartPractice={(plan) => {
            const result = launchGapClosurePractice(plan.id);
            if (result.success) {
              setActiveConfirmationPlan(null);
              setLaunchError(null);
              if (onStartGapClosurePractice) {
                onStartGapClosurePractice(plan);
              }
              onClose();
            } else {
              setActiveConfirmationPlan(null);
              setLaunchError(result.error || 'Gap Closure exercises could not be loaded.');
            }
          }}
          onReturnToSkill={() => {
            setActiveConfirmationPlan(null);
          }}
        />
      )}
    </div>
  );
};
