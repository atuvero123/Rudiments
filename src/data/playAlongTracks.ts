export type PlayAlongMeter = '4/4' | '6/8';
export type PlayAlongCoachMode = 'GUIDED' | 'REDUCED' | 'PERFORMANCE';
export type PlayAlongApplicationMode =
  | 'GROOVE_ONLY'
  | 'THREE_PLUS_ONE'
  | 'SEVEN_PLUS_ONE'
  | 'HALF_BAR_FILL'
  | 'BEAT_FOUR_FILL'
  | 'MUSICAL_CHOICE'
  | 'FREE_PLAY';

export type SectionCue = 'NO_FILL' | 'SHORT_FILL' | 'BUILD' | 'CRASH_ONLY' | 'FREE';

export interface PlayAlongSection {
  id: string;
  name: string;
  bars: number;
  energy: 1 | 2 | 3 | 4;
  chordProgression: string[];
  grooveHint: string;
  transitionCue: SectionCue;
  coachingNote: string;
}

export interface PlayAlongVariation {
  id: string;
  label: string;
  description: string;
  prerequisiteCompetencyIds: string[];
  kind: 'groove' | 'fill' | 'dynamic' | 'restraint';
}

export interface PlayAlongTrack {
  id: string;
  title: string;
  subtitle: string;
  style: string;
  meter: PlayAlongMeter;
  bpm: number;
  key: string;
  difficulty: 'Beginner' | 'Intermediate';
  targetCompetencyIds: string[];
  recommendedForCompetencyIds: string[];
  whyUseIt: string;
  sections: PlayAlongSection[];
  variations: PlayAlongVariation[];
}

export const PLAY_ALONG_TRACKS: PlayAlongTrack[] = [
  {
    id: 'pa-slow-ballad-64',
    title: 'Slow 4/4 Ballad',
    subtitle: 'Pulse, backbeat, restraint & Beat-1 confidence',
    style: 'Ballad / Pop',
    meter: '4/4',
    bpm: 64,
    key: 'G',
    difficulty: 'Beginner',
    targetCompetencyIds: ['comp-pulse-quarter', 'comp-subdiv-8th', 'comp-meter-44'],
    recommendedForCompetencyIds: [
      'comp-pulse-quarter',
      'comp-subdiv-8th',
      'comp-meter-44',
      'comp-reading-notation',
    ],
    whyUseIt: 'A spacious no-drum musical bed that exposes rushing and dragging. Ideal before the drummer adds a full groove.',
    sections: [
      {
        id: 'intro', name: 'Intro', bars: 4, energy: 1,
        chordProgression: ['G', 'D', 'Em', 'C'],
        grooveHint: 'Quarter-note pulse only. Feel four equal beats.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Do not decorate the intro. Let the pulse settle first.',
      },
      {
        id: 'verse', name: 'Verse', bars: 8, energy: 1,
        chordProgression: ['G', 'D', 'Em', 'C'],
        grooveHint: 'Keep the pulse steady; add a soft backbeat only if already verified.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Restraint is the lesson here. Stay under the imagined vocal.',
      },
      {
        id: 'chorus', name: 'Chorus', bars: 8, energy: 2,
        chordProgression: ['C', 'G', 'D', 'Em'],
        grooveHint: 'Slightly stronger pulse. Keep tempo identical while energy rises.',
        transitionCue: 'CRASH_ONLY',
        coachingNote: 'Lift the section with dynamics, not extra notes.',
      },
      {
        id: 'outro', name: 'Outro', bars: 4, energy: 1,
        chordProgression: ['G', 'D', 'C', 'G'],
        grooveHint: 'Return to simple pulse and finish calmly.',
        transitionCue: 'NO_FILL',
        coachingNote: 'End with control. Do not rush the final two bars.',
      },
    ],
    variations: [
      {
        id: 'pulse-only', label: 'Quarter-note pulse',
        description: 'Play one relaxed stroke per beat and make the click disappear beneath your stroke.',
        prerequisiteCompetencyIds: [], kind: 'groove',
      },
      {
        id: '8th-count', label: 'Count eighths internally',
        description: 'Keep playing quarter notes while internally hearing 1 & 2 & 3 & 4 &.',
        prerequisiteCompetencyIds: ['comp-subdiv-8th'], kind: 'groove',
      },
      {
        id: 'no-fill', label: 'Choose no fill',
        description: 'Cross a section boundary without filling; use a controlled dynamic change instead.',
        prerequisiteCompetencyIds: [], kind: 'restraint',
      },
    ],
  },
  {
    id: 'pa-worship-ballad-68',
    title: '4/4 Worship Ballad',
    subtitle: 'Groove → transition → chorus lift',
    style: 'Worship',
    meter: '4/4',
    bpm: 68,
    key: 'D',
    difficulty: 'Beginner',
    targetCompetencyIds: [
      'comp-grv-backbeat',
      'comp-grv-stability',
      'comp-grv-kick-variation',
      'comp-dyn-song-balance',
      'comp-fill-entry',
      'comp-fill-recovery',
    ],
    recommendedForCompetencyIds: [
      'comp-grv-backbeat',
      'comp-grv-stability',
      'comp-grv-kick-variation',
      'comp-dyn-song-balance',
      'comp-fill-quarter',
      'comp-fill-8th',
      'comp-fill-entry',
      'comp-fill-recovery',
      'comp-perf-song-app',
    ],
    whyUseIt: 'A church-style arrangement for learning how to preserve pocket while verses, choruses and transitions change around you.',
    sections: [
      {
        id: 'intro', name: 'Intro', bars: 4, energy: 1,
        chordProgression: ['D', 'A', 'Bm', 'G'],
        grooveHint: 'Simple pulse or soft 8th-note groove.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Let the song establish itself before adding vocabulary.',
      },
      {
        id: 'verse', name: 'Verse', bars: 8, energy: 1,
        chordProgression: ['D', 'A', 'Bm', 'G'],
        grooveHint: 'Closed hats, steady backbeat, simple kick placement.',
        transitionCue: 'SHORT_FILL',
        coachingNote: 'Keep the imagined vocal clear. One short transition is enough.',
      },
      {
        id: 'chorus', name: 'Chorus', bars: 8, energy: 3,
        chordProgression: ['G', 'D', 'A', 'Bm'],
        grooveHint: 'Open the cymbal texture slightly; keep the same pocket.',
        transitionCue: 'CRASH_ONLY',
        coachingNote: 'Energy rises, but the tempo must not.',
      },
      {
        id: 'bridge', name: 'Bridge Build', bars: 8, energy: 2,
        chordProgression: ['Bm', 'G', 'D', 'A'],
        grooveHint: 'Build gradually across the section instead of peaking in bar 1.',
        transitionCue: 'BUILD',
        coachingNote: 'Think long-range dynamics: low → medium → strong.',
      },
      {
        id: 'final', name: 'Final Chorus', bars: 8, energy: 4,
        chordProgression: ['G', 'D', 'A', 'Bm'],
        grooveHint: 'Strongest version of the groove; preserve clean 2 & 4.',
        transitionCue: 'FREE',
        coachingNote: 'Use only vocabulary you can execute without disturbing the song.',
      },
      {
        id: 'outro', name: 'Outro', bars: 4, energy: 1,
        chordProgression: ['G', 'A', 'D', 'D'],
        grooveHint: 'Reduce density and finish together with the band.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Musical maturity includes knowing how to come down.',
      },
    ],
    variations: [
      {
        id: 'base-groove', label: 'Basic backbeat groove',
        description: '8th-note hats, snare on 2 & 4, simple kick on 1 and 3.',
        prerequisiteCompetencyIds: ['comp-grv-backbeat', 'comp-grv-stability'], kind: 'groove',
      },
      {
        id: 'kick-var', label: 'Kick variation',
        description: 'Add one approved syncopated kick while keeping the backbeat unchanged.',
        prerequisiteCompetencyIds: ['comp-grv-kick-variation'], kind: 'groove',
      },
      {
        id: 'quarter-fill', label: 'Quarter-note transition fill',
        description: 'Use four deliberate notes in the final bar and land beat 1 confidently.',
        prerequisiteCompetencyIds: ['comp-fill-quarter', 'comp-fill-recovery'], kind: 'fill',
      },
      {
        id: '8th-fill', label: 'Eighth-note transition fill',
        description: 'Move even 8ths around the kit without squeezing the final note before beat 1.',
        prerequisiteCompetencyIds: ['comp-fill-8th', 'comp-fill-recovery'], kind: 'fill',
      },
      {
        id: 'dynamic-lift', label: 'Dynamic lift',
        description: 'Raise energy with cymbal texture and stroke height rather than a busier groove.',
        prerequisiteCompetencyIds: ['comp-dyn-song-balance'], kind: 'dynamic',
      },
    ],
  },
  {
    id: 'pa-medium-worship-78',
    title: 'Medium 4/4 Worship',
    subtitle: 'Kick variations, builds & phrase-length choices',
    style: 'Worship / Pop Rock',
    meter: '4/4',
    bpm: 78,
    key: 'A',
    difficulty: 'Intermediate',
    targetCompetencyIds: [
      'comp-subdiv-16th',
      'comp-time-syncopation',
      'comp-dyn-build',
      'comp-fill-restraint',
      'comp-perf-song-arrangement-int',
    ],
    recommendedForCompetencyIds: [
      'comp-subdiv-16th',
      'comp-time-syncopation',
      'comp-time-syncopation',
      'comp-dyn-build',
      'comp-fill-restraint',
      'comp-perf-song-arrangement-int',
    ],
    whyUseIt: 'A faster arrangement for choosing fill lengths, handling builds and keeping syncopated kick ideas inside a stable song form.',
    sections: [
      {
        id: 'intro', name: 'Intro', bars: 4, energy: 2,
        chordProgression: ['A', 'E', 'F#m', 'D'],
        grooveHint: 'Solid 8ths; establish the pocket before adding syncopation.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Give the listener the groove before you vary it.',
      },
      {
        id: 'verse', name: 'Verse', bars: 8, energy: 1,
        chordProgression: ['A', 'E', 'F#m', 'D'],
        grooveHint: 'Lower dynamic, selective kick variation.',
        transitionCue: 'SHORT_FILL',
        coachingNote: 'One short fill is more musical than filling every phrase.',
      },
      {
        id: 'pre', name: 'Pre-Chorus', bars: 4, energy: 2,
        chordProgression: ['F#m', 'D', 'A', 'E'],
        grooveHint: 'Gradually open the sound and prepare the chorus.',
        transitionCue: 'BUILD',
        coachingNote: 'Make the last bar feel inevitable, not rushed.',
      },
      {
        id: 'chorus', name: 'Chorus', bars: 8, energy: 4,
        chordProgression: ['D', 'A', 'E', 'F#m'],
        grooveHint: 'Strong backbeat and controlled syncopated kick.',
        transitionCue: 'FREE',
        coachingNote: 'Choose a fill only if it improves the transition.',
      },
      {
        id: 'breakdown', name: 'Breakdown', bars: 4, energy: 1,
        chordProgression: ['F#m', 'D', 'A', 'E'],
        grooveHint: 'Strip the groove down. Space is part of the arrangement.',
        transitionCue: 'NO_FILL',
        coachingNote: 'This is a deliberate no-fill checkpoint.',
      },
      {
        id: 'final', name: 'Final Chorus', bars: 8, energy: 4,
        chordProgression: ['D', 'A', 'E', 'F#m'],
        grooveHint: 'Fullest groove while preserving internal subdivision.',
        transitionCue: 'FREE',
        coachingNote: 'Make creative choices without abandoning the pocket.',
      },
    ],
    variations: [
      {
        id: 'sync-kick', label: 'Syncopated kick option',
        description: 'Choose one offbeat kick placement and repeat it consistently across the phrase.',
        prerequisiteCompetencyIds: ['comp-time-syncopation'], kind: 'groove',
      },
      {
        id: '16th-feel', label: 'Internal 16th grid',
        description: 'Keep the groove sparse while internally counting all 16th subdivisions.',
        prerequisiteCompetencyIds: ['comp-subdiv-16th'], kind: 'groove',
      },
      {
        id: 'restraint', label: 'No-fill decision',
        description: 'Choose one transition where you deliberately play no fill and support the band with dynamics only.',
        prerequisiteCompetencyIds: ['comp-fill-restraint'], kind: 'restraint',
      },
      {
        id: 'build', label: 'Four-bar dynamic build',
        description: 'Increase energy every bar without increasing tempo or note density too quickly.',
        prerequisiteCompetencyIds: ['comp-dyn-build'], kind: 'dynamic',
      },
    ],
  },
  {
    id: 'pa-68-worship-58',
    title: '6/8 Worship Ballad',
    subtitle: 'Two-pulse feel, 6/8 groove & musical fills',
    style: 'Worship / Ballad',
    meter: '6/8',
    bpm: 58,
    key: 'C',
    difficulty: 'Intermediate',
    targetCompetencyIds: ['comp-meter-68', 'comp-subdiv-triplets', 'comp-style-worship-68'],
    recommendedForCompetencyIds: [
      'comp-meter-68',
      'comp-subdiv-triplets',
      'comp-style-worship-68',
      'comp-rud-six-stroke',
    ],
    whyUseIt: 'A slow 6/8 musical bed that reinforces the two large pulses (1 and 4) before adding fills or rudimental vocabulary.',
    sections: [
      {
        id: 'intro', name: 'Intro', bars: 4, energy: 1,
        chordProgression: ['C', 'G', 'Am', 'F'],
        grooveHint: 'Feel 1-2-3 / 4-5-6. Do not flatten all six notes equally.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Lock the two-pulse shape before adding a full groove.',
      },
      {
        id: 'verse', name: 'Verse', bars: 8, energy: 1,
        chordProgression: ['C', 'G', 'Am', 'F'],
        grooveHint: 'Gentle 6/8 groove with clear backbeat on 4.',
        transitionCue: 'SHORT_FILL',
        coachingNote: 'Keep fills inside the 6/8 subdivision rather than switching to 4/4 thinking.',
      },
      {
        id: 'chorus', name: 'Chorus', bars: 8, energy: 3,
        chordProgression: ['F', 'C', 'G', 'Am'],
        grooveHint: 'Open the texture while preserving the two large pulses.',
        transitionCue: 'CRASH_ONLY',
        coachingNote: 'Let beat 4 remain a strong internal landmark.',
      },
      {
        id: 'bridge', name: 'Bridge Build', bars: 8, energy: 2,
        chordProgression: ['Am', 'F', 'C', 'G'],
        grooveHint: 'Build gradually across eight bars.',
        transitionCue: 'BUILD',
        coachingNote: 'Keep counting internally even while dynamics grow.',
      },
      {
        id: 'outro', name: 'Outro', bars: 4, energy: 1,
        chordProgression: ['F', 'G', 'C', 'C'],
        grooveHint: 'Return to simple two-pulse feel.',
        transitionCue: 'NO_FILL',
        coachingNote: 'Finish with space and a confident final landing.',
      },
    ],
    variations: [
      {
        id: 'two-pulse', label: 'Two-pulse 6/8 feel',
        description: 'Emphasize counts 1 and 4 while allowing 2-3 and 5-6 to flow underneath.',
        prerequisiteCompetencyIds: ['comp-meter-68'], kind: 'groove',
      },
      {
        id: '68-groove', label: 'Basic 6/8 worship groove',
        description: 'Keep the cymbal pulse flowing and place the backbeat firmly on count 4.',
        prerequisiteCompetencyIds: ['comp-style-worship-68'], kind: 'groove',
      },
      {
        id: 'sixstroke', label: 'Six-stroke 6/8 application',
        description: 'Use a six-note phrase only if the six-stroke competency is already verified.',
        prerequisiteCompetencyIds: ['comp-rud-six-stroke'], kind: 'fill',
      },
    ],
  },
];

export function getPlayAlongById(id: string): PlayAlongTrack | undefined {
  return PLAY_ALONG_TRACKS.find((track) => track.id === id);
}

export function recommendPlayAlongForCompetency(competencyId?: string | null): PlayAlongTrack {
  if (competencyId) {
    const exact = PLAY_ALONG_TRACKS.find((track) => track.recommendedForCompetencyIds.includes(competencyId));
    if (exact) return exact;
  }
  return PLAY_ALONG_TRACKS[0];
}
