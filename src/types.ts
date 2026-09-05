export type SkillTrackId =
  | 'rudiments'
  | 'grooves'
  | 'fills'
  | 'timeSignatures'
  | 'coordination'
  | 'reading'
  | 'dynamics';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type SkillStatus =
  | 'NOT_STARTED'
  | 'DISCOVERED'
  | 'LEARNING'
  | 'CLEAN'
  | 'APPLICABLE'
  | 'MUSICAL'
  | 'MASTERED';

export type DataProvenance =
  | 'user'
  | 'assessment'
  | 'practice_log'
  | 'coach_inference'
  | 'default'
  | 'unknown';

export interface GranularSkill {
  id: string;
  name: string;
  parentTrack: SkillTrackId;
  category: string; // e.g., 'Worship Grooves', 'Linear Vocabulary', 'Single Strokes'
  description: string;
  status: SkillStatus;
  confidence: number; // 1 to 5
  currentComfortTempo?: number | null; // in BPM (null if unassessed)
  targetTempo?: number | null; // in BPM (curriculum target guidance)
  relevantTimeSignatures?: string[];
  knownGaps?: string[];
  dateLastPracticed?: string | null;
  practiceCount: number;
  notes?: string;
  source?: DataProvenance;
}

export type PracticeEquipment = 'Practice Pad' | 'Full Drum Kit' | 'Both';
export type PracticePriority = 'Skill Development' | 'Song / Performance Preparation' | 'Balanced';

export interface LearnerProfile {
  // Practice Context
  typicalPracticeTime: string;
  equipment: PracticeEquipment;
  primaryEquipmentNote?: string;
  mainMusicalContexts: string[];
  mainGenres: string[];
  musicalResponsibilities: string;
  personalGoals: string[];

  // Musical Preferences (USER PROVIDED)
  favouriteSongs: string[];
  favouriteArtists: string[];
  favouriteDrummers: string[];

  // Practice Priority
  practicePriority: PracticePriority;

  // Coach Recommendations (SEPARATE FROM USER PREFERENCES)
  coachRecommendedDrummers?: string[];
  coachRecommendedSongs?: string[];
  coachRecommendedSkills?: string[];
}

export interface SkillTrack {
  id: SkillTrackId;
  name: string;
  icon: string;
  description: string;
  currentLevel: SkillLevel;
  knownGaps: string[];
  targetGoals: string[];
  keyConcepts: string[];
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ladderData?: {
    startBpm: number;
    targetBpm: number;
    steps: number[];
  };
  songRef?: {
    title: string;
    artist: string;
    type: 'Practice' | 'Stretch';
    bpm: number;
  };
  retryText?: string;
  retryable?: boolean;
  errorCode?: string;
}

export interface SongRecommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  trackId: SkillTrackId;
  level: 'Practice' | 'Stretch';
  bpm: number;
  skillTimestamp: string;
  whyGoodFit: string;
  difficulty: SkillLevel;
}

export type ExercisePhase =
  | 'WARM UP'
  | 'FOUNDATION'
  | 'MAIN WORK'
  | 'DEVELOPMENT'
  | 'APPLICATION'
  | 'CHALLENGE'
  | 'COOL DOWN';

export type SelfCheckFeeling =
  | 'CLEAN_AND_RELAXED'
  | 'MOSTLY_CLEAN'
  | 'INCONSISTENT'
  | 'TOO_DIFFICULT';

export type CoachActionType =
  | 'advance'
  | 'consolidate'
  | 'retry'
  | 'regress'
  | 'recovery'
  | 'end_skill_block';

export interface PracticeAttemptEvidence {
  id: string;
  sessionId: string;
  skillId: string;
  exerciseId: string;
  timestamp: string; // ISO string

  equipment: 'Practice Pad' | 'Full Drum Kit';
  practiceContext?: string;

  attemptNumber: number; // 1-indexed attempt for this skill in this session

  bpm: number;
  previousBpm?: number;

  assessment: 'clean_relaxed' | 'mostly_clean' | 'inconsistent' | 'too_difficult';

  frictions: string[];

  coachAction: CoachActionType;

  nextBpm: number;

  recoveryMode: boolean;

  progressionStage?: ProgressionStage;
  challengeType?: string;
}

export type PlacementType =
  | 'isolated'
  | 'one_beat_fill'
  | 'two_beat_fill'
  | 'full_bar_fill'
  | 'groove_insert'
  | 'transition'
  | 'pickup'
  | 'phrase_ending';

export type StartPoint =
  | 'beat_1'
  | 'beat_2'
  | 'beat_3'
  | 'beat_4'
  | 'and_of_2'
  | 'and_of_3'
  | 'and_of_4'
  | 'subdivision_offset';

export type TargetLanding =
  | 'beat_1'
  | 'crash_on_1'
  | 'groove_on_1'
  | 'snare_backbeat'
  | 'next_phrase';

export interface MusicalPlacement {
  placementType: PlacementType;
  startPoint: StartPoint;
  endPoint?: string;
  phraseLength: string; // e.g. "1 beat", "2 beats", "1 bar", "2-bar phrase"
  bars?: number;
  subdivision: string;
  targetLanding: TargetLanding;
  entryContext?: string;
  exitContext?: string;
  whereThisFitsExplanation?: string;
  beatGridVisual?: {
    counts: string[];
    grooveBeats: string[];
    fillBeats: string[];
    landingBeat: string;
  };
}

export type InstructionMode = 'WATCH' | 'FOLLOW' | 'PLAY';
export type AssistanceLevel = 'FULL' | 'REDUCED' | 'MINIMAL' | 'NONE';

export type FollowCuesReflection =
  | 'LOST_PULSE'
  | 'ENTRY_TIMING_ISSUE'
  | 'MISSED_LANDING'
  | 'ROUGH_RECOVERY'
  | 'CLEAN_COMFORTABLE';

export type IndependentRating = 'NEEDS_WORK' | 'ALMOST' | 'CLEAN';

export type RhythmEventRole = 'groove' | 'fill' | 'landing' | 'rest' | 'groove_return' | 'learner_space';

export type LimbAssignment = 'R' | 'L' | 'K' | 'RF' | 'LF' | 'BOTH' | 'NONE';

export type InstrumentSurface =
  | 'center'
  | 'left_zone'
  | 'right_zone'
  | 'rim_edge'
  | 'snare'
  | 'snare_ghost'
  | 'hihat'
  | 'hihat_closed'
  | 'hihat_open'
  | 'kick'
  | 'crash'
  | 'ride'
  | 'clap'
  | 'metronome'
  | 'tom_high'
  | 'tom_mid'
  | 'tom_floor'
  | 'muted_space';

export interface LearnerSpaceInfo {
  purpose: string;
  expectedLearnerAction: string;
  durationBeats: number;
  isIntentionalSilence: boolean;
}

export interface EventAssistanceContract {
  audibleAt: AssistanceLevel[];
  visuallyActiveAt: AssistanceLevel[];
  showHandGuidanceAt?: AssistanceLevel[];
  cueType: 'pulse' | 'fill_entry' | 'accent' | 'landing' | 'recovery' | 'inner_note' | 'learner_repetition';
}

export interface RhythmEvent {
  id: string;
  barNumber: number; // 1-indexed (e.g. Bar 1, Bar 2)
  beatNumber: number; // 1-indexed (e.g. Beat 1, Beat 2, Beat 3, Beat 4)
  subdivisionIndex: number; // 0-indexed within beat
  totalSubdivisionsInBeat: number; // 4 (16ths), 6 (sextuplets), 3 (triplets), 2 (8ths)
  countLabel: string; // e.g. "1", "e", "&", "a", "4-la-li", "1"
  role: RhythmEventRole;
  limb: LimbAssignment;
  hand?: 'R' | 'L';
  surface: InstrumentSurface;
  /** Additional simultaneous surfaces sounded at the exact same musical instant. */
  surfaces?: InstrumentSurface[];
  surfaceLabel: string; // "Center", "Left Accent", "Right Accent", "Rim / Crash"
  isAccented: boolean;
  velocity: number; // 0.0 to 1.0
  noteLabel: string; // e.g. ">R", "L", "K", "Groove"
  description?: string;
  timeOffsetInPhrase: number; // 0.0 to 1.0 (normalized position across the full loop)
  durationFraction: number; // normalized duration of event in phrase
  isLearnerSpace?: boolean;
  learnerSpaceInfo?: LearnerSpaceInfo;
  isTutorAudible?: boolean;
  assistanceContract?: EventAssistanceContract;
}

export interface RhythmTimeline {
  id: string;
  title: string;
  timeSignature: string; // "4/4", "6/8"
  beatsPerBar: number;
  totalBars: number;
  subdivisionType: string;
  totalEvents: number;
  events: RhythmEvent[];
  grooveSummary: string;
  fillSummary: string;
  landingSummary: string;
  grooveReturnSummary: string;
  equipment: 'Practice Pad' | 'Full Drum Kit';
  hasLearnerSpace?: boolean;
  learnerSpaceSummary?: string;
}

export interface TransportDiagnosticLog {
  id: string;
  timestampMs: number;
  type: 'SCHEDULE_EVENT' | 'LEARNER_SPACE' | 'LANDING_REACHED' | 'LOOP_WRAP' | 'START' | 'STOP' | 'TEMPO_CHANGE' | 'UNDERRUN_WARNING';
  bar: number;
  beat: number;
  role: string;
  message: string;
  audioTime: number;
}

export interface StartTraceDiagnostic {
  buttonPressedAtMs: number;
  audioContextStateBefore: string;
  audioContextResumedAtMs: number;
  transportStartAudioTime: number;
  firstScheduledEventTime: number;
  firstVisualRunningTime: number;
  firstMetronomeExpectedTime: number;
  visualStartDeltaMs: number;
}

export interface TransportDiagnosticState {
  status: 'idle' | 'arming' | 'count_in' | 'running' | 'paused' | 'stopped';
  bpm: number;
  effectiveBpm: number;
  currentBar: number;
  currentBeat: number;
  currentSubdivision: number;
  phraseStage: string;
  audioContextTime: number;
  soundingAudioTime: number;
  visualPhaseOffsetMs: number;
  transportStartTime: number;
  phraseElapsed: number;
  completedLoops: number;
  scheduledEventsCount: number;
  learnerSpaceRegionsCount: number;
  underrunsCount: number;
  lastEventDescription: string;
  startTrace?: StartTraceDiagnostic | null;
  logs: TransportDiagnosticLog[];
}

export type PlacementStatus = 'Established' | 'Developing' | 'Not Yet Evidenced';

export interface PlacementAttemptEvidence {
  id: string;
  sessionId: string;
  skillId: string;
  exerciseId: string;
  timestamp: string;
  placementType: PlacementType;
  startPoint: StartPoint;
  phraseLength: string;
  targetLanding: TargetLanding;
  bpm: number;
  playbackBpm?: number;
  speedPercent?: number;
  selfAssessment: SelfCheckFeeling;
  placementFrictions: string[];
  success: boolean;
  instructionMode?: InstructionMode;
  assistanceLevel?: AssistanceLevel;
  exerciseObjective?: string;
  followCuesReflection?: FollowCuesReflection;
  independentChecklist?: string[];
  overallRating?: IndependentRating;
  evidenceCategory?: 'LEARNING_ACTIVITY' | 'GUIDED_PRACTICE' | 'SELF_ASSESSED_EXECUTION';
  visualTutorUsed?: boolean;
  phrasePosition?: string;
  surfaceContext?: string;
}

export interface PlacementEvidenceMemory {
  skillId: string;
  successfulOneBeatPlacements: number;
  successfulTwoBeatPlacements: number;
  successfulFullBarPlacements: number;
  successfulDownbeatLandings: number;
  cleanGrooveReturns: number;
  totalPlacementAttempts: number;
  commonStartPointIssues: string[];
  commonLandingIssues: string[];
  grooveReturnReliability: 'High' | 'Moderate' | 'Low' | 'Unassessed';
  recentPlacementTrend: RecentTrendType;
  recurringPlacementFriction?: string | null;
  oneBeatStatus: PlacementStatus;
  twoBeatStatus: PlacementStatus;
  fullBarStatus: PlacementStatus;
  grooveReturnStatus: PlacementStatus;
  nextPlacementTarget: string;
}

export type ProgressionStage =
  | 'FOUNDATION'
  | 'CONTROL'
  | 'ENDURANCE'
  | 'APPLICATION'
  | 'TRANSFER';

export type StageStatus = 'Established' | 'Developing' | 'Not Yet Evidenced';

export type ChallengeType =
  | 'precision-mechanics'
  | 'dynamic-control'
  | 'continuous-stream'
  | 'sustained-endurance'
  | 'musical-fill'
  | 'groove-phrase'
  | 'kit-orchestration'
  | 'accent-displacement';

export type SessionIntent =
  | 'establish_baseline'
  | 'rebuild'
  | 'stabilize'
  | 'consolidate'
  | 'progress'
  | 'apply'
  | 'checkpoint_prep';

export type ReadinessState =
  | 'NOT_READY'
  | 'DEVELOPING'
  | 'NEARLY_READY'
  | 'READY_FOR_CHECKPOINT'
  | 'INSUFFICIENT_EVIDENCE';

export interface ReadinessRequirement {
  id: string;
  label: string;
  description: string;
  met: boolean;
  category: 'mechanics' | 'consistency' | 'placement' | 'context' | 'evidence';
  statusLabel?: string;
}

export interface SkillReadiness {
  skillId: string;
  skillName: string;
  currentStatus: SkillStatus;
  targetStatus: SkillStatus | null;
  readinessState: ReadinessState;
  readinessLabel: string;
  readinessSummary: string;
  requirements: ReadinessRequirement[];
  metRequirementsCount: number;
  totalRequirementsCount: number;
  blockers: string[];
  strengths: string[];
  checkpointType: 'CLEAN' | 'APPLICABLE' | 'MUSICAL' | 'MASTERED' | null;
  nextActionRecommendation: string;
}

export const READINESS_STATE_CONFIG: Record<
  ReadinessState,
  { label: string; description: string; bg: string; text: string; border: string; iconColor: string }
> = {
  READY_FOR_CHECKPOINT: {
    label: 'Ready for Checkpoint',
    description: 'All core evidence requirements demonstrated cleanly across multiple sessions.',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-800',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-600',
  },
  NEARLY_READY: {
    label: 'Nearly Ready',
    description: 'Strong foundation established with minor gaps or final consolidation needed.',
    bg: 'bg-amber-500/15',
    text: 'text-amber-800',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-600',
  },
  DEVELOPING: {
    label: 'Developing',
    description: 'Active practice in progress; several key criteria still being established.',
    bg: 'bg-sky-500/15',
    text: 'text-sky-800',
    border: 'border-sky-500/30',
    iconColor: 'text-sky-600',
  },
  NOT_READY: {
    label: 'Not Ready',
    description: 'Recent friction, inconsistency, or recovery triggers need addressing first.',
    bg: 'bg-rose-500/15',
    text: 'text-rose-800',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-600',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    description: 'Not enough practice session attempts recorded yet to assess readiness.',
    bg: 'bg-stone-500/15',
    text: 'text-stone-700',
    border: 'border-stone-500/30',
    iconColor: 'text-stone-500',
  },
};

export type EvidenceConfidence = 'low' | 'developing' | 'reliable';

export interface PracticeContinuityDecision {
  skillId: string;
  skillName: string;
  priorityScore: number;
  priorityReason: string;
  recommendedStartingTempo: number;
  tempoLabel: 'EVIDENCE-BASED STARTING TEMPO' | 'SUGGESTED BASELINE TEMPO';
  sessionIntent: SessionIntent;
  sessionIntentLabel: string;
  recurringFriction: string | null;
  recentTrend: RecentTrendType;
  evidenceConfidence: EvidenceConfidence;
  lastSessionSummary: {
    date: string | null;
    workingBpm: number | null;
    lastResult: string;
    unresolvedIssue: string | null;
  } | null;
  whyChosenExplanation: string;
  todayAim: string;
  exerciseFocusPlan: string[];
  nextTimeRecommendation?: string;

  // BU2D Progression Stage additions
  currentStage: ProgressionStage;
  todayEmphasis: string;
  nextDevelopmentTarget: string;
  stageStatuses: Record<ProgressionStage, StageStatus>;
  isRegressedEmphasis?: boolean;
}

export type RecentTrendType = 'improving' | 'stable' | 'struggling' | 'insufficient_evidence';

export interface SkillEvidenceMemory {
  skillId: string;

  totalSessions: number; // unique practice sessions count
  totalAttempts: number; // total individual attempt records

  cleanAttempts: number;
  mostlyCleanAttempts: number;
  inconsistentAttempts: number;
  difficultAttempts: number;

  recoveryModeCount: number;

  highestAttemptedBpm: number | null;
  highestCleanBpm: number | null;
  latestCleanBpm: number | null;

  currentWorkingBpm: number | null;

  commonFrictions: { tag: string; count: number }[];
  primaryRecurringFriction: { tag: string; count: number; totalRecentEncounters: number } | null;

  recentTrend: RecentTrendType;

  lastPracticedAt: string | null;

  currentStage?: ProgressionStage;
  todayEmphasis?: string;
  nextDevelopmentTarget?: string;
  stageStatuses?: Record<ProgressionStage, StageStatus>;
}

export interface CoachSkillContext {
  skillId: string;
  skillName: string;
  totalSessions: number;
  totalAttempts: number;
  currentWorkingTempo: number | null;
  highestCleanTempo: number | null;
  highestAttemptedTempo: number | null;
  primaryRecurringFriction: string | null;
  recentTrend: RecentTrendType;
  recoveryModeCount: number;
  summaryText: string;
}

export interface ExerciseResult {
  selfCheck: SelfCheckFeeling;
  issueTags: string[];
  tempoUsed: number;
  tempoChange: number; // e.g. +3, 0, -5
  adaptiveAction?: 'advance' | 'repeat' | 'reduce_tempo' | 'simplify' | 'recover' | 'end_skill_block';
  adaptiveReason?: string;
  completedAt: string;
  instructionMode?: InstructionMode;
  assistanceLevel?: AssistanceLevel;
  followCuesReflection?: FollowCuesReflection;
  independentChecklist?: string[];
  overallRating?: IndependentRating;
  evidenceCategory?: 'LEARNING_ACTIVITY' | 'GUIDED_PRACTICE' | 'SELF_ASSESSED_EXECUTION';
  visualTutorUsed?: boolean;
}

export interface AccentNote {
  noteIndex: number;
  hand: string;
  isAccented: boolean;
  zone?: string;
}

export interface OrchestrationStep {
  zone: string;
  notes: string;
  instruction: string;
}

export interface TransferProgressionStep {
  stepNumber: number;
  label: string;
  details: string;
}

export interface TransferInstructionModel {
  baseSticking: string;
  accentPattern: string;
  accentNotes?: AccentNote[];
  orchestrationMap?: OrchestrationStep[];
  transferProgression?: TransferProgressionStep[];
  musicalCounting?: string;
  executionTarget: string;
}

export type ExercisePedagogicalRole =
  | 'PREPARATION'
  | 'PRIMARY TARGET'
  | 'REINFORCEMENT'
  | 'INDEPENDENCE TEST'
  | 'COOL-DOWN';

export interface PracticeIntent {
  targetSkillId: string;
  targetSkillName: string;
  activeGoal: string;
  targetDimension?: DifficultyDimension | string;
  limiter: MusicalLimiter | string;
  limiterDescription?: string;
  supportingContainer: string;
  learningTempo: number;
  assistanceLevel: AssistanceLevel | 'full' | 'reduced' | 'none' | 'Full' | 'Reduced' | 'Minimal' | 'None' | string;
  successFocus: string[];
  adaptiveReason: string;
  evidenceNeeded?: string;
  targetPhraseLocation?: string;
  recommendedSnapshot?: {
    skillName: string;
    limiter: string;
    bpm: number;
    assistance: string;
  };
}

export interface PracticeExercise {
  id: string;
  title: string;
  phase: ExercisePhase;
  skillIds: string[];
  purpose: string; // WHY YOU ARE DOING THIS - one short sentence
  pedagogicalRole?: ExercisePedagogicalRole;
  whyThisExercise?: string;
  instructions: string;
  sticking?: string; // e.g. "R L K   R L K"
  counting?: string; // e.g. "1-trip-let 2-trip-let 3-trip-let 4-trip-let"
  timeSignature: string; // e.g. "4/4", "6/8"
  subdivision: string; // e.g. "Quarter Notes", "8th Notes", "16th Notes", "Triplets"
  tempo: number; // current BPM
  isSuggestedStartingTempo?: boolean; // true if skill comfort tempo was unassessed
  targetTempo?: number;
  durationSeconds: number;
  exerciseType: 'technique' | 'coordination' | 'groove' | 'fill' | 'application' | 'warmup' | 'cooldown';
  equipmentRequired: 'Practice Pad' | 'Full Drum Kit' | 'Either';
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  padAdaptationNote?: string;
  progressionStage?: ProgressionStage;
  challengeType?: ChallengeType;
  musicalPlacement?: MusicalPlacement;
  entryExitInstructions?: {
    entry: string;
    skillFill: string;
    exit: string;
  };
  transferInstructions?: TransferInstructionModel;
  result?: ExerciseResult;
  isGapClosure?: boolean;
  gapClosureTargetCriterion?: string;
  gapClosureReason?: string;
  gapClosureSuccessTarget?: string;
  checkpointLevel?: 'CLEAN' | 'APPLICABLE' | 'MUSICAL' | 'MASTERED' | string;
  sessionSource?: string;
  gapClosurePlanId?: string;
  checkpointAttemptId?: string;
  skillId?: string;
  targetCriterionId?: string;
  targetCriterionIds?: string[];
  countsTowardRemediation?: boolean;
  remediationDrillId?: string;
}

export interface CheckpointCriterionResult {
  criterionId: string;
  criterionName: string;
  passed: boolean;
  description?: string;
  testMethod?: string;
  bpmRequirement?: number;
}

export interface CheckpointAttempt {
  id: string;
  skillId: string;
  skillName: string;
  checkpointLevel: 'CLEAN' | 'APPLICABLE' | 'MUSICAL' | 'MASTERED' | string;
  attemptedAt: string; // ISO string
  assessedTempo: number;
  totalCriteria: number;
  passedCriteriaIds: string[];
  failedCriteriaIds: string[];
  score: number; // percentage, e.g. 50
  result: 'passed' | 'partial' | 'failed';
  criteriaResults: CheckpointCriterionResult[];
}

export interface GapClosureCriterion {
  criterionId: string;
  criterionTitle: string;
  description: string;
  testMethod?: string;
  focusSummary: string;
  assignedDrillIds?: string[];
  completedDrillIds?: string[];
  qualifyingCompletedDrillIds?: string[];
  status?: 'pending' | 'in_progress' | 'remediated';
  lastAttemptAssessment?: SelfCheckFeeling;
}

export interface GapClosurePlan {
  id: string;
  skillId: string;
  skillName: string;
  checkpointLevel: 'CLEAN' | 'APPLICABLE' | 'MUSICAL' | 'MASTERED' | string;
  createdAt: string; // ISO string
  sourceCheckpointAttemptId: string;
  status: 'active' | 'completed' | 'abandoned';
  failedCriteria: GapClosureCriterion[];
  exercises: PracticeExercise[];
  reassessmentTarget: string;
  completedExerciseIds: string[];
  isReadyForReassessment?: boolean;
  remediationSummary?: string;
}

export type PracticeContextOption = 'SKILL_DEVELOPMENT' | 'SONG_SERVICE_PREP' | 'BALANCED';
export type EquipmentOption = 'Practice Pad' | 'Full Drum Kit';
export type FocusModeOption = 'COACH_CHOOSES' | 'MY_CHOICE';

export interface PracticeSession {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  durationMinutes: number;
  actualDurationSeconds?: number;
  trackId?: SkillTrackId;
  practiceContext?: PracticeContextOption;
  equipment?: EquipmentOption;
  focusMode?: FocusModeOption;
  selectedSkillIds?: string[];
  songPrepName?: string;
  focusTopic: string;
  notes: string;
  rating: number; // 1 to 5
  stepsCompleted?: {
    warmup: boolean;
    technique: boolean;
    application: boolean;
    stretch: boolean;
    cooldown: boolean;
  };
  exercises?: PracticeExercise[];
  sessionStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
  startedAt?: string;
  completedAt?: string;
  reflection?: {
    feltBest?: string;
    needWorkNext?: string;
  };
  gapClosurePlanId?: string;
  sourceCheckpointAttemptId?: string;
  checkpointAttemptId?: string;
  checkpointLevel?: string;
  failedCriterionIds?: string[];
  isGapClosure?: boolean;
  sessionSource?: string;
  skillId?: string;
  practiceIntent?: PracticeIntent;
}

export interface RudimentPattern {
  id: string;
  name: string;
  category: 'Single Stroke' | 'Double Stroke' | 'Paradiddle' | 'Flam' | 'Drag' | 'Roll';
  sticking: string; // e.g. "R L R R L R L L"
  description: string;
  defaultBpm: number;
  timeSignature: string;
  accentIndices?: number[];
}

export interface CheckpointQuestion {
  id: string;
  question: string;
  bpmRequirement?: number;
  timeRequirementSeconds?: number;
  passed?: boolean;
}

export const SKILL_STATUS_CONFIG: Record<
  SkillStatus,
  { label: string; description: string; color: string; bg: string; text: string; border: string }
> = {
  NOT_STARTED: {
    label: 'Not Started',
    description: 'The learner has not begun working on the skill.',
    color: 'stone',
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-300',
  },
  DISCOVERED: {
    label: 'Discovered',
    description: 'The learner understands what the skill is but has little practical control.',
    color: 'amber',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  LEARNING: {
    label: 'Learning',
    description: 'The learner is actively developing execution.',
    color: 'blue',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-300',
  },
  CLEAN: {
    label: 'Clean',
    description: 'The skill can be executed consistently with good control in an isolated exercise.',
    color: 'emerald',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  APPLICABLE: {
    label: 'Applicable',
    description: 'Can place the skill inside a groove, fill or musical phrase without losing pulse.',
    color: 'indigo',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
  },
  MUSICAL: {
    label: 'Musical',
    description: 'Can choose and use the skill appropriately with good timing, dynamics, and tone.',
    color: 'purple',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
  MASTERED: {
    label: 'Mastered',
    description: 'Reliable across multiple tempos, contexts, placements, and musical situations.',
    color: 'olive',
    bg: 'bg-[#4a523a]/15',
    text: 'text-[#3d4430]',
    border: 'border-[#4a523a]/40',
  },
};

export const SKILL_STATUS_ORDER: Record<SkillStatus, number> = {
  NOT_STARTED: 0,
  DISCOVERED: 1,
  LEARNING: 2,
  CLEAN: 3,
  APPLICABLE: 4,
  MUSICAL: 5,
  MASTERED: 6,
};

export function skillStatusAtLeast(status: SkillStatus, required: SkillStatus): boolean {
  return (SKILL_STATUS_ORDER[status] ?? 0) >= (SKILL_STATUS_ORDER[required] ?? 0);
}

export function skillStatusOrder(status: SkillStatus): number {
  return SKILL_STATUS_ORDER[status] ?? 0;
}


// ============================================================================
// BU2F-R2E — SKILL DEPENDENCIES, ANCHOR GROOVES & GUIDED ROADMAP TYPES
// ============================================================================

export type DependencyType =
  | 'FOUNDATION'
  | 'RHYTHM'
  | 'COORDINATION'
  | 'GROOVE_CONTEXT'
  | 'PLACEMENT'
  | 'EQUIPMENT'
  | 'MUSICAL_CONTEXT';

export type DependencyImportance = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export type DependencyEvidenceState = 'SATISFIED' | 'WEAK' | 'MISSING' | 'UNKNOWN';

export interface SkillDependency {
  id: string;
  skillId: string; // Target skill this dependency belongs to
  requiredSkillId?: string; // Optional reference to a GranularSkill in the library
  requiredConceptKey?: string; // e.g. "pulse_44", "subdivision_16th", "beat_4_entry", "beat_1_landing"
  name: string;
  dependencyType: DependencyType;
  importance: DependencyImportance;
  prerequisiteClassification?: PrerequisiteClassification; // 'HARD' | 'SUPPORTING' | 'ENRICHMENT'
  minimumEvidenceState: 'DISCOVERED' | 'LEARNING' | 'CLEAN' | 'APPLICABLE' | 'EVIDENCED';
  reason: string; // Human-readable musical reason why this is needed
  remediationActionText?: string;
  anchorGrooveId?: string;
}

export type AnchorGrooveLevel = 1 | 2 | 3;

export interface AnchorGroove {
  id: string;
  name: string;
  timeSignature: '4/4' | '6/8' | '3/4';
  level: AnchorGrooveLevel; // 1: minimal pulse context, 2: simple kick/snare/hat groove, 3: slightly more musical variation
  category: 'Pulse' | 'Straight 4/4' | 'Worship' | '6/8 Slow' | 'Pop/Rock';
  description: string;
  bpmRange: { min: number; max: number; default: number };
  pedagogicalRole: string; // e.g. "Musical container for 1-beat fill placement and Beat 1 crash recovery."
  stickingOrPattern: string; // e.g. "HH: 8ths | Kick: 1 & 3 | Snare: 2 & 4"
  skillIdMapping?: string; // e.g. 'grv-worship-44'
  isPulseOnly?: boolean;
}

export type CurriculumStage =
  | 'UNDERSTAND'
  | 'CONTROL'
  | 'PLACE'
  | 'TRANSFER'
  | 'VARY'
  | 'CREATE';

export type RoadmapNextStepType =
  | 'CONTINUE_TARGET'
  | 'REFRESH_DEPENDENCY'
  | 'BUILD_DEPENDENCY'
  | 'TARGET_APPLICATION'
  | 'CONSOLIDATE'
  | 'TRANSFER'
  | 'VARY'
  | 'CREATE'
  | 'CHECKPOINT_PREP';

export interface EvaluatedDependency {
  dependency: SkillDependency;
  state: DependencyEvidenceState;
  evidenceExplanation: string;
  prerequisiteClassification?: PrerequisiteClassification;
  anchorGroove?: AnchorGroove;
  skillReference?: GranularSkill;
}

export interface RoadmapDecision {
  targetSkillId: string;
  targetSkillName: string;
  currentGoal: string;
  curriculumStage: CurriculumStage;
  dependencies: EvaluatedDependency[];
  satisfiedDependencies: EvaluatedDependency[];
  weakDependencies: EvaluatedDependency[];
  missingDependencies: EvaluatedDependency[];
  hasBlockingPrerequisites: boolean;
  recommendedNextStep: RoadmapNextStepType;
  roadmapReason: string;
  estimatedPracticeFocus: string;
  supportingSkill?: {
    id: string;
    name: string;
    roleExplanation: string;
    anchorGroove?: AnchorGroove;
    needsMiniLesson: boolean;
    evidenceState: DependencyEvidenceState;
  };
  whyThisNext: {
    targetName: string;
    alreadyHave: string[];
    usingSupporting: string | null;
    reason: string;
    todayGoal: string;
    nextAfterThis: string;
  };
  futureStages?: {
    varyStageSummary: string;
    createStageSummary: string;
  };
  miniLessonAvailable?: boolean;
}

export interface ActiveLearningThread {
  id: string;
  skillId: string;
  skillName: string;
  goal: string;
  currentStep: string;
  nextStep: string;
  curriculumStage: CurriculumStage;
  supportingGrooveName?: string;
  dateStarted: string;
  lastPracticedAt: string | null;
  priorityOrder: number; // 1, 2, 3
  isPinned?: boolean;
}

export interface ReturnToTargetMemory {
  returnTargetSkillId: string;
  returnTargetSkillName: string;
  returnTargetExerciseType: string;
  dependencyReason: string;
  interruptedAt: string;
  supportingSkillId: string;
  supportingSkillName: string;
  anchorGrooveId?: string;
}

export interface RoadmapDecisionRecord {
  id: string;
  timestamp: string;
  selectedTargetSkillId: string;
  selectedTargetSkillName: string;
  selectedDependencyId?: string;
  dependencyState?: DependencyEvidenceState;
  anchorGrooveId?: string;
  roadmapStep: RoadmapNextStepType;
  curriculumStage: CurriculumStage;
  reason: string;
  provenance: DataProvenance;
}

// ============================================================================
// BU2F-R2F — ADAPTIVE CURRICULUM PROGRESSION & READINESS ENGINE TYPES
// ============================================================================

export type CurriculumPathway =
  | 'REMEDIATE'
  | 'REINFORCE'
  | 'PROGRESS'
  | 'VARY'
  | 'TRANSFER'
  | 'CHECKPOINT';

export type DimensionReadinessLevel = 'ESTABLISHED' | 'DEVELOPING' | 'FRAGILE' | 'UNKNOWN';

export type IndependenceReadinessLevel =
  | 'FULL_GUIDANCE'
  | 'REDUCED_CUES'
  | 'INDEPENDENT'
  | 'AUTOMATIC';

export type SupportingContextState = 'KNOWN_STABLE' | 'NEEDS_CALIBRATION' | 'UNKNOWN';

export type MusicalLimiter =
  | 'RECOVERY'
  | 'LANDING'
  | 'PLACEMENT'
  | 'INDEPENDENCE'
  | 'TECHNICAL_CONTROL'
  | 'TIME_PULSE'
  | 'CONTEXT'
  | 'TEMPO'
  | 'NONE_READY_TO_PROGRESS';

export type DifficultyDimension =
  | 'ASSISTANCE'
  | 'ENTRY_POINT'
  | 'PHRASE_LENGTH'
  | 'LANDING'
  | 'ORCHESTRATION'
  | 'CONTEXT'
  | 'TEMPO'
  | 'REPETITION'
  | 'INDEPENDENCE'
  | 'NONE';

export type ContextTempoStatus =
  | 'UNTESTED'
  | 'CALIBRATING'
  | 'DEVELOPING'
  | 'STABLE'
  | 'ESTABLISHED'
  | 'LIMITED_EVIDENCE';

export interface ContextSpecificTempoReadiness {
  isolatedTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    attemptsCount: number;
    cleanCount: number;
  };
  pulseTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    attemptsCount: number;
  };
  placementTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    attemptsCount: number;
    cleanCount: number;
  };
  landingTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    landingsCount: number;
  };
  recoveryTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    recoveriesCount: number;
  };
  independentMusicalTempo: {
    bpm: number | null;
    status: ContextTempoStatus;
    unassistedCleanCount: number;
  };
  currentLearningTempo: number;
  technicalCapabilityBpm: number | null;
  targetTempo: number;
  tempoDecisionReason: string;
  reassuranceMessage: string;
  overallMusicalTempoStatus: ContextTempoStatus;
}

export interface MultiDimensionalReadiness {
  technicalControl: DimensionReadinessLevel; // Sticking / mechanics / pattern accuracy
  timeAndPulse: DimensionReadinessLevel;     // Pulse continuity, steady subdivision
  placement: DimensionReadinessLevel;        // Phrase entry at intended location
  landing: DimensionReadinessLevel;          // Downbeat resolution / crash timing on 1
  recovery: DimensionReadinessLevel;         // Resuming groove timekeeping without pause
  independence: IndependenceReadinessLevel;  // Level of metronome / verbal guidance needed
  contextReadiness: SupportingContextState;  // Stability of underlying groove container
  tempoReadiness?: DimensionReadinessLevel;  // Tempo comfort vs target
  contextTempos?: ContextSpecificTempoReadiness; // BU2F-R2G-Fix1: Context-specific tempo readiness
  currentLimiter: MusicalLimiter;            // Primary roadblock preventing next milestone
  limiterDescription: string;                // Drummer-friendly explanation of the limiter
  qualitativeSummary: string;
}

export interface SupportingContextDecision {
  contextName: string;
  anchorGroove: AnchorGroove;
  state: SupportingContextState;
  reason: string;
  calibrationRecommended: boolean;
}

export interface DifficultyDimensionChange {
  primaryDimension: DifficultyDimension;
  previousState: string;
  newState: string;
  explanation: string;
}

export interface CurriculumDecision {
  id: string;
  timestamp: string;
  targetSkillId: string;
  targetSkillName: string;
  decision: CurriculumPathway;
  reason: string;
  currentCapability: string;
  currentLimiter: MusicalLimiter;
  evidenceSummary: string;
  nextTarget: string;
  supportingContext: SupportingContextDecision;
  difficultyChange: DifficultyDimensionChange;
  readiness: MultiDimensionalReadiness;
  unresolvedDependencies: EvaluatedDependency[];
  adaptiveAnalysis?: AdaptivePathAnalysis;
  evidenceBreakdown?: EvidenceBreakdown;
  learningStack?: LearningStackState;
  whatChanged?: {
    previous: {
      entry: string;
      assistance: string;
      tempo: string;
      phraseLength: string;
      context: string;
    };
    next: {
      entry: string;
      assistance: string;
      tempo: string;
      phraseLength: string;
      context: string;
    };
    summary: string;
  };
  recommendedAction: {
    label: string;
    actionType:
      | 'PRACTICE_TARGET'
      | 'SIMPLIFY_FOUNDATION'
      | 'REDUCE_ASSISTANCE'
      | 'CHANGE_PLACEMENT'
      | 'TRY_ORCHESTRATION'
      | 'TRANSFER_CONTEXT'
      | 'TAKE_CHECKPOINT';
    exerciseType: 'musical_placement' | 'mini_lesson' | 'gap_closure' | 'standard';
    targetSkillId: string;
    targetSkillName: string;
    suggestedBpm: number;
    phraseLength?: '1 beat' | '2 beats' | '1 bar';
    entryLocation?: string;
    assistanceMode?: 'full' | 'reduced' | 'none';
    anchorGroove?: AnchorGroove;
    orchestrationNotes?: string;
  };
}

export interface CurriculumDecisionRecord {
  id: string;
  timestamp: string;
  targetSkillId: string;
  targetSkillName: string;
  decision: CurriculumPathway;
  currentLimiter: MusicalLimiter;
  reason: string;
  nextTarget: string;
  difficultyDimensionChanged: DifficultyDimension;
  supportingContextName: string;
  readinessSnapshot: MultiDimensionalReadiness;
  evidenceReference?: string;
}

// ============================================================================
// BU2F-R2G — ADAPTIVE LEARNING PATH & PREREQUISITE GATE TYPES
// ============================================================================

export type PrerequisiteClassification = 'HARD' | 'SUPPORTING' | 'ENRICHMENT';

export type AdaptiveNextStepDecision =
  | 'REINFORCE'
  | 'SLOW_DOWN'
  | 'ISOLATE'
  | 'PREPARE_PREREQUISITE'
  | 'CONTINUE_APPLICATION'
  | 'REDUCE_ASSISTANCE'
  | 'TEST_INDEPENDENCE'
  | 'PROGRESS'
  | 'VARY'
  | 'CREATE';

export interface LearningStackState {
  mainGoal: string;
  mainSkillId: string;
  mainSkillName: string;
  currentTarget: string;
  temporaryPrerequisite: {
    skillId?: string;
    name: string;
    prerequisiteType: PrerequisiteClassification;
    anchorGrooveId?: string;
    reason: string;
  } | null;
  reason: string;
  returnTarget: {
    skillId: string;
    skillName: string;
    step: string;
    exerciseType?: string;
    phraseLength?: '1 beat' | '2 beats' | '1 bar';
  };
  completionCondition: string;
  status: 'ACTIVE_GOAL' | 'PREREQUISITE_IN_PROGRESS' | 'READY_TO_RESUME';
  lastUpdated: string;
}

export interface EvidenceBreakdown {
  systemObserved: {
    totalAttempts: number;
    cleanAttempts: number;
    placementLandings: number;
    cleanGrooveReturns: number;
    highestCleanBpm: number | null;
    currentWorkingBpm: number | null;
    assistanceLevelsTested: AssistanceLevel[];
    hasIndependentRuns: boolean;
    trend: RecentTrendType;
    summary: string;
  };
  userReported: {
    cleanCount: number;
    mostlyCleanCount: number;
    inconsistentCount: number;
    tooDifficultCount: number;
    frictionTagsEncountered: string[];
    followCuesReflections: string[];
    userConfidence: number;
    summary: string;
  };
  decisionConfidence: 'HIGH' | 'MEDIUM' | 'DEVELOPING' | 'LOW';
  confidenceReason: string;
}

export interface AdaptivePathAnalysis {
  targetSkillId: string;
  targetSkillName: string;
  activeGoal: string;
  currentTarget: string;
  supportingContainer: {
    name: string;
    anchorGroove: AnchorGroove;
    status: 'Ready' | 'Needs Quick Preparation' | 'Blocking';
    roleExplanation: string;
    isTemporaryPrerequisite: boolean;
  };
  prerequisites: {
    hard: EvaluatedDependency[];
    supporting: EvaluatedDependency[];
    enrichment: EvaluatedDependency[];
    missing: EvaluatedDependency[];
    blockingMissing: EvaluatedDependency[];
  };
  eightDimensions: {
    technique: DimensionReadinessLevel;
    timeAndPulse: DimensionReadinessLevel;
    musicalContainer: SupportingContextState;
    placement: DimensionReadinessLevel;
    landing: DimensionReadinessLevel;
    recovery: DimensionReadinessLevel;
    independence: IndependenceReadinessLevel;
    tempoReadiness: DimensionReadinessLevel;
  };
  primaryLimiter: MusicalLimiter;
  limiterExplanation: string;
  adaptiveRecommendation: {
    decision: AdaptiveNextStepDecision;
    decisionLabel: string;
    title: string;
    reason: string;
    buttonLabel: string;
    actionType:
      | 'PRACTICE_TARGET'
      | 'PREPARE_PREREQUISITE'
      | 'ISOLATE_MECHANICS'
      | 'REDUCE_ASSISTANCE'
      | 'TEST_INDEPENDENCE'
      | 'VARY_PLACEMENT'
      | 'CREATE';
    suggestedBpm: number;
    assistanceMode: AssistanceLevel;
    phraseLength: '1 beat' | '2 beats' | '1 bar';
    entryLocation: string;
  };
  whyThisNext: {
    targetName: string;
    alreadyHave: string[];
    stillDeveloping: string[];
    conclusion: string;
  };
  contextTempos?: ContextSpecificTempoReadiness;
  whatHappensAfterThis: {
    current: string;
    nextIfStable: string;
    later: string;
    eventually: string;
  };
  evidence: EvidenceBreakdown;
  learningStack: LearningStackState;
}

// ============================================================================
// CANONICAL CURRICULUM & DRUMMER PLACEMENT MODEL (C1)
// ============================================================================

export type CurriculumBand = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type CompetencyRole = 'CORE' | 'SUPPORTING' | 'ELECTIVE';

export interface TempoStandard {
  bpm: number;
  subdivision: string;
  durationOrCycles: string;
  standardText: string;
}

export interface CurriculumCompetency {
  id: string;
  skillId: string;
  title: string;
  band: CurriculumBand;
  unitId: string;
  learningOrder: number;
  role: CompetencyRole;
  targetStatus: SkillStatus;
  tempoStandard: TempoStandard;
  subdivision: string;
  durationCriterion: string;
  supportedEquipment: PracticeEquipment;
  musicalApplicationRequirement: string;
  songTags: string[];
  prerequisiteCompetencyIds: string[];
  unlocksCompetencyIds?: string[];
  description: string;
  countingPattern: string;
  stickingPattern: string;
  musicalRole: string;
}

export interface CurriculumUnit {
  id: string;
  band: CurriculumBand;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  competencyIds: string[];
  prerequisiteUnitIds: string[];
  isUnlockedByDefault?: boolean;
}

export type StrandId =
  | 'pulse_reading'
  | 'grooves'
  | 'rudiments'
  | 'fills'
  | 'coordination_dynamics';

export interface StrandLevel {
  strandId: StrandId;
  strandName: string;
  estimatedBand: CurriculumBand;
  verifiedBand: CurriculumBand;
  verifiedCompetenciesCount: number;
  totalCompetenciesCount: number;
  activeUnitTitle?: string;
  primaryNextCompetencyTitle?: string;
  primaryNextCompetencyId?: string;
}

export interface BandCertification {
  band: CurriculumBand;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'CERTIFIED';
  certifiedDate?: string;
  coreTotal: number;
  coreVerified: number;
  supportingVerified: number;
}

export interface PlacementTest {
  id: string;
  title: string;
  strandId: StrandId;
  band: CurriculumBand;
  tempo: number;
  subdivision: string;
  durationBars: number;
  durationSeconds: number;
  taskDescription: string;
  sticking?: string;
  counting?: string;
  passCriteria: string[];
  associatedCompetencyId: string;
  associatedSkillId: string;
}

export interface PlacementTestResult {
  testId: string;
  passed: boolean;
  selfAssessment: SelfCheckFeeling;
  notes?: string;
  timestamp: string;
  failedCriteria?: string[];
}

export interface DrummerPlacementAssessment {
  id: string;
  estimatedBand: CurriculumBand;
  verifiedBand: CurriculumBand;
  strands: Record<StrandId, StrandLevel>;
  activeUnitId: string;
  activeCompetencyId: string;
  placementCompleted: boolean;
  completedAt?: string;
  testResults: PlacementTestResult[];
  diagnosticNotes: string[];
  version: number;
}

export type PracticeLaneType = 'PRIMARY_PATH' | 'SUPPORTING_REPAIR' | 'PERFORMANCE_PREP';

export interface PracticeLaneItem {
  laneType: PracticeLaneType;
  laneLabel: string;
  targetSkillId: string;
  targetSkillName: string;
  competencyId?: string;
  unitTitle?: string;
  percentageAllocation: number;
  suggestedTempo: number;
  tempoStandardText: string;
  subdivision: string;
  intent: string;
  reason: string;
  equipment: PracticeEquipment;
  isBlockingGap: boolean;
  isUnlocked: boolean;
}

// =============================================================================
// C2 INTEGRATED TEACHING, COUNTING & DRUM-AUDIO TYPES
// =============================================================================

export type TeachingStage =
  | 'UNDERSTAND'
  | 'COUNT'
  | 'WATCH'
  | 'FOLLOW'
  | 'PLAY'
  | 'EVALUATE';

export type DrumVoiceId =
  | 'kick'
  | 'snare'
  | 'snare_ghost'
  | 'hihat_closed'
  | 'hihat_open'
  | 'tom_high'
  | 'tom_mid'
  | 'tom_floor'
  | 'crash'
  | 'ride'
  | 'clap'
  | 'metronome';

export interface MusicalExplanation {
  whatAmILearning: string;
  howIsItCounted: string;
  handsAndFeet: string;
  drumSurfaces: string;
  musicalApplication: string;
  whatToListenFor: string;
}

export interface TeachingEventDef {
  /** 1-based bar number inside the teaching phrase. Defaults to bar 1. */
  bar?: number;
  /** 1-based beat number inside that bar. */
  beat: number;
  /** Zero-based subdivision index inside the beat. */
  subdivision: number;
  countToken: string;
  hand: 'R' | 'L' | 'BOTH' | 'K' | 'NONE';
  /** Primary voice used for labels and simple patterns. */
  surface: DrumVoiceId | 'pad_center' | 'pad_edge' | 'pad_left' | 'pad_right';
  /** Optional simultaneous voices, e.g. kick + closed hi-hat. */
  surfaces?: Array<DrumVoiceId | 'pad_center' | 'pad_edge' | 'pad_left' | 'pad_right'>;
  /** Optional explicit musical role. Otherwise it is inferred safely. */
  role?: RhythmEventRole;
  accent?: boolean;
  label: string;
  description?: string;
}

export interface CompetencyTeachingDefinition {
  id: string;
  competencyId: string;
  skillId: string;
  title: string;
  meter: string; // e.g. "4/4" or "6/8"
  beatsPerBar: number;
  subdivision: 'Quarter Notes' | '8th Notes' | '16th Notes' | 'Triplets' | '6/8 Compound' | '32nd Notes';
  subdivisionCount: number; // 1, 2, 4, 3, 6, 8
  countTokens: string[]; // e.g. ['1', '2', '3', '4']
  spokenTokens: string[]; // e.g. ['one', 'two', 'three', 'four']
  sticking: string;
  limbPattern: string;
  drumSurfaces: string[];
  accentPositions: number[];
  bars: number;
  events: TeachingEventDef[];
  musicalExplanation: MusicalExplanation;
  commonMistakes: string[];
  diagnosticIssues: string[];
  workingTempo: number;
  certificationTempo: {
    bpm: number;
    durationSeconds: number;
    standardText: string;
  };
  recommendedAssistance: AssistanceLevel;
  supportsCoachThenYou: boolean;
}



