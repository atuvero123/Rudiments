import {
  GranularSkill,
  LearnerProfile,
  PracticeContinuityDecision,
  SessionIntent,
  EvidenceConfidence,
  EquipmentOption,
  PracticeContextOption,
  PracticeSession,
  RecentTrendType,
} from '../types';
import {
  getSkillEvidenceMemory,
  getAllAttemptEvidenceForSkill,
} from './evidenceEngine';
import { deriveSkillProgressionInfo } from './progressionEngine';
import { deriveSkillReadiness } from './readinessEngine';
import { getActiveGapClosurePlan } from './gapClosureEngine';
import { getOrInitializePlacementAssessment } from './drummerPlacementEngine';
import { CURRICULUM_COMPETENCIES_BY_SKILL_ID } from '../data/canonicalCurriculum';
import { deriveCompetencyPracticeAuthorityForSkill } from './competencyAdvancementEngine';

const CONTINUATION_STORAGE_KEY = 'RUDIMENT_CONTINUATION_RECOMMENDATIONS_V1';

/**
 * Saves a next-session recommendation for a skill to localStorage.
 */
export function saveNextTimeRecommendation(skillId: string, recommendation: string): void {
  try {
    const raw = localStorage.getItem(CONTINUATION_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[skillId] = recommendation;
    localStorage.setItem(CONTINUATION_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save next time recommendation:', err);
  }
}

/**
 * Retrieves saved next-session recommendation for a skill from localStorage.
 */
export function getNextTimeRecommendation(skillId: string): string | null {
  try {
    const raw = localStorage.getItem(CONTINUATION_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[skillId] || null;
  } catch (err) {
    return null;
  }
}

/**
 * Helper to compute days since a given date string (ISO).
 */
function getDaysSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return 'Never practiced';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function getDefaultTempoForSkill(skillId: string): number {
  if (skillId.includes('rlk') || skillId.includes('rkl')) return 60;
  if (skillId.includes('single-stroke')) return 80;
  if (skillId.includes('double-stroke')) return 70;
  if (skillId.includes('paradiddle')) return 75;
  if (skillId.includes('kick')) return 65;
  if (skillId.includes('68')) return 65;
  return 70;
}

/**
 * Derives a full, evidence-informed continuity decision for a given skill.
 */
export function deriveSkillContinuityDecision(
  skill: GranularSkill,
  allSkills: GranularSkill[],
  profile: LearnerProfile,
  equipment: EquipmentOption = 'Practice Pad',
  practiceContext: PracticeContextOption = 'SKILL_DEVELOPMENT'
): PracticeContinuityDecision {
  const memory = getSkillEvidenceMemory(skill.id);
  const allAttempts = getAllAttemptEvidenceForSkill(skill.id);

  // 1. Evidence Confidence Level
  const totalSessions = memory?.totalSessions || 0;
  const totalAttempts = memory?.totalAttempts || 0;
  let evidenceConfidence: EvidenceConfidence = 'low';
  if (totalSessions >= 3 || totalAttempts >= 8) {
    evidenceConfidence = 'reliable';
  } else if (totalSessions >= 1 || totalAttempts >= 2) {
    evidenceConfidence = 'developing';
  }

  // 2. Last Session Summary
  const daysAgo = getDaysSince(memory?.lastPracticedAt || null);
  const latestAttempt = allAttempts.length > 0 ? allAttempts[allAttempts.length - 1] : null;

  let lastResultText = 'Not yet attempted';
  if (latestAttempt) {
    if (latestAttempt.assessment === 'clean_relaxed') lastResultText = 'Clean & Relaxed';
    else if (latestAttempt.assessment === 'mostly_clean') lastResultText = 'Mostly Clean';
    else if (latestAttempt.assessment === 'inconsistent') lastResultText = 'Inconsistent';
    else if (latestAttempt.assessment === 'too_difficult') lastResultText = 'Too Difficult';
  }

  const unresolvedIssue =
    memory?.primaryRecurringFriction?.tag ||
    (latestAttempt && (latestAttempt.assessment === 'inconsistent' || latestAttempt.assessment === 'too_difficult') && latestAttempt.frictions[0]) ||
    null;

  const lastSessionSummary = memory?.lastPracticedAt
    ? {
        date: formatDaysAgo(daysAgo),
        workingBpm: memory.currentWorkingBpm,
        lastResult: lastResultText,
        unresolvedIssue,
      }
    : null;

  // Derive BU2F Skill Readiness
  const readiness = deriveSkillReadiness(skill, memory || undefined, undefined, allAttempts);

  // 3. Priority Scoring Math
  let priorityScore = 50;
  let primaryReason = 'Standard curriculum rotation';

  // Active Checkpoint Gap Closure Boost (Highest Priority in Curriculum)
  const activeGapPlan = getActiveGapClosurePlan(skill.id);
  if (activeGapPlan) {
    priorityScore += 45;
    primaryReason = `Active ${activeGapPlan.checkpointLevel} Checkpoint Gap Closure (${activeGapPlan.failedCriteria.length} pending)`;
  } else if (readiness.readinessState === 'READY_FOR_CHECKPOINT') {
    priorityScore += 35;
    primaryReason = `Demonstrated all evidence requirements for ${readiness.targetStatus} Checkpoint`;
  } else if (readiness.readinessState === 'NEARLY_READY') {
    priorityScore += 25;
    primaryReason = `Approaching readiness for ${readiness.targetStatus} Checkpoint`;
  } else if (skill.status === 'LEARNING') {
    priorityScore += 20;
    primaryReason = 'Currently active learning focus';
  } else if (skill.status === 'DISCOVERED') {
    priorityScore += 15;
    primaryReason = 'Discovered skill needing active development';
  } else if (skill.status === 'MASTERED') {
    priorityScore -= 15;
  }

  // Canonical Curriculum Alignment Boost
  const placementAssessment = getOrInitializePlacementAssessment(profile, allSkills);
  const canonicalComp = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(skill.id);
  if (canonicalComp) {
    if (canonicalComp.unitId === placementAssessment.activeUnitId) {
      priorityScore += 50;
      if (!activeGapPlan) {
        primaryReason = `Current Unit Target: ${canonicalComp.title}`;
      }
    } else if (canonicalComp.band === placementAssessment.verifiedBand) {
      priorityScore += 25;
    } else if (placementAssessment.verifiedBand === 'BEGINNER' && canonicalComp.band === 'ADVANCED') {
      // Prevent jumping to advanced skills before foundational verification
      priorityScore -= 50;
    }
  }

  // Goal & Gap Relevance
  const isGoalSkill =
    profile.favouriteSongs.some((song) => song.toLowerCase().includes(skill.name.toLowerCase()));
  if (isGoalSkill) {
    priorityScore += 15;
    primaryReason = 'Directly matches your primary learning goals';
  }

  // Trend Weighting
  const recentTrend = memory?.recentTrend || 'insufficient_evidence';
  if (recentTrend === 'struggling') {
    priorityScore += 30;
    primaryReason = 'Recent struggle detected — needs recovery and consolidation';
  } else if (recentTrend === 'improving') {
    priorityScore += 15;
    primaryReason = 'Building momentum — ideal for consolidation';
  } else if (recentTrend === 'stable') {
    priorityScore += 10;
  } else if (recentTrend === 'insufficient_evidence') {
    priorityScore += 5;
    if (totalSessions === 0) {
      primaryReason = 'Unassessed skill — establish baseline';
    }
  }

  // Recurring Friction Weighting
  const recurringFriction = memory?.primaryRecurringFriction?.tag || null;
  if (recurringFriction) {
    priorityScore += 25;
    primaryReason = `Recurring ${recurringFriction} friction across recent sessions`;
  }

  // Recovery Mode Frequency
  if ((memory?.recoveryModeCount || 0) >= 2) {
    priorityScore += 20;
    primaryReason = 'Multiple Recovery Mode activations in past attempts';
  }

  // Recency & Neglect Weighting
  if (daysAgo === null) {
    priorityScore += 10; // Unpracticed
  } else if (daysAgo > 7) {
    priorityScore += 20;
    primaryReason = `Neglected for ${daysAgo} days — needs maintenance`;
  } else if (daysAgo >= 3) {
    priorityScore += 10;
  } else if (daysAgo === 0 && (latestAttempt?.assessment === 'clean_relaxed' || latestAttempt?.assessment === 'mostly_clean')) {
    priorityScore -= 20; // Already practiced clean today
  } else if (daysAgo <= 1 && unresolvedIssue) {
    priorityScore += 15; // Unresolved issue from recent practice
    primaryReason = `Unresolved ${unresolvedIssue} from recent session`;
  }

  // Equipment Alignment
  const isPadFriendly =
    skill.parentTrack === 'rudiments' ||
    skill.parentTrack === 'coordination' ||
    skill.id.includes('rlk') ||
    skill.id.includes('subdivision');
  if (equipment === 'Practice Pad') {
    if (!isPadFriendly) {
      priorityScore -= 25; // Kit-heavy skill on pad
    } else {
      priorityScore += 10;
    }
  } else if (equipment === 'Full Drum Kit') {
    if (skill.parentTrack === 'grooves' || skill.parentTrack === 'fills' || skill.id.includes('kick')) {
      priorityScore += 15;
    }
  }

  // 4. Evidence-Backed Starting Tempo Logic
  let recommendedStartingTempo: number;
  let tempoLabel: 'EVIDENCE-BASED STARTING TEMPO' | 'SUGGESTED BASELINE TEMPO';

  const defaultTempo = getDefaultTempoForSkill(skill.id);

  if (evidenceConfidence === 'low' || !memory || memory.currentWorkingBpm === null) {
    recommendedStartingTempo = skill.currentComfortTempo || defaultTempo;
    tempoLabel = 'SUGGESTED BASELINE TEMPO';
  } else {
    tempoLabel = 'EVIDENCE-BASED STARTING TEMPO';
    if (recentTrend === 'struggling' || (memory.recoveryModeCount || 0) >= 2) {
      // Conservative start 10 BPM below recent working BPM
      recommendedStartingTempo = Math.max(40, memory.currentWorkingBpm - 10);
    } else if (recentTrend === 'improving') {
      // Start at working BPM, NOT Clean Best immediately
      recommendedStartingTempo = memory.currentWorkingBpm;
    } else {
      // Stable or default working BPM
      recommendedStartingTempo = memory.currentWorkingBpm;
    }
  }


  // C4.2: canonical certification is the tempo authority for an unverified skill.
  const advancementAuthority = deriveCompetencyPracticeAuthorityForSkill(skill.id, allSkills);
  if (advancementAuthority?.tempoCeiling) {
    recommendedStartingTempo = Math.min(recommendedStartingTempo, advancementAuthority.tempoCeiling);
  }

  // 5. Session Intent Derivation
  let sessionIntent: SessionIntent = 'establish_baseline';
  let sessionIntentLabel = 'Establish Baseline';

  if (activeGapPlan) {
    sessionIntent = 'rebuild';
    sessionIntentLabel = `Checkpoint Gap Closure (${activeGapPlan.checkpointLevel})`;
  } else if (evidenceConfidence === 'low') {
    sessionIntent = 'establish_baseline';
    sessionIntentLabel = 'Establish Baseline';
  } else if (recentTrend === 'struggling' || (memory?.recoveryModeCount || 0) >= 2) {
    sessionIntent = 'rebuild';
    sessionIntentLabel = 'Rebuild Control';
  } else if (readiness.readinessState === 'READY_FOR_CHECKPOINT' || readiness.readinessState === 'NEARLY_READY') {
    sessionIntent = 'checkpoint_prep';
    sessionIntentLabel = `Checkpoint Prep (${readiness.targetStatus})`;
  } else if (recurringFriction !== null || recentTrend === 'stable') {
    sessionIntent = 'stabilize';
    sessionIntentLabel = 'Stabilize Control';
  } else if (recentTrend === 'improving') {
    if (practiceContext === 'SONG_SERVICE_PREP') {
      sessionIntent = 'apply';
      sessionIntentLabel = 'Musical Application';
    } else {
      sessionIntent = 'consolidate';
      sessionIntentLabel = 'Consolidate Gains';
    }
  } else {
    sessionIntent = 'progress';
    sessionIntentLabel = 'Push Progression';
  }

  if (advancementAuthority?.verificationPriority) {
    sessionIntent = 'checkpoint_prep';
    sessionIntentLabel = 'Formal Verification Priority';
    recommendedStartingTempo = advancementAuthority.recommendedPracticeBpm;
  }


  // 6. Formulate "Why Today" Explanation
  let whyChosenExplanation = '';
  if (advancementAuthority?.verificationPriority) {
    whyChosenExplanation = `${skill.name} is ready for canonical verification. Ordinary practice is now consolidation only; the formal test is the primary next action.`;
  } else if (readiness.readinessState === 'READY_FOR_CHECKPOINT') {
    whyChosenExplanation = `${skill.name} has demonstrated all evidence requirements for the ${readiness.targetStatus} Checkpoint! Today runs a checkpoint simulation.`;
  } else if (readiness.readinessState === 'NEARLY_READY') {
    whyChosenExplanation = `${skill.name} is nearly ready for the ${readiness.targetStatus} Checkpoint (${readiness.metRequirementsCount}/${readiness.totalRequirementsCount} requirements met). Today targets the remaining gap.`;
  } else if (recurringFriction) {
    whyChosenExplanation = `${recurringFriction} friction was logged in ${memory?.primaryRecurringFriction?.count || 2} recent encounters on ${skill.name}.`;
  } else if (recentTrend === 'struggling') {
    whyChosenExplanation = `Recent attempts on ${skill.name} encountered tension or instability. Today rebuilds execution at a controlled tempo.`;
  } else if (recentTrend === 'improving') {
    whyChosenExplanation = `${skill.name} execution is improving at ${recommendedStartingTempo} BPM. Today consolidates control before pushing tempo.`;
  } else if (daysAgo !== null && daysAgo >= 3) {
    whyChosenExplanation = `You last practiced ${skill.name} ${formatDaysAgo(daysAgo).toLowerCase()}. A focused maintenance block keeps muscle memory sharp.`;
  } else if (evidenceConfidence === 'low') {
    whyChosenExplanation = `No reliable practice evidence exists yet for ${skill.name}. Today establishes your baseline comfortable working tempo.`;
  } else {
    whyChosenExplanation = `Selected as a core priority for your drumming journey.`;
  }

  // 7. Today's Aim & Exercise Plan
  let todayAim = '';
  let exerciseFocusPlan: string[] = [];

  if (sessionIntent === 'checkpoint_prep') {
    todayAim = advancementAuthority?.verificationPriority
      ? `Warm up and consolidate at or below ${advancementAuthority.targetBpm} BPM, then take the formal verification test.`
      : `Solidify all criteria for the ${readiness.targetStatus} Checkpoint at ${recommendedStartingTempo} BPM.`;
    exerciseFocusPlan = advancementAuthority?.verificationPriority
      ? [
          'Short relaxed warm-up with no speed chasing',
          `One or two controlled runs at ${recommendedStartingTempo}-${advancementAuthority.targetBpm} BPM`,
          `Formal verification at ${advancementAuthority.targetBpm} BPM when ready`,
        ]
      : [
          'Wrist & fulcrum alignment check to ensure zero physical tension',
          `Sustained steady-stream execution at ${recommendedStartingTempo} BPM matching checkpoint criteria`,
          'Musical transition and downbeat landing simulation without tempo drop',
        ];
  } else if (sessionIntent === 'establish_baseline') {
    todayAim = `Identify a clean, relaxed starting tempo for ${skill.name}.`;
    exerciseFocusPlan = [
      'Wrist and grip warm-up to loosen hands',
      `Slow, isolated stroke mechanics at ${recommendedStartingTempo} BPM`,
      'Guided self-check to lock in baseline working tempo',
    ];
  } else if (sessionIntent === 'rebuild') {
    todayAim = `Rebuild clean mechanics and clear ${recurringFriction || 'tension'} at ${recommendedStartingTempo} BPM.`;
    exerciseFocusPlan = [
      'Relaxation warm-up focusing on posture and low stick height',
      `Slower isolated mechanics at ${recommendedStartingTempo} BPM targeting ${recurringFriction || 'even execution'}`,
      'Controlled repetitions with instant Recovery Mode if tension returns',
    ];
  } else if (sessionIntent === 'stabilize') {
    todayAim = `Stabilize ${recurringFriction || 'execution'} consistency at ${recommendedStartingTempo} BPM.`;
    exerciseFocusPlan = [
      'Rhythmic flow warm-up',
      `Precision stroke mechanics focusing on ${recurringFriction || 'even note spacing'}`,
      `Context bridge integrating ${skill.name} into a 4-bar phrase`,
    ];
  } else if (sessionIntent === 'consolidate') {
    todayAim = `Consolidate clean execution at ${recommendedStartingTempo} BPM before attempting higher tempos.`;
    exerciseFocusPlan = [
      'Dynamic rebound warm-up',
      `Continuous stream execution at ${recommendedStartingTempo} BPM`,
      'Dynamic variation and accent orchestration',
    ];
  } else if (sessionIntent === 'apply') {
    todayAim = `Integrate ${skill.name} into musical phrases and song transitions.`;
    exerciseFocusPlan = [
      'Groove warm-up',
      `Technical execution at ${recommendedStartingTempo} BPM`,
      '4-bar groove-to-fill transitions and crash landings',
    ];
  } else {
    todayAim = `Push clean tempo boundary beyond ${recommendedStartingTempo} BPM if early rounds stay clean.`;
    exerciseFocusPlan = [
      'Speed and rebound warm-up',
      `Progressive tempo ladder starting at ${recommendedStartingTempo} BPM`,
      'Musical application at target tempo',
    ];
  }

  // 8. Next Time Recommendation
  const savedNext = getNextTimeRecommendation(skill.id);
  const nextTimeRecommendation = advancementAuthority?.verificationPriority
    ? `NEXT TIME: Do not push beyond ${advancementAuthority.targetBpm} BPM. Take the formal verification test; use ordinary practice only as a short warm-up or consolidation.`
    : savedNext ||
    (recurringFriction
      ? `NEXT TIME: Maintain ${recommendedStartingTempo} BPM. Address ${recurringFriction} before pushing speed.`
      : sessionIntent === 'rebuild'
      ? `NEXT TIME: Begin at ${recommendedStartingTempo} BPM with a relaxed fulcrum.`
      : `NEXT TIME: Begin at ${recommendedStartingTempo} BPM. Test +5 BPM if early rounds are Clean & Relaxed.`);

  // 9. Derive BU2D Skill Progression Info
  const progression = deriveSkillProgressionInfo(
    skill.id,
    skill.name,
    memory,
    allAttempts,
    equipment
  );

  return {
    skillId: skill.id,
    skillName: skill.name,
    priorityScore,
    priorityReason: primaryReason,
    recommendedStartingTempo,
    tempoLabel,
    sessionIntent,
    sessionIntentLabel,
    recurringFriction,
    recentTrend,
    evidenceConfidence,
    lastSessionSummary,
    whyChosenExplanation,
    todayAim,
    exerciseFocusPlan,
    nextTimeRecommendation,

    // BU2D Extensions
    currentStage: progression.currentStage,
    todayEmphasis: progression.todayEmphasis,
    nextDevelopmentTarget: progression.nextDevelopmentTarget,
    stageStatuses: progression.stageStatuses,
    isRegressedEmphasis: progression.isRegressedEmphasis,
  };
}

/**
 * Ranks all available skills for Coach Chooses mode.
 */
export function rankSkillsForCoachChooses(
  allSkills: GranularSkill[],
  profile: LearnerProfile,
  equipment: EquipmentOption = 'Practice Pad',
  practiceContext: PracticeContextOption = 'SKILL_DEVELOPMENT'
): PracticeContinuityDecision[] {
  if (!allSkills || allSkills.length === 0) return [];

  const decisions = allSkills.map((skill) =>
    deriveSkillContinuityDecision(skill, allSkills, profile, equipment, practiceContext)
  );

  // Sort by priorityScore descending
  decisions.sort((a, b) => b.priorityScore - a.priorityScore);

  return decisions;
}

/**
 * Generates an end-of-session continuation recommendation based on completed practice.
 */
export function generateNextTimeRecommendation(session: PracticeSession): string {
  if (!session.exercises || session.exercises.length === 0) {
    return 'NEXT TIME: Continue practicing at a comfortable, relaxed tempo.';
  }

  const primarySkillId = session.selectedSkillIds?.[0] || session.exercises[0].skillIds[0] || 'skill';
  const memory = getSkillEvidenceMemory(primarySkillId);

  const results = session.exercises.map((ex) => ex.result?.selfCheck).filter(Boolean);

  const hadDifficulty = results.includes('TOO_DIFFICULT') || results.includes('INCONSISTENT');
  const allClean = results.length > 0 && results.every((r) => r === 'CLEAN_AND_RELAXED');
  const mostlyClean = results.includes('MOSTLY_CLEAN');

  const recurringFriction = memory?.primaryRecurringFriction?.tag;
  const workingBpm = memory?.currentWorkingBpm || session.exercises[1]?.tempo || 70;

  let advice = '';

  if (hadDifficulty) {
    if (recurringFriction) {
      advice = `NEXT TIME: Begin at ${Math.max(40, workingBpm - 5)} BPM. Focus specifically on clearing ${recurringFriction} before attempting speed increases.`;
    } else {
      advice = `NEXT TIME: Begin at ${Math.max(40, workingBpm - 5)} BPM. Prioritize relaxed wrist rebound and consistent click alignment.`;
    }
  } else if (allClean) {
    advice = `NEXT TIME: Begin at ${workingBpm} BPM. If first two rounds stay Clean & Relaxed, challenge +5 BPM to push progression.`;
  } else if (mostlyClean) {
    advice = `NEXT TIME: Consolidate at ${workingBpm} BPM. Build 3 consecutive clean rounds before advancing tempo.`;
  } else {
    advice = `NEXT TIME: Repeat session at ${workingBpm} BPM to establish steady execution control.`;
  }

  saveNextTimeRecommendation(primarySkillId, advice);
  return advice;
}
