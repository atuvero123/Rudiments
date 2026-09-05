import React, { useState } from 'react';
import { useLearner } from '../context/LearnerContext';
import { PracticeEquipment, PracticePriority } from '../types';
import { CurriculumProgressOverview } from './CurriculumProgressOverview';
import {
  User,
  Clock,
  Drum,
  Music,
  Target,
  Plus,
  X,
  CheckCircle2,
  Sparkles,
  Sliders,
  Shield,
  Heart,
  Award,
} from 'lucide-react';

export const LearnerProfileView: React.FC = () => {
  const { profile, skills, updateProfile, resetToDefaults } = useLearner();

  const [typicalTime, setTypicalTime] = useState(profile.typicalPracticeTime);
  const [equipment, setEquipment] = useState<PracticeEquipment>(profile.equipment);
  const [responsibilities, setResponsibilities] = useState(profile.musicalResponsibilities);
  const [priority, setPriority] = useState<PracticePriority>(profile.practicePriority);

  // Lists state
  const [contexts, setContexts] = useState<string[]>(profile.mainMusicalContexts || []);
  const [newContextInput, setNewContextInput] = useState('');

  const [genres, setGenres] = useState<string[]>(profile.mainGenres || []);
  const [newGenreInput, setNewGenreInput] = useState('');

  const [goals, setGoals] = useState<string[]>(profile.personalGoals || []);
  const [newGoalInput, setNewGoalInput] = useState('');

  const [songs, setSongs] = useState<string[]>(profile.favouriteSongs || []);
  const [newSongInput, setNewSongInput] = useState('');

  const [artists, setArtists] = useState<string[]>(profile.favouriteArtists || []);
  const [newArtistInput, setNewArtistInput] = useState('');

  const [drummers, setDrummers] = useState<string[]>(profile.favouriteDrummers || []);
  const [newDrummerInput, setNewDrummerInput] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    updateProfile({
      typicalPracticeTime: typicalTime,
      equipment,
      musicalResponsibilities: responsibilities,
      practicePriority: priority,
      mainMusicalContexts: contexts,
      mainGenres: genres,
      personalGoals: goals,
      favouriteSongs: songs,
      favouriteArtists: artists,
      favouriteDrummers: drummers,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!input.trim()) return;
    setList([...list, input.trim()]);
    setInput('');
  };

  const handleRemoveItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const ALL_GENRE_PRESETS = [
    'Worship',
    'Rock',
    'Reggae',
    'Afrobeat',
    'Jazz',
    'Gospel',
    'Funk',
    'Pop',
    'Latin',
    'Metal',
  ];

  const toggleGenrePreset = (g: string) => {
    if (genres.includes(g)) {
      setGenres(genres.filter((item) => item !== g));
    } else {
      setGenres([...genres, g]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 border border-[#4a523a]/20 px-2.5 py-1 rounded-full">
            Learner Profile & Context
          </span>
          <h2 className="text-2xl font-black text-stone-900 mt-2 mb-1">
            Personal Drummer Profile
          </h2>
          <p className="text-sm text-stone-600">
            Coach Rudiment adapts tempo ladders, exercise selections, and lesson recommendations to your specific practice setup and goals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#3f4532] hover:bg-[#323827] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedSuccess ? 'Saved Changes!' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      <CurriculumProgressOverview skills={skills} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Practice Context & Priority */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Practice Context */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
              <Clock className="w-5 h-5 text-[#4a523a]" />
              1. Practice Context & Equipment
            </h3>

            {/* Typical Time & Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-stone-700 font-bold block mb-1.5">
                  Available Practice Time:
                </label>
                <select
                  value={typicalTime}
                  onChange={(e) => setTypicalTime(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-900 p-2.5 rounded-xl font-semibold focus:outline-none focus:border-[#4a523a]"
                >
                  <option value="15–30 minutes">15–30 minutes (Short bursts)</option>
                  <option value="30–60 minutes">30–60 minutes (Standard daily)</option>
                  <option value="60–120 minutes">60–120 minutes (Deep focus)</option>
                  <option value="120+ minutes">120+ minutes (Heavy drumming)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-700 font-bold block mb-1.5">
                  Practice Equipment:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Practice Pad', 'Full Drum Kit', 'Both'] as PracticeEquipment[]).map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => setEquipment(eq)}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border text-center transition-all ${
                        equipment === eq
                          ? 'bg-[#3f4532] text-white border-[#3f4532]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Musical Responsibilities */}
            <div className="text-xs">
              <label className="text-stone-700 font-bold block mb-1.5">
                Current Musical Responsibilities:
              </label>
              <input
                type="text"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="e.g. Sunday church team drummer, garage band jams, pad soloist..."
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 p-2.5 rounded-xl focus:outline-none focus:border-[#4a523a]"
              />
            </div>

            {/* Main Musical Contexts */}
            <div className="text-xs space-y-2">
              <label className="text-stone-700 font-bold block">
                Main Playing Contexts:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContextInput}
                  onChange={(e) => setNewContextInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    handleAddItem(contexts, setContexts, newContextInput, setNewContextInput))
                  }
                  placeholder="e.g. Worship Band, Pad Practice, Gigs..."
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 p-2 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem(contexts, setContexts, newContextInput, setNewContextInput)
                  }
                  className="px-3.5 py-2 bg-[#4a523a] text-white font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {contexts.map((ctx, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-1 rounded-lg text-xs"
                  >
                    <span>{ctx}</span>
                    <button
                      onClick={() => handleRemoveItem(contexts, setContexts, idx)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Personal Drumming Goals */}
            <div className="text-xs space-y-2">
              <label className="text-stone-700 font-bold block">
                Personal Drumming Goals:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    handleAddItem(goals, setGoals, newGoalInput, setNewGoalInput))
                  }
                  placeholder="e.g. Master 6/8 fill transitions, cleaner left hand..."
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 p-2 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(goals, setGoals, newGoalInput, setNewGoalInput)}
                  className="px-3.5 py-2 bg-[#4a523a] text-white font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>
              <ul className="space-y-1.5 pt-1">
                {goals.map((goal, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between bg-stone-50 p-2 rounded-lg border border-stone-200 text-stone-800 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      <Target className="w-3.5 h-3.5 text-[#4a523a] shrink-0 mt-0.5" />
                      <span>{goal}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(goals, setGoals, idx)}
                      className="text-stone-400 hover:text-stone-700 ml-2"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 2: Practice Priority Mode */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
              <Sliders className="w-5 h-5 text-[#4a523a]" />
              2. Practice Priority Mode
            </h3>
            <p className="text-xs text-stone-600">
              Select your current focal mode. Future practice generators will weight routines according to this choice.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'Skill Development',
                    title: 'Skill Development',
                    desc: 'Focus heavily on rudiments, mechanics, and limb independence exercises.',
                  },
                  {
                    id: 'Song / Performance Preparation',
                    title: 'Song Prep',
                    desc: 'Prioritize song structures, groove consistency, and live set performance.',
                  },
                  {
                    id: 'Balanced',
                    title: 'Balanced',
                    desc: '50% technique/rudiments, 50% song vocabulary and groove application.',
                  },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPriority(mode.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    priority === mode.id
                      ? 'bg-[#3f4532] text-white border-[#3f4532] shadow-sm'
                      : 'bg-stone-50 text-stone-800 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs block mb-1">{mode.title}</span>
                    <span className="text-[11px] opacity-80 leading-tight block">
                      {mode.desc}
                    </span>
                  </div>
                  {priority === mode.id && (
                    <span className="mt-3 text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded text-center">
                      Active Priority
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Musical Interests */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
              <Music className="w-5 h-5 text-[#4a523a]" />
              3. Musical Interests & Genres
            </h3>

            {/* Genre Presets */}
            <div className="space-y-2 text-xs">
              <label className="text-stone-700 font-bold block">
                Primary Genres & Styles:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_GENRE_PRESETS.map((g) => {
                  const isSelected = genres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenrePreset(g)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all text-xs border ${
                        isSelected
                          ? 'bg-[#4a523a] text-white border-[#4a523a]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Favourite Songs */}
            <div className="text-xs space-y-2">
              <label className="text-stone-700 font-bold block">
                Favourite Practice & Reference Songs:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSongInput}
                  onChange={(e) => setNewSongInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    handleAddItem(songs, setSongs, newSongInput, setNewSongInput))
                  }
                  placeholder="e.g. Reckless Love, Superstition..."
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 p-2 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(songs, setSongs, newSongInput, setNewSongInput)}
                  className="px-3.5 py-2 bg-[#4a523a] text-white font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {songs.map((song, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-1 rounded-lg text-xs"
                  >
                    <span>{song}</span>
                    <button
                      onClick={() => handleRemoveItem(songs, setSongs, idx)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Favourite Artists */}
            <div className="text-xs space-y-2">
              <label className="text-stone-700 font-bold block">
                Inspirational Artists / Bands:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArtistInput}
                  onChange={(e) => setNewArtistInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    handleAddItem(artists, setArtists, newArtistInput, setNewArtistInput))
                  }
                  placeholder="e.g. Bethel Music, Snarky Puppy..."
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 p-2 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem(artists, setArtists, newArtistInput, setNewArtistInput)
                  }
                  className="px-3.5 py-2 bg-[#4a523a] text-white font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {artists.map((art, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-1 rounded-lg text-xs"
                  >
                    <span>{art}</span>
                    <button
                      onClick={() => handleRemoveItem(artists, setArtists, idx)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Favourite Drummers */}
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-stone-700 font-bold block">
                  Inspirational Drummers:
                </label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  USER PROVIDED
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDrummerInput}
                  onChange={(e) => setNewDrummerInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    handleAddItem(drummers, setDrummers, newDrummerInput, setNewDrummerInput))
                  }
                  placeholder="e.g. Vincent Baynard, Larnell Lewis..."
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 p-2 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleAddItem(drummers, setDrummers, newDrummerInput, setNewDrummerInput)
                  }
                  className="px-3.5 py-2 bg-[#4a523a] text-white font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {drummers.map((drm, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  >
                    <span>{drm}</span>
                    <button
                      onClick={() => handleRemoveItem(drummers, setDrummers, idx)}
                      className="text-amber-600 hover:text-amber-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Coach Recommended Drummers & Songs (SEPARATE FROM USER PREFERENCES) */}
            {profile.coachRecommendedDrummers && profile.coachRecommendedDrummers.length > 0 && (
              <div className="text-xs space-y-2 pt-3 border-t border-stone-200 bg-stone-50/70 p-3 rounded-xl border">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Coach Recommended Drummers
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
                    COACH RECOMMENDATION
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Curriculum suggestions from Coach Rudiment. These do not alter your personal favorites.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.coachRecommendedDrummers.map((rd, i) => (
                    <span
                      key={i}
                      className="bg-white text-stone-700 border border-stone-200 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                    >
                      {rd}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
