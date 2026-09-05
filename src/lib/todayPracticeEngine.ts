import {
  GranularSkill,
  LearnerProfile,
  PracticeLaneItem,
  PracticeSession,
  EquipmentOption,
  PracticeExercise,
  CurriculumBand,
} from '../types';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_COMPETENCIES_BY_SKILL_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import { deriveCurrentCurriculumPosition, isCompetencyVerified } from './canonicalProgressEngine';
import { getOrInitializePlacementAssessment } from './drummerPlacementEngine';
import { getActiveGapClosurePlan } from './gapClosureEngine';
import { getSkillEvidenceMemory } from './evidenceEngine';
import { buildPlacementSession } from './placementEngine';
import { selectBestAnchorGrooveForSkill } from './roadmapEngine';
import { deriveCompetencyAdvancementReadiness } from './competencyAdvancementEngine';

/**
 * Generates the 3 canonical practice lanes for Today's practice:
 * 1. Primary Curriculum Target (60-75% focus) - Active curriculum unit
 * 2. Supporting Repair / Prerequisite Gap (15-25% focus) - Blocking prerequisite / gap
 * 3. Musical Application / Song Prep (10-20% focus) - Groove/Song context
 */
export function generateTodayPracticeLanes(
  profile: LearnerProfile,
  skills: GranularSkill[],
  equipment: EquipmentOption = 'Practice Pad'
): PracticeLaneItem[] {
  const { activeUnitId, activeCompetencyId } = deriveCurrentCurriculumPosition(skills);
  const activeUnit = CURRICULUM_UNITS_BY_ID.get(activeUnitId) || CANONICAL_CURRICULUM_UNITS[0];
  const primaryCompetency =
    CURRICULUM_COMPETENCIES_BY_ID.get(activeCompetencyId) ||
    CANONICAL_CURRICULUM_COMPETENCIES[0];

  const primarySkill: GranularSkill = skills.find((s) => s.id === primaryCompetency.skillId) || ({
    id: primaryCompetency.skillId,
    name: primaryCompetency.title,
    parentTrack: 'rudiments',
    category: 'Rudiments',
    description: primaryCompetency.description,
    status: 'LEARNING',
    confidence: 2,
    practiceCount: 0,
    currentComfortTempo: primaryCompetency.tempoStandard.bpm,
  } as GranularSkill);

  const primaryMemory = getSkillEvidenceMemory(primarySkill.id);
  const advancementReadiness = deriveCompetencyAdvancementReadiness(primaryCompetency, skills);
  const primaryBpm = primaryMemory?.currentWorkingBpm || primarySkill.currentComfortTempo || primaryCompetency.tempoStandard.bpm;
  const primaryIntent =
    advancementReadiness.state === 'READY_TO_VERIFY'
      ? 'Verification Ready — Consolidate or Test'
      : advancementReadiness.state === 'NEARLY_READY'
      ? 'Close Final Readiness Gap'
      : advancementReadiness.state === 'REPAIR_REQUIRED'
      ? 'Stabilize Before Verification'
      : 'Active Technical & Pocket Development';
  const primaryReason =
    advancementReadiness.state === 'READY_TO_VERIFY'
      ? `Evidence is ready for the formal ${advancementReadiness.targetStandardText} verification. Ordinary practice can consolidate; use Run Verification when prepared.`
      : advancementReadiness.state === 'NEARLY_READY'
      ? `${advancementReadiness.metRequirements}/${advancementReadiness.totalRequirements} advancement requirements are met. Today's work should close the remaining readiness gap.`
      : advancementReadiness.state === 'REPAIR_REQUIRED'
      ? `Recent friction (${advancementReadiness.recurringFriction || 'execution instability'}) should be stabilized before a verification attempt.`
      : `Core progression target for ${activeUnit.title}. Focus on relaxed, repeatable execution.`;

  const primaryLane: PracticeLaneItem = {
    laneType: 'PRIMARY_PATH',
    laneLabel: 'Primary Curriculum Target (Active Unit)',
    targetSkillId: primarySkill.id,
    targetSkillName: primaryCompetency.title,
    competencyId: primaryCompetency.id,
    unitTitle: activeUnit.title,
    percentageAllocation: 65,
    suggestedTempo: primaryBpm,
    tempoStandardText: primaryCompetency.tempoStandard.standardText,
    subdivision: primaryCompetency.subdivision,
    intent: primaryIntent,
    reason: primaryReason,
    equipment: equipment,
    isBlockingGap: false,
    isUnlocked: true,
  };

  // 2. SUPPORTING REPAIR / PREREQUISITE GAP
  // Check if there is an active GapClosurePlan for this skill or an unverified prerequisite competency
  let repairCompetency = null;
  let repairSkill = null;
  let repairReason = '';
  let isBlocking = false;

  const activePlan = getActiveGapClosurePlan(primarySkill.id);
  if (activePlan && activePlan.failedCriteria.length > 0) {
    repairCompetency = primaryCompetency;
    repairSkill = primarySkill;
    repairReason = `Active Checkpoint Gap: ${activePlan.failedCriteria[0].criterionTitle}`;
    isBlocking = true;
  } else if (primaryCompetency.prerequisiteCompetencyIds.length > 0) {
    // Check prerequisites
    for (const prereqId of primaryCompetency.prerequisiteCompetencyIds) {
      const pComp = CURRICULUM_COMPETENCIES_BY_ID.get(prereqId);
      if (pComp) {
        const pSkill = skills.find((s) => s.id === pComp.skillId);
        if (!pSkill || pSkill.status === 'NOT_STARTED' || pSkill.status === 'DISCOVERED' || pSkill.status === 'LEARNING') {
          repairCompetency = pComp;
          repairSkill = pSkill || ({
            id: pComp.skillId,
            name: pComp.title,
            parentTrack: 'rudiments',
            category: 'Rudiments',
            description: pComp.description,
            status: 'LEARNING',
            confidence: 2,
            practiceCount: 0,
            currentComfortTempo: pComp.tempoStandard.bpm,
          } as GranularSkill);
          repairReason = `Prerequisite foundation for ${primaryCompetency.title}`;
          isBlocking = true;
          break;
        }
      }
    }
  }

  // If no blocking prerequisite, pick a foundational review competency from the previous/same band
  if (!repairCompetency) {
    const foundationalComp = CANONICAL_CURRICULUM_COMPETENCIES.find((c) =>
      c.id !== primaryCompetency.id &&
      (c.id === 'comp-pulse-quarter' || c.id === 'comp-rud-singles' || c.id === 'comp-grv-stability')
    ) || CANONICAL_CURRICULUM_COMPETENCIES[0];

    repairCompetency = foundationalComp;
    repairSkill = skills.find((s) => s.id === foundationalComp.skillId) || ({
      id: foundationalComp.skillId,
      name: foundationalComp.title,
      parentTrack: 'rudiments',
      category: 'Rudiments',
      description: foundationalComp.description,
      status: 'LEARNING',
      confidence: 2,
      practiceCount: 0,
      currentComfortTempo: foundationalComp.tempoStandard.bpm,
    } as GranularSkill);
    repairReason = 'Foundational maintenance and micro-timing calibration';
    isBlocking = false;
  }

  const repairMemory = getSkillEvidenceMemory(repairSkill.id);
  const repairBpm = repairMemory?.currentWorkingBpm || repairSkill.currentComfortTempo || repairCompetency.tempoStandard.bpm;

  const repairLane: PracticeLaneItem = {
    laneType: 'SUPPORTING_REPAIR',
    laneLabel: isBlocking ? 'Blocking Prerequisite Repair' : 'Foundational Maintenance',
    targetSkillId: repairSkill.id,
    targetSkillName: repairCompetency.title,
    competencyId: repairCompetency.id,
    unitTitle: activeUnit.title,
    percentageAllocation: 20,
    suggestedTempo: repairBpm,
    tempoStandardText: repairCompetency.tempoStandard.standardText,
    subdivision: repairCompetency.subdivision,
    intent: isBlocking ? 'Clear Blocking Prerequisite Gap' : 'Reinforce Foundations',
    reason: repairReason,
    equipment: equipment,
    isBlockingGap: isBlocking,
    isUnlocked: true,
  };

  // 3. MUSICAL APPLICATION / SONG PREP
  // Contextualize the primary skill in groove or song form
  const anchorGroove = selectBestAnchorGrooveForSkill(primarySkill, profile, 2);
  const songTag = primaryCompetency.songTags[0] || 'Billie Jean';

  const performanceLane: PracticeLaneItem = {
    laneType: 'PERFORMANCE_PREP',
    laneLabel: 'Musical Application & Song Context',
    targetSkillId: primarySkill.id,
    targetSkillName: `${primaryCompetency.title} in Song Context`,
    competencyId: primaryCompetency.id,
    unitTitle: activeUnit.title,
    percentageAllocation: 15,
    suggestedTempo: primaryBpm,
    tempoStandardText: `Contextualized with ${anchorGroove.name} (${anchorGroove.bpmRange.default} BPM)`,
    subdivision: primaryCompetency.subdivision,
    intent: 'Groove Integration & Song Readiness',
    reason: `Apply into musical phrases with ${anchorGroove.name}. Recommended song: "${songTag}".`,
    equipment: equipment === 'Practice Pad' ? 'Practice Pad' : 'Full Drum Kit',
    isBlockingGap: false,
    isUnlocked: true,
  };

  return [primaryLane, repairLane, performanceLane];
}

/**
 * Builds a guided practice session from the today practice lanes.
 */
export function buildTodayCurriculumSession(
  lanes: PracticeLaneItem[],
  profile: LearnerProfile,
  skills: GranularSkill[],
  equipment: EquipmentOption = 'Practice Pad'
): PracticeSession {
  const primaryLane = lanes.find((l) => l.laneType === 'PRIMARY_PATH') || lanes[0];
  const repairLane = lanes.find((l) => l.laneType === 'SUPPORTING_REPAIR') || lanes[1];
  const perfLane = lanes.find((l) => l.laneType === 'PERFORMANCE_PREP') || lanes[2];

  const primarySkill = skills.find((s) => s.id === primaryLane.targetSkillId) || ({
    id: primaryLane.targetSkillId,
    name: primaryLane.targetSkillName,
    currentComfortTempo: primaryLane.suggestedTempo,
    parentTrack: 'rudiments',
    category: 'Rudiments',
    description: '',
    status: 'LEARNING',
    confidence: 2,
    practiceCount: 0,
  } as GranularSkill);

  // Use placement session generator to construct the full 3-step or 4-step musical session
  const session = buildPlacementSession(primarySkill, profile, '1 beat');

  // Augment the session metadata with canonical curriculum details
  session.id = `sess-today-${Date.now()}`;
  session.focusTopic = `Today's Curriculum Practice: ${primaryLane.targetSkillName}`;
  session.notes = `Structured 3-lane session: Primary Path (${primaryLane.percentageAllocation}%), Repair (${repairLane.percentageAllocation}%), Musical Application (${perfLane.percentageAllocation}%).`;

  return session;
}
