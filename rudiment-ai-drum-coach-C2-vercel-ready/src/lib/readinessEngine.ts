import {
  GranularSkill,
  SkillStatus,
  SkillEvidenceMemory,
  PlacementEvidenceMemory,
  PracticeAttemptEvidence,
  SkillReadiness,
  ReadinessState,
  ReadinessRequirement,
  READINESS_STATE_CONFIG,
} from '../types';
import { getSkillEvidenceMemory, getAllAttemptEvidenceForSkill } from './evidenceEngine';
import { derivePlacementEvidenceMemory } from './placementEngine';
import { deriveSkillProgressionInfo } from './progressionEngine';
import { getPassedCheckpointsForSkill } from './gapClosureEngine';

/**
 * Returns the next formal checkpoint milestone in the drum skill hierarchy.
 * Formal checkpoints begin at CLEAN (Not Started, Discovered, and Learning target CLEAN).
 * Completed checkpoints passed in history are automatically retired from the next slot.
 */
export function getNextMilestoneStatus(
  currentStatus: SkillStatus,
  passedCheckpoints: string[] = []
): SkillStatus | null {
  const progressionOrder: SkillStatus[] = ['CLEAN', 'APPLICABLE', 'MUSICAL', 'MASTERED'];

  let initialTarget: SkillStatus | null = null;
  switch (currentStatus) {
    case 'NOT_STARTED':
    case 'DISCOVERED':
    case 'LEARNING':
      initialTarget = 'CLEAN';
      break;
    case 'CLEAN':
      initialTarget = 'APPLICABLE';
      break;
    case 'APPLICABLE':
      initialTarget = 'MUSICAL';
      break;
    case 'MUSICAL':
      initialTarget = 'MASTERED';
      break;
    case 'MASTERED':
      return null;
    default:
      initialTarget = 'CLEAN';
  }

  // If the initial target has already been passed in checkpoint history, advance to the next unpassed target
  if (initialTarget && passedCheckpoints.includes(initialTarget)) {
    const startIndex = progressionOrder.indexOf(initialTarget);
    for (let i = startIndex + 1; i < progressionOrder.length; i++) {
      if (!passedCheckpoints.includes(progressionOrder[i])) {
        return progressionOrder[i];
      }
    }
    return null;
  }

  return initialTarget;
}

export const getNextFormalCheckpoint = getNextMilestoneStatus;

/**
 * Evaluates evidence to derive a granular skill's readiness for its next checkpoint.
 */
export function deriveSkillReadiness(
  skill: GranularSkill,
  memoryOverride?: SkillEvidenceMemory,
  placementMemOverride?: PlacementEvidenceMemory,
  attemptsOverride?: PracticeAttemptEvidence[]
): SkillReadiness {
  const memory = memoryOverride || getSkillEvidenceMemory(skill.id);
  const attempts = attemptsOverride || getAllAttemptEvidenceForSkill(skill.id);
  const placementMem = placementMemOverride || derivePlacementEvidenceMemory(skill.id);
  const progression = deriveSkillProgressionInfo(skill.id, skill.name, memory, attempts);
  const passedCheckpoints = getPassedCheckpointsForSkill(skill.id);

  // Reconcile status if checkpoint was already recorded as passed
  let currentStatus = skill.status;
  const statusRank: Record<SkillStatus, number> = {
    NOT_STARTED: 0,
    DISCOVERED: 1,
    LEARNING: 2,
    CLEAN: 3,
    APPLICABLE: 4,
    MUSICAL: 5,
    MASTERED: 6,
  };
  if (passedCheckpoints.includes('MASTERED') && statusRank[currentStatus] < statusRank['MASTERED']) {
    currentStatus = 'MASTERED';
  } else if (passedCheckpoints.includes('MUSICAL') && statusRank[currentStatus] < statusRank['MUSICAL']) {
    currentStatus = 'MUSICAL';
  } else if (passedCheckpoints.includes('APPLICABLE') && statusRank[currentStatus] < statusRank['APPLICABLE']) {
    currentStatus = 'APPLICABLE';
  } else if (passedCheckpoints.includes('CLEAN') && statusRank[currentStatus] < statusRank['CLEAN']) {
    currentStatus = 'CLEAN';
  }

  const targetStatus = getNextMilestoneStatus(currentStatus, passedCheckpoints);

  const totalSessions = memory?.totalSessions || 0;
  const totalAttempts = memory?.totalAttempts || 0;
  const cleanAttempts = memory?.cleanAttempts || 0;
  const mostlyCleanAttempts = memory?.mostlyCleanAttempts || 0;
  const cleanOrMostlyClean = cleanAttempts + mostlyCleanAttempts;
  const recoveryCount = memory?.recoveryModeCount || 0;
  const recentTrend = memory?.recentTrend || 'insufficient_evidence';
  const recurringFriction = memory?.primaryRecurringFriction?.tag || null;
  const workingBpm = memory?.currentWorkingBpm || skill.currentComfortTempo || null;
  const cleanBestBpm = memory?.highestCleanBpm || null;

  const blockers: string[] = [];
  const strengths: string[] = [];
  const requirements: ReadinessRequirement[] = [];

  // Special Case: MASTERED already
  if (currentStatus === 'MASTERED' || targetStatus === null) {
    return {
      skillId: skill.id,
      skillName: skill.name,
      currentStatus,
      targetStatus: null,
      readinessState: 'READY_FOR_CHECKPOINT',
      readinessLabel: 'Fully Mastered',
      readinessSummary: `${skill.name} has achieved Mastered status with full execution and placement fluency.`,
      requirements: [
        {
          id: 'mastery-established',
          label: 'Mastery Maintained',
          description: 'Reliable across multiple tempos, placements, and song contexts.',
          met: true,
          category: 'context',
        },
      ],
      metRequirementsCount: 1,
      totalRequirementsCount: 1,
      blockers: [],
      strengths: ['Complete vocabulary mastery achieved across all progression stages.'],
      checkpointType: 'MASTERED',
      nextActionRecommendation: 'Maintain sharpness with occasional high-tempo integration and creative phrase variations.',
    };
  }

  // Evaluate requirements according to target status
  if (targetStatus === 'CLEAN') {
    // NOT_STARTED / DISCOVERED / LEARNING -> CLEAN
    // Formal competency checkpoint starts at CLEAN.
    // Minimum categories: Initial Practice Evidence, Baseline Working Tempo, Basic Mechanical Control.
    const hasInitialPractice = totalSessions >= 1 || totalAttempts >= 1;
    const hasBaselineBpm = (workingBpm !== null && workingBpm > 0) || (cleanBestBpm !== null && cleanBestBpm > 0);
    const hasMechanicalControl =
      progression.stageStatuses.FOUNDATION === 'Established' ||
      cleanAttempts >= 1 ||
      skill.confidence >= 2 ||
      totalAttempts >= 2;

    requirements.push({
      id: 'req-clean-initial-practice',
      label: 'Initial Practice Evidence',
      description: 'At least one guided practice session or recorded attempt completed for the skill.',
      met: hasInitialPractice,
      statusLabel: hasInitialPractice ? `Met (${totalSessions} sessions, ${totalAttempts} attempts)` : 'Not Met (0 sessions)',
      category: 'evidence',
    });

    requirements.push({
      id: 'req-clean-baseline-tempo',
      label: 'Baseline Working Tempo Identified',
      description: hasBaselineBpm
        ? `Usable working BPM identified from practice evidence (${workingBpm || cleanBestBpm} BPM).`
        : 'A usable working BPM has been identified from practice evidence.',
      met: hasBaselineBpm,
      statusLabel: hasBaselineBpm ? `Met (${workingBpm || cleanBestBpm} BPM)` : 'Not Met',
      category: 'consistency',
    });

    requirements.push({
      id: 'req-clean-core-mechanics',
      label: 'Core Mechanics Evidence',
      description: 'Demonstrates basic sticking/coordination mechanics and stroke clarity.',
      met: hasMechanicalControl,
      statusLabel: hasMechanicalControl ? 'Met' : 'Developing',
      category: 'mechanics',
    });

    // Evaluate Strengths & Blockers
    if (cleanAttempts >= 1) {
      strengths.push(`${cleanAttempts} Clean & Relaxed attempt${cleanAttempts > 1 ? 's' : ''} logged at ${cleanBestBpm || workingBpm} BPM.`);
    }
    if (hasBaselineBpm) {
      strengths.push(`Working tempo established at ${workingBpm || cleanBestBpm} BPM.`);
    }
    if (recentTrend === 'improving') {
      strengths.push('Recent practice trajectory is improving.');
    }
    if (recurringFriction) {
      blockers.push(`Recurring ${recurringFriction} friction detected across recent encounters.`);
    }
    if (recentTrend === 'struggling') {
      blockers.push('Recent practice encounters showed instability or struggle.');
    }
    if (!hasInitialPractice) {
      blockers.push('No practice attempts recorded yet. Run a guided practice session to establish baseline.');
    }
    if (!hasBaselineBpm) {
      blockers.push('Identify a comfortable working BPM through practice.');
    }
    if (!hasMechanicalControl) {
      blockers.push('Establish core sticking mechanics and stroke consistency.');
    }
  } else if (targetStatus === 'APPLICABLE') {
    // CLEAN -> APPLICABLE
    // Focus: Musical placement, 1-2 beat fills, downbeat landings & time continuity
    // Authoritative evidence source is PlacementEvidenceMemory (placementEngine)
    const passedCheckpoints = getPassedCheckpointsForSkill(skill.id);
    const metIsolatedBase =
      currentStatus === 'CLEAN' ||
      passedCheckpoints.includes('CLEAN') ||
      (currentStatus as string) === 'APPLICABLE' ||
      (currentStatus as string) === 'MUSICAL' ||
      (currentStatus as string) === 'MASTERED';

    const totalSuccessfulInsertions =
      placementMem.successfulOneBeatPlacements +
      placementMem.successfulTwoBeatPlacements +
      placementMem.successfulFullBarPlacements;

    // Requirement B: Phrase Insertion Evidence (min 2 successful placement attempts)
    const metPlacementCount = totalSuccessfulInsertions >= 2;

    // Requirement C: Downbeat Landing Accuracy (min 2 clean landings on Beat 1 without recurring landing issues)
    const hasLandingFriction =
      placementMem.commonLandingIssues.length > 0 &&
      (placementMem.recurringPlacementFriction?.includes('Beat 1') ||
        placementMem.recurringPlacementFriction?.includes('Landing') ||
        placementMem.recurringPlacementFriction?.includes('Crash'));
    const metDownbeatLanding =
      placementMem.successfulDownbeatLandings >= 2 && !hasLandingFriction;

    // Requirement D: Groove Return Reliability (at least 2 clean returns, High reliability, not unassessed/low)
    const metGrooveReturn =
      (placementMem.grooveReturnReliability === 'High' ||
        (placementMem.cleanGrooveReturns >= 2 && placementMem.grooveReturnReliability !== 'Low')) &&
      placementMem.grooveReturnReliability !== 'Unassessed';

    // Requirement E: No Placement Friction (requires >= 2 placement attempts sample, AND no recurring friction)
    const hasEnoughPlacementSample = (placementMem.totalPlacementAttempts || 0) >= 2;
    const metNoPlacementFriction =
      hasEnoughPlacementSample && !placementMem.recurringPlacementFriction;

    // Determine accurate status labels
    const statusIsolated = metIsolatedBase ? 'Met' : 'Not Met';

    let statusPlacement = 'Not Yet Evidenced';
    if (metPlacementCount) {
      statusPlacement = `Met (${totalSuccessfulInsertions} Evidenced)`;
    } else if (totalSuccessfulInsertions === 1) {
      statusPlacement = 'Developing (1 of 2 Evidenced)';
    } else if ((placementMem.totalPlacementAttempts || 0) > 0) {
      statusPlacement = 'Developing (0 of 2 Successful)';
    }

    let statusLanding = 'Not Yet Evidenced';
    if (metDownbeatLanding) {
      statusLanding = `Met (${placementMem.successfulDownbeatLandings} Clean Landings)`;
    } else if (placementMem.successfulDownbeatLandings === 1) {
      statusLanding = 'Developing (1 of 2 Clean Landings)';
    } else if (hasLandingFriction) {
      statusLanding = 'Needs Work (Landing Drift)';
    } else if ((placementMem.totalPlacementAttempts || 0) > 0) {
      statusLanding = 'Developing';
    }

    let statusGroove = 'Unassessed';
    if (metGrooveReturn) {
      statusGroove = `Met (${placementMem.cleanGrooveReturns} Clean Returns)`;
    } else if (placementMem.grooveReturnReliability === 'Low') {
      statusGroove = 'Needs Work (Lost Groove)';
    } else if (placementMem.cleanGrooveReturns === 1) {
      statusGroove = 'Developing (1 Clean Return)';
    } else if ((placementMem.totalPlacementAttempts || 0) > 0) {
      statusGroove = 'Developing';
    }

    let statusFriction = 'Insufficient Evidence';
    if (metNoPlacementFriction) {
      statusFriction = 'Met (Zero Friction)';
    } else if (placementMem.recurringPlacementFriction) {
      statusFriction = `Friction: ${placementMem.recurringPlacementFriction}`;
    } else if ((placementMem.totalPlacementAttempts || 0) === 1) {
      statusFriction = 'Insufficient Evidence (1 attempt logged)';
    }

    requirements.push({
      id: 'req-app-isolated',
      label: 'Solid Isolated Foundation',
      description: 'Consistent isolated execution established (Clean status verified).',
      met: metIsolatedBase,
      statusLabel: statusIsolated,
      category: 'mechanics',
    });

    requirements.push({
      id: 'req-app-placement',
      label: 'Phrase Insertion Evidence',
      description: 'Demonstrated placement into 1-beat, 2-beat, or 1-bar fills without tempo drops (min 2 attempts).',
      met: metPlacementCount,
      statusLabel: statusPlacement,
      category: 'placement',
    });

    requirements.push({
      id: 'req-app-landing',
      label: 'Downbeat Landing Accuracy',
      description: 'Lands accurately on Beat 1 (Crash / Snare) without dragging or rushing (min 2 landings).',
      met: metDownbeatLanding,
      statusLabel: statusLanding,
      category: 'placement',
    });

    requirements.push({
      id: 'req-app-groove-return',
      label: 'Groove Return Reliability',
      description: 'Returns seamlessly to timekeeper groove immediately after phrase ending.',
      met: metGrooveReturn,
      statusLabel: statusGroove,
      category: 'context',
    });

    requirements.push({
      id: 'req-app-no-friction',
      label: 'No Placement Friction',
      description: 'No recurring hesitation or time-drop across qualifying placement encounters (min 2 attempts).',
      met: metNoPlacementFriction,
      statusLabel: statusFriction,
      category: 'placement',
    });

    if (metIsolatedBase) strengths.push('Clean isolated mechanics firmly established.');
    if (placementMem.oneBeatStatus === 'Established') strengths.push('1-Beat musical placements established.');
    if (placementMem.twoBeatStatus === 'Established') strengths.push('2-Beat musical placements established.');
    if (placementMem.grooveReturnReliability === 'High') strengths.push('High groove return reliability.');
    if (placementMem.successfulDownbeatLandings >= 2) strengths.push('Beat 1 crash downbeats locked accurately.');

    if ((placementMem.totalPlacementAttempts || 0) === 0) {
      blockers.push('No musical placement evidence recorded yet. Run placement practice to verify phrase transfer.');
    } else {
      if (!metPlacementCount) blockers.push('Needs at least 2 successful placement attempts in musical 1-beat or 2-beat fills.');
      if (!metDownbeatLanding) blockers.push('Lock beat 1 crash downbeat landing without rushing or dragging.');
      if (!metGrooveReturn) blockers.push('Establish seamless groove return without hesitation after fill exits.');
      if (placementMem.recurringPlacementFriction) blockers.push(`Placement friction: ${placementMem.recurringPlacementFriction}`);
    }
  } else if (targetStatus === 'MUSICAL') {
    // APPLICABLE -> MUSICAL
    // Focus: Full-bar fills, dynamic expression, musical articulation & tone
    const metFullBar =
      placementMem.fullBarStatus === 'Established' ||
      placementMem.successfulFullBarPlacements >= 2 ||
      progression.currentStage === 'TRANSFER';
    const metGrooveReliability = placementMem.grooveReturnReliability === 'High';
    const metTransferStage =
      progression.currentStage === 'TRANSFER' ||
      progression.stageStatuses.APPLICATION === 'Established';
    const metMultiSessionStability = totalSessions >= 3 && cleanAttempts >= 6;

    requirements.push({
      id: 'req-mus-full-bar',
      label: 'Full-Bar Phrase Integration',
      description: 'Seamlessly connects full-measure fills and phrase transitions into active grooves.',
      met: metFullBar,
      category: 'placement',
    });

    requirements.push({
      id: 'req-mus-groove-high',
      label: 'High Groove Return Reliability',
      description: 'Pocket and micro-timing remain unwavering across multiple musical transitions.',
      met: metGrooveReliability,
      category: 'context',
    });

    requirements.push({
      id: 'req-mus-transfer',
      label: 'Kit Orchestration & Transfer',
      description: 'Moves accents and sticking across varied surfaces or kit zones cleanly.',
      met: metTransferStage,
      category: 'context',
    });

    requirements.push({
      id: 'req-mus-stability',
      label: 'Multi-Session Musical Stability',
      description: 'Consistently clean and musical execution across 3+ distinct sessions.',
      met: metMultiSessionStability,
      category: 'evidence',
    });

    if (metFullBar) strengths.push('Full-bar phrase transitions demonstrated.');
    if (metTransferStage) strengths.push('Orchestration and accent transfer stage reached.');
    if (!metFullBar) blockers.push('Full-measure phrase transitions still developing.');
    if (!metGrooveReliability) blockers.push('Needs high-reliability groove return across multiple full-bar repetitions.');
  } else if (targetStatus === 'MASTERED') {
    // MUSICAL -> MASTERED
    // Focus: Total fluency, high tempo range, zero friction
    const metHighVolume = totalSessions >= 5 && cleanAttempts >= 10;
    const metZeroFriction = recurringFriction === null && recoveryCount <= 1;
    const metAllStages =
      progression.stageStatuses.TRANSFER === 'Established' ||
      progression.currentStage === 'TRANSFER';
    const metAllPlacements =
      placementMem.oneBeatStatus === 'Established' &&
      placementMem.twoBeatStatus === 'Established' &&
      placementMem.grooveReturnReliability === 'High';

    requirements.push({
      id: 'req-mas-volume',
      label: 'Extensive Session Provenance',
      description: '5+ distinct practice sessions and 10+ clean attempts recorded.',
      met: metHighVolume,
      category: 'evidence',
    });

    requirements.push({
      id: 'req-mas-frictionless',
      label: 'Zero Recurring Friction',
      description: 'Completely free of physical tension, timing drift, or hesitation.',
      met: metZeroFriction,
      category: 'mechanics',
    });

    requirements.push({
      id: 'req-mas-stages',
      label: 'All Progression Stages Established',
      description: 'Foundation, Control, Endurance, Application, and Transfer fully established.',
      met: metAllStages,
      category: 'context',
    });

    requirements.push({
      id: 'req-mas-placements',
      label: 'Complete Placement Fluency',
      description: '1-beat, 2-beat, and full-bar placements all highly reliable.',
      met: metAllPlacements,
      category: 'placement',
    });

    if (!metHighVolume) blockers.push('Needs broader session history (5+ distinct sessions).');
    if (!metAllStages) blockers.push('Transfer stage must be fully established.');
  }

  // Calculate readiness score
  const totalReqs = requirements.length;
  const metReqs = requirements.filter((r) => r.met).length;
  const ratio = totalReqs > 0 ? metReqs / totalReqs : 0;

  // Determine Readiness State
  let readinessState: ReadinessState;
  if (totalAttempts === 0 && totalSessions === 0) {
    readinessState = 'INSUFFICIENT_EVIDENCE';
  } else if (blockers.length >= 2 || recentTrend === 'struggling' || recoveryCount >= 3) {
    readinessState = 'NOT_READY';
  } else if (ratio >= 1.0 && blockers.length === 0) {
    readinessState = 'READY_FOR_CHECKPOINT';
  } else if (ratio >= 0.65 && blockers.length <= 1) {
    readinessState = 'NEARLY_READY';
  } else if (ratio >= 0.33) {
    readinessState = 'DEVELOPING';
  } else {
    readinessState = 'NOT_READY';
  }

  // Action Recommendation / Coach Guidance
  let nextActionRecommendation = '';
  if (readinessState === 'READY_FOR_CHECKPOINT') {
    nextActionRecommendation = `Evidence supports a ${targetStatus} checkpoint attempt. Launch the assessment to verify repeatable execution before advancing.`;
  } else if (readinessState === 'NEARLY_READY') {
    nextActionRecommendation = `Close the remaining gap (${blockers[0] || 'consolidate 1 more clean session'}) to unlock the ${targetStatus} Checkpoint.`;
  } else if (readinessState === 'DEVELOPING') {
    nextActionRecommendation = `Continue guided practice loop at ${workingBpm || 70} BPM to build execution consistency.`;
  } else if (readinessState === 'NOT_READY') {
    nextActionRecommendation = `Focus on clearing ${recurringFriction || 'friction'} at a relaxed, reduced tempo before challenging checkpoints.`;
  } else {
    nextActionRecommendation = `Log 1-2 interactive practice sessions to establish baseline evidence.`;
  }

  const checkpointType = targetStatus as 'CLEAN' | 'APPLICABLE' | 'MUSICAL' | 'MASTERED' | null;
  const stateConfig = READINESS_STATE_CONFIG[readinessState];

  const readinessSummary =
    readinessState === 'READY_FOR_CHECKPOINT'
      ? `${skill.name} has demonstrated all ${totalReqs} evidence requirements for the ${targetStatus} Checkpoint.`
      : readinessState === 'NEARLY_READY'
      ? `${skill.name} has demonstrated ${metReqs} of ${totalReqs} requirements for ${targetStatus}. Nearly ready for formal checkpoint.`
      : readinessState === 'DEVELOPING'
      ? `${skill.name} is developing nicely (${metReqs}/${totalReqs} requirements met for ${targetStatus}).`
      : readinessState === 'NOT_READY'
      ? `${skill.name} has active blockers (${blockers.length} identified) that must be resolved first.`
      : `Insufficient practice evidence recorded for ${skill.name}. Complete sessions to assess readiness.`;

  return {
    skillId: skill.id,
    skillName: skill.name,
    currentStatus,
    targetStatus,
    readinessState,
    readinessLabel: stateConfig.label,
    readinessSummary,
    requirements,
    metRequirementsCount: metReqs,
    totalRequirementsCount: totalReqs,
    blockers,
    strengths,
    checkpointType,
    nextActionRecommendation,
  };
}

export interface GranularCheckpointCriteria {
  id: string;
  title: string;
  description: string;
  bpmRequirement?: number;
  testInstruction: string;
}

/**
 * Returns tailored test criteria for a granular skill checkpoint assessment.
 */
export function getGranularCheckpointCriteria(
  skill: GranularSkill,
  targetStatus: SkillStatus,
  workingBpm: number
): GranularCheckpointCriteria[] {
  const bpm = workingBpm || skill.currentComfortTempo || 70;

  if (targetStatus === 'CLEAN') {
    return [
      {
        id: 'crit-clean-1',
        title: '60-Second Steady Stream',
        description: `Execute ${skill.name} continuously for 60 seconds at ${bpm} BPM with no rushing, dragging, or stick drops.`,
        bpmRequirement: bpm,
        testInstruction: `Play continuous repetitions for 1 minute at ${bpm} BPM. Verify that wrist grip remains loose throughout.`,
      },
      {
        id: 'crit-clean-2',
        title: 'Micro-Timing & Dynamic Balance',
        description: 'Equal volume and hand-to-hand balance between right and left strokes without accidental accents.',
        testInstruction: 'Listen critically for consistent stroke height and volume parity between limbs.',
      },
      {
        id: 'crit-clean-3',
        title: 'Zero Tension / Fatigue Spikes',
        description: 'Shoulders, forearms, and fulcrum remain completely relaxed without tightening during fast passages.',
        testInstruction: 'Check that breathing is steady and grip pressure is 4/10 or lighter.',
      },
      {
        id: 'crit-clean-4',
        title: 'Clean Stoppage & Recovery',
        description: 'Can stop cleanly on cue and resume precisely on the downbeat without hesitation.',
        testInstruction: 'Stop on beat 4 and re-enter on beat 1 with instant alignment to the click.',
      },
    ];
  }

  if (targetStatus === 'APPLICABLE') {
    return [
      {
        id: 'crit-app-1',
        title: '1-Beat & 2-Beat Phrase Insertion',
        description: `Play 3 bars of timekeeper groove followed by a 1-beat or 2-beat ${skill.name} fill at ${bpm} BPM.`,
        bpmRequirement: bpm,
        testInstruction: 'Maintain consistent groove tempo into and out of the fill without dragging.',
      },
      {
        id: 'crit-app-2',
        title: 'Solid Beat 1 Downbeat Landing',
        description: 'Land on the crash cymbal / bass drum exactly on Beat 1 of the following measure.',
        testInstruction: 'Check that the crash stroke aligns 100% with the bass drum downbeat.',
      },
      {
        id: 'crit-app-3',
        title: 'Unwavering Groove Return',
        description: 'Instantly resume standard groove pocket on Beat 2 with zero stumbling or hesitation.',
        testInstruction: 'Evaluate the first bar of groove post-fill: the pocket must feel seamless.',
      },
      {
        id: 'crit-app-4',
        title: 'Dynamic Continuity',
        description: 'Fill volume complements the groove rather than overpowering or disappearing.',
        testInstruction: 'Ensure the fill accents match the overall musical dynamics of the groove.',
      },
    ];
  }

  if (targetStatus === 'MUSICAL') {
    return [
      {
        id: 'crit-mus-1',
        title: 'Full-Measure Phrase Transitions',
        description: `Execute a full 1-bar ${skill.name} transition across 4-bar and 8-bar musical song forms.`,
        bpmRequirement: bpm,
        testInstruction: 'Count 4 bars of groove and execute a complete 4-beat fill leading into chorus transition.',
      },
      {
        id: 'crit-mus-2',
        title: 'Accent & Ghost Note Articulation',
        description: 'Clear differentiation between primary accents (>8 inches) and ghost/inner notes (<2 inches).',
        testInstruction: 'Demonstrate at least 6 dB of dynamic separation between accents and unaccented strokes.',
      },
      {
        id: 'crit-mus-3',
        title: 'Kit Zone / Surface Orchestration',
        description: 'Transfer sticking pattern across toms, cymbals, or pad zones without collision or misstrikes.',
        testInstruction: 'Move right hand to floor tom and left hand to high tom while maintaining steady sticking.',
      },
      {
        id: 'crit-mus-4',
        title: 'Tempo Flexibility (±10 BPM)',
        description: `Musical execution holds firm from ${Math.max(40, bpm - 10)} BPM to ${bpm + 10} BPM.`,
        testInstruction: 'Test one round at lower tempo and one round at higher tempo with equal musicality.',
      },
    ];
  }

  // Default / MASTERED
  return [
    {
      id: 'crit-mas-1',
      title: 'Effortless Automaticity',
      description: `Execute ${skill.name} at performance tempos (${bpm}+ BPM) without conscious manual calculation.`,
      bpmRequirement: bpm,
      testInstruction: 'Play continuous phrases while maintaining verbal counting or conversational focus.',
    },
    {
      id: 'crit-mas-2',
      title: 'Musical Context Adaptability',
      description: 'Apply pattern across multiple musical styles (Rock, Funk, Gospel, Worship) and subdivisions.',
      testInstruction: 'Demonstrate pattern as both a linear fill and a syncopated groove element.',
    },
    {
      id: 'crit-mas-3',
      title: 'Zero Friction Under Pressure',
      description: 'Maintains relaxed technique, optimal tone, and perfect pocket for extended durations.',
      testInstruction: 'Run full 2-minute sustained performance simulation.',
    },
  ];
}
