import React, { useState } from 'react';
import {
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Target,
  ArrowRight,
  Music,
  Compass,
  AlertTriangle,
  Drum,
  Layers,
} from 'lucide-react';
import { PracticeExercise, RhythmTimeline, CompetencyTeachingDefinition } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { masterTransport } from '../lib/masterTransportEngine';
import { DrumNotationStaff } from './DrumNotationStaff';
import { CURRICULUM_COMPETENCIES_BY_ID } from '../data/canonicalCurriculum';
import { deriveCanonicalVerificationTransport, formatVerificationLength } from '../lib/verificationTransportEngine';


function formatTeachingSurface(surface: string): string {
  switch (surface) {
    case 'snare': return 'SNARE';
    case 'tom_high': return 'HIGH TOM';
    case 'tom_mid': return 'MID TOM';
    case 'tom_floor': return 'FLOOR TOM';
    case 'crash': return 'CRASH';
    case 'kick': return 'KICK';
    case 'hihat':
    case 'hihat_closed': return 'HI-HAT';
    case 'hihat_open': return 'OPEN HH';
    case 'ride': return 'RIDE';
    default: return surface.replace(/_/g, ' ').toUpperCase();
  }
}

interface UnderstandStageViewProps {
  exercise: PracticeExercise;
  timeline: RhythmTimeline;
  teachingDef: CompetencyTeachingDefinition;
  isPad: boolean;
  currentTempo: number;
  onProceedToCount: () => void;
  proceedLabel?: string;
}

export const UnderstandStageView: React.FC<UnderstandStageViewProps> = ({
  exercise,
  timeline,
  teachingDef,
  isPad,
  currentTempo,
  onProceedToCount,
  proceedLabel,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handlePlayPreview = async () => {
    if (isPlayingPreview || masterTransport.getIsRunning()) {
      masterTransport.stop();
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    masterTransport.setTeachingStage('WATCH');
    await masterTransport.start({
      timeline,
      bpm: currentTempo,
      instructionMode: 'WATCH',
      assistanceLevel: 'FULL',
      hasCountIn: false,
      voiceCountEnabled: false,
      clapEnabled: false,
      teachingStage: 'WATCH',
      teachingDefinition: teachingDef,
      isPad,
      loopLimit: 1,
      onLoopComplete: (loops) => {
        if (loops >= 1) {
          masterTransport.stop();
          setIsPlayingPreview(false);
        }
      },
    });
  };

  const handlePlayTeachingEvent = (event: CompetencyTeachingDefinition['events'][number]) => {
    // C7.16: a teaching event can own simultaneous kit voices (for example
    // firm snare + quiet hi-hat). Preview the whole authored event instead of
    // auditioning only its primary surface, otherwise dynamic balance lessons
    // teach an incomplete sound. Pad mode maps the voices to distinct zones.
    const surfaces = event.surfaces?.length ? event.surfaces : [event.surface];
    const eventTime = audioEngine.getAudioContextTime() + 0.01;

    surfaces.forEach((surface) => {
      const surfaceName = String(surface);
      const surfaceAccent = Boolean(event.accent) && !(
        teachingDef.competencyId === 'comp-dyn-song-balance' && surfaceName.includes('hihat')
      );
      if (isPad) {
        const zone = surfaceName === 'pad_edge' || surfaceName === 'crash' || surfaceName === 'kick'
          ? 'rim_edge'
          : surfaceName === 'pad_left' || surfaceName.startsWith('tom_')
          ? 'left_zone'
          : surfaceName === 'pad_right' || surfaceName.includes('hihat') || surfaceName === 'ride'
          ? 'right_zone'
          : 'center';
        audioEngine.playPadTap(surfaceAccent, zone, eventTime);
      } else {
        const voice = surfaceName === 'pad_center'
          ? 'snare'
          : surfaceName === 'pad_edge'
          ? 'crash'
          : surfaceName === 'pad_left'
          ? 'tom_high'
          : surfaceName === 'pad_right'
          ? 'tom_mid'
          : surfaceName;
        audioEngine.playInstrumentSound(voice, surfaceAccent, eventTime);
      }
    });
  };

  const canonicalCompetency = CURRICULUM_COMPETENCIES_BY_ID.get(teachingDef.competencyId);
  const verificationTransport = canonicalCompetency
    ? deriveCanonicalVerificationTransport(canonicalCompetency, teachingDef)
    : null;
  const explanation = teachingDef.musicalExplanation;
  const isNotationMission = exercise.curriculumMission?.patternDisplay === 'NOTATION';
  const pedagogyDomain = exercise.curriculumMission?.pedagogyDomain;
  // C7.17: canonical fill definitions are expanded to the mission length for
  // transport, but the Stage-1 execution reference should teach one authored
  // fill cycle only. Repeating the same eight notes for every mission bar made
  // the pattern look like a 16-note fill and obscured the actual orchestration.
  const executionReferenceEvents = pedagogyDomain === 'FILL_TRANSITION'
    ? teachingDef.events.filter((event) => (event.bar || 1) === 1)
    : teachingDef.events;
  const executionReferenceLabel = pedagogyDomain === 'RUDIMENT'
    ? 'Required Sticking — Play This'
    : pedagogyDomain === 'GROOVE' || pedagogyDomain === 'STYLE'
    ? 'Required Limb / Voice Pattern — Play This'
    : pedagogyDomain === 'COORDINATION'
    ? 'Required Limb Sequence — Play This'
    : pedagogyDomain === 'FILL_TRANSITION'
    ? 'Required Fill Pattern — Play This'
    : pedagogyDomain === 'DYNAMICS'
    ? 'Required Dynamic Voice Map — Play This'
    : 'Required Pulse Pattern — Play This';

  return (
    <div className="bg-stone-950 text-white rounded-3xl p-5 sm:p-7 border-2 border-stone-800 shadow-2xl space-y-6 animate-in fade-in duration-200">
      {/* Stage Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border border-amber-500/30">
              STAGE 1: UNDERSTAND
            </span>
            <span className="text-xs font-mono text-stone-400">
              {teachingDef.meter} • {teachingDef.subdivision}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {teachingDef.title}
          </h2>
          <p className="text-xs text-stone-300 font-medium mt-0.5">
            {isNotationMission
              ? 'Learn what the written drum symbols mean, where they sit on the staff, and when they sound before you play them.'
              : 'Internalize the musical meaning, rhythm mechanics, and limb choreography before you hit.'}
          </p>
        </div>

        {/* Stepper Forward */}
        <button
          onClick={onProceedToCount}
          className="self-start sm:self-auto flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 px-4 py-2.5 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span>{proceedLabel || (isNotationMission ? '2. Count the Written Bar' : '2. Count It')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Audio Preview Bar */}
      <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-stone-200 block">
              Hear Audio Preview ({currentTempo} BPM)
            </span>
            <span className="text-[11px] text-stone-400">
              Listen to one full cycle of the rhythm played with acoustic drum samples.
            </span>
          </div>
        </div>

        <button
          onClick={handlePlayPreview}
          aria-pressed={isPlayingPreview}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isPlayingPreview
              ? 'bg-amber-500 text-stone-950 animate-pulse'
              : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700'
          }`}
        >
          {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlayingPreview ? 'Stop Preview' : 'Play Audio Preview'}</span>
        </button>
      </div>

      {/* Rhythmic Overview Grid (Core Musical Parameters) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
        <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Meter / Time Sig</span>
          <p className="font-mono font-black text-amber-300 text-base">{teachingDef.meter}</p>
          <span className="text-[10px] text-stone-400">{teachingDef.beatsPerBar} beats per bar</span>
        </div>

        <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Subdivision</span>
          <p className="font-mono font-black text-white text-base">{teachingDef.subdivision}</p>
          <span className="text-[10px] text-stone-400">{teachingDef.subdivisionCount} notes per beat</span>
        </div>

        <div className="bg-stone-900 p-3 rounded-2xl border border-amber-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Working Tempo</span>
          <p className="font-mono font-black text-amber-300 text-base">{currentTempo} BPM</p>
          <span className="text-[10px] text-stone-400">Today's adaptive pace</span>
        </div>

        <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Verification Goal</span>
          <p className="font-mono font-black text-emerald-400 text-base">
            {verificationTransport?.bpm || teachingDef.certificationTempo.bpm} BPM
          </p>
          <span className="text-[10px] text-stone-400">{verificationTransport ? `${formatVerificationLength(verificationTransport)} standard` : `${teachingDef.certificationTempo.durationSeconds}s standard`}</span>
        </div>

        <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Equipment</span>
          <p className="font-mono font-black text-amber-300 text-base">
            {exercise.equipmentRequired === 'Practice Pad'
              ? 'Practice Pad'
              : exercise.equipmentRequired === 'Full Drum Kit'
              ? 'Full Kit'
              : 'Pad or Kit'}
          </p>
          <span className="text-[10px] text-stone-400">{teachingDef.drumSurfaces.join(', ')}</span>
        </div>
      </div>

      {/* Contextual execution reference. Reading uses actual staff notation; conceptual meter uses structure; motor skills use sticking. */}
      {exercise.curriculumMission?.patternDisplay === 'NOTATION' ? (
        <DrumNotationStaff
          teachingDef={teachingDef}
          title="See the Note — Name the Voice — Count the Time"
          showLegend
        />
      ) : exercise.curriculumMission?.patternDisplay === 'BAR_STRUCTURE' ? (
        <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-sky-300 font-black">Musical Structure — Track This, Not a Sticking Pattern</div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((beat) => (
              <div key={beat} className={`rounded-xl border py-3 text-center font-mono font-black ${beat === 1 ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-950 text-stone-300 border-stone-800'}`}>
                <span className="text-[9px] uppercase block opacity-70">Beat</span>
                <span className="text-lg">{beat}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-stone-300 font-medium">
            Count <strong>1 2 3 4</strong>, then the beat count resets to 1 while the <strong>bar number advances</strong>. Your job is to feel both layers at the same time.
          </div>
        </div>
      ) : exercise.curriculumMission?.patternDisplay === 'NONE' ? null : (
        <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 space-y-2 text-center">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-stone-400 font-bold border-b border-stone-800 pb-1.5">
            <span>{exercise.curriculumMission?.patternDisplay === 'SUGGESTED' ? 'Suggested Pattern — Optional' : executionReferenceLabel}</span>
            <span>Click any note to hear sound</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 py-2">
            {executionReferenceEvents.map((ev, idx) => (
              <button
                key={idx}
                onClick={() => handlePlayTeachingEvent(ev)}
                className={`flex flex-col items-center justify-center min-w-[3rem] px-2.5 py-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  ev.accent
                    ? 'bg-amber-400 text-stone-950 border-amber-300 font-black shadow-md'
                    : 'bg-stone-950 text-stone-200 border-stone-800 hover:border-stone-700 font-bold'
                }`}
              >
                <span className="text-[9px] uppercase font-mono tracking-wider opacity-80">
                  {pedagogyDomain === 'DYNAMICS' ? (ev.accent ? 'STRONG' : 'SOFT') : ev.accent ? '> ACCENT' : 'TAP'}
                </span>
                <span className="text-base sm:text-lg font-mono font-black">
                  {pedagogyDomain === 'DYNAMICS' ? ev.label : ev.accent ? `>${ev.hand}` : ev.hand}
                </span>
                <span className="text-[9px] font-mono opacity-80 mt-0.5">
                  {ev.countToken}
                </span>
                {pedagogyDomain === 'FILL_TRANSITION' && (
                  <span className="mt-1 rounded-md border border-current/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide opacity-80">
                    {formatTeachingSurface(String(ev.surface))}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-800/80 space-y-1">
            <div className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
              {exercise.curriculumMission?.patternDisplay === 'SUGGESTED' ? 'Suggested Pattern — Optional' : executionReferenceLabel.replace(' — Play This', ' — Play This Now')}
            </div>
            <div className="text-xs font-mono font-bold text-amber-300/90">
              {pedagogyDomain === 'FILL_TRANSITION' ? teachingDef.limbPattern : teachingDef.sticking}
            </div>
          </div>
        </div>
      )}

      {/* Deep Pedagogical Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* What Am I Learning? */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-[10px] tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. What Am I Learning?</span>
          </div>
          <p className="text-stone-300 font-medium leading-relaxed">
            {explanation.whatAmILearning}
          </p>
        </div>

        {/* How Is It Counted? */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-black uppercase text-[10px] tracking-wider">
            <Music className="w-3.5 h-3.5" />
            <span>2. How Is It Counted?</span>
          </div>
          <p className="text-stone-300 font-medium leading-relaxed">
            {explanation.howIsItCounted}
          </p>
        </div>

        {/* Hands & Feet Coordination */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-[10px] tracking-wider">
            <Drum className="w-3.5 h-3.5" />
            <span>3. Hands & Feet Coordination</span>
          </div>
          <p className="text-stone-300 font-medium leading-relaxed">
            {explanation.handsAndFeet}
          </p>
          <p className="text-[11px] text-stone-400 pt-1">
            <strong>Surfaces:</strong> {explanation.drumSurfaces}
          </p>
        </div>

        {/* Musical Application */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-1.5">
          <div className="flex items-center gap-2 text-purple-400 font-black uppercase text-[10px] tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>4. Real Musical Application</span>
          </div>
          <p className="text-stone-300 font-medium leading-relaxed">
            {explanation.musicalApplication}
          </p>
        </div>
      </div>

      {/* What to Listen For */}
      <div className="bg-stone-900/80 p-4 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-black uppercase text-[10px] tracking-wider">
          <Target className="w-3.5 h-3.5" />
          <span>What to Listen For (Acoustic Ear Training)</span>
        </div>
        <p className="text-stone-300 font-medium leading-relaxed">
          {explanation.whatToListenFor}
        </p>
      </div>

      {/* Common Pitfalls Card */}
      <div className="bg-rose-950/40 border-2 border-rose-800/60 rounded-2xl p-4 sm:p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-rose-400 font-black uppercase text-[10px] tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Common Mistakes & How to Avoid Them:</span>
        </div>
        <ul className="space-y-1.5 text-rose-200/90 font-medium pl-1">
          {teachingDef.commonMistakes.map((mistake, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span>{mistake}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Proceed Stepper */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onProceedToCount}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer"
        >
          <span>Step 2: Internalize with Counting Tutor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
