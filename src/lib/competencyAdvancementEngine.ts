import {
  CurriculumCompetency,
  GranularSkill,
  SelfCheckFeeling,
  SkillStatus,
  skillStatusAtLeast,
} from '../types';
import {
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_COMPETENCIES_BY_SKILL_ID,
} from '../data/canonicalCurriculum';
import {
  deriveCurrentCurriculumPosition,
  getCanonicalVerifications,
  isCompetencyVerified,
  recordCanonicalVerification,
} from './canonicalProgressEngine';
import { getAttemptsForSkill, getSkillEvidenceMemory } from './evidenceEngine';
import { getAllPlacementAttemptsForSkill } from './placementEngine';
import { findTeachingDefinition } from './teachingDefinitions';
import {
  generateGapClosurePlan,
  getActiveGapClosurePlan,
  recordCheckpointAttempt,
  saveGapClosurePlan,
} from './gapClosureEngine';
import { CheckpointAttempt, CheckpointCriterionResult } from '../types';

export type CompetencyAdvancementState =
  | 'VERIFIED'
  | 'BLOCKED'
  | 'DEVELOPING'
  | 'NEARLY_READY'
  | 'READY_TO_VERIFY'
  | 'REPAIR_REQUIRED';

export interface CompetencyAdvancementRequirement {
  id: string;
  label: string;
  detail: string;
  met: boolean;
}

export interface CompetencyAdvancementReadiness {
  competencyId: string;
  skillId: string;
  state: CompetencyAdvancementState;
  label: string;
  summary: string;
  targetBpm: number;
  targetDurationSeconds: number;
  targetStandardText: string;
  requirements: CompetencyAdvancementRequirement[];
  metRequirements: number;
  totalRequirements: number;
  cleanIndependentAttempts: number;
  qualifyingSessionCount: number;
  highestQualifyingBpm: number | null;
  missingPrerequisiteIds: string[];
  recurringFriction: string | null;
}


export interface CompetencyPracticeAuthority {
  competencyId: string;
  skillId: string;
  readinessState: CompetencyAdvancementState;
  targetBpm: number;
  tempoCeiling: number | null;
  recommendedPracticeBpm: number;
  verificationPriority: boolean;
  suppressLegacyProgression: boolean;
  guidance: string;
}

export interface CompetencyVerificationAttempt {
  id: string;
  competencyId: string;
  skillId: string;
  startedAt: string;
  completedAt: string;
  bpm: number;
  durationSeconds: number;
  requiredDurationSeconds: number;
  completedRequiredRun: boolean;
  selfAssessment: SelfCheckFeeling;
  frictions: string[];
  passed: boolean;
  priorActiveCompetencyId: string;
  nextActiveCompetencyId: string;
  priorActiveUnitId: string;
  nextActiveUnitId: string;
}

export interface CurriculumAdvancementEvent {
  id: string;
  competencyId: string;
  competencyTitle: string;
  verifiedAt: string;
  previousUnitId: string;
  nextUnitId: string;
  previousCompetencyId: string;
  nextCompetencyId: string;
  unitAdvanced: boolean;
}

const VERIFICATION_ATTEMPTS_KEY = 'RUDIMENT_COMPETENCY_VERIFICATION_ATTEMPTS_V1';
const ADVANCEMENT_EVENTS_KEY = 'RUDIMENT_CURRICULUM_ADVANCEMENT_EVENTS_V1';

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key}:`, error);
  }
}

function getTargetSpec(comp: CurriculumCompetency): {
  bpm: number;
  durationSeconds: number;
  standardText: string;
} {
  const teaching = findTeachingDefinition(comp.id);
  if (teaching) {
    return {
      bpm: teaching.certificationTempo.bpm,
      durationSeconds: teaching.certificationTempo.durationSeconds,
      standardText: teaching.certificationTempo.standardText,
    };
  }

  const secondsMatch = `${comp.tempoStandard.durationOrCycles} ${comp.durationCriterion}`.match(/(\d+)\s*seconds?/i);
  if (secondsMatch) {
    return {
      bpm: comp.tempoStandard.bpm,
      durationSeconds: Math.max(10, Number(secondsMatch[1])),
      standardText: comp.tempoStandard.standardText,
    };
  }

  const barsMatch = `${comp.tempoStandard.durationOrCycles} ${comp.durationCriterion}`.match(/(\d+)\s*bars?/i);
  if (barsMatch) {
    const bars = Number(barsMatch[1]);
    const beatsPerBar = comp.title.includes('6/8') || comp.subdivision.includes('6/8') ? 6 : 4;
    return {
      bpm: comp.tempoStandard.bpm,
      durationSeconds: Math.max(10, Math.round((bars * beatsPerBar * 60) / comp.tempoStandard.bpm)),
      standardText: comp.tempoStandard.standardText,
    };
  }

  return {
    bpm: comp.tempoStandard.bpm,
    durationSeconds: 30,
    standardText: comp.tempoStandard.standardText,
  };
}

export function getCompetencyVerificationAttempts(competencyId?: string): CompetencyVerificationAttempt[] {
  const all = readArray<CompetencyVerificationAttempt>(VERIFICATION_ATTEMPTS_KEY);
  return competencyId ? all.filter((a) => a.competencyId === competencyId) : all;
}

export function getCurriculumAdvancementEvents(limit = 12): CurriculumAdvancementEvent[] {
  return readArray<CurriculumAdvancementEvent>(ADVANCEMENT_EVENTS_KEY)
    .sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime())
    .slice(0, limit);
}

export function deriveCompetencyAdvancementReadiness(
  comp: CurriculumCompetency,
  skills: GranularSkill[]
): CompetencyAdvancementReadiness {
  const target = getTargetSpec(comp);
  const verifications = getCanonicalVerifications();

  if (isCompetencyVerified(comp.id, skills, verifications)) {
    return {
      competencyId: comp.id,
      skillId: comp.skillId,
      state: 'VERIFIED',
      label: 'Verified',
      summary: `${comp.title} has passed practical verification at the curriculum standard.`,
      targetBpm: target.bpm,
      targetDurationSeconds: target.durationSeconds,
      targetStandardText: target.standardText,
      requirements: [],
      metRequirements: 0,
      totalRequirements: 0,
      cleanIndependentAttempts: 0,
      qualifyingSessionCount: 0,
      highestQualifyingBpm: target.bpm,
      missingPrerequisiteIds: [],
      recurringFriction: null,
    };
  }

  const missingPrerequisiteIds = comp.prerequisiteCompetencyIds.filter(
    (id) => !isCompetencyVerified(id, skills, verifications)
  );

  const skill = skills.find((s) => s.id === comp.skillId);
  const attempts = getAttemptsForSkill(comp.skillId);
  const placementAttempts = getAllPlacementAttemptsForSkill(comp.skillId);
  const memory = getSkillEvidenceMemory(comp.skillId);
  const activeGapPlan = getActiveGapClosurePlan(comp.skillId);
  const priorVerificationAttempts = getCompetencyVerificationAttempts(comp.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const latestFailedVerificationAt = priorVerificationAttempts[0] && !priorVerificationAttempts[0].passed ? priorVerificationAttempts[0].completedAt : null;

  const independentPracticeRuns = attempts
    .filter((attempt) => {
      const assessmentPass = attempt.assessment === 'clean_relaxed';
      const independent =
        attempt.evidenceCategory === 'SELF_ASSESSED_EXECUTION' ||
        attempt.instructionMode === 'PLAY' ||
        attempt.assistanceLevel === 'MINIMAL' ||
        attempt.assistanceLevel === 'NONE';
      return assessmentPass && independent;
    })
    .map((attempt) => ({ bpm: attempt.bpm, sessionKey: `practice:${attempt.sessionId}`, timestamp: attempt.timestamp }));

  // C2 already stored richer independent PLAY evidence in the placement engine.
  // C4 reads that legacy evidence so the learner does not lose genuine work from
  // previous builds. Because older placement attempts did not carry the parent
  // Guided Practice session ID, group them by calendar date to avoid one practice
  // sitting falsely counting as several separate sessions.
  const independentPlacementRuns = placementAttempts
    .filter((attempt) =>
      attempt.success &&
      attempt.selfAssessment === 'CLEAN_AND_RELAXED' &&
      attempt.instructionMode === 'PLAY' &&
      (attempt.assistanceLevel === 'MINIMAL' || attempt.assistanceLevel === 'NONE')
    )
    .map((attempt) => ({ bpm: attempt.bpm, sessionKey: `placement-date:${attempt.timestamp.split('T')[0]}`, timestamp: attempt.timestamp }));

  const cleanIndependent = [...independentPracticeRuns, ...independentPlacementRuns];

  // C4 readiness is deliberately below the formal verification standard.
  // A learner should approach the test before they can already perform it at 100% target speed.
  const readinessTempoFloor = Math.max(30, Math.round(target.bpm * 0.85));
  const qualifyingTempoAttempts = cleanIndependent.filter((attempt) => attempt.bpm >= readinessTempoFloor);
  const qualifyingSessions = new Set(qualifyingTempoAttempts.map((a) => a.sessionKey));
  const highestQualifyingBpm = qualifyingTempoAttempts.length
    ? Math.max(...qualifyingTempoAttempts.map((a) => a.bpm))
    : null;
  const postFailureQualifyingCount = latestFailedVerificationAt
    ? qualifyingTempoAttempts.filter((attempt) => new Date(attempt.timestamp).getTime() > new Date(latestFailedVerificationAt).getTime()).length
    : 0;
  const unresolvedFailedVerification = Boolean(latestFailedVerificationAt && postFailureQualifyingCount < 2);

  const allEvidenceSessionKeys = new Set([
    ...attempts.map((a) => `practice:${a.sessionId}`),
    ...placementAttempts.map((a) => `placement-date:${a.timestamp.split('T')[0]}`),
  ]);
  const totalEvidenceAttempts = attempts.length + placementAttempts.length;
  const hasPracticeBreadth = totalEvidenceAttempts >= 3 && allEvidenceSessionKeys.size >= 2;
  const hasIndependentClean = cleanIndependent.length >= 2;
  const hasNearTargetControl = qualifyingTempoAttempts.length >= 2;
  const hasTwoQualifyingSessions = qualifyingSessions.size >= 2;
  const noActiveFriction = !memory.primaryRecurringFriction && memory.recentTrend !== 'struggling' && !activeGapPlan && !unresolvedFailedVerification;

  const requirements: CompetencyAdvancementRequirement[] = [
    {
      id: 'prerequisites',
      label: 'Prerequisites verified',
      detail: missingPrerequisiteIds.length === 0
        ? 'All required earlier competencies are verified.'
        : `${missingPrerequisiteIds.length} prerequisite${missingPrerequisiteIds.length === 1 ? '' : 's'} still unverified.`,
      met: missingPrerequisiteIds.length === 0,
    },
    {
      id: 'practice-breadth',
      label: 'Repeated practice evidence',
      detail: `${totalEvidenceAttempts} recorded attempts across ${allEvidenceSessionKeys.size} sessions/days. Target: at least 3 attempts across 2 sessions.`,
      met: hasPracticeBreadth,
    },
    {
      id: 'independent-clean',
      label: 'Independent clean execution',
      detail: `${cleanIndependent.length} Clean & Relaxed independent run${cleanIndependent.length === 1 ? '' : 's'}. Target: 2.`,
      met: hasIndependentClean,
    },
    {
      id: 'near-target-tempo',
      label: 'Near verification tempo',
      detail: highestQualifyingBpm
        ? `Highest qualifying independent clean run: ${highestQualifyingBpm} BPM. Readiness floor: ${readinessTempoFloor} BPM.`
        : `Need two independent clean runs at ${readinessTempoFloor}+ BPM before testing at ${target.bpm} BPM.`,
      met: hasNearTargetControl,
    },
    {
      id: 'separate-sessions',
      label: 'Control repeated on separate days/sessions',
      detail: `${qualifyingSessions.size} qualifying session${qualifyingSessions.size === 1 ? '' : 's'}. Target: 2 separate sessions.`,
      met: hasTwoQualifyingSessions,
    },
    {
      id: 'friction',
      label: 'No recurring blocker',
      detail: activeGapPlan
        ? 'An active repair plan must be completed before another verification attempt.'
        : unresolvedFailedVerification
        ? `The latest formal verification did not pass. Log ${Math.max(0, 2 - postFailureQualifyingCount)} more clean near-target run${Math.max(0, 2 - postFailureQualifyingCount) === 1 ? '' : 's'} before retesting.`
        : memory.primaryRecurringFriction
        ? `Recurring issue: ${memory.primaryRecurringFriction.tag}.`
        : memory.recentTrend === 'struggling'
        ? 'Recent evidence shows a struggling trend.'
        : 'No recurring technical blocker detected.',
      met: noActiveFriction,
    },
  ];


  const metRequirements = requirements.filter((r) => r.met).length;
  const totalRequirements = requirements.length;
  const ratio = totalRequirements ? metRequirements / totalRequirements : 0;

  let state: CompetencyAdvancementState = 'DEVELOPING';
  if (missingPrerequisiteIds.length > 0) {
    state = 'BLOCKED';
  } else if (activeGapPlan || unresolvedFailedVerification || memory.recentTrend === 'struggling' || memory.primaryRecurringFriction) {
    state = totalEvidenceAttempts >= 2 || activeGapPlan || unresolvedFailedVerification ? 'REPAIR_REQUIRED' : 'DEVELOPING';
  } else if (requirements.every((r) => r.met)) {
    state = 'READY_TO_VERIFY';
  } else if (ratio >= 0.65) {
    state = 'NEARLY_READY';
  }

  const labelMap: Record<CompetencyAdvancementState, string> = {
    VERIFIED: 'Verified',
    BLOCKED: 'Prerequisite Blocked',
    DEVELOPING: 'Building Evidence',
    NEARLY_READY: 'Nearly Ready',
    READY_TO_VERIFY: 'Ready to Verify',
    REPAIR_REQUIRED: 'Repair Before Testing',
  };

  const summaryMap: Record<CompetencyAdvancementState, string> = {
    VERIFIED: `${comp.title} is verified.`,
    BLOCKED: `Finish the required earlier competency before testing ${comp.title}.`,
    DEVELOPING: `Keep building repeatable independent evidence before the formal verification test.`,
    NEARLY_READY: `Most readiness evidence is present. Close the remaining gaps before testing at ${target.bpm} BPM.`,
    READY_TO_VERIFY: `Practice evidence supports a formal verification attempt at ${target.standardText}.`,
    REPAIR_REQUIRED: `Recent friction should be stabilized at a relaxed working tempo before formal verification.`,
  };

  return {
    competencyId: comp.id,
    skillId: comp.skillId,
    state,
    label: labelMap[state],
    summary: summaryMap[state],
    targetBpm: target.bpm,
    targetDurationSeconds: target.durationSeconds,
    targetStandardText: target.standardText,
    requirements,
    metRequirements,
    totalRequirements,
    cleanIndependentAttempts: cleanIndependent.length,
    qualifyingSessionCount: qualifyingSessions.size,
    highestQualifyingBpm,
    missingPrerequisiteIds,
    recurringFriction: activeGapPlan ? 'active verification repair plan' : unresolvedFailedVerification ? 'failed formal verification' : memory.primaryRecurringFriction?.tag || null,
  };
}


/**
 * C4.2 — Canonical advancement authority for ordinary practice.
 *
 * While a canonical competency is still unverified, ordinary adaptive practice
 * must never outrun the formal certification standard. Once readiness reaches
 * READY_TO_VERIFY, the verification test becomes the primary next action and
 * legacy tempo/progression systems are explicitly subordinate.
 */
export function deriveCompetencyPracticeAuthorityForSkill(
  skillId: string,
  skills: GranularSkill[]
): CompetencyPracticeAuthority | null {
  const competency = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(skillId);
  if (!competency) return null;

  const readiness = deriveCompetencyAdvancementReadiness(competency, skills);
  const memory = getSkillEvidenceMemory(skillId);
  const observedBpm =
    memory.currentWorkingBpm ||
    readiness.highestQualifyingBpm ||
    skills.find((skill) => skill.id === skillId)?.currentComfortTempo ||
    readiness.targetBpm;

  if (readiness.state === 'VERIFIED') {
    return {
      competencyId: competency.id,
      skillId,
      readinessState: readiness.state,
      targetBpm: readiness.targetBpm,
      tempoCeiling: null,
      recommendedPracticeBpm: observedBpm,
      verificationPriority: false,
      suppressLegacyProgression: false,
      guidance: `${competency.title} is already verified. Maintenance or stretch work may continue without the pre-verification tempo ceiling.`,
    };
  }

  // Keep ordinary practice in the certification neighbourhood. The learner may
  // warm up below the target, but the adaptive engine cannot push beyond it.
  const nearTargetFloor = Math.max(30, readiness.targetBpm - 5);
  const recommendedPracticeBpm = Math.min(
    readiness.targetBpm,
    Math.max(nearTargetFloor, observedBpm)
  );
  const verificationPriority = readiness.state === 'READY_TO_VERIFY';

  return {
    competencyId: competency.id,
    skillId,
    readinessState: readiness.state,
    targetBpm: readiness.targetBpm,
    tempoCeiling: readiness.targetBpm,
    recommendedPracticeBpm,
    verificationPriority,
    suppressLegacyProgression: verificationPriority,
    guidance: verificationPriority
      ? `Formal verification now has priority: ${readiness.targetStandardText}. Hold ordinary practice at or below ${readiness.targetBpm} BPM and use it only to warm up or consolidate.`
      : `Continue building evidence at or below the ${readiness.targetBpm} BPM certification standard.`,
  };
}

export function recordCompetencyVerificationOutcome(params: {
  competency: CurriculumCompetency;
  skill: GranularSkill;
  skills: GranularSkill[];
  startedAt: string;
  durationSeconds: number;
  completedRequiredRun: boolean;
  selfAssessment: SelfCheckFeeling;
  frictions: string[];
}): {
  passed: boolean;
  attempt: CompetencyVerificationAttempt;
  advancementEvent?: CurriculumAdvancementEvent;
} {
  const { competency, skill, skills, startedAt, durationSeconds, completedRequiredRun, selfAssessment, frictions } = params;
  const target = getTargetSpec(competency);
  const before = deriveCurrentCurriculumPosition(skills);
  const passed = completedRequiredRun && selfAssessment === 'CLEAN_AND_RELAXED' && frictions.length === 0;

  if (passed) {
    recordCanonicalVerification(
      competency.id,
      'checkpoint',
      `C4 practical verification passed: ${target.standardText}`
    );
  }

  const after = deriveCurrentCurriculumPosition(skills);
  const attempt: CompetencyVerificationAttempt = {
    id: `comp-ver-${competency.id}-${Date.now()}`,
    competencyId: competency.id,
    skillId: skill.id,
    startedAt,
    completedAt: new Date().toISOString(),
    bpm: target.bpm,
    durationSeconds,
    requiredDurationSeconds: target.durationSeconds,
    completedRequiredRun,
    selfAssessment,
    frictions,
    passed,
    priorActiveCompetencyId: before.activeCompetencyId,
    nextActiveCompetencyId: after.activeCompetencyId,
    priorActiveUnitId: before.activeUnitId,
    nextActiveUnitId: after.activeUnitId,
  };

  const attempts = readArray<CompetencyVerificationAttempt>(VERIFICATION_ATTEMPTS_KEY);
  writeArray(VERIFICATION_ATTEMPTS_KEY, [attempt, ...attempts].slice(0, 100));

  const criteriaResults: CheckpointCriterionResult[] = [
    {
      criterionId: `canonical-${competency.id}`,
      criterionName: target.standardText,
      passed,
      description: competency.durationCriterion,
      testMethod: `Timed metronome verification at ${target.bpm} BPM for ${target.durationSeconds} seconds.`,
      bpmRequirement: target.bpm,
    },
  ];

  const checkpointAttempt: CheckpointAttempt = {
    id: `chk-c4-${competency.id}-${Date.now()}`,
    skillId: skill.id,
    skillName: skill.name,
    checkpointLevel: competency.targetStatus,
    attemptedAt: new Date().toISOString(),
    assessedTempo: target.bpm,
    totalCriteria: 1,
    passedCriteriaIds: passed ? [criteriaResults[0].criterionId] : [],
    failedCriteriaIds: passed ? [] : [criteriaResults[0].criterionId],
    score: passed ? 100 : 0,
    result: passed ? 'passed' : 'failed',
    criteriaResults,
  };
  recordCheckpointAttempt(checkpointAttempt);

  let advancementEvent: CurriculumAdvancementEvent | undefined;
  if (passed) {
    const events = readArray<CurriculumAdvancementEvent>(ADVANCEMENT_EVENTS_KEY);
    advancementEvent = {
      id: `advance-${competency.id}-${Date.now()}`,
      competencyId: competency.id,
      competencyTitle: competency.title,
      verifiedAt: new Date().toISOString(),
      previousUnitId: before.activeUnitId,
      nextUnitId: after.activeUnitId,
      previousCompetencyId: before.activeCompetencyId,
      nextCompetencyId: after.activeCompetencyId,
      unitAdvanced: before.activeUnitId !== after.activeUnitId,
    };
    writeArray(ADVANCEMENT_EVENTS_KEY, [advancementEvent, ...events].slice(0, 50));
  } else {
    const existingPlan = getActiveGapClosurePlan(skill.id);
    if (!existingPlan) {
      const failedCriterion: CheckpointCriterionResult = {
        ...criteriaResults[0],
        passed: false,
        description: frictions.length
          ? `${competency.durationCriterion}. Reported friction: ${frictions.join(', ')}.`
          : `${competency.durationCriterion}. Verification run was not clean and relaxed.`,
      };
      const plan = generateGapClosurePlan({
        skill,
        checkpointAttempt,
        failedCriteria: [failedCriterion],
        workingBpm: Math.max(30, Math.round(target.bpm * 0.85)),
      });
      saveGapClosurePlan(plan);
    }
  }

  return { passed, attempt, advancementEvent };
}

export function getSkillStatusAfterCompetencyVerification(
  currentStatus: SkillStatus,
  targetStatus: SkillStatus
): SkillStatus {
  return skillStatusAtLeast(currentStatus, targetStatus) ? currentStatus : targetStatus;
}

export function getCompetencyById(competencyId: string): CurriculumCompetency | null {
  return CURRICULUM_COMPETENCIES_BY_ID.get(competencyId) || null;
}
