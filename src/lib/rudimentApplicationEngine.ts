import {
  CompetencyTeachingDefinition,
  CurriculumCompetency,
  PracticeExercise,
  TeachingEventDef,
} from '../types';

/**
 * C9 — authoritative rudiment musical-application phrase.
 *
 * C8 correctly separated technical rudiment execution from musical application,
 * but its renderer could still inherit the generic curriculum structure and its
 * static memory grid could fall back to a word-split sentence. C9 makes the
 * phrase itself authoritative: 3 settled groove bars -> Bar 4 handoff/fill ->
 * Bar 5 Crash+Kick landing and immediate groove recovery.
 */
export const C8_RUDIMENT_APPLICATION_EVIDENCE_VERSION = 'C8_RUDIMENT_ORCHESTRATION_V1';
export const C9_RUDIMENT_APPLICATION_EVIDENCE_VERSION = 'C9_RUDIMENT_ORCHESTRATION_V2';

export interface RudimentApplicationPlan {
  version: typeof C9_RUDIMENT_APPLICATION_EVIDENCE_VERSION;
  kind: 'RUDIMENT_ORCHESTRATION';
  phraseModel: 'GROOVE_TO_FILL_TO_GROOVE';
  title: string;
  purpose: string;
  instructions: string;
  requiredPatternLabel: string;
  listeningTarget: string;
}

function grooveEventsForBar(bar: number, role: TeachingEventDef['role'] = 'groove'): TeachingEventDef[] {
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
      surface: downbeatSurfaces[0],
      surfaces: [...downbeatSurfaces],
      role,
      accent: false,
      label: beat === 1 || beat === 3 ? 'K + HH' : 'S + HH',
      description: `Steady groove downbeat on Beat ${beat}.`,
    });

    events.push({
      bar,
      beat,
      subdivision: 2,
      countToken: '&',
      hand: 'R',
      surface: 'hihat_closed',
      role,
      accent: false,
      label: 'HH',
      description: `Closed hi-hat on ${beat}&.`,
    });
  }
  return events;
}

function recoveryBarEvents(bar: number): TeachingEventDef[] {
  const recovery = grooveEventsForBar(bar, 'groove_return');
  return recovery.map((event) => {
    if (event.beat === 1 && event.subdivision === 0) {
      return {
        ...event,
        surface: 'crash',
        surfaces: ['crash', 'kick'],
        hand: 'BOTH',
        role: 'landing',
        accent: true,
        label: 'CRASH + KICK',
        description: 'Land Crash + Kick together on the next Beat 1, then recover the groove without hesitation.',
      };
    }
    return {
      ...event,
      role: 'groove_return',
      description: `Immediate groove recovery — ${event.description || event.label}`,
    };
  });
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
    // Preserve RLRR LRLL. Only accented lead notes leave the snare.
    if (event.accent || index === 0 || index === 4) return index < 4 ? 'tom_high' : 'tom_floor';
    return 'snare';
  }

  if (event.accent) return index < 4 ? 'tom_high' : 'tom_floor';
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
      description: `${source.hand} on ${surface.replaceAll('_', ' ')} — preserve the original rudiment sticking exactly.`,
    };
  });
}

function compactPattern(competencyId: string, base: CompetencyTeachingDefinition): string {
  if (competencyId === 'comp-rud-doubles') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beat 3 Snare RR → High Tom LL · Beat 4 Mid Tom RR → Floor Tom LL · Bar 5 Beat 1 Crash + Kick → recover groove';
  }
  if (competencyId === 'comp-rud-singles') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beats 3–4 alternating singles descend Snare → High Tom → Mid Tom → Floor Tom · Bar 5 Beat 1 Crash + Kick → recover groove';
  }
  if (competencyId === 'comp-rud-single-paradiddle') {
    return 'Bars 1–3 groove · Bar 4 Beats 1–2 groove · Beats 3–4 keep RLRR LRLL intact while accented lead notes move to toms · Bar 5 Beat 1 Crash + Kick → recover groove';
  }
  return `Bars 1–3 groove · Bar 4 Beats 1–2 groove · orchestrate ${base.sticking} across snare/toms · Bar 5 Beat 1 Crash + Kick → recover groove`;
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
    version: C9_RUDIMENT_APPLICATION_EVIDENCE_VERSION,
    kind: 'RUDIMENT_ORCHESTRATION',
    phraseModel: 'GROOVE_TO_FILL_TO_GROOVE',
    title: `${title} — Musical Orchestration`,
    purpose: `Transfer ${title} from pad mechanics into a real five-bar groove → rudiment fill → landing/recovery phrase without changing the sticking or pulse.`,
    instructions: `Bars 1–3: hold the groove steady. Bar 4: keep Beats 1–2 in the groove, then play the rudiment as a two-beat fill on Beats 3–4: ${pattern}. Bar 5 Beat 1: land Crash + Kick together and immediately recover the groove through the rest of the bar.`,
    requiredPatternLabel: pattern,
    listeningTarget: 'The groove must stay settled before the fill, the original sticking must remain recognizable while surfaces change, the next Beat 1 must land cleanly, and the recovery groove must return immediately without rushing.',
  };
}

export function buildRudimentApplicationDefinition(
  base: CompetencyTeachingDefinition,
  competencyId: string
): CompetencyTeachingDefinition {
  const grooveBars = [1, 2, 3].flatMap((bar) => grooveEventsForBar(bar));
  const bar4Groove = grooveEventsForBar(4).filter((event) => event.beat <= 2);
  const fillEvents = buildApplicationFillEvents(base, competencyId);
  const bar5Recovery = recoveryBarEvents(5);
  const pattern = compactPattern(competencyId, base);

  return {
    ...base,
    id: `${base.id}-c9-application`,
    title: `${base.title} — Musical Orchestration`,
    subdivisionDisplay: '8th-note groove → 16th-note rudiment fill → Beat-1 landing → groove recovery',
    bars: 5,
    sticking: pattern,
    limbPattern: `Preserve the original ${base.sticking} sticking while moving only the fill surfaces; keep the groove limbs unchanged before and after the fill.`,
    drumSurfaces: ['Closed Hi-Hat', 'Kick', 'Snare', 'High Tom', 'Mid Tom', 'Floor Tom', 'Crash'],
    events: [...grooveBars, ...bar4Groove, ...fillEvents, ...bar5Recovery],
    musicalExplanation: {
      ...base.musicalExplanation,
      whatAmILearning: `Turn ${base.title} into a complete musical phrase rather than repeating it as an isolated pad exercise.`,
      howIsItCounted: 'Bars 1–3: 1 & 2 & 3 & 4 &. Bar 4: keep 1 & 2 &, then count the rudiment fill as 3 e & a 4 e & a. Bar 5: land 1, then continue & 2 & 3 & 4 &.',
      handsAndFeet: `Keep the kick/snare/hi-hat groove relaxed, preserve ${base.sticking} exactly during the fill, then return immediately to the same groove limbs after the Crash + Kick landing.`,
      drumSurfaces: 'Closed hi-hat, kick and snare for the groove; snare and toms for the rudiment fill; Crash + Kick on Bar 5 Beat 1; then immediate groove recovery.',
      musicalApplication: pattern,
      whatToListenFor: 'No tempo lift before the fill, no sticking mutation during orchestration, a decisive Crash + Kick landing, and no hesitation when the groove returns.',
    },
    diagnosticIssues: [
      'Rudiment changed during orchestration',
      'Rushed fill entry',
      'Uneven orchestrated strokes',
      'Missed Crash + Kick Beat 1 landing',
      'Delayed groove recovery after landing',
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
    mission.applicationEvidenceVersion === C9_RUDIMENT_APPLICATION_EVIDENCE_VERSION &&
    exercise.challengeType === 'kit-orchestration'
  );
}
