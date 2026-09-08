import {
  CurriculumBand,
  StrandId,
  StrandLevel,
  PlacementTest,
  PlacementTestResult,
  DrummerPlacementAssessment,
  LearnerProfile,
  GranularSkill,
  SelfCheckFeeling,
} from '../types';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
} from '../data/canonicalCurriculum';
import {
  recordCanonicalVerification,
  deriveCurrentCurriculumPosition,
  isCompetencyVerified,
} from './canonicalProgressEngine';

const PLACEMENT_STORAGE_KEY = 'RUDIMENT_DRUMMER_PLACEMENT_V1';

// ============================================================================
// CONCRETE PLACEMENT TESTS
// ============================================================================

export const CANONICAL_PLACEMENT_TESTS: PlacementTest[] = [
  {
    id: 'pt-pulse-8th',
    title: 'Quarter Pulse & 8th-Note Counting',
    strandId: 'pulse_reading',
    band: 'BEGINNER',
    tempo: 80,
    subdivision: '8th notes',
    durationBars: 8,
    durationSeconds: 24,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Both',
    taskDescription:
      'Count 1 & 2 & 3 & 4 & aloud while playing alternating 8th notes locked strictly with the click.',
    sticking: 'R L R L R L R L',
    counting: '1 & 2 & 3 & 4 &',
    passCriteria: [
      'Maintains unison alignment with the click on downbeats 1, 2, 3, 4',
      'Even 8th note spacing with no dragging or rushing on the "&"',
      'Zero tension in shoulders, forearms, or wrists',
    ],
    associatedCompetencyId: 'comp-subdiv-8th',
    associatedSkillId: 'time-8th-subdivision',
  },
  {
    id: 'pt-basic-groove',
    title: '4/4 Backbeat & Groove Stability',
    strandId: 'grooves',
    band: 'BEGINNER',
    tempo: 80,
    subdivision: '8th-note rock groove',
    durationBars: 16,
    durationSeconds: 48,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Play 16 unbroken bars of 4/4 groove: kick on 1 and 3, firm snare backbeat on 2 and 4, steady 8th-note hi-hat.',
    sticking: 'RH Hi-Hat, LH Snare, RF Kick',
    counting: '1 & [2] & 3 & [4] &',
    passCriteria: [
      'Snare backbeat lands solidly on 2 and 4 without hesitation or early anticipation',
      'Kick does not flam with hi-hat downbeats on 1 and 3',
      'Volume of cymbals remains controlled beneath punchy kick and snare',
    ],
    associatedCompetencyId: 'comp-grv-backbeat',
    associatedSkillId: 'grv-backbeat',
  },
  {
    id: 'pt-rudiment-control',
    title: 'Singles & Doubles Control on Pad',
    strandId: 'rudiments',
    band: 'BEGINNER',
    tempo: 75,
    subdivision: '16th notes',
    durationBars: 8,
    durationSeconds: 26,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Practice Pad',
    taskDescription:
      'Play 4 bars of single strokes (R L R L) followed immediately by 4 bars of double strokes (R R L L) at 75 BPM.',
    sticking: '4 bars R L R L -> 4 bars R R L L',
    counting: '1 e & a 2 e & a 3 e & a 4 e & a',
    passCriteria: [
      'Even volume and pitch between dominant and non-dominant hand',
      'Second stroke of each double has full rebound (no crushed buzz)',
      'Seamless tempo continuity when transitioning between singles and doubles',
    ],
    associatedCompetencyId: 'comp-rud-singles',
    associatedSkillId: 'rud-single-stroke',
  },
  {
    id: 'pt-fill-recovery',
    title: 'Fill Entry & Beat-1 Crash Recovery',
    strandId: 'fills',
    band: 'BEGINNER',
    tempo: 70,
    subdivision: '16th-note fill into Crash 1',
    durationBars: 8,
    durationSeconds: 28,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Play 2 cycles: 3 bars groove + 1 bar 16th-note descending fill, crashing and returning to groove on Beat 1.',
    sticking: 'Groove -> R L R L around toms -> Crash+Kick on 1',
    counting: '...4 e & a -> [1 CRASH] 2 & 3 & 4 &',
    passCriteria: [
      'Fill begins precisely on beat 1 of bar 4 without hesitation or stutter',
      'Crash cymbal and bass drum strike simultaneously on Beat 1',
      'Groove resumes on Beat 2 with zero pause, hesitation, or tempo drop',
    ],
    associatedCompetencyId: 'comp-fill-recovery',
    associatedSkillId: 'fill-groove-recovery',
  },
  {
    id: 'pt-syncopation',
    title: '16th-Note Syncopation & Kick Independence',
    strandId: 'grooves',
    band: 'INTERMEDIATE',
    tempo: 75,
    subdivision: 'Syncopated 16ths',
    durationBars: 8,
    durationSeconds: 26,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Play an 8-bar groove featuring kick on beat 1 and the "&" of beat 2 while maintaining uninterrupted 8th-note hi-hats.',
    sticking: 'Kick on 1 and 2-and; Snare on 2 and 4; HH steady 8ths',
    counting: '1 & [2] [&] 3 & [4] &',
    passCriteria: [
      'Right hand hi-hat does not stutter or pull late when the kick hits on the offbeat',
      'Backbeats on 2 and 4 remain rock-solid and in time',
      'Clean kick punch without accidental double bounces',
    ],
    associatedCompetencyId: 'comp-time-syncopation',
    associatedSkillId: 'time-syncopation',
  },
  {
    id: 'pt-compound-68',
    title: '6/8 Compound Time & Triplets',
    strandId: 'pulse_reading',
    band: 'INTERMEDIATE',
    tempo: 60,
    subdivision: '6/8 dotted-quarter pulse',
    durationBars: 8,
    durationSeconds: 16,
    meter: '6/8',
    metronomePulsesPerBar: 2,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Play 8 bars of 6/8 groove: feel two main dotted-quarter pulses, snare backbeat on beat 4, smooth 8th note hi-hat.',
    sticking: 'RH 8ths on ride/hat, LH snare on 4, Kick on 1 and 5',
    counting: '1 2 3 [4] 5 6',
    passCriteria: [
      'Clear distinction between rolling 6/8 compound pulse and straight 4/4',
      'Snare backbeat lands consistently on count 4 without rushing',
      'Relaxed rolling triplet motion with no stiffness',
    ],
    associatedCompetencyId: 'comp-meter-68',
    associatedSkillId: 'time-68',
  },
  {
    id: 'pt-linear-rlk',
    title: 'R-L-K Triplet Linear Phrasing',
    strandId: 'coordination_dynamics',
    band: 'INTERMEDIATE',
    tempo: 70,
    subdivision: 'Linear triplets',
    durationBars: 4,
    durationSeconds: 14,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Execute 4 continuous bars of R-L-K triplets across snare, high tom, and kick without overlapping notes.',
    sticking: 'R L K R L K R L K R L K',
    counting: '1 trip let 2 trip let 3 trip let 4 trip let',
    passCriteria: [
      'Zero simultaneous impacts (pure linear flow between limbs)',
      'Bass drum note is equal in volume and authority to hand strokes',
      'Even triplet spacing throughout all 4 bars',
    ],
    associatedCompetencyId: 'comp-coord-rlk',
    associatedSkillId: 'coord-rlk',
  },

  // ---------- ADVANCED PLACEMENT BATTERY ----------
  {
    id: 'pt-adv-32nd-bursts',
    title: '32nd-Note Bursts & Speed Mechanics',
    strandId: 'rudiments',
    band: 'ADVANCED',
    tempo: 65,
    subdivision: '16th into 32nd-note bursts',
    durationBars: 8,
    durationSeconds: 30,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Practice Pad',
    taskDescription:
      'Play 1 bar steady 16ths followed by 1 bar continuous 32nd-note single or double bursts without stiffening.',
    sticking: '16ths -> 32nd bursts (R L R L)',
    counting: '1 e & a -> 32nd burst velocity',
    passCriteria: [
      'Clean micro-timing transition into 32nd bursts',
      'Balanced velocity between right and left hands',
      'Zero tension or stiffening in shoulders, arms, or wrists',
    ],
    associatedCompetencyId: 'comp-subdiv-32nd',
    associatedSkillId: 'time-32nd-notes',
  },
  {
    id: 'pt-adv-flam-control',
    title: 'Flam Accent & Low Grace Note Control',
    strandId: 'rudiments',
    band: 'ADVANCED',
    tempo: 80,
    subdivision: 'Flam accents & tap doubles',
    durationBars: 8,
    durationSeconds: 24,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Practice Pad',
    taskDescription:
      'Play alternating flam accents and low grace notes with low grace height (<2 in) and crisp downbeat accents.',
    sticking: 'lR L R rL R L',
    counting: '1 trip let 2 trip let',
    passCriteria: [
      'Grace notes remain quiet and low without accidental unisons',
      'Consistent accent volume on primary downbeats',
      'Relaxed wrist whipping motion with zero forearm fatigue',
    ],
    associatedCompetencyId: 'comp-rud-flam-accent',
    associatedSkillId: 'rud-flam-accent',
  },
  {
    id: 'pt-adv-shuffle-swing',
    title: 'Texas Shuffle & Swung Pocket Articulation',
    strandId: 'grooves',
    band: 'ADVANCED',
    tempo: 80,
    subdivision: 'Swung Texas shuffle pocket',
    durationBars: 16,
    durationSeconds: 48,
    meter: '4/4',
    metronomePulsesPerBar: 4,
    requiredEquipment: 'Full Drum Kit',
    taskDescription:
      'Play 16 unbroken bars of deep Texas shuffle pocket: swung ride/hat, backbeat on 2 & 4, and quiet ghosted triplet bounce.',
    sticking: 'RH Swung 8ths, LH Snare Backbeat + Ghosts, RF Kick',
    counting: '1 [a] 2 [a] 3 [a] 4 [a]',
    passCriteria: [
      'Consistent swung triplet feel with no flattening into straight 8ths',
      'Snare backbeats on 2 and 4 crack cleanly while ghost chatter stays sotto-voce',
      'Hi-hat foot chick locked firmly on counts 2 and 4',
    ],
    associatedCompetencyId: 'comp-grv-shuffle',
    associatedSkillId: 'grv-half-time-shuffle',
  },
];

// ============================================================================
// ESTIMATION & PLACEMENT LOGIC
// ============================================================================

export const STRAND_DEFINITIONS: Record<StrandId, { name: string; unitIds: string[] }> = {
  pulse_reading: {
    name: 'Pulse, Meter & Reading',
    unitIds: ['unit-b1-pulse', 'unit-i1-syncopation', 'unit-i3-compound-time', 'unit-a4-odd-meters'],
  },
  grooves: {
    name: 'Groove Pocket & Articulation',
    unitIds: ['unit-b2-groove', 'unit-i2-dynamics-hat', 'unit-a3-swing-shuffle'],
  },
  rudiments: {
    name: 'Rudiments & Stick Control',
    unitIds: ['unit-b4-rudiments', 'unit-i4-orchestration', 'unit-a1-speed-micro', 'unit-a2-advanced-rudiments'],
  },
  fills: {
    name: 'Fills & Phrase Transitions',
    unitIds: ['unit-b3-fills', 'unit-i5-linear-groove', 'unit-i6-musicality'],
  },
  coordination_dynamics: {
    name: 'Coordination, Dynamics & Performance',
    unitIds: ['unit-b5-song-app', 'unit-i5-linear-groove', 'unit-i6-musicality', 'unit-a5-mastery'],
  },
};

/**
 * Generate an initial ESTIMATION of drummer band and strand levels
 * from profile self-reports and initial skill states.
 */
export function estimateLearnerBand(
  profile: LearnerProfile,
  skills: GranularSkill[]
): {
  estimatedBand: CurriculumBand;
  strands: Record<StrandId, StrandLevel>;
  activeUnitId: string;
  activeCompetencyId: string;
} {
  // Check self-reported experience level or evidence from skills
  let baseBand: CurriculumBand = 'BEGINNER';
  const years = profile.yearsPlaying ?? 0;
  const selfLevel = profile.selfReportedLevel ?? 'Beginner';

  const cleanCount = skills.filter(
    (s) => s.status === 'CLEAN' || s.status === 'APPLICABLE' || s.status === 'MUSICAL' || s.status === 'MASTERED'
  ).length;

  if (selfLevel === 'Advanced' || years >= 5 || cleanCount >= 16) {
    baseBand = 'ADVANCED';
  } else if (selfLevel === 'Intermediate' || years >= 2 || cleanCount >= 6) {
    baseBand = 'INTERMEDIATE';
  } else {
    baseBand = 'BEGINNER';
  }

  // Calculate per-strand status from competencies
  const strands: Record<StrandId, StrandLevel> = {} as any;

  (Object.keys(STRAND_DEFINITIONS) as StrandId[]).forEach((strandId) => {
    const def = STRAND_DEFINITIONS[strandId];
    const strandCompetencies = CANONICAL_CURRICULUM_COMPETENCIES.filter((c) =>
      def.unitIds.includes(c.unitId)
    );

    // Count how many competencies have canonical verification (practical tests/checkpoints)
    // Legacy self-reported CLEAN/APPLICABLE states represent estimated ability and do NOT count as verified
    const verifiedCount = strandCompetencies.filter((comp) =>
      isCompetencyVerified(comp.id, skills)
    ).length;

    const totalCount = strandCompetencies.length || 1;
    const ratio = verifiedCount / totalCount;

    let strandBand: CurriculumBand = 'BEGINNER';
    if (ratio >= 0.7) {
      strandBand = baseBand === 'ADVANCED' ? 'ADVANCED' : 'INTERMEDIATE';
    } else if (ratio >= 0.35) {
      strandBand = 'INTERMEDIATE';
    } else {
      strandBand = 'BEGINNER';
    }

    // Find first unverified competency
    const firstUnverified = strandCompetencies.find((comp) => {
      const skill = skills.find((s) => s.id === comp.skillId);
      return !skill || skill.status === 'NOT_STARTED' || skill.status === 'DISCOVERED' || skill.status === 'LEARNING';
    }) || strandCompetencies[0];

    const activeUnit = firstUnverified
      ? CANONICAL_CURRICULUM_UNITS.find((u) => u.id === firstUnverified.unitId)
      : undefined;

    strands[strandId] = {
      strandId,
      strandName: def.name,
      estimatedBand: strandBand,
      verifiedBand: verifiedCount > 0 ? (ratio >= 0.6 ? 'INTERMEDIATE' : 'BEGINNER') : 'BEGINNER',
      verifiedCompetenciesCount: verifiedCount,
      totalCompetenciesCount: totalCount,
      activeUnitTitle: activeUnit?.title,
      primaryNextCompetencyTitle: firstUnverified?.title,
      primaryNextCompetencyId: firstUnverified?.id,
    };
  });

  // Active unit and competency default
  const firstBeginnerUnit = CANONICAL_CURRICULUM_UNITS[0];
  const firstCompetency = CANONICAL_CURRICULUM_COMPETENCIES[0];

  return {
    estimatedBand: baseBand,
    strands,
    activeUnitId: firstBeginnerUnit?.id || 'unit-b1-pulse',
    activeCompetencyId: firstCompetency?.id || 'comp-pulse-quarter',
  };
}


// ============================================================================
// C5 — VERIFIED PLACEMENT & PROFILE CALIBRATION
// ============================================================================

export type PlacementBatteryStage = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED' | 'COMPLETE';

export interface PlacementCalibrationSummary {
  status: 'NOT_STARTED' | 'CALIBRATING' | 'VERIFIED';
  displayLabel: string;
  highestVerifiedBand: CurriculumBand;
  targetStage: PlacementBatteryStage;
  targetStageLabel: string;
  targetBandConfirmed: boolean;
  foundation: { passed: number; total: number; complete: boolean };
  intermediate: { passed: number; total: number; complete: boolean };
  advanced: { passed: number; total: number; complete: boolean };
  canonicalVerifiedCount: number;
  remainingTestIds: string[];
}

function latestPlacementResultMap(results: PlacementTestResult[]): Map<string, PlacementTestResult> {
  const map = new Map<string, PlacementTestResult>();
  [...results]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .forEach((result) => map.set(result.testId, result));
  return map;
}

export function mergePlacementResults(
  existing: PlacementTestResult[],
  incoming: PlacementTestResult[]
): PlacementTestResult[] {
  const merged = latestPlacementResultMap([...existing, ...incoming]);
  return Array.from(merged.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function placementTestIsSatisfied(
  test: PlacementTest,
  resultMap: Map<string, PlacementTestResult>,
  skills: GranularSkill[]
): boolean {
  return resultMap.get(test.id)?.passed === true || isCompetencyVerified(test.associatedCompetencyId, skills);
}

export function getPlacementCalibrationSummary(
  assessment: DrummerPlacementAssessment,
  skills: GranularSkill[]
): PlacementCalibrationSummary {
  const resultMap = latestPlacementResultMap(assessment.testResults || []);
  const byBand = (band: CurriculumBand) => CANONICAL_PLACEMENT_TESTS.filter((test) => test.band === band);
  const summarize = (band: CurriculumBand) => {
    const tests = byBand(band);
    const passed = tests.filter((test) => placementTestIsSatisfied(test, resultMap, skills)).length;
    return { passed, total: tests.length, complete: tests.length > 0 && passed === tests.length };
  };

  const foundation = summarize('BEGINNER');
  const intermediateOnly = summarize('INTERMEDIATE');
  const advancedOnly = summarize('ADVANCED');
  const intermediate = {
    passed: foundation.passed + intermediateOnly.passed,
    total: foundation.total + intermediateOnly.total,
    complete: foundation.complete && intermediateOnly.complete,
  };
  const advanced = {
    passed: intermediate.passed + advancedOnly.passed,
    total: intermediate.total + advancedOnly.total,
    complete: intermediate.complete && advancedOnly.complete,
  };

  let highestVerifiedBand: CurriculumBand = 'BEGINNER';
  let displayLabel = 'Not yet verified';
  if (advanced.complete) {
    highestVerifiedBand = 'ADVANCED';
    displayLabel = 'Advanced verified';
  } else if (intermediate.complete) {
    highestVerifiedBand = 'INTERMEDIATE';
    displayLabel = 'Intermediate verified';
  } else if (foundation.complete) {
    highestVerifiedBand = 'BEGINNER';
    displayLabel = 'Beginner foundation verified';
  }

  let targetStage: PlacementBatteryStage = 'FOUNDATION';
  if (foundation.complete) {
    if (assessment.estimatedBand === 'BEGINNER') targetStage = 'COMPLETE';
    else if (!intermediate.complete) targetStage = 'INTERMEDIATE';
    else if (assessment.estimatedBand === 'INTERMEDIATE') targetStage = 'COMPLETE';
    else if (!advanced.complete) targetStage = 'ADVANCED';
    else targetStage = 'COMPLETE';
  }

  const targetBandConfirmed =
    assessment.estimatedBand === 'BEGINNER'
      ? foundation.complete
      : assessment.estimatedBand === 'INTERMEDIATE'
      ? intermediate.complete
      : advanced.complete;

  const canonicalVerifiedCount = CANONICAL_CURRICULUM_COMPETENCIES.filter((comp) =>
    isCompetencyVerified(comp.id, skills)
  ).length;
  const anyEvidence = (assessment.testResults || []).length > 0 || canonicalVerifiedCount > 0;

  const targetStageLabel =
    targetStage === 'FOUNDATION'
      ? 'Foundation Gate'
      : targetStage === 'INTERMEDIATE'
      ? 'Intermediate Confirmation'
      : targetStage === 'ADVANCED'
      ? 'Advanced Confirmation'
      : 'Placement Complete';

  const stageBand: CurriculumBand | null =
    targetStage === 'FOUNDATION'
      ? 'BEGINNER'
      : targetStage === 'INTERMEDIATE'
      ? 'INTERMEDIATE'
      : targetStage === 'ADVANCED'
      ? 'ADVANCED'
      : null;
  const remainingTestIds = stageBand
    ? CANONICAL_PLACEMENT_TESTS.filter(
        (test) => test.band === stageBand && !placementTestIsSatisfied(test, resultMap, skills)
      ).map((test) => test.id)
    : [];

  return {
    status: targetBandConfirmed ? 'VERIFIED' : anyEvidence ? 'CALIBRATING' : 'NOT_STARTED',
    displayLabel,
    highestVerifiedBand,
    targetStage,
    targetStageLabel,
    targetBandConfirmed,
    foundation,
    intermediate,
    advanced,
    canonicalVerifiedCount,
    remainingTestIds,
  };
}

export function getPlacementTestsForAssessment(
  assessment: DrummerPlacementAssessment,
  skills: GranularSkill[]
): PlacementTest[] {
  const summary = getPlacementCalibrationSummary(assessment, skills);
  if (summary.targetStage === 'COMPLETE') {
    // Recalibration re-runs only the estimated band's anchor battery, not every historical test.
    const band = assessment.estimatedBand;
    return CANONICAL_PLACEMENT_TESTS.filter((test) => test.band === band);
  }
  const remaining = new Set(summary.remainingTestIds);
  return CANONICAL_PLACEMENT_TESTS.filter((test) => remaining.has(test.id));
}

export function savePlacementTestProgress(
  assessment: DrummerPlacementAssessment,
  result: PlacementTestResult
): DrummerPlacementAssessment {
  // Read the latest persisted draft so a multi-test battery can save each result
  // without the parent React state having to mutate the modal's test list mid-run.
  const persisted = getStoredPlacementAssessment();
  const base = persisted || assessment;
  const mergedResults = mergePlacementResults(base.testResults || [], [result]);
  if (result.passed) {
    const test = CANONICAL_PLACEMENT_TESTS.find((item) => item.id === result.testId);
    if (test) {
      recordCanonicalVerification(
        test.associatedCompetencyId,
        'placement_test',
        `Passed placement anchor: ${test.title}`
      );
    }
  }
  const draft = { ...base, testResults: mergedResults, version: 2 };
  savePlacementAssessment(draft);
  return draft;
}

function deriveLiveStrands(
  estimatedBand: CurriculumBand,
  skills: GranularSkill[],
  testResults: PlacementTestResult[]
): Record<StrandId, StrandLevel> {
  const resultMap = latestPlacementResultMap(testResults || []);
  const strands: Record<StrandId, StrandLevel> = {} as Record<StrandId, StrandLevel>;

  (Object.keys(STRAND_DEFINITIONS) as StrandId[]).forEach((strandId) => {
    const def = STRAND_DEFINITIONS[strandId];
    const comps = CANONICAL_CURRICULUM_COMPETENCIES.filter((comp) => def.unitIds.includes(comp.unitId));
    const verifiedCount = comps.filter((comp) => isCompetencyVerified(comp.id, skills)).length;
    const tests = CANONICAL_PLACEMENT_TESTS.filter((test) => test.strandId === strandId);
    const satisfiedTests = tests.filter((test) => placementTestIsSatisfied(test, resultMap, skills));

    let verifiedBand: CurriculumBand = 'BEGINNER';
    if (satisfiedTests.some((test) => test.band === 'ADVANCED')) verifiedBand = 'ADVANCED';
    else if (satisfiedTests.some((test) => test.band === 'INTERMEDIATE')) verifiedBand = 'INTERMEDIATE';

    const next = comps.find((comp) => !isCompetencyVerified(comp.id, skills)) || comps[0];
    const activeUnit = next ? CANONICAL_CURRICULUM_UNITS.find((unit) => unit.id === next.unitId) : undefined;

    strands[strandId] = {
      strandId,
      strandName: def.name,
      estimatedBand,
      verifiedBand,
      verifiedCompetenciesCount: verifiedCount,
      totalCompetenciesCount: comps.length,
      activeUnitTitle: activeUnit?.title,
      primaryNextCompetencyTitle: next?.title,
      primaryNextCompetencyId: next?.id,
    };
  });

  return strands;
}

export function reconcilePlacementAssessment(
  profile: LearnerProfile,
  skills: GranularSkill[],
  assessment: DrummerPlacementAssessment
): DrummerPlacementAssessment {
  const estimation = estimateLearnerBand(profile, skills);
  const currPos = deriveCurrentCurriculumPosition(skills);
  const base = {
    ...assessment,
    estimatedBand: estimation.estimatedBand,
    strands: deriveLiveStrands(estimation.estimatedBand, skills, assessment.testResults || []),
    activeUnitId: currPos.activeUnitId,
    activeCompetencyId: currPos.activeCompetencyId,
    version: 2,
  };
  const summary = getPlacementCalibrationSummary(base, skills);
  return {
    ...base,
    verifiedBand: summary.highestVerifiedBand,
    placementCompleted: summary.targetBandConfirmed,
    diagnosticNotes: summary.targetBandConfirmed
      ? [`${summary.displayLabel}. Curriculum competencies still advance individually through their own verification evidence.`]
      : [
          `${summary.targetStageLabel} in progress. ${summary.remainingTestIds.length} placement anchor${summary.remainingTestIds.length === 1 ? '' : 's'} remain for this stage.`,
          'Placement estimates do not bypass the canonical learning order.',
        ],
  };
}

/**
 * Returns tests appropriate for testing the drummer based on estimated band.
 * - Beginner: 4 foundational Beginner battery tests
 * - Intermediate: 4 Beginner + 3 Intermediate tests
 * - Advanced: 4 Beginner + 3 Intermediate + 3 Advanced tests (to prevent false Advanced certification!)
 */
export function getPlacementTestsForEstimation(estimatedBand: CurriculumBand): PlacementTest[] {
  if (estimatedBand === 'BEGINNER') {
    return CANONICAL_PLACEMENT_TESTS.filter((t) => t.band === 'BEGINNER');
  }

  if (estimatedBand === 'INTERMEDIATE') {
    return CANONICAL_PLACEMENT_TESTS.filter((t) => t.band === 'BEGINNER' || t.band === 'INTERMEDIATE');
  }

  // If Advanced, must test foundational Beginner, Intermediate, and explicit Advanced battery!
  return CANONICAL_PLACEMENT_TESTS;
}

/**
 * Evaluates the results of placement tests and determines verified band & strand levels.
 * Enforces strict certification integrity:
 * - Advanced requires passing explicit Advanced tests
 * - Never award Advanced from Beginner/Intermediate tests
 * - Records verified competencies into canonicalProgressEngine
 */
export function evaluatePlacementResults(
  estimatedBand: CurriculumBand,
  testResults: PlacementTestResult[],
  skills: GranularSkill[],
  previousResults: PlacementTestResult[] = []
): DrummerPlacementAssessment {
  const mergedTestResults = mergePlacementResults(previousResults, testResults);
  // Record verifications for passed tests
  mergedTestResults.forEach((r) => {
    if (r.passed) {
      const test = CANONICAL_PLACEMENT_TESTS.find((t) => t.id === r.testId);
      if (test) {
        recordCanonicalVerification(
          test.associatedCompetencyId,
          'placement_test',
          `Passed practical placement execution test: ${test.title}`
        );
      }
    }
  });

  const passedTestIds = new Set(mergedTestResults.filter((r) => r.passed).map((r) => r.testId));

  // Check foundational beginner battery (pulse, basic groove, rudiments, fill recovery)
  const passedPulse = passedTestIds.has('pt-pulse-8th');
  const passedGroove = passedTestIds.has('pt-basic-groove');
  const passedRudiments = passedTestIds.has('pt-rudiment-control');
  const passedFills = passedTestIds.has('pt-fill-recovery');

  // Check intermediate battery
  const passedIntermediateSync = passedTestIds.has('pt-syncopation');
  const passedIntermediate68 = passedTestIds.has('pt-compound-68');
  const passedIntermediateLinear = passedTestIds.has('pt-linear-rlk');

  // Check advanced battery
  const passedAdv32nd = passedTestIds.has('pt-adv-32nd-bursts');
  const passedAdvFlam = passedTestIds.has('pt-adv-flam-control');
  const passedAdvShuffle = passedTestIds.has('pt-adv-shuffle-swing');

  const beginnerFoundationComplete = passedPulse && passedGroove && passedRudiments && passedFills;
  const intermediateComplete = passedIntermediateSync && passedIntermediate68 && passedIntermediateLinear;
  const advancedComplete = passedAdv32nd && passedAdvFlam && passedAdvShuffle;

  let verifiedBand: CurriculumBand = 'BEGINNER';
  const diagnosticNotes: string[] = [];

  if (!passedPulse) {
    diagnosticNotes.push('Subdivision pulse drift detected: begin with Unit 1 (Pulse & Subdivision).');
  }
  if (!passedGroove) {
    diagnosticNotes.push('Backbeat stability needs reinforcement: focus on Unit 2 (Basic Groove & Backbeat).');
  }
  if (!passedFills) {
    diagnosticNotes.push('Beat 1 downbeat hesitation exiting fills: reinforce Unit 3 (Foundational Fills & Recovery).');
  }
  if (!passedRudiments) {
    diagnosticNotes.push('Hand symmetry and rebound control needed: reinforce Unit 4 (Singles & Doubles Foundation).');
  }

  // Certification ladder
  if (beginnerFoundationComplete && intermediateComplete && advancedComplete) {
    verifiedBand = 'ADVANCED';
    diagnosticNotes.push('Full Advanced battery verified cleanly with practical metronome evidence.');
  } else if (beginnerFoundationComplete && intermediateComplete) {
    verifiedBand = 'INTERMEDIATE';
    if (estimatedBand === 'ADVANCED') {
      diagnosticNotes.push('Estimated: Advanced. Verified: Intermediate (Advanced practical assessment required to certify Advanced status).');
    } else {
      diagnosticNotes.push('Foundational and Intermediate competencies verified. Placed in Intermediate track.');
    }
  } else if (beginnerFoundationComplete) {
    verifiedBand = 'BEGINNER';
    diagnosticNotes.push('Beginner foundation verified. Advancing into early Intermediate curriculum.');
  } else {
    verifiedBand = 'BEGINNER';
    diagnosticNotes.push('Foundational Beginner competencies require verification before advancing.');
  }

  // Derive active unit and competency from canonical progress engine
  const currPos = deriveCurrentCurriculumPosition(skills);
  let activeUnitId = currPos.activeUnitId;
  let activeCompetencyId = currPos.activeCompetencyId;

  // If specific blocking gaps exist from failed beginner tests, pin directly to that unit
  if (!passedPulse) {
    activeUnitId = 'unit-b1-pulse';
    activeCompetencyId = 'comp-pulse-quarter';
  } else if (!passedGroove) {
    activeUnitId = 'unit-b2-groove';
    activeCompetencyId = 'comp-grv-backbeat';
  } else if (!passedRudiments) {
    activeUnitId = 'unit-b4-rudiments';
    activeCompetencyId = 'comp-rud-singles';
  } else if (!passedFills) {
    activeUnitId = 'unit-b3-fills';
    activeCompetencyId = 'comp-fill-entry';
  }

  // Construct Strand Levels (Strictly independent per-strand evidence!)
  const strands: Record<StrandId, StrandLevel> = {} as any;

  (Object.keys(STRAND_DEFINITIONS) as StrandId[]).forEach((strandId) => {
    const def = STRAND_DEFINITIONS[strandId];
    const strandCompetencies = CANONICAL_CURRICULUM_COMPETENCIES.filter((c) =>
      def.unitIds.includes(c.unitId)
    );

    // Calculate strand verified band solely from tests in that strand
    let strandVerifiedBand: CurriculumBand = 'BEGINNER';
    if (strandId === 'pulse_reading') {
      if (passedPulse && passedIntermediate68) {
        strandVerifiedBand = 'INTERMEDIATE';
      } else if (passedPulse) {
        strandVerifiedBand = 'BEGINNER';
      }
    } else if (strandId === 'grooves') {
      if (passedGroove && passedIntermediateSync && passedAdvShuffle) {
        strandVerifiedBand = 'ADVANCED';
      } else if (passedGroove && passedIntermediateSync) {
        strandVerifiedBand = 'INTERMEDIATE';
      } else if (passedGroove) {
        strandVerifiedBand = 'BEGINNER';
      }
    } else if (strandId === 'rudiments') {
      if (passedRudiments && passedAdv32nd && passedAdvFlam) {
        strandVerifiedBand = 'ADVANCED';
      } else if (passedRudiments) {
        strandVerifiedBand = 'BEGINNER';
      }
    } else if (strandId === 'fills') {
      if (passedFills && passedIntermediateLinear) {
        strandVerifiedBand = 'INTERMEDIATE';
      } else if (passedFills) {
        strandVerifiedBand = 'BEGINNER';
      }
    } else if (strandId === 'coordination_dynamics') {
      if (passedIntermediateLinear && passedAdv32nd) {
        strandVerifiedBand = 'ADVANCED';
      } else if (passedIntermediateLinear) {
        strandVerifiedBand = 'INTERMEDIATE';
      }
    }

    const firstUnverifiedInStrand = strandCompetencies.find((comp) => {
      const skill = skills.find((s) => s.id === comp.skillId);
      return !skill || skill.status === 'NOT_STARTED' || skill.status === 'DISCOVERED' || skill.status === 'LEARNING';
    }) || strandCompetencies[0];

    strands[strandId] = {
      strandId,
      strandName: def.name,
      estimatedBand,
      verifiedBand: strandVerifiedBand,
      verifiedCompetenciesCount: strandCompetencies.filter((c) =>
        passedTestIds.has(`pt-${c.id.replace('comp-', '')}`)
      ).length,
      totalCompetenciesCount: strandCompetencies.length,
      primaryNextCompetencyId: firstUnverifiedInStrand?.id || activeCompetencyId,
    };
  });

  const assessment: DrummerPlacementAssessment = {
    id: `placement-${Date.now()}`,
    estimatedBand,
    verifiedBand,
    strands,
    activeUnitId,
    activeCompetencyId,
    placementCompleted: false,
    completedAt: new Date().toISOString(),
    testResults: mergedTestResults,
    diagnosticNotes,
    version: 2,
  };

  const reconciled = reconcilePlacementAssessment({ selfReportedLevel: estimatedBand } as unknown as LearnerProfile, skills, assessment);
  savePlacementAssessment(reconciled);
  return reconciled;
}

/**
 * Storage helpers
 */
export function getStoredPlacementAssessment(): DrummerPlacementAssessment | null {
  try {
    const raw = localStorage.getItem(PLACEMENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored placement assessment:', e);
  }
  return null;
}

export function savePlacementAssessment(assessment: DrummerPlacementAssessment): void {
  try {
    localStorage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(assessment));
  } catch (e) {
    console.error('Failed to save placement assessment:', e);
  }
}

/**
 * Get or initialize assessment from profile & skills
 */
export function getOrInitializePlacementAssessment(
  profile: LearnerProfile,
  skills: GranularSkill[]
): DrummerPlacementAssessment {
  const existing = getStoredPlacementAssessment();
  if (existing) {
    const reconciled = reconcilePlacementAssessment(profile, skills, existing);
    savePlacementAssessment(reconciled);
    return reconciled;
  }

  const { estimatedBand, strands } = estimateLearnerBand(profile, skills);
  const { activeUnitId, activeCompetencyId } = deriveCurrentCurriculumPosition(skills);
  const initial: DrummerPlacementAssessment = {
    id: `placement-est-${Date.now()}`,
    estimatedBand,
    verifiedBand: 'BEGINNER',
    strands,
    activeUnitId: activeUnitId || 'unit-b1-pulse',
    activeCompetencyId: activeCompetencyId || 'comp-pulse-quarter',
    placementCompleted: false,
    testResults: [],
    diagnosticNotes: ['Placement pending practical verification test.'],
    version: 2,
  };

  const reconciled = reconcilePlacementAssessment(profile, skills, initial);
  savePlacementAssessment(reconciled);
  return reconciled;
}
