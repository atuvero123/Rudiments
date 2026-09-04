import {
  GranularSkill,
  LearnerProfile,
  SkillDependency,
  AnchorGroove,
  CurriculumStage,
  RoadmapNextStepType,
  RoadmapDecision,
  EvaluatedDependency,
  DependencyEvidenceState,
  ActiveLearningThread,
  ReturnToTargetMemory,
  PracticeExercise,
  PracticeSession,
  PracticeIntent,
  EquipmentOption,
} from '../types';
import { getSkillEvidenceMemory, getAttemptsForSkill } from './evidenceEngine';
import { getAllPlacementAttemptsForSkill, derivePlacementEvidenceMemory } from './placementEngine';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import { deriveCurrentCurriculumPosition } from './canonicalProgressEngine';

// ============================================================================
// 1. ANCHOR GROOVES LIBRARY (Simple, Reusable Musical Containers)
// ============================================================================

export const STARTER_ANCHOR_GROOVES: AnchorGroove[] = [
  {
    id: 'ag-pulse-44',
    name: 'Pulse-Only 4/4 Anchor',
    timeSignature: '4/4',
    level: 1,
    category: 'Pulse',
    description: 'Minimal pulse framework. Quarter-note click with steady quarter-note hi-hat or ride tap.',
    bpmRange: { min: 50, max: 120, default: 70 },
    pedagogicalRole: 'Provides absolute minimal cognitive load so learner can focus 100% on rudiment mechanics and phrase entry.',
    stickingOrPattern: 'HH/Ride: Quarter notes | Foot: Pulse on 1 & 3',
    isPulseOnly: true,
  },
  {
    id: 'ag-basic-44',
    name: 'Basic 4/4 8th-Note Groove',
    timeSignature: '4/4',
    level: 2,
    category: 'Straight 4/4',
    description: 'Straight eighth-note hi-hat timekeeping with kick on 1 & 3, snare backbeat on 2 & 4.',
    bpmRange: { min: 60, max: 110, default: 75 },
    pedagogicalRole: 'Universal musical frame for practising 1-beat and 2-beat fill entry and Beat 1 crash landing.',
    stickingOrPattern: 'HH: 1 & 2 & 3 & 4 & | Snare: 2, 4 | Kick: 1, 3',
    skillIdMapping: 'grv-worship-44',
  },
  {
    id: 'ag-worship-44',
    name: 'Worship 4/4 Ballad Anchor',
    timeSignature: '4/4',
    level: 2,
    category: 'Worship',
    description: 'Spacious, open 4/4 worship pocket with steady 8th-note ride edge/bell and relaxed snare backbeat.',
    bpmRange: { min: 65, max: 95, default: 72 },
    pedagogicalRole: 'Realistic church/worship context for rehearsing dynamic fills, builds, and crash recoveries.',
    stickingOrPattern: 'Ride: 8ths | Snare: 2, 4 | Kick: 1, (3)&',
    skillIdMapping: 'grv-worship-44',
  },
  {
    id: 'ag-basic-68',
    name: 'Basic 6/8 Worship Anchor',
    timeSignature: '6/8',
    level: 2,
    category: '6/8 Slow',
    description: 'Two-pulse compound worship groove with ride on 1-2-3-4-5-6 and strong snare backbeat on beat 4.',
    bpmRange: { min: 50, max: 85, default: 68 },
    pedagogicalRole: 'Compound meter container for triplet/six-stroke placement and 6/8 downbeat landings.',
    stickingOrPattern: 'Ride: 1-2-3 4-5-6 | Snare: 4 | Kick: 1, (4)&',
    skillIdMapping: 'grv-worship-68',
  },
  {
    id: 'ag-pop-rock-44',
    name: 'Pop/Rock 4/4 Drive Anchor',
    timeSignature: '4/4',
    level: 3,
    category: 'Pop/Rock',
    description: 'Driving 8th-note groove with syncopated "1, 2-and, 3, 4" kick pattern.',
    bpmRange: { min: 75, max: 120, default: 85 },
    pedagogicalRole: 'Higher energy container to test fill entry over syncopated bass drum patterns.',
    stickingOrPattern: 'HH: 8ths | Snare: 2, 4 | Kick: 1, 2&, 3',
  },
];

export function getAnchorGrooveById(id: string): AnchorGroove {
  return (
    STARTER_ANCHOR_GROOVES.find((ag) => ag.id === id) || STARTER_ANCHOR_GROOVES[1]
  );
}

export function selectBestAnchorGrooveForSkill(
  skill: GranularSkill,
  profile?: LearnerProfile,
  preferredLevel: number = 2
): AnchorGroove {
  // Check time signature
  const is68 = skill.relevantTimeSignatures?.includes('6/8') || skill.name.includes('6/8');
  if (is68) {
    return STARTER_ANCHOR_GROOVES.find((ag) => ag.timeSignature === '6/8') || STARTER_ANCHOR_GROOVES[3];
  }

  // Level 1 requested (minimal pulse)
  if (preferredLevel === 1) {
    return STARTER_ANCHOR_GROOVES[0];
  }

  // Match worship preference if applicable
  const prefersWorship = profile?.mainGenres?.some((g) => g.toLowerCase().includes('worship')) ||
    profile?.mainMusicalContexts?.some((c) => c.toLowerCase().includes('worship') || c.toLowerCase().includes('church'));

  if (prefersWorship) {
    return STARTER_ANCHOR_GROOVES.find((ag) => ag.id === 'ag-worship-44') || STARTER_ANCHOR_GROOVES[1];
  }

  // Default to standard basic 4/4
  return STARTER_ANCHOR_GROOVES[1];
}

// ============================================================================
// 2. SKILL DEPENDENCY REGISTRY (Granular, Musical Prerequisites)
// ============================================================================

export const BUILTIN_SKILL_DEPENDENCIES: Record<string, SkillDependency[]> = {
  'rud-six-stroke-roll': [
    {
      id: 'dep-ssr-1',
      skillId: 'rud-six-stroke-roll',
      name: 'Six Stroke Roll Isolated Execution',
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'The sticking pattern (R L L R R L) and accents must be clean and relaxed on the pad before placing it in time.',
      remediationActionText: 'Practice isolated Six Stroke Roll mechanics on pad',
    },
    {
      id: 'dep-ssr-2',
      skillId: 'rud-six-stroke-roll',
      name: 'Steady 4/4 Pulse Internalization',
      requiredConceptKey: 'pulse_44',
      dependencyType: 'RHYTHM',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'A solid internal metronome pulse is essential so you do not rush the sextuplet subdivision.',
      remediationActionText: 'Work with quarter-note click at comfortable tempo',
    },
    {
      id: 'dep-ssr-3',
      skillId: 'rud-six-stroke-roll',
      requiredSkillId: 'grv-worship-44',
      anchorGrooveId: 'ag-basic-44',
      name: 'Basic 8th-Note Anchor Groove Stability',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'APPLICABLE',
      reason: 'A simple groove provides the stable musical frame for fill entry and Beat 1 recovery.',
      remediationActionText: 'Lock 2 bars of steady 8th-note groove at 75 BPM',
    },
    {
      id: 'dep-ssr-4',
      skillId: 'rud-six-stroke-roll',
      name: 'Beat 4 Fill Entry Timing',
      requiredConceptKey: 'beat_4_entry',
      dependencyType: 'PLACEMENT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'You must anticipate Beat 3.5 without stopping the hi-hat early.',
      remediationActionText: 'Count "1-2-3" aloud and enter precisely on Beat 4',
    },
    {
      id: 'dep-ssr-5',
      skillId: 'rud-six-stroke-roll',
      name: 'Beat 1 Crash & Kick Landing',
      requiredConceptKey: 'beat_1_landing',
      dependencyType: 'PLACEMENT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'The phrase is only musical if it lands decisively on the next downbeat.',
      remediationActionText: 'Practice stopping the fill with a synchronized crash + kick on 1',
    },
    {
      id: 'dep-ssr-6',
      skillId: 'rud-six-stroke-roll',
      name: 'Tom-to-Tom Voice Orchestration',
      dependencyType: 'PLACEMENT',
      importance: 'OPTIONAL',
      prerequisiteClassification: 'ENRICHMENT',
      minimumEvidenceState: 'DISCOVERED',
      reason: 'Moving the six strokes around the kit voices enriches musical color once snare placement is secure.',
      remediationActionText: 'Distribute accents to high tom and floor tom',
    },
  ],

  'coord-rlk': [
    {
      id: 'dep-rlk-1',
      skillId: 'coord-rlk',
      name: 'R-L-K Linear Coordination Mechanics',
      dependencyType: 'COORDINATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'Hands and kick pedal must trigger strictly in sequence without overlapping or flamming.',
      remediationActionText: 'Slow pad + pedal isolation at 60 BPM',
    },
    {
      id: 'dep-rlk-2',
      skillId: 'coord-rlk',
      name: 'Triplet Subdivision Precision',
      requiredConceptKey: 'subdivision_triplets',
      dependencyType: 'RHYTHM',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'The 3-note phrase must sit evenly across triplet grid divisions.',
      remediationActionText: 'Speak "1-trip-let 2-trip-let" with click',
    },
    {
      id: 'dep-rlk-3',
      skillId: 'coord-rlk',
      anchorGrooveId: 'ag-basic-44',
      name: 'Basic Anchor Groove Container',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'APPLICABLE',
      reason: 'Provides a stable rhythmic bed before and after the 3-note linear burst.',
      remediationActionText: 'Hold steady 4/4 groove before fill entry',
    },
    {
      id: 'dep-rlk-4',
      skillId: 'coord-rlk',
      name: 'Beat 4 Linear Fill Insertion',
      requiredConceptKey: 'beat_4_entry',
      dependencyType: 'PLACEMENT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Clean transition from groove hands to linear right hand lead.',
    },
  ],

  'rud-single-paradiddle': [
    {
      id: 'dep-spd-1',
      skillId: 'rud-single-paradiddle',
      name: 'Single Paradiddle Pad Sticking (R L R R L R L L)',
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'Accent on stroke 1 with low tap double rebound is mandatory before kit movement.',
      remediationActionText: 'Isolate paradiddle sticking on pad with accent control',
    },
    {
      id: 'dep-spd-2',
      skillId: 'rud-single-paradiddle',
      name: '16th-Note Subdivision Flow',
      requiredConceptKey: 'subdivision_16th',
      dependencyType: 'RHYTHM',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'Must maintain seamless 1 e & a pacing without double-stroke compression.',
    },
    {
      id: 'dep-spd-3',
      skillId: 'rud-single-paradiddle',
      anchorGrooveId: 'ag-basic-44',
      name: 'Basic 8th-Note Anchor Groove',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'APPLICABLE',
      reason: 'Gives the paradiddle fill a musical context to depart from and return to.',
    },
  ],

  'grv-worship-68': [
    {
      id: 'dep-w68-1',
      skillId: 'grv-worship-68',
      name: '6/8 Compound Pulse Internalization',
      requiredConceptKey: 'pulse_68',
      dependencyType: 'RHYTHM',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'Internalize the two dotted-quarter master pulses (1 - - 2 - -) in 6/8 meter.',
      remediationActionText: 'Count 1-2-3 4-5-6 with accent on 1 and 4',
    },
    {
      id: 'dep-w68-2',
      skillId: 'grv-worship-68',
      name: 'Snare Backbeat on Beat 4 Coordination',
      dependencyType: 'COORDINATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'In 6/8, the primary backbeat rests on beat 4, unlike 4/4 where it sits on 2 and 4.',
    },
  ],

  'rud-double-stroke': [
    {
      id: 'dep-dsr-1',
      skillId: 'rud-double-stroke',
      name: 'Fulcrum Looseness & Rebound Control',
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Doubles must bounce naturally off the drumhead/pad rather than being forced by tension.',
      remediationActionText: 'Loose wrist drop and second stroke finger snap',
    },
    {
      id: 'dep-dsr-2',
      skillId: 'rud-double-stroke',
      name: 'Left & Right Hand Volume Balance',
      dependencyType: 'COORDINATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Ensure the non-dominant double stroke matches the primary hand in volume and height.',
    },
  ],

  'time-quarter-pulse': [
    {
      id: 'dep-qp-1',
      skillId: 'time-quarter-pulse',
      name: 'Relaxed Downbeat Stroke Mechanics',
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Consistent stick height and relaxed wrist drop on every downbeat.',
      remediationActionText: 'Isolate relaxed single downbeat strokes with metronome',
    },
    {
      id: 'dep-qp-2',
      skillId: 'reading-eighth-notes',
      name: 'Eighth-Note Subdivision Grid',
      requiredConceptKey: 'subdivision_8th',
      dependencyType: 'RHYTHM',
      importance: 'RECOMMENDED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'LEARNING',
      reason: 'Internal vocal counting ("1 & 2 & 3 & 4 &") prevents rushing or dragging on downbeats.',
      remediationActionText: 'Count 8th-note subdivisions aloud over quarter clicks',
    },
    {
      id: 'dep-qp-3',
      skillId: 'time-quarter-pulse',
      name: '4/4 Metronomic Pulse Alignment',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Sustained pulse stability across 8 consecutive bars at 60-80 BPM.',
    },
  ],

  'comp-pulse-quarter': [
    {
      id: 'dep-cpq-1',
      skillId: 'time-quarter-pulse',
      name: 'Relaxed Downbeat Stroke Mechanics',
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Consistent stick height and relaxed wrist drop on every downbeat.',
      remediationActionText: 'Isolate relaxed single downbeat strokes with metronome',
    },
    {
      id: 'dep-cpq-2',
      skillId: 'reading-eighth-notes',
      name: 'Eighth-Note Subdivision Grid',
      requiredConceptKey: 'subdivision_8th',
      dependencyType: 'RHYTHM',
      importance: 'RECOMMENDED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'LEARNING',
      reason: 'Internal vocal counting ("1 & 2 & 3 & 4 &") prevents rushing or dragging on downbeats.',
      remediationActionText: 'Count 8th-note subdivisions aloud over quarter clicks',
    },
    {
      id: 'dep-cpq-3',
      skillId: 'time-quarter-pulse',
      name: '4/4 Metronomic Pulse Alignment',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Sustained pulse stability across 8 consecutive bars at 60-80 BPM.',
    },
  ],
};

// ============================================================================
// 3. ROADMAP DECISION ENGINE & PREREQUISITE EVALUATOR
// ============================================================================

export function evaluateSkillRoadmap(
  targetSkill: GranularSkill,
  allSkills: GranularSkill[],
  profile?: LearnerProfile
): RoadmapDecision {
  const skillId = targetSkill.id;
  const attempts = getAttemptsForSkill(skillId);
  const evidence = getSkillEvidenceMemory(skillId);
  const placementMem = derivePlacementEvidenceMemory(skillId);

  // Get raw dependencies or generate generic granular dependencies
  let rawDeps = BUILTIN_SKILL_DEPENDENCIES[skillId];
  if (!rawDeps || rawDeps.length === 0) {
    rawDeps = generateDefaultDependenciesForSkill(targetSkill);
  }

  // Evaluate each dependency against learner's actual evidence
  const evaluatedDeps: EvaluatedDependency[] = rawDeps.map((dep) => {
    return evaluateSingleDependency(dep, allSkills, targetSkill);
  });

  const satisfiedDeps = evaluatedDeps.filter((d) => d.state === 'SATISFIED');
  const weakDeps = evaluatedDeps.filter((d) => d.state === 'WEAK');
  const missingDeps = evaluatedDeps.filter((d) => d.state === 'MISSING' || d.state === 'UNKNOWN');

  // Check if any REQUIRED dependency is missing or weak
  const blockingDeps = [...missingDeps, ...weakDeps].filter(
    (d) => d.dependency.importance === 'REQUIRED'
  );

  // Determine Curriculum Stage: UNDERSTAND → CONTROL → PLACE → TRANSFER → VARY → CREATE
  const curriculumStage = determineCurriculumStage(targetSkill, evidence, placementMem);

  // Determine Selected Supporting Groove
  const grooveDep = evaluatedDeps.find((d) => d.dependency.dependencyType === 'GROOVE_CONTEXT');
  const selectedAnchorGroove = grooveDep?.anchorGroove || selectBestAnchorGrooveForSkill(targetSkill, profile, 2);

  // Check supporting groove evidence state specifically
  const supportingSkillObj = allSkills.find(
    (s) => s.id === (grooveDep?.dependency.requiredSkillId || selectedAnchorGroove.skillIdMapping)
  );

  let supportingGrooveEvidenceState: DependencyEvidenceState = 'SATISFIED';
  if (supportingSkillObj) {
    if (supportingSkillObj.status === 'NOT_STARTED' || supportingSkillObj.status === 'DISCOVERED') {
      supportingGrooveEvidenceState = 'WEAK';
    }
  }

  // If groove dependency is specifically weak or missing in evaluated list
  if (grooveDep && grooveDep.state !== 'SATISFIED') {
    supportingGrooveEvidenceState = grooveDep.state;
  }

  // Derive Next Step & Human-Readable Explanations
  const {
    recommendedNextStep,
    roadmapReason,
    estimatedPracticeFocus,
    currentGoal,
    whyThisNext,
  } = deriveRoadmapNextStepInfo(
    targetSkill,
    curriculumStage,
    satisfiedDeps,
    weakDeps,
    missingDeps,
    selectedAnchorGroove,
    supportingGrooveEvidenceState
  );

  return {
    targetSkillId: targetSkill.id,
    targetSkillName: targetSkill.name,
    currentGoal,
    curriculumStage,
    dependencies: evaluatedDeps,
    satisfiedDependencies: satisfiedDeps,
    weakDependencies: weakDeps,
    missingDependencies: missingDeps,
    hasBlockingPrerequisites: blockingDeps.length > 0,
    recommendedNextStep,
    roadmapReason,
    estimatedPracticeFocus,
    supportingSkill: {
      id: supportingSkillObj?.id || selectedAnchorGroove.id,
      name: selectedAnchorGroove.name,
      roleExplanation: selectedAnchorGroove.pedagogicalRole,
      anchorGroove: selectedAnchorGroove,
      needsMiniLesson: supportingGrooveEvidenceState === 'WEAK' || supportingGrooveEvidenceState === 'MISSING',
      evidenceState: supportingGrooveEvidenceState,
    },
    whyThisNext,
    futureStages: {
      varyStageSummary: 'Explore dynamic accents, phrase entry displacement (Beat 3, Beat 4.5), and kit voice orchestration.',
      createStageSummary: 'Invent your own 1-beat and 2-beat fills using this vocabulary inside varied musical song forms.',
    },
    miniLessonAvailable: supportingGrooveEvidenceState !== 'SATISFIED',
  };
}

/**
 * Evaluates a single dependency deterministically based on real recorded evidence
 */
function evaluateSingleDependency(
  dep: SkillDependency,
  allSkills: GranularSkill[],
  targetSkill: GranularSkill
): EvaluatedDependency {
  let state: DependencyEvidenceState = 'UNKNOWN';
  let explanation = '';
  let anchorGroove: AnchorGroove | undefined;
  let skillRef: GranularSkill | undefined;

  if (dep.anchorGrooveId) {
    anchorGroove = getAnchorGrooveById(dep.anchorGrooveId);
  }

  // 1. If dependency maps to another skill in the library
  if (dep.requiredSkillId) {
    skillRef = allSkills.find((s) => s.id === dep.requiredSkillId);
    if (skillRef) {
      const mem = getSkillEvidenceMemory(skillRef.id);
      const isClean = skillRef.status === 'CLEAN' || skillRef.status === 'APPLICABLE' || skillRef.status === 'MUSICAL' || skillRef.status === 'MASTERED';
      
      if (isClean || (mem.highestCleanBpm && mem.highestCleanBpm >= (skillRef.targetTempo ? skillRef.targetTempo * 0.75 : 70))) {
        state = 'SATISFIED';
        explanation = `Clean evidence established for ${skillRef.name} (${mem.currentWorkingBpm || 75} BPM).`;
      } else if (skillRef.status === 'LEARNING' || mem.totalAttempts > 0) {
        state = 'WEAK';
        explanation = `${skillRef.name} is currently in progress; groove stability needs short reinforcement.`;
      } else {
        state = 'MISSING';
        explanation = `No practice attempts yet recorded for ${skillRef.name}.`;
      }
    }
  }

  // 2. If it's an isolated execution check for the target skill itself
  if (state === 'UNKNOWN' && dep.dependencyType === 'FOUNDATION') {
    const targetMem = getSkillEvidenceMemory(targetSkill.id);
    if (targetSkill.status === 'CLEAN' || targetSkill.status === 'APPLICABLE' || targetSkill.status === 'MUSICAL' || targetSkill.status === 'MASTERED' || (targetMem.highestCleanBpm && targetMem.cleanAttempts >= 2)) {
      state = 'SATISFIED';
      explanation = `Solid isolated execution confirmed (${targetMem.highestCleanBpm || targetSkill.currentComfortTempo || 80} BPM).`;
    } else if (targetMem.totalAttempts > 0 || targetSkill.status === 'LEARNING') {
      state = 'WEAK';
      explanation = `Isolated mechanics developing; ensure sticking and accents are relaxed.`;
    } else {
      state = 'MISSING';
      explanation = `Isolated pad mechanics need initial practice before application.`;
    }
  }

  // 3. If it's a placement concept check
  if (state === 'UNKNOWN' && dep.dependencyType === 'PLACEMENT') {
    const placementMem = derivePlacementEvidenceMemory(targetSkill.id);
    if (dep.requiredConceptKey === 'beat_1_landing') {
      if (placementMem.successfulDownbeatLandings >= 2) {
        state = 'SATISFIED';
        explanation = `Consistent Beat 1 landings recorded (${placementMem.successfulDownbeatLandings} clean downbeats).`;
      } else if (placementMem.totalPlacementAttempts > 0) {
        state = 'WEAK';
        explanation = `Landing on Beat 1 needs focus during fill exit.`;
      } else {
        state = 'SATISFIED'; // Conceptually ready to practice
        explanation = `Ready to establish first downbeat landing reps.`;
      }
    } else {
      if (placementMem.successfulOneBeatPlacements >= 2) {
        state = 'SATISFIED';
        explanation = `1-beat fill entries confirmed cleanly.`;
      } else {
        state = 'WEAK';
        explanation = `Anticipate the phrase entry without hesitating.`;
      }
    }
  }

  // 4. Default fallback for standard rhythm/pulse concepts
  if (state === 'UNKNOWN') {
    state = 'SATISFIED';
    explanation = `Concept understood; ready to apply in structured context.`;
  }

  return {
    dependency: dep,
    state,
    evidenceExplanation: explanation,
    prerequisiteClassification: dep.prerequisiteClassification || (dep.dependencyType === 'GROOVE_CONTEXT' ? 'SUPPORTING' : dep.importance === 'OPTIONAL' ? 'ENRICHMENT' : 'HARD'),
    anchorGroove,
    skillReference: skillRef,
  };
}

/**
 * Determines curriculum stage: UNDERSTAND → CONTROL → PLACE → TRANSFER → VARY → CREATE
 */
function determineCurriculumStage(
  skill: GranularSkill,
  evidence: ReturnType<typeof getSkillEvidenceMemory>,
  placementMem: ReturnType<typeof derivePlacementEvidenceMemory>
): CurriculumStage {
  if (skill.status === 'NOT_STARTED' || (skill.status === 'DISCOVERED' && evidence.totalAttempts === 0)) {
    return 'UNDERSTAND';
  }

  if (skill.status === 'LEARNING' || (evidence.cleanAttempts < 2 && !placementMem.totalPlacementAttempts)) {
    return 'CONTROL';
  }

  if (placementMem.oneBeatStatus !== 'Established' || placementMem.twoBeatStatus !== 'Established') {
    return 'PLACE';
  }

  if (skill.status === 'APPLICABLE' || placementMem.twoBeatStatus === 'Established') {
    if (skill.category.toLowerCase().includes('linear') || skill.parentTrack === 'rudiments') {
      return 'TRANSFER';
    }
    return 'VARY';
  }

  if (skill.status === 'MUSICAL' || skill.status === 'MASTERED') {
    return 'CREATE';
  }

  return 'PLACE';
}

/**
 * Builds musical, human-readable next-step guidance
 */
function deriveRoadmapNextStepInfo(
  targetSkill: GranularSkill,
  stage: CurriculumStage,
  satisfied: EvaluatedDependency[],
  weak: EvaluatedDependency[],
  missing: EvaluatedDependency[],
  anchorGroove: AnchorGroove,
  supportingGrooveState: DependencyEvidenceState
) {
  let recommendedNextStep: RoadmapNextStepType = 'TARGET_APPLICATION';
  let currentGoal = `Apply ${targetSkill.name} cleanly as a musical phrase`;
  let roadmapReason = '';
  let estimatedPracticeFocus = '';

  const alreadyHaveList: string[] = [];
  satisfied.forEach((s) => alreadyHaveList.push(s.dependency.name));
  if (alreadyHaveList.length === 0) {
    alreadyHaveList.push(`Basic understanding of ${targetSkill.name}`);
  }

  let usingSupporting = anchorGroove.name;
  let reason = `A simple groove gives you a stable musical frame so you can focus on entering the fill and landing correctly.`;
  let todayGoal = `Groove → Fill → Beat 1 → Groove`;
  let nextAfterThis = `Two-beat phrase length & dynamic orchestration`;

  if (
    targetSkill.id === 'time-quarter-pulse' ||
    targetSkill.id === 'comp-pulse-quarter' ||
    targetSkill.id.startsWith('time-') ||
    targetSkill.id.includes('pulse')
  ) {
    recommendedNextStep = 'TARGET_APPLICATION';
    currentGoal = `Build steady pulse lock & relaxed stroke consistency on ${targetSkill.name}`;
    roadmapReason = `Quarter-note pulse stability is the foundational anchor of all drumming. Solidifying steady downbeats with metronome and vocal counting guarantees rock-solid timing before complex subdivisions.`;
    estimatedPracticeFocus = `Metronome lock at 60-80 BPM, relaxed wrist mechanics, and counting "1 2 3 4" aloud.`;
    usingSupporting = anchorGroove.name || 'Quarter-Note Pulse in Song Context';
    reason = `Song context and metronomic reference provide an engaging musical container for internalizing downbeat spacing.`;
    todayGoal = `Sustain steady quarter-note pulse grid reps at 60-80 BPM locked with click`;
    nextAfterThis = `Eighth-note subdivision counting alignment & song context integration`;
  } else if (stage === 'UNDERSTAND') {
    recommendedNextStep = 'BUILD_DEPENDENCY';
    currentGoal = `Learn sticking pattern & mechanics for ${targetSkill.name}`;
    roadmapReason = `Establish hand mechanics, stroke sequence, and relaxed rebound before applying in musical phrases.`;
    estimatedPracticeFocus = `Slow pad reps, voice counting, and accent clarity.`;
    usingSupporting = 'Pad Pulse';
    reason = `Isolate the hand motions so the brain learns the pattern without coordination distractions.`;
    todayGoal = `Execute 8 clean repetitions with relaxed wrist motion`;
    nextAfterThis = `Steady tempo ladder (Control Stage)`;
  } else if (stage === 'CONTROL') {
    recommendedNextStep = 'CONTINUE_TARGET';
    currentGoal = `Build relaxed control & consistency on ${targetSkill.name}`;
    roadmapReason = `Increase comfort tempo and eliminate hand tension before placing inside groove phrases.`;
    estimatedPracticeFocus = `Consistent rebound, balanced volume, and working tempo stabilization.`;
    usingSupporting = 'Quarter-Note Click';
    reason = `Internalize even stroke timing with steady metronomic reference.`;
    todayGoal = `Sustain steady 1-minute reps at comfortable BPM`;
    nextAfterThis = `1-beat musical fill placement`;
  } else if (stage === 'PLACE') {
    if (supportingGrooveState === 'WEAK' || supportingGrooveState === 'MISSING') {
      recommendedNextStep = 'REFRESH_DEPENDENCY';
      currentGoal = `Stabilize supporting groove before placing ${targetSkill.name}`;
      roadmapReason = `You're ready for the fill, but the groove underneath it is still developing. A brief anchor groove refresh ensures a rock-solid foundation.`;
      estimatedPracticeFocus = `3-minute anchor groove lock → 1-beat fill placement.`;
      todayGoal = `Lock 2 bars of groove → clean Beat 4 fill entry → Beat 1 crash landing`;
      nextAfterThis = `Extend phrase to 2 beats`;
    } else {
      recommendedNextStep = 'TARGET_APPLICATION';
      currentGoal = `Master 1-beat fill placement and Beat 1 crash arrival`;
      roadmapReason = `Seamless phrase entry on Beat 4 with accurate downbeat recovery.`;
      estimatedPracticeFocus = `Groove consistency, clean entry on Beat 4, and instant groove recovery on Beat 2.`;
      todayGoal = `Groove → Fill → Beat 1 Crash → Back to Groove`;
      nextAfterThis = `Two-beat placement & drum kit voice distribution`;
    }
  } else if (stage === 'TRANSFER') {
    recommendedNextStep = 'TRANSFER';
    currentGoal = `Orchestrate ${targetSkill.name} across toms and cymbals`;
    roadmapReason = `Move the sticking pattern off the snare to floor tom, rack toms, and accents while holding groove time.`;
    estimatedPracticeFocus = `Pad-to-kit voice assignment and spatial movement.`;
    todayGoal = `Execute orchestrated fill phrase around drum kit voice map`;
    nextAfterThis = `Dynamic accents & phrasing variation`;
  } else if (stage === 'VARY') {
    recommendedNextStep = 'VARY';
    currentGoal = `Explore phrasing variations and displaced entries`;
    roadmapReason = `Test phrase flexibility by varying starting points (Beat 3 vs Beat 4) and accent dynamics.`;
    estimatedPracticeFocus = `Accent displacement and alternate phrase lengths.`;
    todayGoal = `Place fill from alternate starting points without hesitating`;
    nextAfterThis = `Creative vocabulary combinations`;
  } else {
    // CREATE
    recommendedNextStep = 'CREATE';
    currentGoal = `Musical improvisation and creative fill creation`;
    roadmapReason = `Choose and combine ${targetSkill.name} with other known vocabulary under real musical song pressure.`;
    estimatedPracticeFocus = `Musical choice-making, dynamic shaping, and genre context.`;
    todayGoal = `Create custom fill variations inside full song groove`;
    nextAfterThis = `Mastery consolidation`;
  }

  return {
    recommendedNextStep,
    currentGoal,
    roadmapReason,
    estimatedPracticeFocus,
    whyThisNext: {
      targetName: targetSkill.name,
      alreadyHave: alreadyHaveList.slice(0, 3),
      usingSupporting,
      reason,
      todayGoal,
      nextAfterThis,
    },
  };
}

/**
 * Generates default granular dependencies for skills not in the static map
 */
function generateDefaultDependenciesForSkill(skill: GranularSkill): SkillDependency[] {
  const isRudiment = skill.parentTrack === 'rudiments';
  const isGroove = skill.parentTrack === 'grooves';

  if (isGroove) {
    return [
      {
        id: `dep-auto-${skill.id}-1`,
        skillId: skill.id,
        name: 'Basic Pulse Internalization',
        dependencyType: 'RHYTHM',
        importance: 'REQUIRED',
        prerequisiteClassification: 'HARD',
        minimumEvidenceState: 'CLEAN',
        reason: 'Hold steady internal quarter-note pulse across meter.',
      },
      {
        id: `dep-auto-${skill.id}-2`,
        skillId: skill.id,
        name: 'Backbeat & Bass Drum Independence',
        dependencyType: 'COORDINATION',
        importance: 'REQUIRED',
        prerequisiteClassification: 'HARD',
        minimumEvidenceState: 'LEARNING',
        reason: 'Coordinate kick pedal patterns against independent snare backbeats.',
      },
      {
        id: `dep-auto-${skill.id}-3`,
        skillId: skill.id,
        name: 'Dynamic Ghost Note Nuance',
        dependencyType: 'MUSICAL_CONTEXT',
        importance: 'OPTIONAL',
        prerequisiteClassification: 'ENRICHMENT',
        minimumEvidenceState: 'DISCOVERED',
        reason: 'Adds dynamic softness between primary backbeats once pocket is locked.',
      },
    ];
  }

  return [
    {
      id: `dep-auto-${skill.id}-1`,
      skillId: skill.id,
      name: `${skill.name} Isolated Mechanics`,
      dependencyType: 'FOUNDATION',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'CLEAN',
      reason: 'Pattern sticking and rebound mechanics must be relaxed before musical application.',
    },
    {
      id: `dep-auto-${skill.id}-2`,
      skillId: skill.id,
      anchorGrooveId: 'ag-basic-44',
      name: 'Basic 8th-Note Anchor Groove',
      dependencyType: 'GROOVE_CONTEXT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'SUPPORTING',
      minimumEvidenceState: 'APPLICABLE',
      reason: 'Provides a simple musical container so you can focus on fill entry and exit.',
    },
    {
      id: `dep-auto-${skill.id}-3`,
      skillId: skill.id,
      name: 'Beat 1 Downbeat Landing',
      requiredConceptKey: 'beat_1_landing',
      dependencyType: 'PLACEMENT',
      importance: 'REQUIRED',
      prerequisiteClassification: 'HARD',
      minimumEvidenceState: 'LEARNING',
      reason: 'Land crash and kick firmly on Beat 1 to anchor the next musical bar.',
    },
    {
      id: `dep-auto-${skill.id}-4`,
      skillId: skill.id,
      name: 'Tom Voice Movement Variation',
      dependencyType: 'PLACEMENT',
      importance: 'OPTIONAL',
      prerequisiteClassification: 'ENRICHMENT',
      minimumEvidenceState: 'DISCOVERED',
      reason: 'Distributes notes around the kit once initial snare phrase is consistent.',
    },
  ];
}

// ============================================================================
// 4. ACTIVE LEARNING THREADS ENGINE (1–3 Active Focus Goals)
// ============================================================================

const ACTIVE_THREADS_STORAGE_KEY = 'RUDIMENT_ACTIVE_THREADS_V1';

/**
 * Harmonizes active threads strictly with the canonical curriculum target:
 * Thread 1: Primary canonical active competency
 * Thread 2: Supporting repair or prerequisite gap
 * Thread 3: Application / Song performance target
 */
export function getHarmonizedActiveThreads(
  skills: GranularSkill[] = []
): ActiveLearningThread[] {
  const { activeUnitId, activeCompetencyId } = deriveCurrentCurriculumPosition(skills);
  const activeUnit = CURRICULUM_UNITS_BY_ID.get(activeUnitId) || CANONICAL_CURRICULUM_UNITS[0];
  const activeComp = CURRICULUM_COMPETENCIES_BY_ID.get(activeCompetencyId) || CANONICAL_CURRICULUM_COMPETENCIES[0];

  const primarySkill = skills.find((s) => s.id === activeComp.skillId) || ({
    id: activeComp.skillId,
    name: activeComp.title,
    status: 'LEARNING',
  } as GranularSkill);

  const thread1: ActiveLearningThread = {
    id: `thread-canonical-primary-${activeComp.id}`,
    skillId: primarySkill.id,
    skillName: activeComp.title,
    goal: activeComp.musicalApplicationRequirement || activeComp.description,
    currentStep: activeComp.tempoStandard.standardText,
    nextStep: 'Unit Checkpoint & Practical Verification',
    curriculumStage: 'CONTROL',
    supportingGrooveName: activeUnit.title,
    dateStarted: new Date().toISOString(),
    lastPracticedAt: null,
    priorityOrder: 1,
    isPinned: true,
  };

  // Find supporting repair target
  let repairComp = null;
  if (activeComp.prerequisiteCompetencyIds.length > 0) {
    for (const prereqId of activeComp.prerequisiteCompetencyIds) {
      const p = CURRICULUM_COMPETENCIES_BY_ID.get(prereqId);
      if (p) {
        repairComp = p;
        break;
      }
    }
  }
  if (!repairComp) {
    repairComp = CANONICAL_CURRICULUM_COMPETENCIES.find(
      (c) => c.id !== activeComp.id && c.unitId === activeUnit.id
    ) || CANONICAL_CURRICULUM_COMPETENCIES[0];
  }

  const thread2: ActiveLearningThread = {
    id: `thread-canonical-repair-${repairComp.id}`,
    skillId: repairComp.skillId,
    skillName: repairComp.title,
    goal: `Supporting foundation for ${activeComp.title}`,
    currentStep: repairComp.tempoStandard.standardText,
    nextStep: 'Subdivision alignment & relaxed mechanics',
    curriculumStage: 'UNDERSTAND',
    supportingGrooveName: 'Foundational Review',
    dateStarted: new Date().toISOString(),
    lastPracticedAt: null,
    priorityOrder: 2,
  };

  // Thread 3: Song / groove application target
  const songName = activeComp.songTags[0] || 'Standard Backbeat Application';
  const thread3: ActiveLearningThread = {
    id: `thread-canonical-app-${activeComp.id}`,
    skillId: primarySkill.id,
    skillName: `${activeComp.title} in Song Context`,
    goal: `Integrate into real musical phrasing: ${songName}`,
    currentStep: 'Song form transitions & Beat 1 recovery',
    nextStep: 'Performance tempo stability',
    curriculumStage: 'PLACE',
    supportingGrooveName: songName,
    dateStarted: new Date().toISOString(),
    lastPracticedAt: null,
    priorityOrder: 3,
  };

  return [thread1, thread2, thread3];
}

export function getActiveLearningThreads(skills: GranularSkill[] = []): ActiveLearningThread[] {
  try {
    const raw = localStorage.getItem(ACTIVE_THREADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Detect legacy unharmonized threads (e.g., hardcoded six-stroke or mismatched target)
        const isLegacySixStroke = parsed.some((t) => t.id === 'thread-six-stroke');
        const primaryThread = parsed[0];
        const { activeCompetencyId } = deriveCurrentCurriculumPosition(skills);
        const isMismatched = !primaryThread || !primaryThread.id.includes(activeCompetencyId);
        if (isLegacySixStroke || isMismatched) {
          const harmonized = getHarmonizedActiveThreads(skills);
          saveActiveLearningThreads(harmonized);
          return harmonized;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load active threads:', e);
  }
  const initial = getHarmonizedActiveThreads(skills);
  saveActiveLearningThreads(initial);
  return initial;
}

export function saveActiveLearningThreads(threads: ActiveLearningThread[]): void {
  try {
    // Enforce 1-3 active threads ceiling
    const capped = threads.slice(0, 3);
    localStorage.setItem(ACTIVE_THREADS_STORAGE_KEY, JSON.stringify(capped));
  } catch (e) {
    console.error('Failed to save active threads:', e);
  }
}

export function addSkillToActiveThreads(
  skill: GranularSkill,
  replaceIndex?: number
): ActiveLearningThread[] {
  const current = getActiveLearningThreads();
  const existingIdx = current.findIndex((t) => t.skillId === skill.id);
  if (existingIdx >= 0) return current; // Already active

  const newThread: ActiveLearningThread = {
    id: `thread-${skill.id}-${Date.now()}`,
    skillId: skill.id,
    skillName: skill.name,
    goal: `Develop ${skill.name} toward musical application`,
    currentStep: skill.status === 'NOT_STARTED' ? 'Pattern Mechanics & Sound' : 'Musical Placement & Timing',
    nextStep: 'Phrasing & Kit Orchestration',
    curriculumStage: skill.status === 'NOT_STARTED' ? 'UNDERSTAND' : 'PLACE',
    supportingGrooveName: 'Basic 8th-Note Groove',
    dateStarted: new Date().toISOString(),
    lastPracticedAt: null,
    priorityOrder: current.length + 1,
  };

  let updated: ActiveLearningThread[];
  if (current.length < 3) {
    updated = [...current, newThread];
  } else if (typeof replaceIndex === 'number' && replaceIndex >= 0 && replaceIndex < current.length) {
    updated = [...current];
    updated[replaceIndex] = newThread;
  } else {
    // Replace lowest priority non-pinned thread
    const unpinnedIdx = current.findIndex((t) => !t.isPinned);
    const replaceTarget = unpinnedIdx >= 0 ? unpinnedIdx : current.length - 1;
    updated = [...current];
    updated[replaceTarget] = newThread;
  }

  saveActiveLearningThreads(updated);
  return updated;
}

// ============================================================================
// 5. RETURN-TO-TARGET MEMORY (Interrupted Prerequisite Mini-Lessons)
// ============================================================================

const RETURN_TARGET_STORAGE_KEY = 'RUDIMENT_RETURN_TARGET_V1';

export function getStoredReturnToTargetMemory(): ReturnToTargetMemory | null {
  try {
    const raw = localStorage.getItem(RETURN_TARGET_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load return target memory:', e);
  }
  return null;
}

export function setStoredReturnToTargetMemory(memory: ReturnToTargetMemory): void {
  try {
    localStorage.setItem(RETURN_TARGET_STORAGE_KEY, JSON.stringify(memory));
  } catch (e) {
    console.error('Failed to store return target memory:', e);
  }
}

export function clearStoredReturnToTargetMemory(): void {
  try {
    localStorage.removeItem(RETURN_TARGET_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear return target memory:', e);
  }
}

// ============================================================================
// 6. MINI DEPENDENCY LESSON GENERATOR (Focused 3–5 min Foundation Block)
// ============================================================================

export function generateSupportingGrooveMiniLesson(
  targetSkill: GranularSkill,
  anchorGroove: AnchorGroove,
  equipment: EquipmentOption = 'Practice Pad'
): PracticeSession {
  const bpm = anchorGroove.bpmRange.default;
  const isPad = equipment === 'Practice Pad';

  // Save return-to-target memory so learner automatically returns after this block
  setStoredReturnToTargetMemory({
    returnTargetSkillId: targetSkill.id,
    returnTargetSkillName: targetSkill.name,
    returnTargetExerciseType: 'musical_placement',
    dependencyReason: `Supporting groove foundation for ${targetSkill.name} placement`,
    interruptedAt: new Date().toISOString(),
    supportingSkillId: anchorGroove.id,
    supportingSkillName: anchorGroove.name,
    anchorGrooveId: anchorGroove.id,
  });

  const exercises: PracticeExercise[] = [
    {
      id: `mini-groove-demo-${Date.now()}`,
      title: `1. Hear the Container: ${anchorGroove.name}`,
      phase: 'FOUNDATION',
      pedagogicalRole: 'PREPARATION',
      whyThisExercise: 'Hear how the steady pulse creates a stable container for your fill.',
      skillIds: [anchorGroove.skillIdMapping || targetSkill.id],
      purpose: `Hear how the steady pulse creates a stable container for your fill`,
      instructions: `Listen and observe the steady 8th-note pulse and downbeat pulse at ${bpm} BPM. Notice where Beat 4 sits.`,
      sticking: anchorGroove.stickingOrPattern,
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: anchorGroove.timeSignature,
      subdivision: '8th Notes',
      tempo: bpm,
      durationSeconds: 60,
      exerciseType: 'groove',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
      padAdaptationNote: isPad
        ? 'Tap right hand on center zone for hi-hat, left hand on rim/accent for snare backbeat.'
        : undefined,
    },
    {
      id: `mini-groove-follow-${Date.now()}`,
      title: `2. Follow Cues: Lock the Anchor Groove`,
      phase: 'FOUNDATION',
      pedagogicalRole: 'PRIMARY TARGET',
      whyThisExercise: 'Play along with metronomic assistance to internalize steady timekeeping.',
      skillIds: [anchorGroove.skillIdMapping || targetSkill.id],
      purpose: `Play along with metronomic assistance to internalize steady timekeeping`,
      instructions: `Play the groove along with the audio cues. Focus on relaxed arms and perfectly even 8th-note spacing.`,
      sticking: anchorGroove.stickingOrPattern,
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: anchorGroove.timeSignature,
      subdivision: '8th Notes',
      tempo: bpm,
      durationSeconds: 90,
      exerciseType: 'groove',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    },
    {
      id: `mini-groove-indep-${Date.now()}`,
      title: `3. Independent Groove Lock: 2 Steady Bars`,
      phase: 'APPLICATION',
      pedagogicalRole: 'INDEPENDENCE TEST',
      whyThisExercise: 'Hold the groove independently for 2 full bars without rushing before fill entry.',
      skillIds: [anchorGroove.skillIdMapping || targetSkill.id],
      purpose: `Hold the groove independently for 2 full bars without rushing`,
      instructions: `Maintain the groove with internal pulse. Ensure Beat 4 feels steady and prepared.`,
      sticking: anchorGroove.stickingOrPattern,
      counting: '1 & 2 & 3 & 4 & | 1 & 2 & 3 & 4 &',
      timeSignature: anchorGroove.timeSignature,
      subdivision: '8th Notes',
      tempo: bpm,
      durationSeconds: 90,
      exerciseType: 'groove',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    },
    {
      id: `mini-groove-return-prep-${Date.now()}`,
      title: `4. Ready for Placement: Return to ${targetSkill.name}`,
      phase: 'COOL DOWN',
      pedagogicalRole: 'COOL-DOWN',
      whyThisExercise: `Groove foundation established! Ready to insert ${targetSkill.name}.`,
      skillIds: [targetSkill.id],
      purpose: `Groove foundation established! Ready to insert ${targetSkill.name}`,
      instructions: `The musical container is ready. You will now return immediately to ${targetSkill.name} fill placement.`,
      sticking: targetSkill.name,
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: anchorGroove.timeSignature,
      subdivision: '8th Notes',
      tempo: bpm,
      durationSeconds: 30,
      exerciseType: 'technique',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    },
  ];

  const practiceIntent: PracticeIntent = {
    targetSkillId: targetSkill.id,
    targetSkillName: targetSkill.name,
    activeGoal: `Supporting Groove Foundation: ${anchorGroove.name}`,
    targetPhraseLocation: `Groove Bed Foundation (${bpm} BPM)`,
    targetDimension: 'SUPPORTING_CONTEXT',
    limiter: 'CONTEXT',
    limiterDescription: `Groove stability needed to support ${targetSkill.name} placement.`,
    supportingContainer: anchorGroove.name,
    learningTempo: bpm,
    assistanceLevel: 'Full',
    successFocus: [
      'Maintain steady 8th-note pulse with metronome',
      'Keep consistent dynamic balance between hands and kick',
      'Prepare confident Beat 4 timing',
    ],
    adaptiveReason: `Stabilize underlying groove bed before continuing ${targetSkill.name} placement.`,
    evidenceNeeded: '1 clean 2-bar independent groove execution',
    recommendedSnapshot: {
      skillName: targetSkill.name,
      limiter: 'CONTEXT',
      bpm,
      assistance: 'Full',
    },
  };

  return {
    id: `sess-mini-groove-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    durationMinutes: 5,
    actualDurationSeconds: 270,
    practiceContext: 'SKILL_DEVELOPMENT',
    equipment,
    focusMode: 'COACH_CHOOSES',
    selectedSkillIds: [targetSkill.id],
    focusTopic: `Supporting Groove Mini-Foundation (${anchorGroove.name})`,
    notes: `Mini-lesson to establish musical container for ${targetSkill.name} placement.`,
    rating: 5,
    practiceIntent,
    exercises,
    sessionStatus: 'NOT_STARTED',
    isGapClosure: false,
    sessionSource: 'ROADMAP_MINI_FOUNDATION',
  };
}
