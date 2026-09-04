import {
  GranularSkill,
  LearnerProfile,
  ProgressionStage,
  EquipmentOption,
  SelfCheckFeeling,
  PracticeSession,
  PracticeExercise,
  MusicalPlacement,
  PlacementType,
  StartPoint,
  TargetLanding,
  PlacementAttemptEvidence,
  PlacementEvidenceMemory,
  PlacementStatus,
  RecentTrendType,
  PracticeIntent,
  ExercisePedagogicalRole,
  CurriculumDecision,
} from '../types';
import { generateTransferInstructions } from './transferEngine';

const PLACEMENT_ATTEMPTS_STORAGE_KEY = 'RUDIMENT_PLACEMENT_ATTEMPTS_V1';
const PLACEMENT_MEMORY_STORAGE_KEY = 'RUDIMENT_PLACEMENT_MEMORY_V1';

let placementAttemptsCache: PlacementAttemptEvidence[] | null = null;
let placementMemoriesCache: Record<string, PlacementEvidenceMemory> | null = null;

function loadStoredPlacementAttempts(): PlacementAttemptEvidence[] {
  if (placementAttemptsCache) return placementAttemptsCache;
  try {
    const raw = localStorage.getItem(PLACEMENT_ATTEMPTS_STORAGE_KEY);
    if (raw) {
      placementAttemptsCache = JSON.parse(raw);
      return placementAttemptsCache || [];
    }
  } catch (e) {
    console.error('Failed to load placement attempts:', e);
  }
  placementAttemptsCache = [];
  return placementAttemptsCache;
}

function persistPlacementAttempts(attempts: PlacementAttemptEvidence[]): void {
  placementAttemptsCache = attempts;
  try {
    localStorage.setItem(PLACEMENT_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
  } catch (e) {
    console.error('Failed to persist placement attempts:', e);
  }
}

export function getAllPlacementAttemptsForSkill(skillId: string): PlacementAttemptEvidence[] {
  const all = loadStoredPlacementAttempts();
  return all.filter((a) => a.skillId === skillId);
}

/**
 * Derives PlacementEvidenceMemory from recorded placement attempts.
 */
export function derivePlacementEvidenceMemory(
  skillId: string,
  attemptsOverride?: PlacementAttemptEvidence[]
): PlacementEvidenceMemory {
  const attempts = attemptsOverride || getAllPlacementAttemptsForSkill(skillId);

  if (attempts.length === 0) {
    return {
      skillId,
      successfulOneBeatPlacements: 0,
      successfulTwoBeatPlacements: 0,
      successfulFullBarPlacements: 0,
      successfulDownbeatLandings: 0,
      cleanGrooveReturns: 0,
      totalPlacementAttempts: 0,
      commonStartPointIssues: [],
      commonLandingIssues: [],
      grooveReturnReliability: 'Unassessed',
      recentPlacementTrend: 'insufficient_evidence',
      recurringPlacementFriction: null,
      oneBeatStatus: 'Not Yet Evidenced',
      twoBeatStatus: 'Not Yet Evidenced',
      fullBarStatus: 'Not Yet Evidenced',
      grooveReturnStatus: 'Not Yet Evidenced',
      nextPlacementTarget: 'Land one-beat fills consistently on beat 1 before increasing phrase length.',
    };
  }

  let successfulOneBeat = 0;
  let successfulTwoBeat = 0;
  let successfulFullBar = 0;
  let successfulDownbeatLandings = 0;
  let cleanGrooveReturns = 0;

  let totalOneBeat = 0;
  let totalTwoBeat = 0;
  let totalFullBar = 0;

  const frictionCounts: Record<string, number> = {};
  const landingIssueCounts: Record<string, number> = {};
  const startIssueCounts: Record<string, number> = {};

  attempts.forEach((a) => {
    const isSuccess = a.success || a.selfAssessment === 'CLEAN_AND_RELAXED' || a.selfAssessment === 'MOSTLY_CLEAN';
    const hasLandingIssue = a.placementFrictions.some(
      (f) => f.includes('Beat 1') || f.includes('Landing') || f.includes('Crash') || f.includes('Rushed Fill') || f.includes('Dragged Fill')
    );
    const hasGrooveIssue = a.placementFrictions.some(
      (f) => f.includes('Lost Groove') || f.includes('Transition Problem')
    );

    if (a.phraseLength === '1 beat' || a.placementType === 'one_beat_fill') {
      totalOneBeat++;
      if (isSuccess) successfulOneBeat++;
    } else if (a.phraseLength === '2 beats' || a.placementType === 'two_beat_fill') {
      totalTwoBeat++;
      if (isSuccess) successfulTwoBeat++;
    } else if (a.phraseLength === '1 bar' || a.placementType === 'full_bar_fill') {
      totalFullBar++;
      if (isSuccess) successfulFullBar++;
    }

    if (isSuccess && !hasLandingIssue) {
      successfulDownbeatLandings++;
    }

    if (isSuccess && !hasGrooveIssue) {
      cleanGrooveReturns++;
    }

    a.placementFrictions.forEach((f) => {
      frictionCounts[f] = (frictionCounts[f] || 0) + 1;
      if (f.includes('Beat 1') || f.includes('Landing') || f.includes('Crash')) {
        landingIssueCounts[f] = (landingIssueCounts[f] || 0) + 1;
      }
      if (f.includes('Early') || f.includes('Late') || f.includes('Start')) {
        startIssueCounts[f] = (startIssueCounts[f] || 0) + 1;
      }
    });
  });

  // Calculate Statuses
  const oneBeatStatus: PlacementStatus =
    successfulOneBeat >= 3 ? 'Established' : totalOneBeat > 0 ? 'Developing' : 'Not Yet Evidenced';

  const twoBeatStatus: PlacementStatus =
    successfulTwoBeat >= 3 ? 'Established' : totalTwoBeat > 0 ? 'Developing' : 'Not Yet Evidenced';

  const fullBarStatus: PlacementStatus =
    successfulFullBar >= 3 ? 'Established' : totalFullBar > 0 ? 'Developing' : 'Not Yet Evidenced';

  // Groove Return Reliability
  const lostGrooveCount = frictionCounts['Lost Groove'] || 0;
  const missedBeat1Count = frictionCounts['Missed Beat 1'] || 0;

  let grooveReturnReliability: 'High' | 'Moderate' | 'Low' | 'Unassessed' = 'Unassessed';
  if (attempts.length > 0) {
    if (lostGrooveCount + missedBeat1Count > attempts.length * 0.4) {
      grooveReturnReliability = 'Low';
    } else if (cleanGrooveReturns >= 2) {
      grooveReturnReliability = 'High';
    } else if (cleanGrooveReturns >= 1) {
      grooveReturnReliability = 'Moderate';
    } else {
      grooveReturnReliability = 'Low';
    }
  }

  const grooveReturnStatus: PlacementStatus =
    grooveReturnReliability === 'High'
      ? 'Established'
      : grooveReturnReliability === 'Moderate' || grooveReturnReliability === 'Low'
      ? 'Developing'
      : 'Not Yet Evidenced';

  // Recent trend
  const recentAttempts = attempts.slice(-4);
  const recentSuccesses = recentAttempts.filter(
    (a) => a.success || a.selfAssessment === 'CLEAN_AND_RELAXED' || a.selfAssessment === 'MOSTLY_CLEAN'
  ).length;

  let recentPlacementTrend: RecentTrendType = 'insufficient_evidence';
  if (recentAttempts.length >= 2) {
    if (recentSuccesses >= recentAttempts.length * 0.75) recentPlacementTrend = 'improving';
    else if (recentSuccesses >= recentAttempts.length * 0.5) recentPlacementTrend = 'stable';
    else recentPlacementTrend = 'struggling';
  }

  // Primary recurring friction
  let recurringPlacementFriction: string | null = null;
  let maxFrictionCount = 0;
  Object.entries(frictionCounts).forEach(([f, count]) => {
    if (count > maxFrictionCount && count >= 2) {
      maxFrictionCount = count;
      recurringPlacementFriction = f;
    }
  });

  // Next Target
  let nextPlacementTarget = 'Land one-beat fills consistently on beat 1 before increasing phrase length.';
  if (recurringPlacementFriction) {
    if (recurringPlacementFriction === 'Missed Beat 1') {
      nextPlacementTarget = 'Focus on locking beat 1 crash downbeat after 1-beat fill before expanding to longer phrases.';
    } else if (recurringPlacementFriction === 'Entered Too Early') {
      nextPlacementTarget = 'Count beats 1-3 aloud to prevent early entry on beat 4 fill.';
    } else if (recurringPlacementFriction === 'Lost Groove') {
      nextPlacementTarget = 'Simplify fill complexity to maintain continuous groove pulse across the transition.';
    } else {
      nextPlacementTarget = `Clear ${recurringPlacementFriction} friction during fill placement.`;
    }
  } else if (oneBeatStatus !== 'Established') {
    nextPlacementTarget = 'Master 1-beat fill placement starting on Beat 4 with clean Beat 1 crash landing.';
  } else if (twoBeatStatus !== 'Established') {
    nextPlacementTarget = 'Advance to 2-beat fill placement starting on Beat 3 with steady tempo maintenance.';
  } else if (fullBarStatus !== 'Established') {
    nextPlacementTarget = 'Apply full 1-bar fill phrasing into 4-bar musical phrase endings.';
  } else {
    nextPlacementTarget = 'Orchestrate vocabulary across kit zones with accent displacement and groove transitions.';
  }

  return {
    skillId,
    successfulOneBeatPlacements: successfulOneBeat,
    successfulTwoBeatPlacements: successfulTwoBeat,
    successfulFullBarPlacements: successfulFullBar,
    successfulDownbeatLandings,
    cleanGrooveReturns,
    totalPlacementAttempts: attempts.length,
    commonStartPointIssues: Object.keys(startIssueCounts),
    commonLandingIssues: Object.keys(landingIssueCounts),
    grooveReturnReliability,
    recentPlacementTrend,
    recurringPlacementFriction,
    oneBeatStatus,
    twoBeatStatus,
    fullBarStatus,
    grooveReturnStatus,
    nextPlacementTarget,
  };
}

export function recordPlacementAttempt(
  attempt: PlacementAttemptEvidence
): PlacementEvidenceMemory {
  const all = loadStoredPlacementAttempts();
  const updated = [...all, attempt];
  persistPlacementAttempts(updated);
  return derivePlacementEvidenceMemory(attempt.skillId, updated);
}

export function recordSinglePlacementAttemptEvidence(
  attempt: PlacementAttemptEvidence
): PlacementEvidenceMemory {
  return recordPlacementAttempt(attempt);
}

export function finalizePlacementSessionEvidence(session: PracticeSession): void {
  if (!session.exercises) return;

  session.exercises.forEach((ex) => {
    if (!ex.result || !ex.musicalPlacement) return;

    const primarySkillId = ex.skillIds[0] || 'skill';
    const isSuccess =
      ex.result.overallRating === 'CLEAN' ||
      ex.result.overallRating === 'ALMOST' ||
      ex.result.followCuesReflection === 'CLEAN_COMFORTABLE' ||
      ex.result.selfCheck === 'CLEAN_AND_RELAXED' ||
      ex.result.selfCheck === 'MOSTLY_CLEAN';

    const placementFrictions = [...(ex.result.issueTags || [])].filter((tag) =>
      [
        'Missed Beat 1',
        'Entered Too Early',
        'Entered Too Late',
        'Rushed Fill',
        'Dragged Fill',
        'Lost Groove',
        'Wrong Phrase Length',
        'Transition Problem',
      ].includes(tag)
    );

    // Map followCuesReflection to friction if not already included
    if (ex.result.followCuesReflection === 'LOST_PULSE' && !placementFrictions.includes('Lost Groove')) {
      placementFrictions.push('Lost Groove');
    } else if (ex.result.followCuesReflection === 'ENTRY_TIMING_ISSUE' && !placementFrictions.includes('Entered Too Early')) {
      placementFrictions.push('Entered Too Early');
    } else if (ex.result.followCuesReflection === 'MISSED_LANDING' && !placementFrictions.includes('Missed Beat 1')) {
      placementFrictions.push('Missed Beat 1');
    } else if (ex.result.followCuesReflection === 'ROUGH_RECOVERY' && !placementFrictions.includes('Transition Problem')) {
      placementFrictions.push('Transition Problem');
    }

    // If learner only used WATCH demonstration mode without playing, do not record qualifying placement evidence
    if (ex.result.instructionMode === 'WATCH') {
      return;
    }

    const evidenceCategory =
      ex.result.instructionMode === 'PLAY'
        ? 'SELF_ASSESSED_EXECUTION'
        : 'GUIDED_PRACTICE';

    const attemptEvidence: PlacementAttemptEvidence = {
      id: `pl-att-${session.id}-${ex.id}-${Date.now()}`,
      sessionId: session.id,
      skillId: primarySkillId,
      exerciseId: ex.id,
      timestamp: ex.result.completedAt || new Date().toISOString(),
      placementType: ex.musicalPlacement.placementType,
      startPoint: ex.musicalPlacement.startPoint,
      phraseLength: ex.musicalPlacement.phraseLength,
      targetLanding: ex.musicalPlacement.targetLanding,
      bpm: ex.result.tempoUsed || ex.tempo,
      playbackBpm: ex.result.tempoUsed || ex.tempo,
      selfAssessment: ex.result.selfCheck,
      placementFrictions,
      success: isSuccess,
      instructionMode: ex.result.instructionMode || 'PLAY',
      assistanceLevel: ex.result.assistanceLevel || 'NONE',
      exerciseObjective: ex.purpose,
      followCuesReflection: ex.result.followCuesReflection,
      independentChecklist: ex.result.independentChecklist,
      overallRating: ex.result.overallRating,
      evidenceCategory,
      visualTutorUsed: ex.result.visualTutorUsed !== false,
      phrasePosition: ex.musicalPlacement.startPoint,
    };

    recordPlacementAttempt(attemptEvidence);
  });
}

/**
 * APPLICATION CHALLENGE GENERATOR
 * Generates a structured musical placement exercise for a given skill, stage, equipment, and BPM.
 */
export function generatePlacementExercise(
  skill: GranularSkill,
  stage: ProgressionStage,
  equipment: EquipmentOption,
  bpm: number,
  placementMemory?: PlacementEvidenceMemory,
  preferredLength?: '1 beat' | '2 beats' | '1 bar'
): PracticeExercise {
  const mem = placementMemory || derivePlacementEvidenceMemory(skill.id);
  const isPad = equipment === 'Practice Pad';

  // Determine phrase length based on placement evidence memory unless overridden
  let phraseLength: '1 beat' | '2 beats' | '1 bar' = '1 beat';
  let startPoint: StartPoint = 'beat_4';

  if (preferredLength) {
    phraseLength = preferredLength;
  } else if (mem.recurringPlacementFriction === 'Missed Beat 1') {
    // If learner missed beat 1 previously, enforce 1-beat fill simplify strategy!
    phraseLength = '1 beat';
    startPoint = 'beat_4';
  } else if (mem.oneBeatStatus === 'Established' && mem.twoBeatStatus !== 'Established') {
    phraseLength = '2 beats';
    startPoint = 'beat_3';
  } else if (mem.twoBeatStatus === 'Established') {
    phraseLength = '1 bar';
    startPoint = 'beat_1';
  }

  // Define Sticking / Pattern text
  let rawSticking = 'R L K   R L K';
  if (skill.id.includes('six-stroke')) rawSticking = 'R L L R R L';
  else if (skill.id.includes('single-paradiddle')) rawSticking = 'R L R R L R L L';
  else if (skill.id.includes('double-stroke')) rawSticking = 'R R L L R R L L';
  else if (skill.id.includes('flam')) rawSticking = 'lR rL lR rL';
  else if (skill.id.includes('drag')) rawSticking = 'llR rrL llR rrL';

  let placementType: PlacementType = 'one_beat_fill';
  if (phraseLength === '2 beats') placementType = 'two_beat_fill';
  if (phraseLength === '1 bar') placementType = 'full_bar_fill';

  // Generate Entry / Exit Instructions & Beat Grid
  let entryText = '';
  let fillText = '';
  let exitText = '';
  let whereFits = '';
  let counts: string[] = [];
  let grooveBeats: string[] = [];
  let fillBeats: string[] = [];
  let landingBeat = '1 (Next Bar)';

  if (phraseLength === '1 beat') {
    entryText = isPad
      ? 'Play 3 beats of light pad groove pulse (Beats 1–3: 1 & 2 & 3 &).'
      : 'Play 3 beats of steady kick/snare/hat groove (Beats 1–3).';

    fillText = isPad
      ? `Execute ${skill.name} on Beat 4 strictly (${rawSticking}).`
      : `Execute ${skill.name} across Beat 4.`;

    exitText = isPad
      ? 'Accent Beat 1 strongly on the pad to simulate crash + kick landing, then return to groove.'
      : 'Land crash + kick downbeat on Beat 1 of the next bar, then resume groove.';

    whereFits = `Groove: Beats 1–3 | Fill: Beat 4 | Target: Beat 1 Downbeat`;
    counts = ['1', '&', '2', '&', '3', '&', '4', '&', '|| 1'];
    grooveBeats = ['1', '&', '2', '&', '3', '&'];
    fillBeats = ['4', '&'];
  } else if (phraseLength === '2 beats') {
    entryText = isPad
      ? 'Play 2 beats of light pad groove pulse (Beats 1–2: 1 & 2 &).'
      : 'Play 2 beats of steady groove (Beats 1–2).';

    fillText = isPad
      ? `Execute ${skill.name} phrasing across Beats 3 & 4 (${rawSticking}).`
      : `Execute ${skill.name} fill across Beats 3 & 4.`;

    exitText = isPad
      ? 'Accent Beat 1 strongly to simulate crash + kick, then return to groove.'
      : 'Land crash + kick on Beat 1 of the next bar and return to groove.';

    whereFits = `Groove: Beats 1–2 | Fill: Beats 3–4 | Target: Beat 1 Downbeat`;
    counts = ['1', '&', '2', '&', '3', '&', '4', '&', '|| 1'];
    grooveBeats = ['1', '&', '2', '&'];
    fillBeats = ['3', '&', '4', '&'];
  } else {
    // 1 bar fill in a 4-bar phrase
    entryText = isPad
      ? 'Play 3 bars of continuous light pad groove (Bars 1–3).'
      : 'Play 3 bars of steady groove (Bars 1–3).';

    fillText = `Execute 1 full bar of ${skill.name} in Bar 4.`;

    exitText = isPad
      ? 'Accent Beat 1 of Bar 5 strongly (simulated crash downbeat) and return to groove.'
      : 'Land crash + kick on Beat 1 of Bar 5 and return cleanly to groove.';

    whereFits = `Groove: Bars 1–3 | Fill: Bar 4 | Target: Beat 1 (Bar 5)`;
    counts = ['Bar 1', 'Bar 2', 'Bar 3', 'Bar 4 (Fill)', '|| Bar 5 (Beat 1)'];
    grooveBeats = ['Bar 1', 'Bar 2', 'Bar 3'];
    fillBeats = ['Bar 4 (Fill)'];
    landingBeat = '1 (Bar 5)';
  }

  const musicalPlacement: MusicalPlacement = {
    placementType,
    startPoint,
    phraseLength,
    subdivision: skill.id.includes('rlk') ? 'Triplets' : '16th Notes',
    targetLanding: 'crash_on_1',
    entryContext: entryText,
    exitContext: exitText,
    whereThisFitsExplanation: whereFits,
    beatGridVisual: {
      counts,
      grooveBeats,
      fillBeats,
      landingBeat,
    },
  };

  const padNote = isPad
    ? 'Pad Mode: Light taps = groove pulse; Beat 4 = fill phrase; Accent Beat 1 = crash landing.'
    : undefined;

  const transferInstructions = stage === 'TRANSFER'
    ? generateTransferInstructions(skill, equipment, 'TRANSFER', mem.recurringPlacementFriction)
    : undefined;

  return {
    id: `app-pl-${skill.id}-${Date.now()}`,
    title: `${skill.name} — ${phraseLength.toUpperCase()} Musical Placement`,
    phase: 'APPLICATION',
    skillIds: [skill.id],
    purpose: `Learn exact placement and beat-1 landing for ${skill.name} inside a ${phraseLength} space.`,
    instructions: `${entryText} ${fillText} ${exitText}`,
    sticking: transferInstructions?.baseSticking || rawSticking,
    counting: skill.id.includes('rlk') ? '1-trip-let 2-trip-let 3-trip-let 4-trip-let' : '1 e & a 2 e & a 3 e & a 4 e & a',
    timeSignature: '4/4',
    subdivision: skill.id.includes('rlk') ? 'Triplets' : '16th Notes',
    tempo: bpm,
    durationSeconds: 180,
    exerciseType: 'application',
    equipmentRequired: equipment,
    difficulty: phraseLength === '1 beat' ? 'Easy' : phraseLength === '2 beats' ? 'Moderate' : 'Challenging',
    padAdaptationNote: padNote,
    progressionStage: stage,
    challengeType: 'musical-fill',
    musicalPlacement,
    entryExitInstructions: {
      entry: entryText,
      skillFill: fillText,
      exit: exitText,
    },
    transferInstructions,
  };
}

/**
 * CANONICAL PLACEMENT PRACTICE SESSION GENERATOR
 * Constructs a structured 5-exercise guided session designed specifically
 * to generate phrase insertion, downbeat landing, and groove return evidence.
 */
export function buildPlacementSession(
  skill: GranularSkill,
  profile: LearnerProfile,
  preferredLength?: '1 beat' | '2 beats' | '1 bar',
  bpmOverride?: number,
  assistanceMode?: 'full' | 'reduced' | 'none',
  curriculumDecision?: CurriculumDecision
): PracticeSession {
  const mem = derivePlacementEvidenceMemory(skill.id);
  const equipment: EquipmentOption = profile.equipment === 'Full Drum Kit' ? 'Full Drum Kit' : 'Practice Pad';
  const isPad = equipment === 'Practice Pad';

  // Placement practice prioritizes control over speed.
  // Derive a controlled placement working tempo (e.g. ~80-85% of isolated comfort tempo, max 85 BPM for initial placement).
  const isolatedBpm = skill.currentComfortTempo || 80;
  const placementBpm = bpmOverride || Math.max(60, Math.min(Math.round(isolatedBpm * 0.85), 85));

  // Determine targeted length based on evidence
  let targetLength: '1 beat' | '2 beats' | '1 bar' = preferredLength || '1 beat';
  if (!preferredLength) {
    if (mem.oneBeatStatus !== 'Established') targetLength = '1 beat';
    else if (mem.twoBeatStatus !== 'Established') targetLength = '2 beats';
    else targetLength = '1 bar';
  }

  const phraseLocation =
    targetLength === '1 beat'
      ? 'Beat 4 Entry → Beat 1 Landing'
      : targetLength === '2 beats'
      ? 'Beat 3 Entry → Beat 1 Landing'
      : 'Bar 4 Entry → Bar 5 Downbeat Landing';

  const assistanceFormatted: 'Full' | 'Reduced' | 'Minimal' | 'None' =
    assistanceMode === 'none'
      ? 'None'
      : assistanceMode === 'reduced'
      ? 'Reduced'
      : 'Full';

  const containerName =
    curriculumDecision?.supportingContext?.contextName ||
    curriculumDecision?.supportingContext?.anchorGroove?.name ||
    (isPad ? 'Light Pad Groove Pulse (80 BPM)' : 'Standard 8th-Note Rock Groove (80 BPM)');

  const practiceIntent: PracticeIntent = {
    targetSkillId: skill.id,
    targetSkillName: skill.name,
    activeGoal: curriculumDecision?.nextTarget || phraseLocation,
    targetPhraseLocation: phraseLocation,
    targetDimension: curriculumDecision?.difficultyChange?.primaryDimension || 'PLACEMENT',
    limiter: curriculumDecision?.currentLimiter || 'PLACEMENT',
    limiterDescription:
      curriculumDecision?.readiness?.limiterDescription ||
      'Consistency in musical entry and downbeat landing still needs reinforcement.',
    supportingContainer: containerName,
    learningTempo: placementBpm,
    assistanceLevel: assistanceFormatted,
    successFocus: [
      `enter cleanly on ${targetLength === '1 beat' ? 'Beat 4' : targetLength === '2 beats' ? 'Beat 3' : 'Bar 4'}`,
      'land confidently on Beat 1',
      'recover into the musical pulse',
    ],
    adaptiveReason:
      curriculumDecision?.reason ||
      `Consistency in musical entry and downbeat landing still needs reinforcement.`,
    evidenceNeeded:
      curriculumDecision?.learningStack?.completionCondition ||
      '2 clean downbeat landings and uninterrupted groove returns',
    recommendedSnapshot: {
      skillName: curriculumDecision?.targetSkillName || skill.name,
      limiter: curriculumDecision?.currentLimiter || 'PLACEMENT',
      bpm: curriculumDecision?.recommendedAction?.suggestedBpm || placementBpm,
      assistance:
        curriculumDecision?.recommendedAction?.assistanceMode === 'none'
          ? 'None'
          : curriculumDecision?.recommendedAction?.assistanceMode === 'reduced'
          ? 'Reduced'
          : 'Full',
    },
  };

  const sessionId = `pl-sess-${skill.id}-${Date.now()}`;
  const exercises: PracticeExercise[] = [];

  // 1. Warm-Up / Groove Pulse Sync (90s)
  exercises.push({
    id: `${sessionId}-warmup`,
    title: 'Pulse Alignment & Coordination Warm-Up',
    phase: 'WARM UP',
    skillIds: [skill.id],
    pedagogicalRole: 'PREPARATION',
    whyThisExercise: `Prepare the pulse needed for today's ${targetLength === '1 beat' ? 'Beat 4 entry and Beat 1 landing' : targetLength === '2 beats' ? 'Beat 3 entry and Beat 1 landing' : 'Bar 4 entry and Bar 5 landing'} work.`,
    purpose: isPad
      ? 'Establish a relaxed 4/4 groove pulse on the pad to lock in micro-timing.'
      : 'Lock in steady kick/hat/snare groove at working tempo before fill placement.',
    instructions: isPad
      ? 'Play light alternating 8th-note taps (Beats 1–4). Keep shoulders down and wrists relaxed.'
      : 'Play a steady standard 8th-note groove (Bass drum on 1 & 3, Snare on 2 & 4). Lock with metronome.',
    sticking: 'R L R L R L R L',
    counting: '1 & 2 & 3 & 4 &',
    timeSignature: '4/4',
    subdivision: '8th Notes',
    tempo: placementBpm,
    isSuggestedStartingTempo: false,
    durationSeconds: 90,
    exerciseType: 'warmup',
    equipmentRequired: equipment,
    difficulty: 'Easy',
  });

  // 2. Isolated Rudiment Calibration (90s)
  exercises.push({
    id: `${sessionId}-isolated`,
    title: `${skill.name} — Calibration & Dynamic Balance`,
    phase: 'MAIN WORK',
    skillIds: [skill.id],
    pedagogicalRole: 'PREPARATION',
    whyThisExercise: `Calibrate clean stick heights and note spacing for ${skill.name} in isolation before musical insertion.`,
    purpose: `Calibrate clean stick heights and note spacing for ${skill.name} in isolation before musical insertion.`,
    instructions: `Execute ${skill.name} cleanly against the click at ${placementBpm} BPM. Focus on relaxed wrists and dynamic balance.`,
    sticking: skill.id.includes('six-stroke')
      ? 'R L L R R L'
      : skill.id.includes('paradiddle')
      ? 'R L R R L R L L'
      : 'R L R L',
    counting: skill.id.includes('rlk')
      ? '1-trip-let 2-trip-let'
      : '1 e & a 2 e & a 3 e & a 4 e & a',
    timeSignature: '4/4',
    subdivision: skill.id.includes('rlk') ? 'Triplets' : '16th Notes',
    tempo: placementBpm,
    isSuggestedStartingTempo: false,
    durationSeconds: 90,
    exerciseType: 'technique',
    equipmentRequired: equipment,
    difficulty: 'Moderate',
    progressionStage: 'APPLICATION',
  });

  // 3. Primary Placement Fill Insertion (150s) - Generates 1st Placement Attempt
  const mainPlacementEx = generatePlacementExercise(
    skill,
    'APPLICATION',
    equipment,
    placementBpm,
    mem,
    targetLength
  );
  exercises.push({
    ...mainPlacementEx,
    id: `${sessionId}-placement-main`,
    title: `${skill.name} — Phrase Insertion (${targetLength})`,
    pedagogicalRole: 'PRIMARY TARGET',
    whyThisExercise: `Execute the primary targeted fill insertion on the exact beat count with full timing control.`,
    purpose: `Insert ${skill.name} cleanly into the phrase on the target beat without losing the groove pulse.`,
    durationSeconds: 150,
  });

  // 4. Groove Return & Time Continuity Challenge (150s) - Generates 2nd Placement Attempt
  const grooveReturnEx = generatePlacementExercise(
    skill,
    'TRANSFER',
    equipment,
    placementBpm,
    mem,
    targetLength
  );
  grooveReturnEx.id = `${sessionId}-placement-return`;
  grooveReturnEx.title = `${skill.name} — Downbeat Landing & Groove Return`;
  grooveReturnEx.pedagogicalRole = assistanceMode === 'none' ? 'INDEPENDENCE TEST' : 'REINFORCEMENT';
  grooveReturnEx.whyThisExercise = 'Reinforce crash landing on Beat 1 and seamless groove timekeeping recovery.';
  grooveReturnEx.purpose = `Execute ${targetLength} fill, land crash on Beat 1, and immediately return to steady groove timekeeper without hesitation or rushing.`;
  grooveReturnEx.instructions = isPad
    ? `Play 2 bars of pad groove pulse, insert ${skill.name} as a ${targetLength} fill, accent Beat 1 strongly (crash), then immediately resume 2 bars of steady groove pulse.`
    : `Play 2 bars of groove, execute ${skill.name} as a ${targetLength} fill, land crash on Beat 1, then immediately play 2 bars of steady groove without dropping tempo.`;
  grooveReturnEx.durationSeconds = 150;
  if (grooveReturnEx.musicalPlacement) {
    grooveReturnEx.musicalPlacement.targetLanding = 'groove_on_1';
    grooveReturnEx.musicalPlacement.placementType = 'groove_insert';
  }
  exercises.push(grooveReturnEx);

  // 5. Cooldown (90s)
  exercises.push({
    id: `${sessionId}-cooldown`,
    title: 'Cool-Down & Pulse Reset',
    phase: 'COOL DOWN',
    skillIds: [skill.id],
    pedagogicalRole: 'COOL-DOWN',
    whyThisExercise: 'Reset heart rate and lower muscle tension after placement training.',
    purpose: 'Reset heart rate and lower muscle tension after placement training.',
    instructions: 'Play quiet alternating single strokes, slowly reducing stick height. Keep shoulders loose.',
    sticking: 'R L R L',
    counting: '1 2 3 4',
    timeSignature: '4/4',
    subdivision: 'Quarter Notes',
    tempo: Math.max(50, placementBpm - 15),
    isSuggestedStartingTempo: false,
    durationSeconds: 90,
    exerciseType: 'cooldown',
    equipmentRequired: 'Either',
    difficulty: 'Easy',
  });

  return {
    id: sessionId,
    date: new Date().toISOString().split('T')[0],
    focusTopic: `${skill.name} — Musical Placement & Downbeat Landing`,
    notes: curriculumDecision
      ? `[Curriculum Decision: ${curriculumDecision.decision}] ${curriculumDecision.reason}`
      : `Focused musical phrase insertion, beat-1 downbeat landing, and groove return for ${skill.name}.`,
    rating: 4,
    startedAt: new Date().toISOString(),
    durationMinutes: 10,
    equipment,
    practiceContext: 'SKILL_DEVELOPMENT',
    focusMode: 'MY_CHOICE',
    selectedSkillIds: [skill.id],
    skillId: skill.id,
    sessionStatus: 'IN_PROGRESS',
    practiceIntent,
    exercises,
  };
}
