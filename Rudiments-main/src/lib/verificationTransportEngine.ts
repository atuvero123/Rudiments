import { CurriculumCompetency, CompetencyTeachingDefinition } from '../types';

export type VerificationCompletionMode = 'BARS' | 'SECONDS';

export interface CanonicalVerificationTransportSpec {
  bpm: number;
  standardText: string;
  completionMode: VerificationCompletionMode;
  durationSeconds: number;
  requiredBars: number | null;
  pulsesPerBar: number;
  totalPulses: number | null;
}

function parseMeter(meter?: string): { numerator: number; denominator: number } | null {
  if (!meter) return null;
  const match = meter.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function parseSimpleBarRequirement(text: string): number | null {
  const normalized = text.trim();
  const leading = normalized.match(/^(\d+)\s*(?:-|\s)?bars?\b/i);
  if (leading) return Number(leading[1]);

  const embedded = normalized.match(/\b(\d+)\s*(?:-|\s)?bars?\b/i);
  if (!embedded) return null;

  // Do not collapse authored cycle structures such as "4 cycles of 4 bars"
  // into one plain bar run. Those need their own cycle-aware verifier later.
  if (/\bcycles?\b/i.test(normalized)) return null;
  return Number(embedded[1]);
}

function parseSecondsRequirement(text: string): number | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*seconds?\b/i);
  return match ? Number(match[1]) : null;
}

function derivePulsesPerBar(
  competency: CurriculumCompetency,
  teaching?: CompetencyTeachingDefinition | null
): number {
  const meter = parseMeter(teaching?.meter);
  if (!meter) return Math.max(1, teaching?.beatsPerBar || 4);

  const subdivisionText = `${competency.tempoStandard.subdivision} ${competency.tempoStandard.standardText}`.toLowerCase();

  // In compound meters the curriculum may explicitly define BPM as the
  // dotted-quarter/macropulse. In that case one click represents three 8ths.
  if (
    meter.denominator === 8 &&
    meter.numerator % 3 === 0 &&
    (subdivisionText.includes('dotted-quarter') || subdivisionText.includes('compound pulse'))
  ) {
    return Math.max(1, meter.numerator / 3);
  }

  return Math.max(1, meter.numerator || teaching?.beatsPerBar || 4);
}

/**
 * C7.14 canonical verification authority.
 *
 * The curriculum competency owns BPM, length and standard wording. Teaching
 * definitions provide musical rendering metadata only. For plain bar-based
 * standards, duration is derived from bars × metronome-pulses-per-bar × 60/BPM
 * and the verifier must complete by pulse/bar count rather than a wall clock.
 */
export function deriveCanonicalVerificationTransport(
  competency: CurriculumCompetency,
  teaching?: CompetencyTeachingDefinition | null
): CanonicalVerificationTransportSpec {
  const bpm = competency.tempoStandard.bpm;
  const standardText = competency.tempoStandard.standardText;
  const authoredLength = `${competency.tempoStandard.durationOrCycles} ${competency.durationCriterion}`;
  const requiredBars = parseSimpleBarRequirement(authoredLength);
  const pulsesPerBar = derivePulsesPerBar(competency, teaching);

  if (requiredBars) {
    const totalPulses = requiredBars * pulsesPerBar;
    return {
      bpm,
      standardText,
      completionMode: 'BARS',
      durationSeconds: (totalPulses * 60) / bpm,
      requiredBars,
      pulsesPerBar,
      totalPulses,
    };
  }

  const authoredSeconds = parseSecondsRequirement(authoredLength);
  if (authoredSeconds) {
    return {
      bpm,
      standardText,
      completionMode: 'SECONDS',
      durationSeconds: authoredSeconds,
      requiredBars: null,
      pulsesPerBar,
      totalPulses: null,
    };
  }

  // Transitional fallback for song/cycle competencies whose canonical length
  // is not yet expressible as a simple bar or second run. BPM and wording are
  // still canonical; only the legacy teaching duration is reused temporarily.
  const fallbackDuration = Math.max(10, teaching?.certificationTempo.durationSeconds || 30);
  return {
    bpm,
    standardText,
    completionMode: 'SECONDS',
    durationSeconds: fallbackDuration,
    requiredBars: null,
    pulsesPerBar,
    totalPulses: null,
  };
}

export function formatVerificationSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export function formatVerificationLength(spec: CanonicalVerificationTransportSpec): string {
  if (spec.completionMode === 'BARS' && spec.requiredBars) {
    return `${spec.requiredBars} bars (~${formatVerificationSeconds(spec.durationSeconds)}s)`;
  }
  return `${formatVerificationSeconds(spec.durationSeconds)}s`;
}
