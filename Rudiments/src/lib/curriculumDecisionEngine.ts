import {
  GranularSkill,
  LearnerProfile,
  CurriculumPathway,
  MusicalLimiter,
  MultiDimensionalReadiness,
  SupportingContextDecision,
  SupportingContextState,
  DifficultyDimensionChange,
  CurriculumDecision,
  CurriculumDecisionRecord,
  EvaluatedDependency,
  AnchorGroove,
  EquipmentOption,
  PracticeContextOption,
  PracticeAttemptEvidence,
  PlacementAttemptEvidence,
  PlacementEvidenceMemory,
  SkillEvidenceMemory,
  PrerequisiteClassification,
  AdaptiveNextStepDecision,
  LearningStackState,
  EvidenceBreakdown,
  AdaptivePathAnalysis,
  AssistanceLevel,
  RecentTrendType,
  ContextTempoStatus,
  ContextSpecificTempoReadiness,
} from '../types';
import { getSkillEvidenceMemory, getAllAttemptEvidenceForSkill } from './evidenceEngine';
import { derivePlacementEvidenceMemory, getAllPlacementAttemptsForSkill } from './placementEngine';
import {
  evaluateSkillRoadmap,
  selectBestAnchorGrooveForSkill,
  STARTER_ANCHOR_GROOVES,
} from './roadmapEngine';
import { getPassedCheckpointsForSkill } from './gapClosureEngine';

const CURRICULUM_DECISIONS_KEY = 'RUDIMENT_CURRICULUM_DECISIONS_V1';
const LEARNING_STACK_KEY = 'RUDIMENT_LEARNING_STACK_V1';

// ============================================================================
// 1. EVIDENCE BREAKDOWN ENGINE (System-Observed vs User-Reported)
// ============================================================================

export function deriveEvidenceBreakdown(
  skill: GranularSkill,
  attemptsOverride?: PracticeAttemptEvidence[],
  memoryOverride?: SkillEvidenceMemory,
  placementMemOverride?: PlacementEvidenceMemory
): EvidenceBreakdown {
  const attempts = attemptsOverride || getAllAttemptEvidenceForSkill(skill.id);
  const memory = memoryOverride || getSkillEvidenceMemory(skill.id);
  const placementMem = placementMemOverride || derivePlacementEvidenceMemory(skill.id);
  const placementAttempts = getAllPlacementAttemptsForSkill(skill.id);

  // System-Observed Evidence
  const totalAttempts = attempts.length + placementAttempts.length;
  const cleanAttempts =
    attempts.filter((a) => a.assessment === 'clean_relaxed' || a.assessment === 'mostly_clean').length +
    placementAttempts.filter((pa) => pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success).length;

  const placementLandings = placementMem.successfulDownbeatLandings;
  const cleanGrooveReturns = placementMem.cleanGrooveReturns;
  const highestCleanBpm = memory.highestCleanBpm || skill.currentComfortTempo || null;
  const currentWorkingBpm = memory.currentWorkingBpm || skill.currentComfortTempo || 64;

  const assistanceLevelsTested: AssistanceLevel[] = [];
  if (placementAttempts.some((pa) => pa.assistanceLevel === 'FULL')) assistanceLevelsTested.push('FULL');
  if (placementAttempts.some((pa) => pa.assistanceLevel === 'REDUCED')) assistanceLevelsTested.push('REDUCED');
  if (placementAttempts.some((pa) => pa.assistanceLevel === 'MINIMAL')) assistanceLevelsTested.push('MINIMAL');
  if (placementAttempts.some((pa) => pa.assistanceLevel === 'NONE')) assistanceLevelsTested.push('NONE');
  if (assistanceLevelsTested.length === 0) assistanceLevelsTested.push('FULL');

  const hasIndependentRuns = placementAttempts.some(
    (pa) => (pa.assistanceLevel === 'NONE' || pa.assistanceLevel === 'MINIMAL') && (pa.success || pa.selfAssessment === 'CLEAN_AND_RELAXED')
  );

  const trend: RecentTrendType = memory.recentTrend || (cleanAttempts >= 2 ? 'improving' : totalAttempts >= 1 ? 'stable' : 'insufficient_evidence');

  const systemSummary = totalAttempts === 0
    ? `No practice sessions logged yet. Diagnostic evaluation active.`
    : `${totalAttempts} total attempts recorded • ${cleanAttempts} clean runs • ${placementLandings} downbeat landings • ${cleanGrooveReturns} groove recoveries.`;

  // User-Reported Evidence
  let cleanCount = 0;
  let mostlyCleanCount = 0;
  let inconsistentCount = 0;
  let tooDifficultCount = 0;
  const frictionTagsSet = new Set<string>();
  const followCuesReflections: string[] = [];

  attempts.forEach((a) => {
    if (a.assessment === 'clean_relaxed') cleanCount++;
    else if (a.assessment === 'mostly_clean') mostlyCleanCount++;
    else if (a.assessment === 'inconsistent') inconsistentCount++;
    else if (a.assessment === 'too_difficult') tooDifficultCount++;

    if (a.frictions) a.frictions.forEach((f) => frictionTagsSet.add(f));
  });

  placementAttempts.forEach((pa) => {
    if (pa.selfAssessment === 'CLEAN_AND_RELAXED') cleanCount++;
    else if (pa.selfAssessment === 'MOSTLY_CLEAN') mostlyCleanCount++;
    else if (pa.selfAssessment === 'INCONSISTENT') inconsistentCount++;
    else if (pa.selfAssessment === 'TOO_DIFFICULT') tooDifficultCount++;
    if (pa.followCuesReflection) followCuesReflections.push(pa.followCuesReflection);
  });

  const frictionTagsEncountered = Array.from(frictionTagsSet);
  const userConfidence = skill.confidence || (cleanCount >= 2 ? 4 : cleanCount >= 1 ? 3 : 2);
  const userSummary = totalAttempts === 0
    ? `Initial self-confidence rating: ${userConfidence}/5.`
    : `Ratings: ${cleanCount} clean, ${mostlyCleanCount} mostly clean, ${inconsistentCount} inconsistent. Frictions: ${frictionTagsEncountered.length ? frictionTagsEncountered.slice(0, 3).join(', ') : 'None reported'}.`;

  // Decision Confidence
  let decisionConfidence: 'HIGH' | 'MEDIUM' | 'DEVELOPING' | 'LOW' = 'DEVELOPING';
  let confidenceReason = '';

  if (totalAttempts >= 4 && (cleanCount + mostlyCleanCount) >= 2) {
    decisionConfidence = 'HIGH';
    confidenceReason = `Corroborated by ${totalAttempts} runs across multiple practice dimensions.`;
  } else if (totalAttempts >= 2) {
    decisionConfidence = 'MEDIUM';
    confidenceReason = `Sufficient initial evidence to isolate primary developmental limiter.`;
  } else if (totalAttempts === 1) {
    decisionConfidence = 'DEVELOPING';
    confidenceReason = `Single session evidence; recommendation focuses on initial baseline stabilization.`;
  } else {
    decisionConfidence = 'LOW';
    confidenceReason = `Curriculum roadmap defaults active until first practice attempt is logged.`;
  }

  return {
    systemObserved: {
      totalAttempts,
      cleanAttempts,
      placementLandings,
      cleanGrooveReturns,
      highestCleanBpm,
      currentWorkingBpm,
      assistanceLevelsTested,
      hasIndependentRuns,
      trend,
      summary: systemSummary,
    },
    userReported: {
      cleanCount,
      mostlyCleanCount,
      inconsistentCount,
      tooDifficultCount,
      frictionTagsEncountered,
      followCuesReflections,
      userConfidence,
      summary: userSummary,
    },
    decisionConfidence,
    confidenceReason,
  };
}

// ============================================================================
// 2. CONTEXT-SPECIFIC TEMPO READINESS EVALUATOR (BU2F-R2G-Fix1)
// ============================================================================

export function evaluateContextSpecificTempoReadiness(
  skill: GranularSkill,
  memory: SkillEvidenceMemory,
  placementMem: PlacementEvidenceMemory,
  attempts: PracticeAttemptEvidence[],
  placementAttempts: PlacementAttemptEvidence[],
  provisionalLimiter?: MusicalLimiter
): ContextSpecificTempoReadiness {
  // 1. ISOLATED EXECUTION TEMPO
  const isolatedAttempts = attempts.filter((a) => a.challengeType !== 'musical_placement');
  const isolatedClean = isolatedAttempts.filter(
    (a) => a.assessment === 'clean_relaxed' || a.assessment === 'mostly_clean'
  );
  const isolatedGenuineClean = isolatedAttempts.filter((a) => a.assessment === 'clean_relaxed');

  let isolatedBpm: number | null = null;
  if (memory.highestCleanBpm) {
    isolatedBpm = memory.highestCleanBpm;
  } else if (isolatedGenuineClean.length > 0) {
    isolatedBpm = Math.max(...isolatedGenuineClean.map((a) => a.bpm));
  } else if (isolatedClean.length > 0) {
    isolatedBpm = Math.max(...isolatedClean.map((a) => a.bpm));
  } else if (skill.currentComfortTempo) {
    isolatedBpm = skill.currentComfortTempo;
  } else if (isolatedAttempts.length > 0) {
    isolatedBpm = Math.max(...isolatedAttempts.map((a) => a.bpm));
  }

  const isolatedAttemptsCount = isolatedAttempts.length || attempts.length;
  const isolatedCleanCount = isolatedClean.length || (memory.cleanAttempts > 0 ? memory.cleanAttempts : 0);

  let isolatedStatus: ContextTempoStatus = 'UNTESTED';
  if (isolatedCleanCount >= 3 || (isolatedBpm && isolatedBpm >= 90 && isolatedCleanCount >= 1)) {
    isolatedStatus = 'ESTABLISHED';
  } else if (isolatedCleanCount >= 2) {
    isolatedStatus = 'STABLE';
  } else if (isolatedCleanCount >= 1 || (isolatedBpm && isolatedBpm >= 60)) {
    isolatedStatus = 'DEVELOPING';
  } else if (isolatedAttemptsCount > 0) {
    isolatedStatus = 'CALIBRATING';
  } else {
    isolatedStatus = 'UNTESTED';
  }

  // 2. PULSE TEMPO
  const timingFrictions = attempts.filter((a) =>
    a.frictions.some((f) =>
      f.toLowerCase().includes('timing') ||
      f.toLowerCase().includes('lost count') ||
      f.toLowerCase().includes('rushed') ||
      f.toLowerCase().includes('dragged')
    )
  );
  const pulseAttemptsCount = attempts.length + placementAttempts.length;
  const pulseBpm = isolatedBpm || skill.currentComfortTempo || 64;
  let pulseStatus: ContextTempoStatus = 'UNTESTED';
  if (pulseAttemptsCount >= 2 && timingFrictions.length === 0) {
    pulseStatus = 'ESTABLISHED';
  } else if (pulseAttemptsCount >= 1 && timingFrictions.length <= 1) {
    pulseStatus = 'DEVELOPING';
  } else if (pulseAttemptsCount > 0) {
    pulseStatus = 'CALIBRATING';
  }

  // 3. PLACEMENT TEMPO
  const cleanPlacementRuns = placementAttempts.filter(
    (pa) => pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success
  );
  const placementAttemptsCount = placementAttempts.length;
  const placementCleanCount = cleanPlacementRuns.length;

  let placementBpm: number | null = null;
  if (cleanPlacementRuns.length > 0) {
    placementBpm = Math.max(...cleanPlacementRuns.map((pa) => pa.bpm));
  } else if (placementAttempts.length > 0) {
    placementBpm = placementAttempts[placementAttempts.length - 1].bpm;
  } else {
    // If no placement attempts yet, conservative baseline for 16th/roll placement is 64 BPM
    placementBpm = 64;
  }

  let placementStatus: ContextTempoStatus = 'UNTESTED';
  if (placementCleanCount >= 3 || placementMem.oneBeatStatus === 'Established') {
    placementStatus = 'ESTABLISHED';
  } else if (placementCleanCount >= 2) {
    placementStatus = 'STABLE';
  } else if (placementCleanCount === 1 || placementMem.oneBeatStatus === 'Developing') {
    placementStatus = 'DEVELOPING';
  } else if (placementAttemptsCount > 0) {
    placementStatus = 'CALIBRATING';
  } else {
    placementStatus = 'UNTESTED';
  }

  // 4. LANDING TEMPO
  const cleanLandingRuns = placementAttempts.filter(
    (pa) =>
      (pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success) &&
      !pa.placementFrictions.some(
        (f) => f.includes('Beat 1') || f.includes('Landing') || f.includes('Crash')
      )
  );
  const landingsCount = placementMem.successfulDownbeatLandings || cleanLandingRuns.length;
  let landingBpm: number | null = null;
  if (cleanLandingRuns.length > 0) {
    landingBpm = Math.max(...cleanLandingRuns.map((pa) => pa.bpm));
  } else {
    landingBpm = placementBpm || 64;
  }

  let landingStatus: ContextTempoStatus = 'UNTESTED';
  if (landingsCount >= 3) {
    landingStatus = 'ESTABLISHED';
  } else if (landingsCount === 2) {
    landingStatus = 'STABLE';
  } else if (landingsCount === 1) {
    landingStatus = 'DEVELOPING';
  } else if (placementAttemptsCount > 0) {
    landingStatus = 'LIMITED_EVIDENCE';
  } else {
    landingStatus = 'UNTESTED';
  }

  // 5. RECOVERY TEMPO
  const cleanRecoveryRuns = placementAttempts.filter(
    (pa) =>
      (pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success) &&
      !pa.placementFrictions.some(
        (f) => f.includes('Lost Groove') || f.includes('Transition Problem')
      )
  );
  const recoveriesCount = placementMem.cleanGrooveReturns || cleanRecoveryRuns.length;
  let recoveryBpm: number | null = null;
  if (cleanRecoveryRuns.length > 0) {
    recoveryBpm = Math.max(...cleanRecoveryRuns.map((pa) => pa.bpm));
  } else {
    recoveryBpm = placementBpm || 64;
  }

  let recoveryStatus: ContextTempoStatus = 'UNTESTED';
  if (recoveriesCount >= 3 && placementMem.grooveReturnReliability === 'High') {
    recoveryStatus = 'ESTABLISHED';
  } else if (recoveriesCount >= 2) {
    recoveryStatus = 'STABLE';
  } else if (recoveriesCount === 1) {
    recoveryStatus = 'DEVELOPING';
  } else if (placementAttemptsCount > 0) {
    recoveryStatus = 'LIMITED_EVIDENCE';
  } else {
    recoveryStatus = 'UNTESTED';
  }

  // 6. INDEPENDENT MUSICAL TEMPO
  const unassistedRuns = placementAttempts.filter(
    (pa) => pa.assistanceLevel === 'NONE' || pa.assistanceLevel === 'MINIMAL'
  );
  const unassistedCleanRuns = unassistedRuns.filter(
    (pa) => pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success
  );
  const unassistedCleanCount = unassistedCleanRuns.length;
  let independentMusicalBpm: number | null = null;
  if (unassistedCleanRuns.length > 0) {
    independentMusicalBpm = Math.max(...unassistedCleanRuns.map((pa) => pa.bpm));
  }

  let independentStatus: ContextTempoStatus = 'UNTESTED';
  if (unassistedCleanCount >= 2) {
    independentStatus = 'ESTABLISHED';
  } else if (unassistedCleanCount === 1) {
    independentStatus = 'DEVELOPING';
  } else if (unassistedRuns.length > 0) {
    independentStatus = 'CALIBRATING';
  } else {
    independentStatus = 'UNTESTED';
  }

  // TECHNICAL CAPABILITY & TARGET REFERENCE
  const technicalCapabilityBpm = isolatedBpm || skill.currentComfortTempo || 108;
  const targetTempo = skill.targetTempo || 108;

  // BASELINE MUSICAL PLACEMENT TEMPO (Safe baseline: derived from clean placement or safe default 64)
  const baselineMusicalPlacementBpm = cleanPlacementRuns.length > 0
    ? Math.max(...cleanPlacementRuns.map((pa) => pa.bpm))
    : 64;

  // CURRENT LEARNING TEMPO DERIVATION BASED ON CURRENT LIMITER
  let currentLearningTempo = baselineMusicalPlacementBpm;

  if (provisionalLimiter === 'TECHNICAL_CONTROL') {
    // Isolated pad execution
    currentLearningTempo = Math.max(50, Math.min(technicalCapabilityBpm, 80));
  } else if (provisionalLimiter === 'TIME_PULSE') {
    // Slower for subdivision pulse stability
    currentLearningTempo = Math.max(50, baselineMusicalPlacementBpm - 6);
  } else if (provisionalLimiter === 'LANDING') {
    // Use landing evidence tempo
    currentLearningTempo = landingBpm || baselineMusicalPlacementBpm;
  } else if (provisionalLimiter === 'RECOVERY') {
    // Use recovery evidence tempo
    currentLearningTempo = recoveryBpm || baselineMusicalPlacementBpm;
  } else if (provisionalLimiter === 'PLACEMENT') {
    // Use placement evidence tempo
    currentLearningTempo = placementBpm || baselineMusicalPlacementBpm;
  } else if (provisionalLimiter === 'INDEPENDENCE') {
    // Keep tempo conservative while reducing assistance
    currentLearningTempo = baselineMusicalPlacementBpm;
  } else if (provisionalLimiter === 'TEMPO' || provisionalLimiter === 'NONE_READY_TO_PROGRESS') {
    // Progression rule: require repeated clean runs before scaling (+2 to +4 BPM)
    if (landingsCount >= 2 && recoveriesCount >= 2) {
      currentLearningTempo = Math.min(targetTempo, baselineMusicalPlacementBpm + 4);
    } else {
      currentLearningTempo = baselineMusicalPlacementBpm;
    }
  } else {
    currentLearningTempo = baselineMusicalPlacementBpm;
  }

  // OVERALL MUSICAL TEMPO STATUS
  let overallMusicalTempoStatus: ContextTempoStatus = 'UNTESTED';
  if (
    placementStatus === 'ESTABLISHED' &&
    landingStatus === 'ESTABLISHED' &&
    recoveryStatus === 'ESTABLISHED' &&
    currentLearningTempo >= targetTempo * 0.85
  ) {
    overallMusicalTempoStatus = 'ESTABLISHED';
  } else if (
    placementStatus === 'ESTABLISHED' &&
    (landingStatus === 'STABLE' || landingStatus === 'ESTABLISHED') &&
    (recoveryStatus === 'STABLE' || recoveryStatus === 'ESTABLISHED')
  ) {
    overallMusicalTempoStatus = 'STABLE';
  } else if (
    placementStatus === 'DEVELOPING' ||
    landingStatus === 'DEVELOPING' ||
    recoveryStatus === 'DEVELOPING'
  ) {
    overallMusicalTempoStatus = 'DEVELOPING';
  } else if (
    landingStatus === 'LIMITED_EVIDENCE' ||
    recoveryStatus === 'LIMITED_EVIDENCE' ||
    placementStatus === 'CALIBRATING' ||
    placementAttemptsCount > 0
  ) {
    overallMusicalTempoStatus = 'CALIBRATING';
  } else {
    overallMusicalTempoStatus = 'UNTESTED';
  }

  // DECISION REASON & REASSURANCE MESSAGE
  let tempoDecisionReason = '';
  let reassuranceMessage = '';

  if (technicalCapabilityBpm && technicalCapabilityBpm > currentLearningTempo + 10) {
    tempoDecisionReason = `Technical speed (${technicalCapabilityBpm} BPM) exceeds current musical-placement evidence. Learning tempo held lower at ${currentLearningTempo} BPM while landing and recovery stabilize.`;
    reassuranceMessage = `Your hands can already execute this faster in isolation (${technicalCapabilityBpm} BPM). We are temporarily slowing the musical context to ${currentLearningTempo} BPM so you can lock the entry, landing and recovery.`;
  } else if (landingsCount < 2 || recoveriesCount < 2) {
    tempoDecisionReason = `Musical learning tempo (${currentLearningTempo} BPM) held steady to build repeated downbeat landing and groove recovery evidence.`;
    reassuranceMessage = `Focusing on repeatable entry and seamless recovery at ${currentLearningTempo} BPM before increasing tempo.`;
  } else {
    tempoDecisionReason = `Learning tempo calibrated to current mechanical and placement stability at ${currentLearningTempo} BPM.`;
    reassuranceMessage = `Rock-solid muscle memory and clean returns active at ${currentLearningTempo} BPM.`;
  }

  return {
    isolatedTempo: {
      bpm: isolatedBpm,
      status: isolatedStatus,
      attemptsCount: isolatedAttemptsCount,
      cleanCount: isolatedCleanCount,
    },
    pulseTempo: {
      bpm: pulseBpm,
      status: pulseStatus,
      attemptsCount: pulseAttemptsCount,
    },
    placementTempo: {
      bpm: placementBpm,
      status: placementStatus,
      attemptsCount: placementAttemptsCount,
      cleanCount: placementCleanCount,
    },
    landingTempo: {
      bpm: landingBpm,
      status: landingStatus,
      landingsCount,
    },
    recoveryTempo: {
      bpm: recoveryBpm,
      status: recoveryStatus,
      recoveriesCount,
    },
    independentMusicalTempo: {
      bpm: independentMusicalBpm,
      status: independentStatus,
      unassistedCleanCount,
    },
    currentLearningTempo,
    technicalCapabilityBpm,
    targetTempo,
    tempoDecisionReason,
    reassuranceMessage,
    overallMusicalTempoStatus,
  };
}

// ============================================================================
// 3. MULTI-DIMENSIONAL READINESS EVALUATOR (8 Dimensions)
// ============================================================================

export function evaluateMultiDimensionalReadiness(
  skill: GranularSkill,
  profile?: LearnerProfile,
  memoryOverride?: SkillEvidenceMemory,
  placementMemOverride?: PlacementEvidenceMemory,
  attemptsOverride?: PracticeAttemptEvidence[],
  dependenciesOverride?: EvaluatedDependency[]
): MultiDimensionalReadiness {
  const memory = memoryOverride || getSkillEvidenceMemory(skill.id);
  const placementMem = placementMemOverride || derivePlacementEvidenceMemory(skill.id);
  const attempts = attemptsOverride || getAllAttemptEvidenceForSkill(skill.id);
  const placementAttempts = getAllPlacementAttemptsForSkill(skill.id);

  // 1. TECHNICAL CONTROL
  const hasCleanTempo = (memory.highestCleanBpm || 0) >= 50 || (memory.currentWorkingBpm || 0) >= 50 || (skill.currentComfortTempo || 0) >= 50;
  const cleanAttempts = attempts.filter(
    (a) => a.assessment === 'clean_relaxed' || a.assessment === 'mostly_clean'
  );
  const totalAttempts = attempts.length;
  const hasMechanicsFriction = attempts.some((a) =>
    a.frictions.some((f) =>
      f.toLowerCase().includes('uneven') ||
      f.toLowerCase().includes('tension') ||
      f.toLowerCase().includes('coordination') ||
      f.toLowerCase().includes('weak sound')
    )
  );

  let technicalControl: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'UNKNOWN';
  if (skill.status === 'CLEAN' || skill.status === 'APPLICABLE' || skill.status === 'MUSICAL' || skill.status === 'MASTERED') {
    technicalControl = hasMechanicsFriction ? 'DEVELOPING' : 'ESTABLISHED';
  } else if (hasCleanTempo && cleanAttempts.length >= 1) {
    technicalControl = 'ESTABLISHED';
  } else if (totalAttempts >= 1) {
    technicalControl = cleanAttempts.length > 0 ? 'DEVELOPING' : 'FRAGILE';
  } else if (skill.status === 'LEARNING' || skill.confidence >= 3) {
    technicalControl = 'DEVELOPING';
  } else if (skill.status === 'DISCOVERED') {
    technicalControl = 'DEVELOPING';
  } else {
    technicalControl = 'UNKNOWN';
  }

  // 2. TIME & PULSE
  const timingFrictions = attempts.filter((a) =>
    a.frictions.some((f) =>
      f.toLowerCase().includes('timing') ||
      f.toLowerCase().includes('lost count') ||
      f.toLowerCase().includes('rushed') ||
      f.toLowerCase().includes('dragged')
    )
  );

  let timeAndPulse: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'UNKNOWN';
  if (totalAttempts === 0) {
    timeAndPulse = skill.confidence >= 3 ? 'DEVELOPING' : 'UNKNOWN';
  } else if (timingFrictions.length === 0 && cleanAttempts.length >= 1) {
    timeAndPulse = 'ESTABLISHED';
  } else if (timingFrictions.length <= 1) {
    timeAndPulse = 'DEVELOPING';
  } else {
    timeAndPulse = 'FRAGILE';
  }

  // 3. PLACEMENT (Phrase Insertion)
  const totalPlacements =
    placementMem.successfulOneBeatPlacements +
    placementMem.successfulTwoBeatPlacements +
    placementMem.successfulFullBarPlacements;

  let placement: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'UNKNOWN';
  if (placementMem.totalPlacementAttempts === 0) {
    placement = skill.status === 'APPLICABLE' || skill.status === 'MUSICAL' || skill.status === 'MASTERED'
      ? 'ESTABLISHED'
      : 'UNKNOWN';
  } else if (placementMem.oneBeatStatus === 'Established' && totalPlacements >= 2) {
    placement = 'ESTABLISHED';
  } else if (totalPlacements >= 1 || placementMem.oneBeatStatus === 'Developing') {
    placement = 'DEVELOPING';
  } else {
    placement = 'FRAGILE';
  }

  // 4. LANDING (Downbeat Precision on 1)
  let landing: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'UNKNOWN';
  if (placementMem.totalPlacementAttempts === 0) {
    landing = skill.status === 'APPLICABLE' || skill.status === 'MUSICAL' || skill.status === 'MASTERED'
      ? 'ESTABLISHED'
      : 'UNKNOWN';
  } else if (placementMem.successfulDownbeatLandings >= 2 && !placementMem.recurringPlacementFriction?.includes('Missed Beat 1')) {
    landing = 'ESTABLISHED';
  } else if (placementMem.successfulDownbeatLandings >= 1) {
    landing = 'DEVELOPING';
  } else {
    landing = 'FRAGILE';
  }

  // 5. RECOVERY (Groove Return Continuity)
  let recovery: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'UNKNOWN';
  if (placementMem.totalPlacementAttempts === 0) {
    recovery = skill.status === 'APPLICABLE' || skill.status === 'MUSICAL' || skill.status === 'MASTERED'
      ? 'ESTABLISHED'
      : 'UNKNOWN';
  } else if (placementMem.cleanGrooveReturns >= 2 && placementMem.grooveReturnReliability === 'High') {
    recovery = 'ESTABLISHED';
  } else if (placementMem.cleanGrooveReturns >= 1 || placementMem.grooveReturnReliability === 'Moderate') {
    recovery = 'DEVELOPING';
  } else {
    recovery = 'FRAGILE';
  }

  // 6. INDEPENDENCE (Assistance Level Required)
  const hasIndependentPlacement = placementAttempts.some(
    (pa) => (pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success) && pa.assistanceLevel === 'NONE'
  );
  const hasReducedCuesPlacement = placementAttempts.some(
    (pa) => (pa.selfAssessment === 'CLEAN_AND_RELAXED' || pa.selfAssessment === 'MOSTLY_CLEAN' || pa.success) && (pa.assistanceLevel === 'REDUCED' || pa.assistanceLevel === 'MINIMAL')
  );

  let independence: 'FULL_GUIDANCE' | 'REDUCED_CUES' | 'INDEPENDENT' | 'AUTOMATIC' = 'FULL_GUIDANCE';
  if (skill.status === 'MASTERED') {
    independence = 'AUTOMATIC';
  } else if (hasIndependentPlacement || skill.status === 'MUSICAL') {
    independence = 'INDEPENDENT';
  } else if (hasReducedCuesPlacement || skill.status === 'APPLICABLE') {
    independence = 'REDUCED_CUES';
  } else {
    independence = 'FULL_GUIDANCE';
  }

  // 7. CONTEXT READINESS
  const anchorGroove = selectBestAnchorGrooveForSkill(skill, profile);
  let contextReadiness: SupportingContextState = 'KNOWN_STABLE';
  if (anchorGroove.isPulseOnly || anchorGroove.category === 'Straight 4/4') {
    contextReadiness = 'KNOWN_STABLE';
  } else {
    contextReadiness = profile?.mainGenres?.some((g) => g.toLowerCase().includes('worship'))
      ? 'KNOWN_STABLE'
      : 'NEEDS_CALIBRATION';
  }

  // PRIMARY DEVELOPMENTAL LIMITER IDENTIFICATION
  let currentLimiter: MusicalLimiter = 'NONE_READY_TO_PROGRESS';
  let limiterDescription = 'All core musical and technical dimensions are currently stable.';

  if (technicalControl === 'FRAGILE' || technicalControl === 'UNKNOWN') {
    currentLimiter = 'TECHNICAL_CONTROL';
    limiterDescription = 'Sticking pattern and physical rebound need clean, unhurried isolation before musical insertion.';
  } else if (timeAndPulse === 'FRAGILE') {
    currentLimiter = 'TIME_PULSE';
    limiterDescription = 'Subdivision consistency and pulse anchoring need reinforcement against a steady click.';
  } else if (contextReadiness === 'NEEDS_CALIBRATION') {
    currentLimiter = 'CONTEXT';
    limiterDescription = 'The supporting groove container is unfamiliar and needs a short calibration before placing fills.';
  } else if (placement === 'FRAGILE' || placement === 'UNKNOWN') {
    currentLimiter = 'PLACEMENT';
    limiterDescription = 'Entering the phrase accurately at the intended beat location (e.g. Beat 4) needs targeted practice.';
  } else if (landing === 'FRAGILE' || (landing === 'DEVELOPING' && placement === 'DEVELOPING')) {
    currentLimiter = 'LANDING';
    limiterDescription = 'Arriving cleanly and accurately on Beat 1 downbeat requires focused attention.';
  } else if (recovery === 'FRAGILE' || recovery === 'DEVELOPING') {
    currentLimiter = 'RECOVERY';
    limiterDescription = 'Connecting the end of the phrase back into the groove without hesitation is the primary friction.';
  } else if (independence === 'FULL_GUIDANCE') {
    currentLimiter = 'INDEPENDENCE';
    limiterDescription = 'Executing the phrase with reduced audio cues and less vocal count-in guidance.';
  } else if (skill.targetTempo && (skill.currentComfortTempo || 0) < skill.targetTempo * 0.7) {
    currentLimiter = 'TEMPO';
    limiterDescription = 'Musical flow is clean; gradual comfort tempo scaling can now begin.';
  } else {
    currentLimiter = 'NONE_READY_TO_PROGRESS';
    limiterDescription = 'Learner has demonstrated stable control, landing, and recovery. Ready for next musical expansion.';
  }

  // 8. CONTEXT-SPECIFIC TEMPO READINESS (BU2F-R2G-Fix1)
  const contextTempos = evaluateContextSpecificTempoReadiness(
    skill,
    memory,
    placementMem,
    attempts,
    placementAttempts,
    currentLimiter
  );

  let tempoReadiness: 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN' = 'DEVELOPING';
  if (contextTempos.overallMusicalTempoStatus === 'ESTABLISHED') {
    tempoReadiness = 'ESTABLISHED';
  } else if (contextTempos.overallMusicalTempoStatus === 'STABLE' || contextTempos.overallMusicalTempoStatus === 'DEVELOPING') {
    tempoReadiness = 'DEVELOPING';
  } else if (contextTempos.overallMusicalTempoStatus === 'CALIBRATING' || contextTempos.overallMusicalTempoStatus === 'LIMITED_EVIDENCE') {
    tempoReadiness = 'DEVELOPING';
  } else {
    tempoReadiness = 'UNKNOWN';
  }

  const qualitativeSummary = `Control: ${technicalControl.toLowerCase()} • Pulse: ${timeAndPulse.toLowerCase()} • Placement: ${placement.toLowerCase()} • Landing: ${landing.toLowerCase()} • Recovery: ${recovery.toLowerCase()}`;

  return {
    technicalControl,
    timeAndPulse,
    placement,
    landing,
    recovery,
    independence,
    contextReadiness,
    tempoReadiness,
    contextTempos,
    currentLimiter,
    limiterDescription,
    qualitativeSummary,
  };
}

// ============================================================================
// 3. SUPPORTING CONTEXT READINESS EVALUATOR
// ============================================================================

export function evaluateSupportingContextDecision(
  targetSkill: GranularSkill,
  profile?: LearnerProfile,
  skills: GranularSkill[] = []
): SupportingContextDecision {
  const anchorGroove = selectBestAnchorGrooveForSkill(targetSkill, profile, 2);

  let state: 'KNOWN_STABLE' | 'NEEDS_CALIBRATION' | 'UNKNOWN' = 'KNOWN_STABLE';
  let reason = 'A simple straight 4/4 groove provides a reliable, neutral container.';
  let calibrationRecommended = false;

  if (anchorGroove.category === 'Pulse') {
    state = 'KNOWN_STABLE';
    reason = 'Pulse-only container eliminates groove complexity so you focus 100% on rudiment mechanics.';
  } else if (anchorGroove.category === 'Straight 4/4') {
    state = 'KNOWN_STABLE';
    reason = 'Universal 8th-note 4/4 frame allows immediate practice of phrase entry and downbeat crash landing.';
  } else if (anchorGroove.category === 'Worship') {
    const worshipSkill = skills.find((s) => s.id === 'grv-worship-44');
    if (worshipSkill && (worshipSkill.status === 'CLEAN' || worshipSkill.status === 'APPLICABLE' || worshipSkill.status === 'MUSICAL')) {
      state = 'KNOWN_STABLE';
      reason = 'Worship 4/4 pocket is verified in your profile, providing a realistic musical bed for dynamic fills.';
    } else {
      state = 'NEEDS_CALIBRATION';
      reason = 'Worship ballad feel involves spacious dynamics. A brief 3-minute calibration ensures the groove is locked.';
      calibrationRecommended = true;
    }
  } else if (anchorGroove.category === '6/8 Slow') {
    const groove68 = skills.find((s) => s.id === 'grv-worship-68');
    if (groove68 && (groove68.status === 'CLEAN' || groove68.status === 'APPLICABLE')) {
      state = 'KNOWN_STABLE';
      reason = '6/8 compound pulse is established in your skill matrix.';
    } else {
      state = 'NEEDS_CALIBRATION';
      reason = '6/8 compound time requires feeling dotted-quarter pulses before placing triplet fills.';
      calibrationRecommended = true;
    }
  }

  return {
    contextName: anchorGroove.name,
    anchorGroove,
    state,
    reason,
    calibrationRecommended,
  };
}

// ============================================================================
// 4. LEARNING STACK STATE MANAGER (Persistence & Goal Memory)
// ============================================================================

export function getStoredLearningStack(skillId: string): LearningStackState | null {
  try {
    const raw = localStorage.getItem(`${LEARNING_STACK_KEY}_${skillId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read learning stack:', e);
    return null;
  }
}

export function saveStoredLearningStack(stack: LearningStackState): void {
  try {
    localStorage.setItem(`${LEARNING_STACK_KEY}_${stack.mainSkillId}`, JSON.stringify(stack));
  } catch (e) {
    console.error('Failed to save learning stack:', e);
  }
}

export function clearStoredLearningStack(skillId: string): void {
  try {
    localStorage.removeItem(`${LEARNING_STACK_KEY}_${skillId}`);
  } catch (e) {
    console.error('Failed to clear learning stack:', e);
  }
}

// ============================================================================
// 5. ADAPTIVE PATH ANALYSIS ENGINE (The Core BU2F-R2G Intelligence)
// ============================================================================

export function evaluateAdaptivePathAnalysis(
  targetSkill: GranularSkill,
  allSkills: GranularSkill[] = [],
  profile?: LearnerProfile,
  equipment?: EquipmentOption,
  practiceContext?: PracticeContextOption
): AdaptivePathAnalysis {
  const memory = getSkillEvidenceMemory(targetSkill.id);
  const placementMem = derivePlacementEvidenceMemory(targetSkill.id);
  const attempts = getAllAttemptEvidenceForSkill(targetSkill.id);
  const roadmap = evaluateSkillRoadmap(targetSkill, allSkills, profile);
  const dependencies = roadmap.dependencies;

  const readiness = evaluateMultiDimensionalReadiness(
    targetSkill,
    profile,
    memory,
    placementMem,
    attempts,
    dependencies
  );
  const supportingContext = evaluateSupportingContextDecision(targetSkill, profile, allSkills);
  const evidence = deriveEvidenceBreakdown(targetSkill, attempts, memory, placementMem);

  // BU2F-R2G-Fix1: Use context-specific learning tempo (e.g. 64 BPM for placement) rather than isolated technical tempo (108 BPM)
  const workingBpm = readiness.contextTempos?.currentLearningTempo || 64;

  // Prerequisite Categorization
  const hardPrereqs: EvaluatedDependency[] = [];
  const supportingPrereqs: EvaluatedDependency[] = [];
  const enrichmentPrereqs: EvaluatedDependency[] = [];
  const missingPrereqs: EvaluatedDependency[] = [];
  const blockingMissingPrereqs: EvaluatedDependency[] = [];

  dependencies.forEach((dep) => {
    const classification = dep.prerequisiteClassification ||
      (dep.dependency.dependencyType === 'GROOVE_CONTEXT' ? 'SUPPORTING' : dep.dependency.importance === 'OPTIONAL' ? 'ENRICHMENT' : 'HARD');

    if (classification === 'HARD') hardPrereqs.push(dep);
    else if (classification === 'SUPPORTING') supportingPrereqs.push(dep);
    else enrichmentPrereqs.push(dep);

    if (dep.state === 'MISSING' || dep.state === 'WEAK') {
      missingPrereqs.push(dep);
      if (classification === 'HARD') {
        blockingMissingPrereqs.push(dep);
      }
    }
  });

  const isPulseSkill =
    targetSkill.id === 'time-quarter-pulse' ||
    targetSkill.id === 'comp-pulse-quarter' ||
    targetSkill.id.startsWith('time-') ||
    targetSkill.id.includes('pulse');

  // Active Goal vs Current Target
  let activeGoal = isPulseSkill
    ? `${targetSkill.name} — Downbeat Pulse Stability & Metronomic Lock`
    : `${targetSkill.name} — Musical Placement & Groove Integration`;
  let currentTarget = isPulseSkill
    ? `${targetSkill.name} — Steady Downbeat Lock at ${workingBpm} BPM`
    : `${targetSkill.name} — 1-Beat Fill on Beat 4`;
  let temporaryPrerequisite: LearningStackState['temporaryPrerequisite'] = null;
  let stackStatus: LearningStackState['status'] = 'ACTIVE_GOAL';
  let completionCondition = isPulseSkill
    ? `Sustain 2 clean 16-bar cycles locked with click at ${workingBpm} BPM.`
    : `Complete 2 clean placements on Beat 4 with accurate Beat 1 landing.`;

  // 10 Distinct Decisions Logic
  let decision: AdaptiveNextStepDecision = 'REINFORCE';
  let decisionLabel = 'Reinforce Placement';
  let title = `Reinforce ${targetSkill.name} Phrase`;
  let recReason = '';
  let buttonLabel = `Practice ${targetSkill.name}`;
  let actionType: AdaptivePathAnalysis['adaptiveRecommendation']['actionType'] = 'PRACTICE_TARGET';
  let suggestedBpm = workingBpm;
  let assistanceMode: AssistanceLevel = 'FULL';
  let phraseLength: '1 beat' | '2 beats' | '1 bar' = '1 beat';
  let entryLocation = 'Beat 4';

  const alreadyHave: string[] = [];
  const stillDeveloping: string[] = [];
  let conclusion = '';

  // Evaluate Demonstrated Capabilities for "Why This Next?"
  if (readiness.technicalControl === 'ESTABLISHED') {
    alreadyHave.push(`Clean mechanics & accent control (${targetSkill.description || targetSkill.name})`);
  }
  if (readiness.timeAndPulse === 'ESTABLISHED') {
    alreadyHave.push(`Steady internal pulse and subdivision timing`);
  }
  if (supportingContext.state === 'KNOWN_STABLE') {
    alreadyHave.push(`Familiar ${supportingContext.contextName} anchor groove bed`);
  }
  if (placementMem.successfulDownbeatLandings >= 1) {
    alreadyHave.push(`Accurate Beat 1 crash downbeat landing`);
  }
  if (placementMem.cleanGrooveReturns >= 1) {
    alreadyHave.push(`Immediate groove recovery upon phrase resolution`);
  }
  if (alreadyHave.length === 0) {
    alreadyHave.push(`Pattern structure & note subdivision understanding`);
  }

  // 1. ISOLATE (Technique/Mechanics Fragile)
  if (readiness.currentLimiter === 'TECHNICAL_CONTROL' || blockingMissingPrereqs.some((p) => p.dependency.dependencyType === 'FOUNDATION')) {
    decision = 'ISOLATE';
    decisionLabel = 'Isolate Mechanics';
    title = `Isolate ${targetSkill.name} Sticking Mechanics`;
    recReason = `Sticking pattern and rebound balance need unhurried isolation on the pad before placing inside time.`;
    buttonLabel = `Isolate Sticking on Pad`;
    actionType = 'ISOLATE_MECHANICS';
    suggestedBpm = Math.max(50, workingBpm - 8);
    assistanceMode = 'FULL';
    currentTarget = `${targetSkill.name} — Pad Sticking & Accent Control`;
    stillDeveloping.push(`Hand-to-hand rebound balance on practice pad`);
    stillDeveloping.push(`Accent clarity without wrist tension`);
    conclusion = `We isolate sticking motions on the pad to lock clean mechanics without groove distractions.`;
  }

  // 2. SLOW DOWN (Timing Frictions / Rushed)
  else if (readiness.currentLimiter === 'TIME_PULSE' || evidence.userReported.frictionTagsEncountered.some((f) => f.includes('rushed') || f.includes('dragged'))) {
    decision = 'SLOW_DOWN';
    decisionLabel = 'Slow Down & Lock Pulse';
    title = `Slow Down to Lock Subdivision Pulse`;
    recReason = `Subdivision was rushing ahead of the metronome click. Decreasing tempo ensures every note sits evenly on the rhythmic grid.`;
    buttonLabel = `Slow Down (-6 BPM)`;
    actionType = 'PRACTICE_TARGET';
    suggestedBpm = Math.max(50, workingBpm - 6);
    assistanceMode = 'FULL';
    currentTarget = `${targetSkill.name} — Steady Pulse at ${suggestedBpm} BPM`;
    stillDeveloping.push(`Subdivision spacing against quarter-note click`);
    conclusion = `We temporarily reduce tempo to give your hands time to feel the pocket without rushing.`;
  }

  // 3. PREPARE_PREREQUISITE (Supporting Groove Needs Calibration)
  else if (supportingContext.state === 'NEEDS_CALIBRATION' || supportingPrereqs.some((sp) => sp.state === 'MISSING' || sp.state === 'WEAK')) {
    decision = 'PREPARE_PREREQUISITE';
    decisionLabel = 'Prepare Supporting Groove';
    title = `Calibrate ${supportingContext.contextName}`;
    recReason = `The supporting groove provides the musical container for your fill. A quick 2-bar calibration ensures a rock-solid foundation before fill entry.`;
    buttonLabel = `Calibrate Groove (3 Mins)`;
    actionType = 'PREPARE_PREREQUISITE';
    suggestedBpm = workingBpm;
    assistanceMode = 'FULL';
    currentTarget = `Lock 2 Bars of ${supportingContext.contextName}`;
    temporaryPrerequisite = {
      name: supportingContext.contextName,
      prerequisiteType: 'SUPPORTING',
      anchorGrooveId: supportingContext.anchorGroove.id,
      reason: supportingContext.reason,
    };
    stackStatus = 'PREREQUISITE_IN_PROGRESS';
    completionCondition = `Play 2 clean cycles of ${supportingContext.contextName} at ${workingBpm} BPM.`;
    stillDeveloping.push(`Unassisted groove pocket consistency in ${supportingContext.contextName}`);
    conclusion = `We prepare the supporting groove first so your mind has a stable musical home to return to after the fill.`;
  }

  // 4. CONTINUE_APPLICATION (Developing Landing & Recovery)
  else if (readiness.currentLimiter === 'LANDING' || readiness.currentLimiter === 'RECOVERY') {
    decision = 'CONTINUE_APPLICATION';
    decisionLabel = 'Consolidate Landing & Recovery';
    title = `Lock Downbeat Landing & Groove Return`;
    recReason = readiness.currentLimiter === 'LANDING'
      ? `Phrase entry is comfortable. Focus now on landing decisively on the Beat 1 crash downbeat.`
      : `Phrase placement is clean. The primary goal is returning instantly to the groove on Beat 2 without hesitation.`;
    buttonLabel = `Practice Groove Return`;
    actionType = 'PRACTICE_TARGET';
    suggestedBpm = workingBpm;
    assistanceMode = 'FULL';
    currentTarget = `${targetSkill.name} — Beat 4 entry → Beat 1 crash → immediate groove return`;
    stillDeveloping.push(`Crisp Beat 1 crash downbeat landing`);
    stillDeveloping.push(`Immediate groove recovery on Beat 2`);
    conclusion = `We maintain 1-beat placement to lock confident downbeat resolution and seamless groove return.`;
  }

  // 5. REDUCE_ASSISTANCE (Landing/Recovery Established -> Less Help)
  else if (
    readiness.placement === 'ESTABLISHED' &&
    readiness.landing === 'ESTABLISHED' &&
    readiness.recovery === 'ESTABLISHED' &&
    readiness.independence === 'FULL_GUIDANCE'
  ) {
    decision = 'REDUCE_ASSISTANCE';
    decisionLabel = 'Reduce Tutor Assistance';
    title = `Practice with Reduced Audio Cues`;
    recReason = `Your downbeat landing and groove return are consistent with guidance. We now remove vocal cues so your internal clock leads the phrase.`;
    buttonLabel = `Try Reduced Guidance`;
    actionType = 'REDUCE_ASSISTANCE';
    suggestedBpm = workingBpm;
    assistanceMode = 'REDUCED';
    currentTarget = `${targetSkill.name} — Beat 4 entry with Reduced Audio Cues`;
    stillDeveloping.push(`Internalized phrase entry without vocal count`);
    conclusion = `We step down audio cues to build true musical autonomy.`;
  }

  // 6. TEST_INDEPENDENCE (Reduced assistance mastered -> Metronome Only)
  else if (
    readiness.placement === 'ESTABLISHED' &&
    readiness.landing === 'ESTABLISHED' &&
    readiness.recovery === 'ESTABLISHED' &&
    readiness.independence === 'REDUCED_CUES'
  ) {
    decision = 'TEST_INDEPENDENCE';
    decisionLabel = 'Test Independent Play';
    title = `Test Unassisted Independence`;
    recReason = `You demonstrated clean execution with reduced cues. Test your confidence with click only and zero visual or audio prompts.`;
    buttonLabel = `Play Independently (Click Only)`;
    actionType = 'TEST_INDEPENDENCE';
    suggestedBpm = workingBpm;
    assistanceMode = 'NONE';
    currentTarget = `${targetSkill.name} — Independent Performance (No Cues)`;
    stillDeveloping.push(`Complete unassisted musical execution`);
    conclusion = `We remove all tutor guidance so you own the phrase completely.`;
  }

  // 7. VARY (1-beat placement solid -> extend to 2 beats on Beat 3)
  else if (
    placementMem.oneBeatStatus === 'Established' &&
    placementMem.twoBeatStatus !== 'Established'
  ) {
    decision = 'VARY';
    decisionLabel = 'Extend Phrase Length';
    title = `Extend to 2-Beat Phrase (Beat 3 Entry)`;
    recReason = `1-beat placement on Beat 4 is rock solid. We will now expand the phrase to a 2-beat entry starting on Beat 3 while holding groove and tempo steady.`;
    buttonLabel = `Practice 2-Beat Extension`;
    actionType = 'VARY_PLACEMENT';
    suggestedBpm = workingBpm;
    phraseLength = '2 beats';
    entryLocation = 'Beat 3';
    assistanceMode = 'REDUCED';
    currentTarget = `${targetSkill.name} — 2-Beat Entry on Beat 3`;
    stillDeveloping.push(`Anticipating Beat 3 fill entry while dropping hi-hat`);
    conclusion = `We double the phrase duration to 2 beats while holding groove and tempo constant.`;
  }

  // 8. PROGRESS (Checkpoint / Next Milestone)
  else if (
    readiness.placement === 'ESTABLISHED' &&
    readiness.landing === 'ESTABLISHED' &&
    readiness.recovery === 'ESTABLISHED' &&
    (readiness.independence === 'INDEPENDENT' || readiness.independence === 'AUTOMATIC')
  ) {
    decision = 'PROGRESS';
    decisionLabel = 'Advance Milestone';
    title = `Ready for Checkpoint Evaluation`;
    recReason = `Multi-dimensional evidence verifies technical control, phrase placement, landing, recovery, and musical independence.`;
    buttonLabel = `Take Checkpoint`;
    actionType = 'PRACTICE_TARGET';
    suggestedBpm = workingBpm;
    assistanceMode = 'NONE';
    currentTarget = `${targetSkill.name} — Formal Checkpoint Assessment`;
    conclusion = `You have satisfied all multi-dimensional criteria to solidify this skill in your curriculum roadmap.`;
  }

  // 9. CREATE (High mastery -> musical improvisation)
  else if (targetSkill.status === 'MUSICAL' || targetSkill.status === 'MASTERED') {
    decision = 'CREATE';
    decisionLabel = 'Creative Improvisation';
    title = `Creative Phrasing & Fill Invention`;
    recReason = `Sufficient control and musical understanding exist. Explore custom phrasing and dynamic voicings inside full songs.`;
    buttonLabel = `Improvise with Groove`;
    actionType = 'CREATE';
    suggestedBpm = workingBpm;
    assistanceMode = 'NONE';
    currentTarget = `Improvise ${targetSkill.name} variations across song forms`;
    conclusion = `Apply the vocabulary freely in creative song contexts.`;
  }

  // 10. Default / REINFORCE
  else {
    decision = 'REINFORCE';
    decisionLabel = isPulseSkill ? 'Reinforce Pulse Grid' : 'Reinforce Placement';
    title = isPulseSkill
      ? `Reinforce ${targetSkill.name} with Metronome`
      : `Reinforce ${targetSkill.name} Placement`;
    recReason = isPulseSkill
      ? `Solidifying steady quarter-note downbeat pulse against the metronome click at ${workingBpm} BPM.`
      : `Solidifying phrase insertion on Beat 4 with accurate Beat 1 crash downbeat landing at ${workingBpm} BPM.`;
    buttonLabel = `Practice ${targetSkill.name}`;
    actionType = 'PRACTICE_TARGET';
    suggestedBpm = workingBpm;
    assistanceMode = 'FULL';
    currentTarget = isPulseSkill
      ? `${targetSkill.name} — Steady Downbeat Lock at ${workingBpm} BPM`
      : `${targetSkill.name} — Beat 4 entry → Beat 1 landing`;
    stillDeveloping.push(
      isPulseSkill
        ? `Relaxed wrist drop and subdivision alignment on downbeats`
        : `Consistency on 1-beat entry and downbeat landing`
    );
    conclusion = isPulseSkill
      ? `We practice steady quarter-note reps locked with the metronome click to establish effortless internal time.`
      : `We practice targeted phrase cycles to build rock-solid muscle memory.`;
  }

  // What Happens After This Ladder
  const whatHappensAfterThis = isPulseSkill
    ? {
        current: `${currentTarget} @ ${suggestedBpm} BPM`,
        nextIfStable: `Eighth-note subdivision counting alignment & relaxed pulse pocket`,
        later: `Quarter-note pulse stability across song form transitions and dynamic changes`,
        eventually: `Rock-solid internal clock supporting any groove, fill, or genre context`,
      }
    : {
        current: `${currentTarget} @ ${suggestedBpm} BPM`,
        nextIfStable:
          decision === 'PREPARE_PREREQUISITE'
            ? `Resume ${targetSkill.name} 1-beat fill placement in ${supportingContext.contextName}`
            : decision === 'ISOLATE'
            ? `Place 1-beat phrase into basic 4/4 groove`
            : decision === 'VARY'
            ? `Orchestrate phrase across toms & cymbals`
            : `Step down tutor audio cues (Reduced Guidance Mode)`,
        later: `2-beat phrase extension & dynamic tom voicing`,
        eventually: `Spontaneous musical fills in live worship & song environments`,
      };

  // Learning Stack Object
  const learningStack: LearningStackState = {
    mainGoal: activeGoal,
    mainSkillId: targetSkill.id,
    mainSkillName: targetSkill.name,
    currentTarget,
    temporaryPrerequisite,
    reason: recReason,
    returnTarget: {
      skillId: targetSkill.id,
      skillName: targetSkill.name,
      step: 'Beat 4 Entry Placement',
      exerciseType: 'musical_placement',
      phraseLength: '1 beat',
    },
    completionCondition,
    status: stackStatus,
    lastUpdated: new Date().toISOString(),
  };

  return {
    targetSkillId: targetSkill.id,
    targetSkillName: targetSkill.name,
    activeGoal,
    currentTarget,
    supportingContainer: {
      name: supportingContext.contextName,
      anchorGroove: supportingContext.anchorGroove,
      status: supportingContext.state === 'KNOWN_STABLE' ? 'Ready' : 'Needs Quick Preparation',
      roleExplanation: supportingContext.reason,
      isTemporaryPrerequisite: temporaryPrerequisite !== null,
    },
    prerequisites: {
      hard: hardPrereqs,
      supporting: supportingPrereqs,
      enrichment: enrichmentPrereqs,
      missing: missingPrereqs,
      blockingMissing: blockingMissingPrereqs,
    },
    eightDimensions: {
      technique: readiness.technicalControl,
      timeAndPulse: readiness.timeAndPulse,
      musicalContainer: supportingContext.state,
      placement: readiness.placement,
      landing: readiness.landing,
      recovery: readiness.recovery,
      independence: readiness.independence,
      tempoReadiness: readiness.tempoReadiness || 'DEVELOPING',
    },
    primaryLimiter: readiness.currentLimiter,
    limiterExplanation: readiness.limiterDescription,
    adaptiveRecommendation: {
      decision,
      decisionLabel,
      title,
      reason: recReason,
      buttonLabel,
      actionType,
      suggestedBpm,
      assistanceMode,
      phraseLength,
      entryLocation,
    },
    whyThisNext: {
      targetName: targetSkill.name,
      alreadyHave,
      stillDeveloping,
      conclusion,
    },
    whatHappensAfterThis,
    evidence,
    contextTempos: readiness.contextTempos,
    learningStack,
  };
}

// ============================================================================
// 6. BACKWARD-COMPATIBLE CURRICULUM DECISION BRIDGE
// ============================================================================

export function evaluateCurriculumDecision(
  targetSkill: GranularSkill,
  arg1?: GranularSkill[] | LearnerProfile,
  arg2?: LearnerProfile | GranularSkill[],
  equipment?: EquipmentOption,
  practiceContext?: PracticeContextOption
): CurriculumDecision {
  let allSkills: GranularSkill[] = [];
  let profile: LearnerProfile | undefined = undefined;

  if (Array.isArray(arg1)) {
    allSkills = arg1;
    if (arg2 && !Array.isArray(arg2)) {
      profile = arg2;
    }
  } else if (arg1 && typeof arg1 === 'object') {
    profile = arg1 as LearnerProfile;
    if (Array.isArray(arg2)) {
      allSkills = arg2;
    }
  }

  const analysis = evaluateAdaptivePathAnalysis(
    targetSkill,
    allSkills,
    profile,
    equipment,
    practiceContext
  );

  const memory = getSkillEvidenceMemory(targetSkill.id);
  const placementMem = derivePlacementEvidenceMemory(targetSkill.id);
  const attempts = getAllAttemptEvidenceForSkill(targetSkill.id);
  const readiness = evaluateMultiDimensionalReadiness(
    targetSkill,
    profile,
    memory,
    placementMem,
    attempts,
    [...analysis.prerequisites.hard, ...analysis.prerequisites.supporting, ...analysis.prerequisites.enrichment]
  );
  const supportingContext = evaluateSupportingContextDecision(targetSkill, profile, allSkills);

  let pathway: CurriculumPathway = 'REINFORCE';
  if (analysis.adaptiveRecommendation.decision === 'ISOLATE' || analysis.adaptiveRecommendation.decision === 'PREPARE_PREREQUISITE') {
    pathway = 'REMEDIATE';
  } else if (analysis.adaptiveRecommendation.decision === 'REDUCE_ASSISTANCE' || analysis.adaptiveRecommendation.decision === 'TEST_INDEPENDENCE') {
    pathway = 'PROGRESS';
  } else if (analysis.adaptiveRecommendation.decision === 'VARY') {
    pathway = 'VARY';
  } else if (analysis.adaptiveRecommendation.decision === 'PROGRESS') {
    pathway = 'CHECKPOINT';
  } else {
    pathway = 'REINFORCE';
  }

  const difficultyChange: DifficultyDimensionChange = {
    primaryDimension: analysis.adaptiveRecommendation.decision === 'REDUCE_ASSISTANCE'
      ? 'ASSISTANCE'
      : analysis.adaptiveRecommendation.decision === 'VARY'
      ? 'PHRASE_LENGTH'
      : analysis.adaptiveRecommendation.decision === 'ISOLATE'
      ? 'ORCHESTRATION'
      : 'NONE',
    previousState: 'Standard Guided Practice',
    newState: analysis.adaptiveRecommendation.title,
    explanation: analysis.adaptiveRecommendation.reason,
  };

  const decisionObj: CurriculumDecision = {
    id: `dec-${targetSkill.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    targetSkillId: targetSkill.id,
    targetSkillName: targetSkill.name,
    decision: pathway,
    reason: analysis.adaptiveRecommendation.reason,
    currentCapability: analysis.whyThisNext.alreadyHave.join(' • '),
    currentLimiter: analysis.primaryLimiter,
    evidenceSummary: analysis.evidence.systemObserved.summary,
    nextTarget: analysis.currentTarget,
    supportingContext,
    difficultyChange,
    readiness,
    unresolvedDependencies: analysis.prerequisites.missing,
    adaptiveAnalysis: analysis,
    evidenceBreakdown: analysis.evidence,
    learningStack: analysis.learningStack,
    recommendedAction: {
      label: analysis.adaptiveRecommendation.buttonLabel,
      actionType: analysis.adaptiveRecommendation.actionType === 'PREPARE_PREREQUISITE' || analysis.adaptiveRecommendation.actionType === 'ISOLATE_MECHANICS'
        ? 'SIMPLIFY_FOUNDATION'
        : analysis.adaptiveRecommendation.actionType === 'REDUCE_ASSISTANCE'
        ? 'REDUCE_ASSISTANCE'
        : analysis.adaptiveRecommendation.actionType === 'VARY_PLACEMENT'
        ? 'CHANGE_PLACEMENT'
        : 'PRACTICE_TARGET',
      exerciseType: analysis.adaptiveRecommendation.actionType === 'PREPARE_PREREQUISITE' ? 'mini_lesson' : 'musical_placement',
      targetSkillId: targetSkill.id,
      targetSkillName: targetSkill.name,
      suggestedBpm: analysis.adaptiveRecommendation.suggestedBpm,
      phraseLength: analysis.adaptiveRecommendation.phraseLength,
      entryLocation: analysis.adaptiveRecommendation.entryLocation,
      assistanceMode: analysis.adaptiveRecommendation.assistanceMode === 'MINIMAL' || analysis.adaptiveRecommendation.assistanceMode === 'REDUCED' ? 'reduced' : analysis.adaptiveRecommendation.assistanceMode === 'NONE' ? 'none' : 'full',
      anchorGroove: supportingContext.anchorGroove,
    },
  };

  return decisionObj;
}

// ============================================================================
// 7. PERSISTENCE & HISTORY
// ============================================================================

export function saveCurriculumDecisionRecord(decision: CurriculumDecision): void {
  try {
    const raw = localStorage.getItem(CURRICULUM_DECISIONS_KEY);
    const list: CurriculumDecisionRecord[] = raw ? JSON.parse(raw) : [];

    const record: CurriculumDecisionRecord = {
      id: decision.id,
      timestamp: decision.timestamp,
      targetSkillId: decision.targetSkillId,
      targetSkillName: decision.targetSkillName,
      decision: decision.decision,
      currentLimiter: decision.currentLimiter,
      reason: decision.reason,
      nextTarget: decision.nextTarget,
      difficultyDimensionChanged: decision.difficultyChange.primaryDimension,
      supportingContextName: decision.supportingContext.contextName,
      readinessSnapshot: decision.readiness,
    };

    list.unshift(record);
    localStorage.setItem(CURRICULUM_DECISIONS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save curriculum decision record:', e);
  }
}

export function getLatestCurriculumDecisionForSkill(
  skillId: string
): CurriculumDecisionRecord | null {
  try {
    const raw = localStorage.getItem(CURRICULUM_DECISIONS_KEY);
    if (!raw) return null;
    const list: CurriculumDecisionRecord[] = JSON.parse(raw);
    return list.find((r) => r.targetSkillId === skillId) || null;
  } catch (e) {
    console.error('Failed to get curriculum decision record:', e);
    return null;
  }
}

export function getAllCurriculumDecisionRecords(): CurriculumDecisionRecord[] {
  try {
    const raw = localStorage.getItem(CURRICULUM_DECISIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to get curriculum decision records:', e);
    return [];
  }
}
