import {
  GranularSkill,
  ProgressionStage,
  StageStatus,
  SkillEvidenceMemory,
  PracticeAttemptEvidence,
  EquipmentOption,
  RecentTrendType,
  ChallengeType,
} from '../types';

export interface SkillProgressionInfo {
  skillId: string;
  skillName: string;
  currentStage: ProgressionStage;
  todayEmphasis: string;
  isRegressedEmphasis: boolean;
  nextDevelopmentTarget: string;
  stageStatuses: Record<ProgressionStage, StageStatus>;
  recommendedChallengeType: ChallengeType;
}

const ALL_STAGES: ProgressionStage[] = [
  'FOUNDATION',
  'CONTROL',
  'ENDURANCE',
  'APPLICATION',
  'TRANSFER',
];

/**
 * Evaluates evidence history to derive a skill's progression stage, stage statuses,
 * today's training emphasis, and next development target.
 */
export function deriveSkillProgressionInfo(
  skillId: string,
  skillName: string,
  memory: SkillEvidenceMemory,
  attempts: PracticeAttemptEvidence[],
  equipment: EquipmentOption = 'Practice Pad'
): SkillProgressionInfo {
  const totalSessions = memory.totalSessions || 0;
  const totalAttempts = memory.totalAttempts || 0;
  const cleanAttempts = memory.cleanAttempts || 0;
  const mostlyClean = memory.mostlyCleanAttempts || 0;
  const cleanOrMostlyClean = cleanAttempts + mostlyClean;
  const recoveryCount = memory.recoveryModeCount || 0;
  const recentTrend = memory.recentTrend || 'insufficient_evidence';
  const recurringFriction = memory.primaryRecurringFriction?.tag || null;

  // 1. Evaluate Progression Gates
  // FOUNDATION: Baseline level (always true if unassessed or starting out)
  let currentStage: ProgressionStage = 'FOUNDATION';

  // CONTROL GATE:
  // Requires at least 2 sessions or 4 attempts, with at least 3 clean/mostly clean attempts,
  // and no catastrophic constant failure.
  const passedControlGate =
    (totalSessions >= 2 || totalAttempts >= 4) &&
    cleanOrMostlyClean >= 3 &&
    recoveryCount <= 2;

  // ENDURANCE GATE:
  // Requires at least 3 sessions or 8 attempts, at least 6 clean/mostly clean attempts,
  // and trend is not struggling.
  const passedEnduranceGate =
    passedControlGate &&
    (totalSessions >= 3 || totalAttempts >= 8) &&
    cleanOrMostlyClean >= 6 &&
    recentTrend !== 'struggling';

  // APPLICATION GATE:
  // Requires at least 4 sessions or 12 attempts, at least 6 genuine Clean & Relaxed attempts,
  // and trend is improving or stable.
  const passedApplicationGate =
    passedEnduranceGate &&
    (totalSessions >= 4 || totalAttempts >= 12) &&
    cleanAttempts >= 6 &&
    (recentTrend === 'improving' || recentTrend === 'stable');

  // TRANSFER GATE:
  // Requires at least 5 sessions or 15 attempts, at least 8 Clean & Relaxed attempts,
  // and improving trend.
  const passedTransferGate =
    passedApplicationGate &&
    (totalSessions >= 5 || totalAttempts >= 15) &&
    cleanAttempts >= 8 &&
    recentTrend === 'improving';

  if (passedTransferGate) {
    currentStage = 'TRANSFER';
  } else if (passedApplicationGate) {
    currentStage = 'APPLICATION';
  } else if (passedEnduranceGate) {
    currentStage = 'ENDURANCE';
  } else if (passedControlGate) {
    currentStage = 'CONTROL';
  } else {
    currentStage = 'FOUNDATION';
  }

  // 2. Stage Statuses Map (Established, Developing, Not Yet Evidenced)
  const stageStatuses: Record<ProgressionStage, StageStatus> = {
    FOUNDATION: 'Not Yet Evidenced',
    CONTROL: 'Not Yet Evidenced',
    ENDURANCE: 'Not Yet Evidenced',
    APPLICATION: 'Not Yet Evidenced',
    TRANSFER: 'Not Yet Evidenced',
  };

  const currentStageIndex = ALL_STAGES.indexOf(currentStage);

  ALL_STAGES.forEach((stage, idx) => {
    if (idx < currentStageIndex) {
      stageStatuses[stage] = 'Established';
    } else if (idx === currentStageIndex) {
      stageStatuses[stage] = totalAttempts > 0 ? 'Developing' : 'Not Yet Evidenced';
    } else {
      stageStatuses[stage] = 'Not Yet Evidenced';
    }
  });

  // If Foundation has clean attempts, ensure Foundation is marked Established when in CONTROL+
  if (currentStageIndex > 0 || cleanOrMostlyClean >= 2) {
    stageStatuses.FOUNDATION = 'Established';
  }

  // 3. Today's Training Emphasis (Handling Regression gracefully without wiping overall stage)
  let todayEmphasis = 'Standard Progression';
  let isRegressedEmphasis = false;

  if (recentTrend === 'struggling' || recoveryCount >= 2) {
    isRegressedEmphasis = true;
    if (currentStage === 'FOUNDATION') {
      todayEmphasis = 'Foundation Refresh';
    } else if (currentStage === 'CONTROL') {
      todayEmphasis = 'Control Rebuild';
    } else {
      todayEmphasis = 'Mechanics & Control Rebuild';
    }
  } else if (recurringFriction) {
    todayEmphasis = `${recurringFriction} Friction Focus`;
  } else {
    if (currentStage === 'FOUNDATION') todayEmphasis = 'Foundation Mechanics';
    else if (currentStage === 'CONTROL') todayEmphasis = 'Dynamic Control & Flow';
    else if (currentStage === 'ENDURANCE') todayEmphasis = 'Sustained Flow';
    else if (currentStage === 'APPLICATION') todayEmphasis = 'Musical Phrasing';
    else todayEmphasis = 'Kit & Accent Transfer';
  }

  // 4. Recommended Challenge Type based on stage & equipment
  let recommendedChallengeType: ChallengeType = 'precision-mechanics';

  if (isRegressedEmphasis) {
    recommendedChallengeType = 'precision-mechanics';
  } else if (currentStage === 'FOUNDATION') {
    recommendedChallengeType = 'precision-mechanics';
  } else if (currentStage === 'CONTROL') {
    recommendedChallengeType = 'dynamic-control';
  } else if (currentStage === 'ENDURANCE') {
    recommendedChallengeType = 'continuous-stream';
  } else if (currentStage === 'APPLICATION') {
    recommendedChallengeType = 'musical-fill';
  } else {
    recommendedChallengeType =
      equipment === 'Practice Pad' ? 'accent-displacement' : 'kit-orchestration';
  }

  // 5. Next Development Target (Drummer-Friendly Wording)
  let nextDevelopmentTarget = '';

  if (isRegressedEmphasis) {
    nextDevelopmentTarget = `Clear ${
      recurringFriction || 'execution tension'
    } at working BPM before advancing pattern complexity.`;
  } else if (recurringFriction) {
    nextDevelopmentTarget = `Address ${recurringFriction} friction to maintain continuous clean execution.`;
  } else {
    switch (currentStage) {
      case 'FOUNDATION':
        nextDevelopmentTarget = `Establish clean isolated stroke mechanics and exact note spacing at working tempo.`;
        break;
      case 'CONTROL':
        nextDevelopmentTarget = `Maintain continuous ${skillName} flow with controlled accents and relaxed wrist rebound.`;
        break;
      case 'ENDURANCE':
        nextDevelopmentTarget = `Sustain uninterrupted ${skillName} pattern execution for extended rounds without fatigue.`;
        break;
      case 'APPLICATION':
        nextDevelopmentTarget = `Integrate ${skillName} cleanly into 1-bar and 2-bar musical fills with beat-1 crash landings.`;
        break;
      case 'TRANSFER':
        nextDevelopmentTarget =
          equipment === 'Practice Pad'
            ? `Apply ${skillName} across simulated orchestration zones with accent displacement.`
            : `Orchestrate ${skillName} across snare and toms with dynamic contrast and groove transitions.`;
        break;
    }
  }

  return {
    skillId,
    skillName,
    currentStage,
    todayEmphasis,
    isRegressedEmphasis,
    nextDevelopmentTarget,
    stageStatuses,
    recommendedChallengeType,
  };
}
