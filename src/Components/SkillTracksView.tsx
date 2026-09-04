import React, { useState } from 'react';
import { SkillTrack, SkillLevel, SkillTrackId, GranularSkill } from '../types';
import { useLearner } from '../context/LearnerContext';
import { SkillDetailModal } from './SkillDetailModal';
import { getActiveGapClosurePlan } from '../lib/gapClosureEngine';
import {
  Compass,
  ShieldCheck,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  ListFilter,
} from 'lucide-react';

interface SkillTracksViewProps {
  tracks: SkillTrack[];
  onUpdateTrackLevel: (trackId: SkillTrackId, newLevel: SkillLevel) => void;
  onAddGap: (trackId: SkillTrackId, gapText: string) => void;
  onAddGoal: (trackId: SkillTrackId, goalText: string) => void;
  onStartCheckpoint: (track: SkillTrack) => void;
  onAskCoachAboutTrack: (trackName: string, level: SkillLevel) => void;
}

export const SkillTracksView: React.FC<SkillTracksViewProps> = ({
  tracks,
  onStartCheckpoint,
  onAskCoachAboutTrack,
}) => {
  const { getTrackSummary, getSkillsByTrack, launchGapClosurePractice } = useLearner();

  const [expandedTrackId, setExpandedTrackId] = useState<SkillTrackId | null>('rudiments');
  const [selectedSkillModal, setSelectedSkillModal] = useState<GranularSkill | null>(null);

  const toggleExpand = (id: SkillTrackId) => {
    setExpandedTrackId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a523a] bg-[#4a523a]/10 border border-[#4a523a]/20 px-2.5 py-1 rounded-full">
            Curriculum Summary Matrix
          </span>
          <h2 className="text-2xl font-black text-stone-900 mt-2 mb-1">
            Skill Track Curriculum & Vocabulary Matrix
          </h2>
          <p className="text-sm text-stone-600">
            Broad curriculum categories summarize your granular skill breakdown below. No single global BPM target defines your track level — progress is built skill by skill.
          </p>
        </div>
      </div>

      {/* Track Summary Cards List */}
      <div className="space-y-4">
        {tracks.map((track) => {
          const summary = getTrackSummary(track.id);
          const granularSkills = getSkillsByTrack(track.id);
          const isExpanded = expandedTrackId === track.id;

          const totalMasteredOrApplicable =
            summary.clean + summary.applicable + summary.musical + summary.mastered;
          const progressPercent =
            summary.total > 0
              ? Math.round((totalMasteredOrApplicable / summary.total) * 100)
              : 0;

          return (
            <div
              key={track.id}
              className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl transition-all shadow-sm overflow-hidden"
            >
              {/* Track Header Card */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Title & Level */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-stone-900">{track.name}</h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#4a523a]/10 text-[#4a523a] border border-[#4a523a]/20">
                        {summary.total} Skills • {totalMasteredOrApplicable > 0 ? 'Developing' : 'Starting'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200">
                        Meta Checkpoint Level: {track.currentLevel}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">{track.description}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onStartCheckpoint(track)}
                      className="px-3.5 py-2 bg-[#3f4532] hover:bg-[#323827] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Checkpoint Assessment</span>
                    </button>

                    <button
                      onClick={() => onAskCoachAboutTrack(track.name, track.currentLevel)}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ask Coach</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(track.id)}
                      className="p-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl border border-stone-200 transition-all"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Granular Breakdown Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-semibold pt-1">
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-center">
                    <span className="block text-stone-500 text-[10px] uppercase font-bold">Discovered</span>
                    <span className="text-stone-900 font-black text-sm font-mono">{summary.discovered}</span>
                  </div>
                  <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 text-center">
                    <span className="block text-sky-700 text-[10px] uppercase font-bold">Learning</span>
                    <span className="text-sky-900 font-black text-sm font-mono">{summary.learning}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                    <span className="block text-emerald-700 text-[10px] uppercase font-bold">Clean</span>
                    <span className="text-emerald-900 font-black text-sm font-mono">{summary.clean}</span>
                  </div>
                  <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 text-center">
                    <span className="block text-indigo-700 text-[10px] uppercase font-bold">Applicable</span>
                    <span className="text-indigo-900 font-black text-sm font-mono">{summary.applicable}</span>
                  </div>
                  <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-center col-span-2 sm:col-span-1">
                    <span className="block text-purple-700 text-[10px] uppercase font-bold">Musical/Mastered</span>
                    <span className="text-purple-900 font-black text-sm font-mono">
                      {summary.musical + summary.mastered}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-stone-600">
                    <span>Usable Skill Mastery Progress</span>
                    <span>{progressPercent}% ({totalMasteredOrApplicable} / {summary.total} Skills)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                    <div
                      className="h-full bg-[#4a523a] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Major Track Gaps */}
                {summary.topGaps.length > 0 && (
                  <div className="flex items-start gap-2 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[11px] uppercase tracking-wider font-bold">
                        Major Identified Gaps:
                      </strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {summary.topGaps.map((gap, idx) => (
                          <span key={idx} className="bg-white/80 px-2 py-0.5 rounded border border-amber-300 font-medium">
                            • {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Granular Skills Drawer */}
              {isExpanded && (
                <div className="bg-stone-50 border-t border-stone-200 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                      Individual Skills in {track.name} ({granularSkills.length})
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      Click any skill to view/edit status & notes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {granularSkills.map((sk) => (
                      <div
                        key={sk.id}
                        onClick={() => setSelectedSkillModal(sk)}
                        className="bg-white p-3.5 rounded-xl border border-stone-200 hover:border-[#4a523a] transition-all cursor-pointer shadow-2xs space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            {sk.category}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {sk.status}
                          </span>
                        </div>
                        <h5 className="font-bold text-xs text-stone-900 group-hover:text-[#4a523a]">
                          {sk.name}
                        </h5>
                        <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-100 font-mono">
                          <span>{sk.currentComfortTempo ? `${sk.currentComfortTempo} BPM` : 'Unassessed BPM'}</span>
                          <span className="text-stone-400 group-hover:text-stone-800 font-sans font-bold">Inspect →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkillModal && (
        <SkillDetailModal
          skill={selectedSkillModal}
          onClose={() => setSelectedSkillModal(null)}
          onStartGapClosurePractice={(plan) => {
            launchGapClosurePractice(plan.id);
            setSelectedSkillModal(null);
          }}
          onPracticeSkill={(sk) => {
            const activePlan = getActiveGapClosurePlan(sk.id);
            if (activePlan) {
              launchGapClosurePractice(activePlan.id);
            }
            setSelectedSkillModal(null);
          }}
        />
      )}
    </div>
  );
};
