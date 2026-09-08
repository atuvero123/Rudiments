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
import { CURRICULUM_COMPETENCIES_BY_ID } from '../data/canonicalCurriculum';
import { getAttemptsForSkill } from './evidenceEngine';

const C6_EVIDENCE_KEY = 'RUDIMENT_C6_CURRICULUM_EVIDENCE_V1';

// C7.6 shared migration boundary. Notation evidence created before the corrected
// C7.4 staff/transport build must not be promoted into canonical readiness.
export const C7_NOTATION_VALID_EVIDENCE_SINCE = Date.parse('2026-09-07T19:29:00Z');

// C7.13 groove-integrity boundary. Earlier Groove Stability Mission 5/6 runs
// used an 8/16-bar curriculum visualizer over a shorter generic transport loop,
// and the musical-transfer mission had no real section/dynamic responsibility.
// Preserve the learner's conceptual/guided evidence, but require fresh
// independent + musical-transfer evidence on the corrected long-form transport.
export const C7_GROOVE_STABILITY_VALID_TRANSFER_SINCE = Date.parse('2026-09-08T09:00:00Z');

function isC7IntegrityValid(competencyId: string, missionNumber: number, timestamp: string): boolean {
  if (competencyId === 'comp-grv-stability' && missionNumber >= 5) {
    return new Date(timestamp).getTime() >= C7_GROOVE_STABILITY_VALID_TRANSFER_SINCE;
  }
  return true;
}

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

function missionNumberFromExerciseId(exerciseId: string): number | null {
  const match = (exerciseId || '').match(/(?:-c6)?-m(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function inferredCanonicalAssistance(competencyId: string, missionNumber: number): AssistanceLevel {
  if (competencyId === 'comp-meter-44') {
    if (missionNumber <= 3) return 'FULL';
    if (missionNumber <= 6) return 'REDUCED';
    return 'NONE';
  }
  if (missionNumber <= 3) return 'FULL';
  if (missionNumber === 4) return 'REDUCED';
  return 'NONE';
}

function canonicalMissionFlags(competencyId: string, missionNumber: number) {
  if (competencyId === 'comp-meter-44') {
    return {
      conceptualTarget: missionNumber !== 6,
      executionTarget: true,
      musicalApplication: missionNumber === 5 || missionNumber === 8,
    };
  }
  return {
    conceptualTarget: missionNumber <= 3,
    executionTarget: missionNumber >= 2,
    musicalApplication: missionNumber === 6,
  };
}

function assessmentFromPracticeAttempt(
  assessment: ReturnType<typeof getAttemptsForSkill>[number]['assessment']
): SelfCheckFeeling {
  if (assessment === 'clean_relaxed') return 'CLEAN_AND_RELAXED';
  if (assessment === 'mostly_clean') return 'MOSTLY_CLEAN';
  if (assessment === 'inconsistent') return 'INCONSISTENT';
  return 'TOO_DIFFICULT';
}

function isCanonicalExerciseForCompetency(competencyId: string, exerciseId: string): boolean {
  const id = exerciseId || '';
  return id.startsWith(`c6-${competencyId}-`) || id.startsWith(`c7-${competencyId}-`);
}

/**
 * Returns the canonical curriculum evidence stream for one competency.
 *
 * C7.6 also reconstructs valid C6/C7 mission evidence from the generic attempt
 * store when an older build recorded the practice attempt but did not yet write
 * the dedicated curriculum ledger. Direct curriculum records always win, so the
 * reconstruction never double-counts the same mission in the same session.
 */
export function getCurriculumEvidenceRecords(competencyId: string): CurriculumMissionEvidenceRecord[] {
  const direct = readAllEvidence()
    .filter((record) => record.competencyId === competencyId)
    .filter((record) =>
      competencyId !== 'comp-reading-notation' ||
      new Date(record.timestamp).getTime() >= C7_NOTATION_VALID_EVIDENCE_SINCE
    )
    .filter((record) => isC7IntegrityValid(competencyId, record.missionNumber, record.timestamp));
  const competency = CURRICULUM_COMPETENCIES_BY_ID.get(competencyId);
  if (!competency) return direct;

  const directMissionKeys = new Set(
    direct.map((record) => `${record.sessionId}:${record.missionNumber}`)
  );
  const pedagogy = getCurriculumPedagogyProfile(competency);

  const reconstructed = getAttemptsForSkill(competency.skillId)
    .filter((attempt) => isCanonicalExerciseForCompetency(competencyId, attempt.exerciseId))
    .filter((attempt) =>
      competencyId !== 'comp-reading-notation' ||
      new Date(attempt.timestamp).getTime() >= C7_NOTATION_VALID_EVIDENCE_SINCE
    )
    .flatMap((attempt): CurriculumMissionEvidenceRecord[] => {
      const missionNumber = missionNumberFromExerciseId(attempt.exerciseId);
      if (!missionNumber) return [];
      if (!isC7IntegrityValid(competencyId, missionNumber, attempt.timestamp)) return [];

      const missionKey = `${attempt.sessionId}:${missionNumber}`;
      if (directMissionKeys.has(missionKey)) return [];

      const flags = canonicalMissionFlags(competencyId, missionNumber);
      const assistanceLevel =
        attempt.assistanceLevel || inferredCanonicalAssistance(competencyId, missionNumber);

      return [{
        id: `c7-migrated-${attempt.id}`,
        runId: `legacy-attempt:${attempt.id}`,
        sessionId: attempt.sessionId,
        competencyId,
        missionId: `${competencyId === 'comp-meter-44' ? 'c6' : 'c7'}-${competencyId}-m${missionNumber}`,
        missionNumber,
        timestamp: attempt.timestamp,
        date: attempt.timestamp.slice(0, 10),
        bpm: attempt.bpm,
        assessment: assessmentFromPracticeAttempt(attempt.assessment),
        assistanceLevel,
        conceptualTarget: flags.conceptualTarget,
        executionTarget: flags.executionTarget,
        musicalApplication: flags.musicalApplication,
        issueTags: attempt.frictions || [],
        pedagogyDomain: pedagogy.domain,
      }];
    });

  return [...direct, ...reconstructed].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getCurriculumEvidenceLedger(competencyId: string): CurriculumEvidenceLedger {
  const records = getCurriculumEvidenceRecords(competencyId);
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
      label: 'Learning revisited separately',
      met: separateSessions >= 2,
      detail: `${separateSessions}/2 separate curriculum sessions (coverage only; C4 still requires separate qualifying independent sessions)`,
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

function c7StructureFor(
  competency: CurriculumCompetency,
  bars: number,
  domain?: ReturnType<typeof getCurriculumPedagogyProfile>['domain'],
  missionNumber?: number
) {
  const meter = c7TimeSignature(competency);
  const beatsPerBar = meter === '6/8' ? 6 : meter === '3/4' ? 3 : meter === '5/4' ? 5 : meter === '7/8' ? 7 : meter === '12/8' ? 12 : 4;
  const base = {
    totalBars: bars,
    phraseGroupSize: bars >= 8 ? 4 : Math.max(1, Math.min(4, bars)),
    beatsPerBar,
    highlightLandmarkBars: bars >= 16 ? [1, 5, 9, 13] : bars >= 8 ? [1, 5] : [1],
    showBarNumbers: true,
    showBeatNumbers: true,
  };

  // C7.13: the final groove transfer mission must be a real musical form, not
  // another static two-bar loop carrying a "Serve the Song" label. Give the
  // 16-bar journey explicit section/dynamic responsibilities so the learner has
  // something musical to respond to while preserving identical tempo/pocket.
  if (domain === 'GROOVE' && missionNumber === 6 && bars >= 16) {
    return {
      ...base,
      sections: [
        { label: 'VERSE', startBar: 1, bars: 4, intensity: 'SOFT' as const, performanceCue: 'Keep the hi-hat controlled and the backbeat firm but restrained.' },
        { label: 'CHORUS', startBar: 5, bars: 4, intensity: 'STRONG' as const, performanceCue: 'Lift the energy and backbeat without speeding up or changing the groove.' },
        { label: 'VERSE RETURN', startBar: 9, bars: 4, intensity: 'SOFT' as const, performanceCue: 'Bring the volume back down while keeping the same internal pulse.' },
        { label: 'FINAL CHORUS', startBar: 13, bars: 4, intensity: 'STRONG' as const, performanceCue: 'Lift again, stay relaxed, and finish Bar 16 without rushing.' },
      ],
    };
  }

  // C7.16: Musical Balance & Cymbal Sensitivity owns an 8-bar certification
  // standard. Its transfer mission therefore uses a real 8-bar verse/chorus
  // dynamic form instead of borrowing the generic 16-bar journey.
  if (domain === 'DYNAMICS' && competency.id === 'comp-dyn-song-balance' && missionNumber === 6 && bars >= 8) {
    return {
      ...base,
      sections: [
        { label: 'VERSE', startBar: 1, bars: 4, intensity: 'SOFT' as const, performanceCue: 'Keep closed hi-hat medium-soft. Let kick and snare remain clearly above it without changing tempo.' },
        { label: 'CHORUS', startBar: 5, bars: 4, intensity: 'STRONG' as const, performanceCue: 'Lift the kick/snare intent one level while keeping cymbals controlled. Energy rises; cymbal wash does not.' },
      ],
    };
  }

  return base;
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
    : pedagogy.domain === 'GROOVE'
    ? [2, 4, 4, 8, 16, 16]
    : competency.id === 'comp-dyn-song-balance'
    ? [2, 4, 4, 8, 8, 8]
    : [2, 4, 4, 8, 8, 16];
  const tempoOffsets = [0, 0, 2, 4, 6, target - base];

  const exercises: PracticeExercise[] = Array.from({ length: missionCount }, (_, index) => {
    const n = index + 1;
    const musical = n === 6;
    const independent = n === 5;
    const bpm = musical ? target : Math.min(target, base + Math.max(0, tempoOffsets[index]));
    const isReading = pedagogy.domain === 'READING';
    const isGrooveSongTransfer = pedagogy.domain === 'GROOVE' && musical;
    const isMusicalBalance = competency.id === 'comp-dyn-song-balance';
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
    const musicalBalancePurposes = [
      'Build the volume hierarchy before worrying about louder playing: cymbal underneath, kick and snare clearly on top.',
      'Keep the 1-&-2-&-3-&-4-& grid unchanged while each limb keeps its assigned dynamic role.',
      'Hear the difference between a balanced kit and cymbal wash: kick/snare stay clear while hi-hat supports rather than dominates.',
      'Follow the balanced groove with reduced tutor bars and preserve the same sound hierarchy in your response bars.',
      'Play the complete 8-bar balance standard independently with metronome only.',
      'Shape a real 8-bar Verse → Chorus form: raise musical energy without allowing cymbal volume or tempo to run away.',
    ];
    const musicalBalanceInstructions = [
      'Use closed hi-hat 8ths at medium-soft volume, firm snare on 2 and 4, and punchy kick on 1 and 3. First hear and feel which voice should sit in front and which should sit behind.',
      'Count “1 & 2 & 3 & 4 &” aloud. Keep the hi-hat low and even on every syllable while kick/snare accents land without pulling the count forward.',
      'Listen to the coach model for the mix, not just the notes. Ask: Can I hear every backbeat and kick clearly? Does the hi-hat stay supportive instead of becoming the loudest continuous sound?',
      'Use Reduced Follow. Match the tutor bar, then reproduce the same volume hierarchy in your own bar. If your right hand swells when the snare hits, lower the hi-hat immediately rather than slowing down.',
      'Metronome only. Play all 8 bars at the governed working tempo: soft closed hi-hat 8ths, firm snare 2/4, punchy kick 1/3. Stop and grade honestly if cymbal wash, buried backbeat, or tempo change appears.',
      'Bars 1–4 VERSE: controlled hats with clear but restrained kick/snare. Bars 5–8 CHORUS: lift kick/snare intent while hats remain underneath. Keep exactly the same 1-&-2-&-3-&-4-& pulse from Bar 1 through Bar 8.',
    ];

    const purpose = isReading
      ? readingPurposes[index]
      : isMusicalBalance
        ? musicalBalancePurposes[index]
      : isGrooveSongTransfer
        ? 'Serve a complete 16-bar Verse → Chorus → Verse → Chorus form by changing dynamics without changing tempo or pocket.'
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
      : isMusicalBalance
        ? musicalBalanceInstructions[index]
      : isGrooveSongTransfer
        ? `Metronome only. Play the full 16-bar form: Bars 1–4 VERSE (controlled), 5–8 CHORUS (lift), 9–12 VERSE RETURN (settle), 13–16 FINAL CHORUS (lift again). Keep the exact same groove and tempo throughout; only the musical energy changes. ${competency.musicalApplicationRequirement}.`
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
      structure: c7StructureFor(competency, bars[index], pedagogy.domain, n),
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


/**
 * C7.13 — Groove Stability long-form integrity continuation.
 *
 * The learner may already have completed Missions 1–4 before the transport
 * length / song-form correction landed. Preserve those valid conceptual,
 * listening and reduced-guidance records. Only Mission 5 (real 16-bar
 * independent endurance) and Mission 6 (real 16-bar section-aware transfer)
 * need to be repeated on the corrected transport.
 */
export function needsC7GrooveIntegrityContinuation(competencyId: string): boolean {
  if (competencyId !== 'comp-grv-stability') return false;
  const records = getCurriculumEvidenceRecords(competencyId);
  const success = (record: CurriculumMissionEvidenceRecord) =>
    record.assessment === 'CLEAN_AND_RELAXED' || record.assessment === 'MOSTLY_CLEAN';
  const hasMission = (missionNumber: number) =>
    records.some((record) => record.missionNumber === missionNumber && success(record));
  const earlierJourneyComplete = [1, 2, 3, 4].every(hasMission);
  const correctedLongFormComplete = [5, 6].every(hasMission);
  return earlierJourneyComplete && !correctedLongFormComplete;
}

export function buildC7GrooveIntegrityContinuationSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand
): PracticeSession {
  const fullSession = buildC7CompetencySession(competency, profile, placementBand);
  const records = getCurriculumEvidenceRecords(competency.id);
  const success = (record: CurriculumMissionEvidenceRecord) =>
    record.assessment === 'CLEAN_AND_RELAXED' || record.assessment === 'MOSTLY_CLEAN';
  const hasMission = (missionNumber: number) =>
    records.some((record) => record.missionNumber === missionNumber && success(record));
  const missingMissionNumbers = [5, 6].filter((missionNumber) => !hasMission(missionNumber));
  const sessionId = `c7-13-groove-integrity-${competency.id}-${Date.now()}`;
  const exercises = fullSession.exercises
    .filter((exercise) => missingMissionNumbers.includes(exercise.curriculumMission?.missionNumber || 0))
    .map((exercise) => ({
      ...exercise,
      id: `${sessionId}-m${exercise.curriculumMission?.missionNumber || 0}`,
    }));

  return {
    ...fullSession,
    id: sessionId,
    durationMinutes: exercises.length <= 1 ? 8 : 14,
    focusTopic: `${competency.title} — Corrected Long-Form Continuation`,
    notes: 'C7.13 integrity continuation: Missions 1–4 remain banked. Complete only the missing corrected 16-bar independent/song-form work; prior learning evidence is preserved.',
    exercises,
    curriculumPractice: {
      ...fullSession.curriculumPractice!,
      missionCount: exercises.length,
    },
  };
}

/**
 * C7.9 — Targeted second-session revisit.
 *
 * When the learner has already evidenced every learning dimension except the
 * required separate-session revisit, repeating the full teaching journey is
 * unnecessary. This creates a fresh governed session containing only the
 * independent and musical-transfer missions. A clean independent result in
 * this new session can simultaneously satisfy C7's separate-session coverage
 * and C4's separate qualifying independent-session requirement.
 */
export function buildC7SecondSessionRevisitSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand
): PracticeSession {
  const fullSession = buildC7CompetencySession(competency, profile, placementBand);
  const revisitExercises = (fullSession.exercises || [])
    .filter((exercise) => {
      const assistance = exercise.curriculumMission?.assistanceTarget;
      return assistance === 'NONE' || assistance === 'MINIMAL';
    })
    .map((exercise) => ({
      ...exercise,
      tempo: competency.tempoStandard.bpm,
      targetTempo: competency.tempoStandard.bpm,
      durationSeconds: Math.max(60, exercise.durationSeconds || 60),
    }));

  if (revisitExercises.length === 0) return fullSession;

  return {
    ...fullSession,
    durationMinutes: Math.max(6, revisitExercises.length * 4),
    focusTopic: `${competency.title} — Separate-Session Revisit`,
    notes: `C7.9 targeted revisit: prior learning evidence is preserved. This fresh session repeats only genuine independent and musical-transfer work so separate-session evidence can be earned without redoing the full teaching journey.`,
    exercises: revisitExercises,
    curriculumPractice: fullSession.curriculumPractice
      ? { ...fullSession.curriculumPractice, missionCount: revisitExercises.length }
      : undefined,
  };
}

/**
 * C7.7 — Short verification-stabilization session.
 *
 * Once the learner has already covered all six curriculum evidence dimensions,
 * repeating the whole teaching journey is wasteful and can encourage stage
 * bypassing. This continuation keeps only the canonical no-assistance missions
 * (independent execution + musical transfer) and runs them at the formal target
 * tempo, creating a fresh session boundary for C4's separate-session criterion.
 */
export function buildC7VerificationStabilizationSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand
): PracticeSession {
  const fullSession = buildC7CompetencySession(competency, profile, placementBand);
  const independentExercises = (fullSession.exercises || [])
    .filter((exercise) => {
      const assistance = exercise.curriculumMission?.assistanceTarget;
      return assistance === 'NONE' || assistance === 'MINIMAL';
    })
    .map((exercise) => ({
      ...exercise,
      tempo: competency.tempoStandard.bpm,
      targetTempo: competency.tempoStandard.bpm,
      durationSeconds: Math.max(60, exercise.durationSeconds || 60),
    }));

  // Defensive fallback: if a future competency journey has no explicit NONE /
  // MINIMAL stage, preserve the original session rather than returning an empty one.
  if (independentExercises.length === 0) return fullSession;

  return {
    ...fullSession,
    durationMinutes: Math.max(6, independentExercises.length * 4),
    focusTopic: `${competency.title} — Verification Stabilization`,
    notes: `C7.7 targeted continuation: curriculum coverage is already complete, so this session repeats only genuine independent and musical-transfer evidence at the formal standard.`,
    exercises: independentExercises,
    curriculumPractice: fullSession.curriculumPractice
      ? { ...fullSession.curriculumPractice, missionCount: independentExercises.length }
      : undefined,
  };
}



/**
 * C7.11 — Protocol revalidation session for competencies whose historical C4
 * checkpoint was invalidated by verifier-v2.
 *
 * These learners already completed the older competency journey. We preserve
 * that history and ask only for fresh no-assistance evidence on the corrected
 * clock before exposing the new formal verification. This prevents a protocol
 * migration from forcing a full six-mission relearn.
 */
export function buildC7ProtocolRevalidationSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand,
  workingBpm?: number | null
): PracticeSession {
  const fullSession = buildC7CompetencySession(competency, profile, placementBand);
  const target = competency.tempoStandard.bpm;
  const safeBpm = Math.max(
    30,
    Math.min(target, workingBpm && Number.isFinite(workingBpm) ? Math.round(workingBpm) : Math.round(target * 0.9))
  );

  const independentExercises = (fullSession.exercises || [])
    .filter((exercise) => {
      const assistance = exercise.curriculumMission?.assistanceTarget;
      return assistance === 'NONE' || assistance === 'MINIMAL';
    })
    .map((exercise) => ({
      ...exercise,
      tempo: safeBpm,
      targetTempo: target,
      durationSeconds: Math.max(60, exercise.durationSeconds || 60),
    }));

  if (independentExercises.length === 0) return fullSession;

  return {
    ...fullSession,
    durationMinutes: Math.max(6, independentExercises.length * 4),
    focusTopic: `${competency.title} — Corrected-Clock Revalidation`,
    notes: `C7.11 protocol migration: earlier learning and practice history are preserved. The old formal checkpoint used the pre-v2 verifier, so this short session collects fresh no-assistance evidence on the corrected clock without repeating the full curriculum journey.`,
    exercises: independentExercises,
    curriculumPractice: fullSession.curriculumPractice
      ? { ...fullSession.curriculumPractice, missionCount: independentExercises.length }
      : undefined,
  };
}

/**
 * C7.12 — Targeted formal-verification repair.
 *
 * A failed formal C4 verification must not restart the six-mission curriculum
 * journey when the learner already has complete C7 coverage. This repair keeps
 * only the genuine no-assistance end stages, lowers the tempo into the readiness
 * neighbourhood, and marks the exercises as remediation evidence so the active
 * verification repair plan can be cleared by successful work.
 */
export function buildC7VerificationRepairSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand,
  workingBpm?: number | null
): PracticeSession {
  const fullSession = buildC7CompetencySession(competency, profile, placementBand);
  const target = competency.tempoStandard.bpm;
  const readinessFloor = Math.max(30, Math.round(target * 0.85));
  const defaultRepairBpm = Math.max(readinessFloor, Math.round(target * 0.9));
  const observedWorkingBpm = workingBpm && Number.isFinite(workingBpm)
    ? Math.round(workingBpm)
    : defaultRepairBpm;
  const repairBpm = Math.max(
    readinessFloor,
    Math.min(defaultRepairBpm, observedWorkingBpm)
  );

  const repairExercises = (fullSession.exercises || [])
    .filter((exercise) => {
      const assistance = exercise.curriculumMission?.assistanceTarget;
      return assistance === 'NONE' || assistance === 'MINIMAL';
    })
    .map((exercise) => ({
      ...exercise,
      tempo: repairBpm,
      targetTempo: target,
      durationSeconds: Math.max(60, exercise.durationSeconds || 60),
      isGapClosure: true,
      countsTowardRemediation: true,
      sessionSource: 'gap-closure',
      gapClosureReason: 'Targeted repair after a formal verification attempt did not pass.',
      gapClosureSuccessTarget: `Complete this no-assistance run Clean & Relaxed at ${repairBpm} BPM before retesting.`,
    }));

  if (repairExercises.length === 0) return fullSession;

  return {
    ...fullSession,
    durationMinutes: Math.max(6, repairExercises.length * 4),
    focusTopic: `${competency.title} — Verification Repair`,
    notes: `C7.12 targeted repair: the curriculum journey is already complete. This session repeats only genuine no-assistance evidence at a relaxed near-target tempo before the next formal verification attempt.`,
    exercises: repairExercises,
    sessionStatus: 'NOT_STARTED',
    sessionSource: 'gap-closure',
    isGapClosure: true,
    curriculumPractice: fullSession.curriculumPractice
      ? { ...fullSession.curriculumPractice, missionCount: repairExercises.length }
      : undefined,
  };
}

