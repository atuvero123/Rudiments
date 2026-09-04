import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/Header';
import { CoachChat } from './components/CoachChat';
import { SkillTracksView } from './components/SkillTracksView';
import { MetronomeAndPad } from './components/MetronomeAndPad';
import { PracticePlannerView } from './components/PracticePlannerView';
import { TodayPracticeView } from './components/TodayPracticeView';
import { PathView } from './components/PathView';
import { SongVaultView } from './components/SongVaultView';
import { LearnerProfileView } from './components/LearnerProfileView';
import { VocabularyView } from './components/VocabularyView';
import { CheckpointModal } from './components/CheckpointModal';
import { GuidedPracticeSession } from './components/GuidedPracticeSession';
import { INITIAL_SKILL_TRACKS } from './data/initialData';
import { LearnerProvider, useLearner } from './context/LearnerContext';
import { getCoachSkillContext } from './lib/evidenceEngine';
import {
  ChatMessage,
  SkillTrack,
  SkillLevel,
  SkillTrackId,
  PracticeSession,
} from './types';

const SESSIONS_STORAGE_KEY = 'RUDIMENT_PRACTICE_SESSIONS_V1';

/**
 * Calculates genuine streak based on distinct consecutive calendar dates
 * containing a completed practice session.
 */
function calculateTruePracticeStreak(sessions: PracticeSession[]): number {
  if (!sessions || sessions.length === 0) return 0;

  const dates = new Set<string>();
  sessions.forEach((s) => {
    if (s.date) {
      const d = s.date.split('T')[0];
      if (d) dates.add(d);
    }
  });

  if (dates.size === 0) return 0;

  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = format(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = format(yesterday);

  let checkDate: Date;
  if (dates.has(todayStr)) {
    checkDate = today;
  } else if (dates.has(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    return 0; // Streak broken
  }

  let streak = 0;
  while (true) {
    const dStr = format(checkDate);
    if (dates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function MainAppContent() {
  // Mobile-first default to Today's practice
  const [activeTab, setActiveTab] = useState<AppTab>('today');

  const {
    profile,
    skills,
    activeSession,
    completeGuidedSession,
    cancelGuidedSession,
    launchGapClosurePractice,
  } = useLearner();

  // Initial welcome message from Coach Rudiment
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hey there! I'm **Rudiment**, your personal drumming coach and curriculum designer.

My core rule: **We never learn any skill at full speed first.** Every rudiment, groove, fill, or odd meter starts slow, relaxed, and clean before we step up the tempo.

Here is how we work together:
• **Canonical Curriculum Path**: Structured progression across core Units and testable competencies.
• **Today's Practice**: 3-lane balanced sessions (Primary Path 65%, Repair 20%, Musical Song Context 15%).
• **Practical Placement**: Verify your real playing abilities under click before advancing.

What are you working on at your kit or practice pad today? Choose a quick prompt below or ask me anything!`,
      timestamp: new Date(),
    },
  ]);

  const [skillTracks, setSkillTracks] = useState<SkillTrack[]>(INITIAL_SKILL_TRACKS);

  // Practice history starting empty unless genuine stored history exists
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load practice sessions:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(practiceSessions));
    } catch (e) {
      console.error('Failed to persist practice sessions:', e);
    }
  }, [practiceSessions]);

  const [isLoading, setIsLoading] = useState(false);
  const [checkpointTrack, setCheckpointTrack] = useState<SkillTrack | null>(null);

  // Metronome preset ladder states
  const [metronomeStartBpm, setMetronomeStartBpm] = useState(60);
  const [metronomeTargetBpm, setMetronomeTargetBpm] = useState(100);

  // Send message to Coach Rudiment API
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Map track levels
      const currentTrackLevels = skillTracks.reduce((acc, t) => {
        acc[t.id] = t.currentLevel;
        return acc;
      }, {} as Record<string, string>);

      // Summarize granular skills with BU2B Evidence Engine facts
      const skillsSummary = skills.map((s) => {
        const evidenceCtx = getCoachSkillContext(s.id, s.name);
        return {
          name: s.name,
          track: s.parentTrack,
          status: s.status,
          comfortBpm: s.currentComfortTempo,
          gaps: s.knownGaps,
          evidence: {
            workingBpm: evidenceCtx.currentWorkingTempo,
            cleanBpm: evidenceCtx.highestCleanTempo,
            recurringFriction: evidenceCtx.primaryRecurringFriction,
            trend: evidenceCtx.recentTrend,
            totalSessions: evidenceCtx.totalSessions,
            totalAttempts: evidenceCtx.totalAttempts,
            summaryText: evidenceCtx.summaryText,
          },
        };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          currentTrackLevels,
          learnerProfile: profile,
          skillsSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response from Rudiment.');

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Note: ${err.message || 'I encountered an issue connecting. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Skill Track level
  const handleUpdateTrackLevel = (trackId: SkillTrackId, newLevel: SkillLevel) => {
    setSkillTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, currentLevel: newLevel } : t))
    );
  };

  const handleAddGap = (trackId: SkillTrackId, gapText: string) => {
    setSkillTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, knownGaps: [...t.knownGaps, gapText] } : t
      )
    );
  };

  const handleAddGoal = (trackId: SkillTrackId, goalText: string) => {
    setSkillTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, targetGoals: [...t.targetGoals, goalText] } : t
      )
    );
  };

  // Open Metronome tab prefilled with a ladder
  const handleOpenMetronomeWithLadder = (startBpm: number, targetBpm: number) => {
    setMetronomeStartBpm(startBpm);
    setMetronomeTargetBpm(targetBpm);
    setActiveTab('practice');
  };

  // Switch to chat and prompt Coach Rudiment for a lesson
  const handleAskCoachAboutTrack = (trackName: string, level: SkillLevel) => {
    setActiveTab('chat');
    handleSendMessage(
      `I want to work on my ${trackName} skill track. I'm currently at ${level} level. Can you give me a slow, relaxed exercise with a tempo ladder, sticking logic, and starting point variations?`
    );
  };

  const handleAskCoachAboutSong = (title: string, artist: string, trackId: string) => {
    setActiveTab('chat');
    handleSendMessage(
      `Can you break down the drum part and key techniques for "${title}" by ${artist}? Explain the tempo ladder to build up to it and how it relates to my ${trackId} track.`
    );
  };

  const handleLogSession = (sessionData: Omit<PracticeSession, 'id'>) => {
    const newSession: PracticeSession = {
      ...sessionData,
      id: `sess-${Date.now()}`,
    };
    setPracticeSessions((prev) => [newSession, ...prev]);
  };

  const practiceStreak = calculateTruePracticeStreak(practiceSessions);

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-stone-900 font-sans selection:bg-[#4a523a] selection:text-white flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        practiceStreak={practiceStreak}
      />

      <main className="flex-1 pb-24 md:pb-12">
        {activeSession ? (
          <GuidedPracticeSession
            session={activeSession}
            skills={skills}
            onCompleteSession={(completed) => {
              handleLogSession(completed);
              completeGuidedSession(completed);
            }}
            onCancelSession={cancelGuidedSession}
          />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayPracticeView
                practiceSessions={practiceSessions}
                onAddSession={handleLogSession}
              />
            )}

            {activeTab === 'path' && <PathView />}

            {activeTab === 'practice' && (
              <MetronomeAndPad
                initialStartBpm={metronomeStartBpm}
                initialTargetBpm={metronomeTargetBpm}
              />
            )}

            {activeTab === 'vocabulary' && <VocabularyView />}

            {activeTab === 'songs' && (
              <SongVaultView onAskCoachAboutSong={handleAskCoachAboutSong} />
            )}

            {activeTab === 'profile' && <LearnerProfileView />}

            {activeTab === 'chat' && (
              <CoachChat
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                skillTracks={skillTracks}
                onOpenMetronomeWithLadder={handleOpenMetronomeWithLadder}
                onOpenCheckpoint={(trackId) => {
                  const tr = skillTracks.find((t) => t.id === trackId);
                  if (tr) setCheckpointTrack(tr);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Checkpoint Assessment Modal */}
      {checkpointTrack && (
        <CheckpointModal
          track={checkpointTrack}
          onClose={() => setCheckpointTrack(null)}
          onConfirmLevelUp={(trackId, targetLevel) => {
            handleUpdateTrackLevel(trackId as SkillTrackId, targetLevel);
            alert(`🎉 Congratulations! Your ${checkpointTrack.name} track has been leveled up to ${targetLevel}!`);
          }}
          onRequestCoachGapPlan={(trackName, failedCriteria) => {
            setActiveTab('chat');
            handleSendMessage(
              `I ran a Checkpoint Assessment for ${trackName} and identified these gaps:\n${failedCriteria
                .map((c) => `- ${c}`)
                .join('\n')}\nCan you build a targeted practice plan and tempo ladder to close these gaps?`
            );
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LearnerProvider>
      <MainAppContent />
    </LearnerProvider>
  );
}
