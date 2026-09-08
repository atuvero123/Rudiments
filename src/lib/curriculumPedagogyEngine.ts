import {
  AssistanceLevel,
  CompetencyTeachingDefinition,
  CurriculumCompetency,
  CurriculumPatternDisplay,
  DrumVoiceId,
  PracticeEquipment,
  TeachingEventDef,
} from '../types';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_COMPETENCIES_BY_SKILL_ID,
} from '../data/canonicalCurriculum';

export type CurriculumPedagogyDomain =
  | 'PULSE_SUBDIVISION'
  | 'METER_FORM'
  | 'READING'
  | 'GROOVE'
  | 'RUDIMENT'
  | 'FILL_TRANSITION'
  | 'COORDINATION'
  | 'DYNAMICS'
  | 'PERFORMANCE'
  | 'STYLE';

export interface CurriculumPedagogyProfile {
  domain: CurriculumPedagogyDomain;
  patternDisplay: CurriculumPatternDisplay;
  preferredEquipment: PracticeEquipment;
  conceptualFocus: string;
  listeningFocus: string;
  musicalTransfer: string;
  diagnosticIssues: string[];
  missionLabels: [string, string, string, string, string, string];
  evidenceLabels: [string, string, string, string, string, string];
}

const DOMAIN_PROFILES: Record<CurriculumPedagogyDomain, Omit<CurriculumPedagogyProfile, 'domain'>> = {
  PULSE_SUBDIVISION: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Both',
    conceptualFocus: 'Hear the subdivision grid before adding complexity.',
    listeningFocus: 'Even spacing, stable pulse and no rushing between click points.',
    musicalTransfer: 'Carry the subdivision underneath a simple groove or song pulse.',
    diagnosticIssues: ['spacing drift', 'rushing subdivisions', 'losing the click', 'tension'],
    missionLabels: ['Understand the Grid', 'Count It Aloud', 'Hear the Grid', 'Follow the Pulse', 'Own It Independently', 'Use It Musically'],
    evidenceLabels: ['Grid understood', 'Counting controlled', 'Aural grid recognized', 'Guided timing stable', 'Independent timing clean', 'Subdivision used musically'],
  },
  METER_FORM: {
    patternDisplay: 'BAR_STRUCTURE', preferredEquipment: 'Both',
    conceptualFocus: 'Track beat position, bar boundaries and larger phrase structure.',
    listeningFocus: 'Know where Beat 1 and phrase landmarks are without altering tempo.',
    musicalTransfer: 'Stay oriented through real section lengths and arrangement changes.',
    diagnosticIssues: ['lost bar number', 'dropped beat', 'rushed barline', 'lost phrase'],
    missionLabels: ['Feel the Measure', 'Count the Measure', 'Hear the Barline', 'Track the Phrase', 'Own the Form', 'Follow a Musical Form'],
    evidenceLabels: ['Meter understood', 'Counting controlled', 'Barline heard', 'Phrase tracking stable', 'Independent form clean', 'Form used musically'],
  },
  READING: {
    patternDisplay: 'NOTATION', preferredEquipment: 'Both',
    conceptualFocus: 'Translate written rhythmic symbols into counted sound before playing.',
    listeningFocus: 'Written durations and rests must sound exactly as they are notated.',
    musicalTransfer: 'Read a short chart while preserving pulse, dynamics and musical continuity.',
    diagnosticIssues: ['symbol confusion', 'missed rest', 'lost place in chart', 'reading ahead failure'],
    missionLabels: ['Decode the Symbols', 'Count the Line', 'Hear the Written Rhythm', 'Read With Guidance', 'Sight-Read Independently', 'Read in Musical Context'],
    evidenceLabels: ['Symbols understood', 'Chart counted', 'Written rhythm recognized', 'Guided reading stable', 'Independent reading clean', 'Chart used musically'],
  },
  GROOVE: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Full Drum Kit',
    conceptualFocus: 'Understand each limb role and the pocket relationship between them.',
    listeningFocus: 'Backbeat, kick and timekeeping voice remain stable without one limb disturbing another.',
    musicalTransfer: 'Hold the groove through a phrase while responding to section dynamics.',
    diagnosticIssues: ['backbeat drift', 'kick/hand collision', 'hi-hat stutter', 'dynamic imbalance'],
    missionLabels: ['Map the Limb Roles', 'Count the Groove', 'Hear the Pocket', 'Follow the Groove', 'Hold the Groove Alone', 'Serve the Song'],
    evidenceLabels: ['Limb map understood', 'Groove counted', 'Pocket recognized', 'Guided groove stable', 'Independent groove clean', 'Groove serves music'],
  },
  RUDIMENT: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Practice Pad',
    conceptualFocus: 'Learn the sticking, rebound and accent logic before raising speed.',
    listeningFocus: 'Even note spacing, matched hands, rebound and relaxed sound quality.',
    musicalTransfer: 'Move the rudiment from pad mechanics into a fill, groove or orchestration context.',
    diagnosticIssues: ['uneven hands', 'crushed rebound', 'accent collapse', 'grip tension'],
    missionLabels: ['Map the Sticking', 'Count the Sticking', 'Hear the Stroke Shape', 'Follow the Motion', 'Play It Clean Alone', 'Orchestrate It Musically'],
    evidenceLabels: ['Sticking understood', 'Rudiment counted', 'Stroke shape recognized', 'Guided mechanics stable', 'Independent rudiment clean', 'Rudiment applied musically'],
  },
  FILL_TRANSITION: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Full Drum Kit',
    conceptualFocus: 'Place the fill inside a phrase with a precise entry and recovery point.',
    listeningFocus: 'The groove before and after the fill must remain as stable as the fill itself.',
    musicalTransfer: 'Use the fill only where the phrase asks for it and land the next section cleanly.',
    diagnosticIssues: ['early fill entry', 'rushed fill', 'missed landing', 'lost groove after fill'],
    missionLabels: ['Map Entry & Landing', 'Count the Fill Window', 'Hear the Transition', 'Follow Groove-to-Fill', 'Land It Independently', 'Choose It Musically'],
    evidenceLabels: ['Placement understood', 'Fill window counted', 'Transition recognized', 'Guided landing stable', 'Independent landing clean', 'Fill choice musical'],
  },
  COORDINATION: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Both',
    conceptualFocus: 'Understand which limb owns each note and where simultaneous notes are or are not allowed.',
    listeningFocus: 'No limb pulls another off time; each voice remains deliberate and even.',
    musicalTransfer: 'Insert the coordination pattern into a playable groove or phrase instead of treating it as a puzzle.',
    diagnosticIssues: ['limb collision', 'kick hesitation', 'hand-foot flam', 'pattern breakdown'],
    missionLabels: ['Map the Limbs', 'Count the Coordination', 'Hear the Interlock', 'Follow the Limb Flow', 'Coordinate Independently', 'Use It in a Groove'],
    evidenceLabels: ['Limb map understood', 'Coordination counted', 'Interlock recognized', 'Guided coordination stable', 'Independent coordination clean', 'Coordination used musically'],
  },
  DYNAMICS: {
    patternDisplay: 'SUGGESTED', preferredEquipment: 'Both',
    conceptualFocus: 'Separate timing from volume so dynamics can change without disturbing the pulse.',
    listeningFocus: 'Clear contrast between soft and strong voices with unchanged timing.',
    musicalTransfer: 'Shape a verse, build or chorus with intentional dynamic contour.',
    diagnosticIssues: ['tempo changes with volume', 'flat dynamics', 'cymbal wash', 'accent inconsistency'],
    missionLabels: ['Map the Dynamic Range', 'Count Through Changes', 'Hear the Contrast', 'Follow the Dynamic Shape', 'Control Dynamics Alone', 'Shape a Section'],
    evidenceLabels: ['Dynamic intent understood', 'Pulse survives change', 'Contrast recognized', 'Guided dynamics stable', 'Independent dynamics clean', 'Dynamics shape music'],
  },
  PERFORMANCE: {
    patternDisplay: 'NONE', preferredEquipment: 'Full Drum Kit',
    conceptualFocus: 'Understand arrangement responsibility, restraint and section-to-section continuity.',
    listeningFocus: 'Time, transitions and dynamics serve the complete musical form.',
    musicalTransfer: 'Perform a complete arrangement while making controlled musical decisions.',
    diagnosticIssues: ['overplaying', 'missed section', 'transition hesitation', 'dynamic mismatch'],
    missionLabels: ['Map the Arrangement', 'Count the Sections', 'Hear the Song Form', 'Follow the Arrangement', 'Perform Independently', 'Make Musical Choices'],
    evidenceLabels: ['Arrangement understood', 'Sections counted', 'Form recognized', 'Guided performance stable', 'Independent performance clean', 'Musical decisions controlled'],
  },
  STYLE: {
    patternDisplay: 'REQUIRED', preferredEquipment: 'Full Drum Kit',
    conceptualFocus: 'Identify the rhythmic identity and signature limb relationships of the style.',
    listeningFocus: 'The groove should sound stylistically convincing, not merely technically correct.',
    musicalTransfer: 'Use the style vocabulary in a short arrangement with appropriate restraint and dynamics.',
    diagnosticIssues: ['generic feel', 'wrong accent placement', 'style pulse lost', 'overplaying'],
    missionLabels: ['Identify the Style DNA', 'Count the Style Grid', 'Hear the Feel', 'Follow the Style Groove', 'Hold the Feel Alone', 'Play a Style Arrangement'],
    evidenceLabels: ['Style DNA understood', 'Style grid counted', 'Feel recognized', 'Guided style stable', 'Independent style clean', 'Style used musically'],
  },
};

export function getCurriculumPedagogyDomain(competency: CurriculumCompetency): CurriculumPedagogyDomain {
  const id = competency.id;
  if (id.includes('reading') || id.includes('read-')) return 'READING';
  if (id.includes('meter-') && !id.includes('subdiv')) return 'METER_FORM';
  if (id.includes('subdiv') || id.includes('pulse-quarter') || id.includes('time-syncopation')) return 'PULSE_SUBDIVISION';
  if (id.includes('grv-')) return 'GROOVE';
  if (id.includes('rud-')) return 'RUDIMENT';
  if (id.includes('fill-')) return 'FILL_TRANSITION';
  if (id.includes('coord-')) return 'COORDINATION';
  if (id.includes('dyn-')) return 'DYNAMICS';
  if (id.includes('perf-')) return 'PERFORMANCE';
  if (id.includes('style-')) return 'STYLE';
  return 'PULSE_SUBDIVISION';
}

export function getCurriculumPedagogyProfile(competency: CurriculumCompetency): CurriculumPedagogyProfile {
  const domain = getCurriculumPedagogyDomain(competency);

  // C7.16 — Musical Balance & Cymbal Sensitivity has a required acoustic
  // hierarchy, not merely an optional accent idea. Keep the generic DYNAMICS
  // family flexible for later competencies, but make this canonical skill
  // explicit so its journey, visual reference and evidence all teach the same
  // soft-cymbal / firm-kick-and-snare relationship.
  if (competency.id === 'comp-dyn-song-balance') {
    return {
      domain,
      ...DOMAIN_PROFILES.DYNAMICS,
      patternDisplay: 'REQUIRED',
      preferredEquipment: 'Full Drum Kit',
      conceptualFocus: 'Build a three-voice volume hierarchy: quiet cymbal timekeeping underneath a firm snare backbeat and clear kick.',
      listeningFocus: 'The kick and snare remain easy to hear while the hi-hat supports the pulse without becoming the loudest continuous voice.',
      musicalTransfer: 'Shape verse-to-chorus energy without letting cymbal volume or tempo rise uncontrollably.',
      diagnosticIssues: ['cymbal wash', 'flat dynamics', 'backbeat buried', 'tempo changes with volume', 'accent inconsistency'],
      missionLabels: ['Map the Volume Hierarchy', 'Count Without Swelling', 'Hear the Balance', 'Follow the Dynamic Shape', 'Balance the Kit Alone', 'Shape Verse & Chorus'],
      evidenceLabels: ['Volume hierarchy understood', 'Pulse survives dynamics', 'Balance recognized', 'Guided balance stable', 'Independent balance clean', 'Dynamics serve the song'],
    };
  }

  return { domain, ...DOMAIN_PROFILES[domain] };
}

export function findCanonicalCompetency(identifier: string): CurriculumCompetency | null {
  if (!identifier) return null;
  const direct = CURRICULUM_COMPETENCIES_BY_ID.get(identifier) || CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(identifier);
  if (direct) return direct;
  const lower = identifier.toLowerCase();
  return CANONICAL_CURRICULUM_COMPETENCIES.find((comp) =>
    comp.title.toLowerCase() === lower ||
    lower.includes(comp.title.toLowerCase()) ||
    comp.title.toLowerCase().includes(lower)
  ) || null;
}

function inferMeter(competency: CurriculumCompetency): string {
  const id = competency.id;
  if (id.includes('meter-68') || id.includes('worship-68')) return '6/8';
  if (id.includes('meter-34')) return '3/4';
  if (id.includes('meter-54')) return '5/4';
  if (id.includes('meter-78')) return '7/8';
  if (id.includes('meter-128')) return '12/8';
  return '4/4';
}

function beatsForMeter(meter: string): number {
  if (meter === '6/8') return 6;
  if (meter === '3/4') return 3;
  if (meter === '5/4') return 5;
  if (meter === '7/8') return 7;
  if (meter === '12/8') return 12;
  return 4;
}

function normalizeSubdivision(competency: CurriculumCompetency): CompetencyTeachingDefinition['subdivision'] {
  const text = `${competency.subdivision} ${competency.tempoStandard.subdivision}`.toLowerCase();
  if (text.includes('32')) return '32nd Notes';
  if (text.includes('16')) return '16th Notes';
  if (text.includes('triplet')) return 'Triplets';
  if (text.includes('6/8') || text.includes('compound')) return '6/8 Compound';
  if (text.includes('8th') || text.includes('eighth')) return '8th Notes';
  return 'Quarter Notes';
}

function subdivisionCount(subdivision: CompetencyTeachingDefinition['subdivision']): number {
  if (subdivision === '8th Notes') return 2;
  if (subdivision === '16th Notes') return 4;
  if (subdivision === 'Triplets') return 3;
  if (subdivision === '6/8 Compound') return 3;
  if (subdivision === '32nd Notes') return 8;
  return 1;
}

function countTokensFor(meter: string, subdivision: CompetencyTeachingDefinition['subdivision']): string[] {
  const beats = beatsForMeter(meter);
  if (meter === '6/8') return ['1', 'la', 'li', '2', 'la', 'li'];
  if (meter === '12/8') return ['1', 'trip', 'let', '2', 'trip', 'let', '3', 'trip', 'let', '4', 'trip', 'let'];
  if (subdivision === '16th Notes') return Array.from({ length: beats }, (_, i) => [`${i + 1}`, 'e', '&', 'a']).flat();
  if (subdivision === '8th Notes') return Array.from({ length: beats }, (_, i) => [`${i + 1}`, '&']).flat();
  if (subdivision === 'Triplets') return Array.from({ length: beats }, (_, i) => [`${i + 1}`, 'trip', 'let']).flat();
  return Array.from({ length: beats }, (_, i) => `${i + 1}`);
}

function spoken(tokens: string[]): string[] {
  const words: Record<string, string> = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '&': 'and', 'e': 'e', 'a': 'a', 'la': 'la', 'li': 'li' };
  return tokens.map((token) => words[token] || token);
}

function primaryVoice(domain: CurriculumPedagogyDomain): DrumVoiceId {
  if (domain === 'GROOVE' || domain === 'STYLE' || domain === 'PERFORMANCE') return 'hihat_closed';
  if (domain === 'FILL_TRANSITION') return 'snare';
  if (domain === 'COORDINATION') return 'kick';
  if (domain === 'DYNAMICS') return 'snare';
  return 'metronome';
}

function buildGenericEvents(competency: CurriculumCompetency, meter: string, subCount: number, tokens: string[], domain: CurriculumPedagogyDomain): TeachingEventDef[] {
  const beats = beatsForMeter(meter);
  const voice = primaryVoice(domain);
  const events: TeachingEventDef[] = [];
  for (let beat = 1; beat <= beats; beat += 1) {
    for (let subdivision = 0; subdivision < subCount; subdivision += 1) {
      const tokenIndex = (beat - 1) * subCount + subdivision;
      const countToken = tokens[tokenIndex] || `${beat}`;
      const isPrimary = subdivision === 0;
      const surfaces: DrumVoiceId[] = [];
      if (domain === 'GROOVE' || domain === 'STYLE' || domain === 'PERFORMANCE') {
        surfaces.push('hihat_closed');
        if (isPrimary && (beat === 2 || beat === 4)) surfaces.push('snare');
        if (isPrimary && (beat === 1 || beat === 3)) surfaces.push('kick');
      } else if (domain === 'FILL_TRANSITION') {
        surfaces.push(beat <= Math.ceil(beats / 2) ? 'snare' : beat === beats ? 'tom_floor' : 'tom_high');
      } else if (domain === 'COORDINATION') {
        surfaces.push(subdivision % 3 === 2 ? 'kick' : subdivision % 2 === 0 ? 'snare' : 'hihat_closed');
      } else if (domain === 'RUDIMENT') {
        surfaces.push('snare');
      } else if (domain === 'DYNAMICS') {
        surfaces.push('snare');
      } else if (domain === 'READING') {
        // Reading exercises must describe the written drum voices, not invent a hand-sticking mnemonic.
        // A simple staff-reading bar uses steady hi-hat eighths, kick on 1/3 and snare on 2/4.
        surfaces.push('hihat_closed');
        if (isPrimary && (beat === 1 || beat === 3)) surfaces.unshift('kick');
        if (isPrimary && (beat === 2 || beat === 4)) surfaces.unshift('snare');
      } else {
        surfaces.push('metronome');
      }
      const readingPrimary = domain === 'READING' && surfaces.length > 1 ? surfaces[0] : null;
      events.push({
        beat,
        subdivision,
        countToken,
        hand: domain === 'READING'
          ? readingPrimary === 'kick' ? 'K' : readingPrimary === 'snare' ? 'L' : 'R'
          : domain === 'COORDINATION' && subdivision % 3 === 2 ? 'K' : subdivision % 2 === 0 ? 'R' : 'L',
        surface: surfaces[0] || voice,
        surfaces,
        accent: isPrimary && beat === 1,
        label: domain === 'READING'
          ? surfaces.includes('kick') ? 'K + HH' : surfaces.includes('snare') ? 'S + HH' : 'HH'
          : isPrimary ? `Beat ${beat}` : countToken,
        description: domain === 'READING'
          ? `Read the ${countToken} position from the staff and play only the written voice(s).`
          : competency.description,
      });
    }
  }
  return events;
}

export function deriveTeachingDefinition(competency: CurriculumCompetency): CompetencyTeachingDefinition {
  const profile = getCurriculumPedagogyProfile(competency);
  const meter = inferMeter(competency);
  const subdivision = normalizeSubdivision(competency);
  const subCount = subdivisionCount(subdivision);
  const tokens = countTokensFor(meter, subdivision);
  const events = buildGenericEvents(competency, meter, subCount, tokens, profile.domain);
  const durationMatch = competency.tempoStandard.durationOrCycles.match(/(\d+)/);
  const seconds = competency.tempoStandard.durationOrCycles.toLowerCase().includes('second') && durationMatch ? Number(durationMatch[1]) : 30;

  return {
    id: competency.id,
    competencyId: competency.id,
    skillId: competency.skillId,
    title: competency.title,
    meter,
    beatsPerBar: beatsForMeter(meter),
    subdivision,
    subdivisionCount: subCount,
    countTokens: tokens,
    spokenTokens: spoken(tokens),
    sticking: profile.domain === 'READING' ? 'Read staff voices — no sticking mnemonic' : competency.stickingPattern,
    limbPattern: profile.domain === 'READING' ? 'Staff-to-kit voice mapping' : competency.stickingPattern,
    drumSurfaces: profile.preferredEquipment === 'Practice Pad' ? ['Practice Pad'] : profile.preferredEquipment === 'Full Drum Kit' ? ['Hi-Hat', 'Snare', 'Kick', 'Toms'] : ['Practice Pad', 'Hi-Hat', 'Snare', 'Kick'],
    accentPositions: [0],
    bars: profile.domain === 'METER_FORM' || profile.domain === 'PERFORMANCE' ? 4 : 2,
    events,
    musicalExplanation: {
      whatAmILearning: `${competency.description} ${profile.conceptualFocus}`,
      howIsItCounted: competency.countingPattern,
      handsAndFeet: profile.domain === 'READING'
        ? 'Read the staff vertically: hi-hat uses the x-shaped notehead above the staff, snare sits in the middle area, and kick sits low on the staff. Play the limb shown by the written voice, not an R/L sticking sequence.'
        : competency.stickingPattern,
      drumSurfaces: profile.preferredEquipment === 'Practice Pad' ? 'Practice pad first; transfer to the kit when the motion is stable.' : competency.supportedEquipment === 'Both' ? 'Use the surface that best exposes the target skill; transfer to the kit for musical application.' : 'Use the full kit so the intended limb relationships are present.',
      musicalApplication: `${competency.musicalApplicationRequirement}. ${profile.musicalTransfer}`,
      whatToListenFor: profile.listeningFocus,
    },
    commonMistakes: profile.diagnosticIssues,
    diagnosticIssues: profile.diagnosticIssues,
    workingTempo: Math.max(40, Math.round(competency.tempoStandard.bpm * 0.9)),
    certificationTempo: {
      bpm: competency.tempoStandard.bpm,
      durationSeconds: seconds,
      standardText: competency.tempoStandard.standardText,
    },
    recommendedAssistance: competency.band === 'BEGINNER' ? 'FULL' : competency.band === 'INTERMEDIATE' ? 'REDUCED' : 'MINIMAL',
    supportsCoachThenYou: true,
  };
}
