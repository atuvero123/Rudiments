import React, { useState } from 'react';
import { useLearner } from '../context/LearnerContext';
import { GranularSkill, SkillStatus, SKILL_STATUS_CONFIG, READINESS_STATE_CONFIG, CurriculumBand } from '../types';
import { SkillDetailModal } from './SkillDetailModal';
import { deriveSkillReadiness } from '../lib/readinessEngine';
import { getActiveGapClosurePlan } from '../lib/gapClosureEngine';
import {
  CURRICULUM_COMPETENCIES_BY_SKILL_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import {
  BookOpen,
  Search,
  Filter,
  Star,
  Activity,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Flame,
  ShieldCheck,
  Wrench,
  Music,
  Compass,
} from 'lucide-react';

export const VocabularyView: React.FC = () => {
  const { skills, launchGapClosurePractice } = useLearner();

  const [selectedBand, setSelectedBand] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<'All' | 'CORE' | 'STYLE'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [readinessFilter, setReadinessFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeSkillModal, setActiveSkillModal] = useState<GranularSkill | null>(null);

  const categories = [
    'All',
    'Rudiments',
    'Linear Patterns',
    'Grooves',
    'Fills',
    'Rhythm / Meter',
    'Coordination',
  ];

  const filteredSkills = skills.filter((skill) => {
    const comp = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(skill.id);
    const unit = comp ? CURRICULUM_UNITS_BY_ID.get(comp.unitId) : null;
    const band: CurriculumBand = unit?.band || (skill.targetTempo && skill.targetTempo >= 110 ? 'ADVANCED' : skill.targetTempo && skill.targetTempo >= 85 ? 'INTERMEDIATE' : 'BEGINNER');
    const isCore = !!comp;

    // Band filter
    if (selectedBand !== 'All' && band !== selectedBand) {
      return false;
    }

    // Role filter
    if (selectedRole === 'CORE' && !isCore) return false;
    if (selectedRole === 'STYLE' && isCore) return false;

    // Category match
    let catMatch = true;
    if (selectedCategory === 'Rudiments') catMatch = skill.parentTrack === 'rudiments';
    else if (selectedCategory === 'Linear Patterns')
      catMatch = skill.category.toLowerCase().includes('linear');
    else if (selectedCategory === 'Grooves') catMatch = skill.parentTrack === 'grooves';
    else if (selectedCategory === 'Fills') catMatch = skill.parentTrack === 'fills';
    else if (selectedCategory === 'Rhythm / Meter')
      catMatch = skill.parentTrack === 'timeSignatures';
    else if (selectedCategory === 'Coordination')
      catMatch = skill.parentTrack === 'coordination';

    // Status match
    let statusMatch = true;
    if (selectedStatus !== 'All') {
      statusMatch = skill.status === selectedStatus;
    }

    // Readiness match
    let readinessMatch = true;
    if (readinessFilter !== 'All') {
      const readiness = deriveSkillReadiness(skill);
      if (readinessFilter === 'READY_FOR_CHECKPOINT') {
        readinessMatch = readiness.readinessState === 'READY_FOR_CHECKPOINT';
      } else if (readinessFilter === 'NEARLY_READY') {
        readinessMatch = readiness.readinessState === 'NEARLY_READY';
      }
    }

    // Search match
    const query = searchQuery.toLowerCase();
    const searchMatch =
      skill.name.toLowerCase().includes(query) ||
      skill.category.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      (skill.notes && skill.notes.toLowerCase().includes(query)) ||
      (comp?.songTags && comp.songTags.some((t) => t.toLowerCase().includes(query)));

    return catMatch && statusMatch && readinessMatch && searchMatch;
  });

  // Calculate counts for quick overview
  const totalUsable = skills.filter(
    (s) =>
      s.status === 'CLEAN' ||
      s.status === 'APPLICABLE' ||
      s.status === 'MUSICAL' ||
      s.status === 'MASTERED'
  ).length;

  const totalReadyForCheckpoint = skills.filter(
    (s) => deriveSkillReadiness(s).readinessState === 'READY_FOR_CHECKPOINT'
  ).length;

  const totalLearning = skills.filter((s) => s.status === 'LEARNING').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 border border-[#4a523a]/20 px-2.5 py-1 rounded-full">
            Curriculum Vocabulary Vault
          </span>
          <h2 className="text-2xl font-black text-stone-900 mt-2 mb-1">
            Drumming Vocabulary & Competencies
          </h2>
          <p className="text-sm text-stone-600">
            Differentiating core canonical curriculum competencies from stylistic electives.
          </p>
        </div>

        {/* Vocabulary Stats */}
        <div className="flex items-center gap-3 sm:gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200 shrink-0">
          <div className="text-center px-2">
            <span className="text-xl font-black text-[#4a523a] block font-mono">
              {totalUsable}
            </span>
            <span className="text-[10px] text-stone-500 uppercase font-bold">Usable / Clean</span>
          </div>
          <div className="w-px h-8 bg-stone-300" />
          <div className="text-center px-2">
            <span className="text-xl font-black text-amber-600 block font-mono">
              {totalLearning}
            </span>
            <span className="text-[10px] text-stone-500 uppercase font-bold">In Development</span>
          </div>
          <div className="w-px h-8 bg-stone-300" />
          <div className="text-center px-2">
            <span className="text-xl font-black text-emerald-700 block font-mono">
              {totalReadyForCheckpoint}
            </span>
            <span className="text-[10px] text-emerald-700 uppercase font-bold">Checkpoint Ready</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills, songs, rudiments..."
              className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-[#4a523a]"
            />
          </div>

          {/* Band Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            <span className="text-[11px] font-bold text-stone-500 shrink-0">Band:</span>
            {['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBand(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedBand === b
                    ? 'bg-[#4a523a] text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Role & Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-stone-500 shrink-0">Type:</span>
            <button
              onClick={() => setSelectedRole('All')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border whitespace-nowrap ${
                selectedRole === 'All' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedRole('CORE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${
                selectedRole === 'CORE' ? 'bg-[#4a523a] text-white border-[#4a523a]' : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              Core Competencies
            </button>
            <button
              onClick={() => setSelectedRole('STYLE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${
                selectedRole === 'STYLE' ? 'bg-purple-800 text-white border-purple-800' : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Stylistic Electives
            </button>
          </div>

          {/* Readiness Filter */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setReadinessFilter(readinessFilter === 'READY_FOR_CHECKPOINT' ? 'All' : 'READY_FOR_CHECKPOINT')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${
                readinessFilter === 'READY_FOR_CHECKPOINT'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Checkpoint Ready ({totalReadyForCheckpoint})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vocabulary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.length === 0 ? (
          <div className="col-span-full bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">No matching vocabulary found</h3>
            <p className="text-xs text-stone-500">
              Try adjusting your search query or filters above.
            </p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const statusConfig = SKILL_STATUS_CONFIG[skill.status];
            const readiness = deriveSkillReadiness(skill);
            const activeGap = getActiveGapClosurePlan(skill.id);
            const comp = CURRICULUM_COMPETENCIES_BY_SKILL_ID.get(skill.id);
            const unit = comp ? CURRICULUM_UNITS_BY_ID.get(comp.unitId) : null;
            const band = unit?.band || (skill.targetTempo && skill.targetTempo >= 110 ? 'ADVANCED' : skill.targetTempo && skill.targetTempo >= 85 ? 'INTERMEDIATE' : 'BEGINNER');

            return (
              <div
                key={skill.id}
                onClick={() => setActiveSkillModal(skill)}
                className="bg-white border border-stone-200 hover:border-[#4a523a]/50 rounded-2xl p-5 space-y-3 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Band Badge */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        band === 'INTERMEDIATE'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : band === 'ADVANCED'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-stone-100 text-stone-700 border-stone-300'
                      }`}>
                        {band}
                      </span>

                      {/* Core vs Style Badge */}
                      {comp ? (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#4a523a]/10 text-[#4a523a] border border-[#4a523a]/20">
                          Core Competency
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          Stylistic Elective
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Confidence Stars */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < skill.confidence
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-stone-900 group-hover:text-[#4a523a] transition-colors">
                      {skill.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-stone-500">
                      {unit ? unit.title : `${skill.parentTrack} • ${skill.category}`}
                    </p>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {comp ? comp.description : skill.description}
                  </p>

                  {/* Song Context Tags */}
                  {comp?.songTags && comp.songTags.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#4a523a] font-medium pt-1">
                      <Music className="w-3 h-3 shrink-0" />
                      <span className="truncate">Songs: {comp.songTags.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                  <div>
                    {skill.currentComfortTempo ? (
                      <span className="font-bold text-stone-800">
                        {skill.currentComfortTempo} BPM
                        {skill.targetTempo ? ` (Target: ${skill.targetTempo})` : ''}
                      </span>
                    ) : (
                      <span>Pattern Focus</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-sans text-stone-600 group-hover:text-[#4a523a] font-bold">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Skill Detail Modal */}
      {activeSkillModal && (
        <SkillDetailModal
          skill={skills.find((s) => s.id === activeSkillModal.id) || activeSkillModal}
          onClose={() => setActiveSkillModal(null)}
          onStartGapClosurePractice={(plan) => {
            launchGapClosurePractice(plan.id);
            setActiveSkillModal(null);
          }}
          onPracticeSkill={(sk) => {
            const activePlan = getActiveGapClosurePlan(sk.id);
            if (activePlan) {
              launchGapClosurePractice(activePlan.id);
            }
            setActiveSkillModal(null);
          }}
        />
      )}
    </div>
  );
};
