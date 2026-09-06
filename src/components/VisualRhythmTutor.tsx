import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Compass,
  Repeat,
  ArrowRight,
  CheckSquare,
  Square,
  Headphones,
  Music,
  Sliders,
  Mic,
  BookOpen,
} from 'lucide-react';
import {
  PracticeExercise,
  InstructionMode,
  AssistanceLevel,
  FollowCuesReflection,
  IndependentRating,
  RhythmTimeline,
  RhythmEvent,
  InstrumentSurface,
  SelfCheckFeeling,
  ExerciseResult,
  PlacementAttemptEvidence,
  TransportDiagnosticState,
  TeachingStage,
} from '../types';
import { buildRhythmTimeline, buildTimelineFromTeachingDefinition } from '../lib/rhythmTimelineEngine';
import { audioEngine } from '../lib/audioEngine';
import { masterTransport } from '../lib/masterTransportEngine';
import { recordSinglePlacementAttemptEvidence } from '../lib/placementEngine';
import { getTeachingDefinition, findTeachingDefinition } from '../lib/teachingDefinitions';
import { PhraseBreakdown } from './PhraseBreakdown';
import { UnderstandStageView } from './UnderstandStageView';
import { CountingTutorView } from './CountingTutorView';
import { InteractiveDrumPad } from './InteractiveDrumPad';
import { EvaluateStageView } from './EvaluateStageView';
import { CurriculumPhraseVisualizer } from './CurriculumPhraseVisualizer';

interface VisualRhythmTutorProps {
  exercise: PracticeExercise;
  currentTempo: number;
  onCheckIn: (mode: InstructionMode, partialResult?: Partial<ExerciseResult>) => void;
  onTempoAdjust?: (delta: number) => void;
}

export type TeachingLayer = 'BREAKDOWN' | 'MUSICAL_PRACTICE';
export type PhraseStage =
  | 'COUNT_IN'
  | 'GROOVE'
  | 'PREPARE'
  | 'FILL'
  | 'LAND'
  | 'RECOVER'
  | 'LEARNER_SPACE'
  | 'IDLE';
export type LoopMode = '1x' | '2x' | '4x' | 'inf';

function getMissionInitialTeachingStage(exercise: PracticeExercise, hasDefinition = true): TeachingStage {
  const stage = exercise.curriculumMission?.stage;
  if (!stage) return hasDefinition ? 'UNDERSTAND' : 'WATCH';
  if (stage === 'UNDERSTAND') return 'UNDERSTAND';
  if (stage === 'INTERNALIZE') return 'COUNT';
  if (stage === 'HEAR') return 'WATCH';
  if (stage === 'FOLLOW' || stage === 'REDUCED') return 'FOLLOW';
  return 'PLAY';
}

function getTeachingStageInstructionMode(stage: TeachingStage): InstructionMode {
  if (stage === 'FOLLOW') return 'FOLLOW';
  if (stage === 'PLAY' || stage === 'EVALUATE') return 'PLAY';
  return 'WATCH';
}

export const VisualRhythmTutor: React.FC<VisualRhythmTutorProps> = ({
  exercise,
  currentTempo,
  onCheckIn,
  onTempoAdjust,
}) => {
  const isPad = exercise.equipmentRequired === 'Practice Pad';
  const title = exercise.title;

  // Exercise type detection for pedagogical tailoring
  const isWarmup = exercise.phase === 'WARM UP' || exercise.exerciseType === 'warmup';
  const isCalibration = title.includes('Calibration') || exercise.phase === 'FOUNDATION';
  const isSixStrokeRoll =
    exercise.skillIds?.some((id) => id.includes('six-stroke')) ||
    title.includes('Six Stroke Roll');

  // 1. Resolve the canonical C2 teaching definition before building the timeline.
  // Exact/fuzzy matches use the competency-authored timeline; unknown legacy
  // exercises retain the legacy timeline rather than silently becoming another skill.
  const matchedTeachingDef = useMemo(() => {
    const ids = [...(exercise.skillIds || []), exercise.id, exercise.title].filter(Boolean);
    for (const id of ids) {
      const found = findTeachingDefinition(id);
      if (found) return found;
    }
    return null;
  }, [exercise.id, exercise.skillIds, exercise.title]);

  const teachingDef = useMemo(() => {
    const base = matchedTeachingDef || getTeachingDefinition(exercise.title || exercise.id);
    const structure = exercise.curriculumMission?.structure;

    // C6: phrase/bar-structure missions need the master clock to travel across
    // the actual mission bar count (4/8/16/24), not loop a two-bar teaching
    // demo. Expand the canonical first-bar event template across the mission.
    if (matchedTeachingDef && exercise.curriculumMission?.competencyId === 'comp-meter-44' && structure) {
      const baseBarEvents = base.events.filter((event) => (event.bar || 1) === 1);
      const landmarks = new Set(structure.highlightLandmarkBars || [1]);
      const expandedEvents = Array.from({ length: structure.totalBars }, (_, index) => index + 1).flatMap((bar) =>
        baseBarEvents.map((event) => ({
          ...event,
          bar,
          accent: event.beat === 1 ? landmarks.has(bar) : event.accent,
          label: event.beat === 1 ? `Bar ${bar} (1)` : event.label,
          description: event.beat === 1
            ? landmarks.has(bar)
              ? `Phrase landmark — Bar ${bar} Beat 1`
              : `Bar ${bar} Beat 1`
            : event.description,
        }))
      );
      return { ...base, bars: structure.totalBars, events: expandedEvents };
    }

    return base;
  }, [matchedTeachingDef, exercise.id, exercise.title, exercise.curriculumMission]);

  const timeline: RhythmTimeline = useMemo(() => {
    return matchedTeachingDef
      ? buildTimelineFromTeachingDefinition(teachingDef, isPad)
      : buildRhythmTimeline(exercise);
  }, [exercise, isPad, matchedTeachingDef, teachingDef]);

  // 2. Primary Teaching Continuum: UNDERSTAND -> COUNT -> WATCH -> FOLLOW -> PLAY -> EVALUATE
  const [teachingStage, setTeachingStage] = useState<TeachingStage>(() => getMissionInitialTeachingStage(exercise, true));
  const [isCoachThenYou, setIsCoachThenYou] = useState<boolean>(false);
  const [isCoachTurn, setIsCoachTurn] = useState<boolean>(true);
  const [isLearnerTurn, setIsLearnerTurn] = useState<boolean>(false);
  const [activeCountToken, setActiveCountToken] = useState<string | null>(null);
  const [showNoteBreakdown, setShowNoteBreakdown] = useState<boolean>(false);

  // Sync Coach-Then-You into master transport
  useEffect(() => {
    masterTransport.setCoachThenYou(isCoachThenYou);
  }, [isCoachThenYou]);

  // 3. Musical Practice Sub-Modes: WATCH | FOLLOW | PLAY (Independent)
  const [instructionMode, setInstructionMode] = useState<InstructionMode>(() => getTeachingStageInstructionMode(getMissionInitialTeachingStage(exercise, true)));

  // Assistance Fading for FOLLOW mode: FULL -> REDUCED -> MINIMAL
  const [assistanceLevel, setAssistanceLevel] = useState<AssistanceLevel>(() => exercise.curriculumMission?.assistanceTarget || 'FULL');

  // Independent Play pulse toggle
  const [independentPulseEnabled, setIndependentPulseEnabled] = useState<boolean>(true);

  // Speed and Loop controls
  const [demoSpeedMultiplier, setDemoSpeedMultiplier] = useState<number>(0.75);
  const [loopMode, setLoopMode] = useState<LoopMode>('2x');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [focusView, setFocusView] = useState<boolean>(true);

  // High-Level Transport States (Deriving from Master Transport Clock)
  const [phraseStage, setPhraseStage] = useState<PhraseStage>('IDLE');
  const [countInBeat, setCountInBeat] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [completedLoops, setCompletedLoops] = useState<number>(0);
  const [transitionCue, setTransitionCue] = useState<string>('');
  const [activeOwner, setActiveOwner] = useState<'TUTOR' | 'LEARNER' | 'ENSEMBLE'>('TUTOR');
  const [ownershipTitle, setOwnershipTitle] = useState<string>('');
  const [ownershipSubtitle, setOwnershipSubtitle] = useState<string>('');

  // End-of-Attempt Check-In States for FOLLOW mode
  const [showFollowCheckIn, setShowFollowCheckIn] = useState<boolean>(false);
  const [followReflection, setFollowReflection] = useState<FollowCuesReflection | null>(null);
  const [followAdvice, setFollowAdvice] = useState<{
    message: string;
    actionText: string;
    actionType: string;
  } | null>(null);

  // End-of-Attempt Check-In States for INDEPENDENT PLAY mode
  const [showIndependentCheckIn, setShowIndependentCheckIn] = useState<boolean>(false);
  const [independentChecklist, setIndependentChecklist] = useState<string[]>([]);
  const [independentRating, setIndependentRating] = useState<IndependentRating | null>(null);
  const [independentRunCompleted, setIndependentRunCompleted] = useState<boolean>(false);
  const [independentLoopsCompleted, setIndependentLoopsCompleted] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticsData, setDiagnosticsData] = useState<TransportDiagnosticState | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  // Effective playback BPM
  const effectiveBpm = useMemo(() => {
    if (instructionMode === 'WATCH') {
      return Math.max(30, Math.round(currentTempo * demoSpeedMultiplier));
    }
    return currentTempo;
  }, [currentTempo, instructionMode, demoSpeedMultiplier]);

  // Max loops count
  const maxLoopsCount = useMemo(() => {
    if (loopMode === '1x') return 1;
    if (loopMode === '2x') return 2;
    if (loopMode === '4x') return 4;
    return Infinity;
  }, [loopMode]);

  // Static Sticking Reference array (for static display during playback)
  const stickingNotes = useMemo(() => {
    if (isSixStrokeRoll) {
      return [
        { label: '>R', hand: 'R', accent: true, count: '1 / 4' },
        { label: 'L', hand: 'L', accent: false, count: 'e' },
        { label: 'L', hand: 'L', accent: false, count: '&' },
        { label: 'R', hand: 'R', accent: false, count: 'a' },
        { label: 'R', hand: 'R', accent: false, count: 'ta' },
        { label: '>L', hand: 'L', accent: true, count: 'la' },
      ];
    }
    const canonicalSticking = teachingDef?.sticking || exercise.sticking;
    if (canonicalSticking) {
      const parts = canonicalSticking.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        return parts.map((p, idx) => ({
          label: p,
          hand: p.includes('R') ? 'R' : p.includes('L') ? 'L' : 'K',
          accent: p.startsWith('>'),
          count: `Stroke ${idx + 1}`,
        }));
      }
    }
    return [
      { label: '>R', hand: 'R', accent: true, count: '1' },
      { label: 'L', hand: 'L', accent: false, count: 'e' },
      { label: 'R', hand: 'R', accent: false, count: '&' },
      { label: 'R', hand: 'R', accent: false, count: 'a' },
    ];
  }, [isSixStrokeRoll, exercise.sticking, teachingDef]);

  const hasLandingTarget = useMemo(
    () => timeline.events.some((event) => event.role === 'landing'),
    [timeline]
  );

  // Stop master transport cleanly
  const stopTransport = useCallback(() => {
    masterTransport.stop();
    setIsPlaying(false);
    setPhraseStage('IDLE');
    setCountInBeat(0);
    setCurrentBeat(0);
    setCurrentBar(1);
    setActiveOwner('TUTOR');
    setOwnershipTitle('');
    setOwnershipSubtitle('');
    setTransitionCue('');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Stage Switcher helper for the 6-stage continuum
  const handleSwitchStage = useCallback(
    (stage: TeachingStage) => {
      stopTransport();
      setTeachingStage(stage);
      masterTransport.setTeachingStage(stage);

      if (stage === 'WATCH') {
        setInstructionMode('WATCH');
      } else if (stage === 'FOLLOW') {
        setInstructionMode('FOLLOW');
      } else if (stage === 'PLAY') {
        setInstructionMode('PLAY');
      }
    },
    [stopTransport]
  );

  // Cleanup on unmount or exercise change
  useEffect(() => {
    // Canonical curriculum exercises begin with teaching. Legacy/unmapped
    // exercises begin at Watch so they can never inherit Quarter-Note Pulse
    // explanations from the backwards-compatible teaching fallback.
    const initialStage = getMissionInitialTeachingStage(exercise, Boolean(matchedTeachingDef));
    setTeachingStage(initialStage);
    setInstructionMode(getTeachingStageInstructionMode(initialStage));
    setAssistanceLevel(exercise.curriculumMission?.assistanceTarget || 'FULL');
    setIndependentRunCompleted(false);
    setIndependentLoopsCompleted(0);
    setShowIndependentCheckIn(false);
    setShowFollowCheckIn(false);
    return () => {
      stopTransport();
    };
  }, [exercise.id, matchedTeachingDef, stopTransport]);

  // -------------------------------------------------------------
  // High-Level Transport Polling (Driven by Master Clock)
  // -------------------------------------------------------------
  const runTransportAnimation = useCallback(() => {
    if (!masterTransport.getIsRunning()) {
      setIsPlaying(false);
      return;
    }

    const state = masterTransport.getState();

    // 1. Update pulse and bars
    setCurrentBar(state.currentBar);
    setCurrentBeat(state.currentBeat);
    setCompletedLoops(state.completedLoops);
    setPhraseStage(state.phraseStage);
    setCountInBeat(state.countInBeat);
    setActiveOwner(state.activeOwner);
    setOwnershipTitle(state.ownershipTitle);
    setOwnershipSubtitle(state.ownershipSubtitle);
    setIsCoachTurn(state.isCoachTurn);
    setIsLearnerTurn(state.isLearnerTurn);
    setActiveCountToken(state.activeCountToken);

    // 2. Deterministic Phrase Guidance Cue
    if (state.isCountIn) {
      setTransitionCue(`Count-In: Beat ${state.countInBeat} of 4 — Prepare Entry`);
    } else if (instructionMode === 'FOLLOW' && assistanceLevel === 'FULL') {
      setTransitionCue('PLAY ALONG: Match the tutor note-for-note in real time');
    } else if (instructionMode === 'FOLLOW' && assistanceLevel === 'REDUCED') {
      setTransitionCue(
        state.activeOwner === 'LEARNER'
          ? 'YOUR BAR: Tutor silent — play the complete bar from memory'
          : 'TUTOR BAR: Listen closely — your matching bar is next'
      );
    } else if (state.isIntentionalLearnerSpace) {
      setTransitionCue(`YOUR TURN: Student Execution (${timeline.title.split('—')[0]})`);
    } else if (instructionMode === 'FOLLOW' && assistanceLevel === 'MINIMAL') {
      if (state.phraseStage === 'FILL') {
        setTransitionCue(`FILL OPPORTUNITY: Execute phrase from memory into Beat 1`);
      } else if (state.phraseStage === 'LAND') {
        setTransitionCue(`LAND ON 1: Downbeat Resolution Anchor`);
      } else if (state.phraseStage === 'RECOVER') {
        setTransitionCue('RECOVER: Maintain steady groove time');
      } else {
        setTransitionCue('KEEP PULSE: Internalize tempo with metronome pulse');
      }
    } else if (state.phraseStage === 'FILL') {
      setTransitionCue(
        `FILL NOW: ${
          isSixStrokeRoll ? 'Six Stroke Roll (>R L L R R >L)' : 'Execute Sticking'
        }`
      );
    } else if (state.phraseStage === 'LAND') {
      setTransitionCue(
        `LAND ON 1: ${isPad ? 'Pad Rim Edge' : '💥 Crash + Kick'} on Bar 2 Beat 1`
      );
    } else if (state.phraseStage === 'RECOVER') {
      setTransitionCue('RECOVER: Return to Steady Groove Pulse');
    } else if (state.phraseStage === 'GROOVE') {
      setTransitionCue('GROOVE: Stay in Time with Relaxed Pulse');
    } else {
      setTransitionCue('');
    }

    // 3. Diagnostics Telemetry
    if (showDiagnostics) {
      setDiagnosticsData(masterTransport.getDiagnostics());
    }

    animationFrameRef.current = requestAnimationFrame(runTransportAnimation);
  }, [timeline.title, isSixStrokeRoll, isPad, showDiagnostics]);

  // Handle Play/Pause Toggle with Async Audio Initialization.
  // Evidence is gated: independent evaluation is unlocked only after a complete
  // Play run, never merely by opening the stage or tapping a check-in button.
  const handleTogglePlay = async () => {
    if (isPlaying) {
      stopTransport();
      return;
    }

    setShowFollowCheckIn(false);
    setShowIndependentCheckIn(false);
    if (instructionMode === 'PLAY') {
      setIndependentRunCompleted(false);
      setIndependentLoopsCompleted(0);
    }
    setIsPlaying(true);

    const evaluationUnlockLoops = maxLoopsCount === Infinity ? 2 : Math.max(1, maxLoopsCount);

    await masterTransport.start({
      timeline,
      bpm: effectiveBpm,
      instructionMode,
      assistanceLevel,
      hasCountIn: true,
      countInBars: 1,
      voiceCountEnabled: false,
      clapEnabled: false,
      isCoachThenYou,
      teachingStage,
      teachingDefinition: teachingDef,
      isPad,
      loopLimit: maxLoopsCount,
      onLoopComplete: (completed) => {
        if (instructionMode === 'PLAY') {
          setIndependentLoopsCompleted(completed);
          if (completed >= evaluationUnlockLoops) {
            setIndependentRunCompleted(true);
          }
        }

        if (maxLoopsCount !== Infinity && completed >= maxLoopsCount) {
          stopTransport();
          if (instructionMode === 'FOLLOW') {
            setShowFollowCheckIn(true);
          } else if (instructionMode === 'PLAY') {
            setIndependentRunCompleted(true);
          }
        }
      },
    });
  };

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(runTransportAnimation);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, runTransportAnimation]);

  // -------------------------------------------------------------
  // Follow Cues Check-In & Adaptive Recommendations
  // -------------------------------------------------------------
  const handleSelectFollowReflection = (reflection: FollowCuesReflection) => {
    setFollowReflection(reflection);

    const primarySkillId = exercise.skillIds[0] || 'skill';
    const isSuccess = reflection === 'CLEAN_COMFORTABLE';

    let message = '';
    let actionText = '';
    let actionType = 'repeat';

    if (reflection === 'LOST_PULSE') {
      message =
        'Placement broke the groove time. Slower tempo (-5 BPM) with Full Cues recommended to internalize entry.';
      actionText = 'Reduce Tempo & Use Full Cues';
      actionType = 'reduce_tempo';
    } else if (reflection === 'ENTRY_TIMING_ISSUE') {
      message =
        'Fill entry was early/late. Count beats 1-2-3 aloud and anticipate Beat 3.5 transition before playing.';
      actionText = 'Repeat with Focus on Entry';
      actionType = 'repeat_entry';
    } else if (reflection === 'MISSED_LANDING') {
      message =
        'Sticking held, but Beat 1 downbeat arrival was unstable. Keep phrase short and lock the crash on Beat 1.';
      actionText = 'Focus on Beat 1 Landing';
      actionType = 'repeat_landing';
    } else if (reflection === 'ROUGH_RECOVERY') {
      message =
        'Landed Beat 1, but recovery hesitated. Focus on snapping instantly back to groove pulse on Beat 2.';
      actionText = 'Practice Landing → Groove Recovery';
      actionType = 'repeat_recovery';
    } else {
      message =
        'Crisp placement and steady timekeeping! Ready to fade assistance or attempt Independent Play.';
      actionText =
        assistanceLevel === 'FULL'
          ? 'Advance to Reduced Cues'
          : assistanceLevel === 'REDUCED'
          ? 'Advance to Minimal Cues'
          : 'Try Independent Play';
      actionType = 'advance_level';
    }

    setFollowAdvice({ message, actionText, actionType });

    // Directly log guided practice evidence
    const frictions: string[] = [];
    if (reflection === 'LOST_PULSE') frictions.push('Lost Groove');
    if (reflection === 'ENTRY_TIMING_ISSUE') frictions.push('Entered Too Early');
    if (reflection === 'MISSED_LANDING') frictions.push('Missed Beat 1');
    if (reflection === 'ROUGH_RECOVERY') frictions.push('Transition Problem');

    const attemptEvidence: PlacementAttemptEvidence = {
      id: `pl-att-follow-${exercise.id}-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      skillId: primarySkillId,
      exerciseId: exercise.id,
      timestamp: new Date().toISOString(),
      placementType: exercise.musicalPlacement?.placementType || 'one_beat_fill',
      startPoint: exercise.musicalPlacement?.startPoint || 'beat_4',
      phraseLength: exercise.musicalPlacement?.phraseLength || '1 beat',
      targetLanding: exercise.musicalPlacement?.targetLanding || 'crash_on_1',
      bpm: currentTempo,
      playbackBpm: currentTempo,
      selfAssessment: isSuccess
        ? 'CLEAN_AND_RELAXED'
        : reflection === 'LOST_PULSE'
        ? 'TOO_DIFFICULT'
        : 'INCONSISTENT',
      placementFrictions: frictions,
      success: isSuccess,
      instructionMode: 'FOLLOW',
      assistanceLevel,
      exerciseObjective: exercise.purpose,
      followCuesReflection: reflection,
      evidenceCategory: 'GUIDED_PRACTICE',
      visualTutorUsed: true,
      phrasePosition: exercise.musicalPlacement?.startPoint,
    };

    recordSinglePlacementAttemptEvidence(attemptEvidence);
  };

  const handleApplyFollowAdvice = () => {
    if (!followAdvice) return;
    const { actionType } = followAdvice;

    if (actionType === 'reduce_tempo') {
      if (onTempoAdjust) onTempoAdjust(-5);
      setAssistanceLevel('FULL');
    } else if (actionType === 'advance_level') {
      if (assistanceLevel === 'FULL') setAssistanceLevel('REDUCED');
      else if (assistanceLevel === 'REDUCED') setAssistanceLevel('MINIMAL');
      else {
        setInstructionMode('PLAY');
      }
    }
    setShowFollowCheckIn(false);
    setFollowReflection(null);
    setFollowAdvice(null);
  };

  // -------------------------------------------------------------
  // Independent Play Checklist & Evidence Logging
  // -------------------------------------------------------------
  const toggleIndependentCheckItem = (itemKey: string) => {
    setIndependentChecklist((prev) =>
      prev.includes(itemKey) ? prev.filter((k) => k !== itemKey) : [...prev, itemKey]
    );
  };

  const handleLogIndependentEvidence = () => {
    if (!independentRating) return;

    const primarySkillId = exercise.skillIds[0] || 'skill';
    const isSuccess = independentRating === 'CLEAN' || independentRating === 'ALMOST';

    const frictions: string[] = [];
    if (!independentChecklist.includes('groove_stable')) frictions.push('Lost Groove');
    if (!independentChecklist.includes('entry_clean')) frictions.push('Entry Rushed/Late');
    if (!independentChecklist.includes('landing_on_1')) frictions.push('Missed Beat 1');
    if (!independentChecklist.includes('smooth_recovery')) frictions.push('Hesitated on Beat 2');

    const feeling: SelfCheckFeeling =
      independentRating === 'CLEAN'
        ? 'CLEAN_AND_RELAXED'
        : independentRating === 'ALMOST'
        ? 'MOSTLY_CLEAN'
        : independentRating === 'INCONSISTENT'
        ? 'INCONSISTENT'
        : 'TOO_DIFFICULT';

    const attemptEvidence: PlacementAttemptEvidence = {
      id: `pl-att-indep-${exercise.id}-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      skillId: primarySkillId,
      exerciseId: exercise.id,
      timestamp: new Date().toISOString(),
      placementType: exercise.musicalPlacement?.placementType || 'one_beat_fill',
      startPoint: exercise.musicalPlacement?.startPoint || 'beat_4',
      phraseLength: exercise.musicalPlacement?.phraseLength || '1 beat',
      targetLanding: exercise.musicalPlacement?.targetLanding || 'crash_on_1',
      bpm: currentTempo,
      playbackBpm: currentTempo,
      selfAssessment: feeling,
      placementFrictions: frictions,
      success: isSuccess,
      instructionMode: 'PLAY',
      assistanceLevel: 'MINIMAL',
      exerciseObjective: exercise.purpose,
      evidenceCategory: 'SELF_ASSESSED_EXECUTION',
      visualTutorUsed: true,
      phrasePosition: exercise.musicalPlacement?.startPoint,
    };

    recordSinglePlacementAttemptEvidence(attemptEvidence);

    onCheckIn('PLAY', {
      selfCheck: feeling,
      issueTags: frictions,
      tempoUsed: currentTempo,
      tempoChange: 0,
      completedAt: new Date().toISOString(),
      instructionMode: 'PLAY',
      assistanceLevel: 'MINIMAL',
      evidenceCategory: 'SELF_ASSESSED_EXECUTION',
      visualTutorUsed: true,
    });

    setShowIndependentCheckIn(false);
  };

  return (
    <div className="space-y-4">
      {/* ================= 1. PRIMARY 6-STAGE TEACHING CONTINUUM ================= */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 bg-stone-900 rounded-3xl border border-stone-800 shadow-md">
        {[
          { id: 'UNDERSTAND', num: '1', label: 'UNDERSTAND', icon: Compass },
          { id: 'COUNT', num: '2', label: 'COUNT', icon: Mic },
          { id: 'WATCH', num: '3', label: 'WATCH', icon: Eye },
          { id: 'FOLLOW', num: '4', label: 'FOLLOW', icon: Zap },
          { id: 'PLAY', num: '5', label: 'PLAY', icon: Play },
          { id: 'EVALUATE', num: '6', label: 'EVALUATE', icon: CheckCircle2 },
        ].map((step) => {
          const isActive = teachingStage === step.id;
          const Icon = step.icon;
          const isUnsupportedLegacyStage = !matchedTeachingDef &&
            (step.id === 'UNDERSTAND' || step.id === 'COUNT' || step.id === 'EVALUATE');
          const isLockedEvaluation = step.id === 'EVALUATE' && !independentRunCompleted;
          const isLocked = isUnsupportedLegacyStage || isLockedEvaluation;
          const lockTitle = isUnsupportedLegacyStage
            ? 'This legacy/explore exercise does not yet have a canonical C2 teaching definition.'
            : isLockedEvaluation
            ? 'Complete an independent Play run before evaluation.'
            : undefined;

          return (
            <button
              key={step.id}
              type="button"
              disabled={isLocked}
              title={lockTitle}
              onClick={() => {
                if (!isLocked) handleSwitchStage(step.id as TeachingStage);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl font-black text-xs transition-all select-none ${
                isLocked
                  ? 'text-stone-600 bg-stone-900/40 cursor-not-allowed opacity-60'
                  : isActive
                  ? 'bg-amber-400 text-stone-950 shadow-lg scale-[1.02] ring-2 ring-amber-300 cursor-pointer'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 cursor-pointer'
              }`}
            >
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                  isActive ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {step.num}
              </span>
              <Icon className="w-3.5 h-3.5 hidden sm:inline shrink-0" />
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </div>

      {exercise.curriculumMission?.structure && (
        <CurriculumPhraseVisualizer
          mission={exercise.curriculumMission}
          currentBar={currentBar}
          currentBeat={currentBeat}
          isPlaying={isPlaying}
        />
      )}

      {/* ================= STAGE 1: UNDERSTAND ================= */}
      {teachingStage === 'UNDERSTAND' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <UnderstandStageView
            exercise={exercise}
            timeline={timeline}
            teachingDef={teachingDef}
            isPad={isPad}
            currentTempo={currentTempo}
            onProceedToCount={() => handleSwitchStage('COUNT')}
          />

          {/* Optional Note-by-Note Breakdown Accordion */}
          <div className="bg-stone-900/90 rounded-2xl p-3.5 border border-stone-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-stone-300 font-bold">
                Want to dissect individual stroke mechanics note-by-note?
              </span>
            </div>
            <button
              onClick={() => setShowNoteBreakdown((p) => !p)}
              className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {showNoteBreakdown ? 'Hide Step-Through' : 'Open Note Step-Through'}
            </button>
          </div>

          {showNoteBreakdown && (
            <PhraseBreakdown
              exercise={exercise}
              timeline={timeline}
              isPad={isPad}
              currentTempo={currentTempo}
              onProceedToMusicalPractice={() => handleSwitchStage('COUNT')}
            />
          )}
        </div>
      ) : teachingStage === 'COUNT' ? (
        /* ================= STAGE 2: COUNT ================= */
        <div className="animate-in fade-in duration-200">
          <CountingTutorView
            exercise={exercise}
            timeline={timeline}
            teachingDef={teachingDef}
            currentTempo={currentTempo}
            onProceedToWatch={() => handleSwitchStage('WATCH')}
            onTempoAdjust={onTempoAdjust}
          />
        </div>
      ) : teachingStage === 'EVALUATE' ? (
        /* ================= STAGE 6: EVALUATE ================= */
        <div className="animate-in fade-in duration-200">
          <EvaluateStageView
            exercise={exercise}
            teachingDef={teachingDef}
            currentTempo={currentTempo}
            onSaveEvaluation={(partialResult) => {
              onCheckIn('PLAY', partialResult);
            }}
            onRepeatStage={(stage) => handleSwitchStage(stage)}
          />
        </div>
      ) : (
        /* ================= STAGES 3, 4, 5: AUDIO-FIRST MUSICAL PRACTICE VIEW ================= */
        <div className="bg-stone-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-stone-800 shadow-2xl space-y-4 animate-in fade-in duration-200">
          {/* TOP CONTROLS: SUB-MODE SELECTOR & SPEED */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
            {/* 3 Practice Modes: WATCH | FOLLOW | PLAY */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-900 rounded-2xl border border-stone-800 w-full sm:w-auto">
              <button
                onClick={() => {
                  stopTransport();
                  setInstructionMode('WATCH');
                  setTeachingStage('WATCH');
                }}
                className={`flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  instructionMode === 'WATCH'
                    ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3. WATCH DEMO</span>
              </button>

              <button
                onClick={() => {
                  stopTransport();
                  setInstructionMode('FOLLOW');
                  setTeachingStage('FOLLOW');
                }}
                className={`flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  instructionMode === 'FOLLOW'
                    ? 'bg-sky-400 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>4. FOLLOW CUES</span>
              </button>

              <button
                onClick={() => {
                  stopTransport();
                  setInstructionMode('PLAY');
                  setTeachingStage('PLAY');
                }}
                className={`flex-1 sm:flex-none py-2 px-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  instructionMode === 'PLAY'
                    ? 'bg-emerald-400 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>5. INDEPENDENT</span>
              </button>
            </div>

            {/* Tempo & Audio Indicator */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono">
                {instructionMode === 'WATCH' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-400 font-bold">DEMO:</span>
                    <span className="font-black text-amber-300">{effectiveBpm} BPM</span>
                    <span className="text-[10px] text-amber-400/80 font-sans">
                      ({Math.round(demoSpeedMultiplier * 100)}%)
                    </span>
                    <span className="text-stone-600 font-bold">•</span>
                    <span className="text-stone-400 font-bold">TARGET:</span>
                    <span className="font-black text-stone-200">{currentTempo} BPM</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400 font-bold">TARGET PRACTICE:</span>
                    <span className="font-black text-amber-300">{currentTempo} BPM</span>
                  </div>
                )}
              </div>

              {/* Loop Count Selector */}
              <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs font-mono">
                <Repeat className="w-3 h-3 text-stone-400 ml-1" />
                {(['1x', '2x', '4x', 'inf'] as LoopMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLoopMode(mode)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      loopMode === mode
                        ? 'bg-stone-700 text-white font-black'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ASSISTANCE FADING SELECTOR (When in FOLLOW mode) */}
          {instructionMode === 'FOLLOW' && (
            <div className="bg-stone-900/95 p-3.5 rounded-2xl border border-sky-500/30 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-sky-400 text-stone-950 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    ASSISTANCE LEVEL
                  </span>
                  <span className="font-bold text-sky-200 text-xs">
                    Progressive Responsibility Transfer:
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['FULL', 'REDUCED', 'MINIMAL'] as AssistanceLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        if (isPlaying) stopTransport();
                        setAssistanceLevel(lvl);
                        // A one-bar exercise needs at least two repetitions for
                        // REDUCED's tutor-bar -> learner-bar call-and-response.
                        if (lvl === 'REDUCED' && timeline.totalBars === 1 && loopMode === '1x') {
                          setLoopMode('2x');
                        }
                      }}
                      className={`py-1.5 px-3 rounded-xl font-black text-[10px] uppercase transition-all cursor-pointer ${
                        assistanceLevel === lvl
                          ? 'bg-sky-400 text-stone-950 font-black shadow-md ring-2 ring-sky-300'
                          : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {lvl === 'FULL' ? '1. FULL' : lvl === 'REDUCED' ? '2. REDUCED' : '3. MINIMAL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explicit Pedagogical Assistance Ladder Explanation */}
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                  assistanceLevel === 'FULL'
                    ? 'bg-sky-950/40 border-sky-800/80 text-sky-200'
                    : assistanceLevel === 'REDUCED'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                }`}
              >
                <div className="mt-0.5">
                  {assistanceLevel === 'FULL' ? (
                    <Zap className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  ) : assistanceLevel === 'REDUCED' ? (
                    <Compass className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[11px] uppercase tracking-wide">
                      {assistanceLevel === 'FULL'
                        ? 'FULL — PLAY ALONG WITH TUTOR'
                        : assistanceLevel === 'REDUCED'
                        ? 'REDUCED — TUTOR BAR / YOUR BAR'
                        : 'MINIMAL — METRONOME ONLY'}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {assistanceLevel === 'FULL'
                        ? 'Level 1/3'
                        : assistanceLevel === 'REDUCED'
                        ? 'Level 2/3 (Alternating bars)'
                        : 'Level 3/3 (Click only)'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-sans">
                    {assistanceLevel === 'FULL'
                      ? 'The tutor plays the entire target pattern continuously while you play at the same time. Match its timing, sound and dynamics note-for-note.'
                      : assistanceLevel === 'REDUCED'
                      ? 'Call and response: the tutor plays one complete bar, then becomes silent for the next bar while you copy it. The metronome keeps time during your bar.'
                      : 'The tutor pattern is completely removed. Use only the metronome pulse and play the phrase from memory.'}
                  </p>
                </div>
              </div>

              {/* Assistance contract summary */}
              <div className="flex items-start gap-2.5 p-2.5 bg-stone-950/80 rounded-xl border border-stone-800">
                <Repeat className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-stone-200 block">
                    {assistanceLevel === 'FULL'
                      ? 'Play together: tutor + you'
                      : assistanceLevel === 'REDUCED'
                      ? 'Call & response: tutor bar → your bar'
                      : 'Independent memory: metronome only'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {assistanceLevel === 'FULL'
                      ? 'No silent response bar. Stay with the tutor through the whole phrase.'
                      : assistanceLevel === 'REDUCED'
                      ? 'The tutor models a full bar, then gives you a full bar of space to answer.'
                      : 'No target drum audio is played; maintain the phrase from your internal count.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= 2. DOMINANT PHRASE OWNERSHIP / MUSICAL STATE BANNER ================= */}
          <div className="space-y-2">
            {/* Live Call & Response Stage Indicator Banner (when active) */}
            {instructionMode === 'FOLLOW' && assistanceLevel === 'REDUCED' && isPlaying && phraseStage !== 'COUNT_IN' && (
              <div
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  activeOwner === 'TUTOR'
                    ? 'bg-amber-500/20 border-amber-400/80 text-amber-200'
                    : 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400 animate-pulse'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {activeOwner === 'TUTOR' ? (
                    <Eye className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {activeOwner === 'TUTOR' ? "TUTOR BAR — LISTEN" : 'YOUR BAR — PLAY IT NOW!'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {activeOwner === 'TUTOR'
                        ? 'Tutor plays one complete bar. Listen to the full pattern.'
                        : 'Tutor is silent. Copy the complete bar while the metronome continues.'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shrink-0 ${
                    activeOwner === 'TUTOR' ? 'bg-amber-400 text-stone-950' : 'bg-emerald-400 text-stone-950'
                  }`}
                >
                  {activeOwner === 'TUTOR' ? 'TUTOR BAR' : 'YOUR BAR'}
                </span>
              </div>
            )}

            {/* Primary State Card */}
            {isPlaying && phraseStage === 'COUNT_IN' ? (
              <div className="p-4 bg-amber-500/20 border-2 border-amber-400 rounded-2xl text-center animate-pulse space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                  1-Bar Musical Count-In
                </span>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="text-base font-black text-amber-200 font-mono">GET READY</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <span
                        key={num}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-lg transition-all ${
                          countInBeat === num
                            ? 'bg-amber-400 text-stone-950 scale-125 ring-2 ring-amber-300 shadow-xl'
                            : 'bg-stone-900 text-stone-500 border border-stone-800'
                        }`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  phraseStage === 'LEARNER_SPACE' || activeOwner === 'LEARNER'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-black ring-2 ring-emerald-400 shadow-xl animate-pulse'
                    : phraseStage === 'LAND'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 font-black ring-2 ring-emerald-400 shadow-xl'
                    : phraseStage === 'FILL'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-black ring-2 ring-amber-400 shadow-lg'
                    : phraseStage === 'GROOVE'
                    ? 'bg-stone-900 border-stone-700 text-stone-200'
                    : 'bg-stone-900 border-stone-800 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-full ${
                      activeOwner === 'LEARNER'
                        ? 'bg-emerald-400 text-stone-950 font-black'
                        : activeOwner === 'TUTOR'
                        ? 'bg-amber-400 text-stone-950 font-black'
                        : 'bg-sky-400 text-stone-950 font-black'
                    }`}
                  >
                    {activeOwner === 'LEARNER'
                      ? '⚡ YOUR TURN'
                      : activeOwner === 'TUTOR'
                      ? '🎧 LISTEN'
                      : '🥁 ENSEMBLE'}
                  </span>

                  <h3 className="text-base sm:text-lg font-black tracking-wide">
                    {isPlaying
                      ? transitionCue || 'Playing with authoritative master clock...'
                      : instructionMode === 'WATCH'
                      ? 'Watch Demo — Listen to tutor phrasing'
                      : instructionMode === 'FOLLOW'
                      ? `Follow Cues (${assistanceLevel}) — Play along`
                      : 'Independent Play — Internalized timing'}
                  </h3>
                </div>

                {/* Subtitle / Context */}
                <p className="text-xs text-stone-300 mt-1 font-sans">
                  {isPlaying
                    ? activeOwner === 'LEARNER'
                      ? 'Tutor is silent. Metronome pulse continues. Play the phrase now!'
                      : activeOwner === 'TUTOR'
                      ? 'Listen to the complete tutor bar; your response comes next.'
                      : 'Tutor and learner play together. Match every note and dynamic in real time.'
                    : 'Press Start to begin audio playback with metronome pulse.'}
                </p>
              </div>
            )}
          </div>

          {/* ================= 3. 4-BEAT DOMINANT PULSE METRONOME GRID ================= */}
          <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-400">
              <span className="flex items-center gap-1.5 font-black text-amber-400">
                <span>METER & BAR PROGRESSION</span>
              </span>
              <span className="font-mono text-stone-300 font-bold">
                {isPlaying
                  ? `BAR ${currentBar} OF ${timeline.totalBars} ${
                      loopMode !== '1x' ? `(Rep ${completedLoops + 1})` : ''
                    }`
                  : `2-Bar Phrase Cycle`}
              </span>
            </div>

            {/* 4-Beat Grid (Pulses on Quarter Notes) */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((beatNum) => {
                const isCurrentBeat =
                  isPlaying &&
                  currentBeat === beatNum &&
                  phraseStage !== 'COUNT_IN' &&
                  phraseStage !== 'PREPARE' &&
                  phraseStage !== 'IDLE';
                const isLandingBeat = currentBar === 2 && beatNum === 1;

                return (
                  <div
                    key={beatNum}
                    className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isCurrentBeat
                        ? isLandingBeat
                          ? 'bg-emerald-500 text-stone-950 scale-105 shadow-xl ring-2 ring-emerald-300 font-black'
                          : phraseStage === 'FILL' || phraseStage === 'LEARNER_SPACE'
                          ? 'bg-amber-400 text-stone-950 scale-105 shadow-xl ring-2 ring-amber-300 font-black'
                          : 'bg-white text-stone-950 scale-105 shadow-lg font-black'
                        : 'bg-stone-950 text-stone-400 border border-stone-800'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold uppercase opacity-75">
                      {beatNum === 1
                        ? 'Beat 1'
                        : beatNum === 2
                        ? 'Beat 2'
                        : beatNum === 3
                        ? 'Beat 3'
                        : 'Beat 4'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5">
                      {beatNum}
                    </span>
                    <span
                      className={`text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded truncate max-w-full ${
                        isCurrentBeat
                          ? 'bg-stone-900 text-amber-300'
                          : isLandingBeat
                          ? 'text-emerald-400 font-black'
                          : currentBar === 1 && beatNum === 4
                          ? 'text-amber-400'
                          : 'text-stone-500'
                      }`}
                    >
                      {isLandingBeat
                        ? '🎯 LAND CRASH'
                        : isCalibration
                        ? currentBar === 1
                          ? 'TUTOR DEMO'
                          : 'YOUR TURN'
                        : currentBar === 1 && beatNum === 4
                        ? '🔥 FILL NOW'
                        : 'GROOVE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= 4. STATIC STICKING REFERENCE (ADAPTED TO ASSISTANCE LEVEL) ================= */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            instructionMode === 'PLAY'
              ? 'bg-stone-900/60 border-stone-800/80'
              : assistanceLevel === 'MINIMAL'
              ? 'bg-stone-900/70 border-stone-800'
              : assistanceLevel === 'REDUCED'
              ? 'bg-stone-900/90 border-amber-500/20'
              : 'bg-stone-900/90 border-stone-800'
          } space-y-2`}>
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-400">
              <span className={`font-black ${
                assistanceLevel === 'REDUCED' ? 'text-amber-400' : assistanceLevel === 'MINIMAL' ? 'text-emerald-400' : 'text-sky-400'
              }`}>
                {instructionMode === 'WATCH'
                  ? 'Demonstration Sticking Reference:'
                  : instructionMode === 'PLAY'
                  ? 'Independent Memory Sticking:'
                  : assistanceLevel === 'FULL'
                  ? 'Full Sticking Reference:'
                  : assistanceLevel === 'REDUCED'
                  ? 'Memory Aid (Recall Inner Notes):'
                  : 'Minimal Reference (Play from Pulse):'}
              </span>
              <span className="font-mono text-stone-300">
                {isSixStrokeRoll ? 'Six Stroke Roll (>R L L R R >L)' : 'Phrase Sticking'}
              </span>
            </div>

            {/* Static Sticking Chips */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {stickingNotes.map((st, idx) => (
                <div
                  key={idx}
                  className={`flex-1 min-w-[2.75rem] py-2 px-2 rounded-xl border text-center transition-all ${
                    st.accent
                      ? assistanceLevel === 'REDUCED'
                        ? 'bg-amber-950/70 text-amber-200 border-amber-600 font-black shadow-sm ring-1 ring-amber-400/40'
                        : 'bg-amber-950/60 text-amber-300 border-amber-700/80 font-black'
                      : assistanceLevel === 'REDUCED'
                      ? 'bg-stone-950/90 text-stone-400 border-stone-800/80 font-medium'
                      : assistanceLevel === 'MINIMAL'
                      ? 'bg-stone-950/80 text-stone-400 border-stone-800'
                      : 'bg-stone-950 text-stone-300 border-stone-800 font-bold'
                  }`}
                >
                  <span className="text-[8px] font-mono opacity-70 block">
                    {idx + 1}
                  </span>
                  <span className="text-base font-black font-mono block mt-0.5">
                    {st.label}
                  </span>
                  <span className="text-[8px] font-mono opacity-70 block mt-0.5">
                    {st.accent ? 'Accent' : 'Tap'}
                  </span>
                </div>
              ))}

              {/* Landing Stroke Target — only when this competency actually contains one */}
              {hasLandingTarget && (
                <div className="flex-1 min-w-[3.5rem] py-2 px-2 rounded-xl border bg-emerald-950/80 text-emerald-300 border-emerald-700/80 text-center font-black">
                  <span className="text-[8px] font-mono text-emerald-400 block">LAND</span>
                  <span className="text-sm font-black font-mono block mt-0.5">
                    {isPad ? 'RIM' : '💥 CRASH'}
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400 block mt-0.5">
                    Beat 1
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================= 5. TRANSPORT ACTION BUTTONS ================= */}
          <div className="grid grid-cols-12 gap-2 pt-2">
            <button
              onClick={handleTogglePlay}
              className={`col-span-8 sm:col-span-9 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl min-h-[50px] cursor-pointer ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : instructionMode === 'WATCH'
                  ? 'bg-amber-400 hover:bg-amber-500 text-stone-950'
                  : instructionMode === 'FOLLOW'
                  ? 'bg-sky-400 hover:bg-sky-500 text-stone-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-stone-950'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>PAUSE PLAYBACK</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    START {instructionMode === 'WATCH' ? 'DEMO' : instructionMode === 'FOLLOW' ? 'FOLLOW PRACTICE' : 'INDEPENDENT PLAY'}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={stopTransport}
              className="col-span-4 sm:col-span-3 py-4 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-2xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 min-h-[50px] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET</span>
            </button>
          </div>

          {/* INTERACTIVE DRUM PAD (When in INDEPENDENT PLAY mode) */}
          {instructionMode === 'PLAY' && (
            <div className="pt-2">
              <InteractiveDrumPad isPad={isPad} />
            </div>
          )}

          {/* PEDAGOGICAL STAGE PROGRESSION FOOTERS */}
          {instructionMode === 'WATCH' && (
            <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-400 text-center sm:text-left">
                Observed the coach sticking and dynamic accents? Move to interactive guided practice.
              </div>
              <button
                type="button"
                onClick={() => handleSwitchStage('FOLLOW')}
                className="flex items-center gap-2 bg-sky-400 hover:bg-sky-300 text-stone-950 font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-xl transition-all cursor-pointer shrink-0"
              >
                <span>Step 4: Follow Along With Cues →</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {instructionMode === 'FOLLOW' && (
            <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-400 text-center sm:text-left">
                Locked in with the cues? Remove coach assistance and hold down the tempo solo.
              </div>
              <button
                type="button"
                onClick={() => handleSwitchStage('PLAY')}
                className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-xl transition-all cursor-pointer shrink-0"
              >
                <span>Step 5: Play Independently →</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {instructionMode === 'PLAY' && (
            <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-400 text-center sm:text-left">
                {independentRunCompleted
                  ? `Independent run complete (${Math.max(1, independentLoopsCompleted)} loop${Math.max(1, independentLoopsCompleted) === 1 ? '' : 's'}). Evaluation is unlocked.`
                  : 'Complete the required independent repetitions before evaluation can be recorded as evidence.'}
              </div>
              <button
                type="button"
                disabled={!independentRunCompleted}
                onClick={() => {
                  if (independentRunCompleted) handleSwitchStage('EVALUATE');
                }}
                className={`flex items-center gap-2 font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-xl transition-all shrink-0 ${
                  independentRunCompleted
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 cursor-pointer'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{independentRunCompleted ? 'Step 6: Evaluate & Self-Assess →' : 'Evaluation Locked'}</span>
              </button>
            </div>
          )}

          {/* FOLLOW quick reflection only. Independent PLAY evidence must pass through Stage 6. */}
          {instructionMode === 'FOLLOW' && (
            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between">
              <span className="text-[10px] text-stone-500 font-bold uppercase">
                Quick Follow Reflection
              </span>
              <button
                onClick={() => {
                  stopTransport();
                  setShowFollowCheckIn(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Log Modal</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= 6. FOLLOW CUES CHECK-IN MODAL ================= */}
      {showFollowCheckIn && (
        <div className="bg-stone-950 text-white rounded-3xl p-5 border-2 border-sky-500/60 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-400 text-stone-950 rounded-xl">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white">
                  Follow Cues: Placement Reflection
                </h3>
                <span className="text-[10px] text-stone-400 font-mono">
                  Assistance: {assistanceLevel} • Tempo: {currentTempo} BPM
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-300 block">
              How did the phrase placement feel during guided practice?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  id: 'CLEAN_COMFORTABLE' as FollowCuesReflection,
                  label: 'Clean & Locked',
                  desc: 'Groove, fill entry, and Beat 1 landing felt steady and relaxed',
                  color: 'hover:border-emerald-400 focus:border-emerald-400',
                },
                {
                  id: 'ENTRY_TIMING_ISSUE' as FollowCuesReflection,
                  label: 'Rushed / Late Entry',
                  desc: 'Hesitated on Beat 4 entry or rushed into the sticking',
                  color: 'hover:border-amber-400 focus:border-amber-400',
                },
                {
                  id: 'MISSED_LANDING' as FollowCuesReflection,
                  label: 'Missed Beat 1 Landing',
                  desc: 'Lost the downbeat anchor crash on Bar 2 Beat 1',
                  color: 'hover:border-rose-400 focus:border-rose-400',
                },
                {
                  id: 'ROUGH_RECOVERY' as FollowCuesReflection,
                  label: 'Hesitant Groove Recovery',
                  desc: 'Landed Beat 1, but stumbled returning to Beat 2 groove',
                  color: 'hover:border-purple-400 focus:border-purple-400',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectFollowReflection(opt.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    followReflection === opt.id
                      ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-400'
                      : 'bg-stone-900 border-stone-800 text-stone-300 ' + opt.color
                  }`}
                >
                  <span className="font-black text-xs block text-white">{opt.label}</span>
                  <span className="text-[10px] text-stone-400 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {followAdvice && (
            <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 block">
                    Coach Recommendation
                  </span>
                  <p className="text-xs text-stone-200 font-medium">{followAdvice.message}</p>
                </div>
              </div>
              <button
                onClick={handleApplyFollowAdvice}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-stone-950 font-black text-xs rounded-xl shadow-lg transition-all"
              >
                {followAdvice.actionText}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= 7. INDEPENDENT PLAY CHECKLIST & RATING MODAL ================= */}
      {showIndependentCheckIn && (
        <div className="bg-stone-950 text-white rounded-3xl p-5 border-2 border-emerald-500/60 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-400 text-stone-950 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white">
                  Independent Play Execution Assessment
                </h3>
                <span className="text-[10px] text-stone-400 font-mono">
                  Self-Reported Evidence • {currentTempo} BPM
                </span>
              </div>
            </div>
          </div>

          {/* 4-Point Execution Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-300 block">
              Verify your execution landmarks:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'groove_stable', label: '1. Steady Groove Pulse (Beats 1–3)' },
                { id: 'entry_clean', label: '2. Clean Sticking Execution (Beat 4)' },
                { id: 'landing_on_1', label: '3. Downbeat Anchor Crash (Bar 2 Beat 1)' },
                { id: 'smooth_recovery', label: '4. Immediate Groove Return (Bar 2 Beat 2)' },
              ].map((item) => {
                const isChecked = independentChecklist.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleIndependentCheckItem(item.id)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isChecked
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                        : 'bg-stone-900 border-stone-800 text-stone-400'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600 shrink-0" />
                    )}
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overall Feeling Rating */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-stone-300 block">
              Select overall execution quality:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'CLEAN' as IndependentRating, label: 'Clean & Relaxed', color: 'emerald' },
                { id: 'ALMOST' as IndependentRating, label: 'Mostly Clean', color: 'sky' },
                { id: 'INCONSISTENT' as IndependentRating, label: 'Inconsistent', color: 'amber' },
                { id: 'LOST_TIME' as IndependentRating, label: 'Lost Time', color: 'rose' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setIndependentRating(r.id)}
                  className={`p-2.5 rounded-xl border text-center font-black transition-all ${
                    independentRating === r.id
                      ? 'bg-emerald-400 text-stone-950 border-emerald-300 scale-105 shadow-md'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!independentRating}
            onClick={handleLogIndependentEvidence}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-xs rounded-xl shadow-xl transition-all"
          >
            CONFIRM & LOG EVIDENCE
          </button>
        </div>
      )}

      {/* ================= 8. TIMING DIAGNOSTICS & TELEMETRY TOGGLE ================= */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setFocusView((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors py-1.5 px-3 rounded-xl hover:bg-stone-100 cursor-pointer"
        >
          {focusView ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show Pedagogical Transfer Notes</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Hide Pedagogical Transfer Notes</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            setShowDiagnostics((prev) => !prev);
            if (!showDiagnostics) {
              setDiagnosticsData(masterTransport.getDiagnostics());
            }
          }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            showDiagnostics
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showDiagnostics ? 'Hide Timing Diagnostics' : 'Timing Diagnostics'}</span>
        </button>
      </div>

      {/* DIAGNOSTICS TELEMETRY PANEL */}
      {showDiagnostics && (
        <div className="bg-stone-950 text-stone-200 border border-stone-800 rounded-3xl p-5 space-y-3 font-mono text-xs shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Web Audio Master Clock Telemetry
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-sans">
              Status: {diagnosticsData?.status || 'idle'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Context Time</span>
              <span className="font-bold text-amber-300">
                {diagnosticsData?.audioContextTime.toFixed(3) || '0.000'}s
              </span>
            </div>
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Sounding Audio</span>
              <span className="font-bold text-sky-300">
                {diagnosticsData?.soundingAudioTime?.toFixed(3) || '0.000'}s
              </span>
            </div>
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Visual Phase Comp</span>
              <span className="font-bold text-emerald-400">
                {diagnosticsData?.visualPhaseOffsetMs
                  ? `-${diagnosticsData.visualPhaseOffsetMs.toFixed(1)}ms`
                  : '-35.0ms'}
              </span>
            </div>
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Scheduled Events</span>
              <span className="font-bold text-emerald-400">
                {diagnosticsData?.scheduledEventsCount || 0}
              </span>
            </div>
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Learner Space</span>
              <span className="font-bold text-purple-400">
                {diagnosticsData?.learnerSpaceRegionsCount || 0} regions
              </span>
            </div>
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
              <span className="text-[9px] text-stone-500 block uppercase">Underruns</span>
              <span
                className={`font-bold ${
                  diagnosticsData?.underrunsCount ? 'text-rose-400' : 'text-stone-400'
                }`}
              >
                {diagnosticsData?.underrunsCount || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PEDAGOGICAL TRANSFER NOTES */}
      {!focusView && exercise.transferInstructions && (
        <div className="space-y-3 pt-2 border-t border-stone-200 animate-in fade-in duration-200">
          {exercise.transferInstructions.orchestrationMap && (
            <div className="bg-[#f6f6f4] border-2 border-stone-300 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>Zone Orchestration Map</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {exercise.transferInstructions.orchestrationMap.map((zone, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1"
                  >
                    <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      {zone.zone}
                    </span>
                    <p className="font-bold text-stone-900 text-[11px]">{zone.notes}</p>
                    <p className="text-[10px] text-stone-600">{zone.instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
