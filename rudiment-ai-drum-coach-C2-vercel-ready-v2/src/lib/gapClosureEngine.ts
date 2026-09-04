import {
  GranularSkill,
  PracticeExercise,
  PracticeSession,
  EquipmentOption,
  CheckpointAttempt,
  CheckpointCriterionResult,
  GapClosurePlan,
  GapClosureCriterion,
  SelfCheckFeeling,
} from '../types';
import { getSkillEvidenceMemory, getAllAttemptEvidenceForSkill } from './evidenceEngine';

const CHECKPOINT_ATTEMPTS_STORAGE_KEY = 'RUDIMENT_CHECKPOINT_ATTEMPTS_V1';
const GAP_CLOSURE_PLANS_STORAGE_KEY = 'RUDIMENT_GAP_CLOSURE_PLANS_V1';

// ==========================================
// 1. CHECKPOINT ATTEMPT PERSISTENCE
// ==========================================

export function loadStoredCheckpointAttempts(): CheckpointAttempt[] {
  try {
    const raw = localStorage.getItem(CHECKPOINT_ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load checkpoint attempts from localStorage:', err);
    return [];
  }
}

export function persistCheckpointAttempts(attempts: CheckpointAttempt[]): void {
  try {
    localStorage.setItem(CHECKPOINT_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  } catch (err) {
    console.error('Failed to persist checkpoint attempts to localStorage:', err);
  }
}

export function recordCheckpointAttempt(attempt: CheckpointAttempt): void {
  const attempts = loadStoredCheckpointAttempts();
  const existingIdx = attempts.findIndex((a) => a.id === attempt.id);
  if (existingIdx >= 0) {
    attempts[existingIdx] = attempt;
  } else {
    attempts.push(attempt);
  }
  persistCheckpointAttempts(attempts);
}

export function getCheckpointAttemptsForSkill(skillId: string): CheckpointAttempt[] {
  const attempts = loadStoredCheckpointAttempts();
  return attempts
    .filter((a) => a.skillId === skillId)
    .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
}

export function getPassedCheckpointsForSkill(skillId: string): string[] {
  const attempts = getCheckpointAttemptsForSkill(skillId);
  return Array.from(
    new Set(
      attempts
        .filter((a) => a.result === 'passed')
        .map((a) => a.checkpointLevel)
    )
  );
}

export function isCheckpointPassed(skillId: string, level: string): boolean {
  return getPassedCheckpointsForSkill(skillId).includes(level);
}

export function getLatestCheckpointAttemptForSkill(skillId: string): CheckpointAttempt | null {
  const attempts = getCheckpointAttemptsForSkill(skillId);
  return attempts.length > 0 ? attempts[0] : null;
}

// ==========================================
// 2. GAP CLOSURE PLAN PERSISTENCE
// ==========================================

export function loadStoredGapClosurePlans(): GapClosurePlan[] {
  try {
    const raw = localStorage.getItem(GAP_CLOSURE_PLANS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load gap closure plans:', err);
    return [];
  }
}

export function persistGapClosurePlans(plans: GapClosurePlan[]): void {
  try {
    localStorage.setItem(GAP_CLOSURE_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch (err) {
    console.error('Failed to persist gap closure plans:', err);
  }
}

export function saveGapClosurePlan(plan: GapClosurePlan): void {
  const plans = loadStoredGapClosurePlans();
  const existingIdx = plans.findIndex((p) => p.id === plan.id || (p.skillId === plan.skillId && p.status === 'active'));
  if (existingIdx >= 0) {
    // If different ID but same skill is active, replace with new active plan
    plans[existingIdx] = plan;
  } else {
    plans.push(plan);
  }
  persistGapClosurePlans(plans);
}

export function getActiveGapClosurePlan(skillId: string): GapClosurePlan | null {
  const plans = loadStoredGapClosurePlans();
  const plan = plans.find((p) => p.skillId === skillId && p.status === 'active');
  if (!plan) return null;

  // Authoritative normalization: derive readiness and criterion states dynamically from evidence
  const reconciled = reconcileGapClosurePlan(plan);
  
  // Persist reconciled plan defensively if state or criterion status changed
  if (
    reconciled.isReadyForReassessment !== plan.isReadyForReassessment ||
    JSON.stringify(reconciled.failedCriteria) !== JSON.stringify(plan.failedCriteria)
  ) {
    const existingIdx = plans.findIndex((p) => p.id === plan.id);
    if (existingIdx >= 0) {
      plans[existingIdx] = reconciled;
      persistGapClosurePlans(plans);
    }
  }

  return reconciled;
}

export function getAllActiveGapClosurePlans(): GapClosurePlan[] {
  const plans = loadStoredGapClosurePlans();
  return plans
    .filter((p) => p.status === 'active')
    .map((plan) => reconcileGapClosurePlan(plan));
}

export function completeOrDismissGapClosurePlan(planId: string): void {
  const plans = loadStoredGapClosurePlans();
  const updated = plans.map((p) => (p.id === planId ? { ...p, status: 'completed' as const } : p));
  persistGapClosurePlans(updated);
}

// ==========================================
// 2. CRITERION-AWARE PROGRESS & READINESS (CANONICAL GATING & RECONCILIATION)
// ==========================================

export type CriterionRemediationState = 'pending' | 'in_progress' | 'remediated';

export interface RemediationCriterionStatus {
  criterionId: string;
  criterionTitle: string;
  focusSummary: string;
  description: string;
  assignedDrillIds: string[];
  completedDrillIds: string[];
  qualifyingCompletedDrillIds: string[];
  totalDrills: number; // requiredTargetedDrills
  completedDrills: number;
  qualifyingDrills: number; // qualifyingCompletedCount
  isRemediated: boolean;
  status: CriterionRemediationState;
  lastAssessment?: SelfCheckFeeling;
}

export interface PlanRemediationBreakdown {
  totalRemediationDrills: number;
  completedRemediationDrills: number;
  totalCriteriaCount: number;
  remediatedCriteriaCount: number;
  isAllCriteriaRemediated: boolean;
  criteriaStatuses: RemediationCriterionStatus[];
}

/**
 * CANONICAL RESOLVER: Derives the authoritative remediation status of a single criterion.
 *
 * Requirements (BU2F-R2A-FIX):
 * - Deterministic, evidence-based derivation
 * - Monotonic REMEDIATED state: once marked remediated, it must not downgrade to IN_PROGRESS
 * - Reconciles legacy data (e.g. 3/3 drills completed => REMEDIATED)
 * - Required Evidence vs Completed Evidence gate:
 *     IF completedEvidence <= 0 -> PENDING
 *     ELSE IF completedEvidence < requiredEvidence -> IN_PROGRESS
 *     ELSE IF completedEvidence >= requiredEvidence -> REMEDIATED
 */
export function resolveCriterionRemediationState(
  crit: GapClosureCriterion,
  plan: GapClosurePlan | null
): RemediationCriterionStatus {
  // 1. Gather all assigned drill IDs
  const assignedFromCrit = crit.assignedDrillIds || [];
  const matchedFromPlan = plan?.exercises
    ? (plan.exercises || [])
        .filter(
          (e) =>
            e.countsTowardRemediation !== false &&
            e.exerciseType !== 'warmup' &&
            e.exerciseType !== 'cooldown' &&
            (assignedFromCrit.includes(e.id) ||
              e.targetCriterionId === crit.criterionId ||
              e.targetCriterionIds?.includes(crit.criterionId) ||
              e.gapClosureTargetCriterion === crit.criterionTitle ||
              e.remediationDrillId === crit.criterionId)
        )
        .map((e) => e.id)
    : [];

  const assignedDrillIds = Array.from(new Set([...assignedFromCrit, ...matchedFromPlan]));
  const requiredEvidence = Math.max(1, assignedDrillIds.length);

  // 2. Gather completed and qualifying drill IDs from all available sources
  const completedSet = new Set<string>();
  (crit.completedDrillIds || []).forEach((id) => completedSet.add(id));
  (plan?.completedExerciseIds || []).forEach((id) => {
    if (assignedDrillIds.length === 0 || assignedDrillIds.includes(id)) {
      completedSet.add(id);
    }
  });

  const qualifyingSet = new Set<string>();
  (crit.qualifyingCompletedDrillIds || []).forEach((id) => qualifyingSet.add(id));
  // If no separate qualifying list exists, completed drills count as qualifying evidence
  (crit.completedDrillIds || []).forEach((id) => {
    if (!crit.qualifyingCompletedDrillIds || crit.qualifyingCompletedDrillIds.length === 0) {
      qualifyingSet.add(id);
    }
  });
  (plan?.completedExerciseIds || []).forEach((id) => {
    if (assignedDrillIds.length === 0 || assignedDrillIds.includes(id)) {
      qualifyingSet.add(id);
    }
  });

  const completedDrillIds = Array.from(completedSet);
  const qualifyingCompletedDrillIds = Array.from(qualifyingSet);

  let qualifyingDrills = qualifyingCompletedDrillIds.length;
  let completedDrills = Math.max(qualifyingDrills, completedDrillIds.length);

  // 3. Monotonic & Evidence-based Evaluation
  const isAlreadyRemediated = crit.status === 'remediated';
  const hasSufficientEvidence = qualifyingDrills >= requiredEvidence || completedDrills >= requiredEvidence;
  const isRemediated = isAlreadyRemediated || hasSufficientEvidence;

  let status: CriterionRemediationState;
  if (isRemediated) {
    status = 'remediated';
    // Ensure display counts are at least the required target when remediated
    qualifyingDrills = Math.max(qualifyingDrills, requiredEvidence);
    completedDrills = Math.max(completedDrills, requiredEvidence);
  } else if (qualifyingDrills > 0 || completedDrills > 0 || crit.status === 'in_progress') {
    status = 'in_progress';
  } else {
    status = 'pending';
  }

  return {
    criterionId: crit.criterionId,
    criterionTitle: crit.criterionTitle,
    focusSummary: crit.focusSummary || getFocusSummaryForCriterion(crit.criterionTitle),
    description: crit.description,
    assignedDrillIds,
    completedDrillIds,
    qualifyingCompletedDrillIds,
    totalDrills: requiredEvidence,
    completedDrills,
    qualifyingDrills,
    isRemediated,
    status,
    lastAssessment: crit.lastAttemptAssessment,
  };
}

/**
 * Backwards-compatible alias for resolveCriterionRemediationState
 */
export const getCriterionRemediationState = resolveCriterionRemediationState;

/**
 * CANONICAL AGGREGATE RESOLVER:
 * Computes criterion-aware remediation breakdown and readiness for a GapClosurePlan.
 */
export function resolveGapClosureState(plan: GapClosurePlan | null): PlanRemediationBreakdown {
  if (!plan) {
    return {
      totalRemediationDrills: 0,
      completedRemediationDrills: 0,
      totalCriteriaCount: 0,
      remediatedCriteriaCount: 0,
      isAllCriteriaRemediated: false,
      criteriaStatuses: [],
    };
  }

  const totalCriteriaCount = plan.failedCriteria.length;
  const criteriaStatuses: RemediationCriterionStatus[] = plan.failedCriteria.map((crit) =>
    resolveCriterionRemediationState(crit, plan)
  );

  const remediatedCriteriaCount = criteriaStatuses.filter((c) => c.isRemediated).length;

  // OVERALL COMPLETION GATE:
  // Ready for reassessment ONLY when every failed criterion is marked REMEDIATED
  const isAllCriteriaRemediated =
    totalCriteriaCount > 0 && remediatedCriteriaCount === totalCriteriaCount;

  // Total cumulative required targeted evidence units (e.g. 3 + 2 = 5)
  const totalRemediationDrills = criteriaStatuses.reduce((acc, c) => acc + c.totalDrills, 0);

  // Total cumulative qualifying evidence units completed
  const completedRemediationDrills = isAllCriteriaRemediated
    ? totalRemediationDrills
    : criteriaStatuses.reduce((acc, c) => acc + Math.min(c.totalDrills, c.qualifyingDrills), 0);

  return {
    totalRemediationDrills,
    completedRemediationDrills,
    totalCriteriaCount,
    remediatedCriteriaCount,
    isAllCriteriaRemediated,
    criteriaStatuses,
  };
}

/**
 * Backwards-compatible alias for resolveGapClosureState
 */
export const getPlanRemediationBreakdown = resolveGapClosureState;

/**
 * Reconciles a plan's internal criteria array, readiness flag, and summary text.
 */
export function reconcileGapClosurePlan(plan: GapClosurePlan): GapClosurePlan {
  const breakdown = resolveGapClosureState(plan);

  const updatedCriteria: GapClosureCriterion[] = plan.failedCriteria.map((crit) => {
    const state = resolveCriterionRemediationState(crit, plan);
    return {
      ...crit,
      status: state.status,
      assignedDrillIds: state.assignedDrillIds,
      completedDrillIds: state.completedDrillIds,
      qualifyingCompletedDrillIds: state.qualifyingCompletedDrillIds,
      lastAttemptAssessment: state.lastAssessment || crit.lastAttemptAssessment,
    };
  });

  return {
    ...plan,
    failedCriteria: updatedCriteria,
    isReadyForReassessment: breakdown.isAllCriteriaRemediated,
    remediationSummary: `${breakdown.remediatedCriteriaCount} of ${breakdown.totalCriteriaCount} gaps addressed (${breakdown.completedRemediationDrills} of ${breakdown.totalRemediationDrills} targeted evidence units completed)`,
  };
}

/**
 * Records completion of a single exercise towards an active Gap Closure plan.
 * Only qualifying remediation drills count toward progress (warmup/cooldown are filtered).
 */
export function recordRemediationProgress(
  skillId: string,
  exerciseId: string,
  assessment?: SelfCheckFeeling
): GapClosurePlan | null {
  const plans = loadStoredGapClosurePlans();
  const rawPlan = plans.find((p) => p.skillId === skillId && p.status === 'active');
  if (!rawPlan) return null;

  // If exerciseId is warmup or cooldown, do not record as remediation progress
  if (exerciseId.endsWith('-warmup') || exerciseId.endsWith('-cooldown')) {
    return rawPlan;
  }

  // Find exercise in plan to confirm it counts toward remediation
  const matchedEx = rawPlan.exercises.find(
    (e) => e.id === exerciseId || e.remediationDrillId === exerciseId
  );
  if (matchedEx && matchedEx.countsTowardRemediation === false) {
    return rawPlan;
  }

  // Determine if self-check assessment qualifies as successful evidence:
  // - CLEAN_AND_RELAXED / clean_relaxed qualifies as successful remediation evidence.
  // - MOSTLY_CLEAN, INCONSISTENT, TOO_DIFFICULT count as completed for session history but do NOT count as qualifying evidence.
  const isQualifyingEvidence =
    assessment === 'CLEAN_AND_RELAXED' ||
    (assessment as string) === 'clean_relaxed' ||
    assessment === undefined;

  // If qualifying, add to completedExerciseIds if not already present
  let completedIds = rawPlan.completedExerciseIds || [];
  if (isQualifyingEvidence) {
    if (!completedIds.includes(exerciseId)) {
      completedIds = [...completedIds, exerciseId];
    }
  }

  // Update failedCriteria array with completed drill IDs and qualifying IDs
  const updatedCriteria = rawPlan.failedCriteria.map((crit) => {
    const isAssigned =
      crit.assignedDrillIds?.includes(exerciseId) ||
      matchedEx?.targetCriterionId === crit.criterionId ||
      matchedEx?.targetCriterionIds?.includes(crit.criterionId) ||
      matchedEx?.gapClosureTargetCriterion === crit.criterionTitle;

    const assignedIds = crit.assignedDrillIds || [];
    const prevCompleted = crit.completedDrillIds || [];
    const newCompleted = isAssigned && !prevCompleted.includes(exerciseId)
      ? [...prevCompleted, exerciseId]
      : prevCompleted;

    const prevQualifying = crit.qualifyingCompletedDrillIds || (isQualifyingEvidence ? prevCompleted : []);
    const newQualifying = isAssigned && isQualifyingEvidence && !prevQualifying.includes(exerciseId)
      ? [...prevQualifying, exerciseId]
      : prevQualifying;

    return {
      ...crit,
      assignedDrillIds: assignedIds,
      completedDrillIds: newCompleted,
      qualifyingCompletedDrillIds: newQualifying,
      lastAttemptAssessment: isAssigned ? assessment || crit.lastAttemptAssessment : crit.lastAttemptAssessment,
    };
  });

  const tempPlan: GapClosurePlan = {
    ...rawPlan,
    completedExerciseIds: completedIds,
    failedCriteria: updatedCriteria,
  };

  const finalReconciled = reconcileGapClosurePlan(tempPlan);
  saveGapClosurePlan(finalReconciled);
  return finalReconciled;
}

/**
 * Validates whether every failed criterion has completed its required remediation drill.
 */
export function isPlanReadyForReassessment(plan: GapClosurePlan | null): boolean {
  if (!plan || plan.status !== 'active') return false;
  const breakdown = getPlanRemediationBreakdown(plan);
  return breakdown.isAllCriteriaRemediated;
}

// ==========================================
// 3. REMEDIATION EXERCISE MAPPING HELPERS
// ==========================================

function getStickingForSkill(skillId: string): string {
  if (skillId.includes('single-stroke')) return 'R L R L R L R L';
  if (skillId.includes('double-stroke')) return 'R R L L R R L L';
  if (skillId.includes('single-paradiddle')) return 'R L R R L R L L';
  if (skillId.includes('double-paradiddle')) return 'R L R L R R L R L R L L';
  if (skillId.includes('paradiddle-diddle')) return 'R L R R L L';
  if (skillId.includes('flam')) return 'lR rL lR rL';
  if (skillId.includes('drag')) return 'llR rrL llR rrL';
  if (skillId.includes('six-stroke')) return 'R L L R R L';
  if (skillId.includes('rlk')) return 'R L K   R L K';
  if (skillId.includes('rkl')) return 'R K L   R K L';
  if (skillId.includes('onedrop')) return 'Hat (1 & 2 &) | Kick+Rimshot on 3';
  if (skillId.includes('68')) return 'R L R L R L (Backbeat on 4)';
  if (skillId.includes('kick')) return 'R L R L with Kick Doubles';
  return 'R L R L R L R L';
}

function getCountingForSkill(skillId: string): string {
  if (skillId.includes('rlk') || skillId.includes('rkl') || skillId.includes('68')) {
    return '1-trip-let  2-trip-let  3-trip-let  4-trip-let';
  }
  if (skillId.includes('16th') || skillId.includes('paradiddle') || skillId.includes('six-stroke')) {
    return '1 e & a  2 e & a  3 e & a  4 e & a';
  }
  return '1 & 2 & 3 & 4 &';
}

function getSubdivisionForSkill(skillId: string): string {
  if (skillId.includes('rlk') || skillId.includes('rkl') || skillId.includes('68')) {
    return 'Triplets';
  }
  if (skillId.includes('16th') || skillId.includes('paradiddle') || skillId.includes('six-stroke')) {
    return '16th Notes';
  }
  return '8th Notes';
}

// Generate remediation focus summary for confirmation modal
function getFocusSummaryForCriterion(criterionTitle: string): string {
  const lower = criterionTitle.toLowerCase();
  if (lower.includes('stream') || lower.includes('60-second') || lower.includes('minute') || lower.includes('endurance')) {
    return 'Build continuous execution progressively from short intervals to full stream.';
  }
  if (lower.includes('timing') || lower.includes('dynamic') || lower.includes('balance') || lower.includes('articulation')) {
    return 'Eliminate volume disparities between hands and lock micro-spacing to the click.';
  }
  if (lower.includes('tension') || lower.includes('fatigue') || lower.includes('relaxed') || lower.includes('grip')) {
    return 'Build relaxed endurance with loose fulcrum and low shoulder tension.';
  }
  if (lower.includes('stoppage') || lower.includes('recovery') || lower.includes('landing') || lower.includes('downbeat')) {
    return 'Master clean downbeat landing and instant rhythmic re-entry.';
  }
  if (lower.includes('phrase') || lower.includes('fill') || lower.includes('insertion')) {
    return 'Lock fill duration and clean transitions back to groove pocket.';
  }
  if (lower.includes('groove') || lower.includes('pocket') || lower.includes('return')) {
    return 'Stabilize post-fill pocket on Beat 2 with zero stumbling.';
  }
  return 'Targeted technique remediation to establish repeatable consistency.';
}

export interface GenerateGapPlanInput {
  skill: GranularSkill;
  checkpointAttempt: CheckpointAttempt;
  failedCriteria: CheckpointCriterionResult[];
  workingBpm: number;
  equipment?: EquipmentOption;
}

export function generateGapClosurePlan(input: GenerateGapPlanInput): GapClosurePlan {
  const { skill, checkpointAttempt, failedCriteria, workingBpm, equipment = 'Practice Pad' } = input;

  const planId = `gcp-${skill.id}-${checkpointAttempt.checkpointLevel}-${Date.now()}`;
  const baseSticking = getStickingForSkill(skill.id);
  const counting = getCountingForSkill(skill.id);
  const subdivision = getSubdivisionForSkill(skill.id);
  const timeSignature = skill.relevantTimeSignatures?.[0] || '4/4';
  const tempo = workingBpm || skill.currentComfortTempo || 70;

  const exercises: PracticeExercise[] = [];
  let exCounter = 1;

  // Track mapping of criterionId -> assignedDrillIds
  const criterionToDrillIdsMap: Record<string, string[]> = {};

  // Iterate over each failed criterion to generate targeted remediation drills
  failedCriteria.forEach((crit) => {
    const title = crit.criterionName;
    const lower = title.toLowerCase();
    const critDrillIds: string[] = [];

    // Helper to register drill
    const registerDrill = (ex: Omit<PracticeExercise, 'id' | 'targetCriterionId' | 'targetCriterionIds' | 'countsTowardRemediation' | 'remediationDrillId'>) => {
      const drillId = `${planId}-ex-${exCounter++}`;
      critDrillIds.push(drillId);
      exercises.push({
        ...ex,
        id: drillId,
        targetCriterionId: crit.criterionId,
        targetCriterionIds: [crit.criterionId],
        countsTowardRemediation: true,
        remediationDrillId: drillId,
      });
    };

    // ==========================================
    // 1. 60-Second Steady Stream / Endurance Gaps
    // ==========================================
    if (lower.includes('stream') || lower.includes('60-second') || lower.includes('steady stream')) {
      // Exercise A: 30-second clean stream at reduced BPM
      registerDrill({
        title: `${skill.name} — 30-Second Progressive Stream`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Build stamina and stable subdivision over a short, manageable interval without rushing.',
        instructions: `Play continuous clean repetitions of ${skill.name} for 30 seconds at a conservative tempo (${Math.max(40, tempo - 10)} BPM). Focus strictly on rhythmic constancy and breathing.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo: Math.max(40, tempo - 10),
        isSuggestedStartingTempo: false,
        durationSeconds: 120, // 2 mins (multiple 30s passes)
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Easy',
        progressionStage: 'ENDURANCE',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Your last ${checkpointAttempt.checkpointLevel} checkpoint showed endurance fatigue during continuous stream execution.`,
        gapClosureSuccessTarget: 'No rushing, no dragging, no breakdown, and zero tension for the full 30-second interval.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });

      // Exercise B: 45-second stream at working BPM
      registerDrill({
        title: `${skill.name} — 45-Second Sustained Stream`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Extend unbroken execution length while maintaining consistent subdivision.',
        instructions: `Maintain steady unbroken ${skill.name} stream for 45 continuous seconds at ${tempo} BPM. Relax wrists between bars.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 150,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'ENDURANCE',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Progressive endurance extension leading to 60-second checkpoint reliability.`,
        gapClosureSuccessTarget: 'Solid timing across all 45 seconds with consistent stroke heights and zero breakdown.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });

      // Exercise C: 60-second checkpoint-tempo stream
      registerDrill({
        title: `${skill.name} — 60-Second Checkpoint Simulation Stream`,
        phase: 'MAIN WORK',
        skillIds: [skill.id],
        purpose: 'Full 1-minute sustained endurance verification at target checkpoint tempo.',
        instructions: `Run the full 60-second continuous stream at ${tempo} BPM without dropping sticks or tensing shoulders.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 180,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'ENDURANCE',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Simulate the exact ${checkpointAttempt.checkpointLevel} checkpoint stream standard.`,
        gapClosureSuccessTarget: 'Complete 60 continuous seconds with steady subdivision and zero tempo drift.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });
    }

    // ==========================================
    // 2. Micro-Timing & Dynamic Balance Gaps
    // ==========================================
    else if (lower.includes('timing') || lower.includes('dynamic') || lower.includes('balance') || lower.includes('micro')) {
      // Drill A: Slow balanced repetitions
      registerDrill({
        title: `${skill.name} — Equal R/L Stroke Balance Drill`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Match left and right stroke volume and heights to eliminate hand-to-hand imbalance.',
        instructions: `Play ${skill.name} slowly at ${Math.max(40, tempo - 15)} BPM. Match right and left stick heights exactly (6 inches) with identical acoustic volume.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo: Math.max(40, tempo - 15),
        isSuggestedStartingTempo: false,
        durationSeconds: 150,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Easy',
        progressionStage: 'CONTROL',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Your last checkpoint revealed volume or micro-timing discrepancies between hands.`,
        gapClosureSuccessTarget: 'Right and left hands produce identical dynamic volume and pristine micro-spacing.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });

      // Drill B: Accent vs Inner Note Dynamic Separation
      registerDrill({
        title: `${skill.name} — Accent vs Inner Note Dynamic Separation`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Crisp articulation between primary accents and quiet inner ghost strokes.',
        instructions: `Execute ${skill.name} with deliberate dynamic contrast: primary accents at 10 inches and inner taps at 2 inches.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo: Math.max(40, tempo - 5),
        isSuggestedStartingTempo: false,
        durationSeconds: 150,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'CONTROL',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Clarify note hierarchy so inner notes do not compete with accents.`,
        gapClosureSuccessTarget: 'Clear audible separation between accented strokes and relaxed inner taps.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });
    }

    // ==========================================
    // 3. Zero Tension / Fatigue Spikes Gaps
    // ==========================================
    else if (lower.includes('tension') || lower.includes('fatigue') || lower.includes('relaxed') || lower.includes('spikes')) {
      // Drill A: Work/Rest Relaxation Cycles
      registerDrill({
        title: `${skill.name} — 2-Bar Work / 2-Bar Rest Relaxation Cycle`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Reset forearm and shoulder tension between phrase cycles to train loose muscle memory.',
        instructions: `Play 2 bars of ${skill.name} at ${tempo} BPM, then rest 2 bars while dropping shoulders and shaking out hands. Repeat for 3 minutes.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 180,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Easy',
        progressionStage: 'FOUNDATION',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Your last checkpoint showed tension or fatigue building up in forearms/shoulders.`,
        gapClosureSuccessTarget: 'Grip pressure stays 4/10 or lighter, breathing remains calm, and shoulders stay completely dropped.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });

      // Drill B: Grip & Rebound Awareness Drill
      registerDrill({
        title: `${skill.name} — Loose Fulcrum Rebound Flow`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Let the drumstick bounce freely rather than gripping tight or muscling the stroke.',
        instructions: `Loosen the back three fingers and allow natural rebound to do 80% of the work during ${skill.name}.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo: Math.max(40, tempo - 5),
        isSuggestedStartingTempo: false,
        durationSeconds: 150,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'CONTROL',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Re-establish natural rebound mechanics to eliminate fatigue spikes.`,
        gapClosureSuccessTarget: 'Effortless rebound flow with zero stiffness in forearms or wrists.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });
    }

    // ==========================================
    // 4. Clean Stoppage & Recovery Gaps
    // ==========================================
    else if (lower.includes('stoppage') || lower.includes('recovery') || lower.includes('downbeat') || lower.includes('stop')) {
      // Drill A: Stop on Downbeat Drill
      registerDrill({
        title: `${skill.name} — Stop-on-Downbeat Precision Drill`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Train decisive, sudden cessation exactly on Beat 1 without trailing or ghosting.',
        instructions: `Play continuous ${skill.name}, and on cue at Beat 1 of bar 4, stop sticks dead on the head. Freeze and verify stick height.`,
        sticking: `${baseSticking} ... STOP on [1]`,
        counting,
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 150,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'CONTROL',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Your last checkpoint showed stumbling or trailing strokes when stopping on the downbeat.`,
        gapClosureSuccessTarget: 'Decisive instant stop on Beat 1 with zero extra bounces or hesitations.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });

      // Drill B: 1-Bar Pause & Immediate Re-Entry
      registerDrill({
        title: `${skill.name} — 1-Bar Pause & Re-Entry Timing Drill`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: 'Resume playing instantly on Beat 1 with exact tempo lock after a full bar of rest.',
        instructions: `Play 1 bar of ${skill.name}, rest 1 full bar (silent metronome tracking), then re-enter on Beat 1 with 100% micro-timing accuracy.`,
        sticking: baseSticking,
        counting: '1 2 3 4 | [REST 1 2 3 4] | 1 2 3 4',
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 180,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'APPLICATION',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Ensure you can start on demand without searching for the pulse.`,
        gapClosureSuccessTarget: 'Re-entry stroke lands dead-center on Beat 1 with immediate velocity synchronization.',
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });
    }

    // ==========================================
    // 5. Generic / Extended Fallback for other criteria
    // ==========================================
    else {
      registerDrill({
        title: `${skill.name} — ${crit.criterionName} Remediation`,
        phase: 'DEVELOPMENT',
        skillIds: [skill.id],
        purpose: `Remediate ${crit.criterionName.toLowerCase()} through focused deliberate repetitions.`,
        instructions: `Focus specifically on: ${crit.description || crit.criterionName}. Play steadily at ${tempo} BPM.`,
        sticking: baseSticking,
        counting,
        timeSignature,
        subdivision,
        tempo,
        isSuggestedStartingTempo: false,
        durationSeconds: 180,
        exerciseType: 'technique',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
        progressionStage: 'CONTROL',
        isGapClosure: true,
        gapClosureTargetCriterion: crit.criterionName,
        gapClosureReason: `Targeted remediation for ${crit.criterionName}.`,
        gapClosureSuccessTarget: `Demonstrate clean, repeatable execution meeting the ${crit.criterionName} standard.`,
        checkpointLevel: checkpointAttempt.checkpointLevel,
      });
    }

    criterionToDrillIdsMap[crit.criterionId] = critDrillIds;
  });

  const mappedFailedCriteria: GapClosureCriterion[] = failedCriteria.map((c) => ({
    criterionId: c.criterionId,
    criterionTitle: c.criterionName,
    description: c.description || '',
    testMethod: c.testMethod,
    focusSummary: getFocusSummaryForCriterion(c.criterionName),
    assignedDrillIds: criterionToDrillIdsMap[c.criterionId] || [],
    completedDrillIds: [],
    status: 'pending',
  }));

  const reassessmentTarget = `Complete remediation drills for all ${failedCriteria.length} criteria with clean execution to unlock ${checkpointAttempt.checkpointLevel} reassessment.`;

  return {
    id: planId,
    skillId: skill.id,
    skillName: skill.name,
    checkpointLevel: checkpointAttempt.checkpointLevel,
    createdAt: new Date().toISOString(),
    sourceCheckpointAttemptId: checkpointAttempt.id,
    status: 'active',
    failedCriteria: mappedFailedCriteria,
    exercises,
    reassessmentTarget,
    completedExerciseIds: [],
    isReadyForReassessment: false,
    remediationSummary: `0 of ${mappedFailedCriteria.length} gaps addressed (0 of ${exercises.length} drills completed)`,
  };
}

/**
 * Creates a standalone dedicated PracticeSession directly from an active GapClosurePlan.
 */
export function generateGapClosureSessionFromPlan(
  plan: GapClosurePlan,
  equipment: EquipmentOption = 'Practice Pad'
): PracticeSession {
  const sessionId = `sess-gap-${Date.now()}`;
  
  const breakdown = getPlanRemediationBreakdown(plan);
  const incompleteCriteria = breakdown.criteriaStatuses.filter((c) => !c.isRemediated);

  // Filter exercises that belong to un-remediated criteria and have not yet been completed with qualifying evidence
  let targetExercises = plan.exercises.filter((ex) => {
    // Exclude warmups / cooldowns or exercises that don't count toward remediation
    if (ex.exerciseType === 'warmup' || ex.exerciseType === 'cooldown' || ex.countsTowardRemediation === false) {
      return false;
    }
    const critStatus = breakdown.criteriaStatuses.find(
      (c) =>
        c.assignedDrillIds.includes(ex.id) ||
        ex.targetCriterionId === c.criterionId ||
        ex.targetCriterionIds?.includes(c.criterionId) ||
        ex.gapClosureTargetCriterion === c.criterionTitle
    );
    // Include if the criterion is not yet remediated and this drill has not yet satisfied qualifying completion
    const isQualifyingCompleted =
      critStatus?.qualifyingCompletedDrillIds?.includes(ex.id) ||
      (critStatus?.isRemediated === true);
    return critStatus && !critStatus.isRemediated && !isQualifyingCompleted;
  });

  // Fallback: If no specific incomplete drills remain but criteria are still incomplete (e.g. attempted with minor tension), include all assigned drills for those incomplete criteria
  if (targetExercises.length === 0 && incompleteCriteria.length > 0) {
    targetExercises = plan.exercises.filter((ex) => {
      if (ex.exerciseType === 'warmup' || ex.exerciseType === 'cooldown') return false;
      return incompleteCriteria.some(
        (c) =>
          c.assignedDrillIds.includes(ex.id) ||
          ex.targetCriterionId === c.criterionId ||
          ex.targetCriterionIds?.includes(c.criterionId) ||
          ex.gapClosureTargetCriterion === c.criterionTitle
      );
    });
  }

  // Final fallback: if all criteria are remediated or empty, use all non-warmup exercises
  if (targetExercises.length === 0) {
    targetExercises = plan.exercises.filter(
      (e) => e.exerciseType !== 'warmup' && e.exerciseType !== 'cooldown'
    );
  }

  const totalDurationSeconds =
    targetExercises.reduce((acc, ex) => acc + ex.durationSeconds, 0) + 120 + 60; // +2m warmup, +1m cooldown
  const durationMinutes = Math.max(10, Math.ceil(totalDurationSeconds / 60));

  const warmupExercise: PracticeExercise = {
    id: `${sessionId}-warmup`,
    title: 'Wrist Flow & Loose Rebound Warm-Up',
    phase: 'WARM UP',
    skillIds: [plan.skillId],
    purpose: 'Warm up muscles and loosen wrists before technical gap closure remediation.',
    instructions:
      'Play easy alternating strokes with loose grip. Drop shoulders and focus on natural stick rebound.',
    sticking: 'R L R L R L R L',
    counting: '1 & 2 & 3 & 4 &',
    timeSignature: '4/4',
    subdivision: '8th Notes',
    tempo: 70,
    durationSeconds: 120,
    exerciseType: 'warmup',
    equipmentRequired: 'Either',
    difficulty: 'Easy',
    isGapClosure: false,
    countsTowardRemediation: false,
  };

  const cooldownExercise: PracticeExercise = {
    id: `${sessionId}-cooldown`,
    title: 'Cooldown & Muscle Release',
    phase: 'COOL DOWN',
    skillIds: [plan.skillId],
    purpose: 'Release forearm tension and evaluate execution quality.',
    instructions:
      'Play light slow strokes on pad/snare. Check that your wrists are soft and shoulders are dropped.',
    sticking: 'R L R L R L R L',
    counting: '1 & 2 & 3 & 4 &',
    timeSignature: '4/4',
    subdivision: '8th Notes',
    tempo: 60,
    durationSeconds: 60,
    exerciseType: 'cooldown',
    equipmentRequired: 'Either',
    difficulty: 'Easy',
    isGapClosure: false,
    countsTowardRemediation: false,
  };

  // Preserve the exact exercise.id and targetCriterionIds from the GapClosurePlan so completed IDs match!
  const sessionExercises: PracticeExercise[] = [
    warmupExercise,
    ...targetExercises.map((ex) => {
      const matchedCriterion = plan.failedCriteria.find(
        (c) =>
          c.criterionTitle === ex.gapClosureTargetCriterion ||
          c.criterionId === ex.targetCriterionId ||
          c.assignedDrillIds?.includes(ex.id)
      );
      const targetCritId = ex.targetCriterionId || matchedCriterion?.criterionId || plan.failedCriteria[0]?.criterionId;
      return {
        ...ex,
        // Keep ex.id as canonical ID so completion is recorded against plan.completedExerciseIds
        id: ex.id,
        remediationDrillId: ex.id,
        sessionSource: 'gap-closure',
        gapClosurePlanId: plan.id,
        checkpointAttemptId: plan.sourceCheckpointAttemptId,
        checkpointLevel: plan.checkpointLevel,
        skillId: plan.skillId,
        targetCriterionId: targetCritId,
        targetCriterionIds: ex.targetCriterionIds || (targetCritId ? [targetCritId] : []),
        countsTowardRemediation: true,
        isGapClosure: true,
      };
    }),
    cooldownExercise,
  ];

  const pendingCount = incompleteCriteria.length > 0 ? incompleteCriteria.length : plan.failedCriteria.length;

  return {
    id: sessionId,
    date: new Date().toISOString().split('T')[0],
    durationMinutes,
    trackId: 'rudiments',
    equipment,
    practiceContext: 'SKILL_DEVELOPMENT',
    focusMode: 'MY_CHOICE',
    selectedSkillIds: [plan.skillId],
    skillId: plan.skillId,
    sessionSource: 'gap-closure',
    focusTopic: `${plan.skillName} — ${plan.checkpointLevel} Gap Closure (${pendingCount} gap${pendingCount === 1 ? '' : 's'} remaining)`,
    notes: `Remediation practice session targeting ${pendingCount} pending criteria from ${plan.checkpointLevel} checkpoint.`,
    rating: 5,
    exercises: sessionExercises,
    sessionStatus: 'NOT_STARTED',
    gapClosurePlanId: plan.id,
    sourceCheckpointAttemptId: plan.sourceCheckpointAttemptId,
    checkpointAttemptId: plan.sourceCheckpointAttemptId,
    checkpointLevel: plan.checkpointLevel,
    failedCriterionIds: plan.failedCriteria.map((c) => c.criterionId),
    isGapClosure: true,
  };
}

/**
 * Resolves a GapClosurePlan and constructs a valid PracticeSession.
 */
export function buildGapClosureSession(
  planIdOrSkillId: string,
  equipment: EquipmentOption = 'Practice Pad'
): { session: PracticeSession | null; plan: GapClosurePlan | null; error?: string } {
  const plans = loadStoredGapClosurePlans();
  let plan = plans.find((p) => p.id === planIdOrSkillId) || null;

  if (!plan) {
    plan = getActiveGapClosurePlan(planIdOrSkillId);
  }

  if (!plan) {
    console.error('[GapClosureLauncher] Plan could not be resolved for:', planIdOrSkillId);
    return {
      session: null,
      plan: null,
      error: `Active Gap Closure plan could not be found for "${planIdOrSkillId}".`,
    };
  }

  if (!plan.exercises || plan.exercises.length === 0) {
    console.error('[GapClosureLauncher] Plan has no remediation exercises:', plan);
    return {
      session: null,
      plan,
      error: `No remediation drills found in the ${plan.checkpointLevel} gap closure plan for ${plan.skillName}.`,
    };
  }

  const session = generateGapClosureSessionFromPlan(plan, equipment);
  return { session, plan };
}
