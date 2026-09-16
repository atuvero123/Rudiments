import {
  CompetencyTeachingDefinition,
  CurriculumCompetency,
  PracticeExercise,
  TeachingEventDef,
} from '../types';

/**
 * C8 — canonical rudiment musical-application authority.
 *
 * Technical rudiment teaching stays pad-first. Mission 6 is different: it must
 * prove that the learner can preserve the sticking while placing it inside a
 * musical phrase. This module owns that transfer so Mission 6 can never fall
 * back to the same pad-only timeline used by Mission 5.
 */
export const C8_RUDIMENT_APPLICATION_EVIDENCE_VERSION = 'C8_RUDIMENT_ORCHESTRATION_V1';

export interface RudimentApplicationPlan {
  version: typeof C8_RUDIMENT_APPLICATION_EVIDENCE_VERSION;
  kind: 'RUDIMENT_ORCHESTRATION';
  phraseModel: 'GROOVE_TO_FILL_TO_GROOVE';
  title: string;
  purpose: string;
  instructions: string;
  requiredPatternLabel: string;
  listeningTarget: string;
}

function grooveEventsForBar(bar: number, crashOnOne = false): TeachingEventDef[] {
  const events: TeachingEventDef[] = [];
  for (let beat = 1; beat <= 4; beat += 1) {
    const downbeatSurfaces = beat === 1 || beat === 3
      ? ['kick', 'hihat_closed'] as const
      : ['snare', 'hihat_closed'] as const;

    events.push({
      bar,
      beat,
      subdivision: 0,
      countToken: String(beat),
      hand: beat === 1 || beat === 3 ? 'K' : 'L',
      surface: crashOnOne && beat === 1 ? 'crash' : downbeatSurfaces[0],
      surfaces: crashOnOne && beat === 1
        ? ['crash', 'kick']
        : [...downbeatSurfaces],
      role: beat === 1 && crashOnOne ? 'landing' : 'groove',
      accent: beat === 1 && crashOnOne,
      label: crashOnOne && beat === 1
        ? 'CRASH + KICK'
        : beat === 1 || beat === 3
        ? 'K + HH'
        : 'S + HH',
      description: crashOnOne && beat === 1
        ? 'Phrase landing — crash and kick together on Beat 1.'
        : `Steady groove downbeat on Beat ${beat}.`,
    });

    events.push({
      bar,
      beat,
      subdivision: 2,
      countToken: '&',
      hand: 'R',
      surface: 'hihat_closed',
      role: 'groove',
      accent: false,
      label: 'HH',
      description: `Closed hi-hat on ${beat}&.`,
    });
  }
  return events;
}

function getTwoBeatSource(base: CompetencyTeachingDefinition): TeachingEventDef[] {
  const authored = base.events.filter((event) => Math.max(1, event.bar || 1) === 1);
  if (authored.length === 0) return [];
  const wanted = 8;
  return Array.from({ length: wanted }, (_, index) => authored[index % authored.length]);
}

function applicationSurfaceFor(
  competencyId: string,
  event: TeachingEventDef,
  index: number
): TeachingEventDef['surface'] {
  if (competencyId === 'comp-rud-doubles') {
    // RR on snare -> LL on high tom -> RR on mid tom -> LL on floor tom.
    return index < 2 ? 'snare' : index < 4 ? 'tom_high' : index < 6 ? 'tom_mid' : 'tom_floor';
  }

  if (competencyId === 'comp-rud-singles') {
    // Keep the alternating sticking unchanged while the phrase travels down the kit.
    return index < 2 ? 'snare' : index < 4 ? 'tom_high' : index < 6 ? 'tom_mid' : 'tom_floor';
  }

  if (competencyId === 'comp-rud-single-paradiddle') {
    // Paradiddle accents move to the toms while the inner notes return to snare.
    if (event.accent || index === 0) return index < 4 ? 'tom_high' : 'tom_floor';
    return 'snare';
  }

  if (event.accent) {
    return index < 4 ? 'tom_high' : 'tom_floor';
  }
  return index < 4 ? 'snare' : index < 6 ? 'tom_mid' : 'tom_floor';
}

function buildApplicationFillEvents(
  base: CompetencyTeachingDefinition,
  competencyId: string
): TeachingEventDef[] {
  return getTwoBeatSource(base).map((source, index) => {
    const beat = index < 4 ? 3 : 4;
    const subdivision = index % 4;
    const countToken = subdivision === 0 ? String(beat) : subdivision === 1 ? 'e' : subdivision === 2 ? '&' : 'a';
    const surface = applicationSurfaceFor(competencyId, source, index);
    return {
      ...source,
      bar: 4,
      beat,
      subdivision,
      countToken,
      surface,
      surfaces: undefined,
      role: 'fill',
      label: source.accent ? `>${source.hand}` : source.hand,
      description: `${source.hand} on ${surface.replaceAll('_', ' ')} — keep the original rudiment sticking unchanged.`,
    };
  });
}

function compactPattern(competencyId: string, base: CompetencyTeachingDefinition): string {
  if (competencyId === 'comp-rud-doubles') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beat 3 Snare RR → High Tom LL · Beat 4 Mid Tom RR → Floor Tom LL · next Beat 1 Crash + Kick';
  }
  if (competencyId === 'comp-rud-singles') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beat 3–4 alternating singles descend Snare → High Tom → Mid Tom → Floor Tom · next Beat 1 Crash + Kick';
  }
  if (competencyId === 'comp-rud-single-paradiddle') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beat 3–4 paradiddle accents move to toms while inner notes stay on snare · next Beat 1 Crash + Kick';
  }
  return `Bars 1–3 groove · Bar 4 Beats 1–2 groove · orchestrate ${base.sticking} across snare/toms · next Beat 1 Crash + Kick`;
}

export function getRudimentApplicationPlan(
  competency: Pick<CurriculumCompetency, 'id' | 'title' | 'stickingPattern'>,
  baseTitle?: string
): RudimentApplicationPlan {
  const title = baseTitle || competency.title;
  const pattern = competency.id === 'comp-rud-doubles'
    ? 'RR on snare → LL on high tom → RR on mid tom → LL on floor tom'
    : competency.id === 'comp-rud-single-paradiddle'
    ? 'keep RLRR LRLL intact; move the accented lead notes to toms and keep inner notes controlled on snare'
    : competency.id === 'comp-rud-singles'
    ? 'keep RLRL intact while descending through snare and toms'
    : `keep ${competency.stickingPattern} intact while changing surfaces`;

  return {
    version: C8_RUDIMENT_APPLICATION_EVIDENCE_VERSION,
    kind: 'RUDIMENT_ORCHESTRATION',
    phraseModel: 'GROOVE_TO_FILL_TO_GROOVE',
    title: `${title} — Musical Orchestration`,
    purpose: `Transfer ${title} from pad mechanics into a real groove → fill → groove phrase without changing the sticking or pulse.`,
    instructions: `Keep the groove steady for three bars. In Bar 4, keep Beats 1–2 in the groove, then use the rudiment as a two-beat fill on Beats 3–4: ${pattern}. Land the next Beat 1 with Crash + Kick and immediately recover the groove.`,
    requiredPatternLabel: pattern,
    listeningTarget: 'The groove must stay settled before the fill, the sticking must remain recognizable while the surfaces change, and the next Beat 1 must land without rushing or hesitation.',
  };
}

export function buildRudimentApplicationDefinition(
  base: CompetencyTeachingDefinition,
  competencyId: string
): CompetencyTeachingDefinition {
  const grooveBars = [1, 2, 3].flatMap((bar) => grooveEventsForBar(bar, bar === 1));
  const bar4Groove = grooveEventsForBar(4, false).filter((event) => event.beat <= 2);
  const fillEvents = buildApplicationFillEvents(base, competencyId);
  const pattern = compactPattern(competencyId, base);

  return {
    ...base,
    id: `${base.id}-c8-application`,
    title: `${base.title} — Musical Orchestration`,
    subdivisionDisplay: '8th-note groove → 16th-note rudiment fill → Beat-1 landing',
    bars: 4,
    sticking: pattern,
    limbPattern: `Preserve the original ${base.sticking} sticking while moving the final two-beat fill across the kit.`,
    drumSurfaces: ['Closed Hi-Hat', 'Kick', 'Snare', 'High Tom', 'Mid Tom', 'Floor Tom', 'Crash'],
    events: [...grooveBars, ...bar4Groove, ...fillEvents],
    musicalExplanation: {
      ...base.musicalExplanation,
      whatAmILearning: `Turn ${base.title} into a musical phrase rather than repeating it as an isolated pad exercise.`,
      howIsItCounted: 'Bars 1–3: 1 & 2 & 3 & 4 &. Bar 4: keep 1 & 2 &, then count the rudiment fill as 3 e & a 4 e & a. Land the next 1.',
      handsAndFeet: `Keep the groove limbs relaxed, then preserve ${base.sticking} exactly while only the drum surfaces change.`,
      drumSurfaces: 'Closed hi-hat, kick and snare for the groove; snare and toms for the rudiment fill; Crash + Kick for the next Beat 1.',
      musicalApplication: pattern,
      whatToListenFor: 'No tempo lift before the fill, no sticking mutation during orchestration, and no hesitation when the groove returns after the landing.',
    },
    diagnosticIssues: [
      'Rudiment changed during orchestration',
      'Rushed fill entry',
      'Uneven orchestrated strokes',
      'Missed Beat 1 landing',
      'Lost groove after fill',
      ...base.diagnosticIssues,
    ].filter((value, index, all) => all.indexOf(value) === index),
  };
}

export function isQualifiedRudimentApplicationExercise(exercise: PracticeExercise): boolean {
  const mission = exercise.curriculumMission;
  return Boolean(
    mission?.pedagogyDomain === 'RUDIMENT' &&
    mission.stage === 'MUSICAL_APPLICATION' &&
    mission.musicalApplication === true &&
    mission.applicationKind === 'RUDIMENT_ORCHESTRATION' &&
    mission.applicationEvidenceVersion === C8_RUDIMENT_APPLICATION_EVIDENCE_VERSION &&
    exercise.challengeType === 'kit-orchestration'
  );
}
