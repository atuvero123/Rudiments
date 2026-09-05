import {
  GranularSkill,
  LearnerProfile,
  PracticeExercise,
  PracticeSession,
  PracticeContextOption,
  EquipmentOption,
  FocusModeOption,
} from '../types';
import {
  deriveSkillContinuityDecision,
} from './continuityEngine';
import {
  deriveCurrentCurriculumPosition,
} from './canonicalProgressEngine';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CURRICULUM_COMPETENCIES_BY_ID,
} from '../data/canonicalCurriculum';
import { generatePlacementExercise } from './placementEngine';
import { generateTransferInstructions } from './transferEngine';
import { getActiveGapClosurePlan, generateGapClosureSessionFromPlan } from './gapClosureEngine';

export { generateGapClosureSessionFromPlan };

export interface GenerateSessionInput {
  durationMinutes: number;
  practiceContext: PracticeContextOption;
  equipment: EquipmentOption;
  focusMode: FocusModeOption;
  selectedSkillIds: string[];
  songPrepName?: string;
  allSkills: GranularSkill[];
  profile: LearnerProfile;
}

export function generatePracticeSession(input: GenerateSessionInput): PracticeSession {
  const {
    durationMinutes,
    practiceContext,
    equipment,
    focusMode,
    selectedSkillIds,
    songPrepName,
    allSkills,
    profile,
  } = input;

  // 1. Determine target skills using BU2C Continuity Engine
  let primarySkills: GranularSkill[] = [];

  if (focusMode === 'MY_CHOICE' && selectedSkillIds.length > 0) {
    primarySkills = allSkills.filter((s) => selectedSkillIds.includes(s.id));
  }

  if (primarySkills.length === 0) {
    // Coach Chooses: derive canonical curriculum position & supporting repair skill
    const { activeCompetencyId } = deriveCurrentCurriculumPosition(allSkills);
    const activeComp =
      CURRICULUM_COMPETENCIES_BY_ID.get(activeCompetencyId) || CANONICAL_CURRICULUM_COMPETENCIES[0];
    const canonicalPrimarySkill =
      allSkills.find((s) => s.id === activeComp.skillId) ||
      ({
        id: activeComp.skillId,
        name: activeComp.title,
        parentTrack: 'rudiments',
        category: 'Rudiments',
        description: activeComp.description,
        status: 'LEARNING',
        confidence: 2,
        practiceCount: 0,
        currentComfortTempo: activeComp.tempoStandard.bpm,
      } as GranularSkill);

    let repairSkill: GranularSkill | null = null;
    if (activeComp.prerequisiteCompetencyIds.length > 0) {
      const pComp = CURRICULUM_COMPETENCIES_BY_ID.get(activeComp.prerequisiteCompetencyIds[0]);
      if (pComp) {
        repairSkill = allSkills.find((s) => s.id === pComp.skillId) || null;
      }
    }

    primarySkills = repairSkill ? [canonicalPrimarySkill, repairSkill] : [canonicalPrimarySkill];
  }

  const primarySkill = primarySkills[0];
  const secondarySkill = primarySkills[1] || primarySkills[0];

  // Derive evidence continuity decisions for primary and secondary skills
  const primaryDecision = deriveSkillContinuityDecision(
    primarySkill,
    allSkills,
    profile,
    equipment,
    practiceContext
  );

  const secondaryDecision = deriveSkillContinuityDecision(
    secondarySkill,
    allSkills,
    profile,
    equipment,
    practiceContext
  );

  const primaryTempoInfo = {
    tempo: primaryDecision.recommendedStartingTempo,
    isSuggested: primaryDecision.tempoLabel === 'SUGGESTED BASELINE TEMPO',
  };

  const secondaryTempoInfo = {
    tempo: secondaryDecision.recommendedStartingTempo,
    isSuggested: secondaryDecision.tempoLabel === 'SUGGESTED BASELINE TEMPO',
  };

  // 2. Build structured exercises with recurring friction adaptation
  const exercises: PracticeExercise[] = [];
  const sessionId = `sess-${Date.now()}`;

  // Helper for friction-tailored instructions
  const getFrictionAdaptedInstructions = (
    skillName: string,
    recurringFriction: string | null,
    defaultText: string
  ): string => {
    if (!recurringFriction) return defaultText;
    const lower = recurringFriction.toLowerCase();
    if (lower.includes('coordination')) {
      return `Focus on limb isolation and slower recombination for ${skillName}. Ensure non-dominant hand/foot moves with complete independence before building speed.`;
    }
    if (lower.includes('uneven')) {
      return `Focus on matching left and right stick heights and maintaining equal time intervals between every stroke on ${skillName}.`;
    }
    if (lower.includes('timing')) {
      return `Focus on exact click alignment and speak the subdivision out loud (1 e & a / 1-trip-let) for ${skillName}.`;
    }
    if (lower.includes('count')) {
      return `Count every main beat out loud (1 2 3 4) while executing ${skillName}. Do not rely on muscle memory alone.`;
    }
    if (lower.includes('tension')) {
      return `Keep shoulders low, fulcrum loose, and wrists soft during ${skillName}. If stiffness occurs, drop tempo by 5 BPM immediately.`;
    }
    if (lower.includes('transition')) {
      return `Focus on seamlessly landing beat 1 when exiting or entering ${skillName} without rushing or dragging.`;
    }
    return `${defaultText} Pay special attention to clearing recent ${recurringFriction} friction.`;
  };

  const primaryInstructions = getFrictionAdaptedInstructions(
    primarySkill.name,
    primaryDecision.recurringFriction,
    'Focus purely on clean execution against the metronome. Do not rush. Stop if tension occurs.'
  );

  // Active Checkpoint Gap Closure Override
  const activeGapPlan = getActiveGapClosurePlan(primarySkill.id);
  if (activeGapPlan && activeGapPlan.exercises.length > 0) {
    exercises.push({
      id: `${sessionId}-warmup`,
      title: 'Wrist Flow & Loose Rebound Warm-Up',
      phase: 'WARM UP',
      skillIds: [primarySkill.id],
      purpose: 'Warm up muscles and loosen wrists before technical gap closure remediation.',
      instructions: 'Play easy alternating strokes with loose grip. Drop shoulders and focus on natural stick rebound.',
      sticking: 'R L R L R L R L',
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: '4/4',
      subdivision: '8th Notes',
      tempo: Math.min(80, primaryTempoInfo.tempo),
      durationSeconds: 120,
      exerciseType: 'warmup',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });

    activeGapPlan.exercises.forEach((ex, idx) => {
      exercises.push({
        ...ex,
        id: `${sessionId}-gap-${idx + 1}`,
      });
    });

    if (durationMinutes > 15) {
      exercises.push({
        id: `${sessionId}-app`,
        title: `${primarySkill.name} — Phrase Application & Stability`,
        phase: 'APPLICATION',
        skillIds: [primarySkill.id],
        purpose: 'Apply remediated technique inside a 4-bar phrase.',
        instructions: `Play 3 bars of timekeeper groove, then execute ${primarySkill.name} on bar 4 leading to solid crash downbeat.`,
        sticking: getStickingForSkill(primarySkill.id),
        counting: getCountingForSkill(primarySkill.id),
        timeSignature: primarySkill.relevantTimeSignatures?.[0] || '4/4',
        subdivision: getSubdivisionForSkill(primarySkill.id),
        tempo: primaryTempoInfo.tempo,
        durationSeconds: 300,
        exerciseType: 'application',
        equipmentRequired: equipment,
        difficulty: 'Moderate',
      });
    }

    exercises.push({
      id: `${sessionId}-cooldown`,
      title: 'Cool-Down & Muscle Release',
      phase: 'COOL DOWN',
      skillIds: [primarySkill.id],
      purpose: 'Release forearm tension and evaluate execution quality.',
      instructions: 'Light wrist rolls, stretch fingers, and assess execution feel.',
      sticking: 'R L R L',
      counting: '1 2 3 4',
      timeSignature: '4/4',
      subdivision: 'Quarter Notes',
      tempo: 60,
      durationSeconds: 120,
      exerciseType: 'cooldown',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });

    return {
      id: sessionId,
      date: new Date().toISOString().split('T')[0],
      durationMinutes,
      practiceContext,
      equipment,
      focusMode,
      selectedSkillIds: primarySkills.map((s) => s.id),
      songPrepName,
      focusTopic: `${primarySkill.name} — ${activeGapPlan.checkpointLevel} Gap Closure (${activeGapPlan.failedCriteria.length} gaps)`,
      notes: `Guided session on ${equipment} targeting ${activeGapPlan.failedCriteria.length} pending criteria from ${activeGapPlan.checkpointLevel} checkpoint.`,
      rating: 5,
      exercises,
      sessionStatus: 'NOT_STARTED',
    };
  }

  // Time partitioning
  if (durationMinutes <= 15) {
    // Short 15-min Session
    exercises.push({
      id: `${sessionId}-ex1`,
      title: 'Wrist Flow & Rebound Warm-Up',
      phase: 'WARM UP',
      skillIds: [primarySkill.id],
      purpose: 'Establish loose fulcrum, relaxed shoulders, and even rebound before technical work.',
      instructions: 'Play continuous alternating 8th notes on the pad/snare. Focus on breathing and relaxed wrists.',
      sticking: 'R L R L R L R L',
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: '4/4',
      subdivision: '8th Notes',
      tempo: Math.min(80, primaryTempoInfo.tempo + 10),
      isSuggestedStartingTempo: false,
      durationSeconds: 120, // 2 mins
      exerciseType: 'warmup',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });

    const transferModel15 = primaryDecision.currentStage === 'TRANSFER' && supportsSpatialTransfer(primarySkill)
      ? generateTransferInstructions(primarySkill, equipment, 'TRANSFER', primaryDecision.recurringFriction)
      : undefined;

    exercises.push({
      id: `${sessionId}-ex2`,
      title: `${primarySkill.name} — ${primaryDecision.currentStage} Mechanics`,
      phase: 'MAIN WORK',
      skillIds: [primarySkill.id],
      purpose: `Master exact note spacing and stroke mechanics for ${primarySkill.name}.`,
      instructions: primaryInstructions,
      sticking: transferModel15?.baseSticking || getStickingForSkill(primarySkill.id),
      counting: getCountingForSkill(primarySkill.id),
      timeSignature: primarySkill.relevantTimeSignatures?.[0] || '4/4',
      subdivision: getSubdivisionForSkill(primarySkill.id),
      tempo: primaryTempoInfo.tempo,
      isSuggestedStartingTempo: primaryTempoInfo.isSuggested,
      targetTempo: primarySkill.targetTempo || primaryTempoInfo.tempo + 15,
      durationSeconds: 360, // 6 mins
      exerciseType: 'technique',
      equipmentRequired: equipment,
      difficulty: 'Moderate',
      progressionStage: primaryDecision.currentStage,
      challengeType: 'precision-mechanics',
      transferInstructions: transferModel15,
    });

    exercises.push({
      id: `${sessionId}-ex3`,
      title: `${primarySkill.name} — Musical Bridge`,
      phase: 'APPLICATION',
      skillIds: [primarySkill.id],
      purpose: equipment === 'Practice Pad'
        ? 'Apply dynamic accents and simulated drum orchestration on the pad.'
        : 'Integrate the skill into a 4-bar groove and crash downbeat.',
      instructions: equipment === 'Practice Pad'
        ? `Play the pattern with strong accents on the Right hand. Imagine the accented R is your high tom.`
        : `Play 3 bars of steady 4/4 groove, then execute ${primarySkill.name} on bar 4 into crash beat 1.`,
      sticking: getStickingForSkill(primarySkill.id),
      counting: getCountingForSkill(primarySkill.id),
      timeSignature: primarySkill.relevantTimeSignatures?.[0] || '4/4',
      subdivision: getSubdivisionForSkill(primarySkill.id),
      tempo: primaryTempoInfo.tempo,
      isSuggestedStartingTempo: primaryTempoInfo.isSuggested,
      durationSeconds: 300, // 5 mins
      exerciseType: 'application',
      equipmentRequired: equipment,
      difficulty: 'Moderate',
      progressionStage: primaryDecision.currentStage,
      padAdaptationNote: equipment === 'Practice Pad'
        ? 'Play accented R as high tom, L as floor tom'
        : undefined,
    });

    exercises.push({
      id: `${sessionId}-ex4`,
      title: 'Cool-Down & Muscle Memory Lock',
      phase: 'COOL DOWN',
      skillIds: [primarySkill.id],
      purpose: 'Slow down heart rate and lock in relaxed mechanics before ending practice.',
      instructions: 'Play gentle single strokes dropping tempo by 10 BPM. Reflect on how your hands felt.',
      sticking: 'R L R L',
      counting: '1 2 3 4',
      timeSignature: '4/4',
      subdivision: 'Quarter Notes',
      tempo: Math.max(50, primaryTempoInfo.tempo - 10),
      isSuggestedStartingTempo: false,
      durationSeconds: 120, // 2 mins
      exerciseType: 'cooldown',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });

  } else {
    // 30, 45, 60, or 90 minute sessions
    const totalSecs = durationMinutes * 60;
    const warmupSecs = 240; // 4 mins
    const cooldownSecs = 180; // 3 mins
    const remainingSecs = totalSecs - warmupSecs - cooldownSecs;
    const blockSecs = Math.floor(remainingSecs / 3);

    // 1. Warm-Up
    exercises.push({
      id: `${sessionId}-ex1`,
      title: 'Relaxation & Rebound Warm-Up',
      phase: 'WARM UP',
      skillIds: [primarySkill.id],
      purpose: 'Warm up forearms, loosen fulcrum grip, and check posture.',
      instructions: '8-on-a-hand exercise: 8 strokes Right, 8 strokes Left, then alternating. Keep shoulders low.',
      sticking: 'R R R R R R R R   L L L L L L L L',
      counting: '1 & 2 & 3 & 4 &',
      timeSignature: '4/4',
      subdivision: '8th Notes',
      tempo: 80,
      isSuggestedStartingTempo: false,
      durationSeconds: warmupSecs,
      exerciseType: 'warmup',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });

    // 2. Foundation / Progression Block (Primary Skill)
    const stage = primaryDecision.currentStage;
    const isRegressed = primaryDecision.isRegressedEmphasis;

    let mainTitle = `${primarySkill.name} — Precision Mechanics`;
    let mainPurpose = `Establish clean isolated execution and exact subdivision for ${primarySkill.name}.`;
    let mainChallenge: 'precision-mechanics' | 'dynamic-control' | 'continuous-stream' | 'sustained-endurance' | 'musical-fill' | 'groove-phrase' | 'kit-orchestration' | 'accent-displacement' = 'precision-mechanics';

    if (isRegressed) {
      mainTitle = `${primarySkill.name} — ${primaryDecision.todayEmphasis}`;
      mainPurpose = `Rebuild relaxed mechanics and clear ${primaryDecision.recurringFriction || 'execution tension'} at a controlled tempo.`;
      mainChallenge = 'precision-mechanics';
    } else if (stage === 'CONTROL') {
      mainTitle = `${primarySkill.name} — Dynamic Accent & Pulse Control`;
      mainPurpose = `Control tap vs accent stroke heights and maintain steady time on ${primarySkill.name}.`;
      mainChallenge = 'dynamic-control';
    } else if (stage === 'ENDURANCE') {
      mainTitle = `${primarySkill.name} — Continuous Sustained Flow`;
      mainPurpose = `Sustain pattern execution cleanly across extended rounds without wrist fatigue.`;
      mainChallenge = 'sustained-endurance';
    } else if (stage === 'APPLICATION') {
      mainTitle = `${primarySkill.name} — 1-Bar & 2-Bar Fill Phrasing`;
      mainPurpose = `Integrate ${primarySkill.name} into musical phrasing with clean beat-1 crash landings.`;
      mainChallenge = 'musical-fill';
    } else if (stage === 'TRANSFER') {
      if (equipment === 'Practice Pad') {
        mainTitle = `${primarySkill.name} — Pad Zone & Accent Displacement Transfer`;
        mainPurpose = `Displace accents across simulated orchestration zones on the pad.`;
        mainChallenge = 'accent-displacement';
      } else {
        mainTitle = `${primarySkill.name} — Snare-to-Tom Kit Orchestration`;
        mainPurpose = `Move pattern seamlessly between snare, toms, and kick integration on full kit.`;
        mainChallenge = 'kit-orchestration';
      }
    }

    const transferModel = stage === 'TRANSFER' && supportsSpatialTransfer(primarySkill)
      ? generateTransferInstructions(primarySkill, equipment, 'TRANSFER', primaryDecision.recurringFriction)
      : undefined;

    exercises.push({
      id: `${sessionId}-ex2`,
      title: mainTitle,
      phase: 'MAIN WORK',
      skillIds: [primarySkill.id],
      purpose: mainPurpose,
      instructions: primaryInstructions,
      sticking: transferModel?.baseSticking || getStickingForSkill(primarySkill.id),
      counting: getCountingForSkill(primarySkill.id),
      timeSignature: primarySkill.relevantTimeSignatures?.[0] || '4/4',
      subdivision: getSubdivisionForSkill(primarySkill.id),
      tempo: primaryTempoInfo.tempo,
      isSuggestedStartingTempo: primaryTempoInfo.isSuggested,
      targetTempo: primarySkill.targetTempo || primaryTempoInfo.tempo + 20,
      durationSeconds: blockSecs,
      exerciseType: 'technique',
      equipmentRequired: equipment,
      difficulty: 'Moderate',
      progressionStage: stage,
      challengeType: mainChallenge,
      transferInstructions: transferModel,
    });

    // 3. Development
    exercises.push({
      id: `${sessionId}-ex3`,
      title: `${secondarySkill.name} — Continuous Stream & Dynamic Control`,
      phase: 'DEVELOPMENT',
      skillIds: [secondarySkill.id],
      purpose: `Build stamina and dynamic control on ${secondarySkill.name} without introducing tension.`,
      instructions: 'Play 4 bars quiet (pianissimo), 4 bars medium (mezzo-forte). Keep metronome steady.',
      sticking: getStickingForSkill(secondarySkill.id),
      counting: getCountingForSkill(secondarySkill.id),
      timeSignature: secondarySkill.relevantTimeSignatures?.[0] || '4/4',
      subdivision: getSubdivisionForSkill(secondarySkill.id),
      tempo: secondaryTempoInfo.tempo,
      isSuggestedStartingTempo: secondaryTempoInfo.isSuggested,
      targetTempo: secondarySkill.targetTempo || secondaryTempoInfo.tempo + 15,
      durationSeconds: blockSecs,
      exerciseType: 'coordination',
      equipmentRequired: equipment,
      difficulty: 'Moderate',
      progressionStage: secondaryDecision.currentStage,
    });

    // 4. Application / Context Bridge (BU2E Placement Engine)
    const basePlacementEx = generatePlacementExercise(
      primarySkill,
      stage,
      equipment,
      primaryTempoInfo.tempo,
      undefined
    );

    let appTitle = basePlacementEx.title;
    let appPurpose = basePlacementEx.purpose;
    let appInstructions = basePlacementEx.instructions;

    if (practiceContext === 'SONG_SERVICE_PREP' || songPrepName) {
      appTitle = `Service Prep: ${songPrepName || profile.favouriteSongs[0] || 'Worship Song'} Application`;
      appPurpose = `Apply ${primarySkill.name} into the arrangement of ${songPrepName || 'your Sunday worship set'}.`;
      appInstructions = `Play the song groove and execute ${primarySkill.name} as a fill transition into the chorus downbeat.`;
    }

    exercises.push({
      ...basePlacementEx,
      id: `${sessionId}-ex4`,
      title: appTitle,
      purpose: appPurpose,
      instructions: appInstructions,
      skillIds: [primarySkill.id, secondarySkill.id],
      isSuggestedStartingTempo: primaryTempoInfo.isSuggested,
      durationSeconds: blockSecs,
    });

    // 5. Cool Down
    exercises.push({
      id: `${sessionId}-ex5`,
      title: 'Cool Down & Self-Reflection',
      phase: 'COOL DOWN',
      skillIds: [primarySkill.id],
      purpose: 'Relax hands and log exercise feedback.',
      instructions: 'Light wrist rolls, stretch fingers, and complete your quick self-check.',
      sticking: 'R L R L',
      counting: '1 2 3 4',
      timeSignature: '4/4',
      subdivision: 'Quarter Notes',
      tempo: 60,
      isSuggestedStartingTempo: false,
      durationSeconds: cooldownSecs,
      exerciseType: 'cooldown',
      equipmentRequired: 'Either',
      difficulty: 'Easy',
    });
  }

  const mainTopic = primarySkills.map((s) => s.name).join(' & ');

  return {
    id: sessionId,
    date: new Date().toISOString().split('T')[0],
    durationMinutes,
    practiceContext,
    equipment,
    focusMode,
    selectedSkillIds: primarySkills.map((s) => s.id),
    songPrepName,
    focusTopic: `${mainTopic} (${equipment})`,
    notes: `Guided session on ${equipment} targeting ${mainTopic}.`,
    rating: 5,
    exercises,
    sessionStatus: 'NOT_STARTED',
  };
}

// Helpers for pattern stickings and counting
function supportsSpatialTransfer(skill: GranularSkill): boolean {
  // Spatial accent/orchestration maps are meaningful for patterns that are
  // actually moved between limbs/surfaces. Timing and reading foundations
  // should not suddenly become tom/pad-zone transfer drills.
  return ['rudiments', 'fills', 'coordination', 'dynamics'].includes(skill.parentTrack);
}

function getStickingForSkill(skillId: string): string {
  if (skillId === 'time-quarter-pulse') return 'R R R R';
  if (skillId === 'time-8th-subdivision') return 'R L R L R L R L';
  if (skillId === 'time-44') return 'R R R R';
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
  if (skillId.includes('onedrop')) return 'Hat (1 & 2 &) | Kick+Rimshot on Beat 3';
  if (skillId.includes('68')) return 'R L R L R L (Backbeat on 4)';
  if (skillId.includes('kick')) return 'R L R L with Kick Doubles on (2)&';
  return 'R L R L R L R L';
}

function getCountingForSkill(skillId: string): string {
  if (skillId === 'time-quarter-pulse' || skillId === 'time-44') return '1 2 3 4';
  if (skillId === 'time-8th-subdivision') return '1 & 2 & 3 & 4 &';
  if (skillId.includes('rlk') || skillId.includes('rkl') || skillId.includes('68')) {
    return '1-trip-let  2-trip-let  3-trip-let  4-trip-let';
  }
  if (skillId.includes('16th') || skillId.includes('paradiddle')) {
    return '1 e & a  2 e & a  3 e & a  4 e & a';
  }
  return '1 & 2 & 3 & 4 &';
}

function getSubdivisionForSkill(skillId: string): string {
  if (skillId === 'time-quarter-pulse' || skillId === 'time-44') return 'Quarter Notes';
  if (skillId === 'time-8th-subdivision') return '8th Notes';
  if (skillId.includes('rlk') || skillId.includes('rkl') || skillId.includes('68')) {
    return 'Triplets';
  }
  if (skillId.includes('16th') || skillId.includes('paradiddle') || skillId.includes('six-stroke')) {
    return '16th Notes';
  }
  return '8th Notes';
}
