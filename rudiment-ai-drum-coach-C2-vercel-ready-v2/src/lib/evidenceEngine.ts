import {
  PracticeAttemptEvidence,
  SkillEvidenceMemory,
  CoachSkillContext,
  CoachActionType,
  RecentTrendType,
  PracticeSession,
  PracticeExercise,
} from '../types';
import { deriveSkillProgressionInfo } from './progressionEngine';

const ATTEMPTS_STORAGE_KEY = 'RUDIMENT_ATTEMPT_EVIDENCE_V1';
const MEMORY_STORAGE_KEY = 'RUDIMENT_SKILL_MEMORY_V1';

// In-memory cache for fast sync access
let attemptsCache: PracticeAttemptEvidence[] | null = null;
let memoriesCache: Record<string, SkillEvidenceMemory> | null = null;

function loadStoredAttempts(): PracticeAttemptEvidence[] {
  if (attemptsCache) return attemptsCache;
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (raw) {
      attemptsCache = JSON.parse(raw);
      return attemptsCache || [];
    }
  } catch (e) {
    console.error('Failed to load practice attempts from storage:', e);
  }
  attemptsCache = [];
  return attemptsCache;
}

function persistAttempts(attempts: PracticeAttemptEvidence[]): void {
  attemptsCache = attempts;
  try {
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  } catch (e) {
    console.error('Failed to persist practice attempts:', e);
  }
}

function loadStoredMemories(): Record<string, SkillEvidenceMemory> {
  if (memoriesCache) return memoriesCache;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (raw) {
      memoriesCache = JSON.parse(raw);
      return memoriesCache || {};
    }
  } catch (e) {
    console.error('Failed to load skill memories from storage:', e);
  }
  memoriesCache = {};
  return memoriesCache;
}

function persistMemories(memories: Record<string, SkillEvidenceMemory>): void {
  memoriesCache = memories;
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to persist skill memories:', e);
  }
}

/**
 * Derives a SkillEvidenceMemory from a list of attempts for a single skill.
 */
export function deriveSkillEvidenceMemory(
  skillId: string,
  attemptsOverride?: PracticeAttemptEvidence[]
): SkillEvidenceMemory {
  const allAttempts = attemptsOverride || loadStoredAttempts();
  const skillAttempts = allAttempts
    .filter((a) => a.skillId === skillId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (skillAttempts.length === 0) {
    return {
      skillId,
      totalSessions: 0,
      totalAttempts: 0,
      cleanAttempts: 0,
      mostlyCleanAttempts: 0,
      inconsistentAttempts: 0,
      difficultAttempts: 0,
      recoveryModeCount: 0,
      highestAttemptedBpm: null,
      highestCleanBpm: null,
      latestCleanBpm: null,
      currentWorkingBpm: null,
      commonFrictions: [],
      primaryRecurringFriction: null,
      recentTrend: 'insufficient_evidence',
      lastPracticedAt: null,
    };
  }

  // Session distinct count
  const sessionIds = new Set(skillAttempts.map((a) => a.sessionId));
  const totalSessions = sessionIds.size;
  const totalAttempts = skillAttempts.length;

  const cleanAttempts = skillAttempts.filter((a) => a.assessment === 'clean_relaxed').length;
  const mostlyCleanAttempts = skillAttempts.filter((a) => a.assessment === 'mostly_clean').length;
  const inconsistentAttempts = skillAttempts.filter((a) => a.assessment === 'inconsistent').length;
  const difficultAttempts = skillAttempts.filter((a) => a.assessment === 'too_difficult').length;
  const recoveryModeCount = skillAttempts.filter((a) => a.recoveryMode).length;

  const highestAttemptedBpm = Math.max(...skillAttempts.map((a) => a.bpm));

  const cleanOrMostlyClean = skillAttempts.filter(
    (a) => a.assessment === 'clean_relaxed' || a.assessment === 'mostly_clean'
  );

  // Requirement 18: Clean Best BPM MUST be based strictly on genuine CLEAN & RELAXED evidence
  const genuineCleanAttempts = skillAttempts.filter(
    (a) => a.assessment === 'clean_relaxed'
  );

  const highestCleanBpm =
    genuineCleanAttempts.length > 0
      ? Math.max(...genuineCleanAttempts.map((a) => a.bpm))
      : null;

  const latestCleanAttempt =
    genuineCleanAttempts.length > 0 ? genuineCleanAttempts[genuineCleanAttempts.length - 1] : null;
  const latestCleanBpm = latestCleanAttempt ? latestCleanAttempt.bpm : null;

  // Recent attempts window (last 5 sessions or last 10 attempts)
  const recentAttempts = skillAttempts.slice(-10);

  // Derive Current Working BPM based on recent evidence
  let currentWorkingBpm: number | null = null;
  const recentClean = recentAttempts.filter(
    (a) => a.assessment === 'clean_relaxed' || a.assessment === 'mostly_clean'
  );

  if (recentClean.length > 0) {
    // Highest clean in recent window
    currentWorkingBpm = Math.max(...recentClean.map((a) => a.bpm));
  } else if (highestCleanBpm !== null) {
    currentWorkingBpm = highestCleanBpm;
  } else {
    // If no clean attempts, working tempo is 5-10 BPM below lowest attempted or 50
    const lowestAttempted = Math.min(...skillAttempts.map((a) => a.bpm));
    currentWorkingBpm = Math.max(30, lowestAttempted - 5);
  }

  // Detect Recurring Friction across recent session encounters
  // Group attempts by session
  const sessionEncountersMap: Record<string, PracticeAttemptEvidence[]> = {};
  skillAttempts.forEach((a) => {
    if (!sessionEncountersMap[a.sessionId]) {
      sessionEncountersMap[a.sessionId] = [];
    }
    sessionEncountersMap[a.sessionId].push(a);
  });

  const sessionIdsList = Object.keys(sessionEncountersMap);
  const recentSessionIds = sessionIdsList.slice(-4); // last 4 sessions
  const totalRecentEncounters = recentSessionIds.length;

  const frictionCountsMap: Record<string, number> = {};
  recentSessionIds.forEach((sId) => {
    const sessionAtts = sessionEncountersMap[sId];
    const sessionFrictions = new Set<string>();
    sessionAtts.forEach((att) => {
      att.frictions.forEach((f) => sessionFrictions.add(f));
    });
    sessionFrictions.forEach((f) => {
      frictionCountsMap[f] = (frictionCountsMap[f] || 0) + 1;
    });
  });

  const commonFrictions = Object.entries(frictionCountsMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  let primaryRecurringFriction: { tag: string; count: number; totalRecentEncounters: number } | null = null;
  if (commonFrictions.length > 0 && commonFrictions[0].count >= 2 && totalRecentEncounters >= 2) {
    primaryRecurringFriction = {
      tag: commonFrictions[0].tag,
      count: commonFrictions[0].count,
      totalRecentEncounters,
    };
  }

  // Recent Trend Detection
  let recentTrend: RecentTrendType = 'insufficient_evidence';
  if (totalAttempts >= 3) {
    const recentFailures = recentAttempts.filter(
      (a) => a.assessment === 'inconsistent' || a.assessment === 'too_difficult'
    ).length;

    const recentCleanRatio = recentClean.length / recentAttempts.length;

    if (recentFailures >= 2 && recentCleanRatio < 0.4) {
      recentTrend = 'struggling';
    } else if (recentCleanRatio >= 0.6) {
      recentTrend = 'improving';
    } else {
      recentTrend = 'stable';
    }
  }

  const lastAttempt = skillAttempts[skillAttempts.length - 1];
  const lastPracticedAt = lastAttempt
    ? new Date(lastAttempt.timestamp).toISOString().split('T')[0]
    : null;

  const baseMemoryPartial: SkillEvidenceMemory = {
    skillId,
    totalSessions,
    totalAttempts,
    cleanAttempts,
    mostlyCleanAttempts,
    inconsistentAttempts,
    difficultAttempts,
    recoveryModeCount,
    highestAttemptedBpm,
    highestCleanBpm,
    latestCleanBpm,
    currentWorkingBpm,
    commonFrictions,
    primaryRecurringFriction,
    recentTrend,
    lastPracticedAt,
  };

  const progression = deriveSkillProgressionInfo(
    skillId,
    skillId,
    baseMemoryPartial,
    skillAttempts
  );

  return {
    ...baseMemoryPartial,
    currentStage: progression.currentStage,
    todayEmphasis: progression.todayEmphasis,
    nextDevelopmentTarget: progression.nextDevelopmentTarget,
    stageStatuses: progression.stageStatuses,
  };
}

/**
 * Saves a single PracticeAttemptEvidence and updates memory idempotently.
 */
export function recordPracticeAttempt(attempt: PracticeAttemptEvidence): SkillEvidenceMemory {
  const attempts = loadStoredAttempts();

  // Check idempotency (avoid duplicate recording)
  const existingIdx = attempts.findIndex(
    (a) =>
      a.id === attempt.id ||
      (a.sessionId === attempt.sessionId &&
        a.skillId === attempt.skillId &&
        a.exerciseId === attempt.exerciseId &&
        a.attemptNumber === attempt.attemptNumber)
  );

  if (existingIdx >= 0) {
    // Update existing attempt
    attempts[existingIdx] = attempt;
  } else {
    // Append new attempt
    attempts.push(attempt);
  }

  persistAttempts(attempts);

  // Recalculate skill memory
  const memory = deriveSkillEvidenceMemory(attempt.skillId, attempts);
  const memories = loadStoredMemories();
  memories[attempt.skillId] = memory;
  persistMemories(memories);

  return memory;
}

/**
 * Retrieves the SkillEvidenceMemory for a given skill.
 */
export function getSkillEvidenceMemory(skillId: string): SkillEvidenceMemory {
  const memories = loadStoredMemories();
  if (memories[skillId]) {
    return memories[skillId];
  }
  // Derive on the fly if not cached
  const derived = deriveSkillEvidenceMemory(skillId);
  memories[skillId] = derived;
  persistMemories(memories);
  return derived;
}

/**
 * Retrieves all attempt evidence records for a skill.
 */
export function getAttemptsForSkill(skillId: string): PracticeAttemptEvidence[] {
  const attempts = loadStoredAttempts();
  return attempts.filter((a) => a.skillId === skillId);
}

export const getAllAttemptEvidenceForSkill = getAttemptsForSkill;

/**
 * Generates structured context for AI Coach / Chat features.
 */
export function getCoachSkillContext(
  skillId: string,
  skillName?: string
): CoachSkillContext {
  const memory = getSkillEvidenceMemory(skillId);
  const name = skillName || skillId;

  let frictionText = 'None identified';
  if (memory.primaryRecurringFriction) {
    frictionText = `${memory.primaryRecurringFriction.tag} (${memory.primaryRecurringFriction.count} of last ${memory.primaryRecurringFriction.totalRecentEncounters} sessions)`;
  }

  const summaryText =
    memory.totalAttempts === 0
      ? `${name}: No practice evidence recorded yet.`
      : `${name}: ${memory.totalSessions} session encounters (${memory.totalAttempts} total attempts). Current working tempo: ${memory.currentWorkingBpm ?? 'N/A'} BPM. Highest clean tempo: ${memory.highestCleanBpm ?? 'N/A'} BPM. Recurring friction: ${frictionText}. Trend: ${memory.recentTrend}. Recovery Mode triggered ${memory.recoveryModeCount} times.`;

  return {
    skillId,
    skillName: name,
    totalSessions: memory.totalSessions,
    totalAttempts: memory.totalAttempts,
    currentWorkingTempo: memory.currentWorkingBpm,
    highestCleanTempo: memory.highestCleanBpm,
    highestAttemptedTempo: memory.highestAttemptedBpm,
    primaryRecurringFriction: memory.primaryRecurringFriction ? memory.primaryRecurringFriction.tag : null,
    recentTrend: memory.recentTrend,
    recoveryModeCount: memory.recoveryModeCount,
    summaryText,
  };
}

/**
 * Finalizes a completed practice session idempotently by recording evidence for all exercises.
 */
export function finalizeSessionEvidence(session: PracticeSession): Record<string, SkillEvidenceMemory> {
  const updatedMemories: Record<string, SkillEvidenceMemory> = {};
  if (!session.exercises || session.exercises.length === 0) return updatedMemories;

  const sessionEquipment = session.equipment || 'Practice Pad';
  const sessionContext = session.practiceContext || 'SKILL_DEVELOPMENT';

  // Map to track attempt numbers per skill within this session
  const skillAttemptCounts: Record<string, number> = {};

  session.exercises.forEach((ex, idx) => {
    if (!ex.result) return;

    // Requirement 17: Protect skill evidence from generic warm-up and cool-down exercises
    if (ex.phase === 'WARM UP' || ex.phase === 'COOL DOWN') return;

    const primarySkillId = ex.skillIds[0] || 'skill';
    skillAttemptCounts[primarySkillId] = (skillAttemptCounts[primarySkillId] || 0) + 1;
    const attemptNumber = skillAttemptCounts[primarySkillId];

    // Map SelfCheckFeeling to evidence assessment format
    const feelingMap: Record<string, 'clean_relaxed' | 'mostly_clean' | 'inconsistent' | 'too_difficult'> = {
      CLEAN_AND_RELAXED: 'clean_relaxed',
      MOSTLY_CLEAN: 'mostly_clean',
      INCONSISTENT: 'inconsistent',
      TOO_DIFFICULT: 'too_difficult',
    };

    const coachActionMap: Record<string, CoachActionType> = {
      advance: 'advance',
      repeat: 'retry',
      reduce_tempo: 'regress',
      simplify: 'regress',
      recover: 'recovery',
      end_skill_block: 'end_skill_block',
    };

    const action = ex.result.adaptiveAction || 'advance';

    const attemptEvidence: PracticeAttemptEvidence = {
      id: `att-${session.id}-${ex.id}-${idx}`,
      sessionId: session.id,
      skillId: primarySkillId,
      exerciseId: ex.id,
      timestamp: ex.result.completedAt || new Date().toISOString(),
      equipment: sessionEquipment,
      practiceContext: sessionContext,
      attemptNumber,
      bpm: ex.result.tempoUsed || ex.tempo,
      previousBpm: ex.tempo,
      assessment: feelingMap[ex.result.selfCheck] || 'mostly_clean',
      frictions: ex.result.issueTags || [],
      coachAction: coachActionMap[action] || 'advance',
      nextBpm: (ex.result.tempoUsed || ex.tempo) + (ex.result.tempoChange || 0),
      recoveryMode: action === 'recover' || ex.result.selfCheck === 'TOO_DIFFICULT',
      progressionStage: ex.progressionStage,
      challengeType: ex.challengeType,
    };

    const mem = recordPracticeAttempt(attemptEvidence);
    updatedMemories[primarySkillId] = mem;
  });

  return updatedMemories;
}
