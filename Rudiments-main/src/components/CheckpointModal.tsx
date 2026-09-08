import React, { useState } from 'react';
import {
  SkillTrack,
  SkillLevel,
  GranularSkill,
  SkillStatus,
  SKILL_STATUS_CONFIG,
  CheckpointAttempt,
  CheckpointCriterionResult,
  GapClosurePlan,
} from '../types';
import { deriveSkillReadiness, getGranularCheckpointCriteria, getNextMilestoneStatus } from '../lib/readinessEngine';
import { getSkillEvidenceMemory } from '../lib/evidenceEngine';
import {
  recordCheckpointAttempt,
  generateGapClosurePlan,
  saveGapClosurePlan,
  getActiveGapClosurePlan,
  completeOrDismissGapClosurePlan,
} from '../lib/gapClosureEngine';
import { ShieldCheck, X, Check, AlertTriangle, ArrowRight, Award, Sparkles, Activity, CheckCircle2 } from 'lucide-react';

interface CheckpointModalProps {
  track?: SkillTrack | null;
  skill?: GranularSkill | null;
  onClose: () => void;
  onConfirmLevelUp?: (trackId: string, targetLevel: SkillLevel) => void;
  onConfirmSkillMilestone?: (skillId: string, targetStatus: SkillStatus) => void;
  onRequestCoachGapPlan: (title: string, failedCriteria: string[], plan?: GapClosurePlan) => void;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  track,
  skill,
  onClose,
  onConfirmLevelUp,
  onConfirmSkillMilestone,
  onRequestCoachGapPlan,
}) => {
  if (!track && !skill) return null;

  // Track Mode
  const isTrackMode = !!track && !skill;

  // Granular Skill State
  const memory = skill ? getSkillEvidenceMemory(skill.id) : null;
  const readiness = skill ? deriveSkillReadiness(skill) : null;
  const targetStatus = skill ? readiness?.targetStatus || getNextMilestoneStatus(skill.status) || 'CLEAN' : 'CLEAN';
  const targetStatusCfg = SKILL_STATUS_CONFIG[targetStatus as SkillStatus];

  // Track Level Logic
  const getTargetTrackLevel = (current: SkillLevel): SkillLevel => {
    if (current === 'Beginner') return 'Intermediate';
    if (current === 'Intermediate') return 'Advanced';
    return 'Advanced';
  };
  const targetTrackLevel = track ? getTargetTrackLevel(track.currentLevel) : 'Intermediate';

  // Criteria generation
  const workingBpm = memory?.currentWorkingBpm || skill?.currentComfortTempo || 70;
  const skillCriteria = skill ? getGranularCheckpointCriteria(skill, targetStatus as SkillStatus, workingBpm) : [];

  const trackCriteria = [
    `Can play foundational track patterns cleanly for 1 full minute at target BPM without rushing or tensing up.`,
    `Demonstrates full understanding of sticking logic, subdivision counting, and pattern dynamics.`,
    `Can seamlessly apply track vocabulary inside a simple groove or fill context during musical playback.`,
    `Maintains steady micro-timing and relaxed grip across a wide spread of starting tempos.`,
  ];

  const criteriaCount = isTrackMode ? trackCriteria.length : skillCriteria.length;
  const [checkedCriteria, setCheckedCriteria] = useState<{ [key: number]: boolean }>({});

  const toggleCheck = (idx: number) => {
    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const checkedCount = Object.values(checkedCriteria).filter(Boolean).length;
  const isPassedAll = checkedCount === criteriaCount;

  // Confirm Handlers
  const handleConfirm = () => {
    if (isTrackMode && track && onConfirmLevelUp) {
      // Record Track Checkpoint Attempt
      const attempt: CheckpointAttempt = {
        id: `chk-track-${track.id}-${Date.now()}`,
        skillId: track.id,
        skillName: track.name,
        checkpointLevel: targetTrackLevel,
        attemptedAt: new Date().toISOString(),
        assessedTempo: 80,
        totalCriteria: trackCriteria.length,
        passedCriteriaIds: trackCriteria.map((_, i) => `track-crit-${i}`),
        failedCriteriaIds: [],
        score: 100,
        result: 'passed',
        criteriaResults: trackCriteria.map((c, i) => ({
          criterionId: `track-crit-${i}`,
          criterionName: c,
          passed: true,
        })),
      };
      recordCheckpointAttempt(attempt);
      onConfirmLevelUp(track.id, targetTrackLevel);
      onClose();
    } else if (skill && onConfirmSkillMilestone) {
      // Record Passed Granular Skill Checkpoint Attempt
      const criteriaResults: CheckpointCriterionResult[] = skillCriteria.map((c) => ({
        criterionId: c.id,
        criterionName: c.title,
        passed: true,
        description: c.description,
        testMethod: c.testInstruction,
        bpmRequirement: c.bpmRequirement,
      }));

      const attempt: CheckpointAttempt = {
        id: `chk-att-${skill.id}-${targetStatus}-${Date.now()}`,
        skillId: skill.id,
        skillName: skill.name,
        checkpointLevel: targetStatus,
        attemptedAt: new Date().toISOString(),
        assessedTempo: workingBpm,
        totalCriteria: skillCriteria.length,
        passedCriteriaIds: skillCriteria.map((c) => c.id),
        failedCriteriaIds: [],
        score: 100,
        result: 'passed',
        criteriaResults,
      };
      recordCheckpointAttempt(attempt);

      // Dismiss any active gap closure plan if completed cleanly
      const activePlan = getActiveGapClosurePlan(skill.id);
      if (activePlan) {
        completeOrDismissGapClosurePlan(activePlan.id);
      }

      onConfirmSkillMilestone(skill.id, targetStatus as SkillStatus);
      onClose();
    }
  };

  const handleGapPlan = () => {
    if (isTrackMode && track) {
      const failed = trackCriteria.filter((_, idx) => !checkedCriteria[idx]);
      onRequestCoachGapPlan(track.name, failed);
      onClose();
    } else if (skill) {
      const passedCriteria = skillCriteria.filter((_, idx) => checkedCriteria[idx]);
      const failedCriteria = skillCriteria.filter((_, idx) => !checkedCriteria[idx]);

      const criteriaResults: CheckpointCriterionResult[] = skillCriteria.map((c, idx) => ({
        criterionId: c.id,
        criterionName: c.title,
        passed: !!checkedCriteria[idx],
        description: c.description,
        testMethod: c.testInstruction,
        bpmRequirement: c.bpmRequirement,
      }));

      const score = Math.round((passedCriteria.length / skillCriteria.length) * 100);
      const attemptResult = passedCriteria.length === 0 ? 'failed' : 'partial';

      // 1. Persist structured Checkpoint Attempt
      const attempt: CheckpointAttempt = {
        id: `chk-att-${skill.id}-${targetStatus}-${Date.now()}`,
        skillId: skill.id,
        skillName: skill.name,
        checkpointLevel: targetStatus,
        attemptedAt: new Date().toISOString(),
        assessedTempo: workingBpm,
        totalCriteria: skillCriteria.length,
        passedCriteriaIds: passedCriteria.map((c) => c.id),
        failedCriteriaIds: failedCriteria.map((c) => c.id),
        score,
        result: attemptResult,
        criteriaResults,
      };
      recordCheckpointAttempt(attempt);

      // 2. Generate or reuse active Gap Closure Plan (prevent duplicates)
      const existingPlan = getActiveGapClosurePlan(skill.id);
      let plan: GapClosurePlan;
      if (existingPlan && existingPlan.checkpointLevel === targetStatus) {
        // Update existing plan with new attempt and failed criteria
        plan = generateGapClosurePlan({
          skill,
          checkpointAttempt: attempt,
          failedCriteria: criteriaResults.filter((c) => !c.passed),
          workingBpm,
        });
        plan.id = existingPlan.id; // Keep plan ID stable
        saveGapClosurePlan(plan);
      } else {
        plan = generateGapClosurePlan({
          skill,
          checkpointAttempt: attempt,
          failedCriteria: criteriaResults.filter((c) => !c.passed),
          workingBpm,
        });
        saveGapClosurePlan(plan);
      }

      // 3. Callback with generated plan and failed criteria strings
      const failedStrings = failedCriteria.map((c) => `${c.title}: ${c.description}`);
      onRequestCoachGapPlan(skill.name, failedStrings, plan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-[#4a523a]/10 border border-[#4a523a]/25 text-[#4a523a] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2 py-0.5 rounded border border-[#4a523a]/20">
                {isTrackMode ? 'Track Curriculum Checkpoint' : 'Granular Skill Checkpoint'}
              </span>
              {!isTrackMode && skill && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${targetStatusCfg.bg} ${targetStatusCfg.text} ${targetStatusCfg.border}`}>
                  Milestone: {targetStatusCfg.label}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-0.5">
              {isTrackMode ? track?.name : skill?.name}
            </h3>
            <p className="text-xs text-stone-600">
              {isTrackMode ? (
                <>Advancing from <strong className="text-stone-900">{track?.currentLevel}</strong> → <strong className="text-emerald-700">{targetTrackLevel}</strong></>
              ) : (
                <>Advancing from <strong className="text-stone-900">{SKILL_STATUS_CONFIG[skill!.status].label}</strong> → <strong className="text-emerald-700">{targetStatusCfg.label}</strong> (Assessed at {workingBpm} BPM)</>
              )}
            </p>
          </div>
        </div>

        {/* Evidence & Readiness Banner for Granular Skills */}
        {!isTrackMode && readiness && (
          <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-700 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#4a523a]" />
                Evidence Readiness Assessment
              </span>
              <span className="font-mono font-bold text-stone-600 text-[11px]">
                {readiness.readinessLabel} ({readiness.metRequirementsCount}/{readiness.totalRequirementsCount} requirements met)
              </span>
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              {readiness.readinessSummary}
            </p>
            {readiness.blockers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-900 text-[11px] space-y-0.5">
                <span className="font-bold block">⚠️ Identified Gap / Blockers:</span>
                {readiness.blockers.map((b, i) => (
                  <p key={i}>• {b}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Honest Assessment Rules */}
        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900 space-y-1">
          <p className="font-bold text-amber-950 flex items-center gap-1.5">
            <span>Honest Evaluation Rubric</span>
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Mark a criterion as passed only if you can execute it comfortably without tension, rushing, or breakdown. Status updates confirmed here are permanently tagged with <strong>assessed provenance</strong>.
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Evaluation Criteria ({checkedCount}/{criteriaCount})
            </h4>
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {Math.round((checkedCount / criteriaCount) * 100)}% Complete
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {isTrackMode
              ? trackCriteria.map((crit, idx) => {
                  const isChecked = !!checkedCriteria[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-white border-stone-200 text-stone-800 hover:border-stone-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-stone-300 bg-stone-50'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="leading-relaxed">{crit}</span>
                    </button>
                  );
                })
              : skillCriteria.map((crit, idx) => {
                  const isChecked = !!checkedCriteria[idx];
                  return (
                    <div
                      key={crit.id}
                      onClick={() => toggleCheck(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer space-y-1.5 ${
                        isChecked
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-stone-300 bg-stone-50'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-black ${isChecked ? 'text-emerald-950' : 'text-stone-900'}`}>
                              {crit.title}
                            </span>
                            {crit.bpmRequirement && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                {crit.bpmRequirement} BPM
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isChecked ? 'text-emerald-900' : 'text-stone-600'}`}>
                            {crit.description}
                          </p>
                          <p className="text-[10px] text-stone-500 italic bg-stone-50/80 p-1.5 rounded border border-stone-200/60">
                            <strong>Test Method:</strong> {crit.testInstruction}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Action Decision Row */}
        <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {isPassedAll ? (
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-[#3f4532] hover:bg-[#323827] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>
                {isTrackMode
                  ? `Confirm Track Advancement to ${targetTrackLevel}!`
                  : `Confirm Assessed Advancement to ${targetStatusCfg.label}!`}
              </span>
            </button>
          ) : (
            <button
              onClick={handleGapPlan}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Ask Coach for Gap Closure Practice Plan ({criteriaCount - checkedCount} pending)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
