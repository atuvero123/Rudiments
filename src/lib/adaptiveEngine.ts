import {
  PracticeExercise,
  SelfCheckFeeling,
  ExerciseResult,
  PracticeSession,
  ExercisePhase,
} from '../types';
import { generatePlacementExercise } from './placementEngine';

export type AdaptiveAction =
  | 'advance'
  | 'repeat'
  | 'reduce_tempo'
  | 'simplify'
  | 'recover'
  | 'end_skill_block';

export interface AdaptiveDecision {
  action: AdaptiveAction;
  previousTempo: number;
  nextTempo: number;
  reason: string;
  frictionTags: string[];
  successfulRounds: number; // clean / mostly clean count on this skill stage
  buttonLabel: string;
  coachingMessage: string;
  nextExerciseOverride?: PracticeExercise;
}

/**
 * Checks whether the learner has met the implementation gate for a skill.
 * Gate Requirement: At least 1 CLEAN_AND_RELAXED or 2 MOSTLY_CLEAN rounds on the skill stage.
 */
export function isImplementationGateSatisfied(
  skillId: string,
  completedExercises: PracticeExercise[]
): boolean {
  const skillExercises = completedExercises.filter((e) => e.skillIds.includes(skillId));

  const cleanCount = skillExercises.filter(
    (e) => e.result?.selfCheck === 'CLEAN_AND_RELAXED'
  ).length;

  const mostlyCleanCount = skillExercises.filter(
    (e) => e.result?.selfCheck === 'MOSTLY_CLEAN'
  ).length;

  return cleanCount >= 1 || mostlyCleanCount >= 2;
}

/**
 * Computes an explicit AdaptiveDecision after a self-check evaluation.
 */
export function calculateAdaptiveDecision(
  currentExercise: PracticeExercise,
  feeling: SelfCheckFeeling,
  issueTags: string[],
  currentTempo: number,
  completedExercises: PracticeExercise[]
): AdaptiveDecision {
  const primarySkillId = currentExercise.skillIds[0] || 'skill';
  
  // Count existing clean / mostly clean rounds for this skill in the current session
  const skillExercises = completedExercises.filter((e) => e.skillIds.includes(primarySkillId));
  const cleanRounds = skillExercises.filter(
    (e) => e.result?.selfCheck === 'CLEAN_AND_RELAXED'
  ).length;
  const mostlyCleanRounds = skillExercises.filter(
    (e) => e.result?.selfCheck === 'MOSTLY_CLEAN'
  ).length;

  const isWarmup =
    currentExercise.phase === 'WARM UP' || currentExercise.exerciseType === 'warmup';

  const isTechnical =
    !isWarmup &&
    (currentExercise.phase === 'FOUNDATION' || currentExercise.exerciseType === 'technique');

  const isApplication =
    currentExercise.phase === 'APPLICATION' ||
    currentExercise.phase === 'CHALLENGE' ||
    currentExercise.exerciseType === 'application' ||
    !!currentExercise.musicalPlacement;

  // Total successful rounds count after this check
  let successfulRounds = cleanRounds + mostlyCleanRounds;
  if (feeling === 'CLEAN_AND_RELAXED' || feeling === 'MOSTLY_CLEAN') {
    successfulRounds += 1;
  }

  // Check if gate is satisfied BEFORE or WITH this round
  const gateSatisfied =
    cleanRounds + (feeling === 'CLEAN_AND_RELAXED' ? 1 : 0) >= 1 ||
    mostlyCleanRounds + (feeling === 'MOSTLY_CLEAN' ? 1 : 0) >= 2;

  // ---------------- 0. WARM UP HANDLING (Always advance on clean / mostly clean) ----------------
  if (isWarmup && (feeling === 'CLEAN_AND_RELAXED' || feeling === 'MOSTLY_CLEAN')) {
    return {
      action: 'advance',
      previousTempo: currentTempo,
      nextTempo: currentTempo,
      reason: 'Warm-up complete. Pulse and grip relaxed.',
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: 'Warm-up pulse locked in. Moving directly to calibration and placement work.',
      buttonLabel: 'PROCEED TO CALIBRATION',
    };
  }

  // ---------------- 1. CLEAN_AND_RELAXED ----------------
  if (feeling === 'CLEAN_AND_RELAXED') {
    const isFirstCleanOnEx =
      skillExercises.filter((e) => e.id === currentExercise.id && e.result?.selfCheck === 'CLEAN_AND_RELAXED')
        .length === 0;

    // For technical exercises in foundation stage, only repeat once if not yet consolidated
    if (isTechnical && isFirstCleanOnEx && cleanRounds === 0 && !currentExercise.musicalPlacement) {
      return {
        action: 'repeat',
        previousTempo: currentTempo,
        nextTempo: currentTempo,
        reason: 'Clean & Relaxed execution achieved. Consolidating muscle memory before advancing.',
        frictionTags: issueTags,
        successfulRounds,
        coachingMessage: `Good control! Repeat once at ${currentTempo} BPM to consolidate relaxed muscle memory.`,
        buttonLabel: `REPEAT AT ${currentTempo} BPM`,
      };
    }

    // Otherwise, advance with +2 to +4 BPM increase or move to next stage
    const nextTempo = Math.min(220, currentTempo + (isApplication ? 2 : 4));
    return {
      action: 'advance',
      previousTempo: currentTempo,
      nextTempo,
      reason: 'Sufficient clean evidence demonstrated. Advancing tempo / implementation stage.',
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: isApplication
        ? `Clean musical placement achieved! Pushing placement tempo to ${nextTempo} BPM.`
        : `Great control and even spacing! Pushing tempo up to ${nextTempo} BPM.`,
      buttonLabel: isApplication ? `ADVANCE PLACEMENT TO ${nextTempo} BPM` : `ADVANCE TO ${nextTempo} BPM`,
    };
  }

  // ---------------- 2. MOSTLY_CLEAN ----------------
  if (feeling === 'MOSTLY_CLEAN') {
    const isFirstMostlyCleanOnEx =
      skillExercises.filter((e) => e.id === currentExercise.id && e.result?.selfCheck === 'MOSTLY_CLEAN')
        .length === 0;

    if (isTechnical && isFirstMostlyCleanOnEx && !gateSatisfied && !currentExercise.musicalPlacement) {
      return {
        action: 'repeat',
        previousTempo: currentTempo,
        nextTempo: currentTempo,
        reason: 'Minor friction detected. Repeat once at current BPM to stabilize pulse.',
        frictionTags: issueTags,
        successfulRounds,
        coachingMessage: `Solid effort. Repeat at ${currentTempo} BPM with extra focus on dynamic consistency.`,
        buttonLabel: `STABILIZE AT ${currentTempo} BPM`,
      };
    }

    return {
      action: 'advance',
      previousTempo: currentTempo,
      nextTempo: currentTempo,
      reason: 'Sufficient control demonstrated. Continuing through session plan at current tempo.',
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: `Controlled execution. Holding at ${currentTempo} BPM for upcoming exercises.`,
      buttonLabel: `CONTINUE AT ${currentTempo} BPM`,
    };
  }

  // ---------------- 3. INCONSISTENT ----------------
  if (feeling === 'INCONSISTENT') {
    // DO NOT ADVANCE TO A HARDER STAGE!
    const reducedTempo = Math.max(30, currentTempo - 5);

    let specificReason = 'Inconsistent pulse or note spacing detected. Reducing tempo to rebuild control.';
    let coachingMsg = `Timing or spacing became unstable. Let's reduce to ${reducedTempo} BPM and repeat before progressing.`;
    let btnLabel = `RETRY AT ${reducedTempo} BPM`;
    let actionType: AdaptiveAction = 'reduce_tempo';
    let overrideEx: PracticeExercise | undefined = undefined;

    if (issueTags.includes('Missed Beat 1')) {
      specificReason = 'Missed Beat 1 downbeat landing after fill phrase. Simplifying placement to beat 4 fill only.';
      coachingMsg = `Keep the fill to beat 4 only and reduce tempo to ${reducedTempo} BPM before trying a longer phrase.`;
      btnLabel = `SIMPLIFY TO 1-BEAT FILL AT ${reducedTempo} BPM`;
      actionType = 'simplify';

      // Build simplified 1-beat placement override exercise
      const mockSkill = {
        id: primarySkillId,
        name: currentExercise.title.split('—')[0].trim(),
      } as any;
      overrideEx = generatePlacementExercise(
        mockSkill,
        currentExercise.progressionStage || 'APPLICATION',
        currentExercise.equipmentRequired === 'Full Drum Kit' ? 'Full Drum Kit' : 'Practice Pad',
        reducedTempo,
        undefined,
        '1 beat'
      );
    } else if (issueTags.includes('Entered Too Early') || issueTags.includes('Entered Too Late')) {
      specificReason = 'Incorrect fill start point alignment. Simplifying fill entry and counting beats 1-3.';
      coachingMsg = `Entered the fill out of time. Let's reduce to ${reducedTempo} BPM and count beats 1–3 out loud before starting on beat 4.`;
      btnLabel = `RETRY WITH COUNTING AT ${reducedTempo} BPM`;
      actionType = 'simplify';
    } else if (issueTags.includes('Lost Groove') || issueTags.includes('Transition Problem')) {
      specificReason = 'Groove transition pulse lost. Simplifying to a 1-beat fill transition.';
      coachingMsg = `Groove transition was lost. Let's simplify to a 1-beat fill at ${reducedTempo} BPM to stabilize the transition back to beat 1.`;
      btnLabel = `RETRY 1-BEAT TRANSITION AT ${reducedTempo} BPM`;
      actionType = 'simplify';
    } else if (issueTags.includes('Timing') || issueTags.includes('Too fast') || issueTags.includes('Rushed Fill') || issueTags.includes('Dragged Fill')) {
      specificReason = 'Timing rushed or dragged against click. Slowing down tempo to stabilize pulse.';
      coachingMsg = `Timing became unstable during placement. Let's reduce to ${reducedTempo} BPM and stabilize pulse before progressing.`;
      btnLabel = `RETRY AT ${reducedTempo} BPM`;
    } else if (issueTags.includes('Uneven notes')) {
      specificReason = 'Uneven note spacing detected. Slowing down to focus on stick heights and spacing.';
      coachingMsg = `Uneven note spacing detected. Reducing tempo to ${reducedTempo} BPM to focus on even stick heights.`;
      btnLabel = `RETRY AT ${reducedTempo} BPM`;
    } else if (issueTags.includes('Lost count')) {
      specificReason = 'Lost count of subdivision. Reducing tempo and reinforcing counting.';
      coachingMsg = `Subdivision count was lost. Let's reduce to ${reducedTempo} BPM and count every note out loud.`;
      btnLabel = `TRY SIMPLIFIED VERSION AT ${reducedTempo} BPM`;
      actionType = 'simplify';
    } else if (issueTags.includes('Tension') || issueTags.includes('Coordination')) {
      specificReason = 'Forearm/wrist tension detected. Reducing tempo to maintain loose fulcrum.';
      coachingMsg = `Tension detected. Let's step back to ${reducedTempo} BPM and focus on relaxed wrists.`;
      btnLabel = `RETRY AT ${reducedTempo} BPM`;
    }

    return {
      action: actionType,
      previousTempo: currentTempo,
      nextTempo: reducedTempo,
      reason: specificReason,
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: coachingMsg,
      buttonLabel: btnLabel,
      nextExerciseOverride: overrideEx,
    };
  }

  // ---------------- 4. TOO_DIFFICULT ----------------
  // (feeling === 'TOO_DIFFICULT')
  // DO NOT ADVANCE TO A HARDER STAGE! TRIGGER RECOVERY MODE!
  const recoveryTempo = Math.max(30, currentTempo - 10);

  // Check if learner has failed 2+ times consecutively
  const consecutiveFailures = skillExercises.filter(
    (e) => e.result?.selfCheck === 'TOO_DIFFICULT' || e.result?.selfCheck === 'INCONSISTENT'
  ).length;

  if (consecutiveFailures >= 2) {
    return {
      action: 'end_skill_block',
      previousTempo: currentTempo,
      nextTempo: recoveryTempo,
      reason: 'Multiple difficult attempts. Ending skill block positively and transitioning to cool-down.',
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: `We hit a friction point today. Let's end this skill block positively, lock in ${recoveryTempo} BPM as our practice baseline, and move to cool-down.`,
      buttonLabel: 'TRANSITION TO COOL DOWN',
    };
  }

  if (isApplication) {
    // Return to isolated/foundation mechanics
    return {
      action: 'recover',
      previousTempo: currentTempo,
      nextTempo: recoveryTempo,
      reason: 'Application stage too demanding without isolated control. Triggering Recovery Mode.',
      frictionTags: issueTags,
      successfulRounds,
      coachingMessage: `This musical application is currently too demanding. Let's make this easier: return to isolated execution at ${recoveryTempo} BPM and rebuild even spacing.`,
      buttonLabel: `RETURN TO ISOLATED AT ${recoveryTempo} BPM`,
      nextExerciseOverride: {
        id: `recovery-${Date.now()}`,
        title: `${currentExercise.title.split('—')[0].trim()} — Isolated Recovery Mechanics`,
        phase: 'FOUNDATION',
        progressionStage: 'FOUNDATION',
        skillIds: currentExercise.skillIds,
        purpose: 'Rebuild clean mechanics and even note spacing in isolation at a relaxed tempo.',
        instructions: 'Focus purely on clean execution against the click. Keep wrists completely relaxed.',
        sticking: currentExercise.sticking,
        counting: currentExercise.counting,
        timeSignature: currentExercise.timeSignature,
        subdivision: currentExercise.subdivision,
        tempo: recoveryTempo,
        durationSeconds: 240, // 4 mins
        exerciseType: 'technique',
        equipmentRequired: currentExercise.equipmentRequired,
        difficulty: 'Easy',
      },
    };
  }

  // Otherwise isolated/technical exercise too difficult
  return {
    action: 'reduce_tempo',
    previousTempo: currentTempo,
    nextTempo: recoveryTempo,
    reason: 'Exercise too demanding at current tempo. Triggering Recovery Mode at lower tempo.',
    frictionTags: issueTags,
    successfulRounds,
    coachingMessage: `This tempo is creating tension. Let's drop down to ${recoveryTempo} BPM and rebuild relaxed execution without rushing.`,
    buttonLabel: `RETRY AT ${recoveryTempo} BPM`,
  };
}

/**
 * Adapts upcoming exercises in the session queue based on an AdaptiveDecision
 * while strictly freezing the exercise queue length and preserving evidence-bearing exercises.
 */
export function updateExerciseQueueWithAdaptiveDecision(
  session: PracticeSession,
  currentIndex: number,
  decision: AdaptiveDecision
): PracticeExercise[] {
  const exercises = [...(session.exercises || [])];
  const currentEx = exercises[currentIndex];
  if (!currentEx) return exercises;

  // 1. Advance: update next exercise tempo if applicable
  if (decision.action === 'advance') {
    if (exercises[currentIndex + 1]) {
      exercises[currentIndex + 1] = {
        ...exercises[currentIndex + 1],
        tempo: Math.max(exercises[currentIndex + 1].tempo, decision.nextTempo),
      };
    }
    return exercises;
  }

  // 2. Reduce Tempo: propagate adjusted tempo to remaining exercises
  if (decision.action === 'reduce_tempo') {
    for (let i = currentIndex + 1; i < exercises.length; i++) {
      if (exercises[i].phase !== 'COOL DOWN') {
        exercises[i] = {
          ...exercises[i],
          tempo: Math.min(exercises[i].tempo, decision.nextTempo),
        };
      }
    }
    return exercises;
  }

  // 3. Simplify: if next exercise can be simplified (e.g. 1-beat fill override), adapt in-place
  if (decision.action === 'simplify') {
    if (decision.nextExerciseOverride && exercises[currentIndex + 1]) {
      exercises[currentIndex + 1] = {
        ...decision.nextExerciseOverride,
        id: exercises[currentIndex + 1].id,
        tempo: decision.nextTempo,
      };
    } else {
      for (let i = currentIndex + 1; i < exercises.length; i++) {
        if (exercises[i].phase !== 'COOL DOWN') {
          exercises[i] = {
            ...exercises[i],
            tempo: decision.nextTempo,
          };
        }
      }
    }
    return exercises;
  }

  // 4. Recover: adapt the next slot in-place for recovery mechanics
  if (decision.action === 'recover') {
    if (decision.nextExerciseOverride && exercises[currentIndex + 1]) {
      exercises[currentIndex + 1] = {
        ...decision.nextExerciseOverride,
        id: exercises[currentIndex + 1].id,
        tempo: decision.nextTempo,
      };
    } else if (exercises[currentIndex + 1]) {
      exercises[currentIndex + 1] = {
        ...exercises[currentIndex + 1],
        title: `${currentEx.title.split('—')[0].trim()} — Isolated Recovery Mechanics`,
        phase: 'FOUNDATION' as ExercisePhase,
        tempo: decision.nextTempo,
        purpose: 'Re-establish relaxed grip and consistent note spacing at a lower tempo.',
      };
    }
    return exercises;
  }

  // 5. Repeat: update upcoming exercise tempo without expanding or pruning the queue
  if (decision.action === 'repeat') {
    if (exercises[currentIndex + 1]) {
      exercises[currentIndex + 1] = {
        ...exercises[currentIndex + 1],
        tempo: decision.nextTempo,
      };
    }
    return exercises;
  }

  return exercises;
}

/**
 * Computes working range established in the session for session summary.
 */
export function computeSessionWorkingRange(session: PracticeSession): {
  workingBpm: number;
  summaryText: string;
  nextSessionGuidance: string;
} {
  const exercises = session.exercises || [];
  const assessed = exercises.filter((e) => e.result?.selfCheck);

  if (assessed.length === 0) {
    return {
      workingBpm: 60,
      summaryText: 'No exercises completed.',
      nextSessionGuidance: 'Begin with isolated mechanics at 60 BPM.',
    };
  }

  // Find the highest tempo where the learner achieved CLEAN_AND_RELAXED or MOSTLY_CLEAN
  const cleanOrMostly = assessed.filter(
    (e) => e.result?.selfCheck === 'CLEAN_AND_RELAXED' || e.result?.selfCheck === 'MOSTLY_CLEAN'
  );

  const skillName = session.focusTopic.split('(')[0].trim() || 'Focus Skill';

  if (cleanOrMostly.length > 0) {
    const workingBpm = Math.max(...cleanOrMostly.map((e) => e.result?.tempoUsed || e.tempo));
    return {
      workingBpm,
      summaryText: `Working range established today: ${workingBpm} BPM`,
      nextSessionGuidance: `Stabilize ${skillName} at ${workingBpm} BPM before musical application.`,
    };
  }

  // If all rounds were inconsistent/too difficult:
  const lowestTempo = Math.min(...assessed.map((e) => e.result?.tempoUsed || e.tempo));
  const workingBpm = Math.max(30, lowestTempo - 5);

  return {
    workingBpm,
    summaryText: `Working baseline target established today: ${workingBpm} BPM`,
    nextSessionGuidance: `Focus on isolated ${skillName} mechanics at ${workingBpm} BPM with relaxed wrists.`,
  };
}
