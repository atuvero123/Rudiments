import {
  AssistanceLevel,
  CurriculumBand,
  CurriculumCompetency,
  CurriculumMissionMetadata,
  LearnerProfile,
  PracticeExercise,
  PracticeSession,
  SelfCheckFeeling,
} from '../types';
import { getCurriculumPedagogyProfile } from './curriculumPedagogyEngine';

const C6_EVIDENCE_KEY = 'RUDIMENT_C6_CURRICULUM_EVIDENCE_V1';

export interface CurriculumMissionEvidenceRecord {
  id: string;
  runId: string;
  sessionId: string;
  competencyId: string;
  missionId: string;
  missionNumber: number;
  timestamp: string;
  date: string;
  bpm: number;
  assessment: SelfCheckFeeling;
  assistanceLevel: AssistanceLevel;
  conceptualTarget: boolean;
  executionTarget: boolean;
  musicalApplication: boolean;
  issueTags: string[];
  pedagogyDomain?: string;
}

export interface CurriculumEvidenceLedger {
  competencyId: string;
  totalAttempts: number;
  guidedSuccesses: number;
  reducedSuccesses: number;
  independentCleanRuns: number;
  conceptualDemonstrations: number;
  musicalApplications: number;
  separateSessions: number;
  separateDays: number;
  highestCleanTempo: number | null;
  readiness: number;
  readinessCriteria: Array<{ label: string; met: boolean; detail: string }>;
  recentRecords: CurriculumMissionEvidenceRecord[];
}

function readAllEvidence(): CurriculumMissionEvidenceRecord[] {
  try {
    const raw = localStorage.getItem(C6_EVIDENCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllEvidence(records: CurriculumMissionEvidenceRecord[]) {
  try {
    localStorage.setItem(C6_EVIDENCE_KEY, JSON.stringify(records.slice(-800)));
  } catch (error) {
    console.warn('[C6] Could not persist curriculum evidence', error);
  }
}

export function recordCurriculumMissionEvidence(input: {
  sessionId: string;
  exercise: PracticeExercise;
  assessment: SelfCheckFeeling;
  bpm: number;
  assistanceLevel?: AssistanceLevel;
  issueTags?: string[];
  completedAt?: string;
}): CurriculumMissionEvidenceRecord | null {
  const mission = input.exercise.curriculumMission;
  if (!mission) return null;

  const timestamp = input.completedAt || new Date().toISOString();
  const runId = `${input.sessionId}:${input.exercise.id}:${timestamp}`;
  const all = readAllEvidence();
  const existing = all.find((record) => record.runId === runId);
  if (existing) return existing;

  const record: CurriculumMissionEvidenceRecord = {
    id: `c6-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    runId,
    sessionId: input.sessionId,
    competencyId: mission.competencyId,
    missionId: mission.missionId,
    missionNumber: mission.missionNumber,
    timestamp,
    date: timestamp.slice(0, 10),
    bpm: input.bpm,
    assessment: input.assessment,
    assistanceLevel: input.assistanceLevel || mission.assistanceTarget,
    conceptualTarget: Boolean(mission.conceptualTarget),
    executionTarget: Boolean(mission.executionTarget),
    musicalApplication: Boolean(mission.musicalApplication),
    issueTags: input.issueTags || [],
    pedagogyDomain: mission.pedagogyDomain,
  };

  writeAllEvidence([...all, record]);
  window.dispatchEvent(new CustomEvent('rudiment:c6-evidence-updated', { detail: { competencyId: mission.competencyId } }));
  return record;
}

export function getCurriculumEvidenceLedger(competencyId: string): CurriculumEvidenceLedger {
  const records = readAllEvidence().filter((record) => record.competencyId === competencyId);
  const success = (record: CurriculumMissionEvidenceRecord) =>
    record.assessment === 'CLEAN_AND_RELAXED' || record.assessment === 'MOSTLY_CLEAN';
  const clean = (record: CurriculumMissionEvidenceRecord) => record.assessment === 'CLEAN_AND_RELAXED';

  const guidedSuccesses = records.filter((record) => success(record) && record.assistanceLevel === 'FULL').length;
  const reducedSuccesses = records.filter((record) => success(record) && record.assistanceLevel === 'REDUCED').length;
  const independentCleanRuns = records.filter(
    (record) => clean(record) && (record.assistanceLevel === 'MINIMAL' || record.assistanceLevel === 'NONE')
  ).length;
  const conceptualDemonstrations = records.filter((record) => success(record) && record.conceptualTarget).length;
  const musicalApplications = records.filter((record) => success(record) && record.musicalApplication).length;
  const separateSessions = new Set(records.map((record) => record.sessionId)).size;
  const separateDays = new Set(records.map((record) => record.date)).size;
  const cleanTempos = records.filter(clean).map((record) => record.bpm);
  const highestCleanTempo = cleanTempos.length ? Math.max(...cleanTempos) : null;

  const competencyStub = { id: competencyId } as CurriculumCompetency;
  const profile = getCurriculumPedagogyProfile(competencyStub);
  const labels = profile.evidenceLabels;
  const readinessCriteria = [
    {
      label: labels[0],
      met: conceptualDemonstrations >= 1,
      detail: `${conceptualDemonstrations} demonstrated conceptual run${conceptualDemonstrations === 1 ? '' : 's'}`,
    },
    {
      label: labels[1],
      met: guidedSuccesses >= 1,
      detail: `${guidedSuccesses} controlled guided run${guidedSuccesses === 1 ? '' : 's'}`,
    },
    {
      label: labels[2],
      met: reducedSuccesses >= 1,
      detail: `${reducedSuccesses} controlled reduced-cue run${reducedSuccesses === 1 ? '' : 's'}`,
    },
    {
      label: labels[4],
      met: independentCleanRuns >= 2,
      detail: `${independentCleanRuns}/2 clean independent runs`,
    },
    {
      label: labels[5],
      met: musicalApplications >= 1,
      detail: `${musicalApplications} successful musical application${musicalApplications === 1 ? '' : 's'}`,
    },
    {
      label: 'Control repeated separately',
      met: separateSessions >= 2,
      detail: `${separateSessions}/2 separate practice sessions`,
    },
  ];

  return {
    competencyId,
    totalAttempts: records.length,
    guidedSuccesses,
    reducedSuccesses,
    independentCleanRuns,
    conceptualDemonstrations,
    musicalApplications,
    separateSessions,
    separateDays,
    highestCleanTempo,
    readiness: readinessCriteria.filter((criterion) => criterion.met).length,
    readinessCriteria,
    recentRecords: [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8),
  };
}

function personalizedDepth(band: CurriculumBand): 'FOUNDATION' | 'CONDENSED' | 'DIAGNOSTIC' {
  if (band === 'ADVANCED') return 'DIAGNOSTIC';
  if (band === 'INTERMEDIATE') return 'CONDENSED';
  return 'FOUNDATION';
}

function startTempoForBand(target: number, band: CurriculumBand): number {
  if (band === 'ADVANCED') return Math.max(40, Math.min(target, Math.round(target * 0.95)));
  if (band === 'INTERMEDIATE') return Math.max(40, Math.round(target * 0.9));
  return Math.max(40, Math.round(target * 0.8));
}

function mission(
  sessionId: string,
  competency: CurriculumCompetency,
  n: number,
  title: string,
  purpose: string,
  instructions: string,
  tempo: number,
  durationSeconds: number,
  stage: CurriculumMissionMetadata['stage'],
  assistance: AssistanceLevel,
  totalBars: number,
  phraseGroupSize: number,
  options: Partial<CurriculumMissionMetadata> = {},
): PracticeExercise {
  const metadata: CurriculumMissionMetadata = {
    competencyId: competency.id,
    missionId: `c6-${competency.id}-m${n}`,
    missionNumber: n,
    missionTitle: title,
    stage,
    assistanceTarget: assistance,
    conceptualTarget: options.conceptualTarget ?? true,
    executionTarget: options.executionTarget ?? true,
    musicalApplication: options.musicalApplication ?? false,
    patternDisplay: options.patternDisplay ?? 'BAR_STRUCTURE',
    requiredPatternLabel: options.requiredPatternLabel,
    structure: options.structure || {
      totalBars,
      phraseGroupSize,
      beatsPerBar: 4,
      highlightLandmarkBars: totalBars >= 16 ? [1, 5, 9, 13] : totalBars >= 8 ? [1, 5] : [1],
      showBarNumbers: true,
      showBeatNumbers: true,
    },
  };

  return {
    id: `${sessionId}-c6-m${n}`,
    title,
    phase: n === 1 ? 'FOUNDATION' : n >= 7 ? 'APPLICATION' : 'MAIN WORK',
    skillIds: [competency.skillId],
    purpose,
    whyThisExercise: purpose,
    pedagogicalRole: n >= 7 ? 'INDEPENDENCE TEST' : n === 1 ? 'PREPARATION' : 'PRIMARY TARGET',
    instructions,
    sticking: undefined,
    counting: competency.countingPattern,
    timeSignature: '4/4',
    subdivision: 'Quarter Notes',
    tempo,
    targetTempo: competency.tempoStandard.bpm,
    durationSeconds,
    exerciseType: n >= 5 ? 'application' : 'coordination',
    equipmentRequired: n >= 5 ? 'Full Drum Kit' : 'Either',
    difficulty: n >= 7 ? 'Challenging' : n >= 4 ? 'Moderate' : 'Easy',
    curriculumMission: metadata,
    progressionStage: n >= 5 ? 'TRANSFER' : n >= 3 ? 'APPLICATION' : 'FOUNDATION',
    challengeType: n >= 5 ? 'groove-phrase' : 'precision-mechanics',
    sessionSource: 'C7_CANONICAL_COMPETENCY',
    skillId: competency.skillId,
  };
}

export function buildC6CompetencySession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand
): PracticeSession {
  const sessionId = `c6-${competency.id}-${Date.now()}`;
  const target = competency.tempoStandard.bpm;
  const base = startTempoForBand(target, placementBand);
  const depth = personalizedDepth(placementBand);
  const equipment = profile.equipment === 'Practice Pad' ? 'Practice Pad' : 'Full Drum Kit';

  if (competency.id !== 'comp-meter-44') {
    throw new Error('C6 specialized journey is currently authored for Understanding 4/4 Bar Structure.');
  }

  const exercises: PracticeExercise[] = [
    mission(
      sessionId,
      competency,
      1,
      'Mission 1 — Feel One Bar',
      'Separate beat number from bar number and feel Beat 1 as the reset point.',
      'Play one relaxed quarter note on every beat. Count 1 2 3 4, then restart at 1 without adding or dropping a beat.',
      base,
      45,
      'UNDERSTAND',
      'FULL',
      2,
      1,
      { conceptualTarget: true, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      2,
      'Mission 2 — Hear the Barline',
      'Keep the pulse while hearing where one bar ends and the next begins.',
      'Continue quarter notes while listening for the stronger Bar-1 landmark. Say the beat numbers, but let the bar reset happen internally.',
      base,
      60,
      'INTERNALIZE',
      'FULL',
      4,
      1,
      { conceptualTarget: true, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      3,
      'Mission 3 — Four-Bar Phrase',
      'Track four complete bars without confusing beat count with bar count.',
      'Play four continuous bars. Know when Bar 1, Bar 2, Bar 3 and Bar 4 begin, then return confidently to Bar 1.',
      Math.min(target, base + 2),
      75,
      'HEAR',
      'FULL',
      4,
      4,
      { conceptualTarget: true, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      4,
      'Mission 4 — Eight-Bar Structure',
      'Own two groups of four bars while tutor support begins to fade.',
      'Play eight bars as 4 + 4. Track the midpoint at Bar 5 and return to the same relaxed pulse without relying on constant spoken bar numbers.',
      Math.min(target, base + 4),
      90,
      'FOLLOW',
      'REDUCED',
      8,
      4,
      { conceptualTarget: true, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      5,
      'Mission 5 — Section Awareness',
      'Connect bar counting to musical form instead of treating it as a counting exercise only.',
      'Keep a simple pulse through Intro 4 bars, Verse 8 bars, Chorus 8 bars and Outro 4 bars. Notice the section changes without stopping.',
      Math.min(target, base + 4),
      105,
      'FOLLOW',
      'REDUCED',
      24,
      4,
      {
        conceptualTarget: true,
        executionTarget: true,
        musicalApplication: true,
        structure: {
          totalBars: 24,
          phraseGroupSize: 4,
          beatsPerBar: 4,
          highlightLandmarkBars: [1, 5, 13, 21],
          showBarNumbers: true,
          showBeatNumbers: true,
          sections: [
            { label: 'Intro', startBar: 1, bars: 4 },
            { label: 'Verse', startBar: 5, bars: 8 },
            { label: 'Chorus', startBar: 13, bars: 8 },
            { label: 'Outro', startBar: 21, bars: 4 },
          ],
        },
      }
    ),
    mission(
      sessionId,
      competency,
      6,
      'Mission 6 — Reduced Guidance',
      'Hold the phrase when spoken bar numbers disappear.',
      'Play eight bars with the click and only subtle Bar-1 guidance. If you lose the form, recover at the next four-bar landmark rather than stopping.',
      Math.min(target, base + 6),
      90,
      'REDUCED',
      'REDUCED',
      8,
      4,
      { conceptualTarget: false, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      7,
      'Mission 7 — Independent Phrase Test',
      'Demonstrate 16-bar phrase ownership without tutor performance.',
      'Metronome only. Play 16 uninterrupted bars and know exactly when Bars 1, 5, 9 and 13 begin.',
      Math.min(target, base + 8),
      120,
      'INDEPENDENT',
      'NONE',
      16,
      4,
      { conceptualTarget: true, executionTarget: true }
    ),
    mission(
      sessionId,
      competency,
      8,
      'Mission 8 — Musical Transfer',
      'Carry 4/4 phrase awareness into a complete slow worship-style arrangement.',
      'Play a simple musical groove through the arrangement. Keep the form internally and recognize section boundaries without stopping.',
      target,
      120,
      'MUSICAL_APPLICATION',
      'NONE',
      24,
      4,
      {
        conceptualTarget: true,
        executionTarget: true,
        musicalApplication: true,
        structure: {
          totalBars: 24,
          phraseGroupSize: 4,
          beatsPerBar: 4,
          highlightLandmarkBars: [1, 5, 13, 21],
          showBarNumbers: true,
          showBeatNumbers: true,
          sections: [
            { label: 'Intro', startBar: 1, bars: 4 },
            { label: 'Verse', startBar: 5, bars: 8 },
            { label: 'Chorus', startBar: 13, bars: 8 },
            { label: 'Outro', startBar: 21, bars: 4 },
          ],
        },
      }
    ),
  ];

  // Intermediate and Advanced placement compresses explanation and begins closer
  // to the target tempo, but every canonical mission remains present and must be
  // evidenced independently before formal verification.
  return {
    id: sessionId,
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: placementBand === 'BEGINNER' ? 20 : 15,
    practiceContext: profile.practicePriority === 'Song / Performance Preparation' ? 'SONG_SERVICE_PREP' : profile.practicePriority === 'Balanced' ? 'BALANCED' : 'SKILL_DEVELOPMENT',
    equipment,
    focusMode: 'COACH_CHOOSES',
    selectedSkillIds: [competency.skillId],
    skillId: competency.skillId,
    focusTopic: `${competency.title} — C7 Canonical Learning Journey`,
    notes: `${placementBand} placement personalizes teaching depth only. Competency remains unverified until formal C4 verification passes.`,
    rating: 5,
    exercises,
    sessionStatus: 'NOT_STARTED',
    sessionSource: 'C7_CANONICAL_COMPETENCY',
    curriculumPractice: {
      competencyId: competency.id,
      placementBand,
      journeyVersion: 'C7',
      missionCount: exercises.length,
      personalizedDepth: depth,
    },
  };
}


function c7EquipmentFor(competency: CurriculumCompetency, profile: LearnerProfile): PracticeExercise['equipmentRequired'] {
  if (competency.supportedEquipment === 'Practice Pad') return 'Practice Pad';
  if (competency.supportedEquipment === 'Full Drum Kit') return 'Full Drum Kit';
  if (profile.equipment === 'Practice Pad') return 'Practice Pad';
  if (profile.equipment === 'Full Drum Kit') return 'Full Drum Kit';
  return 'Either';
}

function c7ExerciseType(domain: ReturnType<typeof getCurriculumPedagogyProfile>['domain'], musical: boolean): PracticeExercise['exerciseType'] {
  if (musical) return 'application';
  if (domain === 'RUDIMENT' || domain === 'PULSE_SUBDIVISION' || domain === 'READING') return 'technique';
  if (domain === 'FILL_TRANSITION') return 'fill';
  if (domain === 'GROOVE' || domain === 'STYLE' || domain === 'PERFORMANCE' || domain === 'DYNAMICS') return 'groove';
  return 'coordination';
}

function c7TimeSignature(competency: CurriculumCompetency): string {
  if (competency.id.includes('meter-68') || competency.id.includes('worship-68')) return '6/8';
  if (competency.id.includes('meter-34')) return '3/4';
  if (competency.id.includes('meter-54')) return '5/4';
  if (competency.id.includes('meter-78')) return '7/8';
  if (competency.id.includes('meter-128')) return '12/8';
  return '4/4';
}

function c7StructureFor(competency: CurriculumCompetency, bars: number) {
  const meter = c7TimeSignature(competency);
  const beatsPerBar = meter === '6/8' ? 6 : meter === '3/4' ? 3 : meter === '5/4' ? 5 : meter === '7/8' ? 7 : meter === '12/8' ? 12 : 4;
  return {
    totalBars: bars,
    phraseGroupSize: bars >= 8 ? 4 : Math.max(1, Math.min(4, bars)),
    beatsPerBar,
    highlightLandmarkBars: bars >= 16 ? [1, 5, 9, 13] : bars >= 8 ? [1, 5] : [1],
    showBarNumbers: true,
    showBeatNumbers: true,
  };
}

/**
 * C7 generalized curriculum journey.
 * C6.1's authored 4/4 structure journey is preserved exactly, while every
 * other canonical competency now receives a pedagogy-family-specific journey
 * instead of being routed through the old generic phrase-insertion session.
 */
export function buildC7CompetencySession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand
): PracticeSession {
  if (competency.id === 'comp-meter-44') {
    return buildC6CompetencySession(competency, profile, placementBand);
  }

  const sessionId = `c7-${competency.id}-${Date.now()}`;
  const target = competency.tempoStandard.bpm;
  const base = startTempoForBand(target, placementBand);
  const depth = personalizedDepth(placementBand);
  const pedagogy = getCurriculumPedagogyProfile(competency);
  const equipment = c7EquipmentFor(competency, profile);
  const missionCount = placementBand === 'ADVANCED' ? 6 : 6;
  const stages: CurriculumMissionMetadata['stage'][] = ['UNDERSTAND', 'INTERNALIZE', 'HEAR', 'FOLLOW', 'INDEPENDENT', 'MUSICAL_APPLICATION'];
  const assistance: AssistanceLevel[] = ['FULL', 'FULL', 'FULL', 'REDUCED', 'NONE', 'NONE'];
  // C7.4: the structural visualizer must describe the material the learner is
  // actually reading/playing. Reading missions deliberately progress through
  // 1, 1, 2, 2, 4 and 4 authored notation bars (see notationProgression.ts),
  // while the other pedagogy families keep the broader phrase-length ladder.
  // Keeping these values aligned prevents the UI from claiming an 8/16-bar
  // phrase while the staff and master transport are only presenting 2/4 bars.
  const bars = pedagogy.domain === 'READING'
    ? [1, 1, 2, 2, 4, 4]
    : [2, 4, 4, 8, 8, 16];
  const tempoOffsets = [0, 0, 2, 4, 6, target - base];

  const exercises: PracticeExercise[] = Array.from({ length: missionCount }, (_, index) => {
    const n = index + 1;
    const musical = n === 6;
    const independent = n === 5;
    const bpm = musical ? target : Math.min(target, base + Math.max(0, tempoOffsets[index]));
    const isReading = pedagogy.domain === 'READING';
    const readingPurposes = [
      'Identify the written drum voices and staff positions before playing.',
      'Count the written rhythm from left to right while keeping your eyes on the staff.',
      'Connect the moving written note positions to the exact sounds they represent.',
      'Read and play the written bar with tutor support while staying visually anchored to the staff.',
      'Sight-read the written bar independently with metronome only.',
      'Read a short drum chart in musical time without replacing notation with a memorized sticking.',
    ];
    const readingInstructions = [
      'Study the staff legend first: closed hi-hat uses an x-shaped notehead above the staff, snare sits in the middle area, and kick sits low. Name each written voice before you play.',
      `Count ${competency.tempoStandard.subdivision.toLowerCase().includes('8') ? '1 & 2 & 3 & 4 &' : competency.countingPattern} aloud while tracking the written noteheads from left to right. The staff, not an R/L mnemonic, is the source of truth.`,
      'Watch the playhead cross the notation and listen for the exact written voices. Notice simultaneous notes and any silent spaces.',
      'Follow the staff with reduced cues. Keep reading ahead by one note position so your eyes lead your limbs rather than chase them.',
      `Metronome only. Sight-read the displayed bar for ${competency.durationCriterion}. If you lose your place, stop and restart from the written beginning rather than from memory.`,
      `${competency.musicalApplicationRequirement}. Read continuously through the displayed phrase and preserve pulse, written voices and rests.`,
    ];

    const purpose = isReading
      ? readingPurposes[index]
      : n === 1
        ? pedagogy.conceptualFocus
        : n === 2
          ? `Internalize the count: ${competency.countingPattern}.`
          : n === 3
            ? pedagogy.listeningFocus
            : n === 4
              ? `Execute ${competency.title} with reduced tutor dependence.`
              : n === 5
                ? `Demonstrate ${competency.title} without tutor performance.`
                : pedagogy.musicalTransfer;
    const instructions = isReading
      ? readingInstructions[index]
      : n === 1
        ? `${competency.description} Work below verification tempo and prioritize understanding over speed.`
        : n === 2
          ? `Count ${competency.countingPattern} aloud while executing ${competency.stickingPattern}. Keep the pulse relaxed.`
          : n === 3
            ? `Listen to the coach model and identify: ${pedagogy.listeningFocus}`
            : n === 4
              ? `Follow the required pattern with reduced cues. Pattern: ${competency.stickingPattern}. Do not increase tempo if control changes.`
              : n === 5
                ? `Metronome only. Sustain the target pattern for ${competency.durationCriterion}. Stop and grade honestly if timing or mechanics break down.`
                : `${competency.musicalApplicationRequirement}. ${pedagogy.musicalTransfer}`;

    const metadata: CurriculumMissionMetadata = {
      competencyId: competency.id,
      missionId: `c7-${competency.id}-m${n}`,
      missionNumber: n,
      missionTitle: `Mission ${n} — ${pedagogy.missionLabels[index]}`,
      stage: stages[index],
      assistanceTarget: assistance[index],
      conceptualTarget: n <= 3,
      executionTarget: n >= 2,
      musicalApplication: musical,
      patternDisplay: pedagogy.patternDisplay,
      requiredPatternLabel: pedagogy.patternDisplay === 'NONE' || pedagogy.patternDisplay === 'BAR_STRUCTURE' || pedagogy.patternDisplay === 'NOTATION' ? undefined : competency.stickingPattern,
      pedagogyDomain: pedagogy.domain,
      structure: c7StructureFor(competency, bars[index]),
    };

    return {
      id: `${sessionId}-m${n}`,
      title: metadata.missionTitle,
      phase: n === 1 ? 'FOUNDATION' : musical ? 'APPLICATION' : 'MAIN WORK',
      skillIds: [competency.skillId],
      purpose,
      whyThisExercise: purpose,
      pedagogicalRole: independent ? 'INDEPENDENCE TEST' : n === 1 ? 'PREPARATION' : 'PRIMARY TARGET',
      instructions,
      sticking: pedagogy.patternDisplay === 'NONE' || pedagogy.patternDisplay === 'BAR_STRUCTURE' || pedagogy.patternDisplay === 'NOTATION' ? undefined : competency.stickingPattern,
      counting: competency.countingPattern,
      timeSignature: c7TimeSignature(competency),
      subdivision: competency.subdivision,
      tempo: bpm,
      targetTempo: target,
      durationSeconds: n <= 2 ? 45 : n <= 4 ? 60 : 90,
      exerciseType: c7ExerciseType(pedagogy.domain, musical),
      equipmentRequired: equipment,
      difficulty: independent || musical ? 'Challenging' : n >= 3 ? 'Moderate' : 'Easy',
      curriculumMission: metadata,
      progressionStage: musical ? 'TRANSFER' : n >= 3 ? 'APPLICATION' : 'FOUNDATION',
      challengeType: musical ? 'groove-phrase' : 'precision-mechanics',
      sessionSource: 'C7_CANONICAL_COMPETENCY',
      skillId: competency.skillId,
    };
  });

  return {
    id: sessionId,
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: placementBand === 'BEGINNER' ? 18 : 14,
    practiceContext: profile.practicePriority === 'Song / Performance Preparation' ? 'SONG_SERVICE_PREP' : profile.practicePriority === 'Balanced' ? 'BALANCED' : 'SKILL_DEVELOPMENT',
    equipment: profile.equipment === 'Practice Pad' ? 'Practice Pad' : 'Full Drum Kit',
    focusMode: 'COACH_CHOOSES',
    selectedSkillIds: [competency.skillId],
    skillId: competency.skillId,
    focusTopic: `${competency.title} — C7 ${pedagogy.domain.replace(/_/g, ' ')} Journey`,
    notes: `${placementBand} placement adjusts teaching depth and starting tempo only. ${pedagogy.domain} pedagogy and evidence remain competency-specific.`,
    rating: 5,
    exercises,
    sessionStatus: 'NOT_STARTED',
    sessionSource: 'C7_CANONICAL_COMPETENCY',
    curriculumPractice: {
      competencyId: competency.id,
      placementBand,
      journeyVersion: 'C7',
      missionCount: exercises.length,
      personalizedDepth: depth,
    },
  };
}
