import React, { useState } from 'react';
import { SongRecommendation, SkillTrackId } from '../types';
import { SONG_RECOMMENDATIONS } from '../data/initialData';
import { Music, Search, Disc, Play, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';

interface SongVaultViewProps {
  onAskCoachAboutSong: (title: string, artist: string, skill: string) => void;
}

export const SongVaultView: React.FC<SongVaultViewProps> = ({ onAskCoachAboutSong }) => {
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | 'Practice' | 'Stretch'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = SONG_RECOMMENDATIONS.filter((song) => {
    const matchesTrack =
      selectedTrackFilter === 'all' || song.trackId === selectedTrackFilter;
    const matchesCategory =
      selectedCategoryFilter === 'All' || song.level === selectedCategoryFilter;
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.genre.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTrack && matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Song Recommendation Engine
          </span>
          <h2 className="text-2xl font-black text-white mt-2 mb-1">
            Practice Songs vs. Stretch Songs Vault
          </h2>
          <p className="text-sm text-slate-300">
            Curated songs categorized into <strong className="text-emerald-400">Practice Songs</strong> (learnable tempo, clean focus) and <strong className="text-amber-400">Stretch Songs</strong> (pulls you to the next level).
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, genres..."
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2">
          {(['All', 'Practice', 'Stretch'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategoryFilter === cat
                  ? cat === 'Practice'
                    ? 'bg-emerald-500 text-slate-950'
                    : cat === 'Stretch'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-700 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat} {cat !== 'All' ? 'Songs' : ''}
            </button>
          ))}
        </div>

        {/* Track Filter Select */}
        <select
          value={selectedTrackFilter}
          onChange={(e) => setSelectedTrackFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
        >
          <option value="all">All Skill Tracks</option>
          <option value="rudiments">Rudiments</option>
          <option value="grooves">Grooves & Beats</option>
          <option value="fills">Fills & Transitions</option>
          <option value="timeSignatures">Time Signatures & Odd Meters</option>
          <option value="coordination">Coordination & Independence</option>
          <option value="dynamics">Dynamics & Musicality</option>
        </select>
      </div>

      {/* Song Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => (
          <div
            key={song.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all shadow-md flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    song.level === 'Practice'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {song.level} Song
                </span>

                <span className="text-xs font-mono font-bold text-slate-400">
                  {song.bpm} BPM
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                  {song.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{song.artist}</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                  {song.genre}
                </span>
                <span>•</span>
                <span className="text-slate-400 font-medium">Timestamp: {song.skillTimestamp}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mt-2">
                <strong className="text-amber-400 block mb-0.5 text-[11px] uppercase tracking-wider">
                  Why it's a good fit:
                </strong>
                {song.whyGoodFit}
              </p>
            </div>

            <button
              onClick={() => onAskCoachAboutSong(song.title, song.artist, song.trackId)}
              className="w-full mt-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Ask Rudiment to Breakdown Drum Part</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
