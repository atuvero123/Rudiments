import {
  CurriculumBand,
  CurriculumCompetency,
  CurriculumUnit,
  GranularSkill,
  LearnerProfile,
  SkillStatus,
  skillStatusAtLeast,
} from '../types';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_COMPETENCIES_BY_SKILL_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';

export interface CompetencyVerificationRecord {
  competencyId: string;
  verifiedAt: string;
  source: 'placement_test' | 'checkpoint' | 'qualifying_practice';
  notes?: string;
}

const VERIFICATIONS_STORAGE_KEY = 'RUDIMENT_CANONICAL_VERIFICATIONS_V1';

/**
 * Loads all canonically verified competency records from persistent storage.
 */
export function getCanonicalVerifications(): Map<string, CompetencyVerificationRecord> {
  const map = new Map<string, CompetencyVerificationRecord>();
  try {
    const raw = localStorage.getItem(VERIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed: CompetencyVerificationRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.competencyId) {
            map.set(item.competencyId, item);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load canonical verifications:', e);
  }
  return map;
}

/**
 * Saves or updates canonical verification records.
 */
export function recordCanonicalVerification(
  competencyId: string,
  source: 'placement_test' | 'checkpoint' | 'qualifying_practice',
  notes?: string
): void {
  try {
    const current = getCanonicalVerifications();
    current.set(competencyId, {
      competencyId,
      verifiedAt: new Date().toISOString(),
      source,
      notes,
    });
    const arr = Array.from(current.values());
    localStorage.setItem(VERIFICATIONS_STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Failed to save canonical verification:', e);
  }
}

/**
 * Evaluates whether a competency is verified by acceptable practical evidence:
 * - Passed practical placement test
 * - Passed deterministic checkpoint
 * - Qualifying recorded practice session with clean evidence
 * 
 * NOTE: Legacy default/self-reported statuses (source === 'default' | 'user')
 * represent ESTIMATED ability and do NOT automatically equal canonical verification.
 */
export function isCompetencyVerified(
  competencyId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): boolean {
  const verifications = verificationMap || getCanonicalVerifications();
  if (verifications.has(competencyId)) {
    return true;
  }

  // C4 progression hardening: canonical verification is explicit evidence,
  // not a side effect of a mutable skill status. Placement tests and practical
  // verification/checkpoint runs write records into the verification store.
  // Legacy SELF-REPORT / manual status changes remain useful context but do not
  // silently certify curriculum prerequisites.
  return false;
}

/**
 * Returns the verification state descriptor for UI display, clearly distinguishing
 * between canonically verified ability and estimated / self-reported ability.
 */
export function getCompetencyVerificationStatus(
  comp: CurriculumCompetency,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): {
  isVerified: boolean;
  statusLabel: 'VERIFIED' | 'SELF_REPORTED' | 'DEVELOPING' | 'LOCKED';
  detailText: string;
  source?: string;
} {
  const isVer = isCompetencyVerified(comp.id, skills, verificationMap);
  if (isVer) {
    const ver = (verificationMap || getCanonicalVerifications()).get(comp.id);
    return {
      isVerified: true,
      statusLabel: 'VERIFIED',
      detailText: 'Practical evidence confirmed',
      source: ver?.source || 'Practical practice',
    };
  }

  const skill = skills.find((s) => s.id === comp.skillId);
  if (skill && skillStatusAtLeast(skill.status, 'CLEAN')) {
    return {
      isVerified: false,
      statusLabel: 'SELF_REPORTED',
      detailText: `Reported as ${skill.status} (Practical verification required)`,
      source: skill.source,
    };
  }

  return {
    isVerified: false,
    statusLabel: 'DEVELOPING',
    detailText: 'In progress / unverified',
    source: skill?.source,
  };
}

/**
 * Checks whether a curriculum unit is COMPLETED.
 *
 * Canonical units are complete only when every REQUIRED competency is verified.
 * Both CORE and SUPPORTING competencies are required curriculum content; only
 * ELECTIVE competencies are optional for core-unit progression.
 *
 * This distinction matters because a SUPPORTING competency can still be an
 * authored step inside a canonical unit (for example Drum Notation Basics in
 * Unit 1). It must not be silently skipped just because its role is SUPPORTING.
 * Never derive completion merely from array index or CORE-only filtering.
 */
export function isUnitComplete(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): boolean {
  const unit = CURRICULUM_UNITS_BY_ID.get(unitId);
  if (!unit) return false;

  const verifications = verificationMap || getCanonicalVerifications();

  // Every non-elective competency authored inside a canonical unit is required.
  // CORE identifies the primary skill target; SUPPORTING identifies curriculum
  // content that supports it, but SUPPORTING is still part of the unit journey.
  const requiredCompetencies = unit.competencyIds
    .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id))
    .filter((c): c is CurriculumCompetency => Boolean(c && c.role !== 'ELECTIVE'));

  if (requiredCompetencies.length === 0) {
    // Elective-only style units are not part of the ordered core-unit path, but
    // when queried directly they count as complete only if all authored elective
    // competencies have been verified.
    const allUnitComps = unit.competencyIds
      .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id))
      .filter((c): c is CurriculumCompetency => Boolean(c));
    return allUnitComps.length > 0 && allUnitComps.every((c) => isCompetencyVerified(c.id, skills, verifications));
  }

  return requiredCompetencies.every((c) => isCompetencyVerified(c.id, skills, verifications));
}

/**
 * Checks whether a curriculum unit is UNLOCKED.
 * Unit UNLOCKED means all its prerequisite units are complete.
 * Unit 1 is always unlocked.
 */
export function isUnitUnlocked(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): boolean {
  const unit = CURRICULUM_UNITS_BY_ID.get(unitId);
  if (!unit) return false;

  // Unit 1 is always unlocked
  if (unit.id === 'unit-b1-pulse' || unit.order === 1) {
    return true;
  }

  if (unit.prerequisiteUnitIds.length === 0) {
    return true;
  }

  const verifications = verificationMap || getCanonicalVerifications();

  // All prerequisite units must be complete
  return unit.prerequisiteUnitIds.every((prereqId) => isUnitComplete(prereqId, skills, verifications));
}

/**
 * Returns the first unverified REQUIRED competency in a unit.
 * Required means CORE or SUPPORTING. ELECTIVE content never blocks the ordered
 * canonical path.
 */
export function getFirstUnverifiedRequiredCompetency(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): CurriculumCompetency | null {
  const unit = CURRICULUM_UNITS_BY_ID.get(unitId);
  if (!unit) return null;

  const verifications = verificationMap || getCanonicalVerifications();

  for (const compId of unit.competencyIds) {
    const comp = CURRICULUM_COMPETENCIES_BY_ID.get(compId);
    if (comp && comp.role !== 'ELECTIVE' && !isCompetencyVerified(comp.id, skills, verifications)) {
      return comp;
    }
  }

  return null;
}

/**
 * Backward-compatible alias kept for any older callers. Its semantics now match
 * the canonical required-competency rule (CORE + SUPPORTING).
 */
export function getFirstUnverifiedCoreCompetency(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): CurriculumCompetency | null {
  return getFirstUnverifiedRequiredCompetency(unitId, skills, verificationMap);
}

/**
 * Deterministically derives the learner's current curriculum position:
 * - Active Unit: First unlocked canonical unit that is not complete
 * - Active Competency: First unverified required (CORE or SUPPORTING) competency within that unit
 * - Band verification: Determined strictly by completed units
 */
export function deriveCurrentCurriculumPosition(
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): {
  activeUnitId: string;
  activeCompetencyId: string;
  verifiedBand: CurriculumBand;
  completedUnitIds: string[];
} {
  const verifications = verificationMap || getCanonicalVerifications();

  // Core units ordered by order: 1 to 16
  const coreUnits = CANONICAL_CURRICULUM_UNITS.filter(
    (u) => !u.id.startsWith('style-')
  ).sort((a, b) => a.order - b.order);

  const completedUnitIds: string[] = [];

  let activeUnit: CurriculumUnit = coreUnits[0];
  let foundActive = false;

  for (const unit of coreUnits) {
    const complete = isUnitComplete(unit.id, skills, verifications);
    if (complete) {
      completedUnitIds.push(unit.id);
    } else if (!foundActive && isUnitUnlocked(unit.id, skills, verifications)) {
      activeUnit = unit;
      foundActive = true;
    }
  }

  // If all core units are complete, active is the last unit
  if (!foundActive) {
    activeUnit = coreUnits[coreUnits.length - 1];
  }

  // Active competency is the first unverified required competency in the active unit.
  // SUPPORTING competencies are authored curriculum steps and cannot be skipped.
  const activeComp =
    getFirstUnverifiedRequiredCompetency(activeUnit.id, skills, verifications) ||
    CURRICULUM_COMPETENCIES_BY_ID.get(activeUnit.competencyIds[0]) ||
    CANONICAL_CURRICULUM_COMPETENCIES[0];

  // Derive verified band strictly from completed units
  let verifiedBand: CurriculumBand = 'BEGINNER';
  const beginnerUnits = coreUnits.filter((u) => u.band === 'BEGINNER');
  const intermediateUnits = coreUnits.filter((u) => u.band === 'INTERMEDIATE');
  const advancedUnits = coreUnits.filter((u) => u.band === 'ADVANCED');

  const beginnerComplete = beginnerUnits.every((u) => completedUnitIds.includes(u.id));
  const intermediateComplete = intermediateUnits.every((u) => completedUnitIds.includes(u.id));
  const advancedComplete = advancedUnits.every((u) => completedUnitIds.includes(u.id));

  if (beginnerComplete && intermediateComplete && advancedComplete) {
    verifiedBand = 'ADVANCED';
  } else if (beginnerComplete && intermediateComplete) {
    verifiedBand = 'ADVANCED'; // Ready for advanced
  } else if (beginnerComplete) {
    verifiedBand = 'INTERMEDIATE';
  } else {
    verifiedBand = 'BEGINNER';
  }

  return {
    activeUnitId: activeUnit.id,
    activeCompetencyId: activeComp.id,
    verifiedBand,
    completedUnitIds,
  };
}
