import React, { useEffect, useMemo, useState } from 'react';
import { SONG_RECOMMENDATIONS } from '../data/initialData';
import { Search, MessageSquare, Play, Headphones, Music2, ShieldCheck, LockKeyhole, BadgeCheck, ArrowRight } from 'lucide-react';
import { PLAY_ALONG_TRACKS, PlayAlongTrack, recommendPlayAlongForCompetency } from '../data/playAlongTracks';
import { PlayAlongStudio } from './PlayAlongStudio';
import { useLearner } from '../context/LearnerContext';
import { deriveCurrentCurriculumPosition } from '../lib/canonicalProgressEngine';
import { CURRICULUM_COMPETENCIES_BY_ID } from '../data/canonicalCurriculum';
import { isCompetencyVerified } from '../lib/canonicalProgressEngine';
import { MUSICAL_DEVELOPMENT_44, MusicalDevelopmentStep, recommendMusicalDevelopmentStepForCompetency } from '../data/musicalDevelopment';

interface SongVaultViewProps {
  onAskCoachAboutSong: (title: string, artist: string, skill: string) => void;
  initialPlayAlongId?: string | null;
  initialDevelopmentStepId?: string | null;
  onInitialPlayAlongConsumed?: () => void;
}

export const SongVaultView: React.FC<SongVaultViewProps> = ({ onAskCoachAboutSong, initialPlayAlongId, initialDevelopmentStepId, onInitialPlayAlongConsumed }) => {
  const { skills } = useLearner();
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | 'Practice' | 'Stretch'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlayAlong, setActivePlayAlong] = useState<PlayAlongTrack | null>(null);
  const [activeDevelopmentStepId, setActiveDevelopmentStepId] = useState<string | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);

  const curriculumPosition = useMemo(() => deriveCurrentCurriculumPosition(skills), [skills]);
  const activeCompetency = CURRICULUM_COMPETENCIES_BY_ID.get(curriculumPosition.activeCompetencyId);
  const recommendedTrack = recommendPlayAlongForCompetency(curriculumPosition.activeCompetencyId);

  const completedDevelopmentStepIds = useMemo(() => {
    const completed = new Set<string>();
    try {
      const raw = localStorage.getItem('RUDIMENT_PLAYALONG_HISTORY_V1');
      const history = raw ? JSON.parse(raw) : [];
      if (Array.isArray(history)) {
        history.forEach((attempt: any) => {
          if (
            attempt?.developmentStepId &&
            attempt.rating !== 'STRUGGLED' &&
            attempt.transitionControl !== 'LOST' &&
            attempt.musicalChoice !== 'OVERPLAYED' &&
            (!attempt.developmentStepId || attempt.constraintControl === 'FOLLOWED')
          ) {
            completed.add(attempt.developmentStepId);
          }
        });
      }
    } catch {
      // Musical-development history is optional; canonical curriculum remains authoritative.
    }
    return completed;
  }, [historyRevision]);

  const curriculumRecommendedDevelopmentStep = recommendMusicalDevelopmentStepForCompetency(curriculumPosition.activeCompetencyId);

  const developmentState = (step: MusicalDevelopmentStep) => {
    const missing = step.prerequisiteCompetencyIds.filter((id) => !isCompetencyVerified(id, skills));
    const currentPathPractice = step.id === curriculumRecommendedDevelopmentStep.id;
    return {
      missing,
      currentPathPractice,
      available: missing.length === 0 || currentPathPractice,
      // A current-path preview/practice attempt cannot mark the musical step complete
      // until its canonical prerequisites have actually been verified.
      completed: missing.length === 0 && completedDevelopmentStepIds.has(step.id),
    };
  };

  const currentDevelopmentIndex = Math.max(
    0,
    MUSICAL_DEVELOPMENT_44.findIndex((step) => step.id === curriculumRecommendedDevelopmentStep.id)
  );
  const recommendedDevelopmentStep =
    MUSICAL_DEVELOPMENT_44.slice(currentDevelopmentIndex).find((step) => {
      const state = developmentState(step);
      return state.available && !state.completed;
    }) ||
    curriculumRecommendedDevelopmentStep ||
    [...MUSICAL_DEVELOPMENT_44].reverse().find((step) => developmentState(step).available) ||
    MUSICAL_DEVELOPMENT_44[0];

  const openDevelopmentStep = (step: MusicalDevelopmentStep) => {
    const track = PLAY_ALONG_TRACKS.find((candidate) => candidate.id === step.trackId);
    if (!track || !developmentState(step).available) return;
    setActiveDevelopmentStepId(step.id);
    setActivePlayAlong(track);
  };

  const closePlayAlong = () => {
    setActivePlayAlong(null);
    setActiveDevelopmentStepId(null);
    setHistoryRevision((value) => value + 1);
  };

  useEffect(() => {
    if (!initialPlayAlongId) return;
    const requested = PLAY_ALONG_TRACKS.find((track) => track.id === initialPlayAlongId);
    if (requested) {
      setActiveDevelopmentStepId(initialDevelopmentStepId || null);
      setActivePlayAlong(requested);
    }
    onInitialPlayAlongConsumed?.();
  }, [initialPlayAlongId, initialDevelopmentStepId, onInitialPlayAlongConsumed]);

  const filteredSongs = SONG_RECOMMENDATIONS.filter((song) => {
    const matchesTrack = selectedTrackFilter === 'all' || song.trackId === selectedTrackFilter;
    const matchesCategory = selectedCategoryFilter === 'All' || song.level === selectedCategoryFilter;
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTrack && matchesCategory && matchesSearch;
  });

  if (activePlayAlong) {
    return (
      <div className="mx-auto max-w-6xl p-3 pb-24 sm:p-5 md:pb-8">
        <PlayAlongStudio
          track={activePlayAlong}
          currentCompetencyId={curriculumPosition.activeCompetencyId}
          developmentStepId={activeDevelopmentStepId}
          initialApplicationMode={MUSICAL_DEVELOPMENT_44.find((step) => step.id === activeDevelopmentStepId)?.applicationMode}
          onClose={closePlayAlong}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 pb-24 md:pb-6 space-y-6">
      <div className="bg-[#171612] border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-stone-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            C3.2 Musical Development Engine
          </span>
          <h2 className="text-2xl font-black text-white mt-2 mb-1">Play the curriculum inside music</h2>
          <p className="text-sm text-stone-300 max-w-3xl leading-6">
            A progressive 4/4 application path now takes you from pulse → groove → variations → fills → rudiment application → creativity → full arrangement, using only curriculum-ready vocabulary.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[#cfd5c5] bg-[#f6f8f2] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4a523a]"><ShieldCheck className="h-4 w-4" /> Recommended from your current path</div>
            <h3 className="mt-1 text-xl font-black text-stone-900">{recommendedTrack.title}</h3>
            <p className="mt-1 text-xs text-stone-600">Current competency: <strong>{activeCompetency?.title || 'Curriculum foundation'}</strong></p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-600">{recommendedTrack.whyUseIt}</p>
          </div>
          <button onClick={() => { setActiveDevelopmentStepId(null); setActivePlayAlong(recommendedTrack); }} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#4a523a] px-5 text-xs font-black text-white shadow-sm">
            <Play className="h-4 w-4 fill-current" /> Open Recommended Play-Along
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">4/4 Musical Development Path</p>
            <h3 className="mt-1 text-lg font-black text-stone-900">Turn learned skills into a drummer's vocabulary</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">Technical skills are not thrown into music all at once. Each step unlocks only when its canonical prerequisites are verified, and a controlled play-along attempt records that you have begun applying it musically.</p>
          </div>
          <button
            onClick={() => openDevelopmentStep(recommendedDevelopmentStep)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:bg-stone-300"
            disabled={!developmentState(recommendedDevelopmentStep).available}
          >
            <Play className="h-4 w-4 fill-current" /> Continue Step {recommendedDevelopmentStep.order}
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {MUSICAL_DEVELOPMENT_44.map((step) => {
            const state = developmentState(step);
            const recommended = step.id === recommendedDevelopmentStep.id;
            const missingNames = state.missing.map((id) => CURRICULUM_COMPETENCIES_BY_ID.get(id)?.title || id);
            return (
              <article
                key={step.id}
                className={`rounded-xl border p-3 ${state.completed ? 'border-emerald-200 bg-emerald-50' : recommended ? 'border-violet-300 bg-violet-50' : state.available ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-stone-100 opacity-65'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-500">Step {step.order} • {step.stage}</p>
                    <h4 className="mt-1 text-sm font-black text-stone-900">{step.shortTitle}</h4>
                  </div>
                  {state.completed ? <BadgeCheck className="h-5 w-5 text-emerald-600" /> : !state.available ? <LockKeyhole className="h-5 w-5 text-stone-400" /> : recommended ? <ArrowRight className="h-5 w-5 text-violet-600" /> : null}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-stone-600">{step.outcome}</p>
                {!state.available && <p className="mt-2 text-[10px] leading-4 text-stone-500"><strong>Unlock:</strong> {missingNames.join(' • ')}</p>}
                {state.currentPathPractice && state.missing.length > 0 && <p className="mt-2 text-[10px] font-bold text-violet-700">Current curriculum application: you may practise this now, but it completes only after its prerequisites are verified.</p>}
                {state.completed && <p className="mt-2 text-[10px] font-bold text-emerald-700">Musical application evidence recorded.</p>}
                <button
                  onClick={() => openDevelopmentStep(step)}
                  disabled={!state.available}
                  className={`mt-3 min-h-[40px] w-full rounded-lg text-[11px] font-black ${state.available ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-400'}`}
                >
                  {state.completed ? 'Practice Again' : state.available ? 'Open Step' : 'Locked'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Original no-drum practice music</p>
            <h3 className="text-lg font-black text-stone-900">Curriculum Play-Alongs</h3>
          </div>
          <span className="text-[10px] font-bold text-stone-500">No copyrighted song audio</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLAY_ALONG_TRACKS.map((track) => {
            const recommended = track.id === recommendedTrack.id;
            return (
              <article key={track.id} className={`rounded-2xl border p-4 shadow-sm ${recommended ? 'border-[#4a523a] bg-[#f0f3eb]' : 'border-stone-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-black uppercase text-stone-600">{track.meter}</span>
                  <span className="font-mono text-xs font-black text-stone-500">{track.bpm} BPM</span>
                </div>
                <h4 className="mt-3 text-base font-black text-stone-900">{track.title}</h4>
                <p className="mt-1 text-xs text-stone-500">{track.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1">{track.style}</span>
                  <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1">{track.sections.length} sections</span>
                  {recommended && <span className="rounded-md bg-[#4a523a] px-2 py-1 font-bold text-white">Current path</span>}
                </div>
                <button onClick={() => { setActiveDevelopmentStepId(null); setActivePlayAlong(track); }} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 text-xs font-black text-white">
                  <Headphones className="h-4 w-4" /> Open Play-Along
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-stone-200 pt-6">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Reference listening library</p>
          <h3 className="text-lg font-black text-stone-900">Practice & Stretch Song Vault</h3>
          <p className="mt-1 text-xs text-stone-500">These are listening/application references only; the app does not redistribute commercial song audio.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, artists, genres..."
              className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#4a523a]"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['All', 'Practice', 'Stretch'] as const).map((cat) => (
              <button key={cat} onClick={() => setSelectedCategoryFilter(cat)} className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCategoryFilter === cat ? 'bg-[#4a523a] text-white' : 'bg-stone-50 text-stone-500 border border-stone-200'}`}>
                {cat}
              </button>
            ))}
          </div>

          <select value={selectedTrackFilter} onChange={(e) => setSelectedTrackFilter(e.target.value)} className="min-h-[40px] bg-stone-50 border border-stone-200 text-xs text-stone-700 p-2 rounded-lg focus:outline-none focus:border-[#4a523a] font-medium">
            <option value="all">All Skill Tracks</option>
            <option value="rudiments">Rudiments</option>
            <option value="grooves">Grooves & Beats</option>
            <option value="fills">Fills & Transitions</option>
            <option value="timeSignatures">Time Signatures & Odd Meters</option>
            <option value="coordination">Coordination & Independence</option>
            <option value="dynamics">Dynamics & Musicality</option>
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => (
            <div key={song.id} className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-5 space-y-3 transition-all shadow-sm flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${song.level === 'Practice' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{song.level} Song</span>
                  <span className="text-xs font-mono font-bold text-stone-500">{song.bpm} BPM</span>
                </div>
                <div><h3 className="font-bold text-base text-stone-900">{song.title}</h3><p className="text-xs text-stone-500 font-medium">{song.artist}</p></div>
                <div className="flex items-center gap-2 text-[11px] text-stone-400"><span className="px-2 py-0.5 bg-stone-50 rounded border border-stone-200">{song.genre}</span><span>•</span><span className="text-stone-500 font-medium">{song.skillTimestamp}</span></div>
                <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200 mt-2"><strong className="text-[#4a523a] block mb-0.5 text-[11px] uppercase tracking-wider">Why it's a good fit:</strong>{song.whyGoodFit}</p>
              </div>
              <button onClick={() => onAskCoachAboutSong(song.title, song.artist, song.trackId)} className="w-full min-h-[44px] mt-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-amber-400" /><span>Ask Rudiment to Break Down Drum Part</span></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
