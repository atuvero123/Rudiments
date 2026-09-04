import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CircleStop,
  Gauge,
  Headphones,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import {
  PlayAlongApplicationMode,
  PlayAlongCoachMode,
  PlayAlongTrack,
  SectionCue,
} from '../data/playAlongTracks';
import {
  getTotalPlayAlongBars,
  PlayAlongTransport,
  PlayAlongTransportSnapshot,
} from '../lib/playAlongEngine';
import { isCompetencyVerified } from '../lib/canonicalProgressEngine';

interface PlayAlongStudioProps {
  track: PlayAlongTrack;
  currentCompetencyId?: string | null;
  onClose: () => void;
}

type PlayAlongRating = 'STRUGGLED' | 'MOSTLY' | 'CLEAN';

interface StoredPlayAlongAttempt {
  id: string;
  trackId: string;
  trackTitle: string;
  date: string;
  coachMode: PlayAlongCoachMode;
  applicationMode: PlayAlongApplicationMode;
  rating: PlayAlongRating;
  transitionControl: 'LOST' | 'MIXED' | 'SOLID';
  musicalChoice: 'OVERPLAYED' | 'UNSURE' | 'MUSICAL';
}

const HISTORY_KEY = 'RUDIMENT_PLAYALONG_HISTORY_V1';

const APPLICATION_OPTIONS: Array<{
  id: PlayAlongApplicationMode;
  label: string;
  description: string;
}> = [
  { id: 'GROOVE_ONLY', label: 'Groove only', description: 'No fills. Protect pulse, pocket and section dynamics.' },
  { id: 'THREE_PLUS_ONE', label: '3 + 1', description: 'Three bars groove, one full bar fill.' },
  { id: 'SEVEN_PLUS_ONE', label: '7 + 1', description: 'Seven bars groove, one full bar fill.' },
  { id: 'HALF_BAR_FILL', label: 'Half-bar fills', description: 'Enter the fill on beat 3 in selected transition bars.' },
  { id: 'BEAT_FOUR_FILL', label: 'Beat-4 fills', description: 'Use only beat 4 for a compact transition.' },
  { id: 'MUSICAL_CHOICE', label: 'Musical choice', description: 'The arrangement tells you when to fill, build or deliberately leave space.' },
  { id: 'FREE_PLAY', label: 'Free application', description: 'No fill instructions. Make your own musical decisions.' },
];

function loadHistory(): StoredPlayAlongAttempt[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cueToInstruction(cue: SectionCue): string {
  switch (cue) {
    case 'NO_FILL': return 'No fill — carry the groove through the transition.';
    case 'SHORT_FILL': return 'Short fill only — keep it compact and land the next section cleanly.';
    case 'BUILD': return 'Build the energy gradually; let the last bar prepare the next section.';
    case 'CRASH_ONLY': return 'No busy fill — use a confident crash/section landing if appropriate.';
    case 'FREE': return 'Musical choice — fill only if it improves the transition.';
    default: return 'Protect the groove.';
  }
}

function applicationInstruction(
  mode: PlayAlongApplicationMode,
  snapshot: PlayAlongTransportSnapshot | null
): { title: string; detail: string; emphasis: 'groove' | 'fill' | 'choice' } {
  if (!snapshot) {
    return { title: 'Ready', detail: 'Press Start when your sticks and posture are set.', emphasis: 'groove' };
  }

  const bar = snapshot.currentBar;
  const beats = snapshot.currentSection;
  const isSectionFinalBar = snapshot.barInSection === snapshot.sectionBars;

  if (mode === 'GROOVE_ONLY') {
    return { title: 'GROOVE', detail: 'Stay in the groove. No fill this bar.', emphasis: 'groove' };
  }
  if (mode === 'THREE_PLUS_ONE') {
    const fill = bar % 4 === 0;
    return fill
      ? { title: '1-BAR FILL', detail: 'Use this complete bar as your fill, then return exactly on the next beat 1.', emphasis: 'fill' }
      : { title: 'GROOVE', detail: `Groove bar ${((bar - 1) % 4) + 1} of 3. Keep the pocket steady.`, emphasis: 'groove' };
  }
  if (mode === 'SEVEN_PLUS_ONE') {
    const fill = bar % 8 === 0;
    return fill
      ? { title: '1-BAR FILL', detail: 'One full bar fill. Do not squeeze the final notes before beat 1.', emphasis: 'fill' }
      : { title: 'GROOVE', detail: `Stay patient — groove bar ${((bar - 1) % 8) + 1} of 7.`, emphasis: 'groove' };
  }
  if (mode === 'HALF_BAR_FILL') {
    return isSectionFinalBar
      ? { title: 'HALF-BAR FILL', detail: 'Keep beats 1–2 in the groove; begin the fill on beat 3 and land the new section cleanly.', emphasis: 'fill' }
      : { title: 'GROOVE', detail: 'Preserve the groove until the section transition.', emphasis: 'groove' };
  }
  if (mode === 'BEAT_FOUR_FILL') {
    return isSectionFinalBar
      ? { title: 'BEAT-4 FILL', detail: 'Stay in the groove through beat 3. Use beat 4 only, then land the next section on beat 1.', emphasis: 'fill' }
      : { title: 'GROOVE', detail: 'Do not enter the fill early. Keep the bar intact.', emphasis: 'groove' };
  }
  if (mode === 'MUSICAL_CHOICE') {
    if (isSectionFinalBar) {
      return { title: 'TRANSITION CHOICE', detail: cueToInstruction(beats.transitionCue), emphasis: 'choice' };
    }
    return { title: 'SERVE THE SECTION', detail: beats.grooveHint, emphasis: 'groove' };
  }
  return { title: 'FREE PLAY', detail: 'Make your own musical choices while protecting time, dynamics and section awareness.', emphasis: 'choice' };
}

export const PlayAlongStudio: React.FC<PlayAlongStudioProps> = ({
  track,
  currentCompetencyId,
  onClose,
}) => {
  const { skills } = useLearner();
  const [coachMode, setCoachMode] = useState<PlayAlongCoachMode>('GUIDED');
  const [applicationMode, setApplicationMode] = useState<PlayAlongApplicationMode>('MUSICAL_CHOICE');
  const [clickEnabled, setClickEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolume] = useState(0.55);
  const [snapshot, setSnapshot] = useState<PlayAlongTransportSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [rating, setRating] = useState<PlayAlongRating | null>(null);
  const [transitionControl, setTransitionControl] = useState<'LOST' | 'MIXED' | 'SOLID' | null>(null);
  const [musicalChoice, setMusicalChoice] = useState<'OVERPLAYED' | 'UNSURE' | 'MUSICAL' | null>(null);
  const [saved, setSaved] = useState(false);
  const transportRef = useRef<PlayAlongTransport | null>(null);
  const lastPromptBarRef = useRef<number>(0);

  const verifiedVariations = useMemo(() => track.variations.filter((variation) =>
    variation.prerequisiteCompetencyIds.every((id) => isCompetencyVerified(id, skills))
  ), [track, skills]);

  const lockedVariations = useMemo(() => track.variations.filter((variation) =>
    !variation.prerequisiteCompetencyIds.every((id) => isCompetencyVerified(id, skills))
  ), [track, skills]);

  const currentPrompt = applicationInstruction(applicationMode, snapshot);
  const totalBars = getTotalPlayAlongBars(track);

  const applicationRequirements: Partial<Record<PlayAlongApplicationMode, string[]>> = {
    THREE_PLUS_ONE: ['comp-fill-quarter', 'comp-fill-recovery'],
    SEVEN_PLUS_ONE: ['comp-fill-quarter', 'comp-fill-recovery'],
    HALF_BAR_FILL: ['comp-fill-entry', 'comp-fill-recovery'],
    BEAT_FOUR_FILL: ['comp-fill-entry', 'comp-fill-recovery'],
  };
  const applicationAvailable = (mode: PlayAlongApplicationMode) =>
    (applicationRequirements[mode] || []).every((id) => isCompetencyVerified(id, skills));

  useEffect(() => {
    const transport = new PlayAlongTransport(track, {
      onSnapshot: setSnapshot,
      onComplete: () => {
        setIsRunning(false);
        setIsComplete(true);
      },
    });
    transport.setCoachMode(coachMode);
    transport.setClickEnabled(clickEnabled);
    transport.setSpeechEnabled(voiceEnabled);
    transport.setVolume(volume);
    transportRef.current = transport;

    return () => {
      transport.stop();
      transportRef.current = null;
    };
  }, [track]);

  useEffect(() => transportRef.current?.setCoachMode(coachMode), [coachMode]);
  useEffect(() => transportRef.current?.setClickEnabled(clickEnabled), [clickEnabled]);
  useEffect(() => transportRef.current?.setSpeechEnabled(voiceEnabled), [voiceEnabled]);
  useEffect(() => transportRef.current?.setVolume(volume), [volume]);

  useEffect(() => {
    if (!snapshot || !isRunning || coachMode !== 'GUIDED' || !voiceEnabled) return;
    if (snapshot.currentBar === lastPromptBarRef.current) return;
    lastPromptBarRef.current = snapshot.currentBar;
    const instruction = applicationInstruction(applicationMode, snapshot);
    const shouldSpeak = instruction.emphasis !== 'groove' || snapshot.barInSection === 1;
    if (!shouldSpeak || !('speechSynthesis' in window)) return;
    try {
      const text = instruction.emphasis === 'fill' ? instruction.title : instruction.detail;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.volume = 0.75;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Visual instruction remains available.
    }
  }, [snapshot?.currentBar, applicationMode, coachMode, voiceEnabled, isRunning]);

  const start = async () => {
    setIsComplete(false);
    setSaved(false);
    setRating(null);
    setTransitionControl(null);
    setMusicalChoice(null);
    await transportRef.current?.start();
    setIsRunning(true);
  };

  const pause = () => {
    transportRef.current?.pause();
    setIsRunning(false);
  };

  const reset = () => {
    transportRef.current?.stop();
    setSnapshot(null);
    setIsRunning(false);
    setIsComplete(false);
    setSaved(false);
    setRating(null);
    setTransitionControl(null);
    setMusicalChoice(null);
    lastPromptBarRef.current = 0;
  };

  const saveAttempt = () => {
    if (!rating || !transitionControl || !musicalChoice) return;
    const history = loadHistory();
    const attempt: StoredPlayAlongAttempt = {
      id: `playalong-${Date.now()}`,
      trackId: track.id,
      trackTitle: track.title,
      date: new Date().toISOString(),
      coachMode,
      applicationMode,
      rating,
      transitionControl,
      musicalChoice,
    };
    const next = [attempt, ...history].slice(0, 40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onClose}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-bold text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Songs
      </button>

      <section className="overflow-hidden rounded-3xl border border-stone-800 bg-[#171612] text-stone-100 shadow-xl">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-stone-950">Curriculum Play-Along</span>
                <span className="rounded-full border border-stone-700 px-2.5 py-1 text-stone-300">{track.meter}</span>
                <span className="rounded-full border border-stone-700 px-2.5 py-1 text-stone-300">{track.style}</span>
              </div>
              <h2 className="text-2xl font-black text-white">{track.title}</h2>
              <p className="mt-1 text-sm text-stone-300">{track.subtitle}</p>
              <p className="mt-3 max-w-3xl text-xs leading-6 text-stone-400">{track.whyUseIt}</p>
            </div>
            <div className="grid min-w-[150px] grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl border border-stone-700 bg-stone-900 p-3"><span className="block text-[10px] uppercase text-stone-500">Tempo</span><strong className="text-lg text-amber-400">{track.bpm}</strong> BPM</div>
              <div className="rounded-xl border border-stone-700 bg-stone-900 p-3"><span className="block text-[10px] uppercase text-stone-500">Length</span><strong className="text-lg text-white">{totalBars}</strong> bars</div>
            </div>
          </div>

          {currentCompetencyId && (
            <div className="mt-4 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 text-xs text-emerald-200">
              <BadgeCheck className="mr-1.5 inline h-4 w-4" /> Recommended from your current curriculum path. Play-along attempts are application evidence, but do not bypass competency prerequisites or automatically certify a unit.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-stone-500">1. Coaching visibility</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['GUIDED', 'Guided', 'Voice + visual section and transition coaching'],
                ['REDUCED', 'Reduced', 'Visual coaching only — no spoken prompts'],
                ['PERFORMANCE', 'Performance', 'Music first — minimal coaching'],
              ] as const).map(([id, label, detail]) => (
                <button key={id} onClick={() => setCoachMode(id)} className={`min-h-[74px] rounded-xl border p-2 text-left text-[11px] transition-all ${coachMode === id ? 'border-[#4a523a] bg-[#eef1e8] text-stone-900' : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                  <strong className="block text-xs">{label}</strong>
                  <span className="mt-1 block leading-4">{detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-stone-500">2. Application challenge</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {APPLICATION_OPTIONS.map((option) => {
                const available = applicationAvailable(option.id);
                return (
                  <button
                    key={option.id}
                    disabled={!available}
                    onClick={() => available && setApplicationMode(option.id)}
                    className={`min-h-[70px] rounded-xl border p-2.5 text-left transition-all ${
                      applicationMode === option.id
                        ? 'border-amber-500 bg-amber-50'
                        : available
                          ? 'border-stone-200 bg-white'
                          : 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-55'
                    }`}
                  >
                    <strong className="block text-xs text-stone-900">{option.label}{!available ? ' · Locked' : ''}</strong>
                    <span className="mt-1 block text-[10px] leading-4 text-stone-500">{available ? option.description : 'Verify the required fill-entry and Beat-1 recovery skills before using this challenge.'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3 text-xs">
          <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 font-semibold text-stone-700">
            <input type="checkbox" checked={clickEnabled} onChange={(e) => setClickEnabled(e.target.checked)} /> Click
          </label>
          <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 font-semibold text-stone-700">
            <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} disabled={coachMode !== 'GUIDED'} /> Voice coach
          </label>
          <label className="flex min-h-[44px] flex-1 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 font-semibold text-stone-700">
            <Volume2 className="h-4 w-4" />
            <input className="min-w-[120px] flex-1" type="range" min="0.15" max="0.9" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Live arrangement</p>
            <h3 className="text-lg font-black text-stone-900">{snapshot?.currentSection.name || track.sections[0].name}</h3>
            <p className="text-xs text-stone-500">Bar {snapshot?.currentBar || 1} / {totalBars} • Beat {snapshot?.currentBeat || 1} • {track.key} major/minor palette</p>
          </div>
          <div className="flex gap-2">
            {!isRunning ? (
              <button onClick={start} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#4a523a] px-5 text-xs font-black text-white"><Play className="h-4 w-4 fill-current" /> {snapshot ? 'Resume' : 'Start Play-Along'}</button>
            ) : (
              <button onClick={pause} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-5 text-xs font-black text-stone-950"><Pause className="h-4 w-4" /> Pause</button>
            )}
            <button onClick={reset} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-bold text-stone-700"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#4a523a] transition-all" style={{ width: `${Math.round((snapshot?.progress || 0) * 100)}%` }} /></div>

        <div className={`mt-4 rounded-2xl border p-4 ${currentPrompt.emphasis === 'fill' ? 'border-amber-400 bg-amber-50' : currentPrompt.emphasis === 'choice' ? 'border-violet-300 bg-violet-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-start gap-3">
            {currentPrompt.emphasis === 'fill' ? <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" /> : currentPrompt.emphasis === 'choice' ? <Gauge className="mt-0.5 h-5 w-5 text-violet-600" /> : <Headphones className="mt-0.5 h-5 w-5 text-emerald-700" />}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Right now</p>
              <h4 className="text-base font-black text-stone-900">{currentPrompt.title}</h4>
              <p className="mt-1 text-xs leading-5 text-stone-600">{currentPrompt.detail}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {track.sections.map((section, index) => {
            const active = snapshot?.currentSectionIndex === index;
            const passed = snapshot ? index < snapshot.currentSectionIndex : false;
            return (
              <div key={section.id} className={`rounded-xl border p-3 ${active ? 'border-[#4a523a] bg-[#eef1e8]' : passed ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-200 bg-stone-50'}`}>
                <div className="flex items-center justify-between gap-2"><strong className="text-xs text-stone-900">{section.name}</strong><span className="text-[10px] text-stone-500">{section.bars} bars</span></div>
                <p className="mt-1 text-[10px] leading-4 text-stone-500">{coachMode === 'PERFORMANCE' && !active ? 'Arrangement section' : section.grooveHint}</p>
                {active && coachMode !== 'PERFORMANCE' && <p className="mt-2 text-[10px] font-semibold text-[#4a523a]">Bar {snapshot?.barInSection}/{section.bars} • Next: {snapshot?.nextSectionName || 'Finish'}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-stone-900">Vocabulary you may use now</h3>
          <p className="mt-1 text-xs text-stone-500">Suggestions appear only when their prerequisite competency is verified.</p>
          <div className="mt-3 space-y-2">
            {verifiedVariations.map((variation) => (
              <div key={variation.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-600" /><strong className="text-xs text-stone-900">{variation.label}</strong></div>
                <p className="mt-1 text-[11px] leading-5 text-stone-600">{variation.description}</p>
              </div>
            ))}
            {verifiedVariations.length === 0 && <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500">Stay with the basic groove/pulse. The curriculum will unlock more musical options as competencies are verified.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-stone-900">Later vocabulary — not yet for this performance</h3>
          <p className="mt-1 text-xs text-stone-500">You can preview these elsewhere, but they should not be forced into this play-along yet.</p>
          <div className="mt-3 space-y-2">
            {lockedVariations.slice(0, 4).map((variation) => (
              <div key={variation.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3 opacity-75">
                <strong className="text-xs text-stone-700">{variation.label}</strong>
                <p className="mt-1 text-[11px] leading-5 text-stone-500">{variation.description}</p>
              </div>
            ))}
            {lockedVariations.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">All variations defined for this track are available.</p>}
          </div>
        </div>
      </section>

      {isComplete && (
        <section className="rounded-2xl border border-stone-800 bg-[#171612] p-5 text-stone-100 shadow-xl">
          <div className="flex items-start gap-3"><CircleStop className="mt-0.5 h-5 w-5 text-emerald-400" /><div><h3 className="text-lg font-black">Play-Along Review</h3><p className="text-xs text-stone-400">This records musical-application evidence only. It does not automatically certify prerequisites.</p></div></div>

          <div className="mt-4 space-y-4">
            <div><p className="mb-2 text-xs font-bold text-stone-300">How controlled was the whole performance?</p><div className="grid grid-cols-3 gap-2">{([['STRUGGLED','Needs work'],['MOSTLY','Mostly controlled'],['CLEAN','Clean & relaxed']] as const).map(([id,label])=><button key={id} onClick={()=>setRating(id)} className={`min-h-[52px] rounded-xl border p-2 text-xs font-bold ${rating===id?'border-amber-400 bg-amber-500 text-stone-950':'border-stone-700 bg-stone-900 text-stone-300'}`}>{label}</button>)}</div></div>
            <div><p className="mb-2 text-xs font-bold text-stone-300">How were section transitions?</p><div className="grid grid-cols-3 gap-2">{([['LOST','Lost sections'],['MIXED','Mixed'],['SOLID','Solid landings']] as const).map(([id,label])=><button key={id} onClick={()=>setTransitionControl(id)} className={`min-h-[48px] rounded-xl border p-2 text-xs font-bold ${transitionControl===id?'border-sky-400 bg-sky-500 text-stone-950':'border-stone-700 bg-stone-900 text-stone-300'}`}>{label}</button>)}</div></div>
            <div><p className="mb-2 text-xs font-bold text-stone-300">How musical were your fill/no-fill choices?</p><div className="grid grid-cols-3 gap-2">{([['OVERPLAYED','Overplayed'],['UNSURE','Unsure'],['MUSICAL','Served the song']] as const).map(([id,label])=><button key={id} onClick={()=>setMusicalChoice(id)} className={`min-h-[48px] rounded-xl border p-2 text-xs font-bold ${musicalChoice===id?'border-violet-400 bg-violet-500 text-white':'border-stone-700 bg-stone-900 text-stone-300'}`}>{label}</button>)}</div></div>
            <button disabled={!rating || !transitionControl || !musicalChoice || saved} onClick={saveAttempt} className="min-h-[50px] w-full rounded-xl bg-emerald-500 px-4 text-sm font-black text-stone-950 disabled:bg-stone-800 disabled:text-stone-500">{saved ? 'Application attempt saved' : 'Save Play-Along Review'}</button>
          </div>
        </section>
      )}
    </div>
  );
};
