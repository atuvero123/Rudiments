import { PlayAlongApplicationMode, PlayAlongCoachMode } from './playAlongTracks';

export type MusicalDevelopmentStage =
  | 'FOUNDATION'
  | 'GROOVE'
  | 'VARIATION'
  | 'PHRASING'
  | 'RUDIMENT'
  | 'CREATIVITY'
  | 'PERFORMANCE';

export interface MusicalDevelopmentMission {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  objective: string;
  practiceConstraint: string;
  evidenceFocus: string;
  applicationMode: PlayAlongApplicationMode;
  preferredVariationIds?: string[];
  prerequisiteCompetencyIds?: string[];
  recommendedCoachMode?: PlayAlongCoachMode;
  ownershipCheck?: boolean;
  creatorPrompt?: {
    title: string;
    elementOptions: string[];
    locationOptions: string[];
    rule: string;
  };
}

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
  missions: MusicalDevelopmentMission[];
}

const mission = (
  id: string,
  order: number,
  title: string,
  shortTitle: string,
  objective: string,
  practiceConstraint: string,
  evidenceFocus: string,
  applicationMode: PlayAlongApplicationMode,
  extra: Partial<Omit<MusicalDevelopmentMission, 'id' | 'order' | 'title' | 'shortTitle' | 'objective' | 'practiceConstraint' | 'evidenceFocus' | 'applicationMode'>> = {}
): MusicalDevelopmentMission => ({
  id,
  order,
  title,
  shortTitle,
  objective,
  practiceConstraint,
  evidenceFocus,
  applicationMode,
  ...extra,
});

/**
 * C3.3 4/4 musical-development pathway.
 *
 * Canonical competencies remain the authority for curriculum unlocking.
 * Missions are a second layer: they deepen musical ownership after a skill is
 * available without ever certifying or bypassing a canonical prerequisite.
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
    missions: [
      mission('md44-1-m1', 1, 'Lock the pulse to the music', 'Lock the pulse', 'Make four equal beats feel anchored inside the accompaniment.', 'One relaxed stroke on every quarter note. Nothing else.', 'Even spacing and relaxed motion.', 'GROOVE_ONLY', { preferredVariationIds: ['pulse-only'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-1-m2', 2, 'Hear the hidden eighth-note grid', 'Hear the hidden grid', 'Keep quarter notes steady while internally hearing the smaller eighth-note grid.', 'Play only quarter notes; count 1 & 2 & 3 & 4 & internally.', 'Quarter notes do not drift between clicks.', 'GROOVE_ONLY', { preferredVariationIds: ['8th-count', 'pulse-only'], prerequisiteCompetencyIds: ['comp-subdiv-8th'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-1-m3', 3, 'Lift a section without adding notes', 'Dynamics, not notes', 'Make a chorus feel larger through touch and intention instead of extra vocabulary.', 'No fills. Keep the same pulse and change only dynamics.', 'Tempo stays identical while energy changes.', 'MUSICAL_CHOICE', { preferredVariationIds: ['no-fill', 'pulse-only'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-1-m4', 4, 'Own the pulse through the full form', 'Full pulse run', 'Carry the pulse from intro to outro with very little coaching.', 'No extra notes. Recover without stopping if one beat feels imperfect.', 'Independent pulse and section awareness.', 'GROOVE_ONLY', { preferredVariationIds: ['pulse-only'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
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
    missions: [
      mission('md44-2-m1', 1, 'Hear and copy the base backbeat', 'Base groove', 'Establish the basic musical relationship between hats, snare and kick.', 'Use the base groove only. Keep snare on 2 and 4.', 'Backbeat stays centred and hats stay even.', 'GROOVE_ONLY', { preferredVariationIds: ['base-groove'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-2-m2', 2, 'Hold the pocket for a full section', 'Hold the pocket', 'Stop thinking bar-by-bar and sustain the groove across a verse.', 'No fills. Do not change the kick pattern.', 'Groove remains stable for the entire section.', 'GROOVE_ONLY', { preferredVariationIds: ['base-groove'], recommendedCoachMode: 'REDUCED' }),
      mission('md44-2-m3', 3, 'Cross sections without losing the backbeat', 'Transition without fill', 'Keep the groove intact while the harmony changes underneath you.', 'Cross every boundary with groove or crash-only; no busy fill.', 'Beat 2 and 4 remain stable after every section change.', 'MUSICAL_CHOICE', { preferredVariationIds: ['no-fill', 'base-groove'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-2-m4', 4, 'Shape verse and chorus with touch', 'Shape sections', 'Use dynamics to separate sections without changing the groove foundation.', 'Same notes, different energy. Do not speed up in the chorus.', 'Section lift comes from dynamics, not extra notes.', 'MUSICAL_CHOICE', { preferredVariationIds: ['base-groove', 'dynamic-lift'], prerequisiteCompetencyIds: ['comp-dyn-song-balance'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-2-m5', 5, 'Own the backbeat pocket', 'Pocket performance', 'Play the whole arrangement with the base groove and minimal coaching.', 'No resets. Protect 2 and 4 above everything else.', 'Stable pocket from intro to outro.', 'GROOVE_ONLY', { preferredVariationIds: ['base-groove'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
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
    missions: [
      mission('md44-3-m1', 1, 'Re-establish Groove A', 'Groove A', 'Start from a groove you already trust before introducing variation.', 'Base groove only for the whole run.', 'Pocket remains effortless before variation begins.', 'GROOVE_ONLY', { preferredVariationIds: ['base-groove'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-3-m2', 2, 'Copy one kick variation', 'Copy Variation B', 'Change only the kick phrase while hats and snare stay unchanged.', 'Use only the taught kick variation; do not improvise yet.', 'Variation enters without moving the backbeat.', 'GROOVE_VARIATION', { preferredVariationIds: ['kick-var'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-3-m3', 3, 'Alternate Groove A and B', 'Alternate A / B', 'Switch between the base groove and kick variation without a timing reset.', 'Use Groove A first, then Variation B in the later half of each section.', 'Both grooves share the same pocket.', 'GROOVE_VARIATION', { preferredVariationIds: ['kick-var', 'base-groove'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-3-m4', 4, 'Change one kick placement yourself', 'Create one change', 'Make a tiny personal variation while preserving the groove skeleton.', 'Change one kick placement only. Snare remains on 2 & 4 and hats remain even.', 'Your idea sounds related to the base groove rather than like a new random pattern.', 'GROOVE_VARIATION', {
        preferredVariationIds: ['kick-var', 'base-groove'], recommendedCoachMode: 'REDUCED', ownershipCheck: true,
        creatorPrompt: { title: 'Build one safe groove variation', elementOptions: ['Move one kick', 'Add one kick', 'Remove one kick'], locationOptions: ['Verse second half', 'Chorus second half', 'One 4-bar phrase'], rule: 'Keep the hi-hat grid and snare on 2 & 4 unchanged.' },
      }),
      mission('md44-3-m5', 5, 'Choose the right groove for each section', 'Choose by section', 'Decide where the base groove or kick variation best supports the arrangement.', 'Do not vary every section. Make at least one deliberate choice to stay simple.', 'Variation follows the music rather than habit.', 'MUSICAL_CHOICE', { preferredVariationIds: ['base-groove', 'kick-var', 'no-fill'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
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
    missions: [
      mission('md44-4-m1', 1, 'Place a quarter-note fill after 3 bars', 'Quarter fill 3+1', 'Feel a complete four-bar phrase before filling.', '3 bars groove + one full bar of quarter-note fill.', 'Fill begins on time and lands beat 1.', 'THREE_PLUS_ONE', { preferredVariationIds: ['quarter-fill'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-4-m2', 2, 'Place an eighth-note fill after 3 bars', 'Eighth fill 3+1', 'Increase note density without shortening the bar.', '3 bars groove + one full bar of even eighth notes.', 'Eight notes stay even and beat 1 is not rushed.', 'THREE_PLUS_ONE', { preferredVariationIds: ['8th-fill'], prerequisiteCompetencyIds: ['comp-fill-8th'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-4-m3', 3, 'Use a controlled sixteenth-note burst', 'Sixteenth burst', 'Learn that a faster subdivision can be shorter and still musical.', 'Use sixteenths for only the final half bar unless the curriculum task says otherwise.', 'Fast notes stay relaxed and do not pull the next beat 1 early.', 'HALF_BAR_FILL', { preferredVariationIds: ['16th-fill'], prerequisiteCompetencyIds: ['comp-fill-16th'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-4-m4', 4, 'Wait seven bars before filling', '7+1 phrasing', 'Develop patience and longer phrase awareness.', '7 bars groove + 1 bar fill. No early decoration.', 'You can feel the eight-bar phrase without counting nervously.', 'SEVEN_PLUS_ONE', { preferredVariationIds: ['8th-fill', 'quarter-fill'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-4-m5', 5, 'Shorten the fill to half a bar', 'Half-bar fill', 'Create transition energy while preserving beats 1 and 2 of the groove.', 'Stay in groove through beat 2; fill only beats 3–4.', 'Entry point is deliberate and beat 1 remains clean.', 'HALF_BAR_FILL', { preferredVariationIds: ['8th-fill', 'quarter-fill'], recommendedCoachMode: 'REDUCED' }),
      mission('md44-4-m6', 6, 'Use beat 4 only', 'Beat-4 fill', 'Prove that a useful fill can be very short.', 'No fill before beat 4.', 'One-beat fill lands confidently without squeezing.', 'BEAT_FOUR_FILL', { preferredVariationIds: ['quarter-fill'], recommendedCoachMode: 'REDUCED' }),
      mission('md44-4-m7', 7, 'Choose fill or no fill', 'Fill / no-fill choice', 'Decide whether the transition needs notes at all.', 'At least one section boundary must intentionally have no fill.', 'Choices serve the phrase rather than a fixed fill schedule.', 'MUSICAL_CHOICE', { preferredVariationIds: ['no-fill', 'quarter-fill', '8th-fill'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
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
    missions: [
      mission('md44-5-m1', 1, 'Hear singles as a musical fill', 'Singles in music', 'Move alternating singles from pad vocabulary into a phrase ending.', 'Use a short single-stroke fill only at selected endings.', 'Singles stay even when moved around the kit.', 'RUDIMENT_FILL', { preferredVariationIds: ['single-stroke-fill'], prerequisiteCompetencyIds: ['comp-rud-singles'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-5-m2', 2, 'Hear doubles as a musical fill', 'Doubles in music', 'Keep rebound and sound quality while the doubles become part of a song.', 'Use one short double-stroke fill. Do not force full-bar doubles.', 'Doubles stay relaxed and the next groove is stable.', 'RUDIMENT_FILL', { preferredVariationIds: ['double-stroke-fill'], prerequisiteCompetencyIds: ['comp-rud-doubles'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-5-m3', 3, 'Place a paradiddle phrase', 'Paradiddle fill', 'Preserve sticking while accents and surfaces turn it into a musical phrase.', 'One paradiddle phrase at a clear transition only.', 'The sticking survives orchestration and beat-1 return.', 'RUDIMENT_FILL', { preferredVariationIds: ['paradiddle-fill'], prerequisiteCompetencyIds: ['comp-rud-single-paradiddle'], recommendedCoachMode: 'GUIDED' }),
      mission('md44-5-m4', 4, 'Orchestrate one sticking yourself', 'Choose the surfaces', 'Make one known sticking sound different by moving accents and taps across the kit.', 'Keep the sticking unchanged; change only where the notes are played.', 'Orchestration changes colour without breaking timing.', 'RUDIMENT_FILL', {
        preferredVariationIds: ['paradiddle-fill', 'single-stroke-fill'], prerequisiteCompetencyIds: ['comp-rud-orchestration'], recommendedCoachMode: 'REDUCED', ownershipCheck: true,
        creatorPrompt: { title: 'Orchestrate one rudiment', elementOptions: ['Accents to toms', 'Right hand to floor tom', 'Last two notes to toms', 'Keep taps on snare'], locationOptions: ['Half-bar transition', 'Final beat of phrase', 'One full-bar transition'], rule: 'Do not change the sticking while changing surfaces.' },
      }),
      mission('md44-5-m5', 5, 'Shorten the rudiment to fit the phrase', 'Shorten the phrase', 'Use only the amount of rudimental vocabulary the transition can hold.', 'Start with half a bar; stop the sticking cleanly and land beat 1.', 'The rudiment fits the song instead of dictating the song.', 'RUDIMENT_FILL', { preferredVariationIds: ['paradiddle-fill', 'double-stroke-fill'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-5-m6', 6, 'Choose where the rudiment belongs', 'Place it musically', 'Use the rudiment only when the arrangement actually benefits from it.', 'At least one transition must deliberately use no rudimental fill.', 'Placement shows restraint and section awareness.', 'MUSICAL_CHOICE', { preferredVariationIds: ['paradiddle-fill', 'no-fill'], prerequisiteCompetencyIds: ['comp-rud-fill-app'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
      mission('md44-5-m7', 7, 'Create a rudimental fill variation', 'Create your version', 'Change orchestration or length while preserving the learned sticking.', 'Make one change only, then repeat it consistently when chosen.', 'Your variation is repeatable and still recognisably based on the rudiment.', 'RUDIMENT_FILL', {
        preferredVariationIds: ['paradiddle-fill', 'single-stroke-fill', 'double-stroke-fill'], prerequisiteCompetencyIds: ['comp-rud-fill-app'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true,
        creatorPrompt: { title: 'Create a controlled rudimental variation', elementOptions: ['Change orchestration', 'Shorten the phrase', 'Move the accent', 'Add a final kick'], locationOptions: ['Beat 4 only', 'Half bar', 'One selected full-bar ending'], rule: 'Keep one clear link to the original sticking and repeat the same idea when it returns.' },
      }),
    ],
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
    missions: [
      mission('md44-6-m1', 1, 'Choose deliberate space', 'No-fill decision', 'Treat silence and continuity as active musical decisions.', 'Choose at least two section boundaries where you intentionally do not fill.', 'No-fill choices feel intentional, not hesitant.', 'MUSICAL_CHOICE', { preferredVariationIds: ['no-fill'], recommendedCoachMode: 'GUIDED', ownershipCheck: true }),
      mission('md44-6-m2', 2, 'Change energy with dynamics only', 'Dynamics only', 'Shape the arrangement without adding rhythmic complexity.', 'No fills. Change only stroke height, cymbal texture or intensity.', 'The song develops while the pocket remains unchanged.', 'MUSICAL_CHOICE', { preferredVariationIds: ['dynamic-lift', 'no-fill'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-6-m3', 3, 'Choose between two groove options', 'Choose the groove', 'Decide whether a section needs the base groove or a verified variation.', 'Use no more than two groove identities in the whole run.', 'Groove choice follows section energy.', 'GROOVE_VARIATION', { preferredVariationIds: ['base-groove', 'kick-var'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-6-m4', 4, 'Limit yourself to two fills', 'Two-fill limit', 'Practise restraint by making each fill matter.', 'Maximum two fills in the entire arrangement.', 'You can explain why each fill was used.', 'CREATIVITY_CHALLENGE', { preferredVariationIds: ['no-fill', 'quarter-fill', '8th-fill', 'dynamic-lift'], recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-6-m5', 5, 'Create one musical idea', 'Create one idea', 'Invent one small repeatable choice rather than improvising everything.', 'Create one idea, repeat it consistently, and leave the rest of the arrangement simple.', 'The new idea is controlled, repeatable and supports the section.', 'CREATIVITY_CHALLENGE', {
        preferredVariationIds: ['base-groove', 'kick-var', 'no-fill'], recommendedCoachMode: 'REDUCED', ownershipCheck: true,
        creatorPrompt: { title: 'Create one musical idea', elementOptions: ['Groove variation', 'Short fill', 'Dynamic lift', 'Crash-only transition', 'Deliberate space'], locationOptions: ['Verse → Chorus', 'Bridge → Final Chorus', 'One repeated 4-bar phrase'], rule: 'Use one new idea only. Everything around it should remain dependable.' },
      }),
      mission('md44-6-m6', 6, 'Make the decisions without prompts', 'Creative performance', 'Own the same constraints with minimal coaching.', 'Maximum two fills; at least one no-fill; use only verified vocabulary.', 'Choices remain musical without the coach telling you what to do.', 'CREATIVITY_CHALLENGE', { preferredVariationIds: ['no-fill', 'dynamic-lift', 'kick-var', 'base-groove'], recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
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
    missions: [
      mission('md44-7-m1', 1, 'Perform with full coaching', 'Guided arrangement', 'Use the complete arrangement while the coach still calls sections and transitions.', 'Do not stop. Follow the arrangement and recover inside the music.', 'Stable whole-song execution with prompts.', 'FULL_ARRANGEMENT', { recommendedCoachMode: 'GUIDED' }),
      mission('md44-7-m2', 2, 'Perform with reduced coaching', 'Reduced arrangement', 'Keep the same arrangement when the spoken coach disappears.', 'Use visual section information only; no resets.', 'Section awareness survives without spoken prompts.', 'FULL_ARRANGEMENT', { recommendedCoachMode: 'REDUCED', ownershipCheck: true }),
      mission('md44-7-m3', 3, 'Perform independently', 'Performance run', 'Treat the backing track like a live band and make your own musical decisions.', 'Performance mode, no resets, no unnecessary fills.', 'Tempo, recovery, sections and musical choices remain controlled.', 'FULL_ARRANGEMENT', { recommendedCoachMode: 'PERFORMANCE', ownershipCheck: true }),
    ],
  },
];

export function getMusicalDevelopmentStep(id?: string | null): MusicalDevelopmentStep | undefined {
  if (!id) return undefined;
  return MUSICAL_DEVELOPMENT_44.find((step) => step.id === id);
}

export function getMusicalDevelopmentMission(step: MusicalDevelopmentStep | undefined, missionId?: string | null): MusicalDevelopmentMission | undefined {
  if (!step || !missionId) return undefined;
  return step.missions.find((missionItem) => missionItem.id === missionId);
}

export function recommendMusicalDevelopmentStepForCompetency(competencyId?: string | null): MusicalDevelopmentStep {
  const id = competencyId || '';
  if (['comp-pulse-quarter', 'comp-subdiv-8th', 'comp-meter-44', 'comp-reading-notation'].includes(id)) {
    return MUSICAL_DEVELOPMENT_44[0];
  }
  if (['comp-grv-backbeat', 'comp-grv-stability'].includes(id)) return MUSICAL_DEVELOPMENT_44[1];
  if (['comp-grv-kick-variation', 'comp-dyn-song-balance'].includes(id)) return MUSICAL_DEVELOPMENT_44[2];
  if (['comp-fill-quarter', 'comp-fill-8th', 'comp-fill-16th', 'comp-fill-entry', 'comp-fill-recovery'].includes(id)) return MUSICAL_DEVELOPMENT_44[3];
  if (['comp-rud-singles', 'comp-rud-doubles', 'comp-rud-single-paradiddle', 'comp-dyn-accent-contrast', 'comp-rud-orchestration', 'comp-rud-fill-app'].includes(id)) return MUSICAL_DEVELOPMENT_44[4];
  if (['comp-perf-song-arrangement', 'comp-read-counting-aloud'].includes(id)) return MUSICAL_DEVELOPMENT_44[5];
  if (id === 'comp-perf-song-app') return MUSICAL_DEVELOPMENT_44[6];
  return MUSICAL_DEVELOPMENT_44[0];
}
