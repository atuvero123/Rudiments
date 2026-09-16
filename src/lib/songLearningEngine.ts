import {
  AssistanceLevel,
  CurriculumBand,
  CurriculumCompetency,
  CurriculumMissionMetadata,
  CurriculumMissionStage,
  CurriculumStructureSection,
  LearnerProfile,
  PracticeExercise,
  PracticeSession,
  SongLearningStageConfig,
  SongLearningStageKind,
} from '../types';
import {
  PLAY_ALONG_TRACKS,
  PlayAlongSection,
  PlayAlongTrack,
} from '../data/playAlongTracks';
import { getTotalPlayAlongBars } from './playAlongEngine';

export const C11_SONG_LEARNING_EVIDENCE_VERSION = 'C11_SONG_PLAY_ALONG_V1';
export const C11_CANONICAL_SONG_TRACK_ID = 'pa-canonical-performance-80';

export interface C11SongStageBlueprint {
  title: string;
  kind: SongLearningStageKind;
  sectionIds: string[];
  purpose: string;
  instructions: string;
  primaryGoal: string;
  sectionGoal?: string;
  transitionGoal?: string;
  tutorBars: number;
  learnerBars: number;
  backingMode: SongLearningStageConfig['backingMode'];
  clickEnabled: boolean;
  spokenCues: boolean;
  tutorDrumsEnabled: boolean;
  assistance: AssistanceLevel;
  missionStage: CurriculumMissionStage;
  conceptual?: boolean;
  musicalApplication?: boolean;
  targetBpm: number;
  loopCount?: number;
  transitionFocus?: SongLearningStageConfig['transitionFocus'];
  fillTeachingMode?: SongLearningStageConfig['fillTeachingMode'];
  expectedSkills?: string[];
  cueText?: string;
}

function trackById(trackId: string): PlayAlongTrack {
  return PLAY_ALONG_TRACKS.find((track) => track.id === trackId) || PLAY_ALONG_TRACKS[0];
}

function sectionIds(track: PlayAlongTrack): string[] {
  return track.sections.map((section) => section.id);
}

function sectionBars(track: PlayAlongTrack, ids: string[]): number {
  const wanted = new Set(ids);
  return track.sections
    .filter((section) => wanted.has(section.id))
    .reduce((total, section) => total + section.bars, 0);
}

function focusedTransitionBarCount(focus?: SongLearningStageConfig['transitionFocus']): number | null {
  if (!focus) return null;
  const repetitions = Math.max(1, Math.floor(focus.repetitions || 1));
  return Math.max(1, Math.floor(focus.leadInBars || 1)) * repetitions
    + Math.max(1, Math.floor(focus.landingBars || 1)) * repetitions;
}

function stageDurationSeconds(
  track: PlayAlongTrack,
  ids: string[],
  loopCount = 1,
  focus?: SongLearningStageConfig['transitionFocus']
): number {
  const bars = Math.max(1, focusedTransitionBarCount(focus) || sectionBars(track, ids));
  const beatsPerBar = track.meter === '6/8' ? 2 : 4;
  return Math.max(20, Math.round(bars * beatsPerBar * (60 / track.bpm) * Math.max(1, loopCount)));
}

function structureForStage(
  track: PlayAlongTrack,
  ids: string[],
  focus?: SongLearningStageConfig['transitionFocus']
): CurriculumMissionMetadata['structure'] {
  let startBar = 1;
  const sections: CurriculumStructureSection[] = [];

  if (focus) {
    const from = track.sections.find((section) => section.id === focus.fromSectionId);
    const to = track.sections.find((section) => section.id === focus.toSectionId);
    if (from && to) {
      const leadInBars = Math.max(1, Math.min(from.bars, Math.floor(focus.leadInBars || 1)));
      const landingBars = Math.max(1, Math.min(to.bars, Math.floor(focus.landingBars || 1)));
      const repetitions = Math.max(1, Math.floor(focus.repetitions || 1));
      for (let repetition = 0; repetition < repetitions; repetition += 1) {
        const role = repetitions > 1 ? (repetition === 0 ? 'TUTOR DEMO' : repetition === 1 ? 'YOUR RESPONSE' : `REPEAT ${repetition + 1}`) : 'TRANSITION';
        sections.push({
          label: `${from.name.toUpperCase()} — ${role}`,
          startBar,
          bars: leadInBars,
          intensity: from.energy >= 4 ? 'STRONG' : from.energy >= 2 ? 'MEDIUM' : 'SOFT',
          performanceCue: `${from.grooveHint} Prepare the authored section-ending fill.`,
        });
        startBar += leadInBars;
        sections.push({
          label: `${to.name.toUpperCase()} — ${role}`,
          startBar,
          bars: landingBars,
          intensity: to.energy >= 4 ? 'STRONG' : to.energy >= 2 ? 'MEDIUM' : 'SOFT',
          performanceCue: `${to.grooveHint} Land Beat 1 and recover the groove immediately.`,
        });
        startBar += landingBars;
      }
    }
  }

  if (!sections.length) {
    const wanted = new Set(ids);
    track.sections.forEach((section) => {
      if (!wanted.has(section.id)) return;
      sections.push({
        label: section.name.toUpperCase(),
        startBar,
        bars: section.bars,
        intensity: section.energy >= 4 ? 'STRONG' : section.energy >= 2 ? 'MEDIUM' : 'SOFT',
        performanceCue: `${section.grooveHint} ${section.coachingNote}`,
      });
      startBar += section.bars;
    });
  }

  const totalBars = Math.max(1, sections.reduce((sum, section) => sum + section.bars, 0));
  const landmarks = sections.map((section) => section.startBar);

  return {
    totalBars,
    phraseGroupSize: 4,
    beatsPerBar: track.meter === '6/8' ? 6 : 4,
    highlightLandmarkBars: landmarks,
    sections,
    showBarNumbers: true,
    showBeatNumbers: true,
  };
}

/**
 * C11 is intentionally not a six-stage canonical-skill clone. The song itself
 * determines the learning path: map -> section skills -> tutor/learner exchange
 * -> transitions -> chained form -> full guided -> backing-only performance.
 */
export function buildC11SongBlueprints(track: PlayAlongTrack): C11SongStageBlueprint[] {
  const all = sectionIds(track);
  const introVerse = ['intro', 'verse-a'].filter((id) => all.includes(id));
  const chorus = ['chorus-a'].filter((id) => all.includes(id));
  const firstHalf = ['intro', 'verse-a', 'chorus-a'].filter((id) => all.includes(id));
  const secondHalf = ['verse-return', 'bridge-build', 'final-chorus', 'outro'].filter((id) => all.includes(id));
  const verseToChorus = ['verse-a', 'chorus-a'].filter((id) => all.includes(id));

  const safe = (ids: string[]) => ids.length ? ids : all;

  return [
    {
      title: 'Hear & Map the Song',
      kind: 'ORIENTATION',
      sectionIds: all,
      purpose: 'Hear the backing arrangement as a complete musical form before learning individual drum parts.',
      instructions: 'Listen through the arrangement. Track Intro, Verse, Chorus, Bridge and Outro landmarks and notice where the energy rises, settles or leaves space.',
      primaryGoal: 'Recognize the complete song form and the drummer responsibility in each section.',
      tutorBars: 0,
      learnerBars: 0,
      backingMode: 'BACKING_ONLY',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: false,
      assistance: 'FULL',
      missionStage: 'UNDERSTAND',
      conceptual: true,
      musicalApplication: false,
      targetBpm: track.bpm,
      expectedSkills: ['Song form', 'Section counting', 'Dynamic listening'],
      cueText: 'Do not play the whole drum part yet. First hear the architecture of the song.',
    },
    {
      title: 'Build the Intro + Verse Pocket',
      kind: 'SECTION_SKILL',
      sectionIds: safe(introVerse),
      purpose: 'Learn the settled pocket that carries the opening of the arrangement.',
      instructions: 'Play closed hi-hat eighths, a clear backbeat and a restrained kick pattern. Keep the texture predictable enough that the imagined vocal has space.',
      primaryGoal: 'Establish the core groove before adding transitions or louder sections.',
      sectionGoal: 'Intro + Verse: settle the pocket; no decorative fill is required.',
      tutorBars: 4,
      learnerBars: 0,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'FULL',
      missionStage: 'INTERNALIZE',
      conceptual: true,
      musicalApplication: false,
      targetBpm: Math.max(60, track.bpm - 12),
      loopCount: 1,
      fillTeachingMode: 'GUIDED',
      expectedSkills: ['8th-note backbeat', 'Pocket stability', 'Dynamic restraint'],
      cueText: 'Tutor drums demonstrate the section part over the backing track, including the authored Verse ending fill.',
    },
    {
      title: 'Tutor 2 Bars → You 2 Bars',
      kind: 'TUTOR_HANDOFF',
      sectionIds: safe(introVerse),
      purpose: 'Transfer the opening groove from listening into your own playing without the music stopping.',
      instructions: 'The backing track continues. Copy two tutor bars, then play two response bars while tutor drums disappear. Keep the same sound, pulse and density.',
      primaryGoal: 'Match the tutor pocket and survive the handoff without a tempo jump.',
      sectionGoal: 'Opening pocket handoff',
      tutorBars: 2,
      learnerBars: 2,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'FULL',
      missionStage: 'HEAR',
      musicalApplication: false,
      targetBpm: Math.max(64, track.bpm - 8),
      loopCount: 1,
      fillTeachingMode: 'GUIDED',
      expectedSkills: ['Imitation', 'Pocket continuity', 'Recovery'],
      cueText: 'Tutor plays 2 bars. You answer for 2 bars. The band never stops.',
    },
    {
      title: 'Learn the Chorus Lift',
      kind: 'SECTION_SKILL',
      sectionIds: safe(chorus),
      purpose: 'Learn how the same pulse becomes a bigger chorus without becoming a faster groove.',
      instructions: 'Keep the backbeat placement unchanged while lifting the cymbal texture and dynamics. Add only the kick movement you can control cleanly.',
      primaryGoal: 'Create a chorus lift through dynamics and texture, not rushing or overplaying.',
      sectionGoal: 'Chorus: stronger energy, same pocket.',
      tutorBars: 2,
      learnerBars: 2,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'REDUCED',
      missionStage: 'FOLLOW',
      musicalApplication: false,
      targetBpm: Math.max(68, track.bpm - 5),
      loopCount: 1,
      expectedSkills: ['Dynamic lift', 'Cymbal choice', 'Backbeat stability'],
      cueText: 'The chorus should feel larger, not faster.',
    },
    {
      title: 'Connect Verse → Chorus',
      kind: 'TRANSITION',
      sectionIds: safe(verseToChorus),
      purpose: 'Learn the transition as part of the song instead of treating the fill as a separate exercise.',
      instructions: 'Protect the final verse bar, play the authored Beat-4 fill, land the Chorus on Crash + Kick on Beat 1, and immediately establish the lifted groove. The first focused pass is demonstrated by the tutor; the second is yours.',
      primaryGoal: 'Preserve time through the section handoff and land the new section cleanly.',
      transitionGoal: 'Final Verse bar → Beat-4 eighth-note fill (4 &) → Crash + Kick on Chorus Beat 1 → immediate pocket.',
      tutorBars: 4,
      learnerBars: 4,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'REDUCED',
      missionStage: 'FOLLOW',
      musicalApplication: false,
      targetBpm: Math.max(68, track.bpm - 4),
      loopCount: 1,
      transitionFocus: {
        fromSectionId: 'verse-a',
        toSectionId: 'chorus-a',
        leadInBars: 2,
        landingBars: 2,
        repetitions: 2,
      },
      fillTeachingMode: 'DEMO_RESPONSE',
      expectedSkills: ['Fill entry', 'Beat-1 landing', 'Groove recovery', 'Restraint'],
      cueText: 'First hear the complete Verse → fill → Chorus landing. Then repeat the same four-bar transition yourself while the band continues.',
    },
    {
      title: 'Chain the First Half',
      kind: 'CHAIN',
      sectionIds: safe(firstHalf),
      purpose: 'Merge learned sections so the arrangement starts feeling like one piece of music.',
      instructions: 'Play Intro → Verse → Chorus continuously. Use reduced tutor drums only at selected handoffs; keep the backing track uninterrupted.',
      primaryGoal: 'Hold the pocket and section memory through the first large chain.',
      tutorBars: 1,
      learnerBars: 3,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'REDUCED',
      missionStage: 'REDUCED',
      musicalApplication: false,
      targetBpm: Math.max(70, track.bpm - 2),
      loopCount: 1,
      fillTeachingMode: 'GUIDED',
      expectedSkills: ['Form memory', 'Section contrast', 'Transition recovery'],
      cueText: 'Think in sections, not isolated bars. Protect the authored transition into the Chorus.',
    },
    {
      title: 'Learn the Return, Build & Ending',
      kind: 'SECTION_SKILL',
      sectionIds: safe(secondHalf),
      purpose: 'Learn how to come down after a chorus, build again, then finish the song together.',
      instructions: 'Settle immediately in the Verse Return, grow gradually through the Bridge, play the strongest controlled Final Chorus, then reduce density into the Outro.',
      primaryGoal: 'Control the second-half dynamic journey without changing tempo.',
      sectionGoal: 'Return → Build → Final Chorus → Outro',
      tutorBars: 4,
      learnerBars: 4,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'REDUCED',
      missionStage: 'REDUCED',
      musicalApplication: false,
      targetBpm: Math.max(70, track.bpm - 2),
      loopCount: 1,
      fillTeachingMode: 'GUIDED',
      expectedSkills: ['Dynamic control', 'Long-form form memory', 'Bridge build fill', 'Final-chorus exit fill', 'Outro restraint'],
      cueText: 'Coming down cleanly matters as much as building up. Tutor windows expose the Bridge build fill and later section-ending fill before you own them.',
    },
    {
      title: 'Full Song — Guided Handoffs',
      kind: 'FULL_GUIDED',
      sectionIds: all,
      purpose: 'Play the complete arrangement while tutor drums appear only in short handoff windows.',
      instructions: 'Backing track runs continuously. Tutor drums model one bar, then leave three bars to you. Spoken section cues remain available.',
      primaryGoal: 'Complete the entire song while support fades inside the real arrangement.',
      tutorBars: 1,
      learnerBars: 3,
      backingMode: 'BACKING_AND_TUTOR',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: true,
      assistance: 'REDUCED',
      missionStage: 'REDUCED',
      musicalApplication: false,
      targetBpm: track.bpm,
      loopCount: 1,
      fillTeachingMode: 'GUIDED',
      expectedSkills: ['Full-song continuity', 'Form anticipation', 'Transition fills', 'Recovery'],
      cueText: 'The tutor is now a safety rail, not the performance. Fill cues remain visible at authored transitions.',
    },
    {
      title: 'Full Song — Minimal Cues',
      kind: 'FULL_MINIMAL',
      sectionIds: all,
      purpose: 'Own the arrangement with the backing track while retaining only light section support.',
      instructions: 'No tutor drum performance. Use the backing track, optional click and short section names only. Recover from mistakes without restarting.',
      primaryGoal: 'Complete the full arrangement independently with section position intact.',
      tutorBars: 0,
      learnerBars: 4,
      backingMode: 'BACKING_ONLY',
      clickEnabled: true,
      spokenCues: true,
      tutorDrumsEnabled: false,
      assistance: 'NONE',
      missionStage: 'INDEPENDENT',
      musicalApplication: false,
      targetBpm: track.bpm,
      loopCount: 1,
      fillTeachingMode: 'CUE_ONLY',
      expectedSkills: ['Independent form', 'Pocket endurance', 'Fill memory', 'Error recovery'],
      cueText: 'No tutor drums. You own the form; only light transition reminders remain.',
    },
    {
      title: 'Full Song — Backing Track Only',
      kind: 'FULL_BACKING',
      sectionIds: all,
      purpose: 'Remove teaching scaffolds so the experience behaves like playing with a band.',
      instructions: 'Play the whole arrangement with accompaniment only. No tutor drums, no spoken coaching and no click. Let the backing track carry the form.',
      primaryGoal: 'Maintain time, section awareness and musical balance from Intro to Outro without instructional support.',
      tutorBars: 0,
      learnerBars: 4,
      backingMode: 'BACKING_ONLY',
      clickEnabled: false,
      spokenCues: false,
      tutorDrumsEnabled: false,
      assistance: 'NONE',
      missionStage: 'INDEPENDENT',
      musicalApplication: false,
      targetBpm: track.bpm,
      loopCount: 1,
      fillTeachingMode: 'MEMORY',
      expectedSkills: ['Band-time feel', 'Arrangement memory', 'Fill recall', 'Dynamic independence'],
      cueText: 'This is the rehearsal-room test: accompaniment only. Transition fills must now come from memory.',
    },
    {
      title: 'Performance Run — Make Musical Choices',
      kind: 'PERFORMANCE',
      sectionIds: all,
      purpose: 'Perform the song as music: stable pocket first, then controlled dynamics, fills, restraint and recovery.',
      instructions: 'Complete the full backing-only run. Choose fills only where they serve the arrangement, shape dynamics by section, and keep playing after small mistakes.',
      primaryGoal: 'Deliver one complete musical performance rather than a sequence of exercises.',
      tutorBars: 0,
      learnerBars: 4,
      backingMode: 'BACKING_ONLY',
      clickEnabled: false,
      spokenCues: false,
      tutorDrumsEnabled: false,
      assistance: 'NONE',
      missionStage: 'MUSICAL_APPLICATION',
      musicalApplication: true,
      targetBpm: track.bpm,
      loopCount: 1,
      fillTeachingMode: 'MEMORY',
      expectedSkills: ['Pocket', 'Form', 'Dynamics', 'Fills', 'Restraint', 'Recovery'],
      cueText: 'Play the arrangement, not the interface.',
    },
  ];
}

export function buildC11SongLearningSession(
  competency: CurriculumCompetency,
  profile: LearnerProfile,
  placementBand: CurriculumBand,
  trackId = C11_CANONICAL_SONG_TRACK_ID
): PracticeSession {
  const track = trackById(trackId);
  const blueprints = buildC11SongBlueprints(track);
  const sessionId = `c11-song-${competency.id}-${Date.now()}`;
  const fullBars = getTotalPlayAlongBars(track);

  const exercises: PracticeExercise[] = blueprints.map((blueprint, index) => {
    const missionNumber = index + 1;
    const structure = structureForStage(track, blueprint.sectionIds, blueprint.transitionFocus);
    const loopCount = blueprint.loopCount || 1;
    const config: SongLearningStageConfig = {
      planId: `c11-${track.id}`,
      stageIndex: missionNumber,
      totalStages: blueprints.length,
      kind: blueprint.kind,
      trackId: track.id,
      sectionIds: blueprint.sectionIds,
      tutorBars: blueprint.tutorBars,
      learnerBars: blueprint.learnerBars,
      backingMode: blueprint.backingMode,
      clickEnabled: blueprint.clickEnabled,
      spokenCues: blueprint.spokenCues,
      tutorDrumsEnabled: blueprint.tutorDrumsEnabled,
      loopCount,
      transitionFocus: blueprint.transitionFocus,
      fillTeachingMode: blueprint.fillTeachingMode || 'NONE',
      primaryGoal: blueprint.primaryGoal,
      sectionGoal: blueprint.sectionGoal,
      transitionGoal: blueprint.transitionGoal,
      expectedSkills: blueprint.expectedSkills,
      cueText: blueprint.cueText,
      evidenceVersion: C11_SONG_LEARNING_EVIDENCE_VERSION,
    };

    const metadata: CurriculumMissionMetadata = {
      competencyId: competency.id,
      missionId: `c11-${competency.id}-m${missionNumber}`,
      missionNumber,
      missionTitle: `Song Stage ${missionNumber} — ${blueprint.title}`,
      stage: blueprint.missionStage,
      assistanceTarget: blueprint.assistance,
      conceptualTarget: Boolean(blueprint.conceptual),
      executionTarget: missionNumber >= 2,
      musicalApplication: Boolean(blueprint.musicalApplication),
      applicationKind: blueprint.musicalApplication ? 'SONG_PLAY_ALONG' : undefined,
      applicationEvidenceVersion: blueprint.musicalApplication ? C11_SONG_LEARNING_EVIDENCE_VERSION : undefined,
      performanceTrackId: track.id,
      performanceMode: blueprint.kind === 'PERFORMANCE'
        ? 'MUSICAL_FULL_SONG'
        : blueprint.kind === 'FULL_BACKING' || blueprint.kind === 'FULL_MINIMAL'
        ? 'INDEPENDENT_FULL_SONG'
        : 'GUIDED_FORM',
      songLearning: config,
      patternDisplay: 'BAR_STRUCTURE',
      pedagogyDomain: 'PERFORMANCE',
      structure,
    };

    const durationSeconds = stageDurationSeconds(track, blueprint.sectionIds, loopCount, blueprint.transitionFocus);
    const isIndependent = blueprint.assistance === 'NONE';

    return {
      id: `${sessionId}-m${missionNumber}`,
      title: metadata.missionTitle,
      phase: missionNumber === 1 ? 'FOUNDATION' : blueprint.musicalApplication ? 'APPLICATION' : 'MAIN WORK',
      skillIds: [competency.skillId],
      purpose: blueprint.purpose,
      whyThisExercise: blueprint.purpose,
      pedagogicalRole: blueprint.kind === 'PERFORMANCE'
        ? 'PRIMARY TARGET'
        : isIndependent
        ? 'INDEPENDENCE TEST'
        : missionNumber === 1
        ? 'PREPARATION'
        : 'PRIMARY TARGET',
      instructions: blueprint.instructions,
      counting: blueprint.kind === 'ORIENTATION' ? 'Song arrangement sections' : '1 & 2 & 3 & 4 & — keep the quarter-note pulse stable',
      timeSignature: track.meter,
      subdivision: 'Song form',
      tempo: blueprint.targetBpm,
      targetTempo: track.bpm,
      durationSeconds,
      exerciseType: 'application',
      equipmentRequired: 'Full Drum Kit',
      difficulty: isIndependent || blueprint.kind === 'PERFORMANCE' ? 'Challenging' : missionNumber >= 4 ? 'Moderate' : 'Easy',
      curriculumMission: metadata,
      progressionStage: blueprint.musicalApplication ? 'TRANSFER' : missionNumber >= 3 ? 'APPLICATION' : 'FOUNDATION',
      challengeType: blueprint.kind === 'TRANSITION' ? 'musical-fill' : 'sustained-endurance',
      sessionSource: 'C12_ADAPTIVE_SONG_LEARNING',
      skillId: competency.skillId,
    };
  });

  return {
    id: sessionId,
    date: new Date().toISOString().slice(0, 10),
    durationMinutes: Math.max(30, Math.round(exercises.reduce((sum, exercise) => sum + exercise.durationSeconds, 0) / 60)),
    practiceContext: 'SONG_SERVICE_PREP',
    // Song learning is a kit-performance pathway even if the learner also uses a pad elsewhere.
    equipment: 'Full Drum Kit',
    focusMode: 'COACH_CHOOSES',
    selectedSkillIds: [competency.skillId],
    songPrepName: track.title,
    focusTopic: `${track.title} — Adaptive Song Learning`,
    notes: `C12 song-learning journey: ${blueprints.length} adaptive song stages across ${fullBars} bars. Section learning, tutor/student handoffs, transitions, chaining, backing-only independence and full musical performance replace the old fixed six-stage song template.`,
    rating: 0,
    sessionStatus: 'NOT_STARTED',
    exercises,
    sessionSource: 'C12_ADAPTIVE_SONG_LEARNING',
    skillId: competency.skillId,
    curriculumPractice: {
      competencyId: competency.id,
      placementBand,
      journeyVersion: 'C12',
      missionCount: exercises.length,
      personalizedDepth: placementBand === 'ADVANCED' ? 'DIAGNOSTIC' : placementBand === 'INTERMEDIATE' ? 'CONDENSED' : 'FOUNDATION',
    },
  };
}
