import React, { useEffect, useMemo, useState } from 'react';
import { SONG_RECOMMENDATIONS } from '../data/initialData';
import { Search, MessageSquare, Play, Headphones, Music2, ShieldCheck } from 'lucide-react';
import { PLAY_ALONG_TRACKS, PlayAlongTrack, recommendPlayAlongForCompetency } from '../data/playAlongTracks';
import { PlayAlongStudio } from './PlayAlongStudio';
import { useLearner } from '../context/LearnerContext';
import { deriveCurrentCurriculumPosition } from '../lib/canonicalProgressEngine';
import { CURRICULUM_COMPETENCIES_BY_ID } from '../data/canonicalCurriculum';

interface SongVaultViewProps {
  onAskCoachAboutSong: (title: string, artist: string, skill: string) => void;
  initialPlayAlongId?: string | null;
  onInitialPlayAlongConsumed?: () => void;
}

export const SongVaultView: React.FC<SongVaultViewProps> = ({ onAskCoachAboutSong, initialPlayAlongId, onInitialPlayAlongConsumed }) => {
  const { skills } = useLearner();
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | 'Practice' | 'Stretch'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlayAlong, setActivePlayAlong] = useState<PlayAlongTrack | null>(null);

  const curriculumPosition = useMemo(() => deriveCurrentCurriculumPosition(skills), [skills]);
  const activeCompetency = CURRICULUM_COMPETENCIES_BY_ID.get(curriculumPosition.activeCompetencyId);
  const recommendedTrack = recommendPlayAlongForCompetency(curriculumPosition.activeCompetencyId);

  useEffect(() => {
    if (!initialPlayAlongId) return;
    const requested = PLAY_ALONG_TRACKS.find((track) => track.id === initialPlayAlongId);
    if (requested) setActivePlayAlong(requested);
    onInitialPlayAlongConsumed?.();
  }, [initialPlayAlongId, onInitialPlayAlongConsumed]);

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
          onClose={() => setActivePlayAlong(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 pb-24 md:pb-6 space-y-6">
      <div className="bg-[#171612] border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-stone-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            C3 Musical Application Engine
          </span>
          <h2 className="text-2xl font-black text-white mt-2 mb-1">Play the curriculum inside music</h2>
          <p className="text-sm text-stone-300 max-w-3xl leading-6">
            Original no-drum backing tracks turn verified vocabulary into groove choices, fills, dynamics, restraint and complete song-form awareness.
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
          <button onClick={() => setActivePlayAlong(recommendedTrack)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#4a523a] px-5 text-xs font-black text-white shadow-sm">
            <Play className="h-4 w-4 fill-current" /> Open Recommended Play-Along
          </button>
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
                <button onClick={() => setActivePlayAlong(track)} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 text-xs font-black text-white">
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
