import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LearnerProfile,
  GranularSkill,
  SkillTrackId,
  SkillStatus,
  PracticeSession,
  ActiveLearningThread,
  ReturnToTargetMemory,
  AnchorGroove,
  EquipmentOption,
  CurriculumDecision,
} from '../types';
import { INITIAL_GRANULAR_SKILLS } from '../data/initialSkills';
import { INITIAL_LEARNER_PROFILE } from '../data/initialProfile';
import { buildGapClosureSession, getPassedCheckpointsForSkill } from '../lib/gapClosureEngine';
import { buildPlacementSession } from '../lib/placementEngine';
import { saveCurriculumDecisionRecord } from '../lib/curriculumDecisionEngine';
import {
  getActiveLearningThreads,
  saveActiveLearningThreads,
  addSkillToActiveThreads,
  getStoredReturnToTargetMemory,
  setStoredReturnToTargetMemory,
  clearStoredReturnToTargetMemory,
  generateSupportingGrooveMiniLesson,
  selectBestAnchorGrooveForSkill,
} from '../lib/roadmapEngine';

function reconcileSkillsList(rawSkills: GranularSkill[]): GranularSkill[] {
  const statusRank: Record<SkillStatus, number> = {
    NOT_STARTED: 0,
    DISCOVERED: 1,
    LEARNING: 2,
    CLEAN: 3,
    APPLICABLE: 4,
    MUSICAL: 5,
    MASTERED: 6,
  };

  return rawSkills.map((sk) => {
    const passed = getPassedCheckpointsForSkill(sk.id);
    if (passed.length === 0) return sk;

    let highestStatus: SkillStatus = sk.status;
    if (passed.includes('MASTERED') && statusRank[highestStatus] < statusRank['MASTERED']) {
      highestStatus = 'MASTERED';
    } else if (passed.includes('MUSICAL') && statusRank[highestStatus] < statusRank['MUSICAL']) {
      highestStatus = 'MUSICAL';
    } else if (passed.includes('APPLICABLE') && statusRank[highestStatus] < statusRank['APPLICABLE']) {
      highestStatus = 'APPLICABLE';
    } else if (passed.includes('CLEAN') && statusRank[highestStatus] < statusRank['CLEAN']) {
      highestStatus = 'CLEAN';
    }

    if (highestStatus !== sk.status) {
      return {
        ...sk,
        status: highestStatus,
        source: sk.source === 'default' ? 'assessment' : sk.source,
      };
    }
    return sk;
  });
}

interface TrackSummary {
  total: number;
  notStarted: number;
  discovered: number;
  learning: number;
  clean: number;
  applicable: number;
  musical: number;
  mastered: number;
  readyForCheck: number;
  topGaps: string[];
}

interface LearnerContextType {
  profile: LearnerProfile;
  skills: GranularSkill[];
  activeSession: PracticeSession | null;
  activeThreads: ActiveLearningThread[];
  returnToTargetMemory: ReturnToTargetMemory | null;
  updateProfile: (profile: Partial<LearnerProfile>) => void;
  updateSkill: (skillId: string, updates: Partial<GranularSkill>) => void;
  addSkill: (skill: GranularSkill) => void;
  getSkillsByTrack: (trackId: SkillTrackId) => GranularSkill[];
  getTrackSummary: (trackId: SkillTrackId) => TrackSummary;
  startGuidedSession: (session: PracticeSession) => void;
  cancelGuidedSession: () => void;
  completeGuidedSession: (completedSession: PracticeSession) => void;
  launchGapClosurePractice: (planIdOrSkillId: string) => { success: boolean; session?: PracticeSession; error?: string };
  launchPlacementPractice: (skillId: string, preferredLength?: '1 beat' | '2 beats' | '1 bar') => { success: boolean; session?: PracticeSession; error?: string };
  launchSupportingGrooveMiniLesson: (targetSkill: GranularSkill, anchorGroove?: AnchorGroove, equipment?: EquipmentOption) => { success: boolean; session?: PracticeSession; error?: string };
  resumeTargetPlacementFromMemory: () => { success: boolean; session?: PracticeSession; error?: string };
  launchCurriculumDecisionPractice: (decision: CurriculumDecision, equipment?: EquipmentOption) => { success: boolean; session?: PracticeSession; error?: string };
  addSkillToActiveRoadmap: (skill: GranularSkill, replaceIdx?: number) => void;
  updateActiveThreads: (threads: ActiveLearningThread[]) => void;
  removeActiveThread: (threadId: string) => void;
  clearReturnToTargetMemory: () => void;
  resetToDefaults: () => void;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

const PROFILE_KEY = 'RUDIMENT_PROFILE_V2';
const SKILLS_KEY = 'RUDIMENT_SKILLS_V2';
const LEGACY_PROFILE_KEYS = ['RUDIMENT_PROFILE_V1', 'RUDIMENT_LEARNER_PROFILE'];
const LEGACY_SKILLS_KEYS = ['RUDIMENT_SKILLS_V1', 'RUDIMENT_GRANULAR_SKILLS'];

function mergeSkillsWithDefaults(savedSkills: GranularSkill[], defaultSkills: GranularSkill[]): GranularSkill[] {
  const savedMap = new Map<string, GranularSkill>();
  savedSkills.forEach((s) => savedMap.set(s.id, s));

  const merged: GranularSkill[] = [];

  defaultSkills.forEach((defSkill) => {
    if (savedMap.has(defSkill.id)) {
      const saved = savedMap.get(defSkill.id)!;
      merged.push({
        ...defSkill,
        status: saved.status,
        confidence: saved.confidence,
        currentComfortTempo: saved.currentComfortTempo !== undefined ? saved.currentComfortTempo : defSkill.currentComfortTempo,
        practiceCount: saved.practiceCount || 0,
        dateLastPracticed: saved.dateLastPracticed || null,
        notes: saved.notes || defSkill.notes,
        source: saved.source || defSkill.source,
      });
      savedMap.delete(defSkill.id);
    } else {
      merged.push(defSkill);
    }
  });

  // Include any extra custom user-created skills
  savedMap.forEach((customSkill) => {
    merged.push(customSkill);
  });

  return merged;
}

export const LearnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<LearnerProfile>(() => {
    try {
      let saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) {
        // Check legacy keys for seamless forward migration
        for (const legacyKey of LEGACY_PROFILE_KEYS) {
          const leg = localStorage.getItem(legacyKey);
          if (leg) {
            saved = leg;
            break;
          }
        }
      }
      if (saved) return { ...INITIAL_LEARNER_PROFILE, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to parse saved profile:', e);
    }
    return INITIAL_LEARNER_PROFILE;
  });

  const [skills, setSkills] = useState<GranularSkill[]>(() => {
    try {
      let saved = localStorage.getItem(SKILLS_KEY);
      if (!saved) {
        // Check legacy keys for seamless forward migration
        for (const legacyKey of LEGACY_SKILLS_KEYS) {
          const leg = localStorage.getItem(legacyKey);
          if (leg) {
            saved = leg;
            break;
          }
        }
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeSkillsWithDefaults(parsed, INITIAL_GRANULAR_SKILLS);
          return reconcileSkillsList(merged);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved skills:', e);
    }
    return reconcileSkillsList(INITIAL_GRANULAR_SKILLS);
  });

  // Active Guided Practice Session
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);

  // Active Learning Threads
  const [activeThreads, setActiveThreadsState] = useState<ActiveLearningThread[]>(() => getActiveLearningThreads());

  // Return-to-Target Memory for Prerequisite Mini-Lessons
  const [returnToTargetMemory, setReturnToTargetMemoryState] = useState<ReturnToTargetMemory | null>(() =>
    getStoredReturnToTargetMemory()
  );

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    } catch (e) {
      console.error('Failed to save skills:', e);
    }
  }, [skills]);

  const updateProfile = (updates: Partial<LearnerProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const updateSkill = (skillId: string, updates: Partial<GranularSkill>) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, ...updates } : s))
    );
  };

  const addSkill = (newSkill: GranularSkill) => {
    setSkills((prev) => [...prev, newSkill]);
  };

  const getSkillsByTrack = (trackId: SkillTrackId) => {
    return skills.filter((s) => s.parentTrack === trackId);
  };

  const startGuidedSession = (session: PracticeSession) => {
    setActiveSession(session);
  };

  const cancelGuidedSession = () => {
    setActiveSession(null);
  };

  const completeGuidedSession = (completedSession: PracticeSession) => {
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
          currentComfortTempo: bestTempo > 0 ? bestTempo : targetSkill.currentComfortTempo,
        });
      }
    });

    setActiveSession(null);
  };

  /**
   * CANONICAL GAP-PRACTICE LAUNCHER
   * Resolves the active GapClosurePlan, selects incomplete exercises, constructs the guided session,
   * preserves all provenance metadata, and opens the guided practice experience.
   */
  const launchGapClosurePractice = (
    planIdOrSkillId: string
  ): { success: boolean; session?: PracticeSession; error?: string } => {
    const { session, error } = buildGapClosureSession(planIdOrSkillId);
    if (error || !session) {
      console.error('[launchGapClosurePractice] Launcher failed:', error);
      return { success: false, error: error || 'Gap Closure exercises could not be loaded.' };
    }

    setActiveSession(session);
    return { success: true, session };
  };

  /**
   * CANONICAL PLACEMENT PRACTICE LAUNCHER
   * Constructs a placement/phrase insertion session targeting 1-beat, 2-beat, or full-bar placement.
   */
  const launchPlacementPractice = (
    skillId: string,
    preferredLength?: '1 beat' | '2 beats' | '1 bar'
  ): { success: boolean; session?: PracticeSession; error?: string } => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) {
      return { success: false, error: 'Skill not found.' };
    }

    try {
      const session = buildPlacementSession(skill, profile, preferredLength);
      setActiveSession(session);
      return { success: true, session };
    } catch (e: any) {
      console.error('[launchPlacementPractice] Launcher failed:', e);
      return { success: false, error: e?.message || 'Placement practice could not be generated.' };
    }
  };

  /**
   * CANONICAL SUPPORTING GROOVE MINI-LESSON LAUNCHER
   * Generates a 3-5 minute focused anchor groove foundation session,
   * setting return-to-target memory to resume target practice seamlessly upon completion.
   */
  const launchSupportingGrooveMiniLesson = (
    targetSkill: GranularSkill,
    anchorGroove?: AnchorGroove,
    equipment: EquipmentOption = 'Practice Pad'
  ): { success: boolean; session?: PracticeSession; error?: string } => {
    try {
      const groove = anchorGroove || selectBestAnchorGrooveForSkill(targetSkill, profile, 2);
      const session = generateSupportingGrooveMiniLesson(targetSkill, groove, equipment);
      
      const newMemory: ReturnToTargetMemory = {
        returnTargetSkillId: targetSkill.id,
        returnTargetSkillName: targetSkill.name,
        returnTargetExerciseType: 'musical_placement',
        dependencyReason: `Supporting groove foundation for ${targetSkill.name} placement`,
        interruptedAt: new Date().toISOString(),
        supportingSkillId: groove.id,
        supportingSkillName: groove.name,
        anchorGrooveId: groove.id,
      };
      setReturnToTargetMemoryState(newMemory);

      setActiveSession(session);
      return { success: true, session };
    } catch (e: any) {
      console.error('[launchSupportingGrooveMiniLesson] Failed:', e);
      return { success: false, error: e?.message || 'Mini-lesson could not be generated.' };
    }
  };

  /**
   * RESUME TARGET PLACEMENT FROM RETURN-TO-TARGET MEMORY
   */
  const resumeTargetPlacementFromMemory = (): {
    success: boolean;
    session?: PracticeSession;
    error?: string;
  } => {
    const memory = returnToTargetMemory || getStoredReturnToTargetMemory();
    if (!memory) {
      return { success: false, error: 'No return target found in memory.' };
    }

    const targetSkill = skills.find((s) => s.id === memory.returnTargetSkillId);
    if (!targetSkill) {
      return { success: false, error: `Target skill ${memory.returnTargetSkillName} not found.` };
    }

    // Clear return target memory once resumed
    clearStoredReturnToTargetMemory();
    setReturnToTargetMemoryState(null);

    return launchPlacementPractice(targetSkill.id, '1 beat');
  };

  /**
   * CANONICAL CURRICULUM DECISION PRACTICE LAUNCHER (BU2F-R2F)
   * Converts a structured CurriculumDecision directly into an active PracticeSession,
   * respecting the pathway (REMEDIATE, REINFORCE, PROGRESS, VARY, TRANSFER, CHECKPOINT),
   * phrase length, BPM, and anchor groove container.
   */
  const launchCurriculumDecisionPractice = (
    decision: CurriculumDecision,
    equipment?: EquipmentOption
  ): { success: boolean; session?: PracticeSession; error?: string } => {
    // 1. Save decision record
    saveCurriculumDecisionRecord(decision);

    const targetSkill = skills.find((s) => s.id === decision.targetSkillId);
    if (!targetSkill) {
      return { success: false, error: `Target skill ${decision.targetSkillName} not found.` };
    }

    const { recommendedAction } = decision;

    // Handle mini-lesson / prerequisite foundation
    if (recommendedAction.exerciseType === 'mini_lesson' || recommendedAction.actionType === 'SIMPLIFY_FOUNDATION') {
      return launchSupportingGrooveMiniLesson(
        targetSkill,
        recommendedAction.anchorGroove,
        equipment || (profile.equipment === 'Full Drum Kit' ? 'Full Drum Kit' : 'Practice Pad')
      );
    }

    // Handle musical placement (reinforce, progress, vary, transfer)
    try {
      const phraseLength = recommendedAction.phraseLength || '1 beat';
      const session = buildPlacementSession(
        targetSkill,
        profile,
        phraseLength,
        recommendedAction.suggestedBpm,
        recommendedAction.assistanceMode,
        decision
      );

      // Enhance notes with curriculum decision reasoning
      session.notes = `[Curriculum Decision: ${decision.decision}] ${decision.reason}`;
      session.focusTopic = `${targetSkill.name} — ${decision.decision} (${decision.nextTarget})`;

      setActiveSession(session);
      return { success: true, session };
    } catch (e: any) {
      console.error('[launchCurriculumDecisionPractice] Failed:', e);
      return { success: false, error: e?.message || 'Failed to start curriculum practice.' };
    }
  };

  const addSkillToActiveRoadmap = (skill: GranularSkill, replaceIdx?: number) => {
    const updated = addSkillToActiveThreads(skill, replaceIdx);
    setActiveThreadsState(updated);
  };

  const updateActiveThreads = (threads: ActiveLearningThread[]) => {
    saveActiveLearningThreads(threads);
    setActiveThreadsState(threads);
  };

  const removeActiveThread = (threadId: string) => {
    const updated = activeThreads.filter((t) => t.id !== threadId);
    saveActiveLearningThreads(updated);
    setActiveThreadsState(updated);
  };

  const clearReturnToTargetMemory = () => {
    clearStoredReturnToTargetMemory();
    setReturnToTargetMemoryState(null);
  };

  const getTrackSummary = (trackId: SkillTrackId): TrackSummary => {
    const trackSkills = getSkillsByTrack(trackId);
    const summary: TrackSummary = {
      total: trackSkills.length,
      notStarted: 0,
      discovered: 0,
      learning: 0,
      clean: 0,
      applicable: 0,
      musical: 0,
      mastered: 0,
      readyForCheck: 0,
      topGaps: [],
    };

    const gapsSet = new Set<string>();

    trackSkills.forEach((s) => {
      switch (s.status) {
        case 'NOT_STARTED':
          summary.notStarted++;
          break;
        case 'DISCOVERED':
          summary.discovered++;
          break;
        case 'LEARNING':
          summary.learning++;
          break;
        case 'CLEAN':
          summary.clean++;
          summary.readyForCheck++;
          break;
        case 'APPLICABLE':
          summary.applicable++;
          summary.readyForCheck++;
          break;
        case 'MUSICAL':
          summary.musical++;
          break;
        case 'MASTERED':
          summary.mastered++;
          break;
      }

      if (s.knownGaps && s.knownGaps.length > 0) {
        s.knownGaps.forEach((g) => gapsSet.add(g));
      }
    });

    summary.topGaps = Array.from(gapsSet).slice(0, 3);
    return summary;
  };

  const resetToDefaults = () => {
    setProfile(INITIAL_LEARNER_PROFILE);
    setSkills(INITIAL_GRANULAR_SKILLS);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SKILLS_KEY);
  };

  return (
    <LearnerContext.Provider
      value={{
        profile,
        skills,
        activeSession,
        activeThreads,
        returnToTargetMemory,
        updateProfile,
        updateSkill,
        addSkill,
        getSkillsByTrack,
        getTrackSummary,
        startGuidedSession,
        cancelGuidedSession,
        completeGuidedSession,
        launchGapClosurePractice,
        launchPlacementPractice,
        launchSupportingGrooveMiniLesson,
        resumeTargetPlacementFromMemory,
        launchCurriculumDecisionPractice,
        addSkillToActiveRoadmap,
        updateActiveThreads,
        removeActiveThread,
        clearReturnToTargetMemory,
        resetToDefaults,
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
};

export const useLearner = () => {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error('useLearner must be used within a LearnerProvider');
  }
  return context;
};
