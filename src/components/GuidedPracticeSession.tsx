import React, { useState, useEffect, useRef } from 'react';
import {
  PracticeSession,
  PracticeExercise,
  SelfCheckFeeling,
  ExerciseResult,
  GranularSkill,
  InstructionMode,
} from '../types';
import { VisualRhythmTutor } from './VisualRhythmTutor';
import { audioEngine } from '../lib/audioEngine';
import {
  AdaptiveDecision,
  calculateAdaptiveDecision,
  updateExerciseQueueWithAdaptiveDecision,
  computeSessionWorkingRange,
} from '../lib/adaptiveEngine';
import {
  recordPracticeAttempt,
  finalizeSessionEvidence,
} from '../lib/evidenceEngine';
import { finalizePlacementSessionEvidence, derivePlacementEvidenceMemory } from '../lib/placementEngine';
import { generateNextTimeRecommendation } from '../lib/continuityEngine';
import {
  recordRemediationProgress,
  getActiveGapClosurePlan,
  getPlanRemediationBreakdown,
} from '../lib/gapClosureEngine';
import { useLearner } from '../context/LearnerContext';
import { evaluateCurriculumDecision } from '../lib/curriculumDecisionEngine';
import { CurriculumDecisionCard } from './CurriculumDecisionCard';
import { findTeachingDefinition } from '../lib/teachingDefinitions';
import { CURRICULUM_COMPETENCIES_BY_SKILL_ID } from '../data/canonicalCurriculum';
import {
  deriveCompetencyAdvancementReadiness,
  deriveCompetencyPracticeAuthorityForSkill,
} from '../lib/competencyAdvancementEngine';
import { recordCurriculumMissionEvidence } from '../lib/curriculumPracticeIntelligence';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Activity,
  Drum,
  Volume2,
  VolumeX,
  X,
  HelpCircle,
  ThumbsUp,
  Flame,
  ArrowRight,
  ShieldAlert,
  Target,
  Music,
  Compass,
  Layers,
  Wrench,
} from 'lucide-react';

interface GuidedPracticeSessionProps {
  session: PracticeSession;
  skills: GranularSkill[];
  onCompleteSession: (completedSession: PracticeSession) => void;
  onCancelSession: () => void;
}

const ISSUE_TAG_OPTIONS = [
  'Timing',
  'Uneven notes',
  'Tension',
  'Lost count',
  'Coordination',
  'Too fast',
  'Weak sound',
  'Transition problem',
  'Missed Beat 1',
  'Entered Too Early',
  'Entered Too Late',
  'Rushed Fill',
  'Dragged Fill',
  'Lost Groove',
  'Wrong Phrase Length',
];

export const GuidedPracticeSession: React.FC<GuidedPracticeSessionProps> = ({
  session: initialSession,
  skills,
  onCompleteSession,
  onCancelSession,
}) => {
  const { profile, launchCurriculumDecisionPractice } = useLearner();
  const [session, setSession] = useState<PracticeSession>({
    ...initialSession,
    startedAt: initialSession.startedAt || new Date().toISOString(),
  });

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const currentExercise: PracticeExercise | undefined = session.exercises?.[currentExerciseIndex];
  const currentSkillId = currentExercise?.skillIds?.[0] || session.skillId || session.selectedSkillIds?.[0] || '';
  const currentPracticeAuthority = currentSkillId
    ? deriveCompetencyPracticeAuthorityForSkill(currentSkillId, skills)
    : null;

  // C2: exercises with a canonical teaching definition are governed by the
  // six-stage Understand -> Count -> Watch -> Follow -> Play -> Evaluate flow.
  // The legacy parent timer/check-in remains only for unmatched legacy exercises.
  const structuredTeachingDefinition = currentExercise
    ? [...(currentExercise.skillIds || []), currentExercise.id, currentExercise.title]
        .map((id) => findTeachingDefinition(id))
        .find(Boolean) || null
    : null;
  const hasStructuredTeachingFlow = Boolean(structuredTeachingDefinition);

  // Active Exercise States
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    currentExercise?.durationSeconds || 180
  );
  const [currentTempo, setCurrentTempo] = useState<number>(currentExercise?.tempo || 70);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentInstructionMode, setCurrentInstructionMode] = useState<InstructionMode>('PLAY');

  // Self-Check Modal State
  const [showSelfCheck, setShowSelfCheck] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<SelfCheckFeeling | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [activeAdaptiveDecision, setActiveAdaptiveDecision] = useState<AdaptiveDecision | null>(null);

  // Session Completion State
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [reflectionFeltBest, setReflectionFeltBest] = useState('');
  const [reflectionNeedWork, setReflectionNeedWork] = useState('');

  // Timer Ref
  const timerRef = useRef<number | null>(null);

  // Sync state when exercise changes
  useEffect(() => {
    if (currentExercise) {
      setSecondsRemaining(currentExercise.durationSeconds);
      setCurrentTempo(currentExercise.tempo);
      setIsTimerRunning(false);
      setShowSelfCheck(false);
      setSelectedFeeling(null);
      setSelectedIssues([]);
      setActiveAdaptiveDecision(null);
      setCurrentInstructionMode('PLAY');
      audioEngine.stopMetronome();
    }
  }, [currentExerciseIndex]);

  // Handle metronome & countdown timer
  useEffect(() => {
    if (isTimerRunning && currentExercise && !hasStructuredTeachingFlow) {
      // Calculate subdivision number for audioEngine
      let subNum = 1;
      if (currentExercise.subdivision === '8th Notes') subNum = 2;
      else if (currentExercise.subdivision === '16th Notes') subNum = 4;
      else if (currentExercise.subdivision === 'Triplets') subNum = 3;

      let beatsInBar = 4;
      if (currentExercise.timeSignature === '6/8') beatsInBar = 6;
      else if (currentExercise.timeSignature === '3/4') beatsInBar = 3;

      if (soundEnabled) {
        audioEngine.startMetronome(currentTempo, beatsInBar, subNum);
      }

      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            audioEngine.stopMetronome();
            setShowSelfCheck(true); // Legacy-only exercises use the parent self-check
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      audioEngine.stopMetronome();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    }

    return () => {
      audioEngine.stopMetronome();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, currentTempo, soundEnabled, currentExerciseIndex, hasStructuredTeachingFlow]);

  const handleToggleStartPause = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
    }
  };

  const handleRestartExercise = () => {
    setIsTimerRunning(false);
    audioEngine.stopMetronome();
    if (currentExercise) {
      setSecondsRemaining(currentExercise.durationSeconds);
    }
  };

  const handleAdjustTempo = (delta: number) => {
    const newBpm = Math.max(30, Math.min(250, currentTempo + delta));
    setCurrentTempo(newBpm);
    if (audioEngine.getIsRunning()) {
      audioEngine.setBpm(newBpm);
    }
  };

  const handleToggleSound = () => {
    if (soundEnabled) {
      audioEngine.stopMetronome();
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
    }
  };

  // Step 1: Convert a completed exercise evaluation into the existing adaptive
  // decision/evidence pipeline. Structured C2 lessons call this directly from
  // Stage 6 so the learner is never asked to rate the same run twice.
  const processExerciseEvaluation = (
    feeling: SelfCheckFeeling,
    issues: string[],
    partialResult?: Partial<ExerciseResult>
  ) => {
    if (!currentExercise) return;

    const completedSoFar = (session.exercises || []).slice(0, currentExerciseIndex);

    const decision = calculateAdaptiveDecision(
      currentExercise,
      feeling,
      issues,
      currentTempo,
      completedSoFar,
      {
        tempoCeiling: currentPracticeAuthority?.tempoCeiling,
        verificationPriority: currentPracticeAuthority?.verificationPriority,
        verificationStandardText: currentPracticeAuthority?.verificationPriority
          ? CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(currentSkillId)?.tempoStandard.standardText
          : undefined,
      }
    );

    const tempoChange = decision.nextTempo - currentTempo;

    const result: ExerciseResult = {
      ...(partialResult || {}),
      selfCheck: feeling,
      issueTags: issues,
      tempoUsed: partialResult?.tempoUsed ?? currentTempo,
      tempoChange,
      adaptiveAction: decision.action,
      adaptiveReason: decision.reason,
      completedAt: partialResult?.completedAt || new Date().toISOString(),
      instructionMode: partialResult?.instructionMode || currentInstructionMode,
      visualTutorUsed: partialResult?.visualTutorUsed ?? true,
    };

    if (currentExercise.curriculumMission) {
      recordCurriculumMissionEvidence({
        sessionId: session.id,
        exercise: currentExercise,
        assessment: feeling,
        bpm: result.tempoUsed,
        assistanceLevel: partialResult?.assistanceLevel || currentExercise.curriculumMission.assistanceTarget,
        issueTags: issues,
        completedAt: result.completedAt,
      });
    }

    // Save exercise result in current exercise
    const updatedExercises = [...(session.exercises || [])];
    updatedExercises[currentExerciseIndex] = {
      ...currentExercise,
      tempo: currentTempo,
      result,
    };

    let updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    // Mutate upcoming exercise queue dynamically
    let mutatedExercises = updateExerciseQueueWithAdaptiveDecision(
      updatedSession,
      currentExerciseIndex,
      decision
    );

    // C4.2: the formal certification standard is a hard ceiling for ordinary
    // pre-verification practice. Warm-ups/cool-downs may sit below it, but no
    // adaptive decision can push an unverified competency past the test tempo.
    if (currentPracticeAuthority?.tempoCeiling) {
      mutatedExercises = mutatedExercises.map((exercise, index) =>
        index > currentExerciseIndex && exercise.phase !== 'COOL DOWN'
          ? { ...exercise, tempo: Math.min(exercise.tempo, currentPracticeAuthority.tempoCeiling!) }
          : exercise
      );
    }

    updatedSession = {
      ...updatedSession,
      exercises: mutatedExercises,
    };

    setSession(updatedSession);
    setActiveAdaptiveDecision(decision);

    // Record individual attempt evidence immediately (BU2B Session Memory & Evidence Engine)
    // Requirement 17: Protect skill evidence from generic warm-up and cool-down exercises
    if (currentExercise.phase !== 'WARM UP' && currentExercise.phase !== 'COOL DOWN') {
      const primarySkillId = currentExercise.skillIds[0] || 'skill';
      const attemptsForSkillSoFar = (session.exercises || [])
        .slice(0, currentExerciseIndex + 1)
        .filter((e) => e.skillIds.includes(primarySkillId)).length;

      const feelingMap: Record<string, 'clean_relaxed' | 'mostly_clean' | 'inconsistent' | 'too_difficult'> = {
        CLEAN_AND_RELAXED: 'clean_relaxed',
        MOSTLY_CLEAN: 'mostly_clean',
        INCONSISTENT: 'inconsistent',
        TOO_DIFFICULT: 'too_difficult',
      };

      recordPracticeAttempt({
        id: `att-${session.id}-${currentExercise.id}-${Date.now()}`,
        sessionId: session.id,
        skillId: primarySkillId,
        exerciseId: currentExercise.id,
        timestamp: new Date().toISOString(),
        equipment: session.equipment || 'Practice Pad',
        practiceContext: session.practiceContext,
        attemptNumber: attemptsForSkillSoFar || 1,
        bpm: currentTempo,
        previousBpm: currentExercise.tempo,
        assessment: feelingMap[feeling] || 'mostly_clean',
        frictions: issues,
        coachAction: decision.action === 'recover' ? 'recovery' : decision.action === 'repeat' ? 'retry' : decision.action === 'reduce_tempo' ? 'regress' : decision.action === 'simplify' ? 'regress' : decision.action === 'end_skill_block' ? 'end_skill_block' : 'advance',
        nextBpm: decision.nextTempo,
        recoveryMode: decision.action === 'recover' || feeling === 'TOO_DIFFICULT',
        instructionMode: partialResult?.instructionMode || currentInstructionMode,
        assistanceLevel: partialResult?.assistanceLevel,
        evidenceCategory: partialResult?.evidenceCategory,
      });

      // Update active Gap Closure Plan if this is a remediation drill
      if (currentExercise.isGapClosure) {
        recordRemediationProgress(
          primarySkillId,
          currentExercise.id,
          feeling
        );
      }
    }
  };

  const handleCalculateAndShowAdaptiveResponse = () => {
    if (!selectedFeeling) return;
    processExerciseEvaluation(selectedFeeling, selectedIssues);
  };

  // Step 2: Apply Decision & Proceed to Next Adapted Exercise
  const handleApplyAdaptiveDecisionAndProceed = () => {
    if (!activeAdaptiveDecision) return;

    const action = activeAdaptiveDecision.action;
    setActiveAdaptiveDecision(null);
    setShowSelfCheck(false);

    if (action === 'end_skill_block') {
      const nextIdx = session.exercises?.findIndex(
        (e, idx) => idx > currentExerciseIndex && e.phase === 'COOL DOWN'
      );
      if (nextIdx !== undefined && nextIdx !== -1) {
        setCurrentExerciseIndex(nextIdx);
      } else {
        setIsSessionComplete(true);
      }
    } else if (currentExerciseIndex < (session.exercises?.length || 0) - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      setIsSessionComplete(true);
    }
  };

  const handleFinishAndSaveLog = () => {
    const finalSession: PracticeSession = {
      ...session,
      completedAt: new Date().toISOString(),
      actualDurationSeconds: session.exercises?.reduce(
        (acc, ex) => acc + (ex.durationSeconds - (ex.result ? 0 : 0)),
        0
      ),
      reflection: {
        feltBest: reflectionFeltBest.trim() || undefined,
        needWorkNext: reflectionNeedWork.trim() || undefined,
      },
      sessionStatus: 'COMPLETED',
    };

    finalizeSessionEvidence(finalSession);
    finalizePlacementSessionEvidence(finalSession);
    onCompleteSession(finalSession);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentExercise && !isSessionComplete) {
    return (
      <div className="p-8 text-center text-stone-600">
        <p>No active exercise found.</p>
        <button
          onClick={onCancelSession}
          className="mt-4 px-4 py-2 bg-[#4a523a] text-white rounded-xl font-bold"
        >
          Return to Setup
        </button>
      </div>
    );
  }

  // ================= 1. SESSION COMPLETION SCREEN =================
  if (isSessionComplete) {
    const exercisesCount = session.exercises?.length || 0;
    const primarySessionSkillId = session.skillId || session.selectedSkillIds?.[0] || session.exercises?.[0]?.skillIds?.[0] || '';
    const completionAuthority = primarySessionSkillId
      ? deriveCompetencyPracticeAuthorityForSkill(primarySessionSkillId, skills)
      : null;
    const completionCompetency = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(primarySessionSkillId);
    const completionReadiness = completionCompetency
      ? deriveCompetencyAdvancementReadiness(completionCompetency, skills)
      : null;
    const workingRangeInfo = computeSessionWorkingRange(session, {
      tempoCeiling: completionAuthority?.tempoCeiling,
      verificationPriority: completionAuthority?.verificationPriority,
      verificationStandardText: completionReadiness?.targetStandardText,
    });

    const temposUsed = session.exercises?.map((e) => e.result?.tempoUsed || e.tempo) || [70];
    const minTempo = Math.min(...temposUsed);
    const maxTempo = Math.max(...temposUsed);

    const allReportedIssues = Array.from(
      new Set(session.exercises?.flatMap((e) => e.result?.issueTags || []) || [])
    );

    const activeGapPlan =
      session.isGapClosure || session.gapClosurePlanId
        ? getActiveGapClosurePlan(session.skillId || session.selectedSkillIds?.[0] || '')
        : null;
    const gapBreakdown = activeGapPlan ? getPlanRemediationBreakdown(activeGapPlan) : null;

    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-stone-900">Practice Session Complete!</h2>
            <p className="text-xs text-stone-600 font-medium">
              Excellent focus. Here is a summary of your evidence-based practice session and adaptive working range.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
            <div>
              <span className="text-2xl font-black text-[#4a523a] font-mono block">
                {session.durationMinutes}m
              </span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Duration
              </span>
            </div>
            <div>
              <span className="text-2xl font-black text-stone-900 font-mono block">
                {session.exercises?.filter((e) => e.result).length || exercisesCount} / {exercisesCount}
              </span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Session Exercises
              </span>
            </div>
            <div>
              <span className="text-2xl font-black text-amber-700 font-mono block">
                {minTempo === maxTempo ? `${minTempo}` : `${minTempo}-${maxTempo}`}
              </span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                BPM Range
              </span>
            </div>
          </div>

          {/* Dedicated Gap Closure Completion Summary (Cumulative Evidence) */}
          {gapBreakdown && (
            <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                        GAP CLOSURE PRACTICE COMPLETE
                      </span>
                      {activeGapPlan && (
                        <span className="text-[11px] font-bold text-stone-700">
                          {activeGapPlan.checkpointLevel} Checkpoint
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-black text-stone-900 mt-0.5">
                      Criterion Remediation Progress: {gapBreakdown.remediatedCriteriaCount} of {gapBreakdown.totalCriteriaCount} Gaps Remediated
                    </h4>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs font-mono font-bold text-stone-800 block">
                    Targeted evidence: {gapBreakdown.completedRemediationDrills} / {gapBreakdown.totalRemediationDrills} completed
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    Cumulative criterion requirements
                  </span>
                </div>
              </div>

              {/* Individual Criterion States */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {gapBreakdown.criteriaStatuses.map((c, idx) => (
                  <div
                    key={c.criterionId}
                    className={`border rounded-xl p-2.5 text-xs space-y-1.5 ${
                      c.isRemediated
                        ? 'bg-emerald-50 border-emerald-300'
                        : c.status === 'in_progress'
                        ? 'bg-sky-50 border-sky-300'
                        : 'bg-white border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold text-stone-900 text-xs">
                        {idx + 1}. {c.criterionTitle}
                      </span>
                      {c.isRemediated ? (
                        <span className="shrink-0 bg-emerald-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Remediated ({c.completedDrills}/{Math.max(1, c.totalDrills)})</span>
                        </span>
                      ) : c.status === 'in_progress' ? (
                        <span className="shrink-0 bg-sky-100 text-sky-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-sky-300 uppercase tracking-wider">
                          In Progress ({c.completedDrills}/{Math.max(1, c.totalDrills)})
                        </span>
                      ) : (
                        <span className="shrink-0 bg-amber-100 text-amber-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
                          Pending ({c.completedDrills}/{Math.max(1, c.totalDrills)})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600">→ {c.focusSummary}</p>
                  </div>
                ))}
              </div>

              {/* Status Message */}
              <div
                className={`p-2.5 rounded-xl text-xs font-medium border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  gapBreakdown.isAllCriteriaRemediated
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-amber-100/70 border-amber-300/80 text-amber-950'
                }`}
              >
                <span>
                  {gapBreakdown.isAllCriteriaRemediated ? (
                    <span>
                      ✓ All {gapBreakdown.totalCriteriaCount} criteria remediated! You are now eligible to reassess your {activeGapPlan?.checkpointLevel || 'CLEAN'} Checkpoint.
                    </span>
                  ) : (
                    <span>
                      <strong>Remediation Status:</strong> {gapBreakdown.remediatedCriteriaCount} of {gapBreakdown.totalCriteriaCount} gaps addressed ({gapBreakdown.completedRemediationDrills} of {gapBreakdown.totalRemediationDrills} targeted evidence units completed). Continue gap practice to complete remaining criteria.
                    </span>
                  )}
                </span>
                {gapBreakdown.isAllCriteriaRemediated && (
                  <span className="bg-emerald-700 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
                    Ready for Reassessment
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Working Range Established Today */}
          <div className="bg-[#f8f8f6] border-2 border-[#4a523a]/30 p-4 rounded-2xl space-y-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#4a523a]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Adaptive Working Range Established Today:</span>
            </div>
            <p className="text-base font-black text-stone-900">
              {workingRangeInfo.summaryText}
            </p>
            <p className="text-xs text-stone-700 font-medium bg-white/80 p-2.5 rounded-xl border border-stone-200">
              📌 <span className="font-bold text-stone-900">Next Session Guidance:</span> {workingRangeInfo.nextSessionGuidance}
            </p>
          </div>

          {/* Continuation Recommendation for Next Session */}
          <div className="bg-[#4a523a]/10 border border-[#4a523a]/30 p-4 rounded-2xl space-y-1 text-xs shadow-xs">
            <span className="font-black text-[#4a523a] uppercase tracking-wider text-[10px] block">
              💡 Coach Continuation Recommendation for Next Time:
            </span>
            <p className="font-bold text-stone-900 text-sm leading-snug">
              {completionAuthority?.verificationPriority
                ? `NEXT TIME: Formal verification has priority. Do not push beyond ${completionReadiness?.targetBpm || completionAuthority.targetBpm} BPM; use ordinary practice only as a short warm-up or consolidation.`
                : generateNextTimeRecommendation(session)}
            </p>
          </div>

          {/* BU2F-R2F Adaptive Curriculum Next Target Recommendation */}
          {completionAuthority?.verificationPriority ? (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 space-y-1.5">
              <div className="font-black uppercase tracking-wider text-[10px]">C4.2 Advancement Authority Active</div>
              <div className="font-black text-sm">Formal verification is the next progression action.</div>
              <div>Legacy Vary / Extend / checkpoint progression is paused for this competency until the canonical verification result is recorded.</div>
            </div>
          ) : (() => {
            const primarySkillId = session.skillId || session.selectedSkillIds?.[0] || '';
            const skillObj = skills.find((s) => s.id === primarySkillId);
            if (!skillObj) return null;

            const decision = evaluateCurriculumDecision(skillObj, skills, profile);
            return (
              <CurriculumDecisionCard
                decision={decision}
                targetSkill={skillObj}
                compact
              />
            );
          })()}

          {/* Dedicated Placement Practice Completion Summary Card */}
          {(() => {
            const hasPlacementExercises = session.exercises?.some((e) => e.musicalPlacement || e.phase === 'APPLICATION');
            if (!hasPlacementExercises) return null;

            const primarySkillId = session.skillId || session.selectedSkillIds?.[0] || '';
            const skillObj = skills.find((s) => s.id === primarySkillId);
            const placementMem = derivePlacementEvidenceMemory(primarySkillId);
            const canonicalComp = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(primarySkillId);
            const canonicalReadiness = canonicalComp
              ? deriveCompetencyAdvancementReadiness(canonicalComp, skills)
              : null;

            const totalInsertions =
              placementMem.successfulOneBeatPlacements +
              placementMem.successfulTwoBeatPlacements +
              placementMem.successfulFullBarPlacements;

            const hasMetPhraseInsertion = totalInsertions >= 2;
            const hasMetDownbeat = placementMem.successfulDownbeatLandings >= 2;
            const hasMetGroove = placementMem.cleanGrooveReturns >= 2;
            const hasMetFriction = (placementMem.totalPlacementAttempts || 0) >= 2 && !placementMem.recurringPlacementFriction;

            const isVerificationPriority = canonicalReadiness?.state === 'READY_TO_VERIFY';

            return (
              <div className="bg-[#1e2316] text-stone-100 p-5 rounded-2xl space-y-4 border border-[#4a523a]/40 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        PLACEMENT PRACTICE COMPLETE
                      </span>
                      <h4 className="text-sm font-black text-white mt-0.5">
                        {skillObj?.name || 'Skill'} — Evidence Ledger
                      </h4>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-mono font-bold text-stone-300 block">
                      Attempts logged: {placementMem.totalPlacementAttempts}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Recent trend: {placementMem.recentPlacementTrend}
                    </span>
                  </div>
                </div>

                {/* 4 Placement Criteria Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-3 rounded-xl border ${
                      hasMetPhraseInsertion
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                        : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Phrase Insertion</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          hasMetPhraseInsertion
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {hasMetPhraseInsertion ? `✓ Met (${totalInsertions} Evidenced)` : `${totalInsertions}/2 Evidenced`}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      1-beat: {placementMem.oneBeatStatus} | 2-beat: {placementMem.twoBeatStatus}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      hasMetDownbeat
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                        : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Downbeat Landing</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          hasMetDownbeat
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {hasMetDownbeat ? `✓ Clean (${placementMem.successfulDownbeatLandings} Landings)` : `${placementMem.successfulDownbeatLandings}/2 Clean`}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Target Beat 1 crash / downbeat precision.
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      hasMetGroove
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                        : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Groove Return</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          hasMetGroove
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {hasMetGroove ? `✓ High (${placementMem.cleanGrooveReturns} Clean)` : `${placementMem.cleanGrooveReturns}/2 Returns`}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Reliability: {placementMem.grooveReturnReliability}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      hasMetFriction
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                        : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Placement Friction</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          hasMetFriction
                            ? 'bg-emerald-500 text-stone-950'
                            : placementMem.recurringPlacementFriction
                            ? 'bg-rose-500 text-white'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {hasMetFriction
                          ? '✓ Zero Friction'
                          : placementMem.recurringPlacementFriction
                          ? placementMem.recurringPlacementFriction
                          : 'Sample Needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      {placementMem.recurringPlacementFriction
                        ? `Recurring issue: ${placementMem.recurringPlacementFriction}`
                        : `${placementMem.totalPlacementAttempts} attempts logged`}
                    </p>
                  </div>
                </div>

                {/* Status Guidance Banner */}
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between gap-2 ${
                    isVerificationPriority
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold'
                      : 'bg-stone-800/80 border-stone-700 text-stone-300'
                  }`}
                >
                  <span>
                    {isVerificationPriority ? (
                      <span>
                        ✓ C4 canonical readiness is complete. Formal verification now has priority; no additional placement evidence is required before the test.
                      </span>
                    ) : (
                      <span>
                        <strong>C4 Evidence Status:</strong> Placement metrics below are supporting evidence only. Follow the canonical Advancement Readiness card for the actual verification gate.
                      </span>
                    )}
                  </span>
                  {isVerificationPriority && (
                    <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0">
                      Verify Now
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Exercises Review */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Exercises Completed & Adaptive Self-Checks:
            </h3>
            <div className="space-y-2">
              {session.exercises?.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-stone-900 truncate">{ex.title}</span>
                      <span className="text-[10px] font-mono text-stone-600 font-bold shrink-0">
                        @{ex.result?.tempoUsed || ex.tempo} BPM
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {ex.result?.selfCheck === 'CLEAN_AND_RELAXED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Clean & Relaxed
                        </span>
                      )}
                      {ex.result?.selfCheck === 'MOSTLY_CLEAN' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                          Mostly Clean
                        </span>
                      )}
                      {ex.result?.selfCheck === 'INCONSISTENT' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Inconsistent
                        </span>
                      )}
                      {ex.result?.selfCheck === 'TOO_DIFFICULT' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Too Difficult
                        </span>
                      )}
                    </div>
                  </div>

                  {ex.result?.adaptiveReason && (
                    <p className="text-[11px] text-stone-600 italic">
                      ↳ {ex.result.adaptiveReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reported Issues if any */}
          {allReportedIssues.length > 0 && (
            <div className="text-xs space-y-1.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-900 block">Identified Technical Friction:</span>
              <div className="flex flex-wrap gap-1.5">
                {allReportedIssues.map((issue, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white text-amber-800 rounded border border-amber-300 text-[11px] font-medium"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional Reflection Prompts */}
          <div className="space-y-3 pt-2 border-t border-stone-200 text-xs">
            <h3 className="font-bold text-stone-800">Optional Quick Reflections</h3>

            <div>
              <label className="text-stone-600 block mb-1">What felt best today?</label>
              <input
                type="text"
                value={reflectionFeltBest}
                onChange={(e) => setReflectionFeltBest(e.target.value)}
                placeholder="e.g. Left hand stayed loose during R-L-K..."
                className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-stone-900 focus:outline-none focus:border-[#4a523a]"
              />
            </div>

            <div>
              <label className="text-stone-600 block mb-1">What needs work next time?</label>
              <input
                type="text"
                value={reflectionNeedWork}
                onChange={(e) => setReflectionNeedWork(e.target.value)}
                placeholder="e.g. R-L-K transition on beat 4..."
                className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-stone-900 focus:outline-none focus:border-[#4a523a]"
              />
            </div>
          </div>

          {/* Finish & Save Log Button */}
          <button
            onClick={handleFinishAndSaveLog}
            className="w-full py-4 bg-[#4a523a] hover:bg-[#3d4430] text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>FINISH & SAVE PRACTICE LOG</span>
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. ACTIVE GUIDED EXERCISE SCREEN =================
  const totalExercises = session.exercises?.length || 1;

  // Helper for authoritative active header stage label
  const getHeaderStageLabel = (exercise: PracticeExercise): string => {
    if (exercise.exerciseType === 'warmup' || exercise.phase === 'WARM UP') {
      return 'WARM UP';
    }
    if (exercise.exerciseType === 'cooldown' || exercise.phase === 'COOL DOWN') {
      return 'COOL DOWN';
    }
    if (exercise.progressionStage) {
      return exercise.progressionStage;
    }
    return exercise.phase || 'MAIN WORK';
  };

  // Intent Integrity diagnostics calculation
  const intent = session.practiceIntent;
  const recommended = intent?.recommendedSnapshot;
  const received = intent
    ? {
        skillName: intent.targetSkillName,
        limiter: intent.limiter,
        bpm: intent.learningTempo,
        assistance: String(intent.assistanceLevel),
      }
    : null;

  const mismatches: string[] = [];
  if (recommended && received) {
    if (recommended.skillName.trim().toLowerCase() !== received.skillName.trim().toLowerCase()) {
      mismatches.push(`Target Skill: rec '${recommended.skillName}' vs received '${received.skillName}'`);
    }
    if (recommended.limiter !== received.limiter) {
      mismatches.push(`Limiter: rec '${recommended.limiter}' vs received '${received.limiter}'`);
    }
    if (recommended.bpm !== received.bpm) {
      mismatches.push(`Tempo: rec ${recommended.bpm} BPM vs received ${received.bpm} BPM`);
    }
    if (recommended.assistance.trim().toLowerCase() !== received.assistance.trim().toLowerCase()) {
      mismatches.push(`Assistance: rec '${recommended.assistance}' vs received '${received.assistance}'`);
    }
  }
  const isIntentIntegrityPass = Boolean(intent) && mismatches.length === 0;

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4 pb-28 md:pb-12">
      {/* TODAY'S TARGET HEADER (BU2F-R2H-FIX1) */}
      {session.practiceIntent && (
        <div
          id="todays-target-header"
          className="bg-stone-900 text-stone-100 rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-xl space-y-4"
        >
          {/* Target Title & Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  TODAY'S TARGET
                </span>
                <span className="text-xs font-mono text-stone-400 bg-stone-950/80 px-2 py-0.5 rounded-md border border-stone-800">
                  {session.practiceIntent.supportingContainer}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {session.practiceIntent.targetSkillName}
              </h1>
              <p className="text-xs font-bold text-amber-300 font-mono">
                {session.practiceIntent.targetPhraseLocation || session.practiceIntent.activeGoal}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-stone-950 px-3.5 py-2 rounded-2xl border border-stone-800 text-right min-w-[90px]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                  TARGET TEMPO
                </span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {session.practiceIntent.learningTempo} BPM
                </span>
              </div>

              <div className="bg-stone-950 px-3.5 py-2 rounded-2xl border border-stone-800 text-right min-w-[90px]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                  GUIDANCE
                </span>
                <span className="text-sm font-black text-sky-400 font-mono">
                  {session.practiceIntent.assistanceLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Context & Success Focus Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs">
            {/* WHY THIS SESSION */}
            <div className="md:col-span-7 space-y-1.5 bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                WHY THIS SESSION
              </span>
              <p className="text-xs text-stone-300 font-medium leading-relaxed">
                {session.practiceIntent.adaptiveReason}
              </p>
              {session.practiceIntent.evidenceNeeded && (
                <div className="pt-2 mt-2 border-t border-stone-800/80 flex items-start gap-1.5 text-[11px] text-stone-400">
                  <span className="font-bold text-stone-300 shrink-0">Evidence Target:</span>
                  <span className="text-stone-300">{session.practiceIntent.evidenceNeeded}</span>
                </div>
              )}
            </div>

            {/* SUCCESS FOCUS */}
            <div className="md:col-span-5 space-y-1.5 bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                SUCCESS FOCUS
              </span>
              <ul className="space-y-1 text-stone-300 text-xs font-medium">
                {session.practiceIntent.successFocus.map((focusItem, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{focusItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* DEVELOPER DIAGNOSTICS: PRACTICE INTENT HANDOFF */}
          <div className="pt-2 border-t border-stone-800">
            <div className="bg-stone-950 rounded-2xl p-3.5 border border-stone-800 text-[11px] font-mono space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <span>🛠️ PRACTICE INTENT HANDOFF</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                    isIntentIntegrityPass
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  INTENT INTEGRITY: {isIntentIntegrityPass ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300 text-[10px]">
                <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800">
                  <span className="text-stone-500 block text-[9px] uppercase font-bold">Recommended:</span>
                  <span className="text-stone-200 font-bold">
                    {recommended?.skillName || session.practiceIntent.targetSkillName} /{' '}
                    {recommended?.limiter || session.practiceIntent.limiter} /{' '}
                    {recommended?.bpm || session.practiceIntent.learningTempo} BPM /{' '}
                    {recommended?.assistance || session.practiceIntent.assistanceLevel}
                  </span>
                </div>
                <div className="bg-stone-900/80 p-2 rounded-xl border border-stone-800">
                  <span className="text-stone-500 block text-[9px] uppercase font-bold">Received by session:</span>
                  <span className="text-stone-200 font-bold">
                    {session.practiceIntent.targetSkillName} /{' '}
                    {session.practiceIntent.limiter} /{' '}
                    {session.practiceIntent.learningTempo} BPM /{' '}
                    {session.practiceIntent.assistanceLevel}
                  </span>
                </div>
              </div>

              {!isIntentIntegrityPass && mismatches.length > 0 && (
                <div className="text-rose-400 text-[10px] pt-1">
                  Mismatches: {mismatches.join('; ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header / Progress Bar */}
      <div className="bg-stone-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </span>
            <span className="text-stone-400">•</span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                currentExercise.progressionStage === 'TRANSFER'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {getHeaderStageLabel(currentExercise)}
            </span>
          </div>

          <button
            onClick={onCancelSession}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Session</span>
          </button>
        </div>

        {/* Overall Session Progress Bar */}
        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{
              width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main Exercise Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
        {/* Exercise Title & Equipment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full border border-[#4a523a]/20">
              {currentExercise.equipmentRequired}
            </span>
            <span className="text-[11px] font-mono font-semibold text-stone-500">
              {currentExercise.timeSignature} • {currentExercise.subdivision}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
            {currentExercise.title}
          </h2>

          {/* Pedagogical Role & WHY THIS EXERCISE */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {currentExercise.pedagogicalRole && (
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    currentExercise.pedagogicalRole === 'PRIMARY TARGET'
                      ? 'bg-amber-500 text-stone-950 border-amber-600 font-black'
                      : currentExercise.pedagogicalRole === 'PREPARATION'
                      ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
                      : currentExercise.pedagogicalRole === 'REINFORCEMENT'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                      : currentExercise.pedagogicalRole === 'INDEPENDENCE TEST'
                      ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                      : 'bg-stone-200 text-stone-800 border-stone-300 font-bold'
                  }`}
                >
                  {currentExercise.pedagogicalRole}
                </span>
              )}
              <span className="text-xs font-bold text-stone-800">
                WHY THIS EXERCISE:
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium leading-relaxed">
              {currentExercise.whyThisExercise || currentExercise.purpose}
            </p>
          </div>
        </div>

        {/* CHECKPOINT GAP CLOSURE BANNER */}
        {(currentExercise.isGapClosure || session.isGapClosure) && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Wrench className="w-3 h-3" />
                <span>CHECKPOINT GAP CLOSURE</span>
              </div>
              {(currentExercise.checkpointLevel || session.checkpointLevel) && (
                <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                  {currentExercise.checkpointLevel || session.checkpointLevel} Remediation
                </span>
              )}
            </div>

            {/* Targeted Weakness / Gap */}
            {(currentExercise.gapClosureTargetCriterion || session.focusTopic) && (
              <div className="text-xs">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider block">
                  Targeted Gap / Criterion:
                </span>
                <span className="font-bold text-stone-900 text-sm">
                  {currentExercise.gapClosureTargetCriterion || session.focusTopic}
                </span>
              </div>
            )}

            {currentExercise.gapClosureReason && (
              <p className="text-xs text-stone-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <strong>Context:</strong> {currentExercise.gapClosureReason}
              </p>
            )}

            {currentExercise.gapClosureSuccessTarget && (
              <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 p-2.5 rounded-xl flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Success Target:</strong> {currentExercise.gapClosureSuccessTarget}
                </span>
              </div>
            )}
          </div>
        )}

        {/* WHY YOU ARE DOING THIS Box */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] block">
            Why you are doing this:
          </span>
          <p className="text-xs text-stone-800 font-medium leading-relaxed">
            {currentExercise.purpose}
          </p>
        </div>

        {/* VISUAL RHYTHM TUTOR & GUIDED PLACEMENT ENGINE */}
        {(currentExercise.musicalPlacement || currentExercise.transferInstructions || currentExercise.progressionStage === 'TRANSFER' || currentExercise.phase === 'DEVELOPMENT' || currentExercise.phase === 'CHALLENGE' || currentExercise.phase === 'MAIN WORK' || currentExercise.phase === 'FOUNDATION' || currentExercise.sticking) && (
          <div className="space-y-2">
            <VisualRhythmTutor
              exercise={currentExercise}
              currentTempo={currentTempo}
              onCheckIn={(mode, partialResult) => {
                setCurrentInstructionMode(mode);

                // C2 structured evidence arrives only after a completed PLAY run
                // and Stage 6 evaluation. Feed it directly into the established
                // adaptive/evidence engine and show the adaptive response—not a
                // second duplicate questionnaire.
                if (partialResult?.selfCheck) {
                  const issues = partialResult.issueTags || [];
                  setSelectedFeeling(partialResult.selfCheck);
                  setSelectedIssues(issues);
                  setShowSelfCheck(true);
                  processExerciseEvaluation(partialResult.selfCheck, issues, {
                    ...partialResult,
                    instructionMode: mode,
                  });
                  return;
                }

                // Legacy/unstructured tutor callbacks may still request the
                // parent questionnaire. Canonical C2 lessons never use this path.
                if (!hasStructuredTeachingFlow) {
                  setShowSelfCheck(true);
                }
              }}
              onTempoAdjust={handleAdjustTempo}
            />
          </div>
        )}

        {/* ENTRY / EXIT TRAINING CARD */}
        {(currentExercise.entryExitInstructions || currentExercise.musicalPlacement) && (
          <div className="bg-[#f8f8f6] border-2 border-[#4a523a]/30 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4a523a] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Entry & Exit Training:</span>
              </span>
              {currentExercise.musicalPlacement?.phraseLength && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#4a523a]/10 text-[#4a523a] rounded-full border border-[#4a523a]/20">
                  {currentExercise.musicalPlacement.phraseLength.toUpperCase()} PHRASE
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Entry */}
              <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-500 block">
                  1. Entry Context
                </span>
                <p className="font-semibold text-stone-800 text-[11px] leading-snug">
                  {currentExercise.entryExitInstructions?.entry || currentExercise.musicalPlacement?.entryContext}
                </p>
              </div>

              {/* Skill/Fill */}
              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 block">
                  {currentExercise.challengeType === 'musical-fill' ? '2. Vocabulary Fill' : '2. Required Pattern'}
                </span>
                <p className="font-black text-stone-900 text-[11px] leading-snug">
                  {currentExercise.entryExitInstructions?.skillFill || `Execute pattern on target beat`}
                </p>
              </div>

              {/* Exit */}
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                  3. Landing & Exit
                </span>
                <p className="font-semibold text-stone-800 text-[11px] leading-snug">
                  {currentExercise.entryExitInstructions?.exit || currentExercise.musicalPlacement?.exitContext}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WHERE THIS FITS EXPLANATION & BEAT GRID */}
        {currentExercise.musicalPlacement && (
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 space-y-3 border border-stone-800 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <Music className="w-3.5 h-3.5" />
                <span>Where Does This Fit in the Bar?</span>
              </div>
              <span className="text-[10px] font-mono text-stone-400 font-bold">
                Start: {currentExercise.musicalPlacement.startPoint.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {currentExercise.musicalPlacement.whereThisFitsExplanation && (
              <p className="text-xs font-semibold text-stone-300 bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/60">
                {currentExercise.musicalPlacement.whereThisFitsExplanation}
              </p>
            )}

            {/* Beat Grid Breakdown */}
            {currentExercise.musicalPlacement.beatGridVisual && (
              <div className="space-y-1.5 pt-1 border-t border-stone-800">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                  Rhythmic Grid Breakdown:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  {currentExercise.musicalPlacement.beatGridVisual.counts.map((c, idx) => {
                    const isFill = currentExercise.musicalPlacement?.beatGridVisual?.fillBeats.includes(c);
                    const isLanding = c.includes('||') || c.includes('1');
                    return (
                      <div
                        key={idx}
                        className={`px-2.5 py-1 rounded-lg border font-bold text-center ${
                          isFill
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-black scale-105 shadow-sm'
                            : isLanding && idx === currentExercise.musicalPlacement?.beatGridVisual?.counts.length! - 1
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-black'
                            : 'bg-stone-800 text-stone-300 border-stone-700'
                        }`}
                      >
                        {c}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-stone-400 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-stone-700 border border-stone-600 inline-block" /> Groove
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Fill / Pattern
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 🎯 Beat 1 Landing
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CURRENT REQUIRED PATTERN — never substitute optional transfer sticking here. */}
        {currentExercise.sticking && (
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 space-y-3 text-center border border-stone-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Required Pattern
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Play this now
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-amber-300 py-1 select-all">
              {currentExercise.sticking}
            </div>

            <p className="text-[10px] text-stone-400 leading-relaxed">
              This is the limb/sticking pattern required by the current exercise. Counting is shown separately below.
            </p>

            {currentExercise.padAdaptationNote && (
              <div className="text-[11px] text-amber-200/90 italic pt-1 border-t border-stone-800">
                💡 Pad Prompt: {currentExercise.padAdaptationNote}
              </div>
            )}
          </div>
        )}

        {/* TRANSFER INSTRUCTION MODEL: ORCHESTRATION MAP, REPETITION CYCLE & SUCCESS TARGET */}
        {currentExercise.transferInstructions && (
          <div className="space-y-3 pt-1">
            <div className={`rounded-2xl border-2 p-3.5 ${
              currentExercise.progressionStage === 'TRANSFER'
                ? 'bg-violet-500/10 border-violet-500/30'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-violet-800">
                    {currentExercise.progressionStage === 'TRANSFER'
                      ? 'Transfer / Orchestration Layer'
                      : 'Optional Transfer / Later Application'}
                  </div>
                  <p className="text-[10px] text-stone-600 mt-1 leading-relaxed">
                    {currentExercise.progressionStage === 'TRANSFER'
                      ? 'This section shows how the required pattern is moved or accented for this transfer exercise. It does not replace the Required Pattern above.'
                      : 'Not required for the current exercise. Use this later to explore orchestration after the Required Pattern is controlled.'}
                  </p>
                </div>
                <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-white border border-stone-200 text-stone-600">
                  {currentExercise.progressionStage === 'TRANSFER' ? 'Current extension' : 'Later'}
                </span>
              </div>
            </div>

            {currentExercise.transferInstructions.accentNotes && (
              <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 space-y-3 text-center border border-stone-800 shadow-inner">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                    Transfer Accent Map
                  </span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-200">
                    ORCHESTRATION
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">
                  {currentExercise.transferInstructions.accentNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center min-w-[2.75rem] px-2 py-1.5 rounded-xl border ${
                        note.isAccented
                          ? 'bg-violet-300 text-stone-950 border-violet-200 font-black scale-105 shadow-md'
                          : 'bg-stone-800 text-stone-300 border-stone-700 font-bold opacity-80'
                      }`}
                    >
                      <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold">
                        {note.isAccented ? '> ACCENT' : 'TAP'}
                      </span>
                      <span className="text-lg sm:text-xl font-mono font-black">
                        {note.isAccented ? `>${note.hand}` : note.hand}
                      </span>
                      {note.zone && (
                        <span className="text-[8px] font-extrabold uppercase mt-0.5 px-1 rounded">{note.zone}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-xs font-mono font-bold text-violet-200">
                  Transfer pattern: {currentExercise.transferInstructions.accentPattern}
                </div>
              </div>
            )}

            {/* Orchestration Map */}
            {currentExercise.transferInstructions.orchestrationMap && (
              <div className="bg-[#f6f6f4] border-2 border-stone-300 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {currentExercise.equipmentRequired === 'Practice Pad'
                        ? 'Practice Pad Zone Orchestration Map:'
                        : 'Full Kit Voice Orchestration Map:'}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
                    {currentExercise.equipmentRequired.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentExercise.transferInstructions.orchestrationMap.map((zone, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          {zone.zone}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-stone-900 leading-snug">
                        {zone.notes}
                      </p>
                      <p className="text-[10px] text-stone-600 leading-tight font-medium">
                        {zone.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repetition Progression Cycle */}
            {currentExercise.transferInstructions.transferProgression && (
              <div className="bg-stone-900 text-stone-100 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Transfer Cycle Progression:</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-400 font-bold">
                    REPETITION CYCLE
                  </span>
                </div>

                <div className="space-y-1.5">
                  {currentExercise.transferInstructions.transferProgression.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="flex items-start gap-2.5 bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/60"
                    >
                      <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 mt-0.5">
                        R{step.stepNumber}
                      </span>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-extrabold text-amber-200 block text-[11px]">
                          {step.label}
                        </span>
                        <p className="text-[11px] text-stone-300 font-medium leading-snug">
                          {step.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Target */}
            {currentExercise.transferInstructions.executionTarget && (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>SUCCESS TARGET:</span>
                </div>
                <p className="text-xs font-bold text-stone-900 leading-snug pl-5">
                  "{currentExercise.transferInstructions.executionTarget}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Counting / Subdivision Guide */}
        {currentExercise.counting && (
          <div className="bg-stone-100 rounded-2xl p-3 text-center space-y-1 border border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Counting / Subdivision — How to Count the Required Pattern
            </span>
            <div className="text-sm font-mono font-bold text-stone-800">
              {currentExercise.counting}
            </div>
          </div>
        )}

        {/* Legacy timer/check-in controls are intentionally hidden for C2 structured lessons.
            Their evidence gate lives inside Stage 5 PLAY -> Stage 6 EVALUATE. */}
        {!hasStructuredTeachingFlow && (
          <>
        {/* TIMER & TEMPO DISPLAY */}
        <div className="bg-[#f8f8f6] rounded-2xl p-4 border border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            {/* Big Countdown Timer */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#4a523a]" />
              <span className="text-3xl font-black font-mono text-stone-900 tracking-tight">
                {formatTime(secondsRemaining)}
              </span>
            </div>

            {/* BPM Display with Suggested Label */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#4a523a]">
                  {currentTempo}
                </span>
                <span className="text-xs font-bold text-stone-600">BPM</span>
              </div>

              {currentExercise.isSuggestedStartingTempo && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block">
                  SUGGESTED STARTING TEMPO
                </span>
              )}
            </div>
          </div>

          {/* TEMPO & PLAYBACK CONTROLS */}
          <div className="space-y-3 pt-1">
            {/* Main Start / Pause & Restart Buttons */}
            <div className="grid grid-cols-12 gap-2">
              <button
                id="btn-exercise-toggle"
                onClick={handleToggleStartPause}
                className={`col-span-8 py-3.5 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-[#4a523a] hover:bg-[#3d4430] text-white'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>PAUSE TIMER & CLICK</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>START EXERCISE ({currentTempo} BPM)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRestartExercise}
                title="Restart Timer"
                className="col-span-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-2xl font-bold flex items-center justify-center transition-colors min-h-[48px]"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleToggleSound}
                title={soundEnabled ? 'Mute Metronome' : 'Unmute Metronome'}
                className={`col-span-2 rounded-2xl font-bold flex items-center justify-center transition-colors min-h-[48px] ${
                  soundEnabled ? 'bg-sky-100 text-sky-800 hover:bg-sky-200' : 'bg-stone-200 text-stone-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            {/* Quick Tempo Adjusters */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 shrink-0">
                Adjust BPM:
              </span>
              <div className="flex items-center gap-1.5">
                {[-5, -1, +1, +5].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => handleAdjustTempo(delta)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-mono font-bold rounded-xl border border-stone-300 shadow-2xs transition-all active:scale-95 min-h-[36px] min-w-[40px]"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MANUAL CHECK IN BUTTON (Open Self Check Modal) */}
        <button
          onClick={() => {
            setIsTimerRunning(false);
            audioEngine.stopMetronome();
            setShowSelfCheck(true);
          }}
          className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs rounded-2xl border border-stone-300 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <CheckCircle2 className="w-4 h-4 text-[#4a523a]" />
          <span>CHECK IN / COMPLETE EXERCISE NOW</span>
        </button>
          </>
        )}
      </div>

      {/* ================= 3. SELF-CHECK & ADAPTIVE RESPONSE MODAL ================= */}
      {showSelfCheck && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {activeAdaptiveDecision ? (
              /* ================= ADAPTIVE RESPONSE SCREEN ================= */
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full inline-block">
                    Coach's Adaptive Response
                  </span>
                  <h3 className="text-xl font-black text-stone-900">
                    {selectedFeeling === 'CLEAN_AND_RELAXED' && '🌟 Clean Control Demonstrated'}
                    {selectedFeeling === 'MOSTLY_CLEAN' && '👍 Controlled Execution'}
                    {selectedFeeling === 'INCONSISTENT' && '⚠️ Adaptation Triggered'}
                    {selectedFeeling === 'TOO_DIFFICULT' && '🛑 Recovery Mode Activated'}
                  </h3>
                </div>

                {/* Main Coaching Advice Banner */}
                <div className="bg-[#f8f8f6] border-2 border-[#4a523a]/30 p-4 rounded-2xl space-y-2 shadow-inner">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#4a523a] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Coach Guidance:</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 leading-snug">
                    "{activeAdaptiveDecision.coachingMessage}"
                  </p>
                  <p className="text-xs text-stone-600 italic border-t border-stone-200 pt-2">
                    {activeAdaptiveDecision.reason}
                  </p>
                </div>

                {/* Tempo Transition Banner */}
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-mono font-bold">
                  <span className="text-stone-500 uppercase tracking-wider text-[10px]">
                    Tempo Progression:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-600">{activeAdaptiveDecision.previousTempo} BPM</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-[#4a523a] text-sm font-black">
                      {activeAdaptiveDecision.nextTempo} BPM
                    </span>
                  </div>
                </div>

                {/* Dynamic Action Button */}
                <button
                  id="btn-apply-adaptive-decision"
                  onClick={handleApplyAdaptiveDecisionAndProceed}
                  className="w-full py-4 bg-[#4a523a] hover:bg-[#3d4430] text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 min-h-[50px] transform active:scale-[0.99]"
                >
                  <span>{activeAdaptiveDecision.buttonLabel}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* ================= SELF-CHECK QUESTIONNAIRE ================= */
              <div className="space-y-5">
                {/* Context-Adaptive Header */}
                {(() => {
                  const isWarmup = currentExercise.phase === 'WARM UP' || currentExercise.exerciseType === 'warmup';
                  const isCooldown = currentExercise.phase === 'COOL DOWN' || currentExercise.exerciseType === 'cooldown';
                  const isPhraseInsertion = currentExercise.title.includes('Phrase Insertion');
                  const isLandingOrGroove = currentExercise.title.includes('Downbeat Landing') || currentExercise.title.includes('Groove Return');
                  const isCalibration = currentExercise.title.includes('Calibration');

                  let badgeLabel = 'Self-Assessment';
                  let heading = 'How did that feel?';
                  let subtext = 'Be honest. Your feedback adapts upcoming exercise tempo and queue progression.';

                  if (isWarmup) {
                    badgeLabel = 'Warm-Up Pulse Check';
                    heading = 'Did you establish a steady pulse?';
                    subtext = 'Check for relaxed wrists and comfortable micro-timing before moving to the main work.';
                  } else if (isCalibration) {
                    badgeLabel = 'Technique Calibration Check';
                    heading = 'How clean was the rudiment execution?';
                    subtext = 'Assess stroke heights, dynamic balance, and relaxed grip pressure.';
                  } else if (isPhraseInsertion) {
                    badgeLabel = 'Phrase Insertion Check';
                    heading = 'Did you enter on time and maintain pulse?';
                    subtext = 'Focus on clean entry without hesitation, rushing, or losing the groove.';
                  } else if (isLandingOrGroove) {
                    badgeLabel = 'Downbeat Landing & Groove Return Check';
                    heading = 'Did you land Beat 1 and resume groove?';
                    subtext = 'Check for precision on Beat 1 and an immediate return to steady timekeeping.';
                  } else if (isCooldown) {
                    badgeLabel = 'Cool-Down Check';
                    heading = 'Did your muscles reset and relax?';
                    subtext = 'Confirm hands and shoulders are loose after practice.';
                  }

                  return (
                    <div className="text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 px-2.5 py-0.5 rounded-full">
                        {badgeLabel}
                      </span>
                      <h3 className="text-xl font-black text-stone-900">{heading}</h3>
                      <p className="text-xs text-stone-500">{subtext}</p>
                    </div>
                  );
                })()}

                {/* Primary Rating Options */}
                {(() => {
                  const isPhraseInsertion = currentExercise.title.includes('Phrase Insertion');
                  const isLandingOrGroove = currentExercise.title.includes('Downbeat Landing') || currentExercise.title.includes('Groove Return');

                  const cleanSubtext = isPhraseInsertion
                    ? 'Entered exactly on beat, crisp note spacing, no tension.'
                    : isLandingOrGroove
                    ? 'Landed Beat 1 cleanly and seamlessly returned to groove.'
                    : 'Steady pulse, even volume, no muscle tension.';

                  const mostlyCleanSubtext = isPhraseInsertion
                    ? 'Minor timing bump on entry, but stayed in meter.'
                    : isLandingOrGroove
                    ? 'Minor landing drift, but caught the groove quickly.'
                    : 'Minor bumps, but overall controlled.';

                  const inconsistentSubtext = isPhraseInsertion
                    ? 'Entered too early/late, or rushed fill notes.'
                    : isLandingOrGroove
                    ? 'Missed Beat 1 or hesitated on groove return.'
                    : 'Rushing, dragging or lost sticking count.';

                  const tooDifficultSubtext = isPhraseInsertion
                    ? 'Lost pulse or could not execute fill in time.'
                    : isLandingOrGroove
                    ? 'Lost Beat 1 completely or lost the groove pulse.'
                    : "Tension in wrists, couldn't match click.";

                  return (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setSelectedFeeling('CLEAN_AND_RELAXED')}
                        className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                          selectedFeeling === 'CLEAN_AND_RELAXED'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1.5">
                          <span>🌟 CLEAN & RELAXED</span>
                        </div>
                        <p
                          className={`text-[10px] ${
                            selectedFeeling === 'CLEAN_AND_RELAXED' ? 'text-emerald-100' : 'text-stone-500'
                          }`}
                        >
                          {cleanSubtext}
                        </p>
                      </button>

                      <button
                        onClick={() => setSelectedFeeling('MOSTLY_CLEAN')}
                        className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                          selectedFeeling === 'MOSTLY_CLEAN'
                            ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-400'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1.5">
                          <span>👍 MOSTLY CLEAN</span>
                        </div>
                        <p
                          className={`text-[10px] ${
                            selectedFeeling === 'MOSTLY_CLEAN' ? 'text-sky-100' : 'text-stone-500'
                          }`}
                        >
                          {mostlyCleanSubtext}
                        </p>
                      </button>

                      <button
                        onClick={() => setSelectedFeeling('INCONSISTENT')}
                        className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                          selectedFeeling === 'INCONSISTENT'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1.5">
                          <span>⚠️ INCONSISTENT</span>
                        </div>
                        <p
                          className={`text-[10px] ${
                            selectedFeeling === 'INCONSISTENT' ? 'text-amber-100' : 'text-stone-500'
                          }`}
                        >
                          {inconsistentSubtext}
                        </p>
                      </button>

                      <button
                        onClick={() => setSelectedFeeling('TOO_DIFFICULT')}
                        className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                          selectedFeeling === 'TOO_DIFFICULT'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1.5">
                          <span>❌ TOO DIFFICULT</span>
                        </div>
                        <p
                          className={`text-[10px] ${
                            selectedFeeling === 'TOO_DIFFICULT' ? 'text-rose-100' : 'text-stone-500'
                          }`}
                        >
                          {tooDifficultSubtext}
                        </p>
                      </button>
                    </div>
                  );
                })()}

                {/* Quick Issue Tags */}
                <div className="space-y-2 pt-1 border-t border-stone-200">
                  <span className="text-[11px] font-bold text-stone-700 block">
                    Any specific friction? (Optional):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ISSUE_TAG_OPTIONS.map((tag) => {
                      const isSelected = selectedIssues.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedIssues((prev) => prev.filter((i) => i !== tag));
                            } else {
                              setSelectedIssues((prev) => [...prev, tag]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-[#4a523a] text-white border-[#4a523a]'
                              : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calculate Adaptive Response Button */}
                <button
                  id="btn-submit-self-check"
                  onClick={handleCalculateAndShowAdaptiveResponse}
                  disabled={!selectedFeeling}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                    selectedFeeling
                      ? 'bg-[#4a523a] hover:bg-[#3d4430] text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <span>SEE COACH ADAPTIVE RESPONSE →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

