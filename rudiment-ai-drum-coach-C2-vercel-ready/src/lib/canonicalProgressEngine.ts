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

  const comp = CURRICULUM_COMPETENCIES_BY_ID.get(competencyId);
  if (!comp) return false;

  const skill = skills.find((s) => s.id === comp.skillId);
  if (!skill) return false;

  // If the skill has practical practice log or verified assessment source with sufficient status
  if (
    (skill.source === 'practice_log' || skill.source === 'assessment') &&
    skillStatusAtLeast(skill.status, comp.targetStatus || 'CLEAN')
  ) {
    return true;
  }

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
 * Unit COMPLETED strictly means all its required CORE competencies are canonically verified.
 * Never derived merely from array index!
 */
export function isUnitComplete(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): boolean {
  const unit = CURRICULUM_UNITS_BY_ID.get(unitId);
  if (!unit) return false;

  const verifications = verificationMap || getCanonicalVerifications();

  // Find all core competencies in this unit
  const coreCompetencies = unit.competencyIds
    .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id))
    .filter((c): c is CurriculumCompetency => Boolean(c && c.role === 'CORE'));

  if (coreCompetencies.length === 0) {
    // If unit has only electives, check if all electives are verified
    const allUnitComps = unit.competencyIds
      .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id))
      .filter((c): c is CurriculumCompetency => Boolean(c));
    return allUnitComps.length > 0 && allUnitComps.every((c) => isCompetencyVerified(c.id, skills, verifications));
  }

  return coreCompetencies.every((c) => isCompetencyVerified(c.id, skills, verifications));
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
 * Returns the first unverified core competency in a unit.
 */
export function getFirstUnverifiedCoreCompetency(
  unitId: string,
  skills: GranularSkill[],
  verificationMap?: Map<string, CompetencyVerificationRecord>
): CurriculumCompetency | null {
  const unit = CURRICULUM_UNITS_BY_ID.get(unitId);
  if (!unit) return null;

  const verifications = verificationMap || getCanonicalVerifications();

  for (const compId of unit.competencyIds) {
    const comp = CURRICULUM_COMPETENCIES_BY_ID.get(compId);
    if (comp && comp.role === 'CORE') {
      if (!isCompetencyVerified(comp.id, skills, verifications)) {
        return comp;
      }
    }
  }

  // If all core are verified, check any electives
  for (const compId of unit.competencyIds) {
    const comp = CURRICULUM_COMPETENCIES_BY_ID.get(compId);
    if (comp && !isCompetencyVerified(comp.id, skills, verifications)) {
      return comp;
    }
  }

  return null;
}

/**
 * Deterministically derives the learner's current curriculum position:
 * - Active Unit: First unlocked core unit that is not complete
 * - Active Competency: First unverified core competency within that unit
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

  // Active competency is the first unverified core competency in the active unit
  const activeComp =
    getFirstUnverifiedCoreCompetency(activeUnit.id, skills, verifications) ||
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
