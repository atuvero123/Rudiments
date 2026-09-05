import { PlayAlongApplicationMode } from './playAlongTracks';

export type MusicalDevelopmentStage =
  | 'FOUNDATION'
  | 'GROOVE'
  | 'VARIATION'
  | 'PHRASING'
  | 'RUDIMENT'
  | 'CREATIVITY'
  | 'PERFORMANCE';

export interface MusicalDevelopmentStep {
  id: string;
  order: number;
  stage: MusicalDevelopmentStage;
  title: string;
  shortTitle: string;
  outcome: string;
  practiceConstraint: string;
  evidenceGoal: string;
  prerequisiteCompetencyIds: string[];
  trackId: string;
  applicationMode: PlayAlongApplicationMode;
  preferredVariationIds?: string[];
}

/**
 * C3.2 4/4 musical-development pathway.
 * Canonical competencies remain the authority; this map only determines how
 * already-learned vocabulary is progressively applied inside music.
 */
export const MUSICAL_DEVELOPMENT_44: MusicalDevelopmentStep[] = [
  {
    id: 'md44-1-pulse',
    order: 1,
    stage: 'FOUNDATION',
    title: 'Feel the 4/4 Pulse Inside Music',
    shortTitle: 'Pulse in music',
    outcome: 'Hold an even quarter-note pulse while harmony and section changes move around you.',
    practiceConstraint: 'Play one relaxed pulse per beat. No fills and no extra groove notes.',
    evidenceGoal: 'Complete the arrangement without rushing, dragging, or losing the section pulse.',
    prerequisiteCompetencyIds: [],
    trackId: 'pa-slow-ballad-64',
    applicationMode: 'GROOVE_ONLY',
    preferredVariationIds: ['pulse-only', 'no-fill'],
  },
  {
    id: 'md44-2-backbeat',
    order: 2,
    stage: 'GROOVE',
    title: 'Build a Stable Backbeat Pocket',
    shortTitle: 'Backbeat & pocket',
    outcome: 'Move from pulse-only playing into a dependable 8th-note 4/4 groove.',
    practiceConstraint: 'Keep hats even, snare on 2 and 4, and use the simplest verified kick pattern.',
    evidenceGoal: 'Keep the groove stable through verse and chorus without the backbeat shifting.',
    prerequisiteCompetencyIds: ['comp-grv-backbeat', 'comp-grv-stability'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'GROOVE_ONLY',
    preferredVariationIds: ['base-groove', 'dynamic-lift'],
  },
  {
    id: 'md44-3-kick-variation',
    order: 3,
    stage: 'VARIATION',
    title: 'Create Groove Variations Without Losing Pocket',
    shortTitle: 'Kick variations',
    outcome: 'Change the bass-drum phrase while the hi-hat and backbeat remain dependable.',
    practiceConstraint: 'Alternate the basic kick pattern with one verified kick variation every four bars.',
    evidenceGoal: 'The groove should feel like one song even when the kick pattern changes.',
    prerequisiteCompetencyIds: ['comp-grv-backbeat', 'comp-grv-stability', 'comp-grv-kick-variation'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'GROOVE_VARIATION',
    preferredVariationIds: ['kick-var', 'base-groove'],
  },
  {
    id: 'md44-4-fill-phrasing',
    order: 4,
    stage: 'PHRASING',
    title: 'Place Fills Over Musical Phrases',
    shortTitle: 'Phrase-length fills',
    outcome: 'Use fills at predictable phrase endings and return to beat 1 without disturbing the song.',
    practiceConstraint: 'Begin with 3 bars groove + 1 bar fill. Later compare 7 + 1, half-bar and beat-4 fills.',
    evidenceGoal: 'Every fill begins deliberately and the next section lands cleanly on beat 1.',
    prerequisiteCompetencyIds: ['comp-fill-quarter', 'comp-fill-entry', 'comp-fill-recovery'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'THREE_PLUS_ONE',
    preferredVariationIds: ['quarter-fill', '8th-fill'],
  },
  {
    id: 'md44-5-rudiment',
    order: 5,
    stage: 'RUDIMENT',
    title: 'Turn Rudiments Into Musical Fills',
    shortTitle: 'Rudiment application',
    outcome: 'Stop treating rudiments as pad-only exercises and place verified stickings inside the groove.',
    practiceConstraint: 'Choose one verified rudiment, orchestrate it simply, and use it only at selected phrase endings.',
    evidenceGoal: 'The rudiment should sound like a fill that belongs in the song, not an exercise pasted on top.',
    prerequisiteCompetencyIds: ['comp-rud-single-paradiddle', 'comp-fill-recovery'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'RUDIMENT_FILL',
    preferredVariationIds: ['paradiddle-fill', 'double-stroke-fill', 'single-stroke-fill'],
  },
  {
    id: 'md44-6-creativity',
    order: 6,
    stage: 'CREATIVITY',
    title: 'Make Controlled Creative Choices',
    shortTitle: 'Creativity choices',
    outcome: 'Choose groove, fill, dynamic lift, crash-only or deliberate space according to the arrangement.',
    practiceConstraint: 'Use only verified vocabulary and do not fill every transition. Limit yourself to two deliberate fills.',
    evidenceGoal: 'Your choices should make sections clearer and support the imagined vocal rather than compete with it.',
    prerequisiteCompetencyIds: ['comp-perf-song-arrangement', 'comp-dyn-song-balance', 'comp-fill-recovery'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'CREATIVITY_CHALLENGE',
    preferredVariationIds: ['no-fill', 'dynamic-lift', 'kick-var', 'base-groove'],
  },
  {
    id: 'md44-7-performance',
    order: 7,
    stage: 'PERFORMANCE',
    title: 'Perform a Full 4/4 Arrangement',
    shortTitle: 'Full arrangement',
    outcome: 'Shape an entire song from intro to outro using groove, dynamics, fills and restraint without stopping.',
    practiceConstraint: 'No resets during the run. Treat the accompaniment like a live band and recover musically from small mistakes.',
    evidenceGoal: 'Complete the whole arrangement with stable tempo, clear sections, controlled transitions and musical choices.',
    prerequisiteCompetencyIds: ['comp-perf-song-app', 'comp-perf-song-arrangement'],
    trackId: 'pa-worship-ballad-68',
    applicationMode: 'FULL_ARRANGEMENT',
  },
];

export function getMusicalDevelopmentStep(id?: string | null): MusicalDevelopmentStep | undefined {
  if (!id) return undefined;
  return MUSICAL_DEVELOPMENT_44.find((step) => step.id === id);
}

export function recommendMusicalDevelopmentStepForCompetency(competencyId?: string | null): MusicalDevelopmentStep {
  const id = competencyId || '';
  if (['comp-pulse-quarter', 'comp-subdiv-8th', 'comp-meter-44', 'comp-reading-notation'].includes(id)) {
    return MUSICAL_DEVELOPMENT_44[0];
  }
  if (['comp-grv-backbeat', 'comp-grv-stability'].includes(id)) return MUSICAL_DEVELOPMENT_44[1];
  if (['comp-grv-kick-variation', 'comp-dyn-song-balance'].includes(id)) return MUSICAL_DEVELOPMENT_44[2];
  if (['comp-fill-quarter', 'comp-fill-8th', 'comp-fill-16th', 'comp-fill-entry', 'comp-fill-recovery'].includes(id)) return MUSICAL_DEVELOPMENT_44[3];
  if (['comp-rud-singles', 'comp-rud-doubles', 'comp-rud-single-paradiddle', 'comp-dyn-accent-contrast'].includes(id)) return MUSICAL_DEVELOPMENT_44[4];
  if (['comp-perf-song-arrangement', 'comp-read-counting-aloud'].includes(id)) return MUSICAL_DEVELOPMENT_44[5];
  if (id === 'comp-perf-song-app') return MUSICAL_DEVELOPMENT_44[6];
  return MUSICAL_DEVELOPMENT_44[0];
}
