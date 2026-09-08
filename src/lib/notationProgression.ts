import { CompetencyTeachingDefinition, TeachingEventDef } from '../types';

type Voice = 'kick' | 'snare' | 'hihat_closed';

const tokenFor = (beat: number, subdivision: number) =>
  subdivision === 0 ? String(beat) : '&';

function hit(
  bar: number,
  beat: number,
  subdivision: number,
  voices: Voice[],
  accent = false,
  description?: string
): TeachingEventDef {
  const hasKick = voices.includes('kick');
  const hasSnare = voices.includes('snare');
  const hasHat = voices.includes('hihat_closed');
  const primary: Voice = hasSnare ? 'snare' : hasKick ? 'kick' : 'hihat_closed';
  const hand: TeachingEventDef['hand'] =
    voices.length > 1 ? 'BOTH' : primary === 'kick' ? 'K' : primary === 'snare' ? 'L' : 'R';
  const short = [hasKick ? 'K' : '', hasSnare ? 'S' : '', hasHat ? 'HH' : ''].filter(Boolean).join('+');

  return {
    bar,
    beat,
    subdivision,
    countToken: tokenFor(beat, subdivision),
    hand,
    surface: primary,
    surfaces: voices,
    accent,
    label: short,
    description: description || `${short} on ${tokenFor(beat, subdivision)} of bar ${bar}`,
  };
}

function basicBar(bar: number): TeachingEventDef[] {
  const events: TeachingEventDef[] = [];
  for (let beat = 1; beat <= 4; beat += 1) {
    events.push(hit(bar, beat, 0, beat === 1 || beat === 3 ? ['kick', 'hihat_closed'] : ['snare', 'hihat_closed'], beat === 2 || beat === 4));
    events.push(hit(bar, beat, 1, ['hihat_closed']));
  }
  return events;
}

function restAwarenessBar(bar: number): TeachingEventDef[] {
  // Deliberate written spaces: no event means a rest/silence at that slot.
  return [
    hit(bar, 1, 0, ['kick', 'hihat_closed'], true),
    hit(bar, 1, 1, ['hihat_closed']),
    hit(bar, 2, 0, ['snare', 'hihat_closed'], true),
    // 2-& silent
    hit(bar, 3, 0, ['hihat_closed']),
    hit(bar, 3, 1, ['kick', 'hihat_closed']),
    hit(bar, 4, 0, ['snare', 'hihat_closed'], true),
    hit(bar, 4, 1, ['hihat_closed']),
  ];
}

function syncopationBar(bar: number): TeachingEventDef[] {
  return [
    hit(bar, 1, 0, ['kick', 'hihat_closed'], true),
    hit(bar, 1, 1, ['hihat_closed']),
    hit(bar, 2, 0, ['snare', 'hihat_closed'], true),
    hit(bar, 2, 1, ['kick', 'hihat_closed']),
    hit(bar, 3, 0, ['hihat_closed']),
    hit(bar, 3, 1, ['hihat_closed']),
    hit(bar, 4, 0, ['snare', 'hihat_closed'], true),
    hit(bar, 4, 1, ['kick', 'hihat_closed']),
  ];
}

function mixedReadingBar(bar: number): TeachingEventDef[] {
  return [
    hit(bar, 1, 0, ['kick', 'hihat_closed'], true),
    // 1-& silent
    hit(bar, 2, 0, ['snare', 'hihat_closed'], true),
    hit(bar, 2, 1, ['hihat_closed']),
    hit(bar, 3, 0, ['kick', 'hihat_closed']),
    hit(bar, 3, 1, ['hihat_closed']),
    hit(bar, 4, 0, ['snare', 'hihat_closed'], true),
    // 4-& silent
  ];
}

/**
 * C7.3 notation-specific curriculum depth.
 * The learner sees progressively less predictable written material as the six
 * canonical missions advance. The staff remains the source of truth; this is
 * intentionally not converted into R/L sticking mnemonics.
 */
export function buildNotationProgressionDefinition(
  base: CompetencyTeachingDefinition,
  missionNumber = 1
): CompetencyTeachingDefinition {
  const level = Math.max(1, Math.min(6, missionNumber));

  let bars = 1;
  let events = basicBar(1);
  let standardText = 'Identify kick, snare and closed hi-hat voices on one written bar';

  if (level === 2) {
    events = basicBar(1);
    standardText = 'Count one written 8th-note bar left to right without converting it into a sticking';
  } else if (level === 3) {
    bars = 2;
    events = [...basicBar(1), ...restAwarenessBar(2)];
    standardText = 'Track two written bars, including a silent 8th-note space, while hearing the exact staff voices';
  } else if (level === 4) {
    bars = 2;
    events = [...basicBar(1), ...syncopationBar(2)];
    standardText = 'Read and play a two-bar phrase with simultaneous voices and an off-beat kick';
  } else if (level === 5) {
    bars = 4;
    events = [
      ...basicBar(1),
      ...restAwarenessBar(2),
      ...syncopationBar(3),
      ...mixedReadingBar(4),
    ];
    standardText = 'Sight-read four changing bars with metronome only; preserve rests, voices and timing';
  } else if (level === 6) {
    bars = 4;
    events = [
      ...restAwarenessBar(1),
      ...syncopationBar(2),
      ...mixedReadingBar(3),
      ...basicBar(4),
    ];
    standardText = 'Read a short four-bar musical chart continuously without memorizing the pattern';
  }

  return {
    ...base,
    bars,
    events,
    sticking: 'Read the staff — no sticking mnemonic',
    limbPattern: 'Read each written drum voice at its staff position and play only what is notated',
    certificationTempo: {
      ...base.certificationTempo,
      standardText,
    },
    musicalExplanation: {
      ...base.musicalExplanation,
      howIsItCounted:
        level <= 2
          ? 'Count “1 & 2 & 3 & 4 &” under the written bar while your eyes stay on the note positions.'
          : 'Keep the 8th-note count internally while reading across barlines. Silent written spaces remain silent; simultaneous noteheads land together.',
      whatToListenFor:
        level <= 2
          ? 'Match each visible staff voice to the correct drum sound and keep the count even.'
          : 'Hear the difference between written hits and written space. Do not fill rests from memory, and keep each bar connected to the next.',
    },
    commonMistakes: [
      'Looking away from the staff and continuing from memory',
      'Playing through a written rest instead of leaving space',
      'Missing an off-beat written voice while the pulse continues',
      'Flamming simultaneous written voices instead of landing them together',
    ],
  };
}


/**
 * C7.10 formal notation verification chart.
 *
 * The certification standard is eight continuous bars. This chart is authored
 * independently from the guided mission display and deliberately includes
 * changing voice/rest combinations so the learner must actually read.
 */
export function buildNotationVerificationDefinition(
  base: CompetencyTeachingDefinition
): CompetencyTeachingDefinition {
  const events = [
    ...basicBar(1),
    ...restAwarenessBar(2),
    ...syncopationBar(3),
    ...mixedReadingBar(4),
    ...restAwarenessBar(5),
    ...basicBar(6),
    ...mixedReadingBar(7),
    ...syncopationBar(8),
  ];

  return {
    ...base,
    bars: 8,
    events,
    sticking: 'Formal staff reading — no sticking mnemonic',
    limbPattern: 'Read only the written staff voices',
    certificationTempo: {
      ...base.certificationTempo,
      standardText: 'Sight-read 8 bars of basic notation at 70 BPM',
    },
  };
}
