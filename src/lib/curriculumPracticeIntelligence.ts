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

  const readinessCriteria = [
    {
      label: 'Concept understood',
      met: conceptualDemonstrations >= 1,
      detail: `${conceptualDemonstrations} demonstrated conceptual run${conceptualDemonstrations === 1 ? '' : 's'}`,
    },
    {
      label: 'Guided execution',
      met: guidedSuccesses >= 1,
      detail: `${guidedSuccesses} controlled Full Tutor run${guidedSuccesses === 1 ? '' : 's'}`,
    },
    {
      label: 'Reduced execution',
      met: reducedSuccesses >= 1,
      detail: `${reducedSuccesses} controlled Reduced Tutor run${reducedSuccesses === 1 ? '' : 's'}`,
    },
    {
      label: 'Independent clean execution',
      met: independentCleanRuns >= 2,
      detail: `${independentCleanRuns}/2 clean independent runs`,
    },
    {
      label: 'Musical application',
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
    sessionSource: 'C6_CANONICAL_COMPETENCY',
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
    focusTopic: `${competency.title} — C6 Canonical Learning Journey`,
    notes: `${placementBand} placement personalizes teaching depth only. Competency remains unverified until formal C4 verification passes.`,
    rating: 5,
    exercises,
    sessionStatus: 'NOT_STARTED',
    sessionSource: 'C6_CANONICAL_COMPETENCY',
    curriculumPractice: {
      competencyId: competency.id,
      placementBand,
      journeyVersion: 'C6',
      missionCount: exercises.length,
      personalizedDepth: depth,
    },
  };
}
