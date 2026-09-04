import React, { useState } from 'react';
import {
  PracticeSession,
  PracticeContextOption,
  EquipmentOption,
  FocusModeOption,
  GranularSkill,
  ActiveLearningThread,
} from '../types';
import { useLearner } from '../context/LearnerContext';
import { generatePracticeSession } from '../lib/practiceSessionGenerator';
import { deriveSkillContinuityDecision } from '../lib/continuityEngine';
import { evaluateSkillRoadmap, getAnchorGrooveById } from '../lib/roadmapEngine';
import { evaluateCurriculumDecision } from '../lib/curriculumDecisionEngine';
import {
  generateTodayPracticeLanes,
  buildTodayCurriculumSession,
} from '../lib/todayPracticeEngine';
import { deriveCurrentCurriculumPosition } from '../lib/canonicalProgressEngine';
import {
  CANONICAL_CURRICULUM_COMPETENCIES,
  CANONICAL_CURRICULUM_UNITS,
  CURRICULUM_COMPETENCIES_BY_ID,
  CURRICULUM_UNITS_BY_ID,
} from '../data/canonicalCurriculum';
import { GuidedPracticeSession } from './GuidedPracticeSession';
import { recommendPlayAlongForCompetency } from '../data/playAlongTracks';
import { RoadmapWhyThisNextCard } from './RoadmapWhyThisNextCard';
import { CurriculumDecisionCard } from './CurriculumDecisionCard';
import {
  Play,
  Clock,
  Target,
  Drum,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  BookOpen,
  FileText,
  Music,
  Plus,
  Flame,
  Compass,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  X,
  ShieldAlert,
} from 'lucide-react';

interface TodayPracticeViewProps {
  practiceSessions: PracticeSession[];
  onAddSession: (session: PracticeSession) => void;
  onOpenMusicalApplication?: (trackId: string) => void;
}

export const TodayPracticeView: React.FC<TodayPracticeViewProps> = ({
  practiceSessions,
  onAddSession,
  onOpenMusicalApplication,
}) => {
  const {
    profile,
    skills,
    updateSkill,
    startGuidedSession,
    activeThreads,
    addSkillToActiveRoadmap,
    returnToTargetMemory,
    launchSupportingGrooveMiniLesson,
    resumeTargetPlacementFromMemory,
    launchCurriculumDecisionPractice,
    clearReturnToTargetMemory,
  } = useLearner();

  // Active Interactive Session State (fallback if context session not used)
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);

  // Setup Screen States
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState('20');

  // Context Selection (Defaults to profile's practicePriority)
  const defaultContext: PracticeContextOption =
    profile.practicePriority === 'Skill Development'
      ? 'SKILL_DEVELOPMENT'
      : profile.practicePriority === 'Song / Performance Preparation'
      ? 'SONG_SERVICE_PREP'
      : 'BALANCED';

  const [practiceContext, setPracticeContext] = useState<PracticeContextOption>(defaultContext);
  const [songPrepName, setSongPrepName] = useState('');

  // Equipment Today
  const [equipment, setEquipment] = useState<EquipmentOption>('Practice Pad');

  // Focus Mode
  const [focusMode, setFocusMode] = useState<FocusModeOption>('COACH_CHOOSES');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedLaneType, setSelectedLaneType] = useState<
    'PRIMARY_PATH' | 'SUPPORTING_REPAIR' | 'PERFORMANCE_PREP'
  >('PRIMARY_PATH');

  // Unified Canonical Curriculum Position & Today 3-Lane Generation
  const canonicalPosition = deriveCurrentCurriculumPosition(skills);
  const activeUnit =
    CURRICULUM_UNITS_BY_ID.get(canonicalPosition.activeUnitId) || CANONICAL_CURRICULUM_UNITS[0];
  const canonicalActiveComp =
    CURRICULUM_COMPETENCIES_BY_ID.get(canonicalPosition.activeCompetencyId) ||
    CANONICAL_CURRICULUM_COMPETENCIES[0];

  const todayLanes = generateTodayPracticeLanes(profile, skills, equipment);
  const primaryLane = todayLanes.find((l) => l.laneType === 'PRIMARY_PATH') || todayLanes[0];
  const repairLane = todayLanes.find((l) => l.laneType === 'SUPPORTING_REPAIR') || todayLanes[1];
  const perfLane = todayLanes.find((l) => l.laneType === 'PERFORMANCE_PREP') || todayLanes[2];

  const activeLane = todayLanes.find((l) => l.laneType === selectedLaneType) || primaryLane;
  const recommendedPlayAlong = recommendPlayAlongForCompetency(canonicalPosition.activeCompetencyId);

  const canonicalActiveSkill: GranularSkill =
    skills.find((s) => s.id === activeLane.targetSkillId) ||
    skills.find((s) => s.id === canonicalActiveComp.skillId) || ({
      id: canonicalActiveComp.skillId,
      name: canonicalActiveComp.title,
      parentTrack: 'rudiments',
      category: 'Rudiments',
      description: canonicalActiveComp.description,
      status: 'LEARNING',
      confidence: 2,
      practiceCount: 0,
      currentComfortTempo: canonicalActiveComp.tempoStandard.bpm,
    } as GranularSkill);

  // New Thing Protection Dialog State
  const [pendingExploreSkill, setPendingExploreSkill] = useState<GranularSkill | null>(null);
  const [showNewThingModal, setShowNewThingModal] = useState(false);

  // Legacy Text Plan Mode Toggle
  const [showLegacyTextPlan, setShowLegacyTextPlan] = useState(false);
  const [legacyWrittenPlan, setLegacyWrittenPlan] = useState<string | null>(null);

  // Handle Start Guided Practice
  const handleStartGuidedSession = () => {
    const finalDuration = isCustomDuration
      ? Math.max(5, Math.min(180, parseInt(customDurationInput) || 30))
      : durationMinutes;

    let generated: PracticeSession;
    if (focusMode === 'COACH_CHOOSES') {
      generated = buildTodayCurriculumSession(todayLanes, profile, skills, equipment);
    } else {
      generated = generatePracticeSession({
        durationMinutes: finalDuration,
        practiceContext,
        equipment,
        focusMode,
        selectedSkillIds,
        songPrepName: songPrepName.trim() || undefined,
        allSkills: skills,
        profile,
      });
    }

    if (startGuidedSession) {
      startGuidedSession(generated);
    } else {
      setActiveSession(generated);
    }
  };

  // Handle Session Completion from Guided Component
  const handleCompleteGuidedSession = (completedSession: PracticeSession) => {
    // 1. Save to practiceSessions history
    onAddSession(completedSession);

    // 2. Update real skills in LearnerContext with provenance
    const practicedSkillIds = Array.from(
      new Set([
        ...(completedSession.selectedSkillIds || []),
        ...(completedSession.exercises?.flatMap((e) => e.skillIds) || []),
      ])
    );

    const todayStr = new Date().toISOString().split('T')[0];

    practicedSkillIds.forEach((skillId) => {
      const targetSkill = skills.find((s) => s.id === skillId);
      if (targetSkill) {
        const newCount = (targetSkill.practiceCount || 0) + 1;

        // Check clean execution in session exercises for this skill
        const skillExercises = completedSession.exercises?.filter((e) =>
          e.skillIds.includes(skillId)
        );
        const bestTempo = Math.max(
          targetSkill.currentComfortTempo || 0,
          ...(skillExercises?.map((e) => e.result?.tempoUsed || e.tempo) || [0])
        );

        updateSkill(skillId, {
          practiceCount: newCount,
          dateLastPracticed: todayStr,
          // Update comfort tempo if clean self-check achieved and higher
          currentComfortTempo: bestTempo > 0 ? bestTempo : targetSkill.currentComfortTempo,
        });
      }
    });

    // Reset active session
    setActiveSession(null);
  };

  // Toggle skill selection for MY_CHOICE focus mode with "New Thing" Protection
  const handleToggleSkillChoice = (skillId: string) => {
    const isCurrentlySelected = selectedSkillIds.includes(skillId);
    if (isCurrentlySelected) {
      setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
      return;
    }

    const candidateSkill = skills.find((s) => s.id === skillId);
    if (!candidateSkill) return;

    // Check if skill is already in active roadmap threads
    const inActiveRoadmap = activeThreads.some((t) => t.skillId === skillId);

    if (!inActiveRoadmap && activeThreads.length >= 2) {
      // Prompt user with New Thing Protection
      setPendingExploreSkill(candidateSkill);
      setShowNewThingModal(true);
    } else {
      if (selectedSkillIds.length >= 2) {
        setSelectedSkillIds([selectedSkillIds[1], skillId]);
      } else {
        setSelectedSkillIds((prev) => [...prev, skillId]);
      }
    }
  };

  const handleConfirmExploreOnly = () => {
    if (pendingExploreSkill) {
      setSelectedSkillIds([pendingExploreSkill.id]);
    }
    setShowNewThingModal(false);
    setPendingExploreSkill(null);
  };

  const handleConfirmAddToRoadmap = () => {
    if (pendingExploreSkill) {
      addSkillToActiveRoadmap(pendingExploreSkill);
      setSelectedSkillIds([pendingExploreSkill.id]);
    }
    setShowNewThingModal(false);
    setPendingExploreSkill(null);
  };

  const handleConfirmReplaceFocus = (replaceIdx: number) => {
    if (pendingExploreSkill) {
      addSkillToActiveRoadmap(pendingExploreSkill, replaceIdx);
      setSelectedSkillIds([pendingExploreSkill.id]);
    }
    setShowNewThingModal(false);
    setPendingExploreSkill(null);
  };

  // Target skill resolution for all presentation surfaces on Today:
  // In COACH_CHOOSES mode, all recommendation surfaces strictly derive from the canonical active competency / lane.
  // In MY_CHOICE mode, manual user selection overrides.
  const activeTargetSkill =
    focusMode === 'MY_CHOICE' && selectedSkillIds.length > 0
      ? skills.find((s) => s.id === selectedSkillIds[0]) || canonicalActiveSkill
      : canonicalActiveSkill;

  const currentRoadmapDecision = activeTargetSkill
    ? evaluateSkillRoadmap(activeTargetSkill, skills, profile)
    : null;

  const currentCurriculumDecision = activeTargetSkill
    ? evaluateCurriculumDecision(activeTargetSkill, skills, profile, equipment, practiceContext)
    : null;

  // Handle quick practice of specific active learning thread
  const handlePracticeThread = (thread: ActiveLearningThread) => {
    const threadSkill = skills.find((s) => s.id === thread.skillId);
    if (threadSkill) {
      setFocusMode('MY_CHOICE');
      setSelectedSkillIds([threadSkill.id]);
    }
  };

  // Generate Legacy Written Plan
  const handleGenerateLegacyPlan = () => {
    const finalDuration = isCustomDuration
      ? Math.max(5, Math.min(180, parseInt(customDurationInput) || 30))
      : durationMinutes;

    const sessionData = generatePracticeSession({
      durationMinutes: finalDuration,
      practiceContext,
      equipment,
      focusMode,
      selectedSkillIds,
      songPrepName: songPrepName.trim() || undefined,
      allSkills: skills,
      profile,
    });

    const textPlan = `
RUDIMENT DRUM COACH — WRITTEN PRACTICE PLAN (${finalDuration} MINS)
------------------------------------------------------------------
Context: ${practiceContext}
Equipment: ${equipment}
Primary Focus: ${sessionData.focusTopic}

EXERCISES:
${sessionData.exercises
  ?.map(
    (ex, idx) => `
${idx + 1}. [${ex.progressionStage || ex.phase}] ${ex.title} (${Math.round(ex.durationSeconds / 60)} mins)
   • Why: ${ex.purpose}
   • Instructions: ${ex.instructions}
   ${ex.sticking ? `• Sticking: ${ex.sticking}` : ''}
   ${ex.counting ? `• Counting: ${ex.counting}` : ''}
   • Starting Tempo: ${ex.tempo} BPM (${ex.timeSignature}, ${ex.subdivision})
`
  )
  .join('\n')}

COACH NOTE: Focus on relaxed wrists and strict subdivision accuracy.
`;

    setLegacyWrittenPlan(textPlan);
  };

  // If an active session is in progress, show Guided Practice Session Screen
  if (activeSession) {
    return (
      <GuidedPracticeSession
        session={activeSession}
        skills={skills}
        onCompleteSession={handleCompleteGuidedSession}
        onCancelSession={() => setActiveSession(null)}
      />
    );
  }

  // Available skills for MY_CHOICE focus
  const activeSkillsList = skills.filter(
    (s) => s.status === 'LEARNING' || s.status === 'DISCOVERED' || s.status === 'CLEAN'
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 pb-28 md:pb-12">
      {/* RETURN TO TARGET BANNER (When resuming from a supporting groove mini-lesson) */}
      {returnToTargetMemory && (
        <div className="bg-[#4a523a] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-[#78855e] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-300/30">
                Ready to Resume Placement
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                Supporting groove established for {returnToTargetMemory.returnTargetSkillName}!
              </h3>
              <p className="text-xs text-stone-200 mt-0.5">
                Your musical container is locked. Return directly to practicing{' '}
                {returnToTargetMemory.returnTargetSkillName} fill placement and Beat 1 downbeat landings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => resumeTargetPlacementFromMemory()}
              className="flex items-center gap-2 bg-white hover:bg-stone-100 text-[#4a523a] px-4 py-2.5 rounded-xl font-black text-xs transition-transform transform active:scale-95 shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume {returnToTargetMemory.returnTargetSkillName}
            </button>
            <button
              onClick={clearReturnToTargetMemory}
              className="p-2 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss resume target"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-3">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Drum className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#4a523a]/40 text-stone-200 border border-[#78855e]/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-[#a4b584]" />
            <span>Curriculum Roadmap & Interactive Practice (BU2F-R2E)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Today's Guided Practice</h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-medium">
            Rudiment connects your vocabulary through a structured roadmap: Understand → Control → Place → Transfer → Vary → Create.
          </p>
        </div>
      </div>

      {/* TODAY'S CURRICULUM FOCUS (Three Supporting Roles) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-7 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4a523a]/10 text-[#4a523a] flex items-center justify-center font-bold">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">Today's Curriculum Focus</h2>
              <p className="text-xs text-stone-500 font-medium">
                Three roles supporting one primary curriculum objective.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#4a523a]/10 text-[#4a523a] px-3 py-1 rounded-full border border-[#4a523a]/20 self-start sm:self-auto">
            {activeUnit.title}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. PRIMARY PATH */}
          <div
            onClick={() => {
              setSelectedLaneType('PRIMARY_PATH');
              setFocusMode('COACH_CHOOSES');
            }}
            className={`p-4 rounded-2xl border transition-all space-y-3 cursor-pointer ${
              selectedLaneType === 'PRIMARY_PATH' && focusMode === 'COACH_CHOOSES'
                ? 'bg-[#4a523a]/5 border-[#4a523a] ring-2 ring-[#4a523a]/20 shadow-xs'
                : 'bg-stone-50/80 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-[#4a523a] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Primary Path • 65%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedLaneType === 'PRIMARY_PATH' && focusMode === 'COACH_CHOOSES'
                    ? 'bg-[#4a523a] text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {selectedLaneType === 'PRIMARY_PATH' && focusMode === 'COACH_CHOOSES'
                  ? 'Active Focus'
                  : 'Select'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-black text-stone-900">{primaryLane.targetSkillName}</h3>
              <p className="text-xs text-stone-600 font-medium leading-snug mt-1">
                {primaryLane.reason}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Standard:</span>
                <span className="font-bold text-stone-900 truncate max-w-[150px]">
                  {primaryLane.tempoStandardText}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Role:</span>
                <span className="text-[#4a523a] font-bold">Core Competency</span>
              </div>
            </div>
          </div>

          {/* 2. SUPPORTING FOUNDATION */}
          <div
            onClick={() => {
              setSelectedLaneType('SUPPORTING_REPAIR');
              setFocusMode('COACH_CHOOSES');
            }}
            className={`p-4 rounded-2xl border transition-all space-y-3 cursor-pointer ${
              selectedLaneType === 'SUPPORTING_REPAIR' && focusMode === 'COACH_CHOOSES'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-stone-50/80 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Supporting Foundation • 20%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedLaneType === 'SUPPORTING_REPAIR' && focusMode === 'COACH_CHOOSES'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {selectedLaneType === 'SUPPORTING_REPAIR' && focusMode === 'COACH_CHOOSES'
                  ? 'Active Focus'
                  : 'Select'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-black text-stone-900">{repairLane.targetSkillName}</h3>
              <p className="text-xs text-stone-600 font-medium leading-snug mt-1">
                {repairLane.reason}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Standard:</span>
                <span className="font-bold text-stone-900 truncate max-w-[150px]">
                  {repairLane.tempoStandardText}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Role:</span>
                <span className="text-amber-700 font-bold">Prerequisite Support</span>
              </div>
            </div>
          </div>

          {/* 3. MUSICAL APPLICATION */}
          <div
            onClick={() => {
              setSelectedLaneType('PERFORMANCE_PREP');
              setFocusMode('COACH_CHOOSES');
            }}
            className={`p-4 rounded-2xl border transition-all space-y-3 cursor-pointer ${
              selectedLaneType === 'PERFORMANCE_PREP' && focusMode === 'COACH_CHOOSES'
                ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-stone-50/80 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Musical Application • 15%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedLaneType === 'PERFORMANCE_PREP' && focusMode === 'COACH_CHOOSES'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {selectedLaneType === 'PERFORMANCE_PREP' && focusMode === 'COACH_CHOOSES'
                  ? 'Active Focus'
                  : 'Select'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-black text-stone-900">{perfLane.targetSkillName}</h3>
              <p className="text-xs text-stone-600 font-medium leading-snug mt-1">
                {perfLane.reason}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Container:</span>
                <span className="font-bold text-stone-900 truncate max-w-[150px]">
                  {perfLane.tempoStandardText}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span className="font-semibold text-stone-500">Role:</span>
                <span className="text-indigo-700 font-bold">Song Integration</span>
              </div>
            </div>

            {onOpenMusicalApplication && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenMusicalApplication(recommendedPlayAlong.id);
                }}
                className="w-full min-h-[42px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black flex items-center justify-center gap-2 transition-colors"
              >
                <Music className="w-3.5 h-3.5" />
                Play in {recommendedPlayAlong.title} · {recommendedPlayAlong.bpm} BPM
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BU2F-R2F ADAPTIVE CURRICULUM DECISION CARD */}
      {currentCurriculumDecision && (
        <CurriculumDecisionCard
          decision={currentCurriculumDecision}
          targetSkill={activeTargetSkill}
          onPracticeDecision={() =>
            currentCurriculumDecision &&
            launchCurriculumDecisionPractice(currentCurriculumDecision, equipment)
          }
          onPracticeSupportingGroove={() =>
            activeTargetSkill &&
            launchSupportingGrooveMiniLesson(
              activeTargetSkill,
              currentCurriculumDecision.supportingContext?.anchorGroove,
              equipment
            )
          }
        />
      )}

      {/* WHY THIS NEXT ROADMAP CARD */}
      {currentRoadmapDecision && (
        <RoadmapWhyThisNextCard
          decision={currentRoadmapDecision}
          targetSkill={activeTargetSkill}
          onPracticeSupportingGroove={() =>
            activeTargetSkill &&
            launchSupportingGrooveMiniLesson(
              activeTargetSkill,
              currentRoadmapDecision.supportingSkill?.anchorGroove,
              equipment
            )
          }
        />
      )}

      {/* SETUP FORM CARD */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-8 shadow-xl space-y-8">
        {/* 1. TIME SELECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4a523a]" />
              <span>1. How much time do you have today?</span>
            </label>
            <span className="text-xs font-mono font-bold text-[#4a523a]">
              {isCustomDuration ? `${customDurationInput} mins` : `${durationMinutes} mins`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setDurationMinutes(mins);
                  setIsCustomDuration(false);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border min-h-[44px] ${
                  !isCustomDuration && durationMinutes === mins
                    ? 'bg-[#4a523a] text-white border-[#4a523a] shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {mins} min
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCustomDuration(true)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border min-h-[44px] ${
                isCustomDuration
                  ? 'bg-[#4a523a] text-white border-[#4a523a] shadow-sm'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Custom
            </button>

            {isCustomDuration && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={customDurationInput}
                  onChange={(e) => setCustomDurationInput(e.target.value)}
                  className="w-20 bg-stone-50 border border-stone-300 p-2 text-xs font-mono font-bold text-stone-900 rounded-xl focus:outline-none focus:border-[#4a523a]"
                />
                <span className="text-xs font-bold text-stone-600">mins</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. CONTEXT SELECTION */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-[#4a523a]" />
            <span>2. What is today's context?</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPracticeContext('SKILL_DEVELOPMENT')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                practiceContext === 'SKILL_DEVELOPMENT'
                  ? 'bg-[#4a523a]/10 border-[#4a523a] text-[#4a523a] shadow-sm ring-2 ring-[#4a523a]/20'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>SKILL DEVELOPMENT</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Focus on rudiments, hand control, coordination, and technique.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPracticeContext('SONG_SERVICE_PREP')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                practiceContext === 'SONG_SERVICE_PREP'
                  ? 'bg-[#4a523a]/10 border-[#4a523a] text-[#4a523a] shadow-sm ring-2 ring-[#4a523a]/20'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <Music className="w-4 h-4" />
                <span>SONG / SERVICE PREP</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Prioritize music you need to perform or prepare for Sunday set.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPracticeContext('BALANCED')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                practiceContext === 'BALANCED'
                  ? 'bg-[#4a523a]/10 border-[#4a523a] text-[#4a523a] shadow-sm ring-2 ring-[#4a523a]/20'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>BALANCED</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Combine technical drill with musical application.
              </p>
            </button>
          </div>

          {practiceContext === 'SONG_SERVICE_PREP' && (
            <div className="pt-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Target Song / Service Name (Optional):
              </label>
              <input
                type="text"
                value={songPrepName}
                onChange={(e) => setSongPrepName(e.target.value)}
                placeholder="e.g. Superstition, Worship Set, Lion and the Lamb..."
                className="w-full bg-stone-50 border border-stone-300 p-2.5 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:border-[#4a523a]"
              />
            </div>
          )}
        </div>

        {/* 3. EQUIPMENT TODAY */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Drum className="w-4 h-4 text-[#4a523a]" />
            <span>3. What equipment are you using right now?</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEquipment('Practice Pad')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                equipment === 'Practice Pad'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-400/30'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <span>PRACTICE PAD</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Pad-focused exercises, sticking, accents, subdivision, and simulated orchestration.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEquipment('Full Drum Kit')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                equipment === 'Full Drum Kit'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-400/30'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <span>FULL DRUM KIT</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Full kit orchestrations, kick coordination, groove-to-fill transitions.
              </p>
            </button>
          </div>
        </div>

        {/* 4. FOCUS SELECTION */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4a523a]" />
            <span>4. Choose today's practice focus</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFocusMode('COACH_CHOOSES')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                focusMode === 'COACH_CHOOSES'
                  ? 'bg-[#4a523a]/10 border-[#4a523a] text-[#4a523a] shadow-sm ring-2 ring-[#4a523a]/20'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>COACH CHOOSES (Recommended)</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Rudiment automatically aligns with your active canonical curriculum: Primary Path, Supporting Foundation, and Musical Application.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFocusMode('MY_CHOICE')}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                focusMode === 'MY_CHOICE'
                  ? 'bg-[#4a523a]/10 border-[#4a523a] text-[#4a523a] shadow-sm ring-2 ring-[#4a523a]/20'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <span>MY CHOICE</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Select 1 or 2 specific skills from My Vocabulary to practice today.
              </p>
            </button>
          </div>

          {/* MY CHOICE Skill Picker */}
          {focusMode === 'MY_CHOICE' && (
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <span className="text-xs font-bold text-stone-700 block">
                Select 1 or 2 skills from My Vocabulary:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {activeSkillsList.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  const isThreadActive = activeThreads.some((t) => t.skillId === skill.id);

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleToggleSkillChoice(skill.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#4a523a] text-white border-[#4a523a] shadow-sm'
                          : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5">
                        {isThreadActive && (
                          <Compass className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-[#4a523a]'}`} />
                        )}
                        <span className="truncate">{skill.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono ml-2 shrink-0">
                        {skill.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* START GUIDED PRACTICE BUTTON */}
        <button
          id="btn-start-guided-practice"
          onClick={handleStartGuidedSession}
          className="w-full py-4 bg-[#4a523a] hover:bg-[#3d4430] text-white font-black text-base rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>START GUIDED PRACTICE SESSION</span>
        </button>

        {/* Legacy Written Plan Option */}
        <div className="text-center pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => {
              setShowLegacyTextPlan(!showLegacyTextPlan);
              if (!showLegacyTextPlan) handleGenerateLegacyPlan();
            }}
            className="text-xs text-stone-500 hover:text-stone-800 font-bold underline transition-colors"
          >
            {showLegacyTextPlan ? 'Hide Written Plan' : 'View Written Text Plan (Legacy Format)'}
          </button>
        </div>

        {showLegacyTextPlan && legacyWrittenPlan && (
          <div className="bg-stone-900 text-stone-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto space-y-2">
            <pre className="whitespace-pre-wrap">{legacyWrittenPlan}</pre>
          </div>
        )}
      </div>

      {/* RECENT PRACTICE LOGS HISTORY */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#4a523a]" />
            <span>Practice History</span>
          </h2>
          <span className="text-xs font-mono font-bold text-stone-500">
            {practiceSessions.length} Logged Sessions
          </span>
        </div>

        {practiceSessions.length === 0 ? (
          <p className="text-xs text-stone-500 italic p-4 text-center bg-stone-50 rounded-2xl">
            No practice sessions logged yet. Complete your first guided session above!
          </p>
        ) : (
          <div className="space-y-3">
            {practiceSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-stone-900">
                  <div className="flex items-center gap-2">
                    <span className="text-[#4a523a]">{sess.focusTopic}</span>
                    {sess.equipment && (
                      <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded text-stone-700">
                        {sess.equipment}
                      </span>
                    )}
                  </div>
                  <span className="text-stone-500 font-mono">{sess.date}</span>
                </div>

                <div className="flex items-center gap-4 text-stone-600 font-mono text-[11px]">
                  <span>⏱ {sess.durationMinutes} mins</span>
                  <span>⭐ Rating: {sess.rating}/5</span>
                </div>

                {sess.notes && <p className="text-stone-600 italic text-[11px] pt-1">{sess.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW THING PROTECTION MODAL */}
      {showNewThingModal && pendingExploreSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 font-extrabold text-xs uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                <span>Roadmap Focus Protection</span>
              </div>
              <button
                onClick={() => setShowNewThingModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-stone-900">
                Explore {pendingExploreSkill.name}?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                You already have <strong className="text-stone-900">{activeThreads.length} active roadmap threads</strong> in flight ({activeThreads.map((t) => t.skillName).join(', ')}). How would you like to handle this new skill?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {/* Option 1: Quick Explore */}
              <button
                onClick={handleConfirmExploreOnly}
                className="w-full text-left p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors space-y-0.5 cursor-pointer"
              >
                <div className="font-bold text-xs text-stone-900">
                  ⚡ Quick Explore Today Only
                </div>
                <div className="text-[11px] text-stone-500">
                  Practice this session without modifying your core roadmap focus.
                </div>
              </button>

              {/* Option 2: Add to Roadmap */}
              {activeThreads.length < 3 ? (
                <button
                  onClick={handleConfirmAddToRoadmap}
                  className="w-full text-left p-3 rounded-xl border border-[#4a523a]/30 bg-[#4a523a]/5 hover:bg-[#4a523a]/10 transition-colors space-y-0.5 cursor-pointer"
                >
                  <div className="font-bold text-xs text-[#4a523a]">
                    ➕ Add as Active Roadmap Thread
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Track progress on {pendingExploreSkill.name} across future sessions.
                  </div>
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">
                    Replace an Existing Thread (Max 3):
                  </span>
                  {activeThreads.map((thread, idx) => (
                    <button
                      key={thread.id}
                      onClick={() => handleConfirmReplaceFocus(idx)}
                      className="w-full text-left p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-amber-50 text-xs transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-bold text-stone-800">
                        Replace: {thread.skillName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

