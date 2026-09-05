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
  PlayAlongVariation,
  SectionCue,
} from '../data/playAlongTracks';
import {
  getTotalPlayAlongBars,
  PlayAlongTransport,
  PlayAlongTransportSnapshot,
} from '../lib/playAlongEngine';
import { isCompetencyVerified } from '../lib/canonicalProgressEngine';
import { CURRICULUM_COMPETENCIES_BY_ID } from '../data/canonicalCurriculum';
import { getMusicalDevelopmentStep, MusicalDevelopmentMission } from '../data/musicalDevelopment';
import { previewPlayAlongVariation } from '../lib/musicalVariationPreview';

interface PlayAlongStudioProps {
  track: PlayAlongTrack;
  currentCompetencyId?: string | null;
  developmentStepId?: string | null;
  initialApplicationMode?: PlayAlongApplicationMode;
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
  developmentStepId?: string | null;
  selectedVariationId?: string | null;
  constraintControl?: 'BROKE' | 'MOSTLY' | 'FOLLOWED';
  developmentMissionId?: string | null;
  ownership?: 'COPIED' | 'CHOSE' | 'CREATED';
  creativeElement?: string | null;
  creativeLocation?: string | null;
}

const HISTORY_KEY = 'RUDIMENT_PLAYALONG_HISTORY_V1';

const APPLICATION_OPTIONS: Array<{
  id: PlayAlongApplicationMode;
  label: string;
  description: string;
}> = [
  { id: 'GROOVE_ONLY', label: 'Groove only', description: 'No fills. Protect pulse, pocket and section dynamics.' },
  { id: 'GROOVE_VARIATION', label: 'Groove variation', description: 'Alternate the base groove with one verified variation without disturbing the pocket.' },
  { id: 'THREE_PLUS_ONE', label: '3 + 1', description: 'Three bars groove, one full bar fill.' },
  { id: 'SEVEN_PLUS_ONE', label: '7 + 1', description: 'Seven bars groove, one full bar fill.' },
  { id: 'HALF_BAR_FILL', label: 'Half-bar fills', description: 'Enter the fill on beat 3 in selected transition bars.' },
  { id: 'BEAT_FOUR_FILL', label: 'Beat-4 fills', description: 'Use only beat 4 for a compact transition.' },
  { id: 'RUDIMENT_FILL', label: 'Rudiment as fill', description: 'Choose one verified rudiment and place it musically at selected phrase endings.' },
  { id: 'MUSICAL_CHOICE', label: 'Musical choice', description: 'The arrangement tells you when to fill, build or deliberately leave space.' },
  { id: 'CREATIVITY_CHALLENGE', label: 'Creativity challenge', description: 'Choose from verified vocabulary under a musical constraint instead of copying one answer.' },
  { id: 'FULL_ARRANGEMENT', label: 'Full arrangement', description: 'Shape the whole song with groove, dynamics, fills, restraint and recovery.' },
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
  snapshot: PlayAlongTransportSnapshot | null,
  variation?: PlayAlongVariation
): { title: string; detail: string; emphasis: 'groove' | 'fill' | 'choice' } {
  if (!snapshot) {
    return { title: 'Ready', detail: 'Press Start when your sticks and posture are set.', emphasis: 'groove' };
  }

  const bar = snapshot.currentBar;
  const section = snapshot.currentSection;
  const isSectionFinalBar = snapshot.barInSection === snapshot.sectionBars;

  if (mode === 'GROOVE_ONLY') {
    return { title: 'GROOVE', detail: 'Stay in the simplest verified groove. No fill this bar.', emphasis: 'groove' };
  }
  if (mode === 'GROOVE_VARIATION') {
    const useVariation = snapshot.barInSection > Math.ceil(snapshot.sectionBars / 2);
    return useVariation
      ? {
          title: 'VARIATION B',
          detail: variation
            ? `${variation.label}: ${variation.description}`
            : 'Change only the kick phrase. Keep hi-hat spacing and backbeat identical.',
          emphasis: 'choice',
        }
      : {
          title: 'GROOVE A',
          detail: 'Play the basic backbeat groove first. Make the listener feel the foundation before changing it.',
          emphasis: 'groove',
        };
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
  if (mode === 'RUDIMENT_FILL') {
    return isSectionFinalBar
      ? {
          title: 'RUDIMENT → MUSIC',
          detail: variation
            ? `${variation.label}. ${variation.placementHint || variation.description} Land the next section on beat 1.`
            : 'Use one verified rudiment as a short fill, then return to the groove on beat 1.',
          emphasis: 'fill',
        }
      : {
          title: 'GROOVE FIRST',
          detail: 'Do not practise the rudiment continuously. Preserve the song until a phrase ending gives it somewhere to belong.',
          emphasis: 'groove',
        };
  }
  if (mode === 'MUSICAL_CHOICE') {
    if (isSectionFinalBar) {
      return { title: 'TRANSITION CHOICE', detail: cueToInstruction(section.transitionCue), emphasis: 'choice' };
    }
    return { title: 'SERVE THE SECTION', detail: section.grooveHint, emphasis: 'groove' };
  }
  if (mode === 'CREATIVITY_CHALLENGE') {
    if (isSectionFinalBar) {
      return {
        title: 'CREATE — WITH RESTRAINT',
        detail: `${cueToInstruction(section.transitionCue)} Use only verified vocabulary and remember the two-fill limit for the whole arrangement.`,
        emphasis: 'choice',
      };
    }
    return {
      title: 'DEVELOP THE SECTION',
      detail: variation
        ? `Explore ${variation.label.toLowerCase()} without changing the tempo or the backbeat foundation.`
        : section.grooveHint,
      emphasis: 'choice',
    };
  }
  if (mode === 'FULL_ARRANGEMENT') {
    return isSectionFinalBar
      ? {
          title: 'ARRANGE THE TRANSITION',
          detail: cueToInstruction(section.transitionCue),
          emphasis: 'choice',
        }
      : {
          title: section.energy >= 3 ? 'LIFT — KEEP THE POCKET' : 'SUPPORT THE SECTION',
          detail: section.grooveHint,
          emphasis: 'groove',
        };
  }
  return { title: 'FREE PLAY', detail: 'Make your own musical choices while protecting time, dynamics and section awareness.', emphasis: 'choice' };
}

export const PlayAlongStudio: React.FC<PlayAlongStudioProps> = ({
  track,
  currentCompetencyId,
  developmentStepId,
  initialApplicationMode,
  onClose,
}) => {
  const { skills } = useLearner();
  const developmentStep = getMusicalDevelopmentStep(developmentStepId);
  const [coachMode, setCoachMode] = useState<PlayAlongCoachMode>('GUIDED');
  const [applicationMode, setApplicationMode] = useState<PlayAlongApplicationMode>(
    initialApplicationMode || developmentStep?.applicationMode || 'MUSICAL_CHOICE'
  );
  const [clickEnabled, setClickEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolume] = useState(0.55);
  const [snapshot, setSnapshot] = useState<PlayAlongTransportSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [rating, setRating] = useState<PlayAlongRating | null>(null);
  const [transitionControl, setTransitionControl] = useState<'LOST' | 'MIXED' | 'SOLID' | null>(null);
  const [musicalChoice, setMusicalChoice] = useState<'OVERPLAYED' | 'UNSURE' | 'MUSICAL' | null>(null);
  const [constraintControl, setConstraintControl] = useState<'BROKE' | 'MOSTLY' | 'FOLLOWED' | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<'COPIED' | 'CHOSE' | 'CREATED' | null>(null);
  const [creativeElement, setCreativeElement] = useState<string>('');
  const [creativeLocation, setCreativeLocation] = useState<string>('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [previewingVariationId, setPreviewingVariationId] = useState<string | null>(null);
  const transportRef = useRef<PlayAlongTransport | null>(null);
  const lastPromptBarRef = useRef<number>(0);

  const completedMissionIds = useMemo(() => {
    const completed = new Set<string>();
    if (!developmentStep) return completed;
    const history = loadHistory();
    const hasLegacySuccessfulStepAttempt = history.some((attempt) =>
      attempt.developmentStepId === developmentStep.id &&
      !attempt.developmentMissionId &&
      attempt.rating !== 'STRUGGLED' &&
      attempt.transitionControl !== 'LOST' &&
      attempt.musicalChoice !== 'OVERPLAYED' &&
      attempt.constraintControl === 'FOLLOWED'
    );
    if (hasLegacySuccessfulStepAttempt) {
      developmentStep.missions.forEach((missionItem) => completed.add(missionItem.id));
      return completed;
    }
    history.forEach((attempt) => {
      const missionItem = developmentStep.missions.find((candidate) => candidate.id === attempt.developmentMissionId);
      const creatorPassed = !missionItem?.creatorPrompt || attempt.ownership === 'CREATED';
      if (
        attempt.developmentStepId === developmentStep.id &&
        attempt.developmentMissionId &&
        attempt.rating !== 'STRUGGLED' &&
        attempt.transitionControl !== 'LOST' &&
        attempt.musicalChoice !== 'OVERPLAYED' &&
        attempt.constraintControl === 'FOLLOWED' &&
        creatorPassed
      ) {
        completed.add(attempt.developmentMissionId);
      }
    });
    return completed;
  }, [developmentStep?.id, historyRevision]);

  const missionPrerequisitesMet = (missionItem: MusicalDevelopmentMission) =>
    (missionItem.prerequisiteCompetencyIds || []).every((id) => isCompetencyVerified(id, skills));

  const missionAvailable = (missionItem: MusicalDevelopmentMission) => {
    if (!developmentStep) return false;
    const index = developmentStep.missions.findIndex((candidate) => candidate.id === missionItem.id);
    const previousComplete = index <= 0 || completedMissionIds.has(developmentStep.missions[index - 1].id);
    return previousComplete && missionPrerequisitesMet(missionItem);
  };

  const recommendedMission = developmentStep?.missions.find((missionItem) =>
    missionAvailable(missionItem) && !completedMissionIds.has(missionItem.id)
  ) || developmentStep?.missions.find((missionItem) => missionAvailable(missionItem)) || developmentStep?.missions[0];

  const activeMission = developmentStep?.missions.find((missionItem) => missionItem.id === activeMissionId) || recommendedMission;
  const nextMissionAfterActive = activeMission && developmentStep
    ? developmentStep.missions[developmentStep.missions.findIndex((missionItem) => missionItem.id === activeMission.id) + 1]
    : undefined;
  const currentPracticeConstraint = activeMission?.practiceConstraint || developmentStep?.practiceConstraint || '';
  const creativePlan = activeMission?.creatorPrompt && creativeElement && creativeLocation
    ? `${creativeElement} • ${creativeLocation}`
    : '';

  const verifiedVariations = useMemo(() => track.variations.filter((variation) =>
    variation.prerequisiteCompetencyIds.every((id) => isCompetencyVerified(id, skills))
  ), [track, skills]);

  const lockedVariations = useMemo(() => track.variations.filter((variation) =>
    !variation.prerequisiteCompetencyIds.every((id) => isCompetencyVerified(id, skills))
  ), [track, skills]);

  const contextualVariations = useMemo(() => {
    if (applicationMode === 'RUDIMENT_FILL') return verifiedVariations.filter((v) => v.kind === 'rudiment');
    if (applicationMode === 'GROOVE_VARIATION') return verifiedVariations.filter((v) => v.kind === 'groove');
    if (applicationMode === 'CREATIVITY_CHALLENGE' || applicationMode === 'FULL_ARRANGEMENT') return verifiedVariations;
    return verifiedVariations;
  }, [verifiedVariations, applicationMode]);

  const preferredVariationIds = activeMission?.preferredVariationIds || developmentStep?.preferredVariationIds;
  const preferredVariation = preferredVariationIds
    ?.map((id) => contextualVariations.find((variation) => variation.id === id))
    .find((variation): variation is PlayAlongVariation => Boolean(variation));

  const selectedVariation =
    contextualVariations.find((variation) => variation.id === selectedVariationId) ||
    preferredVariation ||
    contextualVariations[0];

  const currentPrompt = applicationInstruction(applicationMode, snapshot, selectedVariation);
  const totalBars = getTotalPlayAlongBars(track);

  const applicationRequirements: Partial<Record<PlayAlongApplicationMode, string[]>> = {
    GROOVE_VARIATION: ['comp-grv-backbeat', 'comp-grv-stability', 'comp-grv-kick-variation'],
    THREE_PLUS_ONE: ['comp-fill-quarter', 'comp-fill-recovery'],
    SEVEN_PLUS_ONE: ['comp-fill-quarter', 'comp-fill-recovery'],
    HALF_BAR_FILL: ['comp-fill-entry', 'comp-fill-recovery'],
    BEAT_FOUR_FILL: ['comp-fill-entry', 'comp-fill-recovery'],
    RUDIMENT_FILL: ['comp-rud-singles', 'comp-fill-recovery'],
    CREATIVITY_CHALLENGE: ['comp-perf-song-arrangement', 'comp-fill-recovery'],
    FULL_ARRANGEMENT: ['comp-perf-song-app', 'comp-perf-song-arrangement'],
  };
  const applicationAvailable = (mode: PlayAlongApplicationMode) => {
    if (developmentStep && activeMission?.applicationMode === mode && missionPrerequisitesMet(activeMission)) return true;
    return (applicationRequirements[mode] || []).every((id) => isCompetencyVerified(id, skills));
  };

  const missingRequirements = (mode: PlayAlongApplicationMode) =>
    (applicationRequirements[mode] || [])
      .filter((id) => !isCompetencyVerified(id, skills))
      .map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id)?.title || id);

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
    if (developmentStep && recommendedMission && !activeMissionId) setActiveMissionId(recommendedMission.id);
  }, [developmentStep?.id, recommendedMission?.id]);

  useEffect(() => {
    if (activeMission) {
      setApplicationMode(activeMission.applicationMode);
      if (activeMission.recommendedCoachMode) setCoachMode(activeMission.recommendedCoachMode);
      const creator = activeMission.creatorPrompt;
      setCreativeElement(creator?.elementOptions[0] || '');
      setCreativeLocation(creator?.locationOptions[0] || '');
      setOwnership(null);
      return;
    }
    if (developmentStep?.applicationMode) setApplicationMode(developmentStep.applicationMode);
    else if (initialApplicationMode) setApplicationMode(initialApplicationMode);
  }, [activeMission?.id, developmentStep?.id, initialApplicationMode]);

  useEffect(() => {
    if (!contextualVariations.length) {
      setSelectedVariationId(null);
      return;
    }
    if (selectedVariationId && contextualVariations.some((v) => v.id === selectedVariationId)) return;
    const preferredIds = activeMission?.preferredVariationIds || developmentStep?.preferredVariationIds;
    const preferred = preferredIds
      ?.map((id) => contextualVariations.find((variation) => variation.id === id))
      .find(Boolean);
    setSelectedVariationId((preferred || contextualVariations[0]).id);
  }, [applicationMode, contextualVariations, developmentStep?.id, activeMission?.id]);

  useEffect(() => {
    if (!snapshot || !isRunning || coachMode !== 'GUIDED' || !voiceEnabled) return;
    if (snapshot.currentBar === lastPromptBarRef.current) return;
    lastPromptBarRef.current = snapshot.currentBar;
    const instruction = applicationInstruction(applicationMode, snapshot, selectedVariation);
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
  }, [snapshot?.currentBar, applicationMode, coachMode, voiceEnabled, isRunning, selectedVariation?.id]);

  const start = async () => {
    setIsComplete(false);
    setSaved(false);
    setRating(null);
    setTransitionControl(null);
    setMusicalChoice(null);
    setConstraintControl(null);
    setOwnership(null);
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
    setConstraintControl(null);
    setOwnership(null);
    lastPromptBarRef.current = 0;
  };

  const saveAttempt = () => {
    if (!rating || !transitionControl || !musicalChoice || (developmentStep && !constraintControl) || (activeMission?.ownershipCheck && !ownership)) return;
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
      developmentStepId: developmentStep?.id || null,
      selectedVariationId: selectedVariation?.id || null,
      constraintControl: constraintControl || undefined,
      developmentMissionId: activeMission?.id || null,
      ownership: ownership || undefined,
      creativeElement: activeMission?.creatorPrompt ? creativeElement || null : null,
      creativeLocation: activeMission?.creatorPrompt ? creativeLocation || null : null,
    };
    const next = [attempt, ...history].slice(0, 40);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setSaved(true);
    setHistoryRevision((value) => value + 1);
  };

  const previewVariation = async (variation: PlayAlongVariation) => {
    if (isRunning || previewingVariationId) return;
    setPreviewingVariationId(variation.id);
    try {
      await previewPlayAlongVariation(variation, track.bpm);
      window.setTimeout(() => setPreviewingVariationId(null), Math.max(900, (60 / track.bpm) * 4 * 1000 + 250));
    } catch {
      setPreviewingVariationId(null);
    }
  };

  const selectMission = (missionItem: MusicalDevelopmentMission) => {
    if (!missionAvailable(missionItem) && !completedMissionIds.has(missionItem.id)) return;
    reset();
    setActiveMissionId(missionItem.id);
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

      {developmentStep && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">C3.3 Musical Development • Step {developmentStep.order} of 7</p>
              <h3 className="mt-1 text-lg font-black text-stone-900">{developmentStep.title}</h3>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-600">{developmentStep.outcome}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-violet-700 shadow-sm">{developmentStep.stage}</span>
              <p className="mt-2 text-[10px] font-bold text-stone-500">{completedMissionIds.size}/{developmentStep.missions.length} missions</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Development sequence</p>
            <p className="mt-1 text-xs text-stone-600">Build ownership one musical decision at a time. Later missions unlock only after the earlier mission is controlled.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {developmentStep.missions.map((missionItem) => {
                const complete = completedMissionIds.has(missionItem.id);
                const available = missionAvailable(missionItem) || complete;
                const active = activeMission?.id === missionItem.id;
                const missing = (missionItem.prerequisiteCompetencyIds || []).filter((id) => !isCompetencyVerified(id, skills));
                return (
                  <button
                    key={missionItem.id}
                    type="button"
                    disabled={!available}
                    onClick={() => selectMission(missionItem)}
                    className={`min-h-[104px] rounded-xl border p-3 text-left transition-all ${active ? 'border-violet-500 bg-white ring-2 ring-violet-200' : complete ? 'border-emerald-200 bg-emerald-50' : available ? 'border-violet-100 bg-white' : 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Mission {missionItem.order}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${complete ? 'bg-emerald-600 text-white' : active ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-500'}`}>{complete ? 'DONE' : active ? 'NOW' : available ? 'READY' : 'LOCKED'}</span>
                    </div>
                    <strong className="mt-2 block text-xs text-stone-900">{missionItem.shortTitle}</strong>
                    <span className="mt-1 block text-[10px] leading-4 text-stone-500">{missionItem.objective}</span>
                    {!available && missing.length > 0 && <span className="mt-2 block text-[9px] font-semibold text-stone-500">Verify: {missing.map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id)?.title || id).join(' • ')}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {activeMission && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-violet-100 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Current mission • {activeMission.title}</p>
                <p className="mt-2 text-xs leading-5 text-stone-700"><strong>Rule:</strong> {activeMission.practiceConstraint}</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Listen / feel for</p>
                <p className="mt-2 text-xs leading-5 text-stone-700">{activeMission.evidenceFocus}</p>
              </div>
            </div>
          )}

          {activeMission?.creatorPrompt && (
            <div className="mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-fuchsia-600" />
                <div className="flex-1">
                  <p className="text-xs font-black text-stone-900">{activeMission.creatorPrompt.title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-stone-600">{activeMission.creatorPrompt.rule}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">What will you change?
                      <select value={creativeElement} onChange={(event) => setCreativeElement(event.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-fuchsia-200 bg-white px-2 text-xs normal-case text-stone-800">
                        {activeMission.creatorPrompt.elementOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Where will you use it?
                      <select value={creativeLocation} onChange={(event) => setCreativeLocation(event.target.value)} className="mt-1 min-h-[42px] w-full rounded-lg border border-fuchsia-200 bg-white px-2 text-xs normal-case text-stone-800">
                        {activeMission.creatorPrompt.locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  </div>
                  {creativePlan && <p className="mt-3 rounded-lg bg-white p-2 text-[11px] font-semibold text-fuchsia-800">My plan: {creativePlan}</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

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
            {developmentStep && activeMission ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Mission-defined challenge</p>
                    <h4 className="mt-1 text-sm font-black text-stone-900">{APPLICATION_OPTIONS.find((option) => option.id === activeMission.applicationMode)?.label || activeMission.applicationMode}</h4>
                    <p className="mt-1 text-xs leading-5 text-stone-600">{activeMission.practiceConstraint}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase text-stone-600">No skipping ahead</span>
                </div>
              </div>
            ) : (
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
                      <span className="mt-1 block text-[10px] leading-4 text-stone-500">{available ? option.description : `Verify first: ${missingRequirements(option.id).join(' • ') || 'required curriculum skills'}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
              {selectedVariation && ['GROOVE_VARIATION','RUDIMENT_FILL','CREATIVITY_CHALLENGE','FULL_ARRANGEMENT'].includes(applicationMode) && (
                <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-[10px] font-semibold text-stone-600">Current vocabulary focus: {selectedVariation.label}</p>
              )}
              {creativePlan && (
                <p className="mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-1.5 text-[10px] font-semibold text-fuchsia-800">Your created idea: {creativePlan}</p>
              )}
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
            {verifiedVariations.map((variation) => {
              const active = selectedVariation?.id === variation.id;
              const previewing = previewingVariationId === variation.id;
              return (
                <div
                  key={variation.id}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${active ? 'border-[#4a523a] bg-[#eef1e8] ring-1 ring-[#4a523a]/20' : 'border-emerald-200 bg-emerald-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setSelectedVariationId(variation.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" /><strong className="text-xs text-stone-900">{variation.label}</strong></div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {active && <span className="rounded-full bg-[#4a523a] px-2 py-0.5 text-[9px] font-black uppercase text-white">Focus</span>}
                      <button
                        type="button"
                        disabled={isRunning || Boolean(previewingVariationId)}
                        onClick={() => previewVariation(variation)}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 text-[9px] font-black text-stone-700 disabled:opacity-50"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> {previewing ? 'Playing…' : 'Hear'}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedVariationId(variation.id)} className="mt-1 block w-full text-left">
                    <p className="text-[11px] leading-5 text-stone-600">{variation.description}</p>
                    {variation.countPattern && <p className="mt-2 font-mono text-[10px] text-stone-700"><strong>Count:</strong> {variation.countPattern}</p>}
                    {variation.stickingPattern && <p className="mt-1 font-mono text-[10px] text-stone-700"><strong>Pattern:</strong> {variation.stickingPattern}</p>}
                    {variation.placementHint && <p className="mt-1 text-[10px] italic leading-4 text-stone-500">{variation.placementHint}</p>}
                  </button>
                </div>
              );
            })}
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
            {developmentStep && (
              <div>
                <p className="mb-2 text-xs font-bold text-stone-300">Did you respect this {activeMission ? 'mission' : 'step'} practice constraint?</p>
                <p className="mb-2 text-[10px] leading-4 text-stone-500">{currentPracticeConstraint}</p>
                <div className="grid grid-cols-3 gap-2">{([['BROKE','Lost the constraint'],['MOSTLY','Mostly'],['FOLLOWED','Followed it']] as const).map(([id,label])=><button key={id} onClick={()=>setConstraintControl(id)} className={`min-h-[48px] rounded-xl border p-2 text-xs font-bold ${constraintControl===id?'border-emerald-400 bg-emerald-500 text-stone-950':'border-stone-700 bg-stone-900 text-stone-300'}`}>{label}</button>)}</div>
              </div>
            )}
            {activeMission?.ownershipCheck && (
              <div>
                <p className="mb-2 text-xs font-bold text-stone-300">How much ownership did you have over the musical choice?</p>
                <div className="grid grid-cols-3 gap-2">{([['COPIED','Copied the model'],['CHOSE','I chose it'],['CREATED','I created it']] as const).map(([id,label])=><button key={id} onClick={()=>setOwnership(id)} className={`min-h-[48px] rounded-xl border p-2 text-xs font-bold ${ownership===id?'border-fuchsia-400 bg-fuchsia-500 text-white':'border-stone-700 bg-stone-900 text-stone-300'}`}>{label}</button>)}</div>
                {activeMission.creatorPrompt && creativePlan && <p className="mt-2 text-[10px] text-stone-500">Planned idea: {creativePlan}</p>}
              </div>
            )}
            <button disabled={!rating || !transitionControl || !musicalChoice || (developmentStep ? !constraintControl : false) || (activeMission?.ownershipCheck ? !ownership : false) || saved} onClick={saveAttempt} className="min-h-[50px] w-full rounded-xl bg-emerald-500 px-4 text-sm font-black text-stone-950 disabled:bg-stone-800 disabled:text-stone-500">{saved ? (activeMission ? `Mission ${activeMission.order} evidence saved` : developmentStep ? 'Musical development evidence saved' : 'Application attempt saved') : 'Save Play-Along Review'}</button>
            {saved && nextMissionAfterActive && (missionAvailable(nextMissionAfterActive) || completedMissionIds.has(nextMissionAfterActive.id)) && (
              <button onClick={() => selectMission(nextMissionAfterActive)} className="min-h-[48px] w-full rounded-xl border border-violet-400 bg-violet-500 px-4 text-sm font-black text-white">Continue to Mission {nextMissionAfterActive.order}: {nextMissionAfterActive.shortTitle}</button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
